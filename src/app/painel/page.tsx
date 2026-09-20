/**
 * /painel — a entrada própria do painel administrativo.
 *
 * POR QUE UMA ROTA SEPARADA. Até 14/09/2026 o painel só se abria digitando /admin já logado
 * com uma conta da equipe. Sem sessão, /admin mandava para /entrar, que depois do login
 * sempre leva ao site do cliente; e conta fora da equipe caía em /inicio sem explicação. Para
 * quem abria o link, o painel "não existia". Esta página resolve os três casos:
 *
 *  - membro da equipe já logado → vai direto para /admin;
 *  - sem sessão → formulário de entrada que, dando certo, leva a /admin (e o Google volta
 *    para /admin pelo cookie de destino, src/server/auth/destino.ts);
 *  - logado com conta que não é da equipe → diz qual conta é e oferece sair e entrar com
 *    outra.
 *
 * Fora de `src/app/(admin)/` de propósito: o layout de lá manda quem não é membro para cá, e
 * esta página dentro dele entraria em laço. Não é segundo login — é a mesma sessão do site.
 */

import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'

import { EntradaDoPainel } from '@/components/admin/entrada/EntradaDoPainel'
import { carregarMembro } from '@/server/admin/acesso'
import { getSessionEmail } from '@/server/session'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Painel administrativo — entrar | Real Olímpico',
  // Área interna: não tem por que aparecer em buscador.
  robots: { index: false, follow: false },
}

export default async function PainelEntradaPage(): Promise<ReactNode> {
  const email = await getSessionEmail().catch(() => null)
  if (email) {
    const membro = await carregarMembro(email)
    if (membro) redirect('/admin')
  }
  return <EntradaDoPainel contaSemAcesso={email} />
}
