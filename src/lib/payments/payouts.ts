import 'server-only'

/**
 * Configuração e acesso à API de Payouts do Mercado Pago, lidos do ambiente (14/10/2026).
 *
 * LIGADO POR DECISÃO, NÃO POR ACIDENTE. O envio de Pix só existe quando `MP_PAYOUTS_ATIVO="true"` E há
 * credencial. Sem isso, `configuracaoDePayouts()` devolve a lista do que falta e o painel oferece só o
 * pagamento manual (o Pix feito por fora, com comprovante). NÃO há simulador: um "envio" que não move
 * dinheiro, em silêncio, faria o painel marcar como pago um saque que ninguém pagou.
 *
 *  - `MP_PAYOUTS_ATIVO`       "true" liga o botão de envio automático.
 *  - `MP_SANDBOX`             "false" = produção; qualquer outro valor = teste (padrão, como no depósito).
 *  - `MP_ACCESS_TOKEN[_TEST]` o mesmo token do resto da integração (o de produção, ou o de teste).
 *  - `MP_PAYOUT_PRIVATE_KEY`  PEM Ed25519; só produção. A chave PÚBLICA correspondente precisa ter sido
 *                             entregue ao time de Integrações do Mercado Pago (passo manual do Gabriel).
 *  - `NEXT_PUBLIC_APP_URL`    base do aviso de mudança de status (`/api/webhooks/mercadopago-payouts`).
 */

import { getMercadoPagoAccessToken, isMercadoPagoSandbox } from './mercadopago'
import {
  consultarPayoutNoMp,
  enviarPayoutPix,
  type ConfigPayouts,
  type EntradaDoPayout,
  type RespostaDeConsulta,
  type RespostaDeCriacao,
} from './payouts-core'

export interface SituacaoDosPayouts {
  ativo: boolean
  modo: 'sandbox' | 'producao'
  /** O que falta para ligar; vazio quando `ativo`. */
  faltando: string[]
  config: ConfigPayouts | null
}

export function configuracaoDePayouts(): SituacaoDosPayouts {
  const producao = !isMercadoPagoSandbox()
  const faltando: string[] = []
  if (process.env.MP_PAYOUTS_ATIVO !== 'true') faltando.push('MP_PAYOUTS_ATIVO="true"')
  const accessToken = getMercadoPagoAccessToken()
  if (!accessToken) faltando.push(producao ? 'MP_ACCESS_TOKEN' : 'MP_ACCESS_TOKEN_TEST')
  const chave = process.env.MP_PAYOUT_PRIVATE_KEY?.trim() || null
  if (producao && !chave) faltando.push('MP_PAYOUT_PRIVATE_KEY')

  const base = process.env.NEXT_PUBLIC_APP_URL
  const notificationUrl = base && /^https:\/\//.test(base) ? `${base.replace(/\/$/, '')}/api/webhooks/mercadopago-payouts` : null

  return {
    ativo: faltando.length === 0,
    modo: producao ? 'producao' : 'sandbox',
    faltando,
    config:
      faltando.length === 0 && accessToken
        ? { modo: producao ? 'producao' : 'sandbox', accessToken, chavePrivadaPem: chave, notificationUrl }
        : null,
  }
}

export async function criarPayoutPix(entrada: EntradaDoPayout): Promise<RespostaDeCriacao> {
  const { config, faltando } = configuracaoDePayouts()
  if (!config) return { ok: false, definitivo: true, erro: `Envio automático desligado. Falta: ${faltando.join(', ')}.` }
  return enviarPayoutPix(config, entrada)
}

export async function consultarPayout(payoutId: string): Promise<RespostaDeConsulta> {
  const { config, faltando } = configuracaoDePayouts()
  if (!config) return { ok: false, erro: `Envio automático desligado. Falta: ${faltando.join(', ')}.` }
  return consultarPayoutNoMp(config, payoutId)
}
