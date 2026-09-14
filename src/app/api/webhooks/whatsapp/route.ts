import { NextRequest, NextResponse } from 'next/server'

import { provedorDoAmbiente } from '@/lib/mensageria'
import { receberEventos } from '@/server/admin/cs'
import { bancoConfigurado, executarNoBanco } from '@/server/db/client'

/**
 * Webhook receptor do WhatsApp do atendimento (plano do Admin, seção 2.4).
 *
 * MESMO DESENHO DE /api/webhooks/mercadopago: confere a assinatura, normaliza, grava e
 * responde. Webhook que demora é webhook reentregue.
 *
 * A ORDEM DOS PASSOS É A SEGURANÇA
 * --------------------------------
 *  1. Sem provedor configurado (só o registro local), 503: não há quem mande evento, e o
 *     503 faz a Evolution tentar de novo — se as variáveis entrarem na Vercel durante as
 *     tentativas, a mensagem não se perde.
 *  2. Assinatura conferida ANTES de ler o JSON. Inválida, 401, e nada é interpretado.
 *  3. O que não é mensagem de uma pessoa (grupo, reação, conexão) responde 200 sem tocar no
 *     banco: o provedor precisa do 200 para parar de reenviar.
 *  4. A gravação acontece ANTES da resposta, e não num `after()`: são poucas linhas numa
 *     transação curta, e responder 200 antes de gravar faria uma queda no meio perder a
 *     mensagem para sempre — a Evolution não reenvia o que recebeu 200.
 *     Reentrega não duplica: `cs_mensagens.id_no_provedor` é único.
 *
 * O que fazer com a mensagem mora em src/server/admin/cs.ts — esta rota decide *se* grava.
 */

/** A Evolution manda mídia em base64 se `webhook.base64` estiver ligado; com ele desligado, 1 MB sobra. */
const CORPO_MAX = 1_000_000

function resposta(status: number, corpo: Record<string, unknown>): NextResponse {
  return NextResponse.json(corpo, { status, headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const provedor = provedorDoAmbiente()
  if (!provedor.entregaDeVerdade) {
    return resposta(503, { ok: false, error: `Nenhum provedor de WhatsApp configurado. Falta: ${provedor.pendencias.join(', ')}.` })
  }

  const corpo = await req.text()
  if (corpo.length > CORPO_MAX) return resposta(413, { ok: false, error: 'Corpo do webhook grande demais.' })

  if (!provedor.conferirAssinatura(req.headers, corpo)) {
    console.warn('[Webhook WhatsApp] Autenticação do webhook recusada.')
    return resposta(401, { ok: false, error: 'Autenticação do webhook inválida.' })
  }

  let dados: unknown
  try {
    dados = JSON.parse(corpo)
  } catch {
    return resposta(400, { ok: false, error: 'Corpo do webhook não é JSON.' })
  }

  const eventos = provedor.normalizarEvento(dados)
  if (!eventos.length) return resposta(200, { ok: true, recebidos: 0 })

  if (!bancoConfigurado()) {
    return resposta(503, { ok: false, error: 'Sem banco configurado: a mensagem não tem onde ser gravada.' })
  }

  try {
    const resumo = await receberEventos(executarNoBanco, provedor, eventos)
    return resposta(200, { ok: true, ...resumo })
  } catch (err) {
    // 500 de propósito: a Evolution tenta de novo, e a reentrega não duplica.
    console.error('[Webhook WhatsApp] Falha ao gravar eventos:', err)
    return resposta(500, { ok: false, error: 'Erro interno ao gravar a mensagem.' })
  }
}
