'use server'

/**
 * Server Actions da administração de usuários — as ações da ficha (plano do Admin, seção 2.6).
 *
 * A REGRA DESTA PASTA: toda ação confere a permissão POR CONTA PRÓPRIA, antes de qualquer
 * outra coisa.
 *  - criar conta: `usuarios.criar`;
 *  - editar cadastro, ajustar saldo, marcar inadimplência, redefinir senha, ativar e
 *    desativar, anotar: `usuarios.editar`;
 *  - dados bancários: `usuarios.dados_bancarios` E `usuarios.editar`.
 *
 * O resto é delegado: a validação mora em src/domain/admin/usuarios.ts, a escrita e a linha
 * `admin.usuarios.<verbo>` em src/server/admin/usuarios.ts — na mesma transação quando há
 * banco. A chave de serviço do Supabase fica em src/server/admin/identidade.ts e nunca chega
 * aqui como valor.
 */

import type { ChavePermissao, MembroAdmin } from '@/domain/admin/permissoes'
import type { EntradaCadastro } from '@/domain/admin/usuarios'
import { ACCOUNTS } from '@/domain/constants'
import type { ActionResult } from '@/domain/types'
import { permissaoParaAcao, podeAbrirPainelAdmin } from '@/server/admin/acesso'
import type { ResultadoAdmin } from '@/server/admin/contabil'
import { TABELA_AUSENTE, ehTabelaAusente, executorOuNulo, portaDeEstadoDoServidor, portaDeIdentidadeDoAmbiente } from '@/server/admin/portas'
import {
  SEM_BANCO,
  ajustarSaldo,
  anotarUsuario,
  criarUsuario,
  editarCadastro,
  editarDadosBancarios,
  marcarInadimplencia,
  mudarSituacaoDaConta,
  redefinirSenha,
} from '@/server/admin/usuarios'
import { authCallbackUrl } from '@/server/auth/origin'
import { MOEDAS_MOCK_INICIAIS, SALDO_MOCK_INICIAL } from '@/server/auth/provisioning'

const FALHA_GRAVACAO = 'Falha ao salvar dados. Tente novamente.'

function paraAction<T>(r: ResultadoAdmin<T>): ActionResult<T> {
  return r.ok ? { ok: true, message: r.mensagem, data: r.dados } : { ok: false, error: r.erro }
}

/** Todas as permissões pedidas, uma a uma e antes de tudo; depois a ação. */
async function comPermissoes<T>(chaves: readonly ChavePermissao[], acao: (membro: MembroAdmin) => Promise<ResultadoAdmin<T>>): Promise<ActionResult<T>> {
  let membro: MembroAdmin | null = null
  for (const chave of chaves) {
    const acesso = await permissaoParaAcao(chave)
    if (!acesso.ok) return { ok: false, error: acesso.erro }
    membro = acesso.membro
  }
  if (!membro) return { ok: false, error: FALHA_GRAVACAO }
  try {
    return paraAction(await acao(membro))
  } catch (err) {
    if (ehTabelaAusente(err)) return { ok: false, error: TABELA_AUSENTE }
    console.error(`[admin] falha na ação de usuários que pede ${chaves.join(' + ')}:`, err)
    return { ok: false, error: FALHA_GRAVACAO }
  }
}

function conta(email: unknown): string {
  return typeof email === 'string' ? email.trim().toLowerCase() : ''
}

export async function criarUsuarioNoPainel(entrada: { email: string; nome: string; senha: string; demonstracao: boolean }): Promise<ActionResult<{ email: string }>> {
  const e = entrada ?? { email: '', nome: '', senha: '', demonstracao: false }
  return comPermissoes(['usuarios.criar'], (membro) =>
    criarUsuario(
      portaDeEstadoDoServidor(membro.email),
      portaDeIdentidadeDoAmbiente(),
      membro.email,
      { email: e.email, nome: e.nome, senha: e.senha, demonstracao: e.demonstracao },
      { saldo: SALDO_MOCK_INICIAL, moedas: MOEDAS_MOCK_INICIAIS },
    ),
  )
}

export async function editarCadastroNoPainel(email: string, entrada: EntradaCadastro): Promise<ActionResult> {
  const e = entrada ?? { nome: '', cpf: '', nomeCompleto: '', dataNascimento: '', telefone: '', endereco: {} }
  return comPermissoes(['usuarios.editar'], (membro) => editarCadastro(portaDeEstadoDoServidor(membro.email), membro.email, conta(email), e))
}

export async function editarDadosBancariosNoPainel(email: string, entrada: Record<string, unknown>): Promise<ActionResult> {
  return comPermissoes(['usuarios.editar', 'usuarios.dados_bancarios'], (membro) =>
    editarDadosBancarios(portaDeEstadoDoServidor(membro.email), membro.email, conta(email), entrada),
  )
}

export async function ajustarSaldoNoPainel(email: string, valorCents: number, sentido: string, motivo: string): Promise<ActionResult> {
  return comPermissoes(['usuarios.editar'], (membro) =>
    ajustarSaldo(portaDeEstadoDoServidor(membro.email), membro.email, conta(email), { valor: valorCents, sentido, motivo }),
  )
}

export async function marcarInadimplenciaNoPainel(email: string, marcar: boolean, motivo: string): Promise<ActionResult> {
  return comPermissoes(['usuarios.editar'], (membro) =>
    marcarInadimplencia(portaDeEstadoDoServidor(membro.email), membro.email, conta(email), marcar === true, motivo),
  )
}

export async function mudarSituacaoDaContaNoPainel(email: string, ativa: boolean, motivo: string): Promise<ActionResult> {
  return comPermissoes(['usuarios.editar'], async (membro) => {
    const executar = executorOuNulo()
    if (!executar) return { ok: false, erro: SEM_BANCO }
    const alvo = conta(email)
    return mudarSituacaoDaConta(executar, portaDeEstadoDoServidor(membro.email), portaDeIdentidadeDoAmbiente(), membro.email, {
      email: alvo,
      ativa: ativa === true,
      motivo,
      ehDaEquipe: await podeAbrirPainelAdmin(alvo),
    })
  })
}

export async function redefinirSenhaNoPainel(email: string, modo: string, senha: string): Promise<ActionResult> {
  return comPermissoes(['usuarios.editar'], async (membro) => {
    const alvo = conta(email)
    return redefinirSenha(executorOuNulo(), portaDeEstadoDoServidor(membro.email), portaDeIdentidadeDoAmbiente(), membro.email, {
      email: alvo,
      modo,
      senha,
      // O link do e-mail volta para o mesmo callback do login, que já aceita todo formato
      // que o Supabase manda (src/app/entrar/callback/route.ts).
      redirecionarPara: modo === 'link' ? await authCallbackUrl() : '',
      ehDoCatalogo: alvo in ACCOUNTS,
    })
  })
}

export async function anotarUsuarioNoPainel(email: string, corpo: string): Promise<ActionResult> {
  return comPermissoes(['usuarios.editar'], async (membro) => {
    const executar = executorOuNulo()
    if (!executar) return { ok: false, erro: SEM_BANCO }
    return anotarUsuario(executar, portaDeEstadoDoServidor(membro.email), membro.email, conta(email), corpo)
  })
}
