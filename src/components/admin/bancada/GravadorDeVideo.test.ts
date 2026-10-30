/** As mensagens de falha do upload do vídeo precisam dizer a causa ao operador (30/10/2026). */

import { describe, expect, it, vi } from 'vitest'

vi.mock('@/server/actions/admin/bancada', () => ({ assinarVideoNoPainel: vi.fn() }))

import { motivoDoStatus } from './GravadorDeVideo'

describe('motivoDoStatus', () => {
  it('413 fala em tamanho, 401/403 em assinatura, 400/415 em formato', () => {
    expect(motivoDoStatus(413)).toMatch(/maior que o limite/)
    expect(motivoDoStatus(403)).toMatch(/assinatura/)
    expect(motivoDoStatus(415)).toMatch(/formato/)
    expect(motivoDoStatus(502)).toBe('o armazenamento respondeu 502')
  })
})
