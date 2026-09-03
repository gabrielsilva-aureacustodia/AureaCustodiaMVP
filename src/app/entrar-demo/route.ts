/**
 * '/entrar-demo' — abre a plataforma JÁ LOGADO, sem passar pela tela de entrada.
 *
 * Existe para a demonstração local: abrir a URL num navegador limpo cai no
 * login, e digitar credencial a cada vez atrapalha quem só quer ver as telas.
 * Esta rota grava o cookie de sessão de uma conta do seed e manda para /inicio.
 *
 * DUAS TRAVAS, E AS DUAS PRECISAM PASSAR
 * --------------------------------------
 *  1. `NODE_ENV !== 'production'` — em qualquer build publicado (produção OU
 *     preview da Vercel, que também compila como produção) a rota responde 404.
 *  2. O host da requisição precisa ser `localhost` ou `127.0.0.1` — se alguém
 *     rodar `next dev` numa máquina exposta, a rota continua fora do alcance de
 *     quem vem pela rede.
 *
 * As duas existem porque isto é um login SEM SENHA num repositório público
 * (RA-11). Uma trava só seria uma linha de distância da falha mais grave que uma
 * plataforma financeira pode ter: entrar na conta de um sócio com uma URL.
 *
 * É uma Route Handler, e não um Server Component, porque só Server Action e
 * Route Handler podem gravar cookie no App Router.
 *
 * PROVISÓRIA: sai quando a frente A entregar o login com Supabase Auth.
 * Registrada como RA-15 em `RISCOS_ASSUMIDOS.md`.
 */

import { NextResponse } from 'next/server'

import { setSession } from '@/server/session'
import { getState } from '@/server/state'

/** Conta do seed usada na demonstração. Trocável por `?email=` entre as sete. */
const CONTA_PADRAO = 'gabrielsilva@testeaurea.com.br'

export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url)

  const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '[::1]'
  if (process.env.NODE_ENV === 'production' || !local) {
    return NextResponse.json({ erro: 'Rota indisponível.' }, { status: 404 })
  }

  const pedido = url.searchParams.get('email')?.trim().toLowerCase()
  const email = pedido && pedido.length > 0 ? pedido : CONTA_PADRAO

  // A primeira leitura semeia as sete contas quando o estado está vazio — é o
  // mesmo caminho de qualquer outra tela, então a rota funciona logo após o
  // servidor subir, sem depender de alguém ter aberto o login antes.
  const state = await getState()
  if (!state.users[email]) {
    return NextResponse.json(
      { erro: `Conta ${email} não existe no estado atual.` },
      { status: 404 },
    )
  }

  await setSession(email)
  return NextResponse.redirect(new URL('/inicio', request.url))
}
