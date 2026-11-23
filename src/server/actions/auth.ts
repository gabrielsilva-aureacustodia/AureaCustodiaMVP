'use server'

/**
 * Autenticação com Supabase Auth.
 *
 * A senha segue direto para o Supabase Auth, que guarda apenas o hash. Não há
 * mais catálogo local de senhas nem provisionamento de saldo e acervo: a conta
 * nasce zerada (ver `@/server/auth/provisioning`), e valor só entra por depósito
 * confirmado ou por moeda que passou pela bancada.
 */

import { headers } from 'next/headers'

import type { ActionResult } from '@/domain/types'
import { authorizeProvisionedUser } from '@/server/auth/authorization'
import { createAuthClient } from '@/server/auth/client'
import {
  AuthConfigurationError,
  getRegistrationStatus,
} from '@/server/auth/config'
import { destinoPermitido, lembrarDestinoDoLogin, type DestinoDoLogin } from '@/server/auth/destino'
import { setPendingLegalAcceptance } from '@/server/auth/legal'
import { authCallbackUrl } from '@/server/auth/origin'
import { provisionAuthenticatedUser } from '@/server/auth/provisioning'
import { EXIGIR_LINK_RECENTE_NA_NOVA_SENHA } from '@/server/auth/reautenticacao-config'
import { registrarEventoDeSeguranca } from '@/server/auth/reautenticacao-eventos'
import { metodosDeAcessoDoToken, sessaoVeioDeLinkDeEmailRecente } from '@/server/auth/sessao-de-recuperacao'
import { registrarAceitesFormais } from '@/server/documentos/aceites'
import { registrarCadastroNaMeta } from '@/server/meta/cadastro'
import { clearSession, getSessionEmail, setSession } from '@/server/session'
import { getState, mutateState } from '@/server/state'
import {
  barrarContaDesativada,
  ehIdentidadeBloqueada,
  MENSAGEM_CONTA_DESATIVADA,
} from '@/server/auth/conta-desativada'
import { normalizarEmail } from '@/domain/email'
import { normalizarNome, validarNomeCompleto } from '@/domain/validacao-cadastro'

const CREDENCIAIS_INVALIDAS = 'E-mail ou senha incorretos. Verifique os dados e tente novamente.'
const FALHA_AUTENTICACAO = 'Não foi possível concluir a autenticação. Tente novamente.'

export interface OAuthStartData {
  redirectTo: string
}

/** O que o formulário de cadastro recebe de volta: o ID do evento da Meta, para o Pixel disparar o par do servidor. */
export interface CadastroData {
  eventoCadastroId?: string
  /** Verdadeiro quando a conta nasceu confirmada e a sessão já foi aberta: a tela segue direto para /inicio. */
  entrou?: boolean
}

function authError<T = unknown>(): ActionResult<T> {
  return { ok: false, error: FALHA_AUTENTICACAO }
}

function nomeDoSupabase(metadata: Record<string, unknown>): string | undefined {
  const name = metadata.full_name ?? metadata.name
  return typeof name === 'string' ? name : undefined
}

