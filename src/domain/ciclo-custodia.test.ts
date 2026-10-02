import { describe, expect, it } from 'vitest'

import { cicloDaMoeda, dataBrasilia, lerDataBR } from './ciclo-custodia'

/** 00:00 de Brasília (UTC-3) do dia informado. */
const brasilia = (ano: number, mes: number, dia: number, hora = 0): number =>
  Date.UTC(ano, mes - 1, dia, hora + 3)

describe('cicloDaMoeda — a custódia corre do dia em que a moeda foi aceita', () => {
  it('moeda aceita hoje está no primeiro ciclo: começa hoje, renova no mesmo dia do mês seguinte', () => {
    const agora = brasilia(2026, 10, 2, 9)
    const c = cicloDaMoeda('02/10/2026', agora)

    expect(c.inicio).toBe(brasilia(2026, 10, 2))
    expect(c.fim).toBe(brasilia(2026, 11, 2))
    expect(c.competencia).toBe('2026-10')
  })

  it('o exemplo do Gabriel: aceita em 02/10, a próxima cobrança é em 02/11 — nunca no dia 1º', () => {
    const c = cicloDaMoeda('02/10/2026', brasilia(2026, 10, 25))
    expect(c.fim).toBe(brasilia(2026, 11, 2))
  })

  it('no dia do aniversário o ciclo novo já começou; na véspera ainda é o anterior', () => {
    const naVespera = cicloDaMoeda('21/09/2026', brasilia(2026, 10, 20, 23))
    expect(naVespera.competencia).toBe('2026-09')
    expect(naVespera.fim).toBe(brasilia(2026, 10, 21))

    const noDia = cicloDaMoeda('21/09/2026', brasilia(2026, 10, 21, 0))
    expect(noDia.competencia).toBe('2026-10')
    expect(noDia.inicio).toBe(brasilia(2026, 10, 21))
    expect(noDia.fim).toBe(brasilia(2026, 11, 21))
  })

  it('cada moeda tem o seu dia: aceitas em 21/09 e 28/09 renovam em 21/10 e 28/10', () => {
    const agora = brasilia(2026, 10, 22)
    expect(cicloDaMoeda('21/09/2026', agora).inicio).toBe(brasilia(2026, 10, 21))
    expect(cicloDaMoeda('28/09/2026', agora).inicio).toBe(brasilia(2026, 9, 28))
    expect(cicloDaMoeda('28/09/2026', agora).fim).toBe(brasilia(2026, 10, 28))
  })

  it('vira o ano sem tropeçar', () => {
    const c = cicloDaMoeda('15/12/2026', brasilia(2027, 1, 20))
    expect(c.inicio).toBe(brasilia(2027, 1, 15))
    expect(c.fim).toBe(brasilia(2027, 2, 15))
    expect(c.competencia).toBe('2027-01')
  })

  it('dia 31 cai no último dia dos meses curtos e volta ao 31 depois', () => {
    expect(cicloDaMoeda('31/01/2027', brasilia(2027, 2, 10)).fim).toBe(brasilia(2027, 2, 28))
    expect(cicloDaMoeda('31/01/2027', brasilia(2027, 3, 1)).inicio).toBe(brasilia(2027, 2, 28))
    expect(cicloDaMoeda('31/01/2027', brasilia(2027, 3, 31, 1)).inicio).toBe(brasilia(2027, 3, 31))
    // 2028 é bissexto
    expect(cicloDaMoeda('31/01/2028', brasilia(2028, 2, 10)).fim).toBe(brasilia(2028, 2, 29))
  })

  it('a virada do ciclo é à meia-noite de BRASÍLIA, não de UTC', () => {
    // 21/10 às 22:00 em Brasília já é 22/10 01:00 UTC: ainda é o dia 21 para o cliente.
    const c = cicloDaMoeda('21/09/2026', Date.UTC(2026, 9, 22, 1))
    expect(c.inicio).toBe(brasilia(2026, 10, 21))
    // 20/10 às 23:00 em Brasília ainda é o ciclo anterior, mesmo já sendo 21/10 02:00 UTC.
    const antes = cicloDaMoeda('21/09/2026', Date.UTC(2026, 9, 21, 2))
    expect(antes.competencia).toBe('2026-09')
  })

  it('relógio anterior à entrada devolve o primeiro ciclo, e data ilegível cai no mês-calendário', () => {
    expect(cicloDaMoeda('10/09/2026', brasilia(2026, 1, 1)).inicio).toBe(brasilia(2026, 9, 10))

    const antiga = cicloDaMoeda('Hoje', brasilia(2026, 10, 15))
    expect(antiga.inicio).toBe(brasilia(2026, 10, 1))
    expect(antiga.fim).toBe(brasilia(2026, 11, 1))
    expect(antiga.competencia).toBe('2026-10')
  })

  it('o fim de um ciclo é exatamente o começo do seguinte — nenhum dia fica sem cobertura nem em duplicidade', () => {
    let agora = brasilia(2026, 9, 21, 12)
    let anterior = cicloDaMoeda('21/09/2026', agora)
    for (let i = 0; i < 14; i++) {
      agora = anterior.fim + 1000
      const seguinte = cicloDaMoeda('21/09/2026', agora)
      expect(seguinte.inicio).toBe(anterior.fim)
      anterior = seguinte
    }
  })
})

describe('dataBrasilia / lerDataBR', () => {
  it('a aceitação das 22h de Brasília ainda é do dia, e não do dia seguinte em UTC', () => {
    expect(dataBrasilia(Date.UTC(2026, 9, 3, 1, 0))).toBe('02/10/2026')
    expect(dataBrasilia(Date.UTC(2026, 9, 2, 12, 0))).toBe('02/10/2026')
  })

  it('lê datas válidas e recusa as impossíveis', () => {
    expect(lerDataBR('02/10/2026')).toEqual({ ano: 2026, mes: 10, dia: 2 })
    expect(lerDataBR('31/02/2026')).toBeNull()
    expect(lerDataBR('2026-10-02')).toBeNull()
    expect(lerDataBR('')).toBeNull()
  })
})
