import { describe, expect, it } from 'vitest'

import { consultaDoPeriodo, lerPeriodo, primeiroValor } from './periodo'

const AGORA = new Date(2026, 8, 14, 10, 0, 0).getTime() // 14/09/2026

describe('lerPeriodo', () => {
  it('sem parâmetro nenhum: o ano corrente inteiro', () => {
    const p = lerPeriodo({}, AGORA)
    expect(p).toMatchObject({ ano: 2026, mes: null, trimestre: null })
    expect(p.periodo.rotulo).toBe('exercício de 2026')
    expect(consultaDoPeriodo(p)).toBe('ano=2026')
  })

  it('mês vale sobre trimestre, como nas rotas de exportação', () => {
    const p = lerPeriodo({ ano: '2026', mes: '8', trimestre: '1' }, AGORA)
    expect(p).toMatchObject({ mes: 8, trimestre: null })
    expect(p.periodo.rotulo).toBe('agosto de 2026')
    expect(p.periodo.inicio).toBe(new Date(2026, 7, 1).getTime())
    expect(p.periodo.fim).toBe(new Date(2026, 8, 1).getTime())
    expect(consultaDoPeriodo(p)).toBe('ano=2026&mes=8')
  })

  it('trimestre sem mês recorta os três meses', () => {
    const p = lerPeriodo({ trimestre: '3' }, AGORA)
    expect(p.periodo).toMatchObject({ meses: 3, rotulo: '3º trimestre de 2026' })
    expect(consultaDoPeriodo(p)).toBe('ano=2026&trimestre=3')
  })

  it('valor fora da faixa ou malformado é ignorado, não corrigido', () => {
    expect(lerPeriodo({ ano: '1999', mes: '13', trimestre: '5' }, AGORA)).toMatchObject({ ano: 2026, mes: null, trimestre: null })
    expect(lerPeriodo({ ano: '2026abc', mes: '8.5' }, AGORA)).toMatchObject({ ano: 2026, mes: null })
  })

  it('parâmetro repetido: vale o primeiro', () => {
    expect(primeiroValor(['2025', '2026'])).toBe('2025')
    expect(lerPeriodo({ ano: ['2025', '2026'] }, AGORA).ano).toBe(2025)
  })
})
