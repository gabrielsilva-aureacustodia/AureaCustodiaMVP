/**
 * O código anônimo da vitrine (D-5, 10/09/2026).
 *
 * O que estes testes protegem é a promessa feita ao cliente: o nome dele não
 * aparece para desconhecido, e o código que aparece no lugar não deixa montar
 * o retrato de quem opera quanto.
 */

import { describe, expect, it } from 'vitest'

import { apelidoComprador, apelidoVendedor, codigoContraparte } from '@/domain/contraparte'

describe('codigoContraparte', () => {
  it('é determinístico — o mesmo id devolve sempre o mesmo código', () => {
    expect(codigoContraparte('lot-abc-1')).toBe(codigoContraparte('lot-abc-1'))
  })

  it('devolve quatro hexadecimais maiúsculos', () => {
    for (const id of ['lot-1', 'bid-2', 'x', '', 'RO-000042|1757000000000']) {
      expect(codigoContraparte(id)).toMatch(/^[0-9A-F]{4}$/)
    }
  })

  it('separa ids diferentes — duas ofertas não viram a mesma linha na tela', () => {
    const codigos = new Set(
      Array.from({ length: 200 }, (_, i) => codigoContraparte('lot-' + i)),
    )
    // Com 200 sorteios em 65.536 valores, o esperado é ~199,7 distintos. Abaixo
    // de 190 não é colisão de aniversário: é a derivação tendo virado constante.
    expect(codigos.size).toBeGreaterThan(190)
  })

  it('não carrega o id de volta — o código é curto demais para reverter', () => {
    expect(codigoContraparte('rogerio@aureacustodia.com.br')).not.toContain('rogerio')
  })

  it('monta os rótulos da vitrine', () => {
    expect(apelidoVendedor('lot-abc-1')).toBe('Vendedor #' + codigoContraparte('lot-abc-1'))
    expect(apelidoComprador('bid-9')).toBe('Comprador #' + codigoContraparte('bid-9'))
    expect(apelidoVendedor('lot-abc-1')).toMatch(/^Vendedor #[0-9A-F]{4}$/)
  })
})
