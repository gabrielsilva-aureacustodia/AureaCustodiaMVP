/**
 * A capacidade e o tipo da caixa passam a valer (05/10/2026).
 *
 * O caso que originou: o Rogério registrou mais de 100 moedas na EB-001 e colocou Bandeira na caixa
 * dos Direitos Humanos, e nada barrou. A moeda agora é MOVIDA para a próxima caixa do mesmo tipo
 * com vaga — a mesma decisão que o operador tomaria à mão.
 */

import { describe, expect, it } from 'vitest'

import {
  alocarNasCaixas,
  caixaAceitaTipo,
  caixaCorrente,
  colocarMoeda,
  ocupacaoDasCaixas,
  type CaixaCadastrada,
  type Ocupante,
} from './caixas'

const BANDEIRA = 'Entrega da Bandeira Olímpica'
const DH = 'Direitos Humanos'

function caixa(codigo: string, capacidade: number | null, tipoMoeda: string | null, ativa = true): CaixaCadastrada {
  return { codigo, rotulo: '', local: '', capacidade, ativa, criadoEm: 1, tipoMoeda }
}

function cheia(codigo: string, tipo: string, quantas: number, de = 1): Ocupante[] {
  return Array.from({ length: quantas }, (_, i) => ({
    caixa: codigo,
    posicao: de + i,
    codigoMoeda: `RO-${codigo}-${de + i}`,
    tipoMoeda: tipo,
    dono: 'a@x.com',
    analise: 'RO-ANL-0001',
  }))
}

const CAIXAS = [caixa('DH-001', 100, DH), caixa('EB-001', 100, BANDEIRA), caixa('EB-002', 100, BANDEIRA)]

describe('alocarNasCaixas', () => {
  it('a caixa que enche manda a moeda seguinte para a próxima do mesmo tipo (EB-001 -> EB-002)', () => {
    const r = alocarNasCaixas(CAIXAS, cheia('EB-001', BANDEIRA, 100), BANDEIRA, 3, 'EB-001')

    expect(r).toEqual({
      ok: true,
      lugares: [
        { caixa: 'EB-002', posicao: 1 },
        { caixa: 'EB-002', posicao: 2 },
        { caixa: 'EB-002', posicao: 3 },
      ],
    })
  })

  it('um lote que atravessa o limite se divide: o que cabe na primeira, o resto na segunda', () => {
    const r = alocarNasCaixas(CAIXAS, cheia('EB-001', BANDEIRA, 98), BANDEIRA, 5, 'EB-001')

    expect(r.ok && r.lugares).toEqual([
      { caixa: 'EB-001', posicao: 99 },
      { caixa: 'EB-001', posicao: 100 },
      { caixa: 'EB-002', posicao: 1 },
      { caixa: 'EB-002', posicao: 2 },
      { caixa: 'EB-002', posicao: 3 },
    ])
  })

  it('Bandeira nunca cai na caixa dos Direitos Humanos, mesmo que seja a digitada', () => {
    const r = alocarNasCaixas(CAIXAS, [], BANDEIRA, 2, 'DH-001')

    expect(r.ok && r.lugares?.map((l) => l.caixa)).toEqual(['EB-001', 'EB-001'])
  })

  it('e a de Direitos Humanos só vai para a DH', () => {
    const r = alocarNasCaixas(CAIXAS, cheia('EB-001', BANDEIRA, 10), DH, 7, 'EB-001')

    expect(r.ok && r.lugares?.map((l) => `${l.caixa}:${l.posicao}`)).toEqual([
      'DH-001:1',
      'DH-001:2',
      'DH-001:3',
      'DH-001:4',
      'DH-001:5',
      'DH-001:6',
      'DH-001:7',
    ])
  })

  it('usa a posição livre mais baixa, preenchendo buracos', () => {
    const ocupantes = cheia('EB-001', BANDEIRA, 3, 1).concat(cheia('EB-001', BANDEIRA, 2, 6))
    const r = alocarNasCaixas(CAIXAS, ocupantes, BANDEIRA, 2, 'EB-001')

    expect(r.ok && r.lugares?.map((l) => l.posicao)).toEqual([4, 5])
  })

  it('caixa fora de uso é ignorada', () => {
    const r = alocarNasCaixas([caixa('EB-001', 100, BANDEIRA, false), caixa('EB-002', 100, BANDEIRA)], [], BANDEIRA, 1, 'EB-001')

    expect(r.ok && r.lugares?.[0]).toEqual({ caixa: 'EB-002', posicao: 1 })
  })

  it('sem vaga em nenhuma caixa do tipo, o erro diz quantas faltam e o que fazer', () => {
    const ocupantes = [...cheia('EB-001', BANDEIRA, 100), ...cheia('EB-002', BANDEIRA, 99)]
    const r = alocarNasCaixas(CAIXAS, ocupantes, BANDEIRA, 3, 'EB-001')

    expect(r.ok).toBe(false)
    expect(!r.ok && r.erro).toContain('Não há vaga para 2 moeda(s)')
    expect(!r.ok && r.erro).toContain('Cadastre outra')
  })

  it('tipo sem nenhuma caixa cadastrada mantém o comportamento antigo (lugares nulos)', () => {
    expect(alocarNasCaixas(CAIXAS, [], 'Natação', 4, 'XX-9')).toEqual({ ok: true, lugares: null })
  })

  it('caixa sem tipo definido aceita qualquer moeda; sem capacidade, não enche', () => {
    expect(caixaAceitaTipo(caixa('X-1', null, null), BANDEIRA)).toBe(true)
    const r = alocarNasCaixas([caixa('X-1', null, null)], cheia('X-1', DH, 500), BANDEIRA, 1, null)
    expect(r.ok && r.lugares?.[0]).toEqual({ caixa: 'X-1', posicao: 501 })
  })

  it('o código digitado é comparado sem formato: "eb 002" é a EB-002', () => {
    const r = alocarNasCaixas(CAIXAS, [], BANDEIRA, 1, 'eb 002')
    expect(r.ok && r.lugares?.[0]?.caixa).toBe('EB-002')
  })
})

