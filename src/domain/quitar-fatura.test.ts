/**
 * Pagar e estornar fatura de custódia pelo caminho único (03/11/2026).
 *
 * O estorno nasceu da "renovação de plano" de 01/11/2026, que debitou R$ 2,00 do Rogério por um envio sem
 * moeda nenhuma. O Gabriel: "devolve a cobrança do Rogério e cancela a nota fiscal".
 */

import { describe, expect, it } from 'vitest'

import { cancelamentosDeNfse, pedidosDeNfse } from '@/domain/nfse/pedidos'
import { estornarFaturaPaga, pagarFaturaComSaldoNoEstado, quitarFatura } from '@/domain/quitar-fatura'
import type { AppState, FaturaCustodia } from '@/domain/types'

const ROGERIO = 'rogerio@exemplo.com.br'

function cenario(fatura: Partial<FaturaCustodia> = {}): AppState {
  return {
    users: { [ROGERIO]: { name: 'Rogério', balance: 1_000, coins: [], inadimplente: false } },
    sellOffers: [],
    buyOrders: [],
    trades: [],
    envios: [],
    seq: { coin: 0, envio: 0 },
    deposits: [],
    analises: [],
    faturasCustodia: [
      {
        id: 'FAT-2026-11-rogerio-REN-1793520794616',
        userEmail: ROGERIO,
        competencia: '2026-11',
        quantidadeMoedas: 1,
        moedaIds: [],
        valorCents: 200,
        status: 'paga',
        dataEmissao: 1,
        dataVencimento: 2,
        dataPagamento: 1,
        formaPagamento: 'saldo',
        planoId: 'PLC-000010',
        origem: 'renovacao_anual',
        ...fatura,
      },
    ],
    planosCustodia: [],
  }
}

describe('estornarFaturaPaga', () => {
  it('devolve o valor ao saldo e cancela a fatura', () => {
    const s = cenario()
    const r = estornarFaturaPaga(s, 'FAT-2026-11-rogerio-REN-1793520794616')

    expect(r.ok).toBe(true)
    expect(s.users[ROGERIO]!.balance).toBe(1_200)
    expect(s.faturasCustodia![0]!.status).toBe('cancelada')
  })

  it('pede o cancelamento da NFS-e da fatura, por serviço não prestado, e não pede nota nova', () => {
    const antes = cenario()
    const depois = structuredClone(antes)
    estornarFaturaPaga(depois, 'FAT-2026-11-rogerio-REN-1793520794616')

    expect(cancelamentosDeNfse(antes, depois)).toEqual([
      expect.objectContaining({ chave: 'custodia:FAT-2026-11-rogerio-REN-1793520794616', motivo: '2' }),
    ])
    expect(pedidosDeNfse(antes, depois, 10)).toEqual([])
  })

  it('só estorna fatura paga: em aberto ou já cancelada não tem o que devolver', () => {
    expect(estornarFaturaPaga(cenario({ status: 'pendente' }), 'FAT-2026-11-rogerio-REN-1793520794616').ok).toBe(false)
    expect(estornarFaturaPaga(cenario({ status: 'cancelada' }), 'FAT-2026-11-rogerio-REN-1793520794616').ok).toBe(false)
    expect(estornarFaturaPaga(cenario(), 'FAT-INEXISTENTE').ok).toBe(false)
  })

  it('cancelar uma fatura que NÃO foi paga não cancela nota nenhuma', () => {
    const antes = cenario({ status: 'pendente' })
    const depois = structuredClone(antes)
    depois.faturasCustodia![0]!.status = 'cancelada'
    expect(cancelamentosDeNfse(antes, depois)).toEqual([])
  })
})

describe('quitarFatura e pagarFaturaComSaldoNoEstado', () => {
  it('pagar com saldo debita, marca paga e pede a nota com a hora do pagamento', () => {
    const antes = cenario({ status: 'pendente', dataPagamento: null, formaPagamento: null, origem: 'ciclo_mensal', planoId: null })
    const depois = structuredClone(antes)
    const r = pagarFaturaComSaldoNoEstado(depois, ROGERIO, 'FAT-2026-11-rogerio-REN-1793520794616', 5_000)

    expect(r.ok).toBe(true)
    expect(depois.users[ROGERIO]!.balance).toBe(800)
    expect(depois.faturasCustodia![0]).toMatchObject({ status: 'paga', dataPagamento: 5_000, formaPagamento: 'saldo' })
    expect(pedidosDeNfse(antes, depois, 9_999)).toEqual([expect.objectContaining({ chave: 'custodia:FAT-2026-11-rogerio-REN-1793520794616', ocorridoEm: 5_000 })])
  })

  it('saldo insuficiente não paga nada', () => {
    const s = cenario({ status: 'pendente', valorCents: 5_000 })
    expect(pagarFaturaComSaldoNoEstado(s, ROGERIO, 'FAT-2026-11-rogerio-REN-1793520794616', 1).ok).toBe(false)
    expect(s.users[ROGERIO]!.balance).toBe(1_000)
    expect(s.faturasCustodia![0]!.status).toBe('pendente')
  })

  it('o pagamento antecipado do envio põe o plano em vigor e guarda a referência do gateway', () => {
    const s = cenario({ status: 'pendente', origem: 'contratacao', competencia: '2026-10' })
    s.planosCustodia = [
      {
        id: 'PLC-000010',
        userEmail: ROGERIO,
        protocoloEnvio: 'RO-ENV-0017',
        modalidade: 'mensal',
        quantidadeContratada: 1,
        moedaIds: [],
        valorPorMoedaCents: 200,
        valorTotalCents: 200,
        parcelasMax: 1,
        inicioCompetencia: '2026-10',
        pagoAteCompetencia: null,
        status: 'aguardando_pagamento',
        formaPagamento: null,
        paymentIntentRef: null,
        assinaturaId: null,
        estornadoCents: 0,
        criadoEm: 0,
        atualizadoEm: 0,
      },
    ]
    quitarFatura(s, s.faturasCustodia![0]!, 'pix', 7_000, 'FAT-ref-gateway')

    expect(s.planosCustodia[0]).toMatchObject({ status: 'vigente', formaPagamento: 'pix', paymentIntentRef: 'FAT-ref-gateway', pagoAteCompetencia: '2026-10' })
    expect(s.faturasCustodia![0]!.paymentIntentId).toBe('FAT-ref-gateway')
  })
})
