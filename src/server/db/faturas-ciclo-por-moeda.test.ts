/**
 * Migration 039 — o ciclo de custódia é de cada moeda (02/10/2026).
 *
 * O índice único antigo (`faturas_ciclo_uniq` de 018) admitia UMA fatura de ciclo
 * por conta por competência. Com o ciclo por moeda, duas moedas da mesma conta,
 * aceitas em dias diferentes, renovam em dias diferentes dentro do mesmo mês — e
 * a segunda fatura seria recusada pelo banco. Estes testes provam as duas
 * pontas: a segunda fatura agora entra, e a MESMA fatura duas vezes (o cron
 * rodando dobrado) continua barrada.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { FaturaCustodia } from '@/domain/types'
import { bancoDeTeste, type BancoDeTeste } from '@/server/admin/testing/pglite'

import { lerEstado } from './estado'
import { carregarFaturas, inserirFatura } from './repositories/faturas'

let banco: BancoDeTeste
let dono: string

function fatura(id: string, moedaId: string, coberturaAte: number | null): FaturaCustodia {
  return {
    id,
    userEmail: dono,
    competencia: '2026-10',
    quantidadeMoedas: 1,
    moedaIds: [moedaId],
    valorCents: 200,
    status: 'pendente',
    dataEmissao: 1_000,
    dataVencimento: 2_000,
    dataPagamento: null,
    formaPagamento: null,
    paymentIntentId: null,
    planoId: null,
    origem: 'ciclo_mensal',
    coberturaAte,
  }
}

describe('faturas_ciclo_uniq no grão do ciclo por moeda', () => {
  beforeAll(async () => {
    banco = await bancoDeTeste()
    const estado = await lerEstado(banco.executar) // semeia as contas
    dono = Object.keys(estado.users)[0]!
  }, 120_000)

  afterAll(async () => {
    await banco.fechar()
  })

  it('duas faturas de ciclo da mesma conta e competência, de fins de ciclo diferentes, convivem', async () => {
    await banco.executar((tx) => inserirFatura(tx, fatura('FAT-A', 'RO-000001', Date.UTC(2026, 10, 21, 3) - 1)))
    await banco.executar((tx) => inserirFatura(tx, fatura('FAT-B', 'RO-000002', Date.UTC(2026, 10, 28, 3) - 1)))

    const todas = await banco.executar((tx) => carregarFaturas(tx))
    expect(todas.filter((f) => f.competencia === '2026-10' && f.origem === 'ciclo_mensal')).toHaveLength(2)
  })

  it('a mesma fatura de ciclo duas vezes (cron rodando dobrado) é barrada pelo banco', async () => {
    const fim = Date.UTC(2026, 10, 5, 3) - 1
    await banco.executar((tx) => inserirFatura(tx, fatura('FAT-C', 'RO-000003', fim)))

    await expect(banco.executar((tx) => inserirFatura(tx, fatura('FAT-D', 'RO-000003', fim)))).rejects.toThrow()
  })

  it('a cobertura faz a viagem de ida e volta; fatura antiga (sem cobertura) volta nula', async () => {
    await banco.executar((tx) => inserirFatura(tx, fatura('FAT-E', 'RO-000004', Date.UTC(2026, 11, 3, 3) - 1)))
    await banco.executar((tx) => inserirFatura(tx, fatura('FAT-F', 'RO-000005', null)))

    const todas = await banco.executar((tx) => carregarFaturas(tx))
    expect(todas.find((f) => f.id === 'FAT-E')?.coberturaAte).toBe(Date.UTC(2026, 11, 3, 3) - 1)
    expect(todas.find((f) => f.id === 'FAT-F')?.coberturaAte).toBeNull()
  })
})