export async function login(email: string, senha: string): Promise<ActionResult> {
  const normalized = normalizarEmail(email)
  if (!normalized || !senha) return { ok: false, error: CREDENCIAIS_INVALIDAS }

  // Não existe mais entrada por catálogo local. Até 20/09/2026 as contas de
  // demonstração entravam aqui, antes do Supabase, com senha escrita no código —
  // e ganhavam saldo e moedas de `DEMO_DATA` se ainda não existissem no estado.
  // Publicado o site no domínio oficial, esse atalho virou uma porta de entrada
  // para saldo que ninguém depositou. Toda senha passa pelo Supabase Auth.

  try {
    const client = await createAuthClient()
    const { data, error } = await client.auth.signInWithPassword({
      email: normalized,
      password: senha,
    })

    if (ehIdentidadeBloqueada(error)) {
      return { ok: false, error: MENSAGEM_CONTA_DESATIVADA }
    }

    // Com a confirmação do Supabase ligada, quem não clicou no link recebe este erro: dizer o motivo (e a saída)
    // é melhor que "senha incorreta" — a senha está certa.
    if (error?.code === 'email_not_confirmed') {
      return {
        ok: false,
        error: 'Confirme seu e-mail para entrar: use o link que enviamos ou peça outro em "Receber link de acesso por e-mail".',
      }
    }
    if (error || !data.user?.email) return { ok: false, error: CREDENCIAIS_INVALIDAS }

    if (await barrarContaDesativada(data.user.email)) {
      await client.auth.signOut({ scope: 'local' }).catch(() => undefined)
      return { ok: false, error: MENSAGEM_CONTA_DESATIVADA }
    }

    // Identidade confirmada pelo Supabase basta para provisionar. A exigência
    // de aceite legal no metadata trancava para fora quem tinha confirmado o
    // e-mail mas cujo aceite não sobreviveu ao caminho — ver RA-18.
    const provisioned = await authorizeProvisionedUser(data.user.email)
    if (!provisioned) {
      await provisionAuthenticatedUser(
        data.user.email,
        nomeDoSupabase(data.user.user_metadata),
      )
    }

    await setSession(normalizarEmail(data.user.email))
    return { ok: true }
  } catch (error) {
    if (error instanceof AuthConfigurationError) {
      return { ok: false, error: CREDENCIAIS_INVALIDAS }
    }
    return authError()
  }
}

export async function registerWithEmail(
  name: string,
  email: string,
  senha: string,
  arbitragemAssinada?: boolean,
  nomeAssinaturaArbitragem?: string,
): Promise<ActionResult<CadastroData>> {
  const status = getRegistrationStatus()
  if (!status.enabled) {
    return { ok: false, error: status.reason ?? 'Novos cadastros estão fechados.' }
  }

  // Sem validacao local de nome, e-mail ou tamanho de senha: quem valida e o
  // Supabase, e a mensagem dele e mais precisa do que a nossa. Ver RA-18.
  // A16 (QA Davi 22/11/2026): o nome do cadastro passa pelas regras de nome e sobrenome; e-mail e tamanho de senha
  // continuam com o Supabase.
  const normalizedName = normalizarNome(name)
  const erroDoNome = validarNomeCompleto(normalizedName)
  if (erroDoNome) return { ok: false, error: erroDoNome }
  const normalizedEmail = normalizarEmail(email)

  try {
    const client = await createAuthClient()
    const acceptedAt = new Date().toISOString()
    const { data, error } = await client.auth.signUp({
      email: normalizedEmail,
      password: senha,
      options: {
        emailRedirectTo: await authCallbackUrl(),
        data: {
          full_name: normalizedName,
          legal_terms_version: status.termsVersion,
          privacy_policy_version: status.privacyVersion,
          legal_accepted_at: acceptedAt,
          arbitragem_assinada: arbitragemAssinada ?? false,
          nome_assinatura_arbitragem: nomeAssinaturaArbitragem?.trim() ?? null,
        },
      },
    })

    if (error) return { ok: false, error: error.message || FALHA_AUTENTICACAO }

    // Registra o aceite formal nos termos e documentos legais
    try {
      const h = await headers()
      const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || null
      const userAgent = h.get('user-agent') || null

      await registrarAceitesFormais(normalizedEmail, 'cadastro_email', {
        ip,
        userAgent,
        arbitragem:
          arbitragemAssinada && nomeAssinaturaArbitragem?.trim()
            ? {
                assinada: true,
                nomeDigitado: nomeAssinaturaArbitragem.trim(),
              }
            : undefined,
      })
    } catch {
      // O registro formal de prova nunca trava a criação de conta nem o fluxo
    }

    // Meta: um CompleteRegistration por conta NOVA. Com e-mail já cadastrado o Supabase não devolve erro (para não revelar
    // quem tem conta) e responde com `identities` vazio — contar isso inflaria os cadastros da campanha.
    const contaNova = !data.user || (data.user.identities?.length ?? 1) > 0
    const eventoCadastroId = contaNova
      ? registrarCadastroNaMeta({
          metodo: 'cadastro_email',
          email: normalizedEmail,
          nomeCompleto: normalizedName,
          cabecalhos: await headers(),
          paginaPadrao: '/cadastrar',
        })
      : undefined

    // B02 (decisão do Gabriel, 22/11/2026): a conta pelo e-mail NASCE confirmada, sem e-mail e sem clique — "as pessoas
    // não conseguem usar a confirmação de e-mail". E-mail fica para trocar senha e demais trâmites (a configurar depois).
    // Por isso não há marca de "e-mail pendente": o Supabase de produção segue com `mailer_autoconfirm`, e é isso que
    // se quer. Se algum dia o Supabase devolver a conta sem confirmação, vale a mensagem do segundo ramo.
    if (data.user?.email && data.user.email_confirmed_at) {
      await provisionAuthenticatedUser(data.user.email, normalizedName)
      // Pedido do Gabriel (22/11/2026): terminado o cadastro a pessoa já está dentro, sem voltar à tela de login. A sessão
      // do Supabase nasce do próprio signUp; entrar com a senha garante os cookies mesmo que o signUp não os tenha deixado.
      const { data: entrada, error: erroEntrada } = await client.auth.signInWithPassword({
        email: normalizedEmail,
        password: senha,
      })
      if (!erroEntrada && entrada.user?.email) {
        await setSession(normalizarEmail(entrada.user.email))
        return {
          ok: true,
          message: 'Conta criada.',
          data: { eventoCadastroId, entrou: true },
        }
      }
      return {
        ok: true,
        message: 'Conta criada. Você já pode entrar.',
        data: { eventoCadastroId },
      }
    }
    await client.auth.signOut({ scope: 'local' })
    return {
      ok: true,
      message: 'Conta criada. Abra o e-mail de confirmação para validar seu acesso.',
      data: { eventoCadastroId },
    }
  } catch {
    return authError()
  }
}

