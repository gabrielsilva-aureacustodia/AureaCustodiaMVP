/* ============================================================================
 * NÚCLEO CRIPTOGRÁFICO DA SESSÃO — sem `server-only` de propósito.
 *
 * Este é o único módulo da sessão que NÃO carrega a barreira `server-only`, e
 * a razão é concreta: o `middleware.ts` precisa conferir a assinatura do cookie
 * antes de a requisição chegar em qualquer rota, e middleware não é o mesmo
 * contexto de servidor que o pacote `server-only` reconhece. A barreira
 * continua em `session.ts`, que é por onde a aplicação inteira fala com a
 * sessão.
 *
 * QUEM PODE IMPORTAR ESTE ARQUIVO: apenas `src/server/session.ts` e
 * `src/middleware.ts`. Há um teste que reprova qualquer outro import
 * (`session-core.test.ts`) — a regra é verificada, não confiada.
 *
 * POR QUE WEB CRYPTO E NÃO `node:crypto`. O `crypto.subtle` existe no Node 18+
 * e no runtime Edge; o `node:crypto` só no Node. Uma implementação só,
 * servindo os dois lados, é o que evita duas versões da mesma assinatura
 * divergirem — e divergência aqui não daria erro, daria gente deslogada sem
 * explicação. O teste companheiro confirma que a saída é byte a byte igual à
 * do `node:crypto`, para que os cookies já emitidos continuem valendo.
 * ==========================================================================*/

/** Nome do cookie de sessão. Compartilhado com o middleware. */
export const COOKIE_NAME = 'aurea_session'

/** Validade do cookie: 7 dias. */
export const MAX_AGE_S = 60 * 60 * 24 * 7

/**
 * Segredo de desenvolvimento. Fixo de propósito: se fosse aleatório por
 * processo, todo reinício do `next dev` deslogaria quem estivesse testando.
 * Em produção, defina SESSION_SECRET — trocá-lo invalida todas as sessões
 * abertas, que é justamente o que se quer num vazamento.
 */
const DEV_SECRET = 'aurea-dev-secret-trocar-em-producao'

let avisouSobreSegredo = false

/**
 * Erro específico para "falta SESSION_SECRET em produção".
 *
 * Tem tipo próprio porque o middleware precisa distinguir esta falha das
 * demais: ele a trata como "sem sessão válida" em vez de derrubar a
 * requisição, senão a ausência da variável tiraria do ar até as páginas
 * públicas. As rotas protegidas continuam caindo no `throw` original quando o
 * layout confere a sessão.
 */
export class SegredoDeSessaoAusente extends Error {}

export function segredoDeSessao(): string {
  const doAmbiente = process.env.SESSION_SECRET
  if (doAmbiente && doAmbiente.length > 0) return doAmbiente

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
    throw new SegredoDeSessaoAusente(
      'SESSION_SECRET é obrigatória em produção. Sem ela, o cookie de sessão seria ' +
        'assinado com um segredo público e qualquer pessoa entraria como qualquer usuário. ' +
        'Defina a variável na Vercel (Settings → Environment Variables) e faça Redeploy.',
    )
  }

  if (!avisouSobreSegredo) {
    avisouSobreSegredo = true
    console.warn(
      '[aurea] SESSION_SECRET não definida — usando segredo de desenvolvimento, ' +
        'que é público neste repositório. Qualquer pessoa consegue forjar um cookie ' +
        'de sessão e entrar como outro usuário. Defina SESSION_SECRET antes de expor ' +
        'a aplicação.',
    )
  }
  return DEV_SECRET
}

/* ---------- base64url sem Buffer (o Edge não tem Buffer) ---------- */

export function textoParaBase64url(texto: string): string {
  const bytes = new TextEncoder().encode(texto)
  let binario = ''
  for (const b of bytes) binario += String.fromCharCode(b)
  return btoa(binario).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function base64urlParaTexto(valor: string): string {
  const base64 = valor.replace(/-/g, '+').replace(/_/g, '/')
  // `atob` exige o padding que o base64url remove.
  const resto = base64.length % 4
  const preenchido = resto === 0 ? base64 : base64 + '='.repeat(4 - resto)
  const binario = atob(preenchido)
  const bytes = Uint8Array.from(binario, (c) => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

/* ---------- assinatura ---------- */

/**
 * HMAC-SHA256 em hexadecimal — o mesmo formato que o `node:crypto` produzia
 * com `createHmac('sha256', segredo).update(payload).digest('hex')`.
 */
export async function assinar(payload: string): Promise<string> {
  const codificador = new TextEncoder()
  const chave = await crypto.subtle.importKey(
    'raw',
    codificador.encode(segredoDeSessao()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const assinatura = await crypto.subtle.sign('HMAC', chave, codificador.encode(payload))
  return [...new Uint8Array(assinatura)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Comparação em tempo constante, sem `timingSafeEqual` (que é do `node:crypto`).
 *
 * Tamanho diferente reprova antes — e nunca acontece entre dois HMAC-SHA256
 * legítimos, sempre 64 caracteres hexadecimais. O laço percorre a string
 * inteira acumulando diferença em vez de sair no primeiro byte distinto: sair
 * cedo vazaria, pelo tempo de resposta, quantos caracteres o atacante acertou.
 */
export function assinaturaConfere(recebida: string, esperada: string): boolean {
  if (recebida.length !== esperada.length) return false
  let diferenca = 0
  for (let i = 0; i < recebida.length; i++) {
    diferenca |= recebida.charCodeAt(i) ^ esperada.charCodeAt(i)
  }
  return diferenca === 0
}

/* ---------- leitura e escrita do valor do cookie ---------- */

/** Monta o valor do cookie a partir do e-mail já autenticado. */
export async function valorDoCookie(email: string): Promise<string> {
  const payload = textoParaBase64url(email)
  return `${payload}.${await assinar(payload)}`
}

/**
 * Devolve o e-mail contido no cookie, ou null se o valor não existir, estiver
 * malformado ou a assinatura não bater.
 *
 * Assinatura inválida é tratada como "não logado", sem erro: um cookie de um
 * segredo antigo é situação normal depois de uma rotação.
 *
 * Recebe o valor CRU em vez de ler o cookie sozinho porque quem lê é diferente
 * em cada contexto — `cookies()` do `next/headers` na aplicação, `request.cookies`
 * no middleware. Manter a leitura fora daqui é o que permite um núcleo só.
 */
export async function emailDoCookie(bruto: string | undefined | null): Promise<string | null> {
  try {
    if (!bruto) return null

    // O payload é base64url e nunca contém ponto, então o último ponto separa
    // com segurança o valor da assinatura.
    const corte = bruto.lastIndexOf('.')
    if (corte <= 0) return null

    const payload = bruto.slice(0, corte)
    const assinatura = bruto.slice(corte + 1)
    if (!assinaturaConfere(assinatura, await assinar(payload))) return null

    const email = base64urlParaTexto(payload)
    return email.length > 0 ? email : null
  } catch (e) {
    // A falta de SESSION_SECRET em produção precisa continuar subindo: quem
    // chama do lado da aplicação deve quebrar visivelmente, não seguir como
    // visitante. O middleware é quem captura este caso, e só ele.
    if (e instanceof SegredoDeSessaoAusente) throw e
    return null
  }
}
