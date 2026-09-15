/**
 * A bancada de análise no navegador — as regras puras da entrada (frente C, C3).
 *
 * NÃO É OUTRA ANÁLISE. Quem fecha o procedimento, cria a moeda, encadeia o hash e alimenta
 * o plano de custódia é `fecharAnalise()` em src/server/estacao/analise.ts — o mesmo serviço
 * que a estação Electron chama pela rota. Este arquivo só transforma o que o operador digitou
 * no formato que aquele serviço recebe, e recusa o que a rota recusaria.
 *
 * AS REGRAS SÃO AS DA ROTA E AS DA ESTAÇÃO, COPIADAS DE PROPÓSITO. A validação da rota vive
 * dentro de `src/app/api/estacao/analise/fechar/route.ts`, sem exportação, e a da estação em
 * `estacao/renderer/app.js`. As três precisam concordar: peso em gramas com vírgula vira
 * miligramas inteiros, entre 1 g e 100 g; recusa sem motivo não passa; o envio inteiro é
 * analisado de uma vez. O teste deste arquivo congela as faixas.
 *
 * O QUE ESTE ARQUIVO ACRESCENTA, E SÓ AQUI: duas moedas do mesmo envio na mesma posição da
 * mesma caixa é recusado antes de ir ao servidor. Com a tabela de caixas (migration 025), a
 * posição já ocupada por outra moeda também — ver `caixas.ts`. É validação de dado, não
 * trava de fluxo: a análise continua podendo ser fechada sem caixa e sem vídeo (RA-22, RA-23).
 *
 * Regra pura: sem I/O, sem relógio.
 */

import type { VereditoAnalise } from '@/domain/types'

import { chaveDeCaixa } from './caixas'

/** A mesma faixa da rota: de 1 g a 100 g. Fora dela quase sempre é peso digitado em miligramas. */
export const PESO_MIN_MG = 1000
export const PESO_MAX_MG = 100000

/** Etapas em que um envio aparece na bancada — as mesmas de `filaDeAnalise()`. */
export const ETAPAS_DA_BANCADA = ['Recebido pela custódia', 'Em análise física'] as const

/** Um envio esperando análise, como a tela o recebe. */
export interface ItemDaFilaBancada {
  protocolo: string
  cliente: string
  clienteEmail: string
  tipoMoeda: string
  ano: number
  quantidade: number
  etapaAtual: string
  codigoRastreio: string | null
  recebidoEm: number | null
}

/** Uma moeda como o operador preenche na tela: texto cru, do jeito que foi digitado. */
export interface MoedaDigitada {
  veredito: VereditoAnalise
  /** Peso lido na balança, em gramas: "27,05" ou "27.05". */
  gramas: string
  caixa: string
  posicao: string
  motivoRecusa: string
}

/** O veredito no formato de `VereditoRecebido` do serviço da análise. */
export interface VereditoValidado {
  pesoMg: number
  veredito: VereditoAnalise
  motivoRecusa: string | null
  caixa: string | null
  posicao: number | null
  caminhoVideo: string | null
}

export type ResultadoValidacao = { ok: true; vereditos: VereditoValidado[] } | { ok: false; erros: string[] }

export function ehVeredito(x: unknown): x is VereditoAnalise {
  return x === 'aprovada' || x === 'recusada'
}

/**
 * Gramas digitados → miligramas inteiros. Aceita vírgula ou ponto, com ou sem espaço, porque o
 * display da balança mostra vírgula e o teclado numérico às vezes manda ponto. O arredondamento
 * acontece aqui, uma vez — é o mesmo `Math.round(gramas * 1000)` da estação.
 */
export function gramasParaMg(texto: string): number | null {
  const limpo = String(texto ?? '').trim().replace(/\s+/g, '').replace(',', '.')
  if (!/^\d+(\.\d+)?$/.test(limpo)) return null
  const gramas = Number(limpo)
  if (!Number.isFinite(gramas) || gramas <= 0) return null
  return Math.round(gramas * 1000)
}

function textoOuNulo(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim()
  return t.length > 0 ? t : null
}

