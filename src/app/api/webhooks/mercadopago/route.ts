import { NextRequest, NextResponse } from 'next/server'
import {
  concluirEvento,
  consultarPagamentoMercadoPago,
  processarPayloadWebhook,
  tentarRegistrarEvento,
  validarAssinaturaWebhookMercadoPago,
} from '@/lib/payments'
import type { MercadoPagoWebhookPayload } from '@/lib/payments'

/**
 * Webhook Receptor do Mercado Pago.
 *
 * FLUXO DE SEGURANÇA E IDEMPOTÊNCIA (RA-01, RA-07, RA-14):
 *  1. Recebe notificação HTTP POST do Mercado Pago.
 *  2. Extrai identificador: se não possuir ID (payload vazio ou anômalo), devolve 400.
 *  3. Valida a assinatura criptográfica (`x-signature` + `x-request-id`) com HMAC-SHA256.
 *     Rejeita com 401 se for inválida em qualquer ambiente.
 *  4. Confere a chave de idempotência: se o evento já foi recebido/processado,
 *     retorna HTTP 200 imediatamente descartando o processamento duplicado.
 *  5. Registra o evento e retorna HTTP 200 imediato ao gateway.
 *  6. Executa a conciliação da transação.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const xSignature = req.headers.get('x-signature')
    const xRequestId = req.headers.get('x-request-id')

    // Suporta payload via JSON ou query string (padrão v1/v2 do Mercado Pago)
    let payload: MercadoPagoWebhookPayload = {}
    try {
      payload = (await req.json()) as MercadoPagoWebhookPayload
    } catch {
      const { searchParams } = new URL(req.url)
      payload = {
        id: searchParams.get('id') || searchParams.get('data.id') || undefined,
        type: searchParams.get('type') || searchParams.get('topic') || undefined,
        data: {
          id: searchParams.get('data.id') || searchParams.get('id') || undefined,
        },
      }
    }

    const { eventoId, paymentId, tipo, action } = processarPayloadWebhook(payload)

    // 1. Rejeita payloads sem identificador de evento (Item 2.3)
    if (!eventoId) {
      console.warn('[Webhook MercadoPago] Requisição de webhook sem identificador de evento.')
      return NextResponse.json(
        { ok: false, error: 'Identificador do evento ausente' },
        { status: 400 },
      )
    }

    const dataId = paymentId || eventoId

    // 2. Validação Criptográfica de Assinatura (Item 2.4)
    const assinaturaValida = validarAssinaturaWebhookMercadoPago({
      xSignatureHeader: xSignature,
      xRequestIdHeader: xRequestId,
      dataId,
    })

    if (!assinaturaValida) {
      console.warn(`[Webhook MercadoPago] Assinatura inválida para evento: ${eventoId}`)
      return NextResponse.json(
        { ok: false, error: 'Assinatura de webhook inválida' },
        { status: 401 },
      )
    }

    // 3. Controle de Idempotência (RA-07 / RA-14.a)
    const { podeProcessar, registro } = await tentarRegistrarEvento(eventoId, tipo)

    if (!podeProcessar) {
      // Evento repetido é aceito com 200 para liberar o gateway, mas NÃO reprocessa
      return NextResponse.json(
        {
          ok: true,
          status: 'already_processed',
          eventoId,
          statusOriginal: registro?.status,
        },
        { status: 200 },
      )
    }

    // 4. Processamento do Pagamento
    if (paymentId) {
      try {
        const detalhes = await consultarPagamentoMercadoPago(paymentId)
        // Registra a conclusão do evento para assegurar idempotência
        await concluirEvento(eventoId, {
          paymentId,
          status: detalhes.status,
          valorCents: detalhes.valorCents,
          externalReference: detalhes.externalReference,
          action,
        })
      } catch (err) {
        console.error(`[Webhook MercadoPago] Erro ao consultar transação ${paymentId}:`, err)
        await concluirEvento(eventoId, { paymentId, status: 'error' })
      }
    } else {
      await concluirEvento(eventoId, { tipo, action })
    }

    // 5. Resposta 200 Imediata ao Gateway
    return NextResponse.json(
      {
        ok: true,
        status: 'received',
        eventoId,
        paymentId,
      },
      { status: 200 },
    )
  } catch (error) {
    console.error('[Webhook MercadoPago] Erro no processamento do webhook:', error)
    return NextResponse.json(
      { ok: false, error: 'Erro interno ao processar notificação' },
      { status: 500 },
    )
  }
}
