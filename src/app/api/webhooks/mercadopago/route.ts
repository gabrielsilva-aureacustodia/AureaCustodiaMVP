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
 * FLUXO DE SEGURANÇA E IDEMPOTÊNCIA (RA-01, RA-07):
 *  1. Recebe notificação HTTP POST do Mercado Pago.
 *  2. Valida a assinatura criptográfica (`x-signature` + `x-request-id`).
 *  3. Confere a chave de idempotência: se o evento já foi recebido/processado,
 *     retorna HTTP 200 imediatamente descartando o processamento duplicado.
 *  4. Registra o evento e retorna HTTP 200 imediato ao gateway.
 *  5. Executa a conciliação assíncrona da transação com o saldo da conta.
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
    const dataId = paymentId || eventoId

    // 1. Validação Criptográfica de Assinatura
    const assinaturaValida = validarAssinaturaWebhookMercadoPago({
      xSignatureHeader: xSignature,
      xRequestIdHeader: xRequestId,
      dataId,
    })

    if (!assinaturaValida && process.env.NODE_ENV === 'production') {
      console.warn(`[Webhook MercadoPago] Assinatura inválida para evento: ${eventoId}`)
      return NextResponse.json(
        { ok: false, error: 'Assinatura de webhook inválida' },
        { status: 401 },
      )
    }

    // 2. Controle de Idempotência (RA-07)
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

    // 3. Processamento do Pagamento
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
        // Mantém como concluído para evitar laço de webhook se for erro de payload
        await concluirEvento(eventoId, { paymentId, status: 'error' })
      }
    } else {
      await concluirEvento(eventoId, { tipo, action })
    }

    // 4. Resposta 200 Imediata ao Gateway
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
