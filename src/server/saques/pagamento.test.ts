/**
 * O ciclo do saque no servidor: aprovar pelo Mercado Pago, conferir, pagar por fora e recusar
 * (14/10/2026). O gateway é um dublê — o que se prova aqui é a regra que impede de pagar duas vezes e
 * de devolver dinheiro que já saiu.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const g = vi.hoisted(() => ({
  configuracaoDePayouts: vi.fn(),
  criarPayoutPix: vi.fn(),
  consultarPayout: vi.fn(),
  avisarClienteDoSaque: vi.fn(),
}))
vi.mock('@/lib/payments/payouts', () => ({
  configuracaoDePayouts: g.configuracaoDePayouts,
  criarPayoutPix: g.criarPayoutPix,
  consultarPayout: g.consultarPayout,
}))
vi.mock('@/server/saques/avisos', () => ({ avisarClienteDoSaque: g.avisarClienteDoSaque }))

import type { Saque } from '@/domain/types'
import { getState, mutateState } from '@/server/state'

import {
  aprovarPeloMercadoPago,
  conferirNoMercadoPago,
  reagirAoAvisoDoGateway,
  recusarSaque,
  registrarPagamentoManual,
} from './pagamento'

const CLIENTE = 'gabrielsilva@testeaurea.com.br'
const SAQUE = 'SAQ-TESTE-1'

function saqueNovo(parcial: Partial<Saque> = {}): Saque {
  return {
    id: SAQUE,
    userEmail: CLIENTE,
    valorTotal: 19_600,
    taxa: 500,
    valorLiquido: 19_100,
    dadosBancarios: { chavePix: '10419977600', tipoChavePix: 'cpf' },
    status: 'solicitado',
    criadoEm: Date.now(),
    previsaoPagamentoEm: Date.now() + 3 * 86_400_000,
    atualizadoEm: Date.now(),
    ...parcial,
  }
}

async function prepararSaque(parcial: Partial<Saque> = {}, saldo = 0): Promise<void> {
  await mutateState((s) => {
    s.users[CLIENTE]!.balance = saldo
    s.saques = [saqueNovo(parcial)]
  })
}

async function saque(): Promise<Saque> {
  const s = await getState()
  return (s.saques ?? []).find((x) => x.id === SAQUE)!
}

async function saldo(): Promise<number> {
  return (await getState()).users[CLIENTE]!.balance
}

const LIGADO = { ativo: true, modo: 'sandbox', faltando: [], config: {} }

describe('saque pelo Mercado Pago', () => {
  beforeEach(() => {
    for (const f of Object.values(g)) f.mockReset()
    g.configuracaoDePayouts.mockReturnValue(LIGADO)
  })

  it('com o envio desligado não mexe no saque e manda pagar por fora', async () => {
    g.configuracaoDePayouts.mockReturnValue({ ativo: false, modo: 'sandbox', faltando: ['MP_PAYOUTS_ATIVO="true"'], config: null })
    await prepararSaque()
    const r = await aprovarPeloMercadoPago(SAQUE, 'socio@aureacustodia.com.br')
    expect(r.ok).toBe(false)
    expect(r.error).toContain('Marcar como pago')
    expect(g.criarPayoutPix).not.toHaveBeenCalled()
    expect((await saque()).status).toBe('solicitado')
  })

  it('aprovar manda o LÍQUIDO (não o total) para a chave certa e guarda o id do payout', async () => {
    await prepararSaque()
    g.criarPayoutPix.mockResolvedValue({ ok: true, payoutId: 'POP123', transacaoId: 'TOP456' })

    const r = await aprovarPeloMercadoPago(SAQUE, 'socio@aureacustodia.com.br')

    expect(r.ok).toBe(true)
    expect(g.criarPayoutPix).toHaveBeenCalledTimes(1)
    const entrada = g.criarPayoutPix.mock.calls[0]![0]
    expect(entrada.valorCents).toBe(19_100)
    expect(entrada.chave).toEqual({ tipo: 'CPF', valor: '104.199.776-00' })
    expect(entrada.referencia).toBe(SAQUE)

    const s = await saque()
    expect(s.status).toBe('em_processamento')
    expect(s.canal).toBe('mercadopago')
    expect(s.aprovadoPor).toBe('socio@aureacustodia.com.br')
    expect(s.payoutId).toBe('POP123')
    expect(s.tentativas).toBe(1)
    // o saldo NÃO volta: o dinheiro está a caminho do cliente
    expect(await saldo()).toBe(0)
  })

  it('dois cliques: o segundo encontra o saque já enviado e não chama o Mercado Pago', async () => {
    await prepararSaque()
    g.criarPayoutPix.mockResolvedValue({ ok: true, payoutId: 'POP123', transacaoId: null })
    await aprovarPeloMercadoPago(SAQUE, 'a@aureacustodia.com.br')
    const segundo = await aprovarPeloMercadoPago(SAQUE, 'b@aureacustodia.com.br')
    expect(segundo.ok).toBe(false)
    expect(segundo.error).toContain('já foi enviado')
    expect(g.criarPayoutPix).toHaveBeenCalledTimes(1)
  })

  it('chave que não bate com o tipo trava ANTES de chamar o Mercado Pago', async () => {
    await prepararSaque({ dadosBancarios: { chavePix: '123', tipoChavePix: 'cpf' } })
    const r = await aprovarPeloMercadoPago(SAQUE, 'socio@aureacustodia.com.br')
    expect(r.ok).toBe(false)
    expect(r.error).toContain('chave Pix')
    expect(g.criarPayoutPix).not.toHaveBeenCalled()
    expect((await saque()).status).toBe('solicitado')
  })

  it('recusa clara do Mercado Pago (4xx) devolve o saque à fila, sem pagar nem estornar', async () => {
    await prepararSaque()
    g.criarPayoutPix.mockResolvedValue({ ok: false, definitivo: true, erro: 'HTTP 400: chave inválida' })

    const r = await aprovarPeloMercadoPago(SAQUE, 'socio@aureacustodia.com.br')

    expect(r.ok).toBe(false)
    expect(r.error).toContain('recusou')
    const s = await saque()
    expect(s.status).toBe('solicitado')
    expect(s.canal).toBeNull()
    expect(s.detalheGateway).toContain('chave inválida')
    expect(await saldo()).toBe(0)
  })

  it('resposta incerta (rede/5xx) NÃO volta à fila: fica em processamento e a retomada usa a MESMA referência', async () => {
    await prepararSaque()
    g.criarPayoutPix.mockResolvedValueOnce({ ok: false, definitivo: false, erro: 'timeout' })

    const primeiro = await aprovarPeloMercadoPago(SAQUE, 'socio@aureacustodia.com.br')
    expect(primeiro.ok).toBe(false)
    expect(primeiro.error).toContain('confira o painel do Mercado Pago')
    let s = await saque()
    expect(s.status).toBe('em_processamento')
    expect(s.payoutId).toBeFalsy()
    expect(s.tentativas).toBe(1)

    g.criarPayoutPix.mockResolvedValueOnce({ ok: true, payoutId: 'POP1', transacaoId: null })
    const retomada = await aprovarPeloMercadoPago(SAQUE, 'socio@aureacustodia.com.br')
    expect(retomada.ok).toBe(true)
    expect(g.criarPayoutPix.mock.calls[1]![0].referencia).toBe(g.criarPayoutPix.mock.calls[0]![0].referencia)
    s = await saque()
    expect(s.tentativas).toBe(1)
    expect(s.payoutId).toBe('POP1')
  })

  it('depois de uma recusa clara, a nova tentativa usa referência NOVA (a antiga existe lá)', async () => {
    await prepararSaque()
    g.criarPayoutPix.mockResolvedValueOnce({ ok: false, definitivo: true, erro: 'HTTP 400' })
    await aprovarPeloMercadoPago(SAQUE, 'socio@aureacustodia.com.br')
    g.criarPayoutPix.mockResolvedValueOnce({ ok: true, payoutId: 'POP2', transacaoId: null })
    await aprovarPeloMercadoPago(SAQUE, 'socio@aureacustodia.com.br')
    expect(g.criarPayoutPix.mock.calls[0]![0].referencia).toBe(SAQUE)
    expect(g.criarPayoutPix.mock.calls[1]![0].referencia).toBe(`${SAQUE}-T2`)
  })
})

describe('conferir o resultado', () => {
  beforeEach(() => {
    for (const f of Object.values(g)) f.mockReset()
    g.configuracaoDePayouts.mockReturnValue(LIGADO)
  })

  const enviado = { status: 'em_processamento' as const, canal: 'mercadopago' as const, payoutId: 'POP1', tentativas: 1 }

  it('success: vira pago, guarda a transação como comprovante e não estorna', async () => {
    await prepararSaque(enviado)
    g.consultarPayout.mockResolvedValue({ ok: true, resultado: { payoutId: 'POP1', transacaoId: 'TOP9', statusTransacao: 'success', statusDetalhe: 'accredited' } })

    const r = await conferirNoMercadoPago(SAQUE)

    expect(r.ok).toBe(true)
    expect(r.data?.veredito).toBe('pago')
    const s = await saque()
    expect(s.status).toBe('pago')
    expect(s.comprovanteRef).toBe('TOP9')
    expect(s.pagoEm).toBeTruthy()
    expect(await saldo()).toBe(0)
  })

  it('pendente: segue em processamento, nada muda no saldo', async () => {
    await prepararSaque(enviado)
    g.consultarPayout.mockResolvedValue({ ok: true, resultado: { payoutId: 'POP1', transacaoId: 'TOP9', statusTransacao: 'pending', statusDetalhe: null } })
    const r = await conferirNoMercadoPago(SAQUE)
    expect(r.data?.veredito).toBe('em_andamento')
    expect((await saque()).status).toBe('em_processamento')
  })

  it('error/canceled: volta para a fila SEM estornar — devolver o dinheiro é decisão de uma pessoa', async () => {
    await prepararSaque(enviado)
    g.consultarPayout.mockResolvedValue({ ok: true, resultado: { payoutId: 'POP1', transacaoId: 'TOP9', statusTransacao: 'error', statusDetalhe: 'invalid_key' } })
    const r = await conferirNoMercadoPago(SAQUE)
    expect(r.data?.veredito).toBe('recusado')
    const s = await saque()
    expect(s.status).toBe('solicitado')
    expect(s.detalheGateway).toContain('invalid_key')
    expect(await saldo()).toBe(0)
  })

  it('falha ao consultar não muda nada', async () => {
    await prepararSaque(enviado)
    g.consultarPayout.mockResolvedValue({ ok: false, erro: 'HTTP 500' })
    const r = await conferirNoMercadoPago(SAQUE)
    expect(r.ok).toBe(false)
    expect((await saque()).status).toBe('em_processamento')
  })

  it('sem id de payout não há o que consultar', async () => {
    await prepararSaque({ status: 'em_processamento', canal: 'mercadopago', tentativas: 1 })
    const r = await conferirNoMercadoPago(SAQUE)
    expect(r.ok).toBe(false)
    expect(g.consultarPayout).not.toHaveBeenCalled()
  })

  it('saque já pago não é reaberto por uma consulta repetida', async () => {
    await prepararSaque({ ...enviado, status: 'pago', pagoEm: 1 })
    const r = await conferirNoMercadoPago(SAQUE)
    expect(r.ok).toBe(false)
    expect((await saque()).status).toBe('pago')
  })
})

describe('o aviso do Mercado Pago (não assinado) só aponta, a consulta decide', () => {
  beforeEach(() => {
    for (const f of Object.values(g)) f.mockReset()
    g.configuracaoDePayouts.mockReturnValue(LIGADO)
  })

  it('aviso que aponta para um saque em processamento dispara a consulta e avisa o cliente se pagou', async () => {
    await prepararSaque({ status: 'em_processamento', canal: 'mercadopago', payoutId: 'POP1', tentativas: 1 })
    g.consultarPayout.mockResolvedValue({ ok: true, resultado: { payoutId: 'POP1', transacaoId: 'TOP9', statusTransacao: 'success', statusDetalhe: 'accredited' } })

    await reagirAoAvisoDoGateway(null, 'POP1')

    expect(g.consultarPayout).toHaveBeenCalledWith('POP1')
    expect((await saque()).status).toBe('pago')
    expect(g.avisarClienteDoSaque).toHaveBeenCalledWith(SAQUE, 'pago')
  })

  it('aviso falso ("success" no corpo) para um id desconhecido não faz nada', async () => {
    await prepararSaque({ status: 'em_processamento', canal: 'mercadopago', payoutId: 'POP1', tentativas: 1 })
    await reagirAoAvisoDoGateway('QUALQUER-COISA', 'POP-FALSO')
    expect(g.consultarPayout).not.toHaveBeenCalled()
    expect((await saque()).status).toBe('em_processamento')
  })

  it('mesmo apontando certo, se o Mercado Pago disser que ainda está pendente, nada é pago', async () => {
    await prepararSaque({ status: 'em_processamento', canal: 'mercadopago', payoutId: 'POP1', tentativas: 1 })
    g.consultarPayout.mockResolvedValue({ ok: true, resultado: { payoutId: 'POP1', transacaoId: 'T', statusTransacao: 'pending', statusDetalhe: null } })
    await reagirAoAvisoDoGateway(null, 'POP1')
    expect((await saque()).status).toBe('em_processamento')
    expect(g.avisarClienteDoSaque).not.toHaveBeenCalled()
  })
})

describe('pagar por fora', () => {
  beforeEach(() => {
    for (const f of Object.values(g)) f.mockReset()
  })

  it('registra o comprovante e fecha o saque', async () => {
    await prepararSaque()
    const r = await registrarPagamentoManual(SAQUE, 'E2E-0001', 'socio@aureacustodia.com.br')
    expect(r.ok).toBe(true)
    const s = await saque()
    expect(s.status).toBe('pago')
    expect(s.canal).toBe('manual')
    expect(s.comprovanteRef).toBe('E2E-0001')
    expect(s.aprovadoPor).toBe('socio@aureacustodia.com.br')
  })

  it('exige comprovante', async () => {
    await prepararSaque()
    const r = await registrarPagamentoManual(SAQUE, '  ', 'socio@aureacustodia.com.br')
    expect(r.ok).toBe(false)
    expect((await saque()).status).toBe('solicitado')
  })

  it('com envio em andamento no Mercado Pago, recusa: pagar por fora agora pagaria duas vezes', async () => {
    await prepararSaque({ status: 'em_processamento', canal: 'mercadopago', payoutId: 'POP1', tentativas: 1 })
    const r = await registrarPagamentoManual(SAQUE, 'E2E-0001', 'socio@aureacustodia.com.br')
    expect(r.ok).toBe(false)
    expect((await saque()).status).toBe('em_processamento')
  })

  it('não paga duas vezes', async () => {
    await prepararSaque()
    await registrarPagamentoManual(SAQUE, 'E2E-0001', 'a@aureacustodia.com.br')
    const r = await registrarPagamentoManual(SAQUE, 'E2E-0002', 'b@aureacustodia.com.br')
    expect(r.ok).toBe(false)
    expect((await saque()).comprovanteRef).toBe('E2E-0001')
  })
})

describe('recusar', () => {
  beforeEach(() => {
    for (const f of Object.values(g)) f.mockReset()
  })

  it('devolve o valor TOTAL (líquido + tarifa) ao saldo e guarda o motivo', async () => {
    await prepararSaque({}, 0)
    const r = await recusarSaque(SAQUE, 'Chave Pix de outra titularidade')
    expect(r.ok).toBe(true)
    expect(await saldo()).toBe(19_600)
    const s = await saque()
    expect(s.status).toBe('falhou')
    expect(s.motivoFalha).toBe('Chave Pix de outra titularidade')
  })

  it('exige motivo, e não estorna duas vezes', async () => {
    await prepararSaque({}, 0)
    expect((await recusarSaque(SAQUE, '')).ok).toBe(false)
    expect(await saldo()).toBe(0)

    await recusarSaque(SAQUE, 'motivo válido')
    const de_novo = await recusarSaque(SAQUE, 'motivo válido')
    expect(de_novo.ok).toBe(false)
    expect(await saldo()).toBe(19_600)
  })

  it('não recusa saque pago, nem saque em processamento (o dinheiro pode já ter saído)', async () => {
    await prepararSaque({ status: 'pago', pagoEm: 1 }, 0)
    expect((await recusarSaque(SAQUE, 'tarde demais')).ok).toBe(false)
    expect(await saldo()).toBe(0)

    await prepararSaque({ status: 'em_processamento', canal: 'mercadopago', payoutId: 'POP1', tentativas: 1 }, 0)
    expect((await recusarSaque(SAQUE, 'tarde demais')).ok).toBe(false)
    expect(await saldo()).toBe(0)
  })
})
