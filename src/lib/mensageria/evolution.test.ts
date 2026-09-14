/**
 * O adaptador da Evolution API sem rede: o `fetch` é um dublê, e os corpos de webhook são os
 * formatos conferidos no código-fonte da Evolution (ver o topo de evolution.ts).
 */

import { createHmac } from 'node:crypto'

import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { criarProvedorEvolution } from './evolution'
import { provedorDoAmbiente } from './index'
import { ErroDoProvedor } from './tipos'

const SEGREDO = 'segredo-do-webhook-com-32-caracteres!!'
const AGORA = 1_757_800_000_000
const CONFIG = { url: 'https://evolution.exemplo.com.br/', chave: 'chave-api', instancia: 'aurea cs', segredoDoWebhook: SEGREDO }

function jwt(carga: Record<string, unknown>, segredo = SEGREDO): string {
  const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url')
  const cabecalho = b64({ alg: 'HS256', typ: 'JWT' })
  const corpo = b64(carga)
  const assinatura = createHmac('sha256', segredo).update(`${cabecalho}.${corpo}`).digest('base64url')
  return `${cabecalho}.${corpo}.${assinatura}`
}

function resposta(status: number, corpo: unknown): Response {
  return new Response(typeof corpo === 'string' ? corpo : JSON.stringify(corpo), { status })
}

describe('envio', () => {
  it('manda texto para /message/sendText com apikey e só dígitos, e devolve key.id', async () => {
    const buscar = vi.fn().mockResolvedValue(resposta(201, { key: { id: 'BAE5ABC', fromMe: true } }))
    const p = criarProvedorEvolution(CONFIG, { buscar })
    await expect(p.enviarTexto('+5511999998888', 'Olá!')).resolves.toEqual({ idNoProvedor: 'BAE5ABC' })
    const [url, init] = buscar.mock.calls[0]
    expect(url).toBe('https://evolution.exemplo.com.br/message/sendText/aurea%20cs')
    expect(init.headers).toMatchObject({ apikey: 'chave-api' })
    expect(JSON.parse(init.body)).toEqual({ number: '5511999998888', text: 'Olá!' })
  })

  it('mídia vai por endereço, com o nome do arquivo tirado da URL', async () => {
    const buscar = vi.fn().mockResolvedValue(resposta(201, { key: { id: 'M1' } }))
    const p = criarProvedorEvolution(CONFIG, { buscar })
    await p.enviarMidia('+5511999998888', 'https://aureacustodia.com.br/docs/Tabela%20de%20Taxas.pdf', 'document', 'Nossas taxas')
    expect(JSON.parse(buscar.mock.calls[0][1].body)).toEqual({
      number: '5511999998888',
      mediatype: 'document',
      media: 'https://aureacustodia.com.br/docs/Tabela%20de%20Taxas.pdf',
      fileName: 'Tabela de Taxas.pdf',
      caption: 'Nossas taxas',
    })
  })

  it('recusa do provedor e rede fora viram ErroDoProvedor com a causa', async () => {
    const recusa = criarProvedorEvolution(CONFIG, { buscar: vi.fn().mockResolvedValue(resposta(401, 'Unauthorized')) })
    await expect(recusa.enviarTexto('+5511999998888', 'x')).rejects.toThrow(/HTTP 401/)
    const semRede = criarProvedorEvolution(CONFIG, { buscar: vi.fn().mockRejectedValue(new Error('ECONNREFUSED')) })
    await expect(semRede.enviarTexto('+5511999998888', 'x')).rejects.toBeInstanceOf(ErroDoProvedor)
  })
})

describe('assinatura do webhook', () => {
  const p = criarProvedorEvolution(CONFIG, { agora: () => AGORA })
  const com = (valor: string) => new Headers({ authorization: valor })

  it('aceita o JWT que a Evolution gera com jwt_key, dentro da validade', () => {
    const exp = Math.floor(AGORA / 1000) + 600
    expect(p.conferirAssinatura(com(`Bearer ${jwt({ iat: exp - 600, exp, app: 'evolution', action: 'webhook' })}`), '{}')).toBe(true)
    expect(p.conferirAssinatura(com(`Bearer ${jwt({ exp: Math.floor(AGORA / 1000) - 120 })}`), '{}')).toBe(false)
    expect(p.conferirAssinatura(com(`Bearer ${jwt({ exp: Math.floor(AGORA / 1000) + 600 }, 'outro-segredo-qualquer-de-32-chars')}`), '{}')).toBe(false)
  })

  it('aceita o segredo como Bearer; recusa sem cabeçalho e sem segredo configurado', () => {
    expect(p.conferirAssinatura(com(`Bearer ${SEGREDO}`), '{}')).toBe(true)
    expect(p.conferirAssinatura(new Headers(), '{}')).toBe(false)
    const semSegredo = criarProvedorEvolution({ ...CONFIG, segredoDoWebhook: null })
    expect(semSegredo.conferirAssinatura(com(`Bearer ${SEGREDO}`), '{}')).toBe(false)
    expect(semSegredo.pendencias).toEqual(['WHATSAPP_WEBHOOK_SECRET'])
    expect(criarProvedorEvolution({ ...CONFIG, segredoDoWebhook: 'curto' }).conferirAssinatura(com('Bearer curto'), '{}')).toBe(false)
  })
})

