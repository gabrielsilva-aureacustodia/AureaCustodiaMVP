/**
 * Quem pode mexer em saque: só a equipe com `saques.pagar`, conferido por CADA ação, antes de qualquer
 * efeito (14/10/2026).
 *
 * O caso que originou: `confirmarLiquidacaoSaque` e `rejeitarSaque` viviam em `account.ts` e só
 * conferiam que havia uma sessão. O serviço e o acesso são dublês aqui — o que se testa é a ORDEM e a
 * ESCOLHA da permissão. A regra de papéis em si está em `src/server/admin/banco.test.ts`.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const m = vi.hoisted(() => ({
  permissaoParaAcao: vi.fn(),
  bancoConfigurado: vi.fn(),
  executarNoBanco: vi.fn(),
  registrarAcaoAdmin: vi.fn(),
  aprovarPeloMercadoPago: vi.fn(),
  conferirNoMercadoPago: vi.fn(),
  registrarPagamentoManual: vi.fn(),
  recusarSaque: vi.fn(),
  avisarClienteDoSaque: vi.fn(),
}))

vi.mock('@/server/admin/acesso', () => ({ permissaoParaAcao: m.permissaoParaAcao }))
vi.mock('@/server/db/client', () => ({ bancoConfigurado: m.bancoConfigurado, executarNoBanco: m.executarNoBanco }))
vi.mock('@/server/admin/auditar', () => ({ registrarAcaoAdmin: m.registrarAcaoAdmin }))
vi.mock('@/server/saques/pagamento', () => ({
  aprovarPeloMercadoPago: m.aprovarPeloMercadoPago,
  conferirNoMercadoPago: m.conferirNoMercadoPago,
  registrarPagamentoManual: m.registrarPagamentoManual,
  recusarSaque: m.recusarSaque,
}))
vi.mock('@/server/saques/avisos', () => ({ avisarClienteDoSaque: m.avisarClienteDoSaque }))

import { aprovarSaque, conferirSaque, marcarSaquePago, recusarSaque } from './saques'

const NEGADO = { ok: false as const, status: 403 as const, erro: 'Esta área é restrita à equipe do Real Olímpico.' }
const MEMBRO = { email: 'socio@aureacustodia.com.br', nome: 'Sócio' }

const ACOES: Array<[string, () => Promise<{ ok: boolean; error?: string }>]> = [
  ['aprovarSaque', () => aprovarSaque('SAQ-1')],
  ['conferirSaque', () => conferirSaque('SAQ-1')],
  ['marcarSaquePago', () => marcarSaquePago('SAQ-1', 'E2E123')],
  ['recusarSaque', () => recusarSaque('SAQ-1', 'Chave inválida')],
]

function nenhumEfeito(): void {
  expect(m.aprovarPeloMercadoPago).not.toHaveBeenCalled()
  expect(m.conferirNoMercadoPago).not.toHaveBeenCalled()
  expect(m.registrarPagamentoManual).not.toHaveBeenCalled()
  expect(m.recusarSaque).not.toHaveBeenCalled()
  expect(m.avisarClienteDoSaque).not.toHaveBeenCalled()
}

describe('as ações de saque do painel', () => {
  beforeEach(() => {
    for (const f of Object.values(m)) f.mockReset()
    m.bancoConfigurado.mockReturnValue(false)
  })

  it.each(ACOES)('%s recusa quem não é da equipe e não toca no saque', async (_nome, chamar) => {
    m.permissaoParaAcao.mockResolvedValue(NEGADO)
    const r = await chamar()
    expect(r.ok).toBe(false)
    expect(r.error).toContain('restrita à equipe')
    nenhumEfeito()
  })

  it.each(ACOES)('%s pede exatamente a permissão saques.pagar', async (_nome, chamar) => {
    m.permissaoParaAcao.mockResolvedValue(NEGADO)
    await chamar()
    expect(m.permissaoParaAcao).toHaveBeenCalledTimes(1)
    expect(m.permissaoParaAcao).toHaveBeenCalledWith('saques.pagar')
  })

  it('aprovar: com permissão, o serviço recebe o e-mail de quem aprovou', async () => {
    m.permissaoParaAcao.mockResolvedValue({ ok: true, membro: MEMBRO })
    m.aprovarPeloMercadoPago.mockResolvedValue({ ok: true, message: 'enviado', data: { userEmail: 'c@x.com' } })
    const r = await aprovarSaque('SAQ-9')
    expect(r.ok).toBe(true)
    expect(m.aprovarPeloMercadoPago).toHaveBeenCalledWith('SAQ-9', MEMBRO.email)
  })

  it('pagar por fora e recusar avisam o cliente só quando deu certo', async () => {
    m.permissaoParaAcao.mockResolvedValue({ ok: true, membro: MEMBRO })

    m.registrarPagamentoManual.mockResolvedValue({ ok: false, error: 'já pago' })
    await marcarSaquePago('SAQ-1', 'E2E123')
    expect(m.avisarClienteDoSaque).not.toHaveBeenCalled()

    m.registrarPagamentoManual.mockResolvedValue({ ok: true, message: 'ok', data: { userEmail: 'c@x.com' } })
    await marcarSaquePago('SAQ-1', 'E2E123')
    expect(m.avisarClienteDoSaque).toHaveBeenCalledWith('SAQ-1', 'pago')

    m.avisarClienteDoSaque.mockReset()
    m.recusarSaque.mockResolvedValue({ ok: true, message: 'ok', data: { userEmail: 'c@x.com' } })
    await recusarSaque('SAQ-2', 'Chave inválida')
    expect(m.avisarClienteDoSaque).toHaveBeenCalledWith('SAQ-2', 'recusado')
  })

  it('falha inesperada vira mensagem, não exceção', async () => {
    m.permissaoParaAcao.mockResolvedValue({ ok: true, membro: MEMBRO })
    m.aprovarPeloMercadoPago.mockRejectedValue(new Error('banco caiu'))
    const r = await aprovarSaque('SAQ-1')
    expect(r.ok).toBe(false)
    expect(r.error).toContain('Falha')
  })
})
