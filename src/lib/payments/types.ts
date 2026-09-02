/**
 * Contrato de tipos do módulo de pagamentos (Mercado Pago).
 *
 * CONVENÇÕES INEGOCIÁVEIS:
 *  - Dinheiro é SEMPRE inteiro em centavos (`Cents`). R$ 100,00 === 10000.
 *  - NENHUM dado de cartão trafega por este módulo (apenas checkout hospedado/token).
 *  - Chaves de idempotência são obrigatórias para evitar crédito duplicado (RA-07).
 */

import type { Cents, Timestamp, UserEmail } from '@/domain/types'

/** Métodos de pagamento aceitos na criação de cobranças. */
export type MetodoPagamento = 'pix' | 'credit_card' | 'ticket'

/** Situação da cobrança/transação no gateway. */
export type StatusPagamentoGateway =
  | 'pending'
  | 'approved'
  | 'authorized'
  | 'in_process'
  | 'in_mediation'
  | 'rejected'
  | 'cancelled'
  | 'refunded'
  | 'charged_back'

/** Dados de entrada para solicitar uma preferência de depósito (Checkout Pro). */
export interface CriarPreferenciaDepositoInput {
  userEmail: UserEmail
  valorCents: Cents
  externalReference: string
  descricao?: string
  backUrls?: {
    success: string
    pending: string
    failure: string
  }
}

/** Resposta da criação de preferência de depósito. */
export interface PreferenciaDepositoResult {
  id: string
  initPoint: string
  sandboxInitPoint: string
  externalReference: string
  valorCents: Cents
  createdAt: Timestamp
}

/** Dados de entrada para gerar cobrança Pix direta. */
export interface CriarPixDepositoInput {
  userEmail: UserEmail
  valorCents: Cents
  externalReference: string
  descricao?: string
}

/** Dados do Pix gerado (QR Code e Copia e Cola). */
export interface PixDepositoResult {
  paymentId: string
  status: StatusPagamentoGateway
  qrCode: string
  qrCodeBase64?: string
  ticketUrl?: string
  valorCents: Cents
  externalReference: string
  expirationDate?: string
  createdAt: Timestamp
}

/** Consulta de dados de um pagamento concluído ou pendente no gateway. */
export interface DetalhesPagamento {
  id: string
  status: StatusPagamentoGateway
  statusDetail?: string
  valorCents: Cents
  externalReference: string
  paymentMethodId: string
  paymentTypeId: string
  dateApproved: Timestamp | null
  dateCreated: Timestamp
  payerEmail: string
  raw?: unknown
}

/** Payload de notificação de webhook do Mercado Pago (v1 e v2). */
export interface MercadoPagoWebhookPayload {
  id?: number | string
  live_mode?: boolean
  type?: string
  date_created?: string
  user_id?: number | string
  api_version?: string
  action?: string
  data?: {
    id?: string
  }
  /** Suporte para notificações legado v1 do MP */
  topic?: string
  resource?: string
}

/** Registro de idempotência gravado para evitar processamento duplicado (RA-07). */
export interface RegistroIdempotencia {
  id: string
  eventoId: string
  gateway: 'mercadopago'
  tipo: string
  processadoEm: Timestamp
  status: 'processado' | 'em_processamento' | 'falha'
  resultado?: unknown
}
