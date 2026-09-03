import { NextRequest, NextResponse } from 'next/server'

import { atualizarRastreiosPendentes } from '@/server/shipping/rastreios'

/**
 * Job agendado de rastreio dos Correios.
 *
 * POR QUE AGENDADO, E NÃO POR VISITA DE PÁGINA
 * --------------------------------------------
 * Consultar a API dos Correios a cada carregamento de tela gera custo, esbarra
 * no limite de requisições e deixa a página lenta — e o estado de um objeto
 * postal muda algumas vezes por dia, não a cada F5. O job grava o último
 * retrato em `aurea.rastreios`; a tela lê de lá.
 *
 * O agendamento está em `vercel.json`. É DIÁRIO porque o plano Hobby da Vercel
 * só permite uma execução por dia; com plano Pro, a mesma rota aceita cadência
 * maior sem nenhuma mudança de código.
 *
 * `CRON_SECRET`: a Vercel envia `Authorization: Bearer <valor>` sozinha quando a
 * variável existe no projeto. Em produção a rota EXIGE o cabeçalho — sem isso,
 * a URL seria um botão público para gastar a cota da API dos Correios.
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
    const resumo = await atualizarRastreiosPendentes()
    return NextResponse.json({
      ok: true,
      ...resumo,
      executadoEm: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[Cron Rastreio] Erro ao atualizar rastreios:', error)
    return NextResponse.json({ ok: false, error: 'Falha ao atualizar rastreios' }, { status: 500 })
  }
}
