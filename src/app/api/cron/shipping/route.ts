import { NextRequest, NextResponse } from 'next/server'
import { atualizarRastreiosEmLote } from '@/lib/shipping'

/**
 * Endpoint de Cron Job para atualização de rastreamentos dos Correios.
 *
 * REGRAS:
 *  - Chamado periodicamente pela Vercel Cron (ex: a cada 1 hora).
 *  - Protegido por `CRON_SECRET` para evitar abusos externos.
 *  - Executa a busca em lote, atualizando os estados sem sobrecarregar as requisições dos usuários.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ ok: false, error: 'Não autorizado' }, { status: 401 })
  }

  try {
    // Códigos de rastreamento pendentes (a serem integrados com o repositório de envios)
    const codigosPendentes: string[] = []

    const resultados = await atualizarRastreiosEmLote(codigosPendentes)

    return NextResponse.json({
      ok: true,
      totalVerificados: codigosPendentes.length,
      resultados,
      executadoEm: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[Cron Rastreio] Erro ao executar atualização em lote:', error)
    return NextResponse.json(
      { ok: false, error: 'Falha ao atualizar rastreios' },
      { status: 500 },
    )
  }
}
