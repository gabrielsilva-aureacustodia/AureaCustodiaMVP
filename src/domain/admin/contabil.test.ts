import { describe, expect, it } from 'vitest'

import { LANCAMENTO_MAX, dataDeInput, validarAliquota, validarEstorno, validarLancamento } from './contabil'

describe('dataDeInput', () => {
  it('meio-dia local, para o lançamento não mudar de mês em UTC', () => {
    const t = dataDeInput('2026-09-01')
    expect(t).toBe(new Date(2026, 8, 1, 12).getTime())
  })

  it('recusa formato errado e data que não existe', () => {
    expect(dataDeInput('01/09/2026')).toBeNull()
    expect(dataDeInput('2026-02-31')).toBeNull()
    expect(dataDeInput(20260901)).toBeNull()
  })
})

describe('validarLancamento', () => {
  const ok = { dataISO: '2026-09-01', contaCodigo: '4.1.03', descricao: ' Aluguel do cofre ', valorCents: 150000 }

  it('aceita despesa em conta manual e limpa a descrição', () => {
    const r = validarLancamento(ok)
    expect(r).toMatchObject({ ok: true, valor: { descricao: 'Aluguel do cofre', valor: 150000, conta: { codigo: '4.1.03' } } })
  })

  it('recusa conta automática, conta inventada, descrição curta, valor zero, NaN e acima do teto', () => {
    expect(validarLancamento({ ...ok, contaCodigo: '3.1.01' }).ok).toBe(false)
    expect(validarLancamento({ ...ok, contaCodigo: '9.9.99' }).ok).toBe(false)
    expect(validarLancamento({ ...ok, descricao: 'ab' }).ok).toBe(false)
    expect(validarLancamento({ ...ok, valorCents: 0 }).ok).toBe(false)
    expect(validarLancamento({ ...ok, valorCents: Number.NaN }).ok).toBe(false)
    expect(validarLancamento({ ...ok, valorCents: LANCAMENTO_MAX + 1 }).ok).toBe(false)
    expect(validarLancamento({ ...ok, valorCents: LANCAMENTO_MAX }).ok).toBe(true)
  })
})

describe('validarEstorno', () => {
  it('pede id inteiro positivo e motivo', () => {
    expect(validarEstorno(3, 'lançado em duplicidade')).toEqual({ ok: true, valor: { id: 3, motivo: 'lançado em duplicidade' } })
    expect(validarEstorno(0, 'motivo').ok).toBe(false)
    expect(validarEstorno(2.5, 'motivo').ok).toBe(false)
    expect(validarEstorno(3, ' x ').ok).toBe(false)
  })
})

describe('validarAliquota', () => {
  it('pontos-base de 0 a 10000; centavos sem teto; null limpa', () => {
    expect(validarAliquota('issBp', 500)).toMatchObject({ ok: true, valor: { chave: 'issBp', valor: 500, unidade: 'bp' } })
    expect(validarAliquota('issBp', 10001).ok).toBe(false)
    expect(validarAliquota('issBp', 1.5).ok).toBe(false)
    expect(validarAliquota('irpjAdicionalLimiteMensal', 2_000_000)).toMatchObject({ ok: true, valor: { unidade: 'centavos' } })
    expect(validarAliquota('issBp', null)).toMatchObject({ ok: true, valor: { valor: null } })
    expect(validarAliquota('aliquotaInventada', 10).ok).toBe(false)
  })
})
