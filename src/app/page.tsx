/**
 * Tela de Login (rota '/') — port de aurea-mvp-teste.html, linhas 629-654.
 *
 * No monolito, login e aplicação eram duas <div> irmãs no mesmo documento e a
 * troca entre elas era `style.display` (linhas 1059-1060 e 1067-1068). Aqui são
 * duas rotas: '/' é esta página e o casco autenticado vive no grupo (app). A
 * consequência boa é que o HTML do login não carrega mais nada da aplicação —
 * nem o estado, nem o catálogo de senhas.
 *
 * SERVER COMPONENT, E A CHECAGEM É ANTES DE PINTAR
 * -----------------------------------------------
 * Quem já tem cookie de sessão vai direto para /inicio, decidido no servidor.
 * Fazer isso num useEffect do cliente mostraria o cartão de login por um quadro
 * a cada visita à raiz — inclusive a quem só apertou "voltar" no navegador.
 *
 * É o espelho exato do guarda do (app)/layout, que manda para '/' quem não tem
 * sessão: os dois juntos garantem que nenhuma das duas telas apareça para o
 * público errado, nem por um instante.
 *
 * A chamada a cookies() dentro de getSessionEmail() já marca esta rota como
 * dinâmica — não há como o Next servir uma versão estática com a decisão
 * congelada.
 */

import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'

import { LoginForm } from '@/components/login/LoginForm'
import { getSessionEmail } from '@/server/session'
import { getState } from '@/server/state'

export default async function LoginPage(): Promise<ReactNode> {
  const session = await getSessionEmail()

  if (session) {
    // A mesma segunda condição do (app)/layout, e ela precisa estar nos DOIS
    // lados. Um cookie assinado apontando para um usuário que sumiu do estado
    // (banco recriado, seed trocado) faria '/' mandar para /inicio, o layout
    // mandar de volta para '/', e o navegador desistir com
    // ERR_TOO_MANY_REDIRECTS. Conferindo aqui, o visitante simplesmente vê o
    // login — e o login() sobrescreve o cookie velho.
    //
    // O custo do getState() só recai sobre quem TEM cookie: visitante anônimo
    // não chega a tocar no banco.
    const state = await getState()
    if (state.users[session]) redirect('/inicio')
  }

  // Nenhum provider extra aqui: tema, toast e modal já envolvem tudo desde o
  // layout raiz, porque o login é irmão do casco e não filho dele.
  return <LoginForm />
}
