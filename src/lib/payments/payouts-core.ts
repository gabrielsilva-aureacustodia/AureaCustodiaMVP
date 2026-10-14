/**
 * Núcleo da API de Payouts do Mercado Pago (Pix para a chave do cliente) — 14/10/2026.
 *
 * SEM `server-only` DE PROPÓSITO, como `src/server/db/*`: recebe a configuração e o `fetch` prontos, e
 * por isso a suíte confere o corpo, os cabeçalhos, a assinatura e a leitura das respostas sem chamar o
 * Mercado Pago. Quem lê o ambiente e tem a credencial é `payouts.ts`.
 *
 * O QUE A DOCUMENTAÇÃO OFICIAL DIZ (developers → Payouts → Transferências, conferido em 14/10/2026):
 *  - `POST https://api.mercadopago.com/v1/payouts`, resposta 202 = aceito para processamento, NÃO
 *    "o dinheiro chegou" (o status de cada transação vem depois: `success` quando creditou);
 *  - `X-Idempotency-Key` obrigatório e único por requisição;
 *  - em produção, `X-signature` = Ed25519 do corpo EXATO enviado, em base64, com a chave privada cuja
 *    pública foi entregue ao time de Integrações do Mercado Pago; em teste, `X-test-token: true` e
 *    `X-enforce-signature: false`;
 *  - o webhook (`config.notification_url`) NÃO traz assinatura verificável — por isso nunca se confia nele:
 *    ele só serve de gatilho para consultar a transação (`GET /v1/payouts/{id}/transactions`).
 */

import { createPrivateKey, sign } from 'node:crypto'

import { valorEmReais, type ChaveParaMercadoPago, type ResultadoDoPayout } from '@/domain/saques'
import type { Cents } from '@/domain/types'

export const MP_API_BASE = 'https://api.mercadopago.com'

export interface ConfigPayouts {
  modo: 'sandbox' | 'producao'
  accessToken: string
  /** PEM da chave privada Ed25519. Obrigatória em produção. */
  chavePrivadaPem: string | null
  /** Onde o Mercado Pago avisa mudanças de status. Opcional: sem ela, a equipe confere pelo botão. */
  notificationUrl: string | null
}

export type Fetcher = (url: string, init: RequestInit) => Promise<Response>

/** Assina os bytes do corpo com Ed25519 e devolve o base64 do resultado. */
export function assinarCorpo(corpo: string, chavePrivadaPem: string): string {
  // A variável de ambiente costuma chegar com "\n" literal no lugar das quebras de linha.
  const chave = createPrivateKey(chavePrivadaPem.replace(/\\n/g, '\n'))
  return sign(null, Buffer.from(corpo, 'utf8'), chave).toString('base64')
}

export interface EntradaDoPayout {
  referencia: string
  valorCents: Cents
  chave: ChaveParaMercadoPago
  descricao: string
}

/** O corpo como string: é ESTA string que se assina e que se envia, byte a byte. */
export function montarCorpoDoPayoutPix(e: EntradaDoPayout, notificationUrl: string | null): string {
  return JSON.stringify({
    external_reference: e.referencia,
    ...(notificationUrl ? { config: { notification_url: notificationUrl } } : {}),
    description: e.descricao,
    transactions: [
      {
        description: e.descricao,
        type: 'pix',
        pix: { type: e.chave.tipo, chave: e.chave.valor },
        amount: { currency: 'BRL', value: valorEmReais(e.valorCents) },
        external_reference: e.referencia,
      },
    ],
  })
}

function cabecalhos(cfg: ConfigPayouts, extra: Record<string, string> = {}): Record<string, string> {
  return {
    Authorization: `Bearer ${cfg.accessToken}`,
    'Content-Type': 'application/json',
    ...(cfg.modo === 'sandbox' ? { 'X-test-token': 'true', 'X-enforce-signature': 'false' } : { 'X-enforce-signature': 'true' }),
    ...extra,
  }
}

export type RespostaDeCriacao =
  | { ok: true; payoutId: string; transacaoId: string | null }
  /**
   * `definitivo: true` = o Mercado Pago recusou o pedido (4xx): nada foi enviado e dá para corrigir e
   * tentar de novo. `definitivo: false` = não sabemos se chegou (rede, 5xx, tempo esgotado): o dinheiro
   * PODE ter saído, e ninguém reenvia sem conferir antes.
   */
  | { ok: false; definitivo: boolean; erro: string }

const TEMPO_LIMITE_MS = 20_000

