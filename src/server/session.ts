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

import { createHmac, timingSafeEqual } from 'node:crypto'

import { cookies } from 'next/headers'

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
 */

const COOKIE_NAME = 'aurea_session'
const MAX_AGE_S = 60 * 60 * 24 * 7 // 7 dias

/**
 * Segredo de desenvolvimento. Fixo de propósito: se fosse aleatório por
 * processo, todo reinício do `next dev` deslogaria quem estivesse testando.
 * Em produção, defina SESSION_SECRET — trocá-lo invalida todas as sessões
 * abertas, que é justamente o que se quer num vazamento.
 */
const DEV_SECRET = 'aurea-dev-secret-trocar-em-producao'

let warnedAboutSecret = false

function sessionSecret(): string {
  const fromEnv = process.env.SESSION_SECRET
  if (fromEnv && fromEnv.length > 0) return fromEnv

  /*
   * Em produção, faltar SESSION_SECRET deixa de degradar em silêncio e passa a
   * DERRUBAR a requisição. O fallback silencioso significava assinar o cookie
   * com um segredo que está escrito neste arquivo — qualquer pessoa com o
   * repositório forjaria a sessão de qualquer usuário. Melhor a plataforma
   * fora do ar, visivelmente, do que aberta em silêncio.
   *
   * O throw fica AQUI, e não no topo do módulo, de propósito: em tempo de
   * import ele quebraria também o `next build` (que roda com NODE_ENV de
   * produção e sem variáveis de runtime); dentro da função ele só dispara
   * quando uma requisição real precisa assinar ou conferir sessão.
   */
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'SESSION_SECRET é obrigatória em produção. Sem ela, o cookie de sessão seria ' +
        'assinado com um segredo público e qualquer pessoa entraria como qualquer usuário. ' +
        'Defina a variável na Vercel (Settings → Environment Variables) e faça Redeploy.',
    )
  }

  if (!warnedAboutSecret) {
    warnedAboutSecret = true
    console.warn(
      '[aurea] SESSION_SECRET não definida — usando segredo de desenvolvimento, ' +
        'que é público neste repositório. Qualquer pessoa consegue forjar um cookie ' +
        'de sessão e entrar como outro usuário. Defina SESSION_SECRET antes de expor ' +
        'a aplicação.',
    )
  }
  return DEV_SECRET
}

function sign(payload: string): string {
  return createHmac('sha256', sessionSecret()).update(payload).digest('hex')
}

/**
 * Comparação em tempo constante. Diferença de tamanho já reprova antes, porque
 * timingSafeEqual exige buffers do mesmo comprimento — e ela nunca acontece
 * entre dois HMAC-SHA256 legítimos, sempre 64 caracteres hexadecimais.
 */
function signatureMatches(received: string, expected: string): boolean {
  if (received.length !== expected.length) return false
  return timingSafeEqual(Buffer.from(received, 'utf8'), Buffer.from(expected, 'utf8'))
}

/**
 * Devolve o e-mail da sessão, ou null se não houver cookie ou se a assinatura
 * não bater. Assinatura inválida é tratada como "não logado", sem erro: um
 * cookie de um segredo antigo é situação normal depois de uma rotação.
 */
export async function getSessionEmail(): Promise<string | null> {
  const jar = await cookies()
  const raw = jar.get(COOKIE_NAME)?.value
  if (!raw) return null

  // O payload é base64url e nunca contém ponto, então o último ponto separa
  // com segurança o valor da assinatura.
  const cut = raw.lastIndexOf('.')
  if (cut <= 0) return null

  const payload = raw.slice(0, cut)
  const signature = raw.slice(cut + 1)
  if (!signatureMatches(signature, sign(payload))) return null

  const email = Buffer.from(payload, 'base64url').toString('utf8')
  return email.length > 0 ? email : null
}

/**
 * Grava a sessão. O e-mail vai em base64url para não esbarrar nos caracteres
 * que o cookie não aceita e para o ponto separador continuar inequívoco.
 *
 * Só pode ser chamada de Server Action ou Route Handler — no Next 15, escrever
 * cookie durante a renderização de uma página lança erro.
 */
export async function setSession(email: string): Promise<void> {
  const payload = Buffer.from(email, 'utf8').toString('base64url')
  const jar = await cookies()

  jar.set(COOKIE_NAME, `${payload}.${sign(payload)}`, {
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
