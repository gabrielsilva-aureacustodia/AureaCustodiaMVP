/**
 * Testes da conciliação — o ponto onde um pagamento externo vira saldo.
 *
 * É o teste que o critério de aceite do M5 pede em uma frase: **webhook
 * reenviado três vezes credita uma vez.** Aqui isso é exercitado de verdade,
 * contra o estado real da plataforma (store em memória) e com o gateway
 * substituído por um dublê — porque o que se quer provar é a regra, não a rede.
 *
 * O `vi.mock('server-only')` é o mesmo truque de `route.test.ts`: o pacote
 * estoura fora do contexto de servidor do Next, e a barreira continua valendo
 * no build de verdade.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

// `vi.hoisted` é obrigatório aqui: a fábrica do `vi.mock` sobe para o topo do
// arquivo, e uma variável declarada depois dela ainda não existiria.
const { consultarPagamentoMercadoPago } = vi.hoisted(() => ({
  consultarPagamentoMercadoPago: vi.fn(),
}))

vi.mock('@/lib/payments', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/payments')>()
  return { ...original, consultarPagamentoMercadoPago }
})

import { conciliarPagamento } from './conciliacao'
import { _limparRepositoriosEmMemoria, repositorioIntencoes } from './repositorios'
import { getState } from '@/server/state'

const EMAIL = 'gabrielsilva@testeaurea.com.br'

/** Resposta do gateway para um pagamento aprovado de `valor` centavos. */
function aprovado(ref: string, valor: number) {
  return {
    id: 'pay-1',
    status: 'approved',
    valorCents: valor,
    externalReference: ref,
    paymentMethodId: 'pix',
    paymentTypeId: 'bank_transfer',
    dateApproved: Date.now(),
    dateCreated: Date.now(),
    payerEmail: 'quem-pagou@exemplo.com',
  }
}

async function criarIntencao(ref: string, valor: number): Promise<void> {
  const agora = Date.now()
  await repositorioIntencoes().criar({
    externalReference: ref,
    userEmail: EMAIL,
    valor,
    metodo: 'pix',
    status: 'pendente',
    paymentId: null,
    motivoRecusa: null,
    createdAt: agora,
    updatedAt: agora,
  })
}

async function saldo(): Promise<number> {
  const s = await getState()
  return s.users[EMAIL].balance
}

describe('conciliarPagamento', () => {
  beforeEach(() => {
    _limparRepositoriosEmMemoria()
    consultarPagamentoMercadoPago.mockReset()
  })

  it('CRITÉRIO M5: três entregas do mesmo pagamento creditam UMA vez', async () => {
    const ref = 'DEP-tres-entregas'
    await criarIntencao(ref, 25_000)
    consultarPagamentoMercadoPago.mockResolvedValue(aprovado(ref, 25_000))

    const antes = await saldo()
    const r1 = await conciliarPagamento('pay-1')
    const r2 = await conciliarPagamento('pay-1')
    const r3 = await conciliarPagamento('pay-1')

    expect(r1.creditado).toBe(true)
    expect(r2.creditado).toBe(false)
    expect(r3.creditado).toBe(false)
    expect(await saldo()).toBe(antes + 25_000)
  })

  it('o depósito entra no extrato uma única vez', async () => {
    const ref = 'DEP-extrato'
    await criarIntencao(ref, 10_000)
    consultarPagamentoMercadoPago.mockResolvedValue(aprovado(ref, 10_000))

    const antes = (await getState()).deposits.length
    await conciliarPagamento('pay-1')
    await conciliarPagamento('pay-1')

    const depois = (await getState()).deposits
    expect(depois).toHaveLength(antes + 1)
    expect(depois[depois.length - 1]).toMatchObject({ userEmail: EMAIL, valor: 10_000 })
  })

  it('pagamento não aprovado não credita nada', async () => {
    const ref = 'DEP-pendente'
    await criarIntencao(ref, 30_000)
    consultarPagamentoMercadoPago.mockResolvedValue({ ...aprovado(ref, 30_000), status: 'pending' })

    const antes = await saldo()
    const r = await conciliarPagamento('pay-1')

    expect(r.creditado).toBe(false)
    expect(r.motivo).toContain('pending')
    expect(await saldo()).toBe(antes)
  })

  it('valor cobrado diferente do pedido é RECUSADO, com o motivo gravado', async () => {
    const ref = 'DEP-divergente'
    await criarIntencao(ref, 100_000)
    // Pagou R$ 1,00 numa cobrança de R$ 1.000,00.
    consultarPagamentoMercadoPago.mockResolvedValue(aprovado(ref, 100))

    const antes = await saldo()
    const r = await conciliarPagamento('pay-1')

    expect(r.creditado).toBe(false)
    expect(r.motivo).toContain('valor divergente')
    expect(await saldo()).toBe(antes)

    const intencao = await repositorioIntencoes().buscar(ref)
    expect(intencao?.status).toBe('recusado')
    expect(intencao?.motivoRecusa).toContain('valor divergente')
  })

  it('pagamento sem intenção conhecida não credita ninguém', async () => {
    consultarPagamentoMercadoPago.mockResolvedValue(aprovado('DEP-que-nao-existe', 5_000))
    const antes = await saldo()
    const r = await conciliarPagamento('pay-1')

    expect(r.creditado).toBe(false)
    expect(r.motivo).toContain('nenhuma intenção')
    expect(await saldo()).toBe(antes)
  })

  it('a intenção fica creditada, e com o id do pagamento, depois do sucesso', async () => {
    const ref = 'DEP-final'
    await criarIntencao(ref, 7_500)
    consultarPagamentoMercadoPago.mockResolvedValue(aprovado(ref, 7_500))

    await conciliarPagamento('pay-99')
    const intencao = await repositorioIntencoes().buscar(ref)
    expect(intencao?.status).toBe('creditado')
    expect(intencao?.paymentId).toBe('pay-99')
  })
})
