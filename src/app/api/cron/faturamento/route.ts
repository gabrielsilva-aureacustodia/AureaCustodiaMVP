import { NextRequest, NextResponse } from 'next/server'

import { processarCicloFaturamento } from '@/server/custodia/faturamento'

/**
 * Job agendado de faturamento de custódia (Sessão B-5 / Bloco 8).
 *
 * Roda TODO DIA às 08:00 UTC (05:00 em Brasília), configurado em `vercel.json`. O ciclo é de cada
 * moeda — começa no dia em que ela foi aceita e renova todo mês no mesmo dia (ver
 * src/domain/ciclo-custodia.ts) —, então a cada passada só aparece o que venceu naquele dia: debita
 * em saldo quando há e emite a fatura pendente quando não há. Até 02/10/2026 rodava só no dia 1º e
 * cobrava o acervo inteiro de todo mundo de uma vez.
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
