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

  it('formata contratação com plano anual sem mencionar mensal', () => {
    const fatura: FaturaCustodia = { ...faturaBase, origem: 'contratacao', valorCents: 36000 }
    const plano: PlanoCustodia = {
      id: 'PLC-001',
      userEmail: 'cliente@exemplo.com.br',
      protocoloEnvio: 'RO-ENV-0001',
      modalidade: 'anual',
      quantidadeContratada: 15,
      moedaIds: [],
      valorPorMoedaCents: 2400,
      valorTotalCents: 36000,
      parcelasMax: 12,
      inicioCompetencia: '2026-09',
      pagoAteCompetencia: '2027-08',
      status: 'vigente',
      formaPagamento: 'saldo',
      paymentIntentRef: null,
      assinaturaId: null,
      estornadoCents: 0,
      criadoEm: 1757894400000,
      atualizadoEm: 1757894400000,
    }
    const texto = descricaoDaFaturaDeCustodia(fatura, plano)
    expect(texto).toBe('Plano anual de custódia a partir de 2026-09 · 15 moeda(s) — paga')
    expect(texto).toContain('Plano anual')
    expect(texto).not.toContain('mensal')
    expect(texto).not.toMatch(/faixa/i)
  })

  it('formata contratação com plano mensal', () => {
    const fatura: FaturaCustodia = { ...faturaBase, origem: 'contratacao' }
    const plano: PlanoCustodia = {
      id: 'PLC-002',
      userEmail: 'cliente@exemplo.com.br',
      protocoloEnvio: 'RO-ENV-0002',
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
    expect(texto).toBe('Plano mensal de custódia 2026-09 · 15 moeda(s) — paga')
    expect(texto).toContain('Plano mensal')
    expect(texto).not.toMatch(/faixa/i)
  })

  it('formata contratação sem plano encontrado', () => {
    const fatura: FaturaCustodia = { ...faturaBase, origem: 'contratacao' }
    const texto = descricaoDaFaturaDeCustodia(fatura, undefined)
    expect(texto).toBe('Contratação de plano de custódia 2026-09 · 15 moeda(s) — paga')
    expect(texto).toContain('Contratação de plano')
    expect(texto).not.toMatch(/faixa/i)
  })

  it('formata renovação anual', () => {
    const fatura: FaturaCustodia = { ...faturaBase, origem: 'renovacao_anual' }
    const texto = descricaoDaFaturaDeCustodia(fatura, undefined)
    expect(texto).toBe('Renovação anual da custódia a partir de 2026-09 · 15 moeda(s) — paga')
    expect(texto).toContain('Renovação anual')
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
      rotulo: 'Custódia mensal destas moedas',
      valorCents: 3000,
      periodo: 'mês',
    })
    expect(Number.isInteger(res.valorCents)).toBe(true)
  })

  it('calcula custódia mensal com tabela de taxas customizada (250 centavos = 3750 centavos)', () => {
    const taxasCustom = { ...TAXAS_PADRAO, custodiaMensalPorMoeda: 250 }
    const res = custodiaDoEnvio(envioBase, undefined, taxasCustom)
    expect(res).toEqual({
      rotulo: 'Custódia mensal destas moedas',
      valorCents: 3750,
      periodo: 'mês',
    })
    expect(Number.isInteger(res.valorCents)).toBe(true)
  })

  it('retorna valorTotalCents congelado e período ano para plano anual', () => {
    const plano: PlanoCustodia = {
      id: 'PLC-001',
      userEmail: 'cliente@exemplo.com.br',
      protocoloEnvio: 'RO-ENV-0001',
      modalidade: 'anual',
      quantidadeContratada: 15,
      moedaIds: [],
      valorPorMoedaCents: 2400,
      valorTotalCents: 36000,
      parcelasMax: 12,
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
      rotulo: 'Plano anual destas moedas',
      valorCents: 36000,
      periodo: 'ano',
    })
    expect(Number.isInteger(res.valorCents)).toBe(true)
  })

  it('calcula valor para plano mensal com valorPorMoedaCents', () => {
    const envio3 = { ...envioBase, quantidade: 3 }
    const plano: PlanoCustodia = {
      id: 'PLC-002',
      userEmail: 'cliente@exemplo.com.br',
      protocoloEnvio: 'RO-ENV-0001',
      modalidade: 'mensal',
      quantidadeContratada: 3,
      moedaIds: [],
      valorPorMoedaCents: 200,
      valorTotalCents: 600,
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
    const res = custodiaDoEnvio(envio3, plano, TAXAS_PADRAO)
    expect(res).toEqual({
      rotulo: 'Custódia mensal destas moedas',
      valorCents: 600,
      periodo: 'mês',
    })
    expect(Number.isInteger(res.valorCents)).toBe(true)
  })
})
