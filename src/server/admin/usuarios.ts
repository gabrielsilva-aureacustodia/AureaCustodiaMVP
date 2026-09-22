/**
 * O serviço da administração de usuários — as seis ações da ficha (plano do Admin, seção
 * 2.6): criar, editar cadastro, ajustar saldo, marcar inadimplência, redefinir senha,
 * ativar e desativar. Mais as notas internas.
 *
 * TRÊS PORTAS, PARA A SUÍTE RODAR ESTE CÓDIGO DE VERDADE:
 *  - `PortaDeEstado`: o AppState. Com banco, `portaDeEstadoNoBanco` roda `mutarEstado` DENTRO
 *    de uma transação aberta aqui e grava a linha `admin.usuarios.<verbo>` na mesma — ou as
 *    duas commitam, ou nenhuma. Sem banco, a porta é o `mutateState` da memória, e não há
 *    trilha (não há `audit_log` sem banco).
 *  - `PortaDeIdentidade`: o Supabase Auth pela chave de serviço (identidade.ts). Branch 2 é a
 *    única que fala com a Admin API do Supabase, e só por esta porta.
 *  - `Executor`: as tabelas próprias (notas, situação da conta).
 *
 * O PAINEL NÃO REIMPLEMENTA REGRA DE OUTRA FRENTE:
 *  - ajuste de saldo MUDA O SALDO e deixa src/server/db/derivar.ts fazer o que ele já faz com
 *    toda variação sem negociação, depósito ou abertura: gravar o lançamento `ajuste` no
 *    ledger, com hash. O motivo vai na linha da trilha, na mesma transação;
 *  - "está inadimplente?" é `isInadimplente` da frente B; o painel só liga e desliga a marca
 *    manual (`user.inadimplente`), que a própria função da B respeita;
 *  - o saldo e as moedas de demonstração de uma conta criada pelo painel são os mesmos do
 *    provisionamento do login (src/server/auth/provisioning.ts), passados por parâmetro.
 */

import { brl } from '@/domain/money'
import { validarTexto } from '@/domain/admin/cs'
import {
  montarCadastroDoPainel,
  montarDadosBancarios,
  motivoOpcional,
  validarAjusteDeSaldo,
  validarNovoUsuario,
  type EntradaCadastro,
} from '@/domain/admin/usuarios'
import { normalizarEmail } from '@/domain/admin/permissoes'
import type { AppState, Cadastro, Cents, UserEmail } from '@/domain/types'
import { inserirNotaDoUsuario, inserirSituacao, situacaoDaConta } from '@/server/db/repositories/admin-usuarios'
import { lerEstado, mutarEstado } from '@/server/db/estado'
import type { Executor } from '@/server/db/sql'

import { registrarAcaoAdmin, type AcaoAdmin } from './auditar'
import type { ResultadoAdmin } from './contabil'

/* ---------- as portas ---------- */

export interface PortaDeEstado {
  ler(): Promise<AppState>
  /**
   * Muta o estado e, quando há banco, grava a linha que `trilha` devolver NA MESMA
   * transação. `trilha` recebe o resultado da mutação: recusa devolve `null` e não grava.
   */
  mutarComTrilha<T>(fn: (s: AppState) => T, trilha: (resultado: T) => AcaoAdmin | null): Promise<T>
}

/**
 * A porta com banco. O truque que dá a atomicidade: `mutarEstado` recebe um `Executor` que
 * REUSA a transação já aberta, em vez de abrir outra. A trava de `seq`, o diff, o ledger e
 * a auditoria derivada acontecem como sempre — e a linha do painel entra antes do commit.
 */
export function portaDeEstadoNoBanco(executar: Executor, ator: string): PortaDeEstado {
  return {
    ler: () => lerEstado(executar),
    mutarComTrilha: (fn, trilha) =>
      executar(async (tx) => {
        const mesmaTransacao: Executor = (f) => f(tx)
        const { result } = await mutarEstado(mesmaTransacao, fn, { ator })
        const linha = trilha(result)
        if (linha) await registrarAcaoAdmin(tx, linha)
        return result
      }),
  }
}