function texto(v: unknown): string {
  return typeof v === 'string' ? v : ''
}

function resumoDoErro(corpo: string): string {
  try {
    const j = JSON.parse(corpo) as { message?: unknown; error?: unknown }
    const partes = [texto(j.message), texto(j.error)].filter(Boolean)
    if (partes.length) return partes.join(' — ').slice(0, 300)
  } catch {
    /* corpo não era JSON */
  }
  return corpo.slice(0, 300)
}

export async function enviarPayoutPix(
  cfg: ConfigPayouts,
  entrada: EntradaDoPayout,
  fetcher: Fetcher = fetch,
): Promise<RespostaDeCriacao> {
  if (cfg.modo === 'producao' && !cfg.chavePrivadaPem) {
    return { ok: false, definitivo: true, erro: 'Falta a chave privada de assinatura dos saques (MP_PAYOUT_PRIVATE_KEY).' }
  }

  const corpo = montarCorpoDoPayoutPix(entrada, cfg.notificationUrl)
  let assinatura: Record<string, string> = {}
  if (cfg.modo === 'producao') {
    try {
      assinatura = { 'X-signature': assinarCorpo(corpo, cfg.chavePrivadaPem as string) }
    } catch {
      return { ok: false, definitivo: true, erro: 'A chave privada de assinatura dos saques é inválida (esperado: PEM Ed25519).' }
    }
  }

  const controle = new AbortController()
  const timer = setTimeout(() => controle.abort(), TEMPO_LIMITE_MS)
  try {
    const res = await fetcher(MP_API_BASE + '/v1/payouts', {
      method: 'POST',
      headers: cabecalhos(cfg, { 'X-Idempotency-Key': entrada.referencia, ...assinatura }),
      body: corpo,
      signal: controle.signal,
    })
    const bruto = await res.text()
    if (res.ok) {
      const j = JSON.parse(bruto) as { id?: unknown; transactions?: Array<{ id?: unknown }> }
      const payoutId = texto(j.id)
      if (!payoutId) return { ok: false, definitivo: false, erro: 'O Mercado Pago aceitou o pedido mas não devolveu o id do payout.' }
      return { ok: true, payoutId, transacaoId: texto(j.transactions?.[0]?.id) || null }
    }
    // 408 e 429 são "tente depois", não recusa do pedido.
    const definitivo = res.status >= 400 && res.status < 500 && res.status !== 408 && res.status !== 429
    return { ok: false, definitivo, erro: `HTTP ${res.status}: ${resumoDoErro(bruto)}` }
  } catch (e) {
    return { ok: false, definitivo: false, erro: e instanceof Error ? e.message : 'falha de rede ao chamar o Mercado Pago' }
  } finally {
    clearTimeout(timer)
  }
}

export type RespostaDeConsulta = { ok: true; resultado: ResultadoDoPayout } | { ok: false; erro: string }

/** Lê a transação do payout. O status que vale é o da TRANSAÇÃO. */
export async function consultarPayoutNoMp(
  cfg: ConfigPayouts,
  payoutId: string,
  fetcher: Fetcher = fetch,
): Promise<RespostaDeConsulta> {
  const controle = new AbortController()
  const timer = setTimeout(() => controle.abort(), TEMPO_LIMITE_MS)
  try {
    const res = await fetcher(MP_API_BASE + '/v1/payouts/' + encodeURIComponent(payoutId) + '/transactions?limit=10&offset=0', {
      method: 'GET',
      headers: cabecalhos(cfg),
      signal: controle.signal,
    })
    const bruto = await res.text()
    if (!res.ok) return { ok: false, erro: `HTTP ${res.status}: ${resumoDoErro(bruto)}` }

    const j = JSON.parse(bruto) as unknown
    const objeto = (j ?? {}) as { results?: unknown; transactions?: unknown }
    const lista: unknown[] = Array.isArray(j)
      ? j
      : Array.isArray(objeto.results)
        ? objeto.results
        : Array.isArray(objeto.transactions)
          ? objeto.transactions
          : []
    const t = (lista[0] ?? null) as { id?: unknown; status?: unknown; status_detail?: unknown } | null
    return {
      ok: true,
      resultado: {
        payoutId,
        transacaoId: t ? texto(t.id) || null : null,
        statusTransacao: t ? texto(t.status) || null : null,
        statusDetalhe: t ? texto(t.status_detail) || null : null,
      },
    }
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : 'falha de rede ao consultar o Mercado Pago' }
  } finally {
    clearTimeout(timer)
  }
}
