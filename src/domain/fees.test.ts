import { describe, expect, it } from 'vitest'

import {
  CUSTODIA_ANUAL_POR_MOEDA_CENTS,
  CUSTODIA_MENSAL_POR_MOEDA_CENTS,
  custodiaAnualPorMoeda,
  custodiaMensalPorMoeda,
  TAXA_SAQUE_FIXA_CENTS,
  tradeFee,
} from './fees'

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
      // `custodyFeeForCount` foi apagado em 11/09/2026. Ele sobreviveu como
      // apelido para o cálculo mensal, e foi assim que a tela ficou dizendo
      // "Custódia anual" com valor mensal por trás. Quem calcula custódia é
      // `custodiaMensalPorMoeda` ou `custodiaAnualPorMoeda`, pelo nome.
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
})
