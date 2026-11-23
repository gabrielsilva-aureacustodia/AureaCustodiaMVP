/**
 * Consentimento de cookies de publicidade (A09, QA do Davi, 22/11/2026).
 *
 * A escolha vale para o Pixel da Meta (navegador) E para a API de Conversões (servidor). Por isso ela mora em DOIS
 * lugares: o localStorage (leitura imediata no navegador) e um cookie legível pelo servidor (`ro_cookies`), que é o que
 * o cadastro consulta antes de mandar o evento à Meta. Sem escolha = não rastreia: o padrão é "não".
 *
 * Só cookies de publicidade dependem disto. O cookie de sessão e os do Supabase são essenciais (sem eles não há login)
 * e não passam pelo banner.
 */

export const COOKIE_CONSENTIMENTO = 'ro_cookies'
export const CHAVE_LOCAL_CONSENTIMENTO = 'ro-cookies'
export const EVENTO_CONSENTIMENTO = 'ro-consentimento'
const UM_ANO_S = 60 * 60 * 24 * 365

export type Consentimento = 'aceito' | 'recusado'

function valido(v: string | null | undefined): Consentimento | null {
  return v === 'aceito' || v === 'recusado' ? v : null
}

/** Lê a escolha do cabeçalho `cookie` de uma requisição (servidor). `null` = ainda não escolheu = não rastrear. */
export function consentimentoDoCookie(cabecalhoCookie: string | null | undefined): Consentimento | null {
  if (!cabecalhoCookie) return null
  for (const par of cabecalhoCookie.split(';')) {
    const [nome, ...resto] = par.trim().split('=')
    if (nome === COOKIE_CONSENTIMENTO) {
      try {
        return valido(decodeURIComponent(resto.join('=')))
      } catch {
        return null
      }
    }
  }
  return null
}

/** Navegador: a escolha gravada, ou `null`. O localStorage manda; o cookie cobre quem o limpou. */
export function lerConsentimento(): Consentimento | null {
  if (typeof window === 'undefined') return null
  try {
    const local = valido(window.localStorage.getItem(CHAVE_LOCAL_CONSENTIMENTO))
    if (local) return local
  } catch {
    // localStorage indisponível (modo privado): cai para o cookie.
  }
  return consentimentoDoCookie(document.cookie)
}

/** Navegador: grava a escolha nos dois lugares e avisa quem estiver ouvindo (o Pixel liga ou desliga na hora). */
export function gravarConsentimento(escolha: Consentimento): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(CHAVE_LOCAL_CONSENTIMENTO, escolha)
  } catch {
    // Sem localStorage o cookie abaixo ainda guarda a escolha.
  }
  const seguro = window.location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${COOKIE_CONSENTIMENTO}=${escolha}; Max-Age=${UM_ANO_S}; Path=/; SameSite=Lax${seguro}`
  window.dispatchEvent(new Event(EVENTO_CONSENTIMENTO))
}

/** Assinatura para `useSyncExternalStore`: muda na mesma aba (evento nosso) e em outra aba (evento `storage`). */
export function assinarConsentimento(aoMudar: () => void): () => void {
  window.addEventListener(EVENTO_CONSENTIMENTO, aoMudar)
  window.addEventListener('storage', aoMudar)
  return () => {
    window.removeEventListener(EVENTO_CONSENTIMENTO, aoMudar)
    window.removeEventListener('storage', aoMudar)
  }
}
