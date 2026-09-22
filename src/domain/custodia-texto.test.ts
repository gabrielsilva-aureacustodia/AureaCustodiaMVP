import { describe, expect, it } from 'vitest'
import { custodiaDoEnvio, descricaoDaFaturaDeCustodia } from '@/domain/custodia-texto'
import { TAXAS_PADRAO } from '@/domain/fees'
import type { Envio, FaturaCustodia, PlanoCustodia } from '@/domain/types'

describe('descricaoDaFaturaDeCustodia', () => {
  const faturaBase: FaturaCustodia = {
    id: 'FAT-001',
    userEmail: 'cliente@exemplo.com.br',
    competencia: '2026-09',
    quantidadeMoedas: 15,
    moedaIds: [],
    valorCents: 3000,
    status: 'paga',
    dataEmissao: 1757894400000,
    dataVencimento: 1758758400000,
  }

  it('formata fatura sem origem como custódia mensal no padrão histórico', () => {
    const texto = descricaoDaFaturaDeCustodia(faturaBase, undefined)
    expect(texto).toBe('Custódia mensal 2026-09 · 15 moeda(s) — paga')
    expect(texto).not.toMatch(/faixa/i)
  })

  it('formata fatura com origem ciclo_mensal como custódia mensal', () => {
    const fatura: FaturaCustodia = { ...faturaBase, origem: 'ciclo_mensal' }
    const texto = descricaoDaFaturaDeCustodia(fatura, undefined)
    expect(texto).toBe('Custódia mensal 2026-09 · 15 moeda(s) — paga')
    expect(texto).not.toMatch(/faixa/i)
  })

  it('formata contratação com plano mensal', () => {
    const fatura: FaturaCustodia = { ...faturaBase, origem: 'contratacao', valorCents: 3000 }
    const plano: PlanoCustodia = {
      id: 'PLC-001',
      userEmail: 'cliente@exemplo.com.br',
      protocoloEnvio: 'RO-ENV-0001',
      modalidade: 'mensal',
      quantidadeContratada: 15,
      moedaIds: [],
      valorPorMoedaCents: 200,
      valorTotalCents: 3000,
      parcelasMax: 1,
      inicioCompetencia: '2026-09',
      pagoAteCompetencia: '2026-09',
      status: 'vigente',
      formaPagamento: 'saldo',
      paymentIntentRef: null,
      assinaturaId: null,
      estornadoCents: 0,
      criadoEm: 1757894400000,
      atualizadoEm: 1757894400000,
    }
    const texto = descricaoDaFaturaDeCustodia(fatura, plano)
    expect(texto).toBe('Plano mensal de custódia a partir de 2026-09 · 15 moeda(s) — paga')
    expect(texto).toContain('Plano mensal')
    expect(texto).not.toMatch(/faixa/i)
  })

  it('formata renovação de plano sem prometer prazo', () => {
    // A origem no banco continua 'renovacao_anual', mas renova plano mensal.
    const fatura: FaturaCustodia = { ...faturaBase, origem: 'renovacao_anual' }
    const texto = descricaoDaFaturaDeCustodia(fatura, undefined)
    expect(texto).toBe('Renovação do plano de custódia a partir de 2026-09 · 15 moeda(s) — paga')
    expect(texto).toContain('Renovação do plano')
    expect(texto).not.toContain('anual')
    expect(texto).not.toMatch(/faixa/i)
  })
})

describe('custodiaDoEnvio', () => {
  const envioBase: Envio = {
    protocolo: 'RO-ENV-0001',
    userEmail: 'cliente@exemplo.com.br',
    tipoMoeda: 'Entrega da Bandeira Olímpica',
    ano: 2016,
    quantidade: 15,
    codigoRastreio: null,
    dataPostagem: null,
    dataRecebimento: null,
    etapaAtual: 'Protocolo gerado',
    createdAt: 1757894400000,
    codigosAtivosGerados: [],
  }

  it('calcula custódia mensal sem plano com TAXAS_PADRAO (15 moedas = R$ 30,00)', () => {
    const res = custodiaDoEnvio(envioBase, undefined, TAXAS_PADRAO)
    expect(res).toEqual({
      rotulo: 'Plano mensal destas moedas',
      valorCents: 3000,
      periodo: 'mês',
    })
    expect(Number.isInteger(res.valorCents)).toBe(true)
  })

  it('calcula custódia mensal com tabela de taxas customizada (250 centavos = 3750 centavos)', () => {
    const taxasCustom = { ...TAXAS_PADRAO, custodiaMensalPorMoeda: 250 }
    const res = custodiaDoEnvio(envioBase, undefined, taxasCustom)
    expect(res).toEqual({
      rotulo: 'Plano mensal destas moedas',
      valorCents: 3750,
      periodo: 'mês',
    })
    expect(Number.isInteger(res.valorCents)).toBe(true)
  })

  it('retorna valorTotalCents congelado para plano mensal', () => {
    const plano: PlanoCustodia = {
      id: 'PLC-001',
      userEmail: 'cliente@exemplo.com.br',
      protocoloEnvio: 'RO-ENV-0001',
      modalidade: 'mensal',
      quantidadeContratada: 15,
      moedaIds: [],
      valorPorMoedaCents: 200,
      valorTotalCents: 3000,
      parcelasMax: 1,
      inicioCompetencia: '2026-09',
      pagoAteCompetencia: null,
      status: 'aguardando_pagamento',
      formaPagamento: null,
      paymentIntentRef: null,
      assinaturaId: null,
      estornadoCents: 0,
      criadoEm: 1757894400000,
      atualizadoEm: 1757894400000,
    }
    const res = custodiaDoEnvio(envioBase, plano, TAXAS_PADRAO)
    expect(res).toEqual({
      rotulo: 'Plano mensal destas moedas',
      valorCents: 3000,
      periodo: 'mês',
    })
    expect(Number.isInteger(res.valorCents)).toBe(true)
  })
})
