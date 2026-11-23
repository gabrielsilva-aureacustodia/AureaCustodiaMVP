/**
 * A09 (22/11/2026): o consentimento de cookies de publicidade. Sem escolha = não rastreia; só "aceito" libera o Pixel
 * (navegador) e a API de Conversões (servidor).
 */

import { describe, expect, it } from 'vitest'

import { consentimentoDoCookie } from '@/lib/cookies/consentimento'

describe('consentimentoDoCookie', () => {
  it('sem cookie ou sem a chave do consentimento: null (não rastreia)', () => {
    expect(consentimentoDoCookie(null)).toBeNull()
    expect(consentimentoDoCookie('')).toBeNull()
    expect(consentimentoDoCookie('aurea_session=abc; _fbp=fb.1.2.3')).toBeNull()
  })

  it('lê aceito e recusado no meio de outros cookies', () => {
    expect(consentimentoDoCookie('a=1; ro_cookies=aceito; b=2')).toBe('aceito')
    expect(consentimentoDoCookie('ro_cookies=recusado')).toBe('recusado')
  })

  it('valor estranho vale como "não escolheu"', () => {
    expect(consentimentoDoCookie('ro_cookies=talvez')).toBeNull()
    expect(consentimentoDoCookie('ro_cookies=%E0%A4%A')).toBeNull()
  })
})
