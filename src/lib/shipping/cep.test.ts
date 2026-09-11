import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { consultarCep } from './cep'

describe('Correios — Consulta de CEP (LGPD Compliant)', () => {
  it('consulta CEP da Central de Custódia com sucesso', async () => {
    const res = await consultarCep('30315-970')

    expect(res.valido).toBe(true)
    expect(res.logradouro).toContain('Caixa Postal')
    expect(res.cidade).toBe('Belo Horizonte')
    expect(res.uf).toBe('MG')
  })

  it('retorna status inválido para CEPs com formato incorreto', async () => {
    const res = await consultarCep('123')
    expect(res.valido).toBe(false)
  })

  it('resolve CEP com formatação de hífen ou sem pontuação', async () => {
    const r1 = await consultarCep('30315970')
    const r2 = await consultarCep('30315-970')

    expect(r1.valido).toBe(true)
    expect(r2.valido).toBe(true)
    expect(r1.cidade).toBe(r2.cidade)
  })
})
