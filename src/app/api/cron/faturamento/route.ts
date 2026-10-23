import { NextRequest, NextResponse } from 'next/server'

import { processarCicloFaturamento } from '@/server/custodia/faturamento'
import { processarNotasPendentes } from '@/server/nfse/emissao'

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
    // NFS-e (23/10/2026): a rodada diária reenvia a fila — pendências de quando a Sefin estava fora do
    // ar e recusas por cadastro incompleto que o cliente pode ter completado. Falhar aqui não desfaz o
    // faturamento, que já commitou.
    let nfse: unknown = null
    try {
      nfse = await processarNotasPendentes({ incluirRejeitadas: true, limite: 200 })
    } catch (erroNfse) {
      console.error('[Cron Faturamento] Falha no reenvio das NFS-e:', erroNfse)
      nfse = { falhou: true }
    }
    return NextResponse.json({
      ok: true,
      ...relatorio,
      nfse,
      executadoEm: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[Cron Faturamento] Erro ao processar ciclo de faturamento de custódia:', error)
    return NextResponse.json({ ok: false, error: 'Falha ao processar faturamento de custódia' }, { status: 500 })
  }
}
