/**
 * Casco do painel administrativo — `/admin` (frente C, plano do Admin, seção 1.4).
 *
 * POR QUE UM ROUTE GROUP PRÓPRIO, E NÃO UMA PASTA DENTRO DE (app). O layout de (app)
 * monta o `AppProvider`, que carrega o `AppState` inteiro e o relê a cada 10 segundos.
 * O painel lê ledger, trilha, papéis e indicadores — nada disso está no `AppState` —,
 * e pendurá-lo ali faria toda tela administrativa arrastar o estado do marketplace
 * sem usar. Aqui o layout, o provider e a folha de estilo são próprios; o que se
 * compartilha com o app é a sessão, o tema, o toast e as classes do casco.
 *
 * SERVER COMPONENT DE PROPÓSITO. A sessão e o papel são conferidos antes de qualquer
 * HTML sair: sem sessão, ou logado sem ser da equipe, vai para a entrada do painel
 * (/painel). Sem segundo login e sem segundo fator — quem já está logado e é membro abre
 * direto, tenha entrado por /entrar ou por /painel.
 *
 * Cada página confere a própria permissão de novo, no servidor: layout e página
 * renderizam em paralelo no App Router, e o menu é só conveniência.
 */

import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import { AdminProvider } from '@/components/admin/AdminProvider'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { AdminTopbar } from '@/components/admin/AdminTopbar'
import { RegistroDeUso } from '@/components/providers/RegistroDeUso'
import { SidebarProvider } from '@/components/shell/Sidebar'
import { ModalHost } from '@/components/ui/Modal'
import { membroDaPagina } from '@/server/admin/acesso'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Painel administrativo — Áurea Custódia',
  // Área interna: não tem por que aparecer em buscador.
  robots: { index: false, follow: false },
}

export default async function AdminLayout({ children }: { children: ReactNode }): Promise<ReactNode> {
  const membro = await membroDaPagina()

  return (
    <AdminProvider membro={membro}>
      <SidebarProvider>
        {/* .app é display:none sem .active — a classe não é decorativa (shell.css). */}
        <div className="app active">
          <AdminSidebar />
          <main className="main">
            <AdminTopbar />
            {children}
          </main>
        </div>
        {/* Dentro do AdminProvider: conteúdo de modal do painel enxerga useAdmin(). */}
        <ModalHost />
      </SidebarProvider>
      <RegistroDeUso />
    </AdminProvider>
  )
}
