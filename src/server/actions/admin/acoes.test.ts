/**
 * A recusa acontece no servidor: cada Server Action do painel pede a SUA permissão, e
 * pede antes de qualquer outra coisa.
 *
 * O serviço e o acesso são dublês — o que se testa aqui é a ORDEM e a ESCOLHA da
 * permissão em cada ação. As regras de papel estão em src/server/admin/banco.test.ts.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const m = vi.hoisted(() => ({
  permissaoParaAcao: vi.fn(),
  bancoConfigurado: vi.fn(),
  executarNoBanco: vi.fn(),
  lancarManual: vi.fn(),
  estornarManual: vi.fn(),
  definirAliquota: vi.fn(),
  verificarLedger: vi.fn(),
  sincronizarSheetsComoAtor: vi.fn(),
  registrarAcaoAdmin: vi.fn(),
  adicionarMembro: vi.fn(),
  alterarMembro: vi.fn(),
  criarPapel: vi.fn(),
  alterarPapel: vi.fn(),
  excluirPapel: vi.fn(),
}))

vi.mock('@/server/admin/acesso', () => ({ permissaoParaAcao: m.permissaoParaAcao, ambienteAtual: () => ({ listaDoAmbiente: undefined, contasDoSeed: {} }) }))
vi.mock('@/server/db/client', () => ({ bancoConfigurado: m.bancoConfigurado, executarNoBanco: m.executarNoBanco }))
vi.mock('@/server/admin/contabil', () => ({
  lancarManual: m.lancarManual,
  estornarManual: m.estornarManual,
  definirAliquota: m.definirAliquota,
  verificarLedger: m.verificarLedger,
}))
vi.mock('@/server/relatorios/sincronizar', () => ({ sincronizarSheetsComoAtor: m.sincronizarSheetsComoAtor }))
vi.mock('@/server/admin/auditar', () => ({ registrarAcaoAdmin: m.registrarAcaoAdmin }))
vi.mock('@/server/admin/rbac', () => ({
  adicionarMembro: m.adicionarMembro,
  alterarMembro: m.alterarMembro,
  criarPapel: m.criarPapel,
  alterarPapel: m.alterarPapel,
  excluirPapel: m.excluirPapel,
}))

import { definirAliquotaNoPainel, enviarAoSheetsNoPainel, estornarManualNoPainel, lancarManualNoPainel, verificarLedgerNoPainel } from './contabil'
import { adicionarMembroNoPainel, alterarMembroNoPainel, alterarPapelNoPainel, criarPapelNoPainel, excluirPapelNoPainel } from './equipe'

const MEMBRO = { email: 'contador@exemplo.com.br', permissoes: [] }
const RECUSA = { ok: false, status: 403, erro: 'Seu papel no painel não inclui esta ação.' }

beforeEach(() => {
  for (const fn of Object.values(m)) fn.mockReset()
  m.bancoConfigurado.mockReturnValue(true)
  // O executor de verdade abre uma transação e entrega a consulta; o dublê só entrega.
  m.executarNoBanco.mockImplementation((fn: (tx: unknown) => unknown) => fn({ query: vi.fn() }))
})

const casos: Array<[string, string, () => Promise<{ ok: boolean }>, ReturnType<typeof vi.fn>]> = [
  ['lançar manual', 'contabil.lancar', () => lancarManualNoPainel('2026-09-01', '4.1.03', 'Aluguel', 1000), m.lancarManual],
  ['estornar', 'contabil.lancar', () => estornarManualNoPainel(1, 'duplicado'), m.estornarManual],
  ['alíquota', 'contabil.parametros', () => definirAliquotaNoPainel('issBp', 500), m.definirAliquota],
  ['conferir livro-razão', 'resultados.ver', () => verificarLedgerNoPainel(), m.verificarLedger],
  ['enviar ao Sheets', 'resultados.exportar', () => enviarAoSheetsNoPainel({ ano: '2026' }), m.sincronizarSheetsComoAtor],
  ['adicionar membro', 'admin.membros', () => adicionarMembroNoPainel('x@exemplo.com.br', 'X', 'socio'), m.adicionarMembro],
  ['alterar membro', 'admin.membros', () => alterarMembroNoPainel('x@exemplo.com.br', { status: 'inativo' }), m.alterarMembro],
  ['criar papel', 'admin.papeis', () => criarPapelNoPainel({ slug: 'contador', nome: 'Contador', rank: 30, variantePainel: 'gestao', permissoes: [] }), m.criarPapel],
  ['alterar papel', 'admin.papeis', () => alterarPapelNoPainel('socio', { nome: 'Sócios' }), m.alterarPapel],
  ['excluir papel', 'admin.papeis', () => excluirPapelNoPainel('contador'), m.excluirPapel],
]

describe('toda ação do painel pede a própria permissão, antes de tudo', () => {
  it.each(casos)('%s pede %s e, recusada, não chama o serviço', async (_nome, chave, chamar, servico) => {
    m.permissaoParaAcao.mockResolvedValue(RECUSA)
    const r = await chamar()
    expect(m.permissaoParaAcao).toHaveBeenCalledWith(chave)
    expect(r).toEqual({ ok: false, error: RECUSA.erro })
    expect(servico).not.toHaveBeenCalled()
    expect(m.bancoConfigurado).not.toHaveBeenCalled()
  })
})

describe('permitido', () => {
  it('sem banco, diz isso e não chama o serviço', async () => {
    m.permissaoParaAcao.mockResolvedValue({ ok: true, membro: MEMBRO })
    m.bancoConfigurado.mockReturnValue(false)
    const r = await lancarManualNoPainel('2026-09-01', '4.1.03', 'Aluguel', 1000)
    expect(r.ok).toBe(false)
    expect(m.lancarManual).not.toHaveBeenCalled()
  })

  it('com banco, o ator é o e-mail do membro, e o resultado vira mensagem de toast', async () => {
    m.permissaoParaAcao.mockResolvedValue({ ok: true, membro: MEMBRO })
    m.lancarManual.mockResolvedValue({ ok: true, mensagem: 'Lançamento registrado.', dados: { id: 7 } })
    const r = await lancarManualNoPainel('2026-09-01', '4.1.03', 'Aluguel', 1000)
    expect(m.lancarManual.mock.calls[0][1]).toBe(MEMBRO.email)
    expect(r).toEqual({ ok: true, message: 'Lançamento registrado.', data: { id: 7 } })
  })

  it('exceção do serviço vira a mensagem de falha de gravação, não um erro na tela', async () => {
    m.permissaoParaAcao.mockResolvedValue({ ok: true, membro: MEMBRO })
    m.adicionarMembro.mockRejectedValue(new Error('conexão caiu'))
    const erro = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const r = await adicionarMembroNoPainel('x@exemplo.com.br', 'X', 'socio')
    expect(r).toEqual({ ok: false, error: 'Falha ao salvar dados. Tente novamente.' })
    erro.mockRestore()
  })

  it('o envio ao Sheets fica na trilha como gesto do painel, com o resultado', async () => {
    m.permissaoParaAcao.mockResolvedValue({ ok: true, membro: MEMBRO })
    m.sincronizarSheetsComoAtor.mockResolvedValue({ ok: false, message: 'Google Sheets não configurado.' })
    const r = await enviarAoSheetsNoPainel({ ano: '2026', mes: '9' })
    expect(r).toEqual({ ok: false, error: 'Google Sheets não configurado.' })
    expect(m.sincronizarSheetsComoAtor).toHaveBeenCalledWith(MEMBRO.email, { ano: '2026', mes: '9', trimestre: null })
    expect(m.registrarAcaoAdmin).toHaveBeenCalledTimes(1)
    expect(m.registrarAcaoAdmin.mock.calls[0][1]).toMatchObject({ ator: MEMBRO.email, area: 'resultados', verbo: 'enviar_sheets', detalhes: { ok: false } })
  })
})
