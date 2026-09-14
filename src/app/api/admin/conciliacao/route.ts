import { NextResponse } from 'next/server'

import { carregarMembro, temPermissao } from '@/server/admin/acesso'
import { gerarRelatorioConciliacao } from '@/server/payments/conciliacao-ledger'
import { getSessionEmail } from '@/server/session'

/**
 * GET /api/admin/conciliacao — conciliação financeira e de custódia física.
 *
 * SÓ QUEM VÊ A CENTRAL DE RESULTADOS. O relatório soma o saldo de TODAS as contas e
 * a receita da empresa; até 03/09/2026 a rota exigia apenas sessão, e uma conta
 * criada em `/criar-conta` conseguia abri-lo. Desde a C1 a pergunta é a mesma do
 * painel — o membro tem `resultados.ver`? —, e quem está no bootstrap do ambiente
 * (AUREA_ADMIN_EMAILS ou, sem ela, as contas do seed) continua entrando como dev.
 *
 * Os "não cacheie" de /api/state valem aqui: número financeiro servido do CDN
 * de dez minutos atrás é número errado.
 */
export const dynamic = 'force-dynamic'

const SEM_CACHE = { 'Cache-Control': 'no-store, max-age=0' } as const

export async function GET(): Promise<NextResponse> {
  const session = await getSessionEmail()
  if (!session) {
    return NextResponse.json({ ok: false, error: 'Sessão expirada.' }, { status: 401, headers: SEM_CACHE })
  }
  if (!temPermissao(await carregarMembro(session), 'resultados.ver')) {
    return NextResponse.json(
      { ok: false, error: 'Esta área é restrita aos administradores.' },
      { status: 403, headers: SEM_CACHE },
    )
  }

  try {
    const relatorio = await gerarRelatorioConciliacao()
    return NextResponse.json({ ok: true, data: relatorio }, { headers: SEM_CACHE })
  } catch (error) {
    console.error('[Admin Conciliação] Erro ao gerar relatório:', error)
    return NextResponse.json(
      { ok: false, error: 'Falha ao processar conciliação financeira.' },
      { status: 500, headers: SEM_CACHE },
    )
  }
}
