import { NextRequest, NextResponse } from 'next/server'

import { processarCicloFaturamento } from '@/server/custodia/faturamento'

/**
 * Job agendado de faturamento mensal de custódia (Sessão B-5 / Bloco 8).
 *
 * Agendamento em `vercel.json` configurado para o dia 1 de cada mês às 08:00 UTC.
 * Executa a conferência das moedas sob guarda, debita automaticamente em saldo quando
 * disponível e emite faturas de custódia com tolerância de 10 dias.
 *
 * Segurança: protegido por `CRON_SECRET` via cabeçalho `Authorization: Bearer <CRON_SECRET>`.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret || process.env.NODE_ENV === 'production') {
    if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ ok: false, error: 'Não autorizado' }, { status: 401 })
    }
  }

  try {
    const relatorio = await processarCicloFaturamento()
    return NextResponse.json({
      ok: true,
      ...relatorio,
      executadoEm: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[Cron Faturamento] Erro ao processar ciclo de faturamento de custódia:', error)
    return NextResponse.json({ ok: false, error: 'Falha ao processar faturamento de custódia' }, { status: 500 })
  }
}
