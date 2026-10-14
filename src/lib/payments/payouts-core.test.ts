/**
 * A API de Payouts do Mercado Pago, sem chamar o Mercado Pago (14/10/2026): o corpo, os cabeçalhos, a
 * assinatura Ed25519 e a leitura das respostas, conferidos contra a documentação oficial.
 */

import { generateKeyPairSync, verify } from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'

import {
  assinarCorpo,
  consultarPayoutNoMp,
  enviarPayoutPix,
  montarCorpoDoPayoutPix,
  type ConfigPayouts,
  type EntradaDoPayout,
} from './payouts-core'

const { publicKey, privateKey } = generateKeyPairSync('ed25519')
const PEM = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString()

const ENTRADA: EntradaDoPayout = {
  referencia: 'SAQ-1791979630674-XLIP4J',
  valorCents: 19_100,
  chave: { tipo: 'CPF', valor: '104.199.776-00' },
  descricao: 'Saque Real Olimpico SAQ-1791979630674-XLIP4J',
}

const SANDBOX: ConfigPayouts = { modo: 'sandbox', accessToken: 'TEST-token', chavePrivadaPem: null, notificationUrl: null }
const PRODUCAO: ConfigPayouts = { modo: 'producao', accessToken: 'APP-token', chavePrivadaPem: PEM, notificationUrl: 'https://exemplo.com/api/webhooks/mercadopago-payouts' }

function resposta(status: number, corpo: unknown): Response {
  return new Response(JSON.stringify(corpo), { status, headers: { 'Content-Type': 'application/json' } })
}

describe('o corpo do payout', () => {
  it('segue o formato da documentação: Pix para a chave, valor em reais, referência nos dois níveis', () => {
    const corpo = JSON.parse(montarCorpoDoPayoutPix(ENTRADA, 'https://exemplo.com/aviso'))
    expect(corpo.external_reference).toBe(ENTRADA.referencia)
    expect(corpo.config).toEqual({ notification_url: 'https://exemplo.com/aviso' })
    expect(corpo.transactions).toHaveLength(1)
    expect(corpo.transactions[0]).toMatchObject({
      type: 'pix',
      pix: { type: 'CPF', chave: '104.199.776-00' },
      amount: { currency: 'BRL', value: 191 },
      external_reference: ENTRADA.referencia,
    })
  })

  it('sem URL de aviso, não manda `config`', () => {
    expect(JSON.parse(montarCorpoDoPayoutPix(ENTRADA, null)).config).toBeUndefined()
  })
})

describe('a assinatura', () => {
  it('é Ed25519 dos bytes exatos do corpo, em base64, e confere com a chave pública', () => {
    const corpo = montarCorpoDoPayoutPix(ENTRADA, null)
    const assinatura = assinarCorpo(corpo, PEM)
    expect(verify(null, Buffer.from(corpo, 'utf8'), publicKey, Buffer.from(assinatura, 'base64'))).toBe(true)
    // um byte a mais no corpo e a assinatura deixa de valer
    expect(verify(null, Buffer.from(`${corpo} `, 'utf8'), publicKey, Buffer.from(assinatura, 'base64'))).toBe(false)
  })

  it('aceita a chave com "\\n" literal, como ela chega numa variável de ambiente', () => {
    const corpo = '{"a":1}'
    const assinatura = assinarCorpo(corpo, PEM.replace(/\n/g, '\\n'))
    expect(verify(null, Buffer.from(corpo), publicKey, Buffer.from(assinatura, 'base64'))).toBe(true)
  })
})

