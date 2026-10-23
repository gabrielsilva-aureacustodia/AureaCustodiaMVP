/**
 * Migration 044 — a fila das NFS-e nasce na transação do dinheiro (23/10/2026).
 *
 * Contra um Postgres de verdade (PGlite): a negociação grava os dois pedidos de comissão e a fatura que
 * passa a paga grava o de custódia, dentro de `mutarEstado`; a mesma mutação não pede nota duas vezes;
 * fatura em aberto não pede nada; e a fila entrega cada linha a um envio só, com número de DPS que não
 * se repete.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { FaturaCustodia } from '@/domain/types'
import { bancoDeTeste, type BancoDeTeste } from '@/server/admin/testing/pglite'

import { lerEstado, mutarEstado } from './estado'
import {
  gravarAutorizada,
  gravarCancelada,
  inserirPedidosNfse,
  listarEmissoes,
  marcarParaCancelar,
  reivindicarCancelamentos,
  reivindicarParaEnvio,
  reservarNumeroDps,
} from './repositories/nfse'

let banco: BancoDeTeste
let comprador: string
let vendedor: string

function fatura(over: Partial<FaturaCustodia> = {}): FaturaCustodia {
  return {
    id: 'FAT-NFSE-1',
    userEmail: comprador,
    competencia: '2026-10',
    quantidadeMoedas: 1,
    moedaIds: ['RO-000001'],
    valorCents: 200,
    status: 'pendente',
    dataEmissao: Date.UTC(2026, 9, 25, 17),
    dataVencimento: Date.UTC(2026, 10, 25, 3),
    dataPagamento: null,
    formaPagamento: null,
    paymentIntentId: null,
    planoId: null,
    origem: 'entrada_no_acervo',
    coberturaAte: Date.UTC(2026, 10, 25, 3) - 60_000,
    ...over,
  }
}

describe('fila das NFS-e (aurea.nfse_emissoes)', () => {
  beforeAll(async () => {
    banco = await bancoDeTeste()
    const estado = await lerEstado(banco.executar) // semeia as contas — a semeadura não pede nota
    ;[comprador, vendedor] = Object.keys(estado.users)
  }, 120_000)

  afterAll(async () => {
    await banco.fechar()
  })

  it('a semeadura não gera pedido de nota', async () => {
    expect(await banco.executar((tx) => listarEmissoes(tx))).toEqual([])
  })

  it('negociação nova grava os dois pedidos de comissão na mesma transação', async () => {
    const { nfsePedidas } = await mutarEstado(banco.executar, (s) => {
      s.trades.push({
        price: 20_000,
        qty: 1,
        date: Date.UTC(2026, 9, 12, 18, 20),
        buyer: comprador,
        seller: vendedor,
        feeComprador: 200,
        feeVendedor: 200,
        fee: 400,
        tipoMoeda: 'Direitos Humanos',
      })
    })
    expect(nfsePedidas).toBe(2)

    const fila = await banco.executar((tx) => listarEmissoes(tx))
    expect(fila.map((e) => [e.servico, e.tomadorEmail, e.valorCents, e.status, e.competencia]).sort()).toEqual(
      [
        ['intermediacao_compra', comprador, 200, 'pendente', '2026-10-12'],
        ['intermediacao_venda', vendedor, 200, 'pendente', '2026-10-12'],
      ].sort(),
    )
  })

  it('fatura em aberto não pede nota; ao ser paga, pede a de custódia com a data do pagamento', async () => {
    const r1 = await mutarEstado(banco.executar, (s) => {
      s.faturasCustodia = [...(s.faturasCustodia ?? []), fatura()]
    })
    expect(r1.nfsePedidas).toBe(0)

    const pagaEm = Date.UTC(2026, 10, 5, 13, 30)
    const r2 = await mutarEstado(banco.executar, (s) => {
      const f = s.faturasCustodia?.find((x) => x.id === 'FAT-NFSE-1')
      if (f) {
        f.status = 'paga'
        f.dataPagamento = pagaEm
        f.formaPagamento = 'saldo'
      }
    })
    expect(r2.nfsePedidas).toBe(1)

    const [custodia] = await banco.executar((tx) => listarEmissoes(tx, { busca: 'FAT-NFSE-1' }))
    expect(custodia.servico).toBe('custodia')
    expect(custodia.ocorridoEm).toBe(pagaEm)
    expect(custodia.competencia).toBe('2026-11-05')
    expect(custodia.descricao).toBe('CUSTODIA MENSAL - 25/10/2026 A 25/11/2026 - 1 MOEDA - REF FAT-NFSE-1')
  })

  it('o mesmo pedido duas vezes não duplica (chave única)', async () => {
    const [qualquer] = await banco.executar((tx) => listarEmissoes(tx, { busca: 'TRADE-' }))
    const repetido = await banco.executar((tx) =>
      inserirPedidosNfse(
        tx,
        [
          {
            chave: qualquer.chave,
            servico: qualquer.servico,
            refFato: qualquer.refFato,
            tomadorEmail: qualquer.tomadorEmail,
            valorCents: qualquer.valorCents,
            ocorridoEm: qualquer.ocorridoEm,
            competencia: qualquer.competencia,
            descricao: qualquer.descricao,
            quantidadeMoedas: 1,
          },
        ],
        Date.now(),
      ),
    )
    expect(repetido).toBe(0)
  })

  it('a numeração da DPS não repete, e a restrita começa depois das seis notas dos testes de integração', async () => {
    const a = await banco.executar((tx) => reservarNumeroDps(tx, 'restrita', 1))
    const b = await banco.executar((tx) => reservarNumeroDps(tx, 'restrita', 1))
    const p = await banco.executar((tx) => reservarNumeroDps(tx, 'producao', 1))
    expect([a, b, p]).toEqual([7, 8, 1])
  })

  it('reivindicar marca as linhas como "processando" e um segundo envio não as pega de novo', async () => {
    const agora = Date.now()
    const primeiro = await banco.executar((tx) => reivindicarParaEnvio(tx, { limite: 10, agora, ambiente: 'restrita', incluirRejeitadas: false }))
    expect(primeiro).toHaveLength(3)
    const segundo = await banco.executar((tx) => reivindicarParaEnvio(tx, { limite: 10, agora, ambiente: 'restrita', incluirRejeitadas: false }))
    expect(segundo).toHaveLength(0)
    const fila = await banco.executar((tx) => listarEmissoes(tx))
    expect(new Set(fila.map((e) => e.status))).toEqual(new Set(['processando']))
  })

  it('045 — tarifa de saque entra na fila; recusada antes de sair, a nota é cancelada sem ir à Sefin', async () => {
    const agora = Date.now()
    const tarifa = (id: string) => ({
      chave: `tarifa_saque:${id}`,
      servico: 'tarifa_saque' as const,
      refFato: id,
      tomadorEmail: comprador,
      valorCents: 500,
      ocorridoEm: agora,
      competencia: '2026-10-23',
      descricao: `TARIFA DE SAQUE - REF ${id}`,
      quantidadeMoedas: 0,
    })
    expect(await banco.executar((tx) => inserirPedidosNfse(tx, [tarifa('SAQ-A'), tarifa('SAQ-B')], agora))).toBe(2)

    // SAQ-A ainda na fila: cancela direto. SAQ-B já autorizada: vira "cancelando" e espera o evento.
    const [b] = await banco.executar((tx) => listarEmissoes(tx, { busca: 'SAQ-B' }))
    await banco.executar((tx) => gravarAutorizada(tx, b.id, { chaveAcesso: 'CHAVE-B', numeroNfse: '9', xmlNfse: '<NFSe/>', agora }))
    const motivo = { motivo: '2' as const, justificativa: 'Saque recusado' }
    const aEnviar = await banco.executar((tx) =>
      marcarParaCancelar(tx, [{ chave: 'tarifa_saque:SAQ-A', ...motivo }, { chave: 'tarifa_saque:SAQ-B', ...motivo }], agora),
    )
    expect(aEnviar).toBe(1)

    const porRef = async (ref: string) => (await banco.executar((tx) => listarEmissoes(tx, { busca: ref })))[0]
    expect((await porRef('SAQ-A')).status).toBe('cancelada')
    expect((await porRef('SAQ-B')).status).toBe('cancelando')
    expect((await porRef('SAQ-B')).motivoCancelamento).toBe('2|Saque recusado')

    // O envio do evento pega a nota (passado um minuto) e grava o cancelamento.
    const lote = await banco.executar((tx) => reivindicarCancelamentos(tx, 10, agora + 120_000))
    expect(lote.map((e) => e.refFato)).toEqual(['SAQ-B'])
    await banco.executar((tx) => gravarCancelada(tx, b.id, { xmlCancelamento: '<evento/>', agora }))
    expect((await porRef('SAQ-B')).status).toBe('cancelada')
  })

  it('045 — autorização que chega depois do pedido de cancelamento não desfaz o cancelamento', async () => {
    const agora = Date.now()
    await banco.executar((tx) =>
      inserirPedidosNfse(
        tx,
        [{ chave: 'taxa_retirada:RET-1', servico: 'taxa_retirada', refFato: 'RET-1', tomadorEmail: comprador, valorCents: 5_000, ocorridoEm: agora, competencia: '2026-10-23', descricao: 'X', quantidadeMoedas: 1 }],
        agora,
      ),
    )
    const [r] = await banco.executar((tx) => listarEmissoes(tx, { busca: 'RET-1' }))
    await banco.executar((tx) => tx.query(`UPDATE aurea.nfse_emissoes SET status = 'processando' WHERE id = $1`, [r.id]))
    await banco.executar((tx) => marcarParaCancelar(tx, [{ chave: 'taxa_retirada:RET-1', motivo: '9', justificativa: 'Teste' }], agora))
    await banco.executar((tx) => gravarAutorizada(tx, r.id, { chaveAcesso: 'CHAVE-R', numeroNfse: '10', xmlNfse: '<NFSe/>', agora }))
    const [depois] = await banco.executar((tx) => listarEmissoes(tx, { busca: 'RET-1' }))
    expect(depois.status).toBe('cancelando')
    expect(depois.chaveAcesso).toBe('CHAVE-R')
  })
})
