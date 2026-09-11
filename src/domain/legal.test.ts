import { describe, expect, it } from 'vitest'

import {
  BLOCOS_LEGAIS_OBRIGATORIOS,
  TODOS_OS_BLOCOS_IDS,
  validarAceiteBlocos,
  verificarAceiteVigente,
  VERSAO_PRIVACIDADE_VIGENTE,
  VERSAO_TERMOS_VIGENTE,
} from './legal'
import type { LegalBlockAcceptance, LegalBlockId } from './types'

describe('Módulo de Domínio · Aceite por Blocos (legal.ts)', () => {
  it('define exatamente os 6 blocos operacionais acordados pelo jurídico e sócios', () => {
    expect(BLOCOS_LEGAIS_OBRIGATORIOS).toHaveLength(6)

    const ids = BLOCOS_LEGAIS_OBRIGATORIOS.map((b) => b.id)
    expect(ids).toEqual([
      'moeda_equiparavel',
      'prazos_d3_d30',
      'custos_cliente',
      'debito_garantia',
      'posicionamento_institucional',
      'dados_pessoais_lgpd',
    ])

    BLOCOS_LEGAIS_OBRIGATORIOS.forEach((b) => {
      expect(b.titulo.trim().length).toBeGreaterThan(5)
      expect(b.resumo.trim().length).toBeGreaterThan(20)
      expect(b.clausulaReferencia.trim().length).toBeGreaterThan(3)
      expect(b.urlDocumento.startsWith('/')).toBe(true)
    })
  })

  it('validarAceiteBlocos identifica blocos faltantes e valida quando todos constam', () => {
    expect(validarAceiteBlocos(null).valido).toBe(false)
    expect(validarAceiteBlocos(undefined).valido).toBe(false)
    expect(validarAceiteBlocos([]).valido).toBe(false)
    expect(validarAceiteBlocos([]).faltando).toEqual(TODOS_OS_BLOCOS_IDS)

    // Apenas 5 de 6 blocos marcados
    const parciais: LegalBlockId[] = [
      'moeda_equiparavel',
      'prazos_d3_d30',
      'custos_cliente',
      'debito_garantia',
      'posicionamento_institucional',
    ]
    const resParcial = validarAceiteBlocos(parciais)
    expect(resParcial.valido).toBe(false)
    expect(resParcial.faltando).toEqual(['dados_pessoais_lgpd'])

    // Todos os 6 blocos marcados
    const resCompleto = validarAceiteBlocos([...TODOS_OS_BLOCOS_IDS])
    expect(resCompleto.valido).toBe(true)
    expect(resCompleto.faltando).toEqual([])

    // Presença de duplicatas ou itens extras não quebra a validação
    const comExtras = [...TODOS_OS_BLOCOS_IDS, 'moeda_equiparavel', 'outro_bloco_invalido']
    const resExtras = validarAceiteBlocos(comExtras)
    expect(resExtras.valido).toBe(true)
    expect(resExtras.faltando).toEqual([])
  })

  describe('verificarAceiteVigente', () => {
    const aceiteValido: LegalBlockAcceptance = {
      termsVersion: VERSAO_TERMOS_VIGENTE,
      privacyVersion: VERSAO_PRIVACIDADE_VIGENTE,
      acceptedAt: new Date().toISOString(),
      blocks: [...TODOS_OS_BLOCOS_IDS],
    }

    it('rejeita ausência de aceite (conta nova sem marcação)', () => {
      expect(verificarAceiteVigente(null)).toBe(false)
      expect(verificarAceiteVigente(undefined)).toBe(false)
    })

    it('aprova aceite íntegro com versões vigentes e todos os blocos', () => {
      expect(verificarAceiteVigente(aceiteValido)).toBe(true)
    })

    it('rejeita aceite com blocos incompletos', () => {
      const incompleto: LegalBlockAcceptance = {
        ...aceiteValido,
        blocks: ['moeda_equiparavel'],
      }
      expect(verificarAceiteVigente(incompleto)).toBe(false)
    })

    it('rejeita aceite se a versão dos Termos estiver desatualizada (reaparece a tela)', () => {
      const versaoAntigaTermos: LegalBlockAcceptance = {
        ...aceiteValido,
        termsVersion: 'RASCUNHO-0.1-2026-09-02',
      }
      expect(verificarAceiteVigente(versaoAntigaTermos)).toBe(false)
    })

    it('rejeita aceite se a versão de Privacidade estiver desatualizada (reaparece a tela)', () => {
      const versaoAntigaPrivacidade: LegalBlockAcceptance = {
        ...aceiteValido,
        privacyVersion: 'rascunho-teste-2026-09-06',
      }
      expect(verificarAceiteVigente(versaoAntigaPrivacidade)).toBe(false)
    })

    it('permite checar contra versões hipotéticas futuras', () => {
      // Se o jurídico subir os termos para 1.1, a conta com 1.0 não é mais considerada vigente
      expect(verificarAceiteVigente(aceiteValido, '1.1-2026-10-01', VERSAO_PRIVACIDADE_VIGENTE)).toBe(
        false,
      )
    })
  })
})
