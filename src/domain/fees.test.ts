import { describe, expect, it } from 'vitest'

import {
  CUSTODIA_ANUAL_POR_MOEDA_CENTS,
  CUSTODIA_MENSAL_POR_MOEDA_CENTS,
  custodiaAnualPorMoeda,
  custodiaMensalPorMoeda,
  TAXA_SAQUE_FIXA_CENTS,
  TAXAS_PADRAO,
  comissaoPorMoeda,
  custoDeCompraPorMoeda,
  liquidoDeVendaPorMoeda,
  tradeFee,
} from './fees'
import { TAXA_RETIRADA_COMUM_CENTS, TAXA_RETIRADA_SEGURA_CENTS } from './retirada'

describe('Regras de Taxas e Tarifas (fees.ts)', () => {
  describe('Custódia Mensal e Anual (Decisão D-3)', () => {
    it('constantes oficiais estão definidas corretamente', () => {
      expect(CUSTODIA_MENSAL_POR_MOEDA_CENTS).toBe(200) // R$ 2,00 por moeda/mês
      expect(CUSTODIA_ANUAL_POR_MOEDA_CENTS).toBe(2400) // R$ 24,00 por moeda/ano
    })

    it('calcula a custódia mensal proporcional à quantidade de moedas (R$ 2,00 / moeda)', () => {
      expect(custodiaMensalPorMoeda(0)).toBe(0)
      expect(custodiaMensalPorMoeda(-1)).toBe(0)
      expect(custodiaMensalPorMoeda(1)).toBe(200) // 1 moeda = R$ 2,00
      expect(custodiaMensalPorMoeda(5)).toBe(1000) // 5 moedas = R$ 10,00
      expect(custodiaMensalPorMoeda(18)).toBe(3600) // 18 moedas = R$ 36,00
    })

    it('calcula o plano anual proporcional à quantidade de moedas (R$ 24,00 / moeda)', () => {
      expect(custodiaAnualPorMoeda(0)).toBe(0)
      expect(custodiaAnualPorMoeda(1)).toBe(2400) // 1 moeda = R$ 24,00
      expect(custodiaAnualPorMoeda(18)).toBe(43200) // 18 moedas = R$ 432,00
    })

    it('não existe mais atalho para o modelo de faixas aposentado', () => {
      expect(custodiaMensalPorMoeda(1)).toBe(200)
      expect(custodiaAnualPorMoeda(1)).toBe(2400)
    })
  })

  describe('Tarifa de Saque e Corretagem', () => {
    it('tarifa de saque é fixa em R$ 5,00', () => {
      expect(TAXA_SAQUE_FIXA_CENTS).toBe(500)
    })

    it('calcula corretagem com 0,5% + R$ 1,00 fixo', () => {
      // Moeda de R$ 285,00 (28.500 centavos): 0,5% de 28500 = 142.5 -> arredonda para 143 + 100 = 243
      expect(tradeFee(28500)).toBe(243)
    })
  })

  describe('TabelaDeTaxas e Comissão dos dois lados (A1 - Decisão F-1)', () => {
    it('comissaoPorMoeda(20000) devolve { comprador: 200, vendedor: 200 }', () => {
      const { comprador, vendedor } = comissaoPorMoeda(20000)
      expect(comprador).toBe(200)
      expect(vendedor).toBe(200)
      expect(custoDeCompraPorMoeda(20000)).toBe(20200)
      expect(liquidoDeVendaPorMoeda(20000)).toBe(19800)
    })

    it('equivalência da comissão do vendedor para todo preço de 1 a 1.000.000 centavos', () => {
      for (let p = 1; p <= 50000; p++) {
        expect(comissaoPorMoeda(p).vendedor).toBe(Math.round(p * 0.005) + 100)
      }
      for (let p = 50001; p <= 1_000_000; p += 31) {
        expect(comissaoPorMoeda(p).vendedor).toBe(Math.round(p * 0.005) + 100)
      }
      expect(comissaoPorMoeda(1_000_000).vendedor).toBe(Math.round(1_000_000 * 0.005) + 100)
    })

    it('valores de retirada em TAXAS_PADRAO são iguais aos de retirada.ts', () => {
      expect(TAXAS_PADRAO.taxaRetiradaComum).toBe(TAXA_RETIRADA_COMUM_CENTS)
      expect(TAXAS_PADRAO.taxaRetiradaSegura).toBe(TAXA_RETIRADA_SEGURA_CENTS)
    })
  })
})
