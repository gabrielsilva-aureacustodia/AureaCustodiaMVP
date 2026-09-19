/* ============================================================================
 * ATENÇÃO — MÓDULO EXCLUSIVO DE SERVIDOR.
 *
 * Lê SESSION_SECRET e assina a sessão interna depois que o Supabase Auth já
 * confirmou a identidade. Nunca importe de um Client Component:
 * o segredo iria junto para o bundle do navegador e a assinatura viraria
 * enfeite. O `import 'server-only'` abaixo faz o build quebrar ao primeiro
 * import indevido — a barreira é o compilador, não este comentário.
 * ==========================================================================*/

import 'server-only'

import { cookies } from 'next/headers'

import {
  COOKIE_NAME,
  MAX_AGE_S,
  emailDoCookie,
  valorDoCookie,
} from '@/server/session-core'

/**
 * Sessão do usuário.
 *
 * O Supabase Auth guarda e valida a senha; este cookie só transporta o e-mail
 * já autenticado entre as rotas internas. No MVP a sessão era a variável
 * global `session` com o e-mail logado —
 * suficiente num arquivo que rodava inteiro no navegador de uma pessoa só.
 * No servidor isso não existe: cada requisição chega sozinha e precisa provar
 * quem é. O cookie carrega o e-mail acompanhado de um HMAC-SHA256; sem a
 * assinatura, qualquer visitante trocaria o valor por outro e-mail e entraria
 * na conta alheia.
 *
 * Não há senha, token do provedor nem dado de perfil no payload. A validade é
 * a do próprio cookie (maxAge de 7 dias), e logout encerra também a sessão
 * transitória mantida pelo cliente SSR do Supabase.
 *
 * A CRIPTOGRAFIA NÃO MORA MAIS AQUI (19/09/2026). Assinatura, verificação e
 * codificação do payload foram para `session-core.ts`, que roda tanto no Node
 * quanto no Edge — o `middleware.ts` precisa conferir a mesma assinatura antes
 * da requisição chegar na rota, e não teria como importar um módulo preso ao
 * `node:crypto`. Este arquivo continua sendo a porta da aplicação para a
 * sessão: é ele que sabe ler e gravar o cookie, e é ele que carrega a barreira
 * `server-only`. O formato assinado não mudou, então cookie emitido antes da
 * separação continua valendo.
 */

/**
 * Devolve o e-mail da sessão, ou null se não houver cookie ou se a assinatura
 * não bater.
 */
export async function getSessionEmail(): Promise<string | null> {
  try {
    const jar = await cookies()
    return await emailDoCookie(jar.get(COOKIE_NAME)?.value)
  } catch {
    return null
  }
}

/**
 * Grava a sessão. O e-mail vai em base64url para não esbarrar nos caracteres
 * que o cookie não aceita e para o ponto separador continuar inequívoco.
 *
 * Só pode ser chamada de Server Action ou Route Handler — no Next 15, escrever
 * cookie durante a renderização de uma página lança erro.
 */
export async function setSession(email: string): Promise<void> {
  const jar = await cookies()

  jar.set(COOKIE_NAME, await valorDoCookie(email), {
    // httpOnly: JavaScript da página não lê a sessão, então um XSS não a rouba.
    httpOnly: true,
    // lax deixa o login sobreviver a uma navegação vinda de fora, mas barra o
    // envio em requisição de terceiro — o suficiente contra CSRF aqui.
    sameSite: 'lax',
    // Em desenvolvimento o servidor é http://localhost; exigir secure ali
    // simplesmente impediria o login.
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_AGE_S,
  })
}

/** Encerra a sessão (o "Sair" do menu do usuário). */
export async function clearSession(): Promise<void> {
  const jar = await cookies()
  jar.delete(COOKIE_NAME)
}
