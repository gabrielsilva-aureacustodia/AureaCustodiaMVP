import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { _resetTokenParaTestes } from './cws/cliente'
import { calcularFreteCorreios, CODIGOS_SERVICO_CORREIOS, normalizarCep, validarModalidadeEnvio } from './correios'
import { dimensoesParaMoedas } from './types'

const ENV = {
  CORREIOS_USUARIO: 'u',
  CORREIOS_CODIGO_ACESSO: 'c',
  CORREIOS_CARTAO_POSTAGEM: '0080378641',
  CORREIOS_CONTRATO: '9912766936',
  CORREIOS_DR: '20',
}

describe('Correios — Cálculo de Frete', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    _resetTokenParaTestes()
  })

  it('normaliza CEPs para 8 dígitos numéricos', () => {
    expect(normalizarCep('01310-100')).toBe('01310100')
    expect(normalizarCep('20040-002')).toBe('20040002')
    expect(normalizarCep('12345678')).toBe('12345678')
  })

  it('valida modalidades permitidas (PAC e SEDEX)', () => {
    expect(() => validarModalidadeEnvio('PAC')).not.toThrow()
    expect(() => validarModalidadeEnvio('SEDEX')).not.toThrow()
  })

  it('CRITÉRIO INEGOCIÁVEL: Rejeita expressamente Carta Comum (proibição regulatória)', () => {
    expect(() => validarModalidadeEnvio('CARTA')).toThrow(/Carta comum não é permitida por regimento postal/)
    expect(() => validarModalidadeEnvio('carta_comum')).toThrow()
    expect(() => validarModalidadeEnvio('impresso')).toThrow()
  })

  it('sem contrato configurado, usa a tabela local e DIZ que é tabela', async () => {
    const res = await calcularFreteCorreios({
      cepOrigem: '01310-100',
      cepDestino: '30315-970',
      modalidade: 'PAC',
      valorDeclaradoCents: 50000,
    })
    expect(res.origem).toBe('tabela')
    expect(res.valorTotalCents).toBe(res.valorFreteCents + res.valorSeguroCents)
    expect(res.prazoDiasUteis).toBeGreaterThan(0)
  })

  it('SEDEX tem prazo menor ou igual ao PAC na tabela', async () => {
    const base = { cepOrigem: '01310-100', cepDestino: '70040-010', valorDeclaradoCents: 30000 }
    const pac = await calcularFreteCorreios({ ...base, modalidade: 'PAC' })
    const sedex = await calcularFreteCorreios({ ...base, modalidade: 'SEDEX' })
    expect(sedex.prazoDiasUteis).toBeLessThanOrEqual(pac.prazoDiasUteis)
  })

  it('com contrato, cota o serviço reverso na entrada e o comum na saída', async () => {
    for (const [k, v] of Object.entries(ENV)) vi.stubEnv(k, v)
    const urls: string[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        urls.push(url)
        if (url.includes('/token/')) {
          return new Response(JSON.stringify({ token: 't', expiraEm: '2099-01-01T00:00:00' }), { status: 201 })
        }
        if (url.includes('/preco/')) {
          return new Response(JSON.stringify({ pcFinal: '31,59', pcProduto: '28,85', pcTotalServicosAdicionais: '2,74' }))
        }
        return new Response(JSON.stringify({ prazoEntrega: 1 }))
      }),
    )

    const entrada = await calcularFreteCorreios({
      cepOrigem: '01310100',
      cepDestino: '30315970',
      modalidade: 'SEDEX',
      valorDeclaradoCents: 30000,
    })
    expect(entrada).toMatchObject({
      origem: 'correios',
      codigoServico: '03247',
      valorTotalCents: 3159,
      valorFreteCents: 2885,
      valorSeguroCents: 274,
      prazoDiasUteis: 1,
    })

    const saida = await calcularFreteCorreios({
      cepOrigem: '30315970',
      cepDestino: '01310100',
      modalidade: 'PAC',
      valorDeclaradoCents: 30000,
      sentido: 'saida',
    })
    expect(saida.codigoServico).toBe(CODIGOS_SERVICO_CORREIOS.PAC)
    expect(urls.some((u) => u.includes('/preco/v1/nacional/03298'))).toBe(true)
  })

  it('o pacote ganha 30 g por moeda além da primeira', () => {
    expect(dimensoesParaMoedas(1).pesoGramas).toBe(300)
    expect(dimensoesParaMoedas(3).pesoGramas).toBe(360)
  })
})
