/**
 * O hash precisa ser o SHA-256 de verdade — não "um hash". Os vetores abaixo
 * são os do FIPS 180-4 e o último caso confere a implementação pura contra o
 * `node:crypto`, com texto acentuado e emoji (UTF-8 de 2, 3 e 4 bytes).
 */

import { createHash } from 'node:crypto'

import { describe, expect, it } from 'vitest'

import { GENESIS, campoCanonico, hashEncadeado, sha256Hex, textoParaHash } from '@/domain/hash'

describe('sha256Hex', () => {
  it('reproduz os vetores oficiais', () => {
    expect(sha256Hex('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')
    expect(sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
    expect(sha256Hex('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq')).toBe(
      '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1',
    )
  })

  it('bate com o node:crypto em texto UTF-8 de vários tamanhos', () => {
    const casos = ['Custódia', 'Áurea Custódia · R$ 285,00 — 💰', 'x'.repeat(55), 'y'.repeat(56), 'z'.repeat(1000)]
    for (const texto of casos) {
      expect(sha256Hex(texto)).toBe(createHash('sha256').update(texto, 'utf8').digest('hex'))
    }
  })
})

describe('hashEncadeado', () => {
  it('a forma canônica: null vira vazio, número vira decimal, texto entra como está', () => {
    expect(campoCanonico(null)).toBe('')
    expect(campoCanonico(28500)).toBe('28500')
    expect(campoCanonico(' Compra ')).toBe(' Compra ')
    expect(textoParaHash(GENESIS, ['a', 1, null, 'b'])).toBe(GENESIS + '\na|1||b')
  })

  it('é determinístico e sensível a qualquer campo e ao hash anterior', () => {
    const h1 = hashEncadeado(GENESIS, ['deposito', 5000, 'eu'])
    expect(hashEncadeado(GENESIS, ['deposito', 5000, 'eu'])).toBe(h1)
    expect(hashEncadeado(GENESIS, ['deposito', 5001, 'eu'])).not.toBe(h1)
    expect(hashEncadeado(h1, ['deposito', 5000, 'eu'])).not.toBe(h1)
    expect(h1).toMatch(/^[0-9a-f]{64}$/)
  })

  it('recusa número não finito em vez de gravar "NaN" na cadeia', () => {
    expect(() => hashEncadeado(GENESIS, [Number.NaN])).toThrow()
  })
})