/**
 * Inicia Google OAuth para uma conta que já aceitou os termos anteriormente.
 *
 * `destino` é `/admin` quando o login começa na entrada do painel (`/painel`): o callback lê
 * o cookie e volta para o painel em vez do site do cliente (src/server/auth/destino.ts).
 */
export async function loginWithGoogle(destino: DestinoDoLogin = '/inicio'): Promise<ActionResult<OAuthStartData>> {
  try {
    await lembrarDestinoDoLogin(destinoPermitido(destino))
    const client = await createAuthClient()
    const { data, error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: await authCallbackUrl(),
        skipBrowserRedirect: true,
      },
    })

    if (error || !data.url) return { ok: false, error: FALHA_AUTENTICACAO }
    return { ok: true, data: { redirectTo: data.url } }
  } catch {
    return authError<OAuthStartData>()
  }
}

export async function registerWithGoogle(): Promise<ActionResult<OAuthStartData>> {
  const status = getRegistrationStatus()
  if (!status.enabled) {
    return { ok: false, error: status.reason ?? 'Novos cadastros estão fechados.' }
  }

  try {
    await setPendingLegalAcceptance(status)
    const client = await createAuthClient()
    const { data, error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: await authCallbackUrl(),
        skipBrowserRedirect: true,
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    })

    if (error || !data.url) return { ok: false, error: FALHA_AUTENTICACAO }
    return { ok: true, data: { redirectTo: data.url } }
  } catch {
    return authError<OAuthStartData>()
  }
}

export async function logout(): Promise<ActionResult> {
  await clearSession()
  try {
    const client = await createAuthClient()
    await client.auth.signOut({ scope: 'local' })
  } catch (error) {
    // A sessão interna já foi encerrada. Ausência de configuração do Supabase
    // não pode prender a pessoa dentro da aplicação.
    if (!(error instanceof AuthConfigurationError)) return { ok: false, error: FALHA_AUTENTICACAO }
  }
  return { ok: true }
}