export interface IdentidadeResumo {
  id: string
  email: string
  criadaEm: string | null
  confirmadaEm: string | null
  ultimoLogin: string | null
  /** ISO do fim do bloqueio; `null` = não bloqueada. */
  bloqueadaAte: string | null
  provedores: string[]
}

export type RespostaIdentidade<T = undefined> = { ok: true; dados: T } | { ok: false; erro: string }

export interface PortaDeIdentidade {
  configurada: boolean
  /** Nomes das variáveis que faltam quando `configurada` é falso. */
  faltando: readonly string[]
  buscar(email: string): Promise<IdentidadeResumo | null>
  criar(e: { email: string; senha: string | null; nome: string }): Promise<RespostaIdentidade<{ id: string }>>
  definirSenha(id: string, senha: string): Promise<RespostaIdentidade>
  bloquear(id: string, bloquear: boolean): Promise<RespostaIdentidade>
  enviarLinkDeSenha(email: string, redirecionarPara: string): Promise<RespostaIdentidade>
  atualizarLogin(
    id: string,
    dados: { email?: string; senha?: string; removerVinculoGoogle?: boolean },
  ): Promise<RespostaIdentidade>
}

type Recusa = { ok: false; erro: string }

const CONTA_NAO_ENCONTRADA: Recusa = { ok: false, erro: 'Conta não encontrada.' }
const SEM_BANCO = 'Sem banco configurado (POSTGRES_URL): esta ação grava em tabela própria do painel.'

function semChave(identidade: PortaDeIdentidade): string {
  return `Falta ${identidade.faltando.join(' e ')} no ambiente: sem a chave de serviço, o painel não fala com o Supabase Auth.`
}

/* ---------- criar ---------- */

/**
 * Cria a conta: a identidade no Supabase Auth (quando há chave de serviço) e o registro em
 * `aurea.users`, com saldo e moedas de demonstração se pedido.
 *
 * SEM CHAVE DE SERVIÇO A CONTA É CRIADA ASSIM MESMO, só na plataforma: a pessoa define a
 * senha criando conta em /cadastrar com o mesmo e-mail, e o login encontra a conta pronta
 * (`authorizeProvisionedUser`). A tela diz isso — nenhuma ação quebra por falta de credencial.
 *
 * Se o Supabase RECUSAR (senha fraca, e-mail inválido para ele), nada é criado: o atendente
 * corrige e tenta de novo, sem conta pela metade.
 */
export async function criarUsuario(
  estado: PortaDeEstado,
  identidade: PortaDeIdentidade,
  ator: string,
  entrada: { email: unknown; nome: unknown; senha: unknown; demonstracao: unknown },
  agora: number = Date.now(),
): Promise<ResultadoAdmin<{ email: string }>> {
  const v = validarNovoUsuario(entrada, (await estado.ler()).users)
  if (!v.ok) return v
  const novo = v.valor

  let situacaoDaIdentidade: 'criada' | 'ja_existia' | 'sem_chave' = 'sem_chave'
  if (identidade.configurada) {
    const existente = await identidade.buscar(novo.email)
    if (existente) {
      situacaoDaIdentidade = 'ja_existia'
    } else {
      const criada = await identidade.criar({ email: novo.email, senha: novo.senha, nome: novo.nome })
      if (!criada.ok) return { ok: false, erro: `O Supabase Auth recusou a criação: ${criada.erro}` }
      situacaoDaIdentidade = 'criada'
    }
  }

  const r = await estado.mutarComTrilha(
    (s): ResultadoAdmin => {
      if (s.users[novo.email]) return { ok: false, erro: 'Já existe uma conta com este e-mail.' }
      s.users[novo.email] = {
        name: novo.nome,
        // Conta criada pelo painel nasce zerada, igual à criada pelo site. Até
        // 20/09/2026 havia uma caixa "carregar saldo e moedas de demonstração",
        // marcada por padrão, que dava R$ 5.000 e 6 moedas. Valor entra por
        // depósito confirmado; moeda entra por envio analisado na bancada.
        balance: 0,
        coins: [],
      }
      return { ok: true, mensagem: '' }
    },
    (res) =>
      res.ok
        ? {
            ator,
            area: 'usuarios',
            verbo: 'criar',
            entidade: 'usuario',
            entidadeId: novo.email,
            usuariosAfetados: [novo.email],
            detalhes: { identidade: situacaoDaIdentidade, senhaProvisoria: novo.senha !== null },
            agora,
          }
        : null,
  )
  if (!r.ok) return r

  const complemento = {
    criada: novo.senha
      ? 'Login criado no Supabase com a senha provisória.'
      : 'Login criado no Supabase sem senha: envie o link de redefinição pela ficha.',
    ja_existia: 'A identidade de login já existia no Supabase e foi mantida.',
    sem_chave: 'Sem chave de serviço do Supabase: a pessoa cria a senha em /cadastrar com este e-mail.',
  }[situacaoDaIdentidade]
  return { ok: true, mensagem: `Conta criada. ${complemento}`, dados: { email: novo.email } }
}

