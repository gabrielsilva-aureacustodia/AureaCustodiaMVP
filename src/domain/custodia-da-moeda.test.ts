/**
 * A regra única da custódia (03/11/2026): trava, tela e cobrança dão a MESMA data, moeda por moeda.
 *
 * O defeito que este arquivo guarda: em 03/11/2026 a moeda RO-000182 do Sidnei tinha três respostas ao
 * mesmo tempo — a trava dizia "pago até 31/10", a tela 29/11 e a próxima cobrança 30/12. Cada uma vinha de
 * uma função diferente. Aqui, um acervo variado anda dia a dia por quatro meses, com o cron cobrando e o
 * cliente pagando, e em TODO dia, para TODA moeda, as respostas têm de bater.
 */

import { describe, expect, it } from 'vitest'

import { cicloDaMoeda, dataBrasilia, inicioDoDiaBrasilia } from '@/domain/ciclo-custodia'
import { emitirFaturasDosCiclos } from '@/domain/cobranca-de-entrada'
import {
  custodiaImpedeNegociar,
  custodiaPagaAte,
  proximaCobrancaDaMoeda,
  travaDaCustodiaEm,
} from '@/domain/custodia-da-moeda'
import { resumoDaCustodia } from '@/domain/custodia-do-cliente'
import { quitarFatura } from '@/domain/quitar-fatura'
import type { AppState, Coin, User } from '@/domain/types'

const DIA = 86_400_000
const DONO = 'dono@exemplo.com.br'
/** 05:00 de Brasília, o horário do cron diário. */
const cron = (ano: number, mes: number, dia: number): number => Date.UTC(ano, mes - 1, dia, 8)

function moeda(id: string, entrada: string, protocolo: string): Coin {
  return {
    id,
    tipoMoeda: 'Entrega da Bandeira Olímpica',
    ano: 2016,
    entrada,
    statusFisico: 'Armazenado',
    statusDigital: 'Validado',
    valorEstimado: 20_000,
    protocolo,
    recibo: { codigo: `REC-${id}`, hash: 'h', dataEmissao: entrada, status: 'Ativo' },
  }
}

function acervo(): AppState {
  // Aniversários que pegam os cantos do calendário: dia 31 (cai no último dia do mês curto), dia 30
  // (o do Sidnei), dia 1º e dia 29 em fevereiro de ano não bissexto.
  const user: User = {
    name: 'Dono',
    balance: 0,
    coins: [
      moeda('RO-000001', '31/10/2026', 'RO-ENV-0001'),
      moeda('RO-000002', '30/10/2026', 'RO-ENV-0019'),
      moeda('RO-000003', '01/11/2026', 'RO-DIR-0001'),
      moeda('RO-000004', '29/11/2026', 'RO-DIR-0002'),
    ],
    inadimplente: false,
  }
  return {
    users: { [DONO]: user },
    sellOffers: [],
    buyOrders: [],
    trades: [],
    envios: [],
    seq: { coin: 0, envio: 0 },
    deposits: [],
    analises: [],
    faturasCustodia: [],
    planosCustodia: [],
  }
}

/** As três respostas de uma moeda num instante, e se elas concordam. */
function conferir(s: AppState, coin: Coin, agora: number): void {
  const pagaAte = custodiaPagaAte(s, coin.id)
  const trava = custodiaImpedeNegociar(s, coin.id, agora)
  if (pagaAte === null) {
    expect(trava, `${coin.id} nunca paga tem de travar`).toBe(true)
    return
  }
  // A trava é a data "paga até" + o dia da cobrança: nem antes, nem depois.
  expect(trava, `${coin.id} em ${dataBrasilia(agora)}`).toBe(agora > travaDaCustodiaEm(pagaAte))
  // A cobertura é sempre o fim de um ciclo da própria moeda: o instante seguinte é um aniversário dela.
  const aniversario = cicloDaMoeda(coin.entrada, pagaAte + 1)
  expect(aniversario.inicio, `${coin.id}: "paga até" fora do ciclo`).toBe(pagaAte + 1)
}

