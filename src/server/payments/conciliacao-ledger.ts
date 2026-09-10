import 'server-only'

/**
 * Módulo de Auditoria e Conciliação Gateway × Ledger × Custódia Física.
 *
 * RESPONSABILIDADE:
 *  - Conferir que o saldo de cada conta bate com a soma do livro-razão (ledger).
 *  - Somar o que entrou pelo gateway, o que está pendente e o que foi recusado.
 *  - Apurar receitas da empresa (taxas de custódia + comissões de corretagem).
 *  - Mapear a esteira física de recebimento e avaliação de moedas na Central de Custódia.
 *
 * O QUE "CONCILIADO" SIGNIFICA AQUI (mudado em 03/09/2026)
 * -----------------------------------------------------
 * Até 03/09 a discrepância era |depósitos do gateway − saldo total dos usuários|.
 * Isso nunca fecha: o saldo total inclui os saldos iniciais do seed e as
 * negociações entre contas, que não passam pelo gateway — o relatório acusaria
 * "discrepância" todo dia, e alarme que dispara sempre é alarme que ninguém lê.
 *
 * A conferência certa é a do M4: para cada conta, `users.balance` tem de ser
 * igual à soma do ledger (`saldo_apos` acumulado). Sem banco não há ledger, e
 * o relatório diz `nao_verificavel` em vez de fingir que conciliou.
 */

import { tradeFee } from '@/domain/fees'
import type { Cents, Timestamp } from '@/domain/types'
import { bancoConfigurado, executarNoBanco } from '@/server/db/client'
import { saldosPeloLedger } from '@/server/db/repositories/ledger'
import { getState } from '@/server/state'

import { repositorioIntencoes } from './repositorios'

export interface RelatorioConciliacaoFinanceira {
  geradoEm: Timestamp
  financeiro: {
    totalSaldoUsuariosCents: Cents
    /** Intenções creditadas pelo webhook do gateway. */
    totalDepositadoGatewayCents: Cents
    /** Todos os depósitos registrados no estado — simulados e do gateway. */
    totalDepositosRegistradosCents: Cents
    totalIntencoesPendentesCents: Cents
    totalIntencoesRecusadasCents: Cents
    totalTaxasCustodiaCents: Cents
    totalComissoesTradesCents: Cents
    totalReceitaEmpresaCents: Cents
    /** Soma de |saldo da conta − soma do ledger| sobre todas as contas. */
    discrepanciaCents: Cents
    /** Contas cujo saldo não bate com o livro. Vazio quando conciliado. */
    contasDivergentes: Array<{ email: string; saldo: Cents; ledger: Cents }>
    statusConciliacao: 'conciliado' | 'discrepancia_detectada' | 'nao_verificavel'
  }
  moedasECustodia: {
    totalMoedasCustodiadas: number
    recibosNftAtivos: number
    enviosEmTransito: number
    enviosRecebidosNaCentral: number
    enviosConcluidos: number
    esteiraStatus: {
      recebidas: number
      armazenadasNoCofre: number
      disponiveisParaNegociacao: number
      emOrdemDeVenda: number
    }
  }
}

/**
 * Gera o relatório consolidado de conciliação financeira e custódia.
 */
