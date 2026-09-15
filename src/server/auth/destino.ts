/**
 * Para onde o login volta — o site do cliente (`/inicio`) ou o painel (`/admin`).
 *
 * POR QUE UM COOKIE. O login pelo Google sai do site e volta pelo callback, e o callback só
 * sabia mandar para `/inicio`: quem entrava pela entrada do painel (`/painel`) terminava no
 * site do cliente. Pôr o destino no endereço de volta dependeria de cadastrar a URL com
 * parâmetro na lista de redirecionamento do Supabase — configuração fora do padrão. Um
 * cookie curto, lido só pelo callback, funciona com a configuração que já existe.
 *
 * O valor não é assinado porque não carrega poder nenhum: só `/admin` é aceito, e o painel
 * confere sessão e permissão por conta própria. Qualquer outro valor vira `/inicio` — um
 * destino livre aqui seria um redirecionamento aberto para fora do site.
 */

import 'server-only'

import { cookies } from 'next/headers'

export const COOKIE_DESTINO_DO_LOGIN = 'aurea_destino_login'
const PRAZO_S = 10 * 60

export type DestinoDoLogin = '/inicio' | '/admin'

/** Só o painel é destino alternativo; o resto é o site do cliente. */
export function destinoPermitido(valor: string | null | undefined): DestinoDoLogin {
  return valor === '/admin' ? '/admin' : '/inicio'
}

/** Chamado pela Server Action antes de mandar para o Google. */
export async function lembrarDestinoDoLogin(destino: DestinoDoLogin): Promise<void> {
  const jar = await cookies()
  if (destino === '/inicio') {
    jar.delete(COOKIE_DESTINO_DO_LOGIN)
    return
  }
  jar.set(COOKIE_DESTINO_DO_LOGIN, destino, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: PRAZO_S,
  })
}

/** Lido e apagado pelo callback: o destino vale para um login só. */
export async function consumirDestinoDoLogin(): Promise<DestinoDoLogin> {
  const jar = await cookies()
  const valor = jar.get(COOKIE_DESTINO_DO_LOGIN)?.value
  if (valor !== undefined) jar.delete(COOKIE_DESTINO_DO_LOGIN)
  return destinoPermitido(valor)
}
