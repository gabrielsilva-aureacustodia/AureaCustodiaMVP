import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import {
  calcularFreteCorreios,
  gerarPrePostagemCorreios,
  normalizarCep,
  validarModalidadeEnvio,
} from './correios'
import { DESCRICAO_CONTEUDO_PADRAO } from './types'

describe('Correios — Cálculo de Frete e Pré-Postagem', () => {
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
    expect(() => validarModalidadeEnvio('CARTA')).toThrow(
      /Carta comum não é permitida por regimento postal/,
    )
    expect(() => validarModalidadeEnvio('carta_comum')).toThrow()
    expect(() => validarModalidadeEnvio('impresso')).toThrow()
  })

  it('calcula frete PAC com valor declarado e seguro', async () => {
    const res = await calcularFreteCorreios({
      cepOrigem: '01310-100',
      cepDestino: '20040-002',
      modalidade: 'PAC',
      valorDeclaradoCents: 50000, // R$ 500,00
    })

    expect(res.modalidade).toBe('PAC')
    expect(res.prazoDiasUteis).toBeGreaterThan(0)
    expect(res.valorFreteCents).toBeGreaterThan(0)
    expect(res.valorSeguroCents).toBeGreaterThan(0)
    expect(res.valorTotalCents).toBe(res.valorFreteCents + res.valorSeguroCents)
    expect(res.avisoRecebimento).toBe(true)
    expect(res.maoPropria).toBe(true)
  })

  it('calcula frete SEDEX com prazo menor que PAC', async () => {
    const pac = await calcularFreteCorreios({
      cepOrigem: '01310-100',
      cepDestino: '70040-010',
      modalidade: 'PAC',
      valorDeclaradoCents: 30000,
    })

    const sedex = await calcularFreteCorreios({
      cepOrigem: '01310-100',
      cepDestino: '70040-010',
      modalidade: 'SEDEX',
      valorDeclaradoCents: 30000,
    })

    expect(sedex.modalidade).toBe('SEDEX')
    expect(sedex.prazoDiasUteis).toBeLessThanOrEqual(pac.prazoDiasUteis)
    expect(sedex.valorTotalCents).toBeGreaterThan(0)
  })

  it('CRITÉRIO OBRIGATÓRIO: Declaração de conteúdo é SEMPRE "Moeda comemorativa / colecionável"', async () => {
    const prePostagem = await gerarPrePostagemCorreios({
      protocolo: 'RO-ENV-0042',
      remetente: {
        nome: 'Gabriel Silva',
        cep: '01310-100',
        logradouro: 'Rua de Teste',
        numero: '100',
        bairro: 'Centro',
        cidade: 'São Paulo',
        uf: 'SP',
      },
      modalidade: 'SEDEX',
      quantidadeMoedas: 2,
      tipoMoeda: 'Entrega da Bandeira Olímpica',
      valorDeclaradoCents: 60000,
    })

    expect(prePostagem.declaracaoConteudo.item).toBe(DESCRICAO_CONTEUDO_PADRAO)
    expect(prePostagem.declaracaoConteudo.item).toBe('Moeda comemorativa / colecionável')
    expect(prePostagem.declaracaoConteudo.quantidade).toBe(2)
    expect(prePostagem.declaracaoConteudo.valorTotalCents).toBe(60000)
    expect(prePostagem.codigoRastreio).toMatch(/^(SL|PB)\d{9}BR$/)
    expect(prePostagem.destinatario.nome).toContain('AUREA CUSTODIA LTDA')
  })
})
