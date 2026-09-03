import { NextRequest, NextResponse, after } from 'next/server'

import {
  processarPayloadWebhook,
  validarAssinaturaWebhookMercadoPago,
  type MercadoPagoWebhookPayload,
} from '@/lib/payments'
import { conciliarPagamento } from '@/server/payments/conciliacao'
import { repositorioIdempotencia } from '@/server/payments/repositorios'

/**
 * Webhook receptor do Mercado Pago.
 *
 * A ORDEM DOS PASSOS É A SEGURANÇA (RA-01, RA-07, RA-14)
 * ------------------------------------------------------
 *  1. Extrai o identificador. Payload sem id nenhum é recusado com 400: um
 *     evento que não se identifica não pode ser desduplicado, e aceitá-lo
 *     furaria a idempotência a cada reenvio.
 *  2. Confere a assinatura HMAC-SHA256 em QUALQUER ambiente. Inválida, 401.
 *  3. Reivindica o evento. Quem não ganha a reivindicação recebe 200 com
 *     `already_processed` — o gateway precisa do 200 para parar de reenviar,
 *     mas nada é reprocessado.
 *  4. **Responde 200 e só então concilia**, dentro de `after()`. O Mercado Pago
 *     espera pouco pela resposta; consultar a API dele e gravar no banco antes
 *     de responder transformaria toda cobrança lenta num reenvio garantido.
 *
 * O crédito em si mora em `src/server/payments/conciliacao.ts` — esta rota
 * decide *se* processa, não *como*.
 */
/**
 * Agenda a conciliação para depois da resposta, sem deixar que a falta do
 * contexto derrube a requisição.
 *
 * `after()` só existe dentro do escopo de uma requisição do Next; fora dele
 * (numa suíte de testes, por exemplo) ele LANÇA. Sem esta proteção, a exceção
 * subiria até o catch da rota e o gateway receberia 500 — que é o pior desfecho
 * possível, porque 500 é justamente o que faz o Mercado Pago reenviar.
 *
 * No fallback a tarefa roda solta, sem `await`: a resposta sai na mesma hora, e
 * a tarefa já trata os próprios erros.
 */
function agendarDepoisDaResposta(tarefa: () => Promise<void>): void {
  try {
    after(tarefa)
  } catch {
    void tarefa()
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const xSignature = req.headers.get('x-signature')
    const xRequestId = req.headers.get('x-request-id')

    // O Mercado Pago entrega tanto JSON (v2) quanto query string (v1). Aceitar
    // os dois evita perder notificação de configuração antiga do painel.
    let payload: MercadoPagoWebhookPayload = {}
    try {
      payload = (await req.json()) as MercadoPagoWebhookPayload
    } catch {
      const { searchParams } = new URL(req.url)
      payload = {
        id: searchParams.get('id') || searchParams.get('data.id') || undefined,
        type: searchParams.get('type') || searchParams.get('topic') || undefined,
        data: { id: searchParams.get('data.id') || searchParams.get('id') || undefined },
      }
    }

    const { eventoId, paymentId, tipo, action } = processarPayloadWebhook(payload)

    if (!eventoId) {
      console.warn('[Webhook MercadoPago] Requisição sem identificador de evento.')
      return NextResponse.json({ ok: false, error: 'Identificador do evento ausente' }, { status: 400 })
    }

    const dataId = paymentId || eventoId
    const assinaturaValida = validarAssinaturaWebhookMercadoPago({
      xSignatureHeader: xSignature,
      xRequestIdHeader: xRequestId,
      dataId,
    })

    if (!assinaturaValida) {
      console.warn(`[Webhook MercadoPago] Assinatura inválida para o evento ${eventoId}.`)
      return NextResponse.json({ ok: false, error: 'Assinatura de webhook inválida' }, { status: 401 })
    }

    const idempotencia = repositorioIdempotencia()
    const { podeProcessar, registro } = await idempotencia.reivindicar(eventoId, tipo, paymentId)

    if (!podeProcessar) {
      return NextResponse.json(
        { ok: true, status: 'already_processed', eventoId, statusOriginal: registro?.status },
        { status: 200 },
      )
    }

    if (paymentId) {
      // Depois da resposta. Uma exceção aqui não vira 500 para o gateway — ela
      // libera o evento para a próxima retentativa, que é o comportamento certo
      // quando a falha é de rede ou do gateway.
      agendarDepoisDaResposta(async () => {
        try {
          const r = await conciliarPagamento(paymentId)
          await idempotencia.concluir(eventoId, { paymentId, action, ...r })
          if (r.creditado) {
            console.info(`[Webhook MercadoPago] ${r.externalReference}: crédito aplicado.`)
          } else {
            console.info(`[Webhook MercadoPago] ${eventoId}: sem crédito — ${r.motivo}.`)
          }
        } catch (err) {
          console.error(`[Webhook MercadoPago] Falha ao conciliar ${paymentId}:`, err)
          await idempotencia.falhar(eventoId)
        }
      })
    } else {
      // Notificação que não é de pagamento (assinatura, contestação). Fica
      // registrada como vista, para não voltar, e nada mais acontece.
      await idempotencia.concluir(eventoId, { tipo, action })
    }

    return NextResponse.json({ ok: true, status: 'received', eventoId, paymentId }, { status: 200 })
  } catch (error) {
    console.error('[Webhook MercadoPago] Erro no processamento do webhook:', error)
    return NextResponse.json({ ok: false, error: 'Erro interno ao processar notificação' }, { status: 500 })
  }
}
