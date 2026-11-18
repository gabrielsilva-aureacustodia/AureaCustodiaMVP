/**
 * As Server Actions do gasto de marketing: a permissão vem ANTES de tudo.
 *
 * O acesso, o banco e o serviço são dublês — o que se testa aqui é a ORDEM e a ESCOLHA da permissão
 * (`contabil.lancar`, a mesma do controle financeiro), o ator gravado (o e-mail do membro, nunca o corpo da
 * requisição) e as mensagens de falha. A regra de validação está em src/domain/kpis.test.ts e a trilha, em
 * src/server/admin/marketing.test.ts.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const m = vi.hoisted(() => ({
  permissaoParaAcao: vi.fn(),
  bancoConfigurado: vi.fn(),
  executarNoBanco: vi.fn(),
  registrarGasto: vi.fn(),
  cancelarGastoRegistrado: vi.fn(),
}))

vi.mock('@/server/admin/acesso', () => ({ permissaoParaAcao: m.permissaoParaAcao }))
vi.mock('@/server/db/client', () => ({ bancoConfigurado: m.bancoConfigurado, executarNoBanco: m.executarNoBanco }))
vi.mock('@/server/admin/marketing', () => ({ registrarGasto: m.registrarGasto, cancelarGastoRegistrado: m.cancelarGastoRegistrado }))

import type { EntradaDeGasto } from '@/domain/kpis'

import { cancelarGastoNoPainel, registrarGastoNoPainel } from './marketing'

const ENTRADA: EntradaDeGasto = { canal: 'meta', de: '2026-11-01', ate: '2026-11-30', valorCents: 250_000, visitas: null, observacao: '' }
const MEMBRO = { email: 'gerente@aureacustodia.com.br' }

beforeEach(() => {
  for (const fn of Object.values(m)) fn.mockReset()
  m.permissaoParaAcao.mockResolvedValue({ ok: true, membro: MEMBRO })
  m.bancoConfigurado.mockReturnValue(true)
  m.registrarGasto.mockResolvedValue({ ok: true, mensagem: 'Gasto registrado.', dados: { id: 7 } })
  m.cancelarGastoRegistrado.mockResolvedValue({ ok: true, mensagem: 'Entrada cancelada.' })
})

describe('gasto de marketing — permissão antes de tudo', () => {
  it('registrar e cancelar pedem `contabil.lancar`; recusada, não olha o banco nem chama o serviço', async () => {
    m.permissaoParaAcao.mockResolvedValue({ ok: false, status: 403, erro: 'Sem permissão.' })

    expect(await registrarGastoNoPainel(ENTRADA)).toEqual({ ok: false, error: 'Sem permissão.' })
    expect(await cancelarGastoNoPainel(7, 'lançado no mês errado')).toEqual({ ok: false, error: 'Sem permissão.' })

    expect(m.permissaoParaAcao).toHaveBeenCalledTimes(2)
    expect(m.permissaoParaAcao.mock.calls.every(([chave]) => chave === 'contabil.lancar')).toBe(true)
    expect(m.bancoConfigurado).not.toHaveBeenCalled()
    expect(m.registrarGasto).not.toHaveBeenCalled()
    expect(m.cancelarGastoRegistrado).not.toHaveBeenCalled()
  })

  it('sessão expirada também para na porta', async () => {
    m.permissaoParaAcao.mockResolvedValue({ ok: false, status: 401, erro: 'Sessão expirada.' })
    expect(await registrarGastoNoPainel(ENTRADA)).toEqual({ ok: false, error: 'Sessão expirada.' })
    expect(m.registrarGasto).not.toHaveBeenCalled()
  })
})

describe('gasto de marketing — com permissão', () => {
  it('registra com o e-mail do membro como ator e devolve o id', async () => {
    const r = await registrarGastoNoPainel(ENTRADA)

    expect(r).toEqual({ ok: true, message: 'Gasto registrado.', data: { id: 7 } })
    // (executor, ator, entrada) — o ator é o membro da sessão.
    expect(m.registrarGasto).toHaveBeenCalledWith(m.executarNoBanco, MEMBRO.email, ENTRADA)
  })

  it('cancela com o id, o motivo e o e-mail do membro', async () => {
    const r = await cancelarGastoNoPainel(7, 'valor errado')

    expect(r).toEqual({ ok: true, message: 'Entrada cancelada.', data: undefined })
    expect(m.cancelarGastoRegistrado).toHaveBeenCalledWith(m.executarNoBanco, MEMBRO.email, 7, 'valor errado')
  })

  it('erro de validação do serviço chega à tela como mensagem, sem exceção', async () => {
    m.registrarGasto.mockResolvedValue({ ok: false, erro: 'Informe o valor gasto, maior que zero.' })
    expect(await registrarGastoNoPainel({ ...ENTRADA, valorCents: 0 })).toEqual({ ok: false, error: 'Informe o valor gasto, maior que zero.' })
  })

  it('sem banco, diz que só existe com o Supabase e não chama o serviço', async () => {
    m.bancoConfigurado.mockReturnValue(false)
    const r = await registrarGastoNoPainel(ENTRADA)
    expect(r.ok).toBe(false)
    expect(!r.ok && r.error).toMatch(/Supabase/)
    expect(m.registrarGasto).not.toHaveBeenCalled()
  })

  it('tabela ausente (42P01) vira a instrução do db:migrate', async () => {
    const erro = Object.assign(new Error('relation does not exist'), { code: '42P01' })
    const silencio = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    m.registrarGasto.mockRejectedValue(erro)

    const r = await registrarGastoNoPainel(ENTRADA)
    expect(!r.ok && r.error).toMatch(/migration 057.*db:migrate/)
    silencio.mockRestore()
  })

  it('qualquer outra exceção vira a mensagem genérica, sem vazar o erro do banco', async () => {
    const silencio = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    m.cancelarGastoRegistrado.mockRejectedValue(new Error('connection refused 10.0.0.1'))

    const r = await cancelarGastoNoPainel(7, 'valor errado')
    expect(r).toEqual({ ok: false, error: 'Falha ao salvar dados. Tente novamente.' })
    silencio.mockRestore()
  })
})
