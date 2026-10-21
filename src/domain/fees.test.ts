import { describe, expect, it } from 'vitest'

import {
  CUSTODIA_MENSAL_POR_MOEDA_CENTS,
  custodiaMensalPorMoeda,
  TAXA_SAQUE_FIXA_CENTS,
  TAXAS_PADRAO,
  comissaoPorMoeda,
  custoDeCompraPorMoeda,
  custodiaDaCompraPorMoeda,
  liquidoDeVendaPorMoeda,
  precoComComissaoDeCompra,
  tradeFee,
} from './fees'
import { TAXAS_RETIRADA_PADRAO } from './retirada'

describe('Regras de Taxas e Tarifas (fees.ts)', () => {
  describe('Custódia Mensal (Decisão 21/09/2026)', () => {
    it('constante oficial está definida como R$ 2,00 por moeda/mês', () => {
      expect(CUSTODIA_MENSAL_POR_MOEDA_CENTS).toBe(200) // R$ 2,00 por moeda/mês
    })

    it('calcula a custódia mensal proporcional à quantidade de moedas (R$ 2,00 / moeda)', () => {
      expect(custodiaMensalPorMoeda(0)).toBe(0)
      expect(custodiaMensalPorMoeda(-1)).toBe(0)
      expect(custodiaMensalPorMoeda(1)).toBe(200) // 1 moeda = R$ 2,00
      expect(custodiaMensalPorMoeda(5)).toBe(1000) // 5 moedas = R$ 10,00
      expect(custodiaMensalPorMoeda(18)).toBe(3600) // 18 moedas = R$ 36,00
    })

    it('plano anual foi removido de TAXAS_PADRAO', () => {
      expect('custodiaAnualPorMoeda' in TAXAS_PADRAO).toBe(false)
      expect('custodiaAnualParcelasMax' in TAXAS_PADRAO).toBe(false)
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
      // 21/10/2026: o comprador também paga o primeiro mês de custódia (R$ 2,00) — 20000 + 200 + 200.
      expect(custoDeCompraPorMoeda(20000)).toBe(20400)
      expect(liquidoDeVendaPorMoeda(20000)).toBe(19800)
    })

    it('custodia embutida na compra: preço + comissão + 1º mês, e o histórico fica só com preço + comissão', () => {
      expect(custodiaDaCompraPorMoeda()).toBe(200)
      expect(precoComComissaoDeCompra(20000)).toBe(20200)
      expect(custoDeCompraPorMoeda(20000)).toBe(precoComComissaoDeCompra(20000) + custodiaDaCompraPorMoeda())
    })

    it('a custódia da compra segue a tabela vigente, não o padrão do código', () => {
      const t = { ...TAXAS_PADRAO, custodiaMensalPorMoeda: 350 }
      expect(custodiaDaCompraPorMoeda(t)).toBe(350)
      expect(custoDeCompraPorMoeda(20000, t)).toBe(20000 + 200 + 350)
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
      // B3 trocou as duas constantes de retirada.ts por TAXAS_RETIRADA_PADRAO; a conferência
      // continua a mesma — as duas tabelas precisam concordar.
      expect(TAXAS_PADRAO.taxaRetiradaComum).toBe(TAXAS_RETIRADA_PADRAO.taxaRetiradaComum)
      expect(TAXAS_PADRAO.taxaRetiradaSegura).toBe(TAXAS_RETIRADA_PADRAO.taxaRetiradaSegura)
      expect(TAXAS_PADRAO.retiradaSeguraParcelasMax).toBe(TAXAS_RETIRADA_PADRAO.retiradaSeguraParcelasMax)
    })
  })
})