describe('colocarMoeda — o digitado vale quando é válido; senão a moeda é movida', () => {
  const moeda = { codigoMoeda: 'RO-000500', tipoMoeda: BANDEIRA, analise: 'RO-ANL-0500' }

  it('caixa, vaga e posição livres: fica onde o operador pôs', () => {
    const c = colocarMoeda(CAIXAS, [], moeda, { caixa: 'EB-001', posicao: 37 }, null)
    expect(c).toEqual({ ok: true, caixa: 'EB-001', posicao: 37, movida: false })
  })

  it('caixa cheia: a moeda vai para a seguinte e é marcada como movida', () => {
    const c = colocarMoeda(CAIXAS, cheia('EB-001', BANDEIRA, 100), moeda, { caixa: 'EB-001', posicao: 101 }, null)
    expect(c).toEqual({ ok: true, caixa: 'EB-002', posicao: 1, movida: true })
  })

  it('Bandeira digitada na caixa dos Direitos Humanos: vai para a da Bandeira', () => {
    const c = colocarMoeda(CAIXAS, [], moeda, { caixa: 'DH-001', posicao: 5 }, null)
    expect(c).toEqual({ ok: true, caixa: 'EB-001', posicao: 1, movida: true })
  })

  it('posição já ocupada: pega a livre mais baixa da mesma caixa, sem contar como movida', () => {
    const c = colocarMoeda(CAIXAS, cheia('EB-001', BANDEIRA, 3), moeda, { caixa: 'EB-001', posicao: 2 }, null)
    expect(c).toEqual({ ok: true, caixa: 'EB-001', posicao: 4, movida: false })
  })

  it('sem posição digitada, escolhe a próxima da caixa preferida', () => {
    const c = colocarMoeda(CAIXAS, cheia('EB-001', BANDEIRA, 20), moeda, { caixa: null, posicao: null }, 'EB-001')
    expect(c).toEqual({ ok: true, caixa: 'EB-001', posicao: 21, movida: false })
  })

  it('as moedas do mesmo lote enxergam o lugar umas das outras', () => {
    const ocupantes: Ocupante[] = []
    const a = colocarMoeda(CAIXAS, ocupantes, moeda, { caixa: 'EB-001', posicao: null }, 'EB-001')
    const b = colocarMoeda(CAIXAS, ocupantes, { ...moeda, codigoMoeda: 'RO-000501' }, { caixa: 'EB-001', posicao: null }, 'EB-001')
    expect([a, b].map((x) => x.ok && x.posicao)).toEqual([1, 2])
  })

  it('o erro de falta de vaga passa adiante, sem inventar caixa', () => {
    const tudo = [...cheia('EB-001', BANDEIRA, 100), ...cheia('EB-002', BANDEIRA, 100)]
    const c = colocarMoeda(CAIXAS, tudo, moeda, { caixa: 'EB-001', posicao: null }, 'EB-001')
    expect(c.ok).toBe(false)
  })

  it('sem caixa cadastrada para o tipo, o digitado segue como está', () => {
    const c = colocarMoeda(CAIXAS, [], { ...moeda, tipoMoeda: 'Natação' }, { caixa: 'ZZ-1', posicao: 3 }, null)
    expect(c).toEqual({ ok: true, caixa: 'ZZ-1', posicao: 3, movida: false })
  })
})

describe('caixaCorrente respeita o tipo da moeda', () => {
  it('a sugestão para Direitos Humanos nunca é uma caixa da Bandeira', () => {
    const quadro = ocupacaoDasCaixas(CAIXAS, cheia('EB-001', BANDEIRA, 100))
    expect(caixaCorrente(quadro, DH)).toBe('DH-001')
    expect(caixaCorrente(quadro, BANDEIRA)).toBe('EB-002')
  })
})