export async function gerarRelatorioConciliacao(): Promise<RelatorioConciliacaoFinanceira> {
  const state = await getState()
  const intencoesRepo = repositorioIntencoes()
  const todasIntencoes = await intencoesRepo.listar()

  // 1. Apuração de Saldo dos Usuários
  const totalSaldoUsuariosCents = Object.values(state.users).reduce(
    (acc, u) => acc + (u.balance || 0),
    0,
  )

  // 2. Apuração de Depósitos e Intenções do Gateway
  let totalDepositadoGatewayCents = 0
  let totalIntencoesPendentesCents = 0
  let totalIntencoesRecusadasCents = 0

  for (const intencao of todasIntencoes) {
    if (intencao.status === 'creditado') {
      totalDepositadoGatewayCents += intencao.valor
    } else if (intencao.status === 'pendente' || intencao.status === 'creditando') {
      totalIntencoesPendentesCents += intencao.valor
    } else if (intencao.status === 'recusado') {
      totalIntencoesRecusadasCents += intencao.valor
    }
  }

  // Depósitos do estado incluem os simulados E os creditados pelo gateway (a
  // conciliação também os grava lá). Ficam separados do gateway de propósito.
  const totalDepositosRegistradosCents = state.deposits.reduce((acc, d) => acc + d.valor, 0)

  // 3. Apuração de Receitas da Áurea Custódia
  const totalTaxasCustodiaCents = Object.values(state.custodyCharges).reduce(
    (acc, c) => acc + (c.valorCobrado || 0),
    0,
  )

  // `fee` só existe gravada quando o estado veio do banco; no seed em memória
  // ela é `undefined`, e `t.fee || 0` zerava a receita inteira. A regra é a
  // mesma de `normalizarTrade` em db/diff.ts: o que está gravado vale, senão
  // a comissão que o motor cobrou.
  const totalComissoesTradesCents = state.trades.reduce(
    (acc, t) => acc + (t.fee ?? tradeFee(t.price) * (t.qty || 1)),
    0,
  )

  const totalReceitaEmpresaCents = totalTaxasCustodiaCents + totalComissoesTradesCents

  // A conferência que vale: saldo de cada conta × soma do livro-razão.
  const contasDivergentes: Array<{ email: string; saldo: Cents; ledger: Cents }> = []
  let discrepanciaCents = 0
  let statusConciliacao: RelatorioConciliacaoFinanceira['financeiro']['statusConciliacao'] = 'nao_verificavel'
  if (bancoConfigurado()) {
    const saldosLedger = await executarNoBanco((tx) => saldosPeloLedger(tx))
    for (const [email, u] of Object.entries(state.users)) {
      const ledger = saldosLedger[email] ?? 0
      if (ledger !== u.balance) {
        contasDivergentes.push({ email, saldo: u.balance, ledger })
        discrepanciaCents += Math.abs(u.balance - ledger)
      }
    }
    statusConciliacao = discrepanciaCents === 0 ? 'conciliado' : 'discrepancia_detectada'
  }

  // 4. Mapeamento de Moedas e Trilha de Avaliação Física
  const allCoins = Object.values(state.users).flatMap((u) => u.coins || [])
  const totalMoedasCustodiadas = allCoins.length
  const recibosNftAtivos = allCoins.filter((c) => c.recibo?.status === 'Ativo').length

  const activeOfferCoinIds = new Set(state.sellOffers.map((s) => s.coinId))

  let recebidas = 0
  let armazenadasNoCofre = 0
  let emOrdemDeVenda = 0
  let disponiveisParaNegociacao = 0

  for (const c of allCoins) {
    if (activeOfferCoinIds.has(c.id)) {
      emOrdemDeVenda++
    } else {
      disponiveisParaNegociacao++
    }

    if (c.statusFisico === 'Recebido') {
      recebidas++
    } else {
      armazenadasNoCofre++
    }
  }

  // 5. Envios e Rastreamentos Postais
  let enviosEmTransito = 0
  let enviosRecebidosNaCentral = 0
  let enviosConcluidos = 0

  for (const e of state.envios) {
    if (e.etapaAtual === 'Recibo emitido') {
      enviosConcluidos++
    } else if (e.etapaAtual === 'Recebido pela custódia' || e.etapaAtual === 'Em análise física') {
      enviosRecebidosNaCentral++
    } else if (e.etapaAtual === 'Envio postado') {
      enviosEmTransito++
    }
  }

  return {
    geradoEm: Date.now(),
    financeiro: {
      totalSaldoUsuariosCents,
      totalDepositadoGatewayCents,
      totalDepositosRegistradosCents,
      totalIntencoesPendentesCents,
      totalIntencoesRecusadasCents,
      totalTaxasCustodiaCents,
      totalComissoesTradesCents,
      totalReceitaEmpresaCents,
      discrepanciaCents,
      contasDivergentes,
      statusConciliacao,
    },
    moedasECustodia: {
      totalMoedasCustodiadas,
      recibosNftAtivos,
      enviosEmTransito,
      enviosRecebidosNaCentral,
      enviosConcluidos,
      esteiraStatus: {
        recebidas,
        armazenadasNoCofre,
        disponiveisParaNegociacao,
        emOrdemDeVenda,
      },
    },
  }
}
