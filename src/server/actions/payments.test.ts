import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const { getSessionEmail } = vi.hoisted(() => ({ getSessionEmail: vi.fn() }))
vi.mock('@/server/session', () => ({ getSessionEmail }))

import { consultarStatusCobranca } from './payments'
import { _limparRepositoriosEmMemoria, repositorioIntencoes } from '@/server/payments/repositorios'

const EMAIL_USUARIO = 'gabrielsilva@testeaurea.com.br'
const EMAIL_OUTRO = 'alex@testeaurea.com.br'

describe('Server Action consultarStatusCobranca (payments.ts) — B1.6', () => {
  beforeEach(() => {
    _limparRepositoriosEmMemoria()
    getSessionEmail.mockReset()
    getSessionEmail.mockResolvedValue(EMAIL_USUARIO)
  })

  it('rejeita chamada sem sessão autenticada', async () => {
    getSessionEmail.mockResolvedValue(null)
    const res = await consultarStatusCobranca('DEP-123')
    expect(res.ok).toBe(false)
    expect(res.error).toBe('Sessão expirada.')
  })

  it('rejeita com erro se cobrança não for encontrada', async () => {
    const res = await consultarStatusCobranca('DEP-INEXISTENTE')
    expect(res.ok).toBe(false)
    expect(res.error).toBe('Cobrança não encontrada.')
  })

  it('rejeita se outro usuário tentar consultar a cobrança', async () => {
    const intencoes = repositorioIntencoes()
    await intencoes.criar({
      externalReference: 'DEP-SEGREDO',
      userEmail: EMAIL_OUTRO,
      valor: 5000,
      metodo: 'pix',
      status: 'pendente',
      tipoOperacao: 'deposito',
      metadata: null,
      paymentId: null,
      motivoRecusa: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })

    const res = await consultarStatusCobranca('DEP-SEGREDO')
    expect(res.ok).toBe(false)
    expect(res.error).toBe('Acesso não autorizado a esta cobrança.')
  })

  it('retorna status pendente quando a intenção está pendente', async () => {
    const intencoes = repositorioIntencoes()
    await intencoes.criar({
      externalReference: 'DEP-PENDENTE',
      userEmail: EMAIL_USUARIO,
      valor: 5000,
      metodo: 'pix',
      status: 'pendente',
      tipoOperacao: 'deposito',
      metadata: null,
      paymentId: null,
      motivoRecusa: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })

    const res = await consultarStatusCobranca('DEP-PENDENTE')
    expect(res.ok).toBe(true)
    expect(res.data?.status).toBe('pendente')
  })

  it('retorna status creditado quando a cobrança foi concluída', async () => {
    const intencoes = repositorioIntencoes()
    await intencoes.criar({
      externalReference: 'DEP-APROVADO',
      userEmail: EMAIL_USUARIO,
      valor: 5000,
      metodo: 'pix',
      status: 'creditado',
      tipoOperacao: 'deposito',
      metadata: null,
      paymentId: 'PAY-123',
      motivoRecusa: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })

    const res = await consultarStatusCobranca('DEP-APROVADO')
    expect(res.ok).toBe(true)
    expect(res.data?.status).toBe('creditado')
  })

  it('retorna status recusado com motivo quando a cobrança foi recusada', async () => {
    const intencoes = repositorioIntencoes()
    await intencoes.criar({
      externalReference: 'DEP-RECUSADO',
      userEmail: EMAIL_USUARIO,
      valor: 5000,
      metodo: 'pix',
      status: 'recusado',
      tipoOperacao: 'deposito',
      metadata: null,
      paymentId: null,
      motivoRecusa: 'Cartão recusado pelo emissor',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })

    const res = await consultarStatusCobranca('DEP-RECUSADO')
    expect(res.ok).toBe(true)
    expect(res.data?.status).toBe('recusado')
    expect(res.data?.motivo).toBe('Cartão recusado pelo emissor')
  })
})
