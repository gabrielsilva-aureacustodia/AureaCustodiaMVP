import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import {
  _limparRecebimentosEmMemoria,
  buscarRecebimentoPorPaymentId,
  gravarRecebimento,
  listarRecebimentosPorCompetencia,
  listarTodosRecebimentos,
} from './recebimentos'

describe('Repositório aurea.recebimentos_gateway (B1.3)', () => {
  beforeEach(() => {
    _limparRecebimentosEmMemoria()
  })

  it('grava recebimento e calcula competência UTC automaticamente', async () => {
    const aprovadoEm = new Date('2026-09-14T15:30:00.000Z').getTime()
    await gravarRecebimento({
      paymentId: 'pay-001',
      externalReference: 'DEP-001',
      tipoOperacao: 'deposito',
      userEmail: 'user@testeaurea.com.br',
      metodo: 'pix',
      parcelas: 1,
      valorBruto: 10000,
      valorPagoCliente: 10000,
      tarifaGateway: 199,
      valorLiquido: 9801,
      aprovadoEm,
      liberacaoPrevista: aprovadoEm,
    })

    const rec = await buscarRecebimentoPorPaymentId('pay-001')
    expect(rec).not.toBeNull()
    expect(rec?.paymentId).toBe('pay-001')
    expect(rec?.competencia).toBe('2026-09')
    expect(rec?.valorBruto).toBe(10000)
    expect(rec?.tarifaGateway).toBe(199)
    expect(rec?.valorLiquido).toBe(9801)
  })

  it('idempotência: gravar o mesmo paymentId duas vezes NÃO duplica a linha', async () => {
    const aprovadoEm = Date.now()
    const r = {
      paymentId: 'pay-dup',
      externalReference: 'FAT-001',
      tipoOperacao: 'fatura_custodia',
      userEmail: 'user@testeaurea.com.br',
      metodo: 'credit_card',
      parcelas: 12,
      valorBruto: 2400,
      valorPagoCliente: 2400,
      tarifaGateway: 120,
      valorLiquido: 2280,
      aprovadoEm,
      liberacaoPrevista: aprovadoEm + 86400000 * 30,
    }

    await gravarRecebimento(r)
    await gravarRecebimento({ ...r, valorBruto: 99999 }) // segunda gravação deve ser ignorada

    const todos = await listarTodosRecebimentos()
    expect(todos.length).toBe(1)
    expect(todos[0].valorBruto).toBe(2400) // manteve o original
  })

  it('filtra por competência', async () => {
    const set2026 = new Date('2026-09-01T12:00:00.000Z').getTime()
    const out2026 = new Date('2026-10-01T12:00:00.000Z').getTime()

    await gravarRecebimento({
      paymentId: 'pay-set',
      externalReference: 'REF-1',
      tipoOperacao: 'deposito',
      userEmail: 'u1@testeaurea.com.br',
      metodo: 'pix',
      parcelas: 1,
      valorBruto: 5000,
      valorPagoCliente: 5000,
      tarifaGateway: 0,
      valorLiquido: 5000,
      aprovadoEm: set2026,
      liberacaoPrevista: set2026,
    })

    await gravarRecebimento({
      paymentId: 'pay-out',
      externalReference: 'REF-2',
      tipoOperacao: 'deposito',
      userEmail: 'u2@testeaurea.com.br',
      metodo: 'pix',
      parcelas: 1,
      valorBruto: 6000,
      valorPagoCliente: 6000,
      tarifaGateway: 0,
      valorLiquido: 6000,
      aprovadoEm: out2026,
      liberacaoPrevista: out2026,
    })

    const recsSet = await listarRecebimentosPorCompetencia('2026-09')
    expect(recsSet.length).toBe(1)
    expect(recsSet[0].paymentId).toBe('pay-set')

    const recsOut = await listarRecebimentosPorCompetencia('2026-10')
    expect(recsOut.length).toBe(1)
    expect(recsOut[0].paymentId).toBe('pay-out')
  })
})
