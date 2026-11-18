/**
 * O recibo em PDF e o número da moeda (item 12 da manutenção de novembro/2026).
 *
 * `montarReciboPdf` devolve o documento sem baixar; o teste lê o conteúdo impresso (os operadores `Td`/`Tj`
 * do PDF, em coordenadas de página, com a origem embaixo) e confere o que importa para quem recebe a folha:
 * o número aparece, abaixo do código do recibo e antes dos campos; os cinco campos seguem os mesmos; os
 * acentos saem certos; e nada fica fora da moldura da página de 480x660.
 */

import { describe, expect, it } from 'vitest'

import { seedState } from '@/domain/seed'
import type { Coin } from '@/domain/types'

import { montarReciboPdf } from './recibo-pdf'

const ALTURA = 660

interface Texto {
  x: number
  /** Em pontos A PARTIR DO TOPO, como o recibo-pdf.ts escreve. */
  y: number
  texto: string
}

function moedaDaSemente(): Coin {
  const dono = Object.values(seedState().users).find((u) => u.coins.length > 0)
  if (!dono) throw new Error('A semente não tem nenhuma moeda')
  return dono.coins[0]
}

/** Todo texto impresso com sua posição. O PDF guarda a posição com a origem embaixo; aqui volta para o topo. */
async function textosDoPdf(coin: Coin, ownerName = 'Rogério Siqueira'): Promise<Texto[]> {
  const doc = await montarReciboPdf({ coin, ownerName })
  const bruto = doc.output()
  // O texto vem entre parênteses e o PDF escapa os parênteses de dentro: "Hash (curto)" sai como `Hash \(curto\)`.
  return [...bruto.matchAll(/([\d.]+)\s+([\d.]+)\s+Td\s*\(((?:\\.|[^\\)])*)\)\s*Tj/g)].map((m) => ({
    x: Number(m[1]),
    y: ALTURA - Number(m[2]),
    texto: m[3].replace(/\\([()\\])/g, '$1'),
  }))
}

const achar = (ts: Texto[], texto: string): Texto => {
  const t = ts.find((x) => x.texto === texto)
  if (!t) throw new Error(`Texto "${texto}" não está no PDF. Há: ${ts.map((x) => x.texto).join(' | ')}`)
  return t
}

describe('montarReciboPdf — número da moeda', () => {
  const coin = moedaDaSemente()

  it('imprime "Moeda nº RO-…" logo abaixo do código do recibo, centralizado, antes dos campos', async () => {
    const ts = await textosDoPdf(coin)
    const codigo = achar(ts, coin.recibo.codigo)
    const numero = achar(ts, `Moeda nº ${coin.id}`) // espaço comum no PDF: a linha é curta e centralizada
    const primeiroCampo = achar(ts, 'Moeda')

    expect(numero.y).toBeGreaterThan(codigo.y)
    expect(numero.y - codigo.y).toBeLessThan(24)
    expect(primeiroCampo.y).toBeGreaterThan(numero.y)
    // Respiro mínimo entre a linha nova e o primeiro campo (não colar no que vem embaixo).
    expect(primeiroCampo.y - numero.y).toBeGreaterThanOrEqual(15)
  })

  it('mantém os CINCO campos, na mesma ordem e com os mesmos textos, e o hash curto intacto', async () => {
    const ts = await textosDoPdf(coin)
    const rotulos = ts.filter((t) => t.x === 56).map((t) => t.texto)
    expect(rotulos).toEqual(['Moeda', 'Status', 'Data de emissão', 'Proprietário atual', 'Hash (curto)'])
    expect(ts.some((t) => t.texto === coin.recibo.hash)).toBe(true)
    expect(ts.some((t) => t.texto === coin.recibo.dataEmissao)).toBe(true)
    expect(ts.some((t) => t.texto === 'Rogério Siqueira')).toBe(true)
  })

  it('os acentos saem certos e não sobra o texto de QR (o recibo não tem QR desde 20/09/2026)', async () => {
    const ts = await textosDoPdf(coin)
    const todos = ts.map((t) => t.texto)
    expect(todos).toContain('REAL OLÍMPICO')
    expect(todos).toContain('Recibo de Custódia')
    expect(todos).toContain('Proprietário atual')
    expect(todos).toContain('CUSTÓDIA')
    expect(todos.join(' ')).not.toMatch(/QR|simulado/i)
  })

  it('o selo e o rodapé acompanham a linha nova e continuam dentro da moldura de 26 a 634 pt', async () => {
    const ts = await textosDoPdf(coin)
    for (const t of ts) {
      expect(t.y).toBeGreaterThanOrEqual(26)
      expect(t.y).toBeLessThanOrEqual(634)
    }
    const rodape = achar(ts, 'A moeda física permanece sob guarda do Real Olímpico.')
    const ultimoCampo = achar(ts, 'Hash (curto)')
    expect(rodape.y).toBeGreaterThan(ultimoCampo.y)
    expect(rodape.y).toBeLessThan(560) // sobra folga até a moldura: a página não foi desmontada
  })

  it('os três estados do recibo trazem o número (ativo, bloqueado e extinto) e os carimbos seguem onde estavam', async () => {
    for (const status of ['Ativo', 'Bloqueado', 'Extinto'] as const) {
      const c: Coin = { ...coin, recibo: { ...coin.recibo, status } }
      const ts = await textosDoPdf(c)
      expect(ts.some((t) => t.texto === `Moeda nº ${coin.id}`)).toBe(true)
      expect(ts.some((t) => t.texto.startsWith('RECIBO EXTINTO'))).toBe(status === 'Extinto')
      expect(ts.some((t) => t.texto.startsWith('RECIBO BLOQUEADO'))).toBe(status === 'Bloqueado')
      if (status !== 'Ativo') {
        const carimbo = ts.find((t) => t.texto.startsWith('RECIBO '))
        expect(carimbo?.y).toBe(263) // posição fixa do original, intocada
      }
    }
  })
})