/* ---------- editar ---------- */

/**
 * Vazio, nulo e ausente contam como o mesmo valor: a gravação no banco transforma o campo
 * bancário ausente em '' (src/server/db/diff.ts), e sem isso todo salvamento acusaria como
 * "alterado" um campo que ninguém tocou.
 */
function camposAlterados(antes: Record<string, unknown>, depois: Record<string, unknown>): string[] {
  const normal = (v: unknown): string => (v === undefined || v === null || v === '' ? '' : JSON.stringify(v))
  return Object.keys({ ...antes, ...depois }).filter((k) => normal(antes[k]) !== normal(depois[k]))
}

function planoDoCadastro(c: Cadastro | undefined): Record<string, unknown> {
  if (!c) return {}
  return { cpf: c.cpf, nomeCompleto: c.nomeCompleto, dataNascimento: c.dataNascimento, telefone: c.telefone, endereco: c.endereco }
}

/**
 * A trilha guarda QUAIS campos mudaram, não os valores: CPF e endereço já estão no
 * cadastro, e copiá-los para a trilha espalharia dado pessoal por mais uma tabela.
 */
export async function editarCadastro(
  estado: PortaDeEstado,
  ator: string,
  email: UserEmail,
  entrada: EntradaCadastro,
  agora: number = Date.now(),
): Promise<ResultadoAdmin> {
  const conta = normalizarEmail(email)
  const r = await estado.mutarComTrilha(
    (s): ResultadoAdmin<{ campos: string[]; avisos: string[] }> => {
      const u = s.users[conta]
      if (!u) return CONTA_NAO_ENCONTRADA
      const v = montarCadastroDoPainel(entrada, u.cadastro, agora)
      if (!v.ok) return v
      const campos = camposAlterados({ nome: u.name, ...planoDoCadastro(u.cadastro) }, { nome: v.valor.nome, ...planoDoCadastro(v.valor.cadastro) })
      if (!campos.length) return { ok: true, mensagem: 'Nada mudou no cadastro.', dados: { campos, avisos: v.valor.avisos } }
      u.name = v.valor.nome
      u.cadastro = v.valor.cadastro
      return { ok: true, mensagem: 'Cadastro salvo.', dados: { campos, avisos: v.valor.avisos } }
    },
    (res) =>
      res.ok && res.dados?.campos.length
        ? { ator, area: 'usuarios', verbo: 'editar_cadastro', entidade: 'usuario', entidadeId: conta, usuariosAfetados: [conta], detalhes: { campos: res.dados.campos }, agora }
        : null,
  )
  if (!r.ok) return r
  const avisos = r.dados?.avisos ?? []
  return { ok: true, mensagem: avisos.length ? `${r.mensagem} Atenção: ${avisos.join('; ')}.` : r.mensagem }
}