/**
 * Tela de nova senha do link de redefinição (P-C2-05, RA-50). Não pede a senha atual porque quem
 * chega pelo link a esqueceu; a autorização é a sessão de recuperação que o callback deixou nos
 * cookies do Supabase — e, desde 17/11/2026, só vale se o token dessa sessão mostra um método de
 * link de e-mail usado há pouco (`sessaoVeioDeLinkDeEmailRecente`): sessão comum não troca a senha
 * por aqui. A conferência de e-mail impede trocar a senha de outra identidade. Tamanho da senha
 * fica com o Supabase, como no cadastro (RA-18).
 */
export async function definirNovaSenha(
  nova: string,
  confirmacao: string,
): Promise<ActionResult> {
  const email = await getSessionEmail()
  if (!email) {
    return {
      ok: false,
      error: 'O link de redefinição expirou ou já foi usado. Peça um novo ao atendimento.',
    }
  }

  if (nova !== confirmacao) {
    return { ok: false, error: 'A confirmação da nova senha não confere.' }
  }

  if (await barrarContaDesativada(email)) {
    return { ok: false, error: MENSAGEM_CONTA_DESATIVADA }
  }

  try {
    const client = await createAuthClient()
    const { data, error: userError } = await client.auth.getUser()

    const emailSupabase = data?.user?.email ? normalizarEmail(data.user.email) : undefined
    if (userError || !emailSupabase || emailSupabase !== normalizarEmail(email)) {
      return {
        ok: false,
        error: 'O link de redefinição expirou ou já foi usado. Peça um novo ao atendimento.',
      }
    }

    // RA-50 (frente A, 17/11/2026): trocar a senha SEM a atual só vale para a sessão que um link do e-mail acabou de
    // abrir. Uma sessão comum — inclusive roubada — não passa daqui; para ela a troca é a de "Alterar senha", que
    // pede a senha atual. Na dúvida (token sem `amr`, ilegível), bloqueia: ver sessao-de-recuperacao.ts. A resposta
    // é o mesmo texto do link vencido porque, para quem usa esta tela, é a mesma situação: pedir um link novo.
    // `EXIGIR_LINK_RECENTE_NA_NOVA_SENHA` (reautenticacao-config.ts) desliga esta guarda numa linha, se o nome do
    // método que o link de recuperação grava no `amr` não for um dos três que a lista conhece.
    if (EXIGIR_LINK_RECENTE_NA_NOVA_SENHA) {
      const { data: dadosDaSessao } = await client.auth.getSession()
      const tokenDeAcesso = dadosDaSessao?.session?.access_token
      if (!sessaoVeioDeLinkDeEmailRecente(tokenDeAcesso)) {
        console.warn(
          '[auth] definirNovaSenha recusada: a sessão não veio de um link de e-mail recente. Métodos no token:',
          metodosDeAcessoDoToken(tokenDeAcesso).map((m) => m.metodo),
        )
        return {
          ok: false,
          error: 'O link de redefinição expirou ou já foi usado. Peça um novo ao atendimento.',
        }
      }
    }

    const { error: updateError } = await client.auth.updateUser({ password: nova })
    if (updateError) {
      if (updateError.code === 'same_password') {
        return { ok: false, error: 'A senha nova precisa ser diferente da anterior.' }
      }
      if (updateError.code === 'weak_password') {
        return { ok: false, error: `Senha fraca: ${updateError.message}` }
      }
      return { ok: false, error: updateError.message || FALHA_AUTENTICACAO }
    }

    // Evento de segurança (A → C): a senha mudou pelo link de redefinição. Nunca derruba a troca.
    await registrarEventoDeSeguranca({
      tipo: 'senha_alterada',
      conta: email,
      detalhes: { via: 'link_de_redefinicao' },
    })

    return { ok: true, message: 'Senha nova salva. Use-a no próximo login.' }
  } catch (error) {
    if (error instanceof AuthConfigurationError) {
      return { ok: false, error: 'O login pelo Supabase não está configurado neste ambiente.' }
    }
    return authError()
  }
}