describe('normalizarEvento', () => {
  const p = criarProvedorEvolution(CONFIG, { agora: () => AGORA })

  it('messages.upsert de uma pessoa vira mensagem de entrada com telefone canônico', () => {
    const eventos = p.normalizarEvento({
      event: 'messages.upsert',
      instance: 'aurea cs',
      data: {
        key: { remoteJid: '551199998888@s.whatsapp.net', fromMe: false, id: '3EB0C7B4' },
        pushName: 'Ana Lima',
        message: { conversation: 'Quero retirar minha moeda' },
        messageTimestamp: 1_757_799_000,
      },
    })
    expect(eventos).toEqual([
      {
        tipo: 'mensagem',
        idNoProvedor: '3EB0C7B4',
        direcao: 'entrada',
        telefone: '+5511999998888',
        nomeDoContato: 'Ana Lima',
        corpo: 'Quero retirar minha moeda',
        midiaUrl: null,
        midiaTipo: null,
        em: 1_757_799_000_000,
      },
    ])
  })

  it('o nome do evento em maiúsculas vale igual; saída do aparelho não carrega o nome do atendimento', () => {
    const [e] = p.normalizarEvento({
      event: 'MESSAGES_UPSERT',
      data: { key: { remoteJid: '5511999998888@s.whatsapp.net', fromMe: true, id: 'X1' }, pushName: 'Áurea CS', message: { extendedTextMessage: { text: 'Respondido pelo celular' } } },
    })
    expect(e).toMatchObject({ direcao: 'saida', nomeDoContato: null, corpo: 'Respondido pelo celular', em: AGORA })
  })

  it('imagem com legenda, grupo, reação e mensagem sem id', () => {
    const [imagem] = p.normalizarEvento({
      event: 'messages.upsert',
      data: { key: { remoteJid: '5511999998888@s.whatsapp.net', id: 'IMG' }, message: { imageMessage: { caption: 'Foto do recibo', mimetype: 'image/jpeg' } } },
    })
    expect(imagem).toMatchObject({ corpo: 'Foto do recibo', midiaTipo: 'image', midiaUrl: null })

    expect(p.normalizarEvento({ event: 'messages.upsert', data: { key: { remoteJid: '1203630@g.us', id: 'G' }, message: { conversation: 'grupo' } } })).toEqual([])
    expect(p.normalizarEvento({ event: 'messages.upsert', data: { key: { remoteJid: '5511999998888@s.whatsapp.net', id: 'R' }, message: { reactionMessage: { text: '👍' } } } })).toEqual([])
    expect(p.normalizarEvento({ event: 'messages.upsert', data: { key: { remoteJid: '5511999998888@s.whatsapp.net' }, message: { conversation: 'sem id' } } })).toEqual([])
    expect(p.normalizarEvento({ event: 'connection.update', data: { state: 'open' } })).toEqual([])
  })

  it('messages.update traduz o estado de entrega', () => {
    expect(
      p.normalizarEvento({
        event: 'messages.update',
        data: [
          { keyId: 'A', remoteJid: '5511999998888@s.whatsapp.net', fromMe: true, status: 'DELIVERY_ACK' },
          { keyId: 'B', status: 'READ' },
          { keyId: 'C', status: 3 },
          { keyId: 'D', status: 'DESCONHECIDO' },
        ],
      }),
    ).toEqual([
      { tipo: 'status', idNoProvedor: 'A', status: 'entregue' },
      { tipo: 'status', idNoProvedor: 'B', status: 'lida' },
      { tipo: 'status', idNoProvedor: 'C', status: 'entregue' },
    ])
  })
})

describe('provedorDoAmbiente', () => {
  it('com as três variáveis, a Evolution; sem, o registro local dizendo o que falta', async () => {
    const evolution = provedorDoAmbiente({ EVOLUTION_API_URL: 'https://e.exemplo.com', EVOLUTION_API_KEY: 'k', EVOLUTION_INSTANCE: 'cs', WHATSAPP_WEBHOOK_SECRET: SEGREDO })
    expect(evolution).toMatchObject({ nome: 'evolution', identificador: 'cs', entregaDeVerdade: true, pendencias: [] })

    const local = provedorDoAmbiente({ EVOLUTION_API_URL: 'https://e.exemplo.com' })
    expect(local).toMatchObject({ nome: 'registro-local', entregaDeVerdade: false })
    expect(local.pendencias).toEqual(['EVOLUTION_API_KEY', 'EVOLUTION_INSTANCE', 'WHATSAPP_WEBHOOK_SECRET'])
    const { idNoProvedor } = await local.enviarTexto('+5511999998888', 'x')
    expect(idNoProvedor).toMatch(/^local:[0-9a-f-]{36}$/)
    expect(local.conferirAssinatura(new Headers({ authorization: `Bearer ${SEGREDO}` }), '{}')).toBe(false)
  })
})
