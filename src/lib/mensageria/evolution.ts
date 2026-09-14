/* ============================================================================
 * ATENÇÃO — MÓDULO EXCLUSIVO DE SERVIDOR.
 *
 * Recebe a chave da Evolution API e o segredo do webhook. Não importe de Client
 * Component: a chave dá controle total do WhatsApp do atendimento.
 * ==========================================================================*/

import 'server-only'

import { createHmac, timingSafeEqual } from 'node:crypto'

import { telefoneDoJid, digitosParaEnvio } from '@/domain/admin/telefone'

import { ErroDoProvedor, type EstadoConexao, type EventoMensageria, type ProvedorMensageria, type StatusDeEntrega } from './tipos'

/**
 * O provedor de QR code: Evolution API v2, auto-hospedada (plano do Admin, seções 2.3 e 10).
 *
 * CONFERIDO NO CÓDIGO-FONTE DA EVOLUTION, 14/09/2026 (github.com/EvolutionAPI/evolution-api):
 *  - envio: `POST {url}/message/sendText/{instancia}` com `{ number, text }` e
 *    `POST {url}/message/sendMedia/{instancia}` com `{ number, mediatype, media, caption,
 *    fileName }`; autenticação pelo cabeçalho `apikey`. A resposta traz `key.id`, que é o
 *    `id_no_provedor` da mensagem;
 *  - webhook: corpo `{ event, instance, data, … }`. `messages.upsert` traz `data.key`
 *    (`remoteJid`, `fromMe`, `id`), `pushName`, `message` e `messageTimestamp` em segundos;
 *    `messages.update` traz `keyId` e `status` ('ERROR', 'PENDING', 'SERVER_ACK',
 *    'DELIVERY_ACK', 'READ', 'PLAYED');
 *  - autenticação do webhook: a Evolution não assina o corpo. Ela envia os cabeçalhos
 *    configurados em `webhook.headers` — e, quando um deles se chama `jwt_key`, troca-o por
 *    `Authorization: Bearer <JWT HS256>` assinado com aquele valor e válido por 10 minutos.
 *    `conferirAssinatura` aceita as duas formas: o JWT assinado com WHATSAPP_WEBHOOK_SECRET
 *    ou o próprio segredo como Bearer.
 *
 * O PREÇO DO QR CODE está no RA-42: é uma integração não oficial com o WhatsApp, e o número
 * pode ser banido se o volume disparar. A API oficial da Meta entra como outro adaptador.
 */

export interface ConfigEvolution {
  /** EVOLUTION_API_URL — a raiz do servidor, sem barra no fim. */
  url: string
  /** EVOLUTION_API_KEY */
  chave: string
  /** EVOLUTION_INSTANCE */
  instancia: string
  /** WHATSAPP_WEBHOOK_SECRET — `null` recusa todo webhook. */
  segredoDoWebhook: string | null
}

export interface DependenciasEvolution {
  buscar?: typeof fetch
  agora?: () => number
}

/** Mesmo mínimo da chave de integração dos relatórios: segredo curto demais não protege. */
const SEGREDO_MIN = 16
const TEMPO_LIMITE_MS = 15_000

/* ---------- webhook: autenticação ---------- */

function iguais(a: string, b: string): boolean {
  const x = Buffer.from(a, 'utf8')
  const y = Buffer.from(b, 'utf8')
  return x.length === y.length && timingSafeEqual(x, y)
}

/**
 * JWT HS256 assinado com o segredo e dentro da validade. Implementado aqui, sem biblioteca:
 * são três pedaços em base64url e um HMAC — uma dependência nova para isso seria maior do
 * que a conferência.
 */
function jwtValido(credencial: string, segredo: string, agora: number): boolean {
  const partes = credencial.split('.')
  if (partes.length !== 3) return false
  const [cabecalho, carga, assinatura] = partes
  try {
    const h = JSON.parse(Buffer.from(cabecalho, 'base64url').toString('utf8')) as { alg?: unknown }
    if (h.alg !== 'HS256') return false
    const esperada = createHmac('sha256', segredo).update(`${cabecalho}.${carga}`).digest('base64url')
    if (!iguais(assinatura, esperada)) return false
    const c = JSON.parse(Buffer.from(carga, 'base64url').toString('utf8')) as { exp?: unknown }
    // Um minuto de folga para relógio de servidor desencontrado.
    return typeof c.exp === 'number' && c.exp * 1000 > agora - 60_000
  } catch {
    return false
  }
}

/* ---------- webhook: tradução ---------- */

type Obj = Record<string, unknown>

function obj(v: unknown): Obj | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Obj) : null
}

function str(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 ? v : null
}

const STATUS: Record<string, StatusDeEntrega> = {
  ERROR: 'falhou',
  PENDING: 'enviando',
  SERVER_ACK: 'enviada',
  DELIVERY_ACK: 'entregue',
  READ: 'lida',
  PLAYED: 'lida',
}
/** O Baileys às vezes manda o número do enum em vez do nome. */
const STATUS_NUMERICO: readonly (StatusDeEntrega | undefined)[] = ['falhou', 'enviando', 'enviada', 'entregue', 'lida', 'lida']

