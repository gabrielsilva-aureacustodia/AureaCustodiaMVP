import { NextResponse } from 'next/server'
import { getSessionEmail } from '@/server/session'
import { gerarRelatorioConciliacao } from '@/server/payments/conciliacao-ledger'

/**
 * Endpoint para Relatório de Conciliação Financeira Gateway × Ledger × Custódia.
 *
 * ROTA: GET /api/admin/conciliacao
 */
export async function GET(): Promise<NextResponse> {
  const session = await getSessionEmail()
  if (!session) {
    return NextResponse.json({ ok: false, error: 'Sessão expirada ou não autenticado.' }, { status: 401 })
  }

  try {
    const relatorio = await gerarRelatorioConciliacao()
    return NextResponse.json({
      ok: true,
      data: relatorio,
    })
  } catch (error) {
    console.error('[Admin Conciliação] Erro ao gerar relatório:', error)
    return NextResponse.json(
      { ok: false, error: 'Falha ao processar conciliação financeira.' },
      { status: 500 },
    )
  }
}
