/**
 * Guarda do contrato de tokens da marca (Brandbook §4). Três promessas que as
 * outras frentes do polimento assumem e que nenhum build de CSS confere:
 *
 *  1. O espelho em TypeScript (tokens.ts) tem os mesmos hex do CSS.
 *  2. Todo par texto/fundo dos papéis passa WCAG AA (4,5:1; borda de controle
 *     e foco, 3:1) — nos DOIS temas.
 *  3. Nenhum nome legado de src/styles/tokens.css desaparece: telas que ainda
 *     leem --gold, --bg ou --line quebrariam em silêncio (CSS não dá erro).
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

import { contraste, papeis, primitivos } from '../tokens'

const css = readFileSync(resolve(__dirname, '../tokens.css'), 'utf8')
const legado = readFileSync(resolve(__dirname, '../../styles/tokens.css'), 'utf8')

describe('tokens da marca', () => {
  it('o espelho em TypeScript bate com os primitivos do CSS', () => {
    for (const [familia, tons] of Object.entries(primitivos)) {
      for (const [tom, hex] of Object.entries(tons)) {
        expect(css, `--ro-${familia}-${tom}`).toContain(`--ro-${familia}-${tom}:${hex};`)
      }
    }
  })

  it.each(['dark', 'light'] as const)('pares do tema %s passam AA', (tema) => {
    const p = papeis[tema]
    const texto: Array<[string, string, string]> = [
      ['texto/fundo', p.texto, p.fundo],
      ['texto/cartão', p.texto, p.cartaoBase],
      ['texto suave/fundo', p.textoSuave, p.fundo],
      ['texto suave/cartão', p.textoSuave, p.cartaoBase],
      ['ouro como texto/fundo', p.primariaTexto, p.fundo],
      ['ouro como texto/cartão', p.primariaTexto, p.cartaoBase],
      ['tinta sobre o botão dourado', p.sobrePrimaria, p.primaria],
      ['sucesso/cartão', p.sucessoTexto, p.cartaoBase],
      ['perigo/cartão', p.perigoTexto, p.cartaoBase],
      ['aviso/cartão', p.avisoTexto, p.cartaoBase],
      ['info/cartão', p.infoTexto, p.cartaoBase],
    ]
    for (const [nome, a, b] of texto) expect(contraste(a, b), nome).toBeGreaterThanOrEqual(4.5)

    const controle: Array<[string, string, string]> = [
      ['borda do campo', p.bordaCampo, p.campo],
      ['anel de foco/fundo', p.foco, p.fundo],
      ['anel de foco/cartão', p.foco, p.cartaoBase],
    ]
    for (const [nome, a, b] of controle) expect(contraste(a, b), nome).toBeGreaterThanOrEqual(3)
  })

  it('nenhum nome legado some da camada de aliases', () => {
    // Lista congelada em 25/10/2026 (contrato da Frente 1). Remover um nome
    // daqui exige conferir que nenhum CSS ou componente o lê mais.
    const nomes = [
      'navy-deep', 'navy', 'navy-card', 'navy-card2', 'gold', 'gold-bright', 'gold-soft', 'cream', 'white',
      'green', 'red', 'muted', 'ff-sans', 'ff-display', 'ff-serif', 'on-gold', 'gold-wash', 'gold-tint-10',
      'gold-tint-14', 'gold-tint-18', 'gold-tint-30', 'gold-subtle', 'green-line', 'green-wash', 'green-wash-22',
      'green-wash-25', 'red-line', 'red-line-soft', 'red-wash', 'red-wash-22', 'danger', 'chip-up-ink',
      'chip-up-ink-light', 'chip-down-ink', 'chip-down-ink-light', 'pill-y-ink', 'pill-y-ink-light', 'backdrop',
      'modal-backdrop', 'photo-rm-bg', 'shadow-gold-hover', 'shadow-toast', 'shadow-modal', 'cert-border',
      'cert-divider', 'cert-ink-gold', 'cert-ink-label', 'cert-ink-foot', 'cert-ink-qr', 'qr-ink', 'coin-rim',
      'coin-core', 'coin-light', 'coin-shade', 'coin-engrave', 'coin-legend', 'select-caret', 'bg', 'bg-panel',
      'card', 'card-hover', 'text', 'text-strong', 'text-muted', 'line', 'line-soft', 'input-bg', 'shadow',
      'text-main', 'border', 'card-bg', 'card-subtle', 'bg-subtle', 'bg-card-subtle', 'bg-card', 'bg-card-hover',
      'bg-alt', 'shadow-sm', 'shadow-md', 'shadow-lg',
    ]
    for (const n of nomes) expect(legado, `--${n}`).toMatch(new RegExp(`--${n}:`))
  })
})
