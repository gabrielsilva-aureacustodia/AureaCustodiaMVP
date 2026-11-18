/**
 * O número da moeda no recibo (item 12 da manutenção de novembro/2026) — tela, cartão da lista e a prova
 * de que mostrar o número NÃO mexe em hash nenhum.
 *
 * Os componentes são renderizados como HTML estático (o mesmo padrão dos outros testes de componente do
 * repositório): o que a pessoa lê na tela é exatamente o texto que está em jogo. O PDF tem o teste dele em
 * src/lib/pdf/recibo-pdf.test.ts.
 */

import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { camposParaHash, hashDaAnalise, type AnalisePendente } from '@/domain/analise'
import { GENESIS, textoParaHash } from '@/domain/hash'
import { seedState } from '@/domain/seed'
import type { Coin } from '@/domain/types'

import { FolhaDoRecibo } from './FolhaDoRecibo'
import { ReciboCard } from './ReciboCard'
import { ROTULO_NUMERO_DA_MOEDA, rotuloDoNumeroDaMoeda } from './numero-da-moeda'

const NBSP = ' '

/** Uma moeda de verdade, da semente do domínio: sem fixture inventada que possa divergir do tipo. */
function moedaDaSemente(): Coin {
  const dono = Object.values(seedState().users).find((u) => u.coins.length > 0)
  if (!dono) throw new Error('A semente não tem nenhuma moeda')
  return dono.coins[0]
}

function folhaDe(coin: Coin, comNumero: boolean): string {
  return renderToStaticMarkup(
    createElement(FolhaDoRecibo, {
      tipoMoeda: coin.tipoMoeda,
      ano: coin.ano,
      codigo: coin.recibo.codigo,
      ...(comNumero ? { numeroDaMoeda: coin.id } : {}),
      hash: coin.recibo.hash,
      dataEmissao: coin.recibo.dataEmissao,
      proprietario: 'Rogério Siqueira',
      status: 'Moeda física recebida e custodiada',
      negociavel: true,
      extinto: false,
      bloqueado: false,
      pendencia: false,
    }),
  )
}

describe('rotuloDoNumeroDaMoeda', () => {
  it('é "Moeda nº" + o código da moeda (Coin.id), não o código do recibo', () => {
    expect(ROTULO_NUMERO_DA_MOEDA).toBe('Moeda nº')
    expect(rotuloDoNumeroDaMoeda('RO-000042')).toBe(`Moeda nº${NBSP}RO-000042`)
    expect(rotuloDoNumeroDaMoeda('RO-000042')).not.toContain('REC-')
  })

  it('o espaço antes do número é inseparável: na tela estreita o código não vai sozinho para a linha de baixo', () => {
    expect(rotuloDoNumeroDaMoeda('RO-000001').split(NBSP)).toEqual(['Moeda nº', 'RO-000001'])
  })
})

describe('FolhaDoRecibo — número da moeda', () => {
  const coin = moedaDaSemente()

  it('mostra o número logo abaixo do código do recibo, na mesma .cert-code', () => {
    const html = folhaDe(coin, true)
    const esperado =
      `<div class="cert-code">${coin.recibo.codigo}<br/>` +
      `<span class="cert-numero-da-moeda">Moeda nº${NBSP}${coin.id}</span></div>`
    expect(html).toContain(esperado)
    // A ordem na folha: título, código do recibo, número da moeda, campos.
    expect(html.indexOf('Recibo de Custódia')).toBeLessThan(html.indexOf(coin.recibo.codigo))
    expect(html.indexOf(coin.recibo.codigo)).toBeLessThan(html.indexOf(`Moeda nº${NBSP}${coin.id}`))
    expect(html.indexOf(`Moeda nº${NBSP}${coin.id}`)).toBeLessThan(html.indexOf('cert-fields'))
  })

  it('sem a prop (a visão do Admin, até o Controle encaixar a linha) a folha é a de antes: só o código do recibo', () => {
    const html = folhaDe(coin, false)
    expect(html).toContain(`<div class="cert-code">${coin.recibo.codigo}</div>`)
    expect(html).not.toContain('Moeda nº')
    expect(html).not.toContain('cert-numero-da-moeda')
  })

  it('os CINCO campos do documento continuam os mesmos: o número é do cabeçalho, não um sexto campo', () => {
    for (const comNumero of [true, false]) {
      const html = folhaDe(coin, comNumero)
      expect(html.match(/class="cf-row"/g)).toHaveLength(5)
      const rotulos = [...html.matchAll(/<span class="k">([^<]*)<\/span>/g)].map((m) => m[1])
      expect(rotulos).toEqual(['Moeda', 'Status', 'Data de emissão', 'Proprietário atual', 'Hash (curto)'])
      // O hash curto impresso é o do recibo, intacto.
      expect(html).toContain(`<span class="v">${coin.recibo.hash}</span>`)
    }
  })
})

