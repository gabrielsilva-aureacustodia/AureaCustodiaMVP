/**
 * As regras do atendimento (CS) — o que o painel aceita e em que ordem as coisas
 * acontecem, sem I/O (frente C, C2; plano do Admin, seções 2.1 a 2.5).
 *
 * O PONTO MAIS DELICADO É A ORDEM DOS ESTADOS DE ENTREGA. O provedor manda "entregue" e
 * "lida" por webhook, e webhook chega fora de ordem e repetido. Sem uma regra de avanço,
 * um "entregue" atrasado rebaixaria uma mensagem já lida, e o atendente veria o cliente
 * "desler" a resposta. `statusAvanca` só deixa o estado andar para a frente.
 */

import type { ParametrosDaUrl } from './periodo'
import { primeiroValor } from './periodo'
import type { Validacao } from './contabil'

/* ---------- conversa ---------- */

export type StatusConversa = 'aberta' | 'pendente' | 'resolvida'

export const STATUS_CONVERSA: ReadonlyArray<{ chave: StatusConversa; rotulo: string }> = [
  { chave: 'aberta', rotulo: 'Aberta' },
  { chave: 'pendente', rotulo: 'Pendente' },
  { chave: 'resolvida', rotulo: 'Resolvida' },
]

export function ehStatusConversa(x: unknown): x is StatusConversa {
  return x === 'aberta' || x === 'pendente' || x === 'resolvida'
}

/* ---------- mensagem ---------- */

export type DirecaoMensagem = 'entrada' | 'saida'

/**
 * 'registrada' é a mensagem gravada sem provedor conectado (adaptador de registro local):
 * ela ficou no painel e não chegou ao cliente.
 */
export type StatusMensagem = 'enviando' | 'enviada' | 'entregue' | 'lida' | 'falhou' | 'registrada'

const ORDEM_DE_ENTREGA: Record<StatusMensagem, number> = {
  registrada: 0,
  falhou: 0,
  enviando: 1,
  enviada: 2,
  entregue: 3,
  lida: 4,
}

/**
 * O estado `novo`, vindo do provedor, pode substituir o `atual`?
 *  - só para a frente: enviando → enviada → entregue → lida;
 *  - 'falhou' só substitui quem ainda não chegou ao aparelho (enviando, enviada);
 *  - 'registrada' nunca muda: não existe provedor para mandar notícia dela.
 */
export function statusAvanca(atual: StatusMensagem, novo: StatusMensagem): boolean {
  if (atual === 'registrada' || novo === 'registrada') return false
  if (novo === 'falhou') return atual === 'enviando' || atual === 'enviada'
  if (atual === 'falhou') return false
  return ORDEM_DE_ENTREGA[novo] > ORDEM_DE_ENTREGA[atual]
}

export function descreverStatusMensagem(s: StatusMensagem): string {
  switch (s) {
    case 'enviando':
      return 'Enviando'
    case 'enviada':
      return 'Enviada'
    case 'entregue':
      return 'Entregue'
    case 'lida':
      return 'Lida'
    case 'falhou':
      return 'Falhou'
    case 'registrada':
      return 'Só no painel — sem WhatsApp conectado'
  }
}

/** O que o provedor aceita em `enviarMidia`, com o rótulo do seletor. */
export const TIPOS_DE_MIDIA = [
  { chave: 'image', rotulo: 'Imagem' },
  { chave: 'document', rotulo: 'Documento (PDF)' },
  { chave: 'video', rotulo: 'Vídeo' },
  { chave: 'audio', rotulo: 'Áudio' },
] as const

export type TipoDeMidia = (typeof TIPOS_DE_MIDIA)[number]['chave']

export function ehTipoDeMidia(x: unknown): x is TipoDeMidia {
  return TIPOS_DE_MIDIA.some((t) => t.chave === x)
}

/** O WhatsApp corta texto em 65 mil caracteres; o atendimento não precisa de tanto. */
export const TEXTO_MAX = 4_000

export function validarTexto(texto: unknown, oQue: string): Validacao<string> {
  const t = typeof texto === 'string' ? texto.trim() : ''
  if (!t) return { ok: false, erro: `Escreva ${oQue}.` }
  if (t.length > TEXTO_MAX) return { ok: false, erro: `${oQue[0].toUpperCase()}${oQue.slice(1)} passa de ${TEXTO_MAX.toLocaleString('pt-BR')} caracteres.` }
  return { ok: true, valor: t }
}

/**
 * A mídia vai por ENDEREÇO: o provedor baixa o arquivo de lá. Por isso só http(s) — um
 * `file:` ou `data:` não é baixável por ninguém, e um endereço sem protocolo daria erro
 * genérico lá na frente, longe do campo que o causou.
 */
export function validarUrlDeMidia(url: unknown): Validacao<string> {
  const u = typeof url === 'string' ? url.trim() : ''
  if (!u) return { ok: false, erro: 'Informe o endereço do arquivo.' }
  if (u.length > 2_000) return { ok: false, erro: 'Endereço do arquivo longo demais.' }
  try {
    const p = new URL(u)
    if (p.protocol !== 'https:' && p.protocol !== 'http:') return { ok: false, erro: 'O endereço do arquivo precisa começar com https://.' }
  } catch {
    return { ok: false, erro: 'Endereço do arquivo inválido.' }
  }
  return { ok: true, valor: u }
}

/* ---------- etiquetas ---------- */

export const CORES_ETIQUETA = ['ouro', 'verde', 'vermelho', 'cinza'] as const
export type CorEtiqueta = (typeof CORES_ETIQUETA)[number]

export function ehCorEtiqueta(x: unknown): x is CorEtiqueta {
  return (CORES_ETIQUETA as readonly unknown[]).includes(x)
}

/** 'Retirada — urgente' → 'retirada-urgente'. `null` se não sobra letra nem número. */
export function slugDeEtiqueta(rotulo: string): string | null {
  const slug = rotulo
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '')
  return slug.length >= 2 ? slug : null
}

/* ---------- filtro da caixa ---------- */

export interface FiltroConversas {
  /** `null` = todas. */
  status: StatusConversa | null
  /** E-mail do responsável; 'ninguem' = sem responsável; `null` = qualquer. */
  responsavel: string | null
  etiqueta: string | null
  /** Nome ou telefone, como digitado. */
  busca: string
  soNaoLidas: boolean
}

export const FILTRO_PADRAO: FiltroConversas = { status: null, responsavel: null, etiqueta: null, busca: '', soNaoLidas: false }

/** O filtro mora na URL (`?status=&responsavel=&etiqueta=&busca=&naolidas=1`). */
export function lerFiltroConversas(params: ParametrosDaUrl): FiltroConversas {
  const status = primeiroValor(params.status)
  const responsavel = primeiroValor(params.responsavel)?.trim().toLowerCase()
  const etiqueta = primeiroValor(params.etiqueta)?.trim()
  return {
    status: ehStatusConversa(status) ? status : null,
    responsavel: responsavel ? responsavel.slice(0, 200) : null,
    etiqueta: etiqueta && /^[a-z0-9-]{2,40}$/.test(etiqueta) ? etiqueta : null,
    busca: (primeiroValor(params.busca) ?? '').trim().slice(0, 100),
    soNaoLidas: primeiroValor(params.naolidas) === '1',
  }
}

/** A busca por telefone compara dígitos: '(11) 99999' acha '+5511999998888'. */
export function digitosDaBusca(busca: string): string | null {
  const d = busca.replace(/\D/g, '')
  return d.length >= 4 ? d : null
}
