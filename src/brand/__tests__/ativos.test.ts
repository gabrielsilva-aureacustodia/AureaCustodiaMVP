/**
 * Guarda do catálogo de ativos (src/brand/ativos.ts). Os arquivos de public/visuais/ chegam pelo
 * merge da Frente 2 e não são conferidos aqui; o que este teste garante é a parte que, se quebrar,
 * põe imagem errada ou nenhuma imagem na tela sem erro nenhum:
 *  - todo ativo pendente diz POR QUE está pendente (senão ninguém sabe o que corrigir);
 *  - a recaída das moedas — a foto real — existe neste repositório;
 *  - o srcset sai nas larguras declaradas, no formato do nome que a Frente 2 usa.
 */

import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

import { ATIVOS, FOTO_REAL, ILUSTRACOES, RENDER_TRES_QUARTOS, srcDe, srcsetDe } from '../ativos'

describe('catálogo de ativos da marca', () => {
  it('ativo pendente sempre traz o motivo', () => {
    for (const [id, a] of Object.entries(ATIVOS)) {
      if (a.situacao === 'pendente') expect(a.motivo, id).toBeTruthy()
    }
  })

  it('a foto real de cada moeda negociável existe em public/moedas', () => {
    for (const { src } of Object.values(FOTO_REAL)) {
      expect(existsSync(resolve(__dirname, '../../../public', `.${src}`)), src).toBe(true)
    }
  })

  it('cada moeda negociável aponta para um render do catálogo', () => {
    for (const id of Object.values(RENDER_TRES_QUARTOS)) expect(ATIVOS[id]).toBeDefined()
  })

  it('srcset e src seguem o padrão <base>-<largura>.<formato>', () => {
    const a = ATIVOS.jornadaEnvio
    expect(srcsetDe(a, 'avif')).toBe(
      '/visuais/cenarios/jornada-cena-01-envio-640.avif 640w, /visuais/cenarios/jornada-cena-01-envio-960.avif 960w, ' +
        '/visuais/cenarios/jornada-cena-01-envio-1440.avif 1440w, /visuais/cenarios/jornada-cena-01-envio-1920.avif 1920w',
    )
    expect(srcDe(a, 700)).toBe('/visuais/cenarios/jornada-cena-01-envio-960.webp')
    expect(srcDe(a, 5000)).toBe('/visuais/cenarios/jornada-cena-01-envio-1920.webp')
    expect(srcDe(ATIVOS.ogLanding, 1100)).toBe('/visuais/og/og-landing-real-olimpico-1200.webp')
  })

  it('ilustrações são SVG de public/visuais/onboarding', () => {
    for (const il of Object.values(ILUSTRACOES)) {
      expect(il.src).toMatch(/^\/visuais\/onboarding\/[a-z0-9-]+\.svg$/)
      if (il.srcEscuro) expect(il.srcEscuro).toMatch(/-escuro\.svg$/)
    }
  })
})