describe('ReciboCard — número da moeda', () => {
  const coin = moedaDaSemente()
  const html = renderToStaticMarkup(createElement(ReciboCard, { coin, valor: 43750, listed: false }))

  it('mostra o código do recibo e, na linha de baixo, o número da moeda', () => {
    expect(html).toContain(`<div class="recibo-code">${coin.recibo.codigo}</div>`)
    expect(html).toContain(`<div class="recibo-code">Moeda nº${NBSP}${coin.id}</div>`)
    expect(html.indexOf(coin.recibo.codigo)).toBeLessThan(html.indexOf(`Moeda nº${NBSP}${coin.id}`))
  })

  it('o link continua levando ao recibo da moeda e o nome acessível continua levando o código do recibo', () => {
    expect(html).toContain(`href="/recibos/${coin.id}"`)
    expect(html).toContain(`<span class="sr-only"> ${coin.recibo.codigo}</span>`)
  })
})

/**
 * A PROVA DE QUE O HASH NÃO MUDA. O número da moeda só é EXIBIDO: o hash do recibo nasce da corrente de
 * análises (src/domain/analise.ts) e o `RO-…` já entra nela, como `codigoMoeda`, desde sempre. Três
 * travas: (1) um vetor fixo, calculado à parte com o node:crypto, que quebra se a fórmula ou a lista de
 * campos mudar; (2) renderizar a folha e o cartão não altera a moeda nem o hash dela; (3) os arquivos do
 * hash não conhecem a camada de exibição.
 */
describe('o hash do recibo não depende do número exibido', () => {
  const analise: AnalisePendente = {
    protocolo: 'RO-ANL-0001',
    protocoloEnvio: 'RO-ENV-0001',
    codigoMoeda: 'RO-000042',
    codigoRecibo: 'REC-000042',
    tipoMoeda: 'Direitos Humanos',
    ano: 1998,
    pesoMg: 27000,
    veredito: 'aprovada',
    motivoRecusa: null,
    operador: 'Operador',
    aprovador: 'Operador',
    caixa: 'EB-001',
    posicao: 3,
    validadoEm: 1789000000000,
    caminhoVideo: null,
  }
  // SHA-256 de GENESIS + '\n' + os quinze campos com '|', calculado com `crypto.createHash` direto — nunca
  // com o código do domínio, para a prova não ser circular. É o valor de ANTES desta frente.
  const HASH_ANTES = '37bb2ed5624a04191119d9891ac17b0079ae9dbbac2eb9ee01ee83286d5f7b71'

  it('a fórmula e os campos continuam produzindo o mesmo hash de antes', () => {
    expect(textoParaHash(GENESIS, camposParaHash(analise))).toBe(
      `${GENESIS}\nRO-ANL-0001|RO-ENV-0001|RO-000042|REC-000042|Direitos Humanos|1998|27000|aprovada||Operador|Operador|EB-001|3|1789000000000|`,
    )
    expect(hashDaAnalise(analise, GENESIS)).toBe(HASH_ANTES)
    expect(createHash('sha256').update(textoParaHash(GENESIS, camposParaHash(analise)), 'utf8').digest('hex')).toBe(
      HASH_ANTES,
    )
  })

  it('mostrar o número (folha e cartão) não altera a moeda nem o hash do recibo', () => {
    const coin = moedaDaSemente()
    const antes = JSON.stringify(coin)
    const hashAntes = coin.recibo.hash
    folhaDe(coin, true)
    renderToStaticMarkup(createElement(ReciboCard, { coin, valor: coin.valorEstimado, listed: false }))
    expect(JSON.stringify(coin)).toBe(antes)
    expect(coin.recibo.hash).toBe(hashAntes)
    expect(rotuloDoNumeroDaMoeda(coin.id)).toContain(coin.id)
  })

  it('o código do hash não importa nada da camada de exibição', () => {
    for (const arquivo of ['src/domain/hash.ts', 'src/domain/analise.ts']) {
      const fonte = readFileSync(resolve(process.cwd(), arquivo), 'utf8')
      expect(fonte).not.toMatch(/numero-da-moeda|rotuloDoNumeroDaMoeda|components\/recibo/)
    }
  })
})