export async function editarDadosBancarios(
  estado: PortaDeEstado,
  ator: string,
  email: UserEmail,
  entrada: unknown,
  agora: number = Date.now(),
): Promise<ResultadoAdmin> {
  const v = montarDadosBancarios(entrada)
  if (!v.ok) return v
  const conta = normalizarEmail(email)
  const r = await estado.mutarComTrilha(
    (s): ResultadoAdmin<{ campos: string[] }> => {
      const u = s.users[conta]
      if (!u) return CONTA_NAO_ENCONTRADA
      // Os dados bancários moram DENTRO do cadastro, e o cadastro só é gravado inteiro.
      if (!u.cadastro) return { ok: false, erro: 'Preencha o cadastro antes dos dados bancários: eles são gravados junto com ele.' }
      const campos = camposAlterados({ ...u.cadastro.dadosBancarios }, { ...v.valor })
      if (!campos.length) return { ok: true, mensagem: 'Nada mudou nos dados bancários.', dados: { campos } }
      u.cadastro = { ...u.cadastro, dadosBancarios: v.valor }
      return { ok: true, mensagem: 'Dados bancários salvos.', dados: { campos } }
    },
    (res) =>
      res.ok && res.dados?.campos.length
        ? { ator, area: 'usuarios', verbo: 'editar_dados_bancarios', entidade: 'usuario', entidadeId: conta, usuariosAfetados: [conta], detalhes: { campos: res.dados.campos }, agora }
        : null,
  )
  return r.ok ? { ok: true, mensagem: r.mensagem } : r
}

/* ---------- saldo e inadimplência ---------- */

export async function ajustarSaldo(
  estado: PortaDeEstado,
  ator: string,
  email: UserEmail,
  entrada: { valor: unknown; sentido: unknown; motivo: unknown },
  agora: number = Date.now(),
): Promise<ResultadoAdmin> {
  const conta = normalizarEmail(email)
  const r = await estado.mutarComTrilha(
    (s): ResultadoAdmin<{ antes: Cents; depois: Cents; delta: Cents; motivo: string }> => {
      const u = s.users[conta]
      if (!u) return CONTA_NAO_ENCONTRADA
      const v = validarAjusteDeSaldo(u.balance, entrada.valor, entrada.sentido, entrada.motivo)
      if (!v.ok) return v
      const antes = u.balance
      u.balance = v.valor.saldoDepois
      return {
        ok: true,
        mensagem: `Saldo ajustado de ${brl(antes)} para ${brl(v.valor.saldoDepois)}.`,
        dados: { antes, depois: v.valor.saldoDepois, delta: v.valor.delta, motivo: v.valor.motivo },
      }
    },
    (res) =>
      res.ok && res.dados
        ? {
            ator,
            area: 'usuarios',
            verbo: 'ajustar_saldo',
            entidade: 'usuario',
            entidadeId: conta,
            usuariosAfetados: [conta],
            detalhes: { saldoAntes: res.dados.antes, saldoDepois: res.dados.depois, delta: res.dados.delta, motivo: res.dados.motivo },
            agora,
          }
        : null,
  )
  return r.ok ? { ok: true, mensagem: r.mensagem } : r
}

export async function marcarInadimplencia(
  estado: PortaDeEstado,
  ator: string,
  email: UserEmail,
  marcar: boolean,
  motivo: unknown,
  agora: number = Date.now(),
): Promise<ResultadoAdmin> {
  const conta = normalizarEmail(email)
  const m = motivoOpcional(motivo)
  const r = await estado.mutarComTrilha(
    (s): ResultadoAdmin<{ mudou: boolean }> => {
      const u = s.users[conta]
      if (!u) return CONTA_NAO_ENCONTRADA
      if (Boolean(u.inadimplente) === marcar) return { ok: true, mensagem: marcar ? 'A conta já estava marcada como inadimplente.' : 'A conta não tinha marca manual de inadimplência.', dados: { mudou: false } }
      u.inadimplente = marcar
      return { ok: true, mensagem: marcar ? 'Conta marcada como inadimplente.' : 'Marca manual de inadimplência retirada. Fatura vencida, se houver, continua contando.', dados: { mudou: true } }
    },
    (res) =>
      res.ok && res.dados?.mudou
        ? { ator, area: 'usuarios', verbo: marcar ? 'marcar_inadimplente' : 'desmarcar_inadimplente', entidade: 'usuario', entidadeId: conta, usuariosAfetados: [conta], detalhes: { motivo: m }, agora }
        : null,
  )
  return r.ok ? { ok: true, mensagem: r.mensagem } : r
}

