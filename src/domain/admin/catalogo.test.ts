import { describe, expect, it } from 'vitest'

import { COIN_TYPES, coinTypeInfo, isNegociavel, tiposAtivos, tiposNegociaveis } from '@/domain/constants'

import { camposDoTipoAlterados, catalogoDasLinhas, linhasIniciaisDoCatalogo, validarTipoMoeda, type EntradaTipoMoeda } from './catalogo'

const NOVO: EntradaTipoMoeda = { chave: 'Paralímpicos 2016', anoPadrao: '2016', tiragem: '20.000', categoria: 'Moedas Olímpicas', negociavel: true, detail: 'Rio 2016', ord: '15', ativo: true }

describe('validação do tipo de moeda', () => {
  it('aceita o nome com acento e travessão do catálogo, e normaliza espaços', () => {
    expect(validarTipoMoeda({ ...NOVO, chave: '  Rio 2016 –  Estádio ' }, [], true)).toMatchObject({ ok: true, tipo: { chave: 'Rio 2016 – Estádio' } })
  })

  it('recusa nome repetido sem olhar maiúscula, e edição de tipo que não existe', () => {
    expect(validarTipoMoeda({ ...NOVO, chave: 'vôlei' }, [{ chave: 'Vôlei' }], true).ok).toBe(false)
    expect(validarTipoMoeda({ ...NOVO, chave: 'Inexistente' }, [{ chave: 'Vôlei' }], false).ok).toBe(false)
  })

  it('na edição, vale a grafia gravada da chave — ela está nas moedas', () => {
    expect(validarTipoMoeda({ ...NOVO, chave: 'VÔLEI' }, [{ chave: 'Vôlei' }], false)).toMatchObject({ ok: true, tipo: { chave: 'Vôlei' } })
  })

  it('ano, ordem e tamanhos', () => {
    expect(validarTipoMoeda({ ...NOVO, anoPadrao: '1850' }, [], true).ok).toBe(false)
    expect(validarTipoMoeda({ ...NOVO, ord: '-1' }, [], true).ok).toBe(false)
    expect(validarTipoMoeda({ ...NOVO, categoria: 'X' }, [], true).ok).toBe(false)
    expect(validarTipoMoeda({ ...NOVO, detail: 'x'.repeat(201) }, [], true).ok).toBe(false)
  })
})

describe('catálogo vigente', () => {
  it('tabela vazia vira COIN_TYPES; a semeadura mantém a ordem do código', () => {
    expect(catalogoDasLinhas([]).map((t) => t.key)).toEqual(COIN_TYPES.map((t) => t.key))
    const linhas = linhasIniciaisDoCatalogo()
    expect(linhas[0]).toMatchObject({ chave: 'Entrega da Bandeira Olímpica', ord: 10, negociavel: true, ativo: true })
    expect(catalogoDasLinhas(linhas).map((t) => t.key)).toEqual(COIN_TYPES.map((t) => t.key))
  })

  it('isNegociavel, coinTypeInfo e tiposAtivos respondem pelo catálogo passado, não pelo do código', () => {
    const linhas = linhasIniciaisDoCatalogo().map((l) => (l.chave === 'Vôlei' ? { ...l, negociavel: true, ord: 1 } : l.chave === 'Atletismo' ? { ...l, ativo: false } : l))
    const catalogo = catalogoDasLinhas([...linhas, { ...linhasIniciaisDoCatalogo()[0], chave: 'Paralímpicos 2016', ord: 5, detail: 'Rio 2016 · paralímpica' }])
    expect(isNegociavel('Vôlei')).toBe(false)
    expect(isNegociavel('Vôlei', catalogo)).toBe(true)
    expect(tiposNegociaveis(catalogo)[0].key).toBe('Vôlei')
    expect(coinTypeInfo('Paralímpicos 2016', catalogo).detail).toBe('Rio 2016 · paralímpica')
    expect(tiposAtivos(catalogo).some((t) => t.key === 'Atletismo')).toBe(false)
    // Tipo que o catálogo passado não conhece continua com a ficha do código, em vez de virar a Bandeira.
    expect(coinTypeInfo('Natação', catalogoDasLinhas([])).detail).toContain('16.800')
  })

  it('campos alterados, para a trilha', () => {
    const [a] = linhasIniciaisDoCatalogo()
    expect(camposDoTipoAlterados(a, { ...a, negociavel: false, ord: 99 })).toEqual(['negociavel', 'ord'])
    expect(camposDoTipoAlterados(a, { ...a })).toEqual([])
  })
})