function statusDaEvolution(v: unknown): StatusDeEntrega | null {
  if (typeof v === 'number') return STATUS_NUMERICO[v] ?? null
  if (typeof v === 'string') return STATUS[v.toUpperCase()] ?? null
  return null
}

/** 'messages.upsert', 'MESSAGES_UPSERT' e 'messages-upsert' são o mesmo evento. */
function nomeDoEvento(v: unknown): string {
  return typeof v === 'string' ? v.toLowerCase().replace(/[_-]/g, '.') : ''
}

/** `messageTimestamp` chega como número, string ou o Long do protobuf ({ low, high }). */
function emMilissegundos(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v * 1000
  if (typeof v === 'string' && /^\d+$/.test(v)) return Number(v) * 1000
  const longo = obj(v)
  if (longo && typeof longo.low === 'number') return (longo.low >>> 0) * 1000
  return null
}

interface Conteudo {
  corpo: string
  midiaTipo: string | null
  midiaUrl: string | null
}

/** Mensagens "embrulhadas" (temporária, visualização única) guardam o conteúdo um nível abaixo. */
function desembrulhar(m: Obj): Obj {
  for (const chave of ['ephemeralMessage', 'viewOnceMessage', 'viewOnceMessageV2', 'documentWithCaptionMessage']) {
    const interna = obj(obj(m[chave])?.message)
    if (interna) return desembrulhar(interna)
  }
  return m
}

/**
 * O que a mensagem diz. `null` para o que não é conversa: reação, edição, apagamento e
 * voto de enquete não viram linha na thread.
 *
 * MÍDIA: a URL que o WhatsApp manda é cifrada e não abre fora do aparelho. Só existe
 * endereço usável quando a Evolution está com armazenamento (S3/MinIO) ligado — ela põe
 * `mediaUrl` na mensagem. Sem isso, a thread mostra o tipo e a legenda.
 */
function conteudoDe(mensagem: unknown, dados: Obj): Conteudo | null {
  const bruta = obj(mensagem)
  if (!bruta) return null
  const m = desembrulhar(bruta)
  const mediaUrl = str(m.mediaUrl) ?? str(dados.mediaUrl)
  const conversa = str(m.conversation)
  if (conversa) return { corpo: conversa, midiaTipo: null, midiaUrl: null }
  const estendida = str(obj(m.extendedTextMessage)?.text)
  if (estendida) return { corpo: estendida, midiaTipo: null, midiaUrl: null }

  const midias: Array<[string, string]> = [
    ['imageMessage', 'image'],
    ['videoMessage', 'video'],
    ['audioMessage', 'audio'],
    ['documentMessage', 'document'],
    ['stickerMessage', 'sticker'],
  ]
  for (const [chave, tipo] of midias) {
    const x = obj(m[chave])
    if (x) return { corpo: str(x.caption) ?? str(x.fileName) ?? '', midiaTipo: tipo, midiaUrl: mediaUrl }
  }

  const local = obj(m.locationMessage)
  if (local) return { corpo: `Localização: ${String(local.degreesLatitude ?? '?')}, ${String(local.degreesLongitude ?? '?')}`, midiaTipo: null, midiaUrl: null }
  const contato = obj(m.contactMessage)
  if (contato) return { corpo: `Contato compartilhado: ${str(contato.displayName) ?? 'sem nome'}`, midiaTipo: null, midiaUrl: null }

  const ignorar = ['reactionMessage', 'protocolMessage', 'pollUpdateMessage', 'editedMessage', 'senderKeyDistributionMessage', 'messageContextInfo']
  const tipos = Object.keys(m).filter((k) => !ignorar.includes(k))
  if (!tipos.length) return null
  return { corpo: `[mensagem do tipo ${tipos[0]} — abra no aparelho]`, midiaTipo: null, midiaUrl: null }
}

function mensagemDe(dados: unknown, agora: number): EventoMensageria | null {
  const d = obj(dados)
  const chave = obj(d?.key)
  const id = str(chave?.id)
  if (!d || !chave || !id) return null
  // Conta nova do WhatsApp pode vir com identificador '@lid', que não é telefone; a
  // Evolution acrescenta o número de verdade em `senderPn` ou `remoteJidAlt`.
  const jid = str(chave.remoteJid)
  const telefone = telefoneDoJid(jid?.endsWith('@lid') ? (str(chave.senderPn) ?? str(chave.remoteJidAlt) ?? str(d.senderPn)) : jid)
  if (!telefone) return null
  const conteudo = conteudoDe(d.message, d)
  if (!conteudo) return null
  const saida = chave.fromMe === true
  return {
    tipo: 'mensagem',
    idNoProvedor: id,
    direcao: saida ? 'saida' : 'entrada',
    telefone,
    // Na saída, `pushName` é o nome do próprio atendimento — não é o do contato.
    nomeDoContato: saida ? null : (str(d.pushName)?.slice(0, 120) ?? null),
    ...conteudo,
    em: emMilissegundos(d.messageTimestamp) ?? agora,
  }
}