/** "7" → 7. Posição vazia é `null`; posição que não é inteiro positivo é erro. */
export function lerPosicao(texto: string): { ok: true; posicao: number | null } | { ok: false } {
  const t = String(texto ?? '').trim()
  if (t === '') return { ok: true, posicao: null }
  if (!/^\d+$/.test(t)) return { ok: false }
  const n = Number(t)
  return n >= 1 && n <= 100000 ? { ok: true, posicao: n } : { ok: false }
}

/**
 * Confere o envio inteiro e devolve os vereditos prontos para `fecharAnalise()`.
 *
 * `quantidade` é a do envio: a lista precisa ter exatamente esse tamanho (decisão D7b — não há
 * aprovação parcial). `caminhoVideo` é um só para o envio, como na estação: uma gravação cobre o
 * procedimento inteiro.
 */
export function validarMoedasDaBancada(
  moedas: readonly MoedaDigitada[],
  quantidade: number,
  caminhoVideo: string | null,
): ResultadoValidacao {
  const erros: string[] = []
  if (!Array.isArray(moedas) || moedas.length === 0) {
    return { ok: false, erros: ['Preencha o veredito de cada moeda do envio.'] }
  }
  if (moedas.length !== quantidade) {
    return {
      ok: false,
      erros: [`O envio tem ${quantidade} moeda(s) e vieram ${moedas.length} veredito(s). O envio inteiro é analisado de uma vez.`],
    }
  }

  const video = textoOuNulo(caminhoVideo)
  const posicoesUsadas = new Map<string, number>()
  const vereditos: VereditoValidado[] = []

  moedas.forEach((m, i) => {
    const n = i + 1
    if (!m || !ehVeredito(m.veredito)) {
      erros.push(`Moeda ${n}: escolha aprovar ou recusar.`)
      return
    }
    const pesoMg = gramasParaMg(m.gramas)
    if (pesoMg === null) {
      erros.push(`Moeda ${n}: digite o peso lido na balança, em gramas.`)
    } else if (pesoMg < PESO_MIN_MG || pesoMg > PESO_MAX_MG) {
      erros.push(`Moeda ${n}: ${String(m.gramas).trim()} g está fora do esperado (1 a 100 g). Confira a leitura.`)
    }

    const aprovada = m.veredito === 'aprovada'
    const motivo = textoOuNulo(m.motivoRecusa)
    if (!aprovada && motivo === null) erros.push(`Moeda ${n}: escreva o motivo da recusa.`)

    let caixa: string | null = null
    let posicao: number | null = null
    if (aprovada) {
      caixa = textoOuNulo(m.caixa)
      const p = lerPosicao(m.posicao)
      if (!p.ok) erros.push(`Moeda ${n}: a posição precisa ser um número inteiro, como 7.`)
      else posicao = p.posicao
      if (caixa !== null && posicao !== null) {
        const chave = `${chaveDeCaixa(caixa)}#${posicao}`
        const outra = posicoesUsadas.get(chave)
        if (outra !== undefined) erros.push(`Moedas ${outra} e ${n}: as duas estão na posição ${posicao} da caixa ${caixa}.`)
        else posicoesUsadas.set(chave, n)
      }
    }

    vereditos.push({
      pesoMg: pesoMg ?? 0,
      veredito: m.veredito,
      motivoRecusa: aprovada ? null : motivo,
      caixa,
      posicao,
      caminhoVideo: video,
    })
  })

  return erros.length > 0 ? { ok: false, erros } : { ok: true, vereditos }
}

/**
 * O nome do arquivo do vídeo, no mesmo formato da estação (`RO-ENV-0001-2.webm`: protocolo e
 * quantidade de moedas). A extensão acompanha o formato que o navegador conseguiu gravar — um
 * MP4 salvo como .webm abre em alguns tocadores e falha noutros.
 */
export function nomeDoArquivoDeVideo(protocolo: string, quantidade: number, extensao: string): string {
  const ext = extensao === 'mp4' ? 'mp4' : 'webm'
  return `${protocolo}-${quantidade}.${ext}`
}
