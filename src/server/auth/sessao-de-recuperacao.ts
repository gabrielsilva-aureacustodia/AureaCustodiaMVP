/* ============================================================================
 * "ESTA SESSÃO NASCEU DE UM LINK DO E-MAIL, AGORA HÁ POUCO?" — frente A, RA-50, 17/11/2026.
 *
 * A tela "nova senha" (`definirNovaSenha`) troca a senha SEM pedir a atual, porque quem chega
 * pelo link de redefinição a esqueceu. Até aqui a única autorização era "há uma sessão aberta
 * do mesmo e-mail" — e qualquer sessão comum, inclusive uma roubada, passa nisso: bastava
 * chamar a ação direto para trocar a senha sem saber a atual, driblando a confirmação do
 * `changePassword`. Este módulo separa as duas sessões.
 *
 * O QUE DISTINGUE. O token de acesso do Supabase traz a claim `amr` (métodos de autenticação
 * usados): uma lista de `{ method, timestamp }`, com `timestamp` em segundos. Entrar com senha
 * grava `password`; com Google, `oauth`. Abrir o link do e-mail grava um método de link de
 * e-mail — `recovery`, e por garantia `otp` e `magiclink`, que são os outros nomes que o
 * Supabase dá a "provei que controlo esta caixa de entrada" (lista de valores em
 * https://supabase.com/docs/guides/auth/jwt-fields, consultada em 17/11/2026; a página não
 * diz qual deles o link de recuperação grava, por isso os três). O site não usa login por link,
 * então uma sessão comum nunca carrega nenhum deles.
 *
 * DUAS SALVAGUARDAS:
 *  - o método tem de ser RECENTE (`JANELA_DO_LINK_DE_RECUPERACAO_MS`): link aberto ontem e
 *    sessão ainda viva não serve de licença para trocar a senha hoje;
 *  - na dúvida (token ausente, ilegível, sem `amr`) a resposta é "não veio de link", e quem
 *    chama BLOQUEIA. Errar para o lado do bloqueio custa um link novo ao cliente; errar para o
 *    outro lado custa uma conta.
 *
 * ESTE MÓDULO NÃO VERIFICA ASSINATURA. Ele só lê o token que o chamador já mandou o Supabase
 * validar (`auth.getUser()` logo antes, que consulta o servidor do Supabase): um token forjado
 * não chega aqui. Sem `server-only` de propósito — puro, e o teste o importa direto.
 * ==========================================================================*/

import { JANELA_DO_LINK_DE_RECUPERACAO_MS } from './reautenticacao-config'

export interface MetodoDeAcesso {
  /** Nome que o Supabase deu ao método: 'password', 'oauth', 'recovery', 'otp'… */
  metodo: string
  /** Quando o método foi usado, em milissegundos (a claim vem em segundos). */
  usadoEm: number
}

/** Os métodos que significam "abriu um link, ou digitou um código, que chegou ao e-mail dela". */
const METODOS_DE_LINK_DE_EMAIL: ReadonlySet<string> = new Set(['recovery', 'otp', 'magiclink'])

/** Folga para o relógio do Supabase estar um pouco à frente do nosso. */
const TOLERANCIA_DE_RELOGIO_MS = 60 * 1000

/** A lista `amr` do token de acesso. Lista vazia quando o token é ausente, ilegível ou não a tem. */
export function metodosDeAcessoDoToken(tokenDeAcesso: string | null | undefined): MetodoDeAcesso[] {
  if (!tokenDeAcesso) return []
  const partes = tokenDeAcesso.split('.')
  if (partes.length !== 3 || !partes[1]) return []
  try {
    const carga: unknown = JSON.parse(Buffer.from(partes[1], 'base64url').toString('utf8'))
    if (typeof carga !== 'object' || carga === null) return []
    const amr = (carga as Record<string, unknown>).amr
    if (!Array.isArray(amr)) return []
    const metodos: MetodoDeAcesso[] = []
    for (const item of amr) {
      if (typeof item !== 'object' || item === null) continue
      const { method, timestamp } = item as Record<string, unknown>
      if (typeof method === 'string' && typeof timestamp === 'number' && Number.isFinite(timestamp)) {
        metodos.push({ metodo: method, usadoEm: timestamp * 1000 })
      }
    }
    return metodos
  } catch {
    return []
  }
}

/**
 * `true` só se o token mostra um método de link de e-mail usado há no máximo `janelaMs`.
 * O relógio entra por parâmetro para o teste não depender da hora de hoje.
 */
export function sessaoVeioDeLinkDeEmailRecente(
  tokenDeAcesso: string | null | undefined,
  agora: number = Date.now(),
  janelaMs: number = JANELA_DO_LINK_DE_RECUPERACAO_MS,
): boolean {
  return metodosDeAcessoDoToken(tokenDeAcesso).some(
    (m) =>
      METODOS_DE_LINK_DE_EMAIL.has(m.metodo) && m.usadoEm <= agora + TOLERANCIA_DE_RELOGIO_MS && agora - m.usadoEm <= janelaMs,
  )
}