/* ---------- ativar e desativar ---------- */

/**
 * A situação da conta tem duas metades, e as duas são feitas aqui:
 *  1. o Supabase Auth BLOQUEIA o login da identidade (`ban_duration`) — é o que tira de
 *     verdade a porta de entrada por senha e por Google, e é o comportamento padrão da
 *     ferramenta, sem código nosso no caminho do login;
 *  2. `admin_situacao_contas` registra quem, quando e por quê — é o que a ficha mostra e o
 *     que as checagens da frente A consultam (a entrada pelo catálogo de demonstração e a
 *     sessão já aberta não passam pelo Supabase; ver PENDENCIAS_AGENTE_C.md).
 *
 * A única recusa de regra protege o próprio painel: conta da equipe não é desativada por
 * aqui. Tirar alguém da equipe é gesto de Equipe e papéis, que garante que o painel nunca
 * fica sem um dev ativo — desativar a conta de login de um dev por esta tela contornaria
 * essa garantia.
 */
export async function mudarSituacaoDaConta(
  executar: Executor,
  estado: PortaDeEstado,
  identidade: PortaDeIdentidade,
  ator: string,
  entrada: { email: UserEmail; ativa: boolean; motivo: unknown; ehDaEquipe: boolean },
  agora: number = Date.now(),
): Promise<ResultadoAdmin> {
  const conta = normalizarEmail(entrada.email)
  const motivo = motivoOpcional(entrada.motivo)
  if (!(await estado.ler()).users[conta]) return CONTA_NAO_ENCONTRADA
  if (!entrada.ativa && entrada.ehDaEquipe) {
    return { ok: false, erro: 'Esta conta é da equipe do painel. Tire-a da equipe em Equipe e papéis antes de desativá-la.' }
  }

  const atual = await executar((tx) => situacaoDaConta(tx, conta), { somenteLeitura: true })
  const ativaHoje = atual?.ativa ?? true
  if (ativaHoje === entrada.ativa) return { ok: true, mensagem: entrada.ativa ? 'A conta já estava ativa.' : 'A conta já estava desativada.' }

  let supabase: 'bloqueada' | 'desbloqueada' | 'sem_identidade' | 'sem_chave' = 'sem_chave'
  if (identidade.configurada) {
    const id = await identidade.buscar(conta)
    if (id) {
      const r = await identidade.bloquear(id.id, !entrada.ativa)
      if (!r.ok) return { ok: false, erro: `O Supabase Auth recusou: ${r.erro}` }
      supabase = entrada.ativa ? 'desbloqueada' : 'bloqueada'
    } else {
      supabase = 'sem_identidade'
    }
  }

  await executar(async (tx) => {
    await inserirSituacao(tx, { email: conta, ativa: entrada.ativa, motivo, autor: ator, createdAt: agora })
    await registrarAcaoAdmin(tx, {
      ator,
      area: 'usuarios',
      verbo: entrada.ativa ? 'ativar' : 'desativar',
      entidade: 'usuario',
      entidadeId: conta,
      usuariosAfetados: [conta],
      detalhes: { motivo, supabase },
      agora,
    })
  })

  const sobreLogin = {
    bloqueada: 'O login pelo Supabase (senha e Google) está bloqueado.',
    desbloqueada: 'O login pelo Supabase voltou a funcionar.',
    sem_identidade: 'A conta não tem identidade no Supabase Auth (catálogo de demonstração ou criada sem chave de serviço).',
    sem_chave: 'Sem chave de serviço do Supabase, o login não foi bloqueado lá — só a situação foi registrada.',
  }[supabase]
  return { ok: true, mensagem: `${entrada.ativa ? 'Conta reativada.' : 'Conta desativada.'} ${sobreLogin}` }
}

/* ---------- senha ---------- */

