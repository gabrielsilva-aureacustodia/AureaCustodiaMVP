import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { consultarCep } from './cep'

describe('Correios — Consulta de CEP (LGPD Compliant)', () => {
  it('consulta CEP da Central de Custódia com sucesso', async () => {
    const res = await consultarCep('01310-100')

    expect(res.valido).toBe(true)
    expect(res.logradouro).toContain('Paulista')
    expect(res.cidade).toBe('São Paulo')
    expect(res.uf).toBe('SP')
  })

  it('retorna status inválido para CEPs com formato incorreto', async () => {
    const res = await consultarCep('123')
    expect(res.valido).toBe(false)
  })

  it('resolve CEP com formatação de hífen ou sem pontuação', async () => {
    const r1 = await consultarCep('01310100')
    const r2 = await consultarCep('01310-100')

    expect(r1.valido).toBe(true)
    expect(r2.valido).toBe(true)
    expect(r1.cidade).toBe(r2.cidade)
  })
})