describe('a regra única: trava, tela e cobrança contam a mesma história', () => {
  it('quatro meses dia a dia, com o cron cobrando e o cliente pagando no dia seguinte', () => {
    const s = acervo()
    const u = s.users[DONO]!
    // A entrada de cada moeda emite a fatura do primeiro ciclo, como o aceite faz.
    for (const c of u.coins) emitirFaturasDosCiclos(s, DONO, 'entrada_no_acervo', undefined, inicioDoDiaBrasilia(c.entrada)! + 9 * 3_600_000, [c.id])

    for (let t = cron(2026, 10, 30); t <= cron(2027, 3, 1); t += DIA) {
      const moedasNoAcervo = u.coins.filter((c) => (inicioDoDiaBrasilia(c.entrada) ?? 0) <= t)

      // 1) O cron de hoje só cobra moeda cuja próxima cobrança já chegou — e depois dele, ela fica no futuro.
      const devidas = new Set(moedasNoAcervo.filter((c) => proximaCobrancaDaMoeda(s, c, t) <= t).map((c) => c.id))
      const emitidas = emitirFaturasDosCiclos(s, DONO, 'ciclo_mensal', undefined, t)
      const cobradas = new Set(emitidas.flatMap((f) => f.moedaIds).filter((id) => moedasNoAcervo.some((c) => c.id === id)))
      expect([...cobradas].sort(), `cron de ${dataBrasilia(t)}`).toEqual([...devidas].sort())
      for (const c of moedasNoAcervo) expect(proximaCobrancaDaMoeda(s, c, t)).toBeGreaterThan(t)

      // 2) Em todas as moedas, a trava bate com a data "paga até".
      for (const c of moedasNoAcervo) conferir(s, c, t)

      // 3) O cliente paga tudo o que está em aberto no dia seguinte à emissão (antes da trava).
      for (const f of s.faturasCustodia!) {
        if (f.status === 'pendente' && f.dataEmissao <= t - DIA) quitarFatura(s, f, 'pix', t)
      }

      // 4) Com tudo pago, "paga até" + 1 instante É a próxima cobrança, e nenhuma moeda trava.
      for (const c of moedasNoAcervo) {
        const pagaAte = custodiaPagaAte(s, c.id)
        if (pagaAte === null) continue
        const abertas = s.faturasCustodia!.some((f) => f.status === 'pendente' && f.moedaIds.includes(c.id))
        if (!abertas) {
          expect(proximaCobrancaDaMoeda(s, c, t), `${c.id} em ${dataBrasilia(t)}`).toBe(pagaAte + 1)
          expect(custodiaImpedeNegociar(s, c.id, t)).toBe(false)
        }
      }

      // 5) A tela mostra, como cobertura da conta, a MENOR data "paga até" — a mesma da trava.
      const r = resumoDaCustodia(s, DONO, 200, t)
      const pagas = moedasNoAcervo.map((c) => custodiaPagaAte(s, c.id)).filter((x): x is number => x !== null)
      if (pagas.length === u.coins.length) expect(r.cobertaAte).toBe(Math.min(...pagas))
    }
  })

  it('NUNCA há fatura emitida num dia 1º para moeda que não fez aniversário no dia 1º', () => {
    const s = acervo()
    for (const c of s.users[DONO]!.coins) emitirFaturasDosCiclos(s, DONO, 'entrada_no_acervo', undefined, inicioDoDiaBrasilia(c.entrada)! + 9 * 3_600_000, [c.id])
    for (let t = cron(2026, 11, 2); t <= cron(2027, 6, 1); t += DIA) {
      for (const f of emitirFaturasDosCiclos(s, DONO, 'ciclo_mensal', undefined, t)) quitarFatura(s, f, 'pix', t)
    }
    for (const f of s.faturasCustodia!.filter((x) => x.origem === 'ciclo_mensal')) {
      const diaDaEmissao = dataBrasilia(f.dataEmissao).slice(0, 2)
      if (diaDaEmissao === '01') expect(f.moedaIds).toEqual(['RO-000003']) // a única aceita num dia 1º
    }
  })

  it('quem não paga trava às 00:00 do dia seguinte ao da cobrança, e paga destrava na hora', () => {
    const s = acervo()
    const sidnei = s.users[DONO]!.coins[1]! // aceita em 30/10
    const [entrada] = emitirFaturasDosCiclos(s, DONO, 'entrada_no_acervo', undefined, cron(2026, 10, 30), [sidnei.id])
    quitarFatura(s, entrada!, 'pix', cron(2026, 10, 30))

    expect(custodiaPagaAte(s, sidnei.id)).toBe(Date.UTC(2026, 10, 30, 3) - 1) // 29/11, 23:59
    expect(custodiaImpedeNegociar(s, sidnei.id, Date.UTC(2026, 11, 1, 2, 59))).toBe(false) // 30/11, 23:59
    expect(custodiaImpedeNegociar(s, sidnei.id, Date.UTC(2026, 11, 1, 3, 1))).toBe(true) // 01/12, 00:01

    const [ciclo2] = emitirFaturasDosCiclos(s, DONO, 'ciclo_mensal', undefined, cron(2026, 11, 30), [sidnei.id])
    quitarFatura(s, ciclo2!, 'saldo', Date.UTC(2026, 11, 2, 15))
    expect(custodiaImpedeNegociar(s, sidnei.id, Date.UTC(2026, 11, 2, 15))).toBe(false)
    expect(proximaCobrancaDaMoeda(s, sidnei, Date.UTC(2026, 11, 2, 15))).toBe(Date.UTC(2026, 11, 30, 3)) // 30/12
  })
})
