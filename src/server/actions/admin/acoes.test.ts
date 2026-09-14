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
  // C2 — atendimento
  carregarAtendimento: vi.fn(),
  responderConversa: vi.fn(),
  iniciarConversa: vi.fn(),
  anotarConversa: vi.fn(),
  mudarStatusConversa: vi.fn(),
  atribuirConversa: vi.fn(),
  criarEtiqueta: vi.fn(),
  etiquetarConversa: vi.fn(),
  atualizarContato: vi.fn(),
  provedorDoAmbiente: vi.fn(),
  // C2 — usuários
  criarUsuario: vi.fn(),
  editarCadastro: vi.fn(),
  editarDadosBancarios: vi.fn(),
  ajustarSaldo: vi.fn(),
  marcarInadimplencia: vi.fn(),
  mudarSituacaoDaConta: vi.fn(),
  redefinirSenha: vi.fn(),
  anotarUsuario: vi.fn(),
  executorOuNulo: vi.fn(),
  podeAbrirPainelAdmin: vi.fn(),
}))

vi.mock('@/server/admin/acesso', () => ({
  permissaoParaAcao: m.permissaoParaAcao,
  podeAbrirPainelAdmin: m.podeAbrirPainelAdmin,
  ambienteAtual: () => ({ listaDoAmbiente: undefined, contasDoSeed: {} }),
}))
vi.mock('@/server/admin/atendimento', () => ({ carregarAtendimento: m.carregarAtendimento }))
vi.mock('@/server/admin/cs', () => ({
  responderConversa: m.responderConversa,
  iniciarConversa: m.iniciarConversa,
  anotarConversa: m.anotarConversa,
  mudarStatusConversa: m.mudarStatusConversa,
  atribuirConversa: m.atribuirConversa,
  criarEtiqueta: m.criarEtiqueta,
  etiquetarConversa: m.etiquetarConversa,
  atualizarContato: m.atualizarContato,
}))
vi.mock('@/server/admin/portas', () => ({
  provedorDoAmbiente: m.provedorDoAmbiente,
  portaDeEstadoDoServidor: () => ({}),
  portaDeIdentidadeDoAmbiente: () => ({}),
  executorOuNulo: m.executorOuNulo,
  ehTabelaAusente: (err: unknown) => (err as { code?: string } | null)?.code === '42P01',
  TABELA_AUSENTE: 'Rode npm run db:migrate.',
}))
vi.mock('@/server/admin/usuarios', () => ({
  SEM_BANCO: 'Sem banco.',
  criarUsuario: m.criarUsuario,
  editarCadastro: m.editarCadastro,
  editarDadosBancarios: m.editarDadosBancarios,
  ajustarSaldo: m.ajustarSaldo,
  marcarInadimplencia: m.marcarInadimplencia,
  mudarSituacaoDaConta: m.mudarSituacaoDaConta,
  redefinirSenha: m.redefinirSenha,
  anotarUsuario: m.anotarUsuario,
}))
vi.mock('@/server/auth/origin', () => ({ authCallbackUrl: async () => 'http://localhost:3000/entrar/callback' }))
vi.mock('@/server/auth/provisioning', () => ({ SALDO_MOCK_INICIAL: 500_000, MOEDAS_MOCK_INICIAIS: 6 }))
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
import {
  anotarConversaNoPainel,
  atribuirConversaNoPainel,
  atualizarAtendimentoNoPainel,
  atualizarContatoNoPainel,
  conferirCanalNoPainel,
  criarEtiquetaNoPainel,
  enviarMidiaNoPainel,
  etiquetarConversaNoPainel,
  iniciarConversaNoPainel,
  mudarSituacaoDaConversaNoPainel,
  responderNoPainel,
} from './cs'
import { adicionarMembroNoPainel, alterarMembroNoPainel, alterarPapelNoPainel, criarPapelNoPainel, excluirPapelNoPainel } from './equipe'
import {
  ajustarSaldoNoPainel,
  anotarUsuarioNoPainel,
  criarUsuarioNoPainel,
  editarCadastroNoPainel,
  editarDadosBancariosNoPainel,
  marcarInadimplenciaNoPainel,
  mudarSituacaoDaContaNoPainel,
  redefinirSenhaNoPainel,
} from './usuarios'

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
  // C2 — atendimento
  ['atualizar a caixa', 'cs.ver', () => atualizarAtendimentoNoPainel({}, 1, true), m.carregarAtendimento],
  ['responder', 'cs.responder', () => responderNoPainel(1, 'Olá'), m.responderConversa],
  ['enviar arquivo', 'cs.responder', () => enviarMidiaNoPainel(1, 'https://x.com/a.pdf', 'document', ''), m.responderConversa],
  ['iniciar conversa', 'cs.responder', () => iniciarConversaNoPainel('11999998888', 'Ana', 'Oi'), m.iniciarConversa],
  ['anotar conversa', 'cs.responder', () => anotarConversaNoPainel(1, 'nota'), m.anotarConversa],
  ['situação da conversa', 'cs.responder', () => mudarSituacaoDaConversaNoPainel(1, 'resolvida'), m.mudarStatusConversa],
  ['atribuir conversa', 'cs.responder', () => atribuirConversaNoPainel(1, 'ana@aurea.com.br'), m.atribuirConversa],
  ['criar etiqueta', 'cs.responder', () => criarEtiquetaNoPainel('Cobrança', 'ouro'), m.criarEtiqueta],
  ['etiquetar', 'cs.responder', () => etiquetarConversaNoPainel(1, 'cobranca', true), m.etiquetarConversa],
  ['vincular contato', 'cs.responder', () => atualizarContatoNoPainel(1, { userEmail: 'x@exemplo.com.br' }), m.atualizarContato],
  ['conferir o canal', 'cs.canais', () => conferirCanalNoPainel(), m.provedorDoAmbiente],
  // C2 — usuários
  ['criar conta', 'usuarios.criar', () => criarUsuarioNoPainel({ email: 'x@exemplo.com.br', nome: 'X', senha: '', demonstracao: false }), m.criarUsuario],
  ['editar cadastro', 'usuarios.editar', () => editarCadastroNoPainel('x@exemplo.com.br', { nome: 'X', cpf: '', nomeCompleto: '', dataNascimento: '', telefone: '', endereco: {} }), m.editarCadastro],
  ['ajustar saldo', 'usuarios.editar', () => ajustarSaldoNoPainel('x@exemplo.com.br', 100, 'credito', 'motivo'), m.ajustarSaldo],
  ['inadimplência', 'usuarios.editar', () => marcarInadimplenciaNoPainel('x@exemplo.com.br', true, ''), m.marcarInadimplencia],
  ['desativar conta', 'usuarios.editar', () => mudarSituacaoDaContaNoPainel('x@exemplo.com.br', false, ''), m.mudarSituacaoDaConta],
  ['redefinir senha', 'usuarios.editar', () => redefinirSenhaNoPainel('x@exemplo.com.br', 'link', ''), m.redefinirSenha],
  ['anotar usuário', 'usuarios.editar', () => anotarUsuarioNoPainel('x@exemplo.com.br', 'nota'), m.anotarUsuario],
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

  it('dados bancários pedem as DUAS permissões: com só `usuarios.editar`, recusa sem chamar o serviço', async () => {
    m.permissaoParaAcao.mockImplementation(async (chave: string) => (chave === 'usuarios.editar' ? { ok: true, membro: MEMBRO } : RECUSA))
    const r = await editarDadosBancariosNoPainel('x@exemplo.com.br', { chavePix: 'x@y.com', tipoChavePix: 'email' })
    expect(r).toEqual({ ok: false, error: RECUSA.erro })
    expect(m.permissaoParaAcao.mock.calls.map((c) => c[0])).toEqual(['usuarios.editar', 'usuarios.dados_bancarios'])
    expect(m.editarDadosBancarios).not.toHaveBeenCalled()
  })

  it('tabela da C2 ainda não migrada vira a instrução do db:migrate, não a falha genérica', async () => {
    m.permissaoParaAcao.mockResolvedValue({ ok: true, membro: MEMBRO })
    m.anotarConversa.mockRejectedValue(Object.assign(new Error('relation "aurea.cs_notas" does not exist'), { code: '42P01' }))
    expect(await anotarConversaNoPainel(1, 'nota')).toEqual({ ok: false, error: 'Rode npm run db:migrate.' })
  })

  it('a ação do CS entrega ao serviço o provedor do ambiente e o e-mail do membro como autor', async () => {
    m.permissaoParaAcao.mockResolvedValue({ ok: true, membro: MEMBRO })
    const provedor = { nome: 'registro-local' }
    m.provedorDoAmbiente.mockReturnValue(provedor)
    m.responderConversa.mockResolvedValue({ ok: true, mensagem: 'Resposta registrada no painel.', dados: { mensagemId: 3, status: 'registrada' } })
    expect(await responderNoPainel(7, 'Olá')).toEqual({ ok: true, message: 'Resposta registrada no painel.', data: undefined })
    const [, provedorUsado, ator, conversaId, resposta] = m.responderConversa.mock.calls[0]
    expect([provedorUsado, ator, conversaId, resposta]).toEqual([provedor, MEMBRO.email, 7, { tipo: 'texto', texto: 'Olá' }])
  })

  it('desativar conta pergunta ao servidor se o alvo é da equipe — o cliente não decide isso', async () => {
    m.permissaoParaAcao.mockResolvedValue({ ok: true, membro: MEMBRO })
    m.executorOuNulo.mockReturnValue(vi.fn())
    m.podeAbrirPainelAdmin.mockResolvedValue(true)
    m.mudarSituacaoDaConta.mockResolvedValue({ ok: false, erro: 'Esta conta é da equipe do painel.' })
    await mudarSituacaoDaContaNoPainel(' Rogerio@Aureacustodia.com.br ', false, '')
    expect(m.podeAbrirPainelAdmin).toHaveBeenCalledWith('rogerio@aureacustodia.com.br')
    expect(m.mudarSituacaoDaConta.mock.calls[0][4]).toMatchObject({ email: 'rogerio@aureacustodia.com.br', ativa: false, ehDaEquipe: true })
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
