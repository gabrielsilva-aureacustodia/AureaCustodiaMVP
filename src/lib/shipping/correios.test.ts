import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

// O parâmetro vigente do painel (`acrescimoDoFreteCents`): o teste o muda à vontade, sem banco.
const config = vi.hoisted(() => ({ acrescimoDoFreteCents: 400 as unknown }))
vi.mock('@/server/config/carregar', () => ({
  carregarParametrosOperacionais: async () => ({ acrescimoDoFreteCents: config.acrescimoDoFreteCents }),
}))

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
    config.acrescimoDoFreteCents = 400
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
    // O contrato (frete + seguro) e o acréscimo ficam à parte; o total é a soma.
    expect(res.valorContratoCents).toBe(res.valorFreteCents + res.valorSeguroCents)
    expect(res.acrescimoCents).toBe(400)
    expect(res.valorTotalCents).toBe(res.valorContratoCents + 400)
    expect(res.prazoDiasUteis).toBeGreaterThan(0)
  })

  describe('acréscimo do frete (frente K)', () => {
    const base = { cepOrigem: '01310-100', cepDestino: '30315-970', modalidade: 'PAC' as const, valorDeclaradoCents: 50000 }

    it('o valor passado à mão fixa o acréscimo, sem ler o parâmetro do painel', async () => {
      config.acrescimoDoFreteCents = 999
      const res = await calcularFreteCorreios({ ...base, acrescimoCents: 650 })
      expect(res.acrescimoCents).toBe(650)
      expect(res.valorTotalCents).toBe(res.valorContratoCents + 650)
    })

    it('sem valor à mão, vale o parâmetro vigente do painel', async () => {
      config.acrescimoDoFreteCents = 900
      const res = await calcularFreteCorreios(base)
      expect(res.acrescimoCents).toBe(900)
      expect(res.valorTotalCents).toBe(res.valorContratoCents + 900)
    })

    it('parâmetro zerado = o frete é o preço do contrato, igual a antes da frente K', async () => {
      config.acrescimoDoFreteCents = 0
      const res = await calcularFreteCorreios(base)
      expect(res.acrescimoCents).toBe(0)
      expect(res.valorTotalCents).toBe(res.valorContratoCents)
      expect(res.valorTotalCents).toBe(res.valorFreteCents + res.valorSeguroCents)
    })

    it('valor inválido no parâmetro (negativo, fração, lixo) vira zero — nunca reduz o frete', async () => {
      for (const lixo of [-400, 4.5, Number.NaN, 'quatro', null]) {
        config.acrescimoDoFreteCents = lixo
        const res = await calcularFreteCorreios(base)
        expect(res.acrescimoCents).toBe(0)
        expect(res.valorTotalCents).toBe(res.valorContratoCents)
      }
    })

    it('a saída (retirada) NÃO leva o acréscimo — ele é só do envio (decisão do Gabriel, 18/11/2026)', async () => {
      const res = await calcularFreteCorreios({ ...base, sentido: 'saida' })
      expect(res.acrescimoCents).toBe(0)
      expect(res.valorTotalCents).toBe(res.valorContratoCents)
      // A entrada, no mesmo teste e com o mesmo parâmetro, continua com ele.
      const entrada = await calcularFreteCorreios({ ...base, sentido: 'entrada' })
      expect(entrada.acrescimoCents).toBe(400)
    })

    it('CEP ou modalidade inválidos continuam recusados antes de qualquer acréscimo', async () => {
      await expect(calcularFreteCorreios({ ...base, modalidade: 'CARTA' as never })).rejects.toThrow(/Carta comum/)
    })
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
    // O contrato (R$ 31,59 = 28,85 + 2,74) fica à parte; o cliente paga o contrato + R$ 4,00.
    expect(entrada).toMatchObject({
      origem: 'correios',
      codigoServico: '03247',
      valorContratoCents: 3159,
      acrescimoCents: 400,
      valorTotalCents: 3559,
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
