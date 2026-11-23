/**
 * TRAVA: SÓ EXISTE UMA COTAÇÃO (23/11/2026).
 *
 * A isenção da conta da Áurea e do CEO foi ligada só no servidor, e quatro telas seguiram calculando a taxa com a
 * tabela cheia: o Rogério via cobrança que o servidor não faz. Agora todo valor de compra ou venda vem de
 * `src/domain/cotacao.ts`. Este teste lê TODO o código (telas, domínio e servidor) e falha se alguém voltar a chamar
 * as funções de taxa ou `taxasDaNegociacao` direto. Fora da regra, de propósito: as próprias definições, as telas
 * públicas sem conta (tabela de taxas e simulador da home) e os exemplos da configuração e dos documentos legais.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const RAIZ = join(process.cwd(), 'src')
const PROIBIDAS = /\b(comissaoPorMoeda|custoDeCompraPorMoeda|custodiaDaCompraPorMoeda|liquidoDeVendaPorMoeda|precoComComissaoDeCompra|taxasDaNegociacao|taxasDeQuemCompra|taxasDeQuemVende)\(/
const PERMITIDOS = [
  'src/domain/fees.ts',
  'src/domain/isencao.ts',
  'src/domain/cotacao.ts',
  'src/domain/custodia-da-compra.ts',
  'src/domain/admin/configuracao.ts',
  'src/domain/admin/documentos.ts',
  'src/app/taxas/',
  'src/components/landing/',
]

function codigo(dir: string): string[] {
  return readdirSync(dir).flatMap((nome) => {
    const caminho = join(dir, nome)
    if (statSync(caminho).isDirectory()) return codigo(caminho)
    const ehCodigo = /\.(ts|tsx)$/.test(caminho) && !/\.test\.(ts|tsx)$/.test(caminho)
    return ehCodigo ? [caminho] : []
  })
}

describe('cotação única', () => {
  it('ninguém calcula taxa fora de cotacao.ts', () => {
    const barra = String.fromCharCode(92)
    const fora = codigo(RAIZ)
      .map((f) => f.split(barra).join('/'))
      .filter((f) => !PERMITIDOS.some((p) => f.includes(p)))
      .filter((f) => PROIBIDAS.test(readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')))
    expect(fora, `Calcula taxa fora da cotação: ${fora.join(', ')}`).toEqual([])
  })
})
