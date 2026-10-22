import { NextRequest, NextResponse } from 'next/server'

import { desconsiderarEnviosVencidos } from '@/server/shipping/frete-envio'
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
 * maior sem nenhuma mudança de código. Consequência a conhecer: o envio só passa
 * sozinho para "Envio postado" (e a retirada para `postada`/`entregue`) na rodada
 * seguinte ao registro nos Correios — até um dia depois. A data gravada é a do
 * evento dos Correios, não a da rodada, então o atraso é só de exibição.
 *
 * O QUE A RESPOSTA DIZ (22/10/2026)
 * ---------------------------------
 * Além do que foi consultado e gravado (`verificados`, `gravados`,
 * `retiradasVerificadas`, `retiradasGravadas`), a rodada conta o que avançou
 * sozinha — `enviosPostados`, `retiradasPostadas`, `retiradasEntregues` — e
 * `retratosPreservados`: objetos em que os Correios não responderam e o último
 * retrato bom foi mantido em vez de apagado. Os campos vêm de `ResumoAtualizacao`
 * (`src/server/shipping/rastreios.ts`); nenhum código de rastreio de retirada sai
 * na resposta, só contagens.
 *
 * A VARREDURA DOS ENVIOS VENCIDOS roda na mesma rodada, DEPOIS do rastreio (22/10/2026): envio que
 * passou do prazo de postagem com frete pago tem o frete devolvido ao saldo e a pré-postagem
 * cancelada (`desconsiderarEnviosVencidos`). A ordem importa — o rastreio primeiro marca como
 * postado o que os Correios já receberam, e a varredura não desconsidera o que está a caminho.
 * Uma falha na varredura não apaga o resultado do rastreio, e vice-versa.
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

  let resumo: Awaited<ReturnType<typeof atualizarRastreiosPendentes>>
  try {
    resumo = await atualizarRastreiosPendentes()
  } catch (error) {
    console.error('[Cron Rastreio] Erro ao atualizar rastreios:', error)
    return NextResponse.json({ ok: false, error: 'Falha ao atualizar rastreios' }, { status: 500 })
  }

  let varredura: Awaited<ReturnType<typeof desconsiderarEnviosVencidos>> | { erro: string }
  try {
    varredura = await desconsiderarEnviosVencidos()
  } catch (error) {
    console.error('[Cron Rastreio] Erro na varredura de envios vencidos:', error)
    varredura = { erro: 'Falha na varredura de envios vencidos' }
  }

  return NextResponse.json({
    ok: true,
    ...resumo,
    varredura,
    executadoEm: new Date().toISOString(),
  })
}
