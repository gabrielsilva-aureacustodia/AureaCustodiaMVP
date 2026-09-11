import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const { getSessionEmail } = vi.hoisted(() => ({ getSessionEmail: vi.fn() }))
vi.mock('@/server/session', () => ({ getSessionEmail }))

const { criarPixDeposito, criarPreferenciaDeposito } = vi.hoisted(() => ({
  criarPixDeposito: vi.fn(),
  criarPreferenciaDeposito: vi.fn(),
}))
vi.mock('@/lib/payments', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/payments')>()
  return {
    ...original,
    criarPixDeposito,
    criarPreferenciaDeposito,
  }
})

import { salvarCadastro } from './account'
import { iniciarCompraDireta } from './payments'
import { mutateState } from '@/server/state'
import { _limparRepositoriosEmMemoria, repositorioIntencoes } from '@/server/payments/repositorios'

const EMAIL_COMPRADOR = 'gabrielsilva@testeaurea.com.br'
const EMAIL_VENDEDOR = 'alex@testeaurea.com.br'

describe('Server Action iniciarCompraDireta (payments.ts)', () => {
  beforeEach(async () => {
    _limparRepositoriosEmMemoria()
    getSessionEmail.mockReset()
    getSessionEmail.mockResolvedValue(EMAIL_COMPRADOR)
    criarPixDeposito.mockReset()
    criarPreferenciaDeposito.mockReset()

    // Limpa cadastro para testar travas
    await mutateState((s) => {
      const u = s.users[EMAIL_COMPRADOR]
      if (u) {
        delete (u as { cadastro?: unknown }).cadastro
      }
    })
  })

  it('rejeita chamada sem sessão autenticada', async () => {
    getSessionEmail.mockResolvedValue(null)
    const res = await iniciarCompraDireta('LOT-1', 1, 'pix')
    expect(res).toEqual({ ok: false, error: 'Sessão expirada.' })
  })

  it('rejeita compra direta se o usuário ainda não tiver cadastro formal completo', async () => {
    const res = await iniciarCompraDireta('LOT-1', 1, 'pix')
    expect(res).toEqual({
      ok: false,
      error: 'É necessário completar o cadastro formal antes de realizar uma compra direta.',
    })
  })

  it('rejeita anúncio inexistente mesmo com cadastro completo', async () => {
    // Completa o cadastro
    await salvarCadastro({
      cpf: '529.982.247-25',
      nomeCompleto: 'Gabriel Silva',
      dataNascimento: '1990-01-01',
      telefone: '(11) 98765-4321',
      endereco: {
        logradouro: 'Rua das Moedas',
        numero: '10',
        bairro: 'Centro',
        cidade: 'São Paulo',
        uf: 'SP',
        cep: '01001-000',
      },
      dadosBancarios: {
        chavePix: '52998224725',
        tipoChavePix: 'cpf',
      },
    })

    const res = await iniciarCompraDireta('LOT-inexistente', 1, 'pix')
    expect(res).toEqual({ ok: false, error: 'Este anúncio não está mais disponível.' })
  })

  it('rejeita compra do próprio anúncio', async () => {
    await salvarCadastro({
      cpf: '529.982.247-25',
      nomeCompleto: 'Gabriel Silva',
      dataNascimento: '1990-01-01',
      telefone: '(11) 98765-4321',
      endereco: {
        logradouro: 'Rua das Moedas',
        numero: '10',
        bairro: 'Centro',
        cidade: 'São Paulo',
        uf: 'SP',
        cep: '01001-000',
      },
      dadosBancarios: {
        chavePix: '52998224725',
        tipoChavePix: 'cpf',
      },
    })

    const lotId = 'LOT-proprio'
    await mutateState((s) => {
      s.sellOffers.push({
        id: 'OFFER-propria',
        coinId: 'RO-000001',
        seller: EMAIL_COMPRADOR,
        price: 25_000,
        obs: 'Meu lote',
        lotId,
        createdAt: Date.now(),
        tipoMoeda: 'Entrega da Bandeira Olímpica',
      })
    })

    const res = await iniciarCompraDireta(lotId, 1, 'pix')
    expect(res).toEqual({ ok: false, error: 'Você não pode comprar do seu próprio anúncio.' })
  })

  it('inicia compra direta com Pix com sucesso e gera referência com prefixo CMP-', async () => {
    await salvarCadastro({
      cpf: '529.982.247-25',
      nomeCompleto: 'Gabriel Silva',
      dataNascimento: '1990-01-01',
      telefone: '(11) 98765-4321',
      endereco: {
        logradouro: 'Rua das Moedas',
        numero: '10',
        bairro: 'Centro',
        cidade: 'São Paulo',
        uf: 'SP',
        cep: '01001-000',
      },
      dadosBancarios: {
        chavePix: '52998224725',
        tipoChavePix: 'cpf',
      },
    })

    const lotId = 'LOT-valido-1'
    await mutateState((s) => {
      s.sellOffers.push({
        id: 'OFFER-marcia-1',
        coinId: 'RO-000002',
        seller: EMAIL_VENDEDOR,
        price: 30_000,
        obs: 'Lote da Marcia',
        lotId,
        createdAt: Date.now(),
        tipoMoeda: 'Entrega da Bandeira Olímpica',
      })
    })

    criarPixDeposito.mockResolvedValue({
      paymentId: 'pay-pix-123',
      qrCode: 'pix-copia-e-cola-test',
      qrCodeBase64: 'base64image',
    })

    const res = await iniciarCompraDireta(lotId, 1, 'pix')

    expect(res.ok).toBe(true)
    if (!res.ok || !res.data) throw new Error('Esperava sucesso')

    expect(res.data.metodo).toBe('pix')
    expect(res.data.externalReference).toMatch(/^CMP-/)
    expect(res.data.valorCents).toBe(30_000)
    expect(res.data.lotId).toBe(lotId)
    expect(res.data.qty).toBe(1)
    expect(res.data.qrCode).toBe('pix-copia-e-cola-test')

    // Verifica que a intenção foi registrada no repositório com tipoOperacao 'compra_direta'
    const intencao = await repositorioIntencoes().buscar(res.data.externalReference)
    expect(intencao).not.toBeNull()
    expect(intencao?.tipoOperacao).toBe('compra_direta')
    expect(intencao?.metadata).toMatchObject({
      lotId,
      qty: 1,
      tipoMoeda: 'Entrega da Bandeira Olímpica',
      sellerEmail: EMAIL_VENDEDOR,
    })
    expect(intencao?.paymentId).toBe('pay-pix-123')
  })
})
