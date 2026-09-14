/**
 * /relatorios — redireciona para a Central de Resultados do painel administrativo.
 *
 * Até 13/09/2026 esta era a tela de relatórios e contabilidade (módulos M4 e M7). Desde
 * a C1 (frente C) o conteúdo dela vive em `/admin/resultados/*`, com as permissões do
 * painel; esta rota continua existindo para o link salvo e o favorito de quem já usava.
 * O período pedido (`?ano=&mes=&trimestre=`) viaja junto.
 *
 * As rotas `/api/relatorios/*` NÃO mudaram de endereço: o Google Sheets e o Excel do
 * contador dependem delas (contrato em docs/API_RELATORIOS.md).
 */

import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function RelatoriosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}): Promise<never> {
  const params = await searchParams
  const q = new URLSearchParams()
  for (const chave of ['ano', 'mes', 'trimestre']) {
    const v = params[chave]
    const valor = Array.isArray(v) ? v[0] : v
    if (valor && /^\d{1,4}$/.test(valor)) q.set(chave, valor)
  }
  const sufixo = q.toString()
  redirect(sufixo ? `/admin/resultados/financeiro?${sufixo}` : '/admin/resultados/financeiro')
}
