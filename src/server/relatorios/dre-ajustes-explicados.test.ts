/**
 * O aviso "ajustes precisam de explicação" da DRE considera a trilha do painel (21/10/2026).
 *
 * O caso do Gerais: o ledger tem dois `ajuste` (-R$ 2,00 do ajuste manual e +R$ 2,00 da regularização da
 * custódia) e a trilha de auditoria guarda o motivo de cada um. A DRE não pode pedir explicação de quem já tem.
 */

import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { PARAMETROS_VAZIOS, periodoMensal } from '@/domain/dre'
import { seedState } from '@/domain/seed'
import type { EntradaAuditoriaGravada } from '@/server/db/repositories/auditoria'

import { montarDreDasFontes, type Fontes } from './dados'

const GERAIS = 'geraisseguros@gmail.com'
const T1 = new Date(2026, 9, 21, 15, 0, 0).getTime()
const T2 = T1 + 60 * 60 * 1000

function ajuste(id: number, createdAt: number, sinal: 1 | -1): Fontes['ledger'][number] {
  return {
    id,
    createdAt,
    userEmail: GERAIS,
    tipo: 'ajuste',
    valor: 200,
    sinal,
    tipoMoeda: null,
    quantidade: null,
    refInterna: null,
    refExterna: null,
    descricao: 'Variação de saldo não explicada por negociação, depósito ou abertura',
    saldoApos: 9150,
    hashAnterior: `h${id - 1}`,
    hash: `h${id}`,
  }
}

function trilha(id: number, createdAt: number, acao: string, motivo: string): EntradaAuditoriaGravada {
  return { id, createdAt, ator: 'gabriel.silva@aureacustodia.com.br', acao, entidade: null, entidadeId: null, usuariosAfetados: [GERAIS], detalhes: { motivo } }
}

function fontes(auditoria: EntradaAuditoriaGravada[]): Fontes {
  return {
    state: seedState(),
    ledger: [ajuste(308, T1, -1), ajuste(310, T2, 1)],
    auditoria,
    manuaisTodos: [],
    manuaisVigentes: [],
    parametros: { ...PARAMETROS_VAZIOS },
    parametrosLista: [],
    saldosLedger: {},
    exportacoes: [],
    retiradas: [],
    recebimentos: [],
    semBanco: false,
  }
}

describe('montarDreDasFontes — ajustes explicados pela trilha', () => {
  const periodo = periodoMensal(2026, 10)

  it('sem motivo na trilha, os dois ajustes são pendência', () => {
    const dre = montarDreDasFontes(fontes([]), periodo)
    expect(dre.pendencias.some((p) => p.startsWith('2 lançamento(s) de ajuste'))).toBe(true)
    expect(dre.analise.ajustesExplicados).toBe(0)
  })

  it('com o motivo de cada um na trilha do painel, a pendência some', () => {
    const dre = montarDreDasFontes(
      fontes([
        trilha(1, T1 - 80, 'admin.usuarios.ajustar_saldo', 'Cobrança retroativa de custódia não paga'),
        trilha(2, T2 + 900, 'admin.custodia.regularizar_compra', 'Custódia do 1º mês da RO-000011 registrada como fatura paga'),
      ]),
      periodo,
    )
    expect(dre.pendencias.some((p) => p.includes('ajuste'))).toBe(false)
    expect(dre.analise.ajustesNaoExplicados).toBe(0)
    expect(dre.analise.ajustesExplicados).toBe(2)
  })

  it('explica só o que tem motivo: um dos dois sem trilha continua pendente', () => {
    const dre = montarDreDasFontes(fontes([trilha(1, T1 - 80, 'admin.usuarios.ajustar_saldo', 'Cobrança retroativa de custódia não paga')]), periodo)
    expect(dre.pendencias.some((p) => p.startsWith('1 lançamento(s) de ajuste'))).toBe(true)
    expect(dre.analise.ajustesExplicados).toBe(1)
    expect(dre.analise.ajustesNaoExplicados).toBe(200)
  })
})
