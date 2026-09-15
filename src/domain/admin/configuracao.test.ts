import { describe, expect, it } from 'vitest'

import { DEPOSITO_MAX, SYNC_MS } from '@/domain/constants'
import { PARAMETROS_LEGAIS } from '@/domain/documentos-legais/parametros'
import { TAXAS_PADRAO, type TabelaDeTaxas } from '@/domain/fees'

import {
  canaisDe,
  dataDeBrasilia,
  DEFINICOES_CONFIG,
  definicaoDe,
  formatarValor,
  lerPercentual,
  lerReais,
  lerValorDigitado,
  operacionalDe,
  prepararMudancas,
  simularNegociacao,
  tabelaDeTaxasDe,
  termosDe,
  valoresVigentes,
  valorParaCampo,
  type DefinicaoConfig,
} from './configuracao'

function def(chave: string): DefinicaoConfig {
  const d = definicaoDe(chave)
  if (!d) throw new Error(chave)
  return d
}

describe('catálogo de configuração', () => {
  it('as chaves de taxa são os campos de TabelaDeTaxas, um para um (tabela 6.1)', () => {
    const chavesDeTaxa = DEFINICOES_CONFIG.filter((d) => d.grupo === 'taxas').map((d) => d.chave).sort()
    expect(chavesDeTaxa).toEqual((Object.keys(TAXAS_PADRAO) as Array<keyof TabelaDeTaxas>).sort())
  })

  it('sem nada gravado, tudo vale o padrão do código', () => {
    const v = valoresVigentes({})
    expect(tabelaDeTaxasDe(v)).toEqual(TAXAS_PADRAO)
    expect(operacionalDe(v)).toEqual({ depositoMaxCents: DEPOSITO_MAX, syncMs: SYNC_MS, prazos: { validacaoDiasUteis: 2, transitoEnvioDias: 15 } })
    expect(termosDe(v)).toEqual({
      vigencia: PARAMETROS_LEGAIS.vigencia,
      prazoValidacaoCustodia: PARAMETROS_LEGAIS.prazoValidacaoCustodia,
      prazoRecebimentoVenda: PARAMETROS_LEGAIS.prazoRecebimentoVenda,
      prazoDisponibilizacaoDeposito: PARAMETROS_LEGAIS.prazoDisponibilizacaoDeposito,
    })
    expect(canaisDe(v)).toEqual({ email: 'suporte@aureacustodia.com.br', whatsapp: '', telefone: '', url: '/suporte' })
  })

  it('valor gravado inválido cai no padrão — banco editado à mão não zera comissão', () => {
    const v = valoresVigentes({ comissaoVendedorBp: 'muito', comissaoCompradorBp: 75, taxaSaqueFixa: -5, custodiaAnualParcelasMax: 13, sacEmail: 'x' })
    const t = tabelaDeTaxasDe(v)
    expect(t.comissaoVendedorBp).toBe(50)
    expect(t.comissaoCompradorBp).toBe(75)
    expect(t.taxaSaqueFixa).toBe(500)
    expect(t.custodiaAnualParcelasMax).toBe(12)
    expect(canaisDe(v).email).toBe('suporte@aureacustodia.com.br')
  })
})

describe('leitura do que foi digitado', () => {
  it('percentual em pontos-base, até duas casas', () => {
    expect(lerPercentual('0,5')).toBe(50)
    expect(lerPercentual('1.25%')).toBe(125)
    expect(lerPercentual('0')).toBe(0)
    expect(lerPercentual('0,125')).toBeNull()
    expect(lerPercentual('-1')).toBeNull()
  })

  it('reais em centavos, aceitando zero e o padrão brasileiro de milhar', () => {
    expect(lerReais('1,00')).toBe(100)
    expect(lerReais('R$ 1.234,56')).toBe(123456)
    expect(lerReais('5')).toBe(500)
    expect(lerReais('0')).toBe(0)
    expect(lerReais('250.00')).toBe(25000)
    expect(lerReais('1,234')).toBeNull()
    expect(lerReais('abc')).toBeNull()
  })

  it('intervalo é anteparo de digitação; formato de texto é conferido', () => {
    expect(lerValorDigitado(def('comissaoCompradorBp'), '0')).toEqual({ ok: true, valor: 0 })
    expect(lerValorDigitado(def('comissaoCompradorBp'), '50').ok).toBe(false)
    expect(lerValorDigitado(def('custodiaAnualParcelasMax'), '12')).toEqual({ ok: true, valor: 12 })
    expect(lerValorDigitado(def('termosVigencia'), '31/02/2026').ok).toBe(false)
    expect(lerValorDigitado(def('termosVigencia'), '01/10/2026')).toEqual({ ok: true, valor: '01/10/2026' })
    expect(lerValorDigitado(def('sacWhatsapp'), '')).toEqual({ ok: true, valor: '' })
    expect(lerValorDigitado(def('sacWhatsapp'), '(31) 99999-8888')).toEqual({ ok: true, valor: '+5531999998888' })
    expect(lerValorDigitado(def('sacEmail'), '').ok).toBe(false)
  })

  it('exibição e campo de edição', () => {
    expect(formatarValor(def('comissaoCompradorBp'), 50)).toBe('0,5%')
    expect(formatarValor(def('custodiaAnualParcelasMax'), 12)).toBe('12x')
    expect(valorParaCampo(def('comissaoCompradorBp'), 125)).toBe('1,25')
    expect(valorParaCampo(def('depositoMaxCents'), 10_000_000)).toBe('100000,00')
  })
})

describe('mudanças de um grupo', () => {
  it('só o que mudou, com o valor de antes (padrão ou gravado)', () => {
    const r = prepararMudancas('taxas', { comissaoCompradorBp: '1', comissaoVendedorBp: '0,5', taxaSaqueFixa: '6,00' }, { taxaSaqueFixa: 550 })
    expect(r).toEqual({
      ok: true,
      mudancas: [
        { chave: 'comissaoCompradorBp', rotulo: 'Comissão de compra — percentual', antes: 50, depois: 100, eraPadrao: true },
        { chave: 'taxaSaqueFixa', rotulo: 'Saque — tarifa fixa', antes: 550, depois: 600, eraPadrao: false },
      ],
    })
  })

  it('erro em qualquer campo recusa o grupo inteiro; grupo sistema não é editável', () => {
    const r = prepararMudancas('taxas', { comissaoCompradorBp: 'x', taxaSaqueFixa: '6,00' }, {})
    expect(r.ok).toBe(false)
    expect(prepararMudancas('sistema', { tabelaDeTaxasVigencia: '01/01/2027' }, {}).ok).toBe(false)
  })
})

describe('simulação e data', () => {
  it('uma negociação de R$ 300 com a tabela padrão', () => {
    expect(simularNegociacao(TAXAS_PADRAO, 30000)).toEqual({
      preco: 30000,
      comissaoComprador: 250,
      compradorPaga: 30250,
      comissaoVendedor: 250,
      vendedorRecebe: 29750,
      aureaRecebe: 500,
    })
  })

  it('a data que o documento declara é a de Brasília', () => {
    expect(dataDeBrasilia(Date.UTC(2026, 8, 15, 2, 0, 0))).toBe('14/09/2026')
    expect(dataDeBrasilia(Date.UTC(2026, 8, 15, 3, 0, 0))).toBe('15/09/2026')
  })
})