function statusDe(dados: unknown): EventoMensageria | null {
  const d = obj(dados)
  if (!d) return null
  const id = str(d.keyId) ?? str(obj(d.key)?.id)
  const status = statusDaEvolution(d.status ?? obj(d.update)?.status)
  return id && status ? { tipo: 'status', idNoProvedor: id, status } : null
}

/* ---------- o provedor ---------- */

export function criarProvedorEvolution(config: ConfigEvolution, deps: DependenciasEvolution = {}): ProvedorMensageria {
  const buscar = deps.buscar ?? fetch
  const agora = deps.agora ?? Date.now
  const base = config.url.trim().replace(/\/+$/, '')
  const instancia = encodeURIComponent(config.instancia)
  const segredo = config.segredoDoWebhook && config.segredoDoWebhook.length >= SEGREDO_MIN ? config.segredoDoWebhook : null

  async function chamar(metodo: 'GET' | 'POST', caminho: string, corpo?: Obj): Promise<unknown> {
    let resposta: Response
    try {
      resposta = await buscar(`${base}${caminho}`, {
        method: metodo,
        headers: { 'Content-Type': 'application/json', apikey: config.chave },
        body: corpo ? JSON.stringify(corpo) : undefined,
        signal: AbortSignal.timeout(TEMPO_LIMITE_MS),
        cache: 'no-store',
      })
    } catch (err) {
      throw new ErroDoProvedor(`Sem resposta da Evolution API (${err instanceof Error ? err.message : 'erro de rede'}).`)
    }
    const texto = await resposta.text()
    if (!resposta.ok) {
      throw new ErroDoProvedor(`A Evolution API recusou o envio (HTTP ${resposta.status}): ${texto.slice(0, 200)}`, resposta.status)
    }
    try {
      return texto ? JSON.parse(texto) : {}
    } catch {
      throw new ErroDoProvedor('A Evolution API respondeu num formato inesperado.', resposta.status)
    }
  }

  function idDaResposta(r: unknown): { idNoProvedor: string } {
    const id = str(obj(obj(r)?.key)?.id)
    if (!id) throw new ErroDoProvedor('A Evolution API aceitou o envio, mas não devolveu o identificador da mensagem.')
    return { idNoProvedor: id }
  }

  return {
    nome: 'evolution',
    identificador: config.instancia,
    entregaDeVerdade: true,
    pendencias: segredo
      ? []
      : [config.segredoDoWebhook ? `WHATSAPP_WEBHOOK_SECRET (tem menos de ${SEGREDO_MIN} caracteres)` : 'WHATSAPP_WEBHOOK_SECRET'],

    async enviarTexto(para, texto) {
      return idDaResposta(await chamar('POST', `/message/sendText/${instancia}`, { number: digitosParaEnvio(para), text: texto }))
    },

    async enviarMidia(para, url, tipo, legenda) {
      // O nome do arquivo sai do endereço: é o que aparece no WhatsApp para documento.
      const nomeDoArquivo = decodeURIComponent(new URL(url).pathname.split('/').pop() || 'arquivo')
      return idDaResposta(
        await chamar('POST', `/message/sendMedia/${instancia}`, {
          number: digitosParaEnvio(para),
          mediatype: tipo,
          media: url,
          fileName: nomeDoArquivo,
          ...(legenda ? { caption: legenda } : {}),
        }),
      )
    },

    conferirAssinatura(cabecalhos) {
      if (!segredo) return false
      const credencial = (cabecalhos.get('authorization') ?? '').replace(/^Bearer\s+/i, '').trim()
      if (!credencial) return false
      return iguais(credencial, segredo) || jwtValido(credencial, segredo, agora())
    },

    normalizarEvento(corpo) {
      const c = obj(corpo)
      if (!c) return []
      const evento = nomeDoEvento(c.event)
      const lista = Array.isArray(c.data) ? c.data : [c.data]
      const quando = agora()
      if (evento === 'messages.upsert' || evento === 'send.message') {
        return lista.map((d) => mensagemDe(d, quando)).filter((e): e is EventoMensageria => e !== null)
      }
      if (evento === 'messages.update') {
        return lista.map(statusDe).filter((e): e is EventoMensageria => e !== null)
      }
      return []
    },

    async estadoDaConexao(): Promise<EstadoConexao> {
      try {
        const r = obj(await chamar('GET', `/instance/connectionState/${instancia}`))
        const estado = str(obj(r?.instance)?.state) ?? str(r?.state)
        if (estado === 'open') return { conectado: true, descricao: 'WhatsApp conectado.' }
        if (estado === 'connecting') return { conectado: false, descricao: 'Aguardando a leitura do QR code no gerenciador da Evolution.' }
        return { conectado: false, descricao: `WhatsApp desconectado (estado: ${estado ?? 'desconhecido'}).` }
      } catch (err) {
        return { conectado: false, descricao: err instanceof Error ? err.message : 'Sem resposta da Evolution API.' }
      }
    },
  }
}
