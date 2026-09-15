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
import { RegistroDeUso } from '@/components/providers/RegistroDeUso'
import { Sidebar, SidebarProvider } from '@/components/shell/Sidebar'
import { Topbar } from '@/components/shell/Topbar'
import { ModalHost } from '@/components/ui/Modal'
import { podeAbrirPainelAdmin } from '@/server/admin/acesso'
import { carregarConfiguracaoDoSite, configDoCliente } from '@/server/config/carregar'
import { documentosPendentesDeAceite } from '@/server/config/documentos'
import { barrarContaDesativada, SAIDA_DA_CONTA_DESATIVADA } from '@/server/auth/conta-desativada'
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

  // Conta desativada pelo painel sai pela rota que apaga a sessão: Server Component não apaga cookie,
  // e mandar direto para /entrar faria laço com o redirecionamento de /entrar para /inicio.
  if (await barrarContaDesativada(session)) redirect(SAIDA_DA_CONTA_DESATIVADA)

  // Desde a C1 a pergunta é "esta conta é membro do painel?" — pelos papéis do
  // banco, caindo na lista do ambiente se o banco falhar. Uma consulta de uma linha.
  const admin = await podeAbrirPainelAdmin(session)

  // Taxas, catálogo e limites vigentes (C3) e o que a conta ainda não aceitou na versão
  // vigente dos documentos. Os dois voltam a ser lidos a cada ciclo por /api/state.
  const config = await carregarConfiguracaoDoSite()
  const aceitesPendentes = await documentosPendentesDeAceite(session, config)

  return (
    // `admin` é decidido aqui, no servidor, e só liga o item "Administração" do
    // menu. O painel e as rotas de API conferem de novo — o menu é conveniência,
    // não barreira.
    <AppProvider initialState={state} session={session} admin={admin} config={configDoCliente(config)} aceitesPendentes={aceitesPendentes}>
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
      {/* Registro de uso da plataforma (frente C): anota páginas abertas e manda em
          lote. Não desenha nada e nunca interrompe a navegação. */}
      <RegistroDeUso />
    </AppProvider>
  )
}
