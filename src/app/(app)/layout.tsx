/**
 * Casco da aplicação autenticada — port de aurea-mvp-teste.html, linhas 656-733
 * (a <div class="app"> com sidebar, topbar e os onze contêineres de view).
 *
 * A REGRA DE ARQUITETURA DO ORIGINAL, AGORA DE GRAÇA
 * --------------------------------------------------
 * O MVP nunca redesenhava o casco ao navegar. `render()` (linha 1160) só
 * trocava o `display` dos onze <div id="view*"> e chamava o renderizador da tela
 * escolhida; sidebar e topbar ficavam intocadas no DOM. Era uma disciplina que
 * alguém tinha de manter à mão.
 *
 * Aqui isso deixa de ser disciplina e vira estrutura: no App Router, um layout
 * permanece montado enquanto a navegação acontece dentro do seu segmento. A
 * sidebar, a topbar e — o que mais importa — o AppProvider com o estado e o
 * ciclo de sincronização de 10s sobrevivem à troca de página. Só {children}
 * muda. Os onze contêineres escondidos deixaram de existir porque o roteador faz
 * exatamente o papel deles.
 *
 * SERVER COMPONENT DE PROPÓSITO
 * -----------------------------
 * A sessão é conferida no servidor, antes de qualquer HTML sair. Um guarda no
 * cliente (useEffect que redireciona) entregaria o casco montado ao visitante
 * não autenticado por um instante — e, pior, entregaria o estado junto.
 *
 * E o estado é buscado AQUI, não no cliente: a primeira pintura já chega com
 * saldo, nome e inventário. Buscar depois da hidratação daria a piscada de tela
 * vazia que o monolito não tinha (ele carregava o estado antes de mostrar o app).
 */

import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'

import { AppProvider } from '@/components/providers/AppProvider'
import { Sidebar, SidebarProvider } from '@/components/shell/Sidebar'
import { Topbar } from '@/components/shell/Topbar'
import { ModalHost } from '@/components/ui/Modal'
import { getSessionEmail } from '@/server/session'
import { getState } from '@/server/state'

export default async function AppLayout({
  children,
}: {
  children: ReactNode
}): Promise<ReactNode> {
  const session = await getSessionEmail()
  if (!session) redirect('/entrar')

  const state = await getState()

  // Cookie assinado apontando para um usuário que não está mais no estado (banco
  // recriado, seed trocado). Sem esta checagem, `me` seria undefined e a topbar
  // quebraria em me.name — um erro de tela cheia onde o certo é pedir login.
  if (!state.users[session]) redirect('/entrar')

  return (
    <AppProvider initialState={state} session={session}>
      <SidebarProvider>
        {/* .app é display:none sem .active — a classe não é decorativa. */}
        <div className="app active">
          <Sidebar />
          <main className="main">
            <Topbar />
            {children}
          </main>
        </div>
        {/* Irmã de .app, como o #modalBg do original (linha 735). Fica dentro do
            AppProvider para que o conteúdo das modais enxergue state, session e
            run() — ver a nota no topo de components/ui/Modal.tsx. */}
        <ModalHost />
      </SidebarProvider>
    </AppProvider>
  )
}
