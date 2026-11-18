/**
 * O serviço do gasto de marketing: valida ANTES de abrir transação e grava a trilha `admin.marketing.<verbo>`
 * na MESMA transação da escrita (a `tx` que o executor entrega é a que vai ao repositório e à auditoria).
 *
 * Repositório e auditoria são dublês: o que se confere é a ordem, o ator e o conteúdo da trilha. O SQL em si
 * está coberto pela guarda de src/server/db/sql-injecao.test.ts e pela migration 057, e roda contra o banco real
 * na aplicação da migration pelo Controle.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

const m = vi.hoisted(() => ({
  inserirGasto: vi.fn(),
  cancelarGasto: vi.fn(),
  registrarAcaoAdmin: vi.fn(),
}))

vi.mock('@/server/db/repositories/marketing', () => ({ inserirGasto: m.inserirGasto, cancelarGasto: m.cancelarGasto }))
vi.mock('./auditar', () => ({ registrarAcaoAdmin: m.registrarAcaoAdmin }))

import type { EntradaDeGasto } from '@/domain/kpis'
import type { Executor } from '@/server/db/sql'

import { cancelarGastoRegistrado, registrarGasto } from './marketing'

const TX = { query: vi.fn() }
const AGORA = Date.UTC(2026, 10, 18, 15)
const ATOR = 'gerente@aureacustodia.com.br'

/** Um executor de mentira que conta quantas transações abriu e entrega sempre a mesma `tx`. */
function executor(): { executar: Executor; aberturas: () => number } {
  let n = 0
  const executar = (async (fn: (tx: typeof TX) => Promise<unknown>) => {
    n++
    return fn(TX)
  }) as unknown as Executor
  return { executar, aberturas: () => n }
}

const ENTRADA: EntradaDeGasto = { canal: 'evento', de: '2026-11-08', ate: '2026-11-08', valorCents: 40_000, visitas: null, observacao: ' Feira de colecionadores ' }

beforeEach(() => {
  for (const fn of Object.values(m)) fn.mockReset()
  m.inserirGasto.mockResolvedValue(9)
  m.cancelarGasto.mockResolvedValue({ id: 9, canal: 'evento', de: '2026-11-08', ate: '2026-11-08', valor: 40_000 })
})

describe('registrarGasto', () => {
  it('grava a entrada e a trilha na mesma transação, com o ator e o que foi digitado', async () => {
    const { executar, aberturas } = executor()
    const r = await registrarGasto(executar, ATOR, ENTRADA, AGORA)

    expect(r).toMatchObject({ ok: true, dados: { id: 9 } })
    expect(r.ok && r.mensagem).toMatch(/R\$\s*400,00.*Evento/)
    expect(aberturas()).toBe(1)
    expect(m.inserirGasto).toHaveBeenCalledWith(TX, { canal: 'evento', de: '2026-11-08', ate: '2026-11-08', valor: 40_000, visitas: null, observacao: 'Feira de colecionadores', criadoPor: ATOR, agora: AGORA })
    expect(m.registrarAcaoAdmin).toHaveBeenCalledWith(TX, expect.objectContaining({ ator: ATOR, area: 'marketing', verbo: 'registrar', entidade: 'marketing_gasto', entidadeId: '9', agora: AGORA }))
    expect(m.registrarAcaoAdmin.mock.calls[0]![1].detalhes).toMatchObject({ canal: 'evento', valorCents: 40_000, de: '2026-11-08', ate: '2026-11-08' })
  })

  it('entrada inválida volta com o erro SEM abrir transação e sem trilha', async () => {
    const { executar, aberturas } = executor()
    const r = await registrarGasto(executar, ATOR, { ...ENTRADA, valorCents: -5 }, AGORA)

    expect(r.ok).toBe(false)
    expect(aberturas()).toBe(0)
    expect(m.inserirGasto).not.toHaveBeenCalled()
    expect(m.registrarAcaoAdmin).not.toHaveBeenCalled()
  })
})

describe('cancelarGastoRegistrado', () => {
  it('cancela e grava a trilha com o motivo, na mesma transação', async () => {
    const { executar, aberturas } = executor()
    const r = await cancelarGastoRegistrado(executar, ATOR, 9, ' valor digitado errado ', AGORA)

    expect(r.ok).toBe(true)
    expect(aberturas()).toBe(1)
    expect(m.cancelarGasto).toHaveBeenCalledWith(TX, 9, ATOR, 'valor digitado errado', AGORA)
    expect(m.registrarAcaoAdmin).toHaveBeenCalledWith(TX, expect.objectContaining({ ator: ATOR, area: 'marketing', verbo: 'cancelar', entidadeId: '9' }))
    expect(m.registrarAcaoAdmin.mock.calls[0]![1].detalhes).toMatchObject({ motivo: 'valor digitado errado', valorCents: 40_000 })
  })

  it('entrada que não existe ou já foi cancelada: erro e nenhuma trilha', async () => {
    m.cancelarGasto.mockResolvedValue(null)
    const { executar } = executor()
    const r = await cancelarGastoRegistrado(executar, ATOR, 404, 'engano', AGORA)

    expect(r).toEqual({ ok: false, erro: 'Entrada não encontrada ou já cancelada.' })
    expect(m.registrarAcaoAdmin).not.toHaveBeenCalled()
  })

  it.each([
    ['id em texto', '9', 'motivo ok'],
    ['id zero', 0, 'motivo ok'],
    ['id quebrado', 1.5, 'motivo ok'],
    ['sem motivo', 9, '  '],
    ['motivo curto demais', 9, 'ab'],
    ['motivo enorme', 9, 'x'.repeat(201)],
  ])('recusa antes de abrir transação: %s', async (_nome, id, motivo) => {
    const { executar, aberturas } = executor()
    const r = await cancelarGastoRegistrado(executar, ATOR, id, motivo, AGORA)

    expect(r.ok).toBe(false)
    expect(aberturas()).toBe(0)
    expect(m.cancelarGasto).not.toHaveBeenCalled()
  })
})
