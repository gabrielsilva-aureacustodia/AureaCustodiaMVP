import { NextRequest, NextResponse } from 'next/server'
import { atualizarRastreiosEmLote } from '@/lib/shipping'

/**
 * Endpoint de Cron Job para atualização de rastreamentos dos Correios.
 *
 * REGRAS:
 *  - Chamado periodicamente pela Vercel Cron (ex: diário às 9h no plano Hobby).
 *  - Protegido por `CRON_SECRET` para evitar acessos externos não autorizados.
 *  - Executa a busca em lote, atualizando os estados sem sobrecarregar as requisições dos usuários.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  // Se CRON_SECRET estiver configurado ou em ambiente de produção, valida o Bearer token
  if (cronSecret || process.env.NODE_ENV === 'production') {
    if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ ok: false, error: 'Não autorizado' }, { status: 401 })
    }
  }

  try {
    // Códigos de rastreamento pendentes (integrados com o repositório aurea.rastreios na C-3)
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