describe('enviar o Pix', () => {
  it('sandbox: cabeçalhos de teste e NENHUMA assinatura', async () => {
    const fetcher = vi.fn().mockResolvedValue(resposta(202, { id: 'POP1', transactions: [{ id: 'TOP1' }] }))
    const r = await enviarPayoutPix(SANDBOX, ENTRADA, fetcher)

    expect(r).toEqual({ ok: true, payoutId: 'POP1', transacaoId: 'TOP1' })
    const [url, init] = fetcher.mock.calls[0]!
    expect(url).toBe('https://api.mercadopago.com/v1/payouts')
    expect(init.method).toBe('POST')
    expect(init.headers).toMatchObject({
      Authorization: 'Bearer TEST-token',
      'X-Idempotency-Key': ENTRADA.referencia,
      'X-test-token': 'true',
      'X-enforce-signature': 'false',
    })
    expect(init.headers['X-signature']).toBeUndefined()
  })

  it('produção: assina o MESMO corpo que envia e não manda o cabeçalho de teste', async () => {
    const fetcher = vi.fn().mockResolvedValue(resposta(202, { id: 'POP1', transactions: [] }))
    await enviarPayoutPix(PRODUCAO, ENTRADA, fetcher)

    const init = fetcher.mock.calls[0]![1]
    expect(init.headers['X-enforce-signature']).toBe('true')
    expect(init.headers['X-test-token']).toBeUndefined()
    expect(verify(null, Buffer.from(init.body, 'utf8'), publicKey, Buffer.from(init.headers['X-signature'], 'base64'))).toBe(true)
  })

  it('produção sem chave privada nem chama a rede', async () => {
    const fetcher = vi.fn()
    const r = await enviarPayoutPix({ ...PRODUCAO, chavePrivadaPem: null }, ENTRADA, fetcher)
    expect(r.ok).toBe(false)
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('chave privada inválida também não chama a rede', async () => {
    const fetcher = vi.fn()
    const r = await enviarPayoutPix({ ...PRODUCAO, chavePrivadaPem: 'isto não é uma chave' }, ENTRADA, fetcher)
    expect(r).toMatchObject({ ok: false, definitivo: true })
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('4xx é recusa DEFINITIVA (nada saiu); 5xx, 408, 429 e falha de rede são INCERTAS', async () => {
    const com = async (status: number) => enviarPayoutPix(SANDBOX, ENTRADA, vi.fn().mockResolvedValue(resposta(status, { message: 'x' })))
    expect(await com(400)).toMatchObject({ ok: false, definitivo: true })
    expect(await com(403)).toMatchObject({ ok: false, definitivo: true })
    expect(await com(500)).toMatchObject({ ok: false, definitivo: false })
    expect(await com(408)).toMatchObject({ ok: false, definitivo: false })
    expect(await com(429)).toMatchObject({ ok: false, definitivo: false })
    const rede = await enviarPayoutPix(SANDBOX, ENTRADA, vi.fn().mockRejectedValue(new Error('ECONNRESET')))
    expect(rede).toMatchObject({ ok: false, definitivo: false })
  })

  it('aceitou mas sem id de payout: incerto — não dá para acompanhar o que não se identifica', async () => {
    const r = await enviarPayoutPix(SANDBOX, ENTRADA, vi.fn().mockResolvedValue(resposta(202, {})))
    expect(r).toMatchObject({ ok: false, definitivo: false })
  })
})

describe('consultar a transação', () => {
  it('lê o status da TRANSAÇÃO, não o do payout', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      resposta(200, { results: [{ id: 'TOP1', status: 'success', status_detail: 'accredited' }] }),
    )
    const r = await consultarPayoutNoMp(SANDBOX, 'POP1', fetcher)
    expect(r).toEqual({ ok: true, resultado: { payoutId: 'POP1', transacaoId: 'TOP1', statusTransacao: 'success', statusDetalhe: 'accredited' } })
    expect(fetcher.mock.calls[0]![0]).toBe('https://api.mercadopago.com/v1/payouts/POP1/transactions?limit=10&offset=0')
    expect(fetcher.mock.calls[0]![1].method).toBe('GET')
  })

  it('aceita a lista em vários formatos e, sem transação, devolve status nulo (= ainda não sei)', async () => {
    const a = await consultarPayoutNoMp(SANDBOX, 'POP1', vi.fn().mockResolvedValue(resposta(200, [{ id: 'T', status: 'pending' }])))
    expect(a).toMatchObject({ ok: true, resultado: { statusTransacao: 'pending' } })
    const b = await consultarPayoutNoMp(SANDBOX, 'POP1', vi.fn().mockResolvedValue(resposta(200, { transactions: [] })))
    expect(b).toMatchObject({ ok: true, resultado: { statusTransacao: null, transacaoId: null } })
  })

  it('HTTP de erro e falha de rede viram erro, nunca "pago"', async () => {
    expect(await consultarPayoutNoMp(SANDBOX, 'POP1', vi.fn().mockResolvedValue(resposta(404, { message: 'não achei' })))).toMatchObject({ ok: false })
    expect(await consultarPayoutNoMp(SANDBOX, 'POP1', vi.fn().mockRejectedValue(new Error('timeout')))).toMatchObject({ ok: false })
  })
})
