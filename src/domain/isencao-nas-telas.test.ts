/**
 * TRAVA: TELA QUE CALCULA TAXA TEM DE USAR A ISENÇÃO (23/11/2026).
 *
 * A isenção da conta da Áurea e do CEO foi ligada só no servidor, e quatro telas seguiram calculando a taxa com a
 * tabela cheia: o Rogério via cobrança que o servidor não faz. Este teste lê as telas logadas e falha se alguma
 * calcular comissão ou custódia sem importar `@/domain/isencao`. Tela pública sem conta (taxas, simulador da home)
 * não tem a quem isentar e fica de fora.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const RAIZ = join(process.cwd(), 'src')
const CALCULAM_TAXA = /\b(comissaoPorMoeda|custoDeCompraPorMoeda|custodiaDaCompraPorMoeda|liquidoDeVendaPorMoeda)\(/
const SEM_CONTA = ['src/app/taxas/', 'src/components/landing/']

function tsx(dir: string): string[] {
  return readdirSync(dir).flatMap((nome) => {
    const caminho = join(dir, nome)
    if (statSync(caminho).isDirectory()) return tsx(caminho)
    return caminho.endsWith('.tsx') ? [caminho] : []
  })
}

describe('telas que calculam taxa', () => {
  it('todas usam a tabela com isenção', () => {
    const sem = tsx(RAIZ)
      .filter((f) => !SEM_CONTA.some((p) => f.split(String.fromCharCode(92)).join('/').includes(p)))
      .filter((f) => CALCULAM_TAXA.test(readFileSync(f, 'utf8')))
      .filter((f) => !readFileSync(f, 'utf8').includes("@/domain/isencao"))
    expect(sem, `Tela com taxa sem isenção: ${sem.join(', ')}`).toEqual([])
  })
})