/**
 * Dois caminhos, os dois pelo Supabase, sem intermediário:
 *  - 'link': o Supabase manda o e-mail de redefinição, com o modelo padrão dele;
 *  - 'provisoria': o painel define uma senha e o atendente a passa à pessoa. Se a conta
 *    ainda não tinha identidade no Supabase (criada sem chave de serviço), ela é criada com
 *    essa senha — é a forma de dar login a quem foi cadastrado pelo painel. RA-43.
 *
 * Conta do catálogo de demonstração entra sem Supabase (RA-19) e não tem senha para trocar
 * aqui. A senha NUNCA vai para a trilha.
 */
export async function redefinirSenha(
  executar: Executor | null,
  estado: PortaDeEstado,
  identidade: PortaDeIdentidade,
  ator: string,
  entrada: { email: UserEmail; modo: unknown; senha: unknown; redirecionarPara: string; ehDoCatalogo: boolean },
  agora: number = Date.now(),
): Promise<ResultadoAdmin> {
  const conta = normalizarEmail(entrada.email)
  if (entrada.modo !== 'link' && entrada.modo !== 'provisoria') return { ok: false, erro: 'Escolha como redefinir a senha.' }
  const state = await estado.ler()
  const u = state.users[conta]
  if (!u) return CONTA_NAO_ENCONTRADA
  if (entrada.ehDoCatalogo) {
    return { ok: false, erro: 'Conta do catálogo de demonstração: ela entra sem Supabase, com a senha do catálogo (RA-19).' }
  }
  if (!identidade.configurada) return { ok: false, erro: semChave(identidade) }

  const existente = await identidade.buscar(conta)
  let feito: 'link' | 'provisoria' | 'identidade_criada'
  if (entrada.modo === 'link') {
    if (!existente) return { ok: false, erro: 'Esta conta ainda não tem login no Supabase Auth. Defina uma senha provisória para criá-lo.' }
    const r = await identidade.enviarLinkDeSenha(conta, entrada.redirecionarPara)
    if (!r.ok) return { ok: false, erro: `O Supabase Auth recusou: ${r.erro}` }
    feito = 'link'
  } else {
    const senha = typeof entrada.senha === 'string' ? entrada.senha : ''
    if (!senha) return { ok: false, erro: 'Digite a senha provisória.' }
    const r = existente ? await identidade.definirSenha(existente.id, senha) : await identidade.criar({ email: conta, senha, nome: u.name })
    if (!r.ok) return { ok: false, erro: `O Supabase Auth recusou: ${r.erro}` }
    feito = existente ? 'provisoria' : 'identidade_criada'
  }

  if (executar) {
    await executar((tx) =>
      registrarAcaoAdmin(tx, { ator, area: 'usuarios', verbo: 'redefinir_senha', entidade: 'usuario', entidadeId: conta, usuariosAfetados: [conta], detalhes: { modo: feito }, agora }),
    )
  }
  return {
    ok: true,
    mensagem: {
      link: 'O Supabase enviou o e-mail de redefinição de senha.',
      provisoria: 'Senha provisória definida. Passe-a à pessoa por um canal seguro.',
      identidade_criada: 'Login criado no Supabase com a senha provisória. Passe-a à pessoa por um canal seguro.',
    }[feito],
  }
}

/* ---------- notas internas ---------- */

export async function anotarUsuario(executar: Executor, estado: PortaDeEstado, ator: string, email: UserEmail, corpo: unknown, agora: number = Date.now()): Promise<ResultadoAdmin> {
  const v = validarTexto(corpo, 'a nota')
  if (!v.ok) return v
  const conta = normalizarEmail(email)
  if (!(await estado.ler()).users[conta]) return CONTA_NAO_ENCONTRADA
  return executar(async (tx) => {
    const notaId = await inserirNotaDoUsuario(tx, { email: conta, autor: ator, corpo: v.valor, createdAt: agora })
    await registrarAcaoAdmin(tx, { ator, area: 'usuarios', verbo: 'anotar', entidade: 'usuario', entidadeId: conta, usuariosAfetados: [conta], detalhes: { notaId }, agora })
    return { ok: true, mensagem: 'Nota interna registrada.' }
  })
}

export { SEM_BANCO }
