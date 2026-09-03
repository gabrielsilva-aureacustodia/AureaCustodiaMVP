import 'server-only'

/**
 * Módulo de Auditoria e Conciliação Gateway × Ledger × Custódia Física.
 *
 * RESPONSABILIDADE:
 *  - Cruzar as intenções de pagamento do gateway com o saldo circulante dos usuários.
 *  - Apurar receitas da empresa (taxas de custódia + comissões de corretagem).
 *  - Mapear a esteira física de recebimento e avaliação de moedas na Central de Custódia.
 */

import type { Cents, Timestamp } from '@/domain/types'
import { getState } from '@/server/state'
import { repositorioIntencoes } from './repositorios'

export interface RelatorioConciliacaoFinanceira {
  geradoEm: Timestamp
  financeiro: {
    totalSaldoUsuariosCents: Cents
    totalDepositadoGatewayCents: Cents
    totalIntencoesPendentesCents: Cents
    totalIntencoesRecusadasCents: Cents
    totalTaxasCustodiaCents: Cents
    totalComissoesTradesCents: Cents
    totalReceitaEmpresaCents: Cents
    discrepanciaCents: Cents
    statusConciliacao: 'conciliado' | 'discrepancia_detectada'
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

  // Se não houver intenções no banco (ex: dev / seed local), usa o histórico de state.deposits
  if (todasIntencoes.length === 0 && state.deposits.length > 0) {
    totalDepositadoGatewayCents = state.deposits.reduce((acc, d) => acc + (d.valor || 0), 0)
  }

  // 3. Apuração de Receitas da Áurea Custódia
  const totalTaxasCustodiaCents = Object.values(state.custodyCharges).reduce(
    (acc, c) => acc + (c.valorCobrado || 0),
    0,
  )

  const totalComissoesTradesCents = state.trades.reduce(
    (acc, t) => acc + (t.fee || 0),
    0,
  )

  const totalReceitaEmpresaCents = totalTaxasCustodiaCents + totalComissoesTradesCents
  const discrepanciaCents = Math.abs(totalDepositadoGatewayCents - totalSaldoUsuariosCents)

  // 4. Mapeamento de Moedas e Trilha de Avaliação Física
  const allCoins = Object.values(state.users).flatMap((u) => u.coins || [])
  const totalMoedasCustodiadas = allCoins.length
  const recibosNftAtivos = allCoins.filter((c) => c.nft?.status === 'Ativo').length

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
      totalIntencoesPendentesCents,
      totalIntencoesRecusadasCents,
      totalTaxasCustodiaCents,
      totalComissoesTradesCents,
      totalReceitaEmpresaCents,
      discrepanciaCents,
      statusConciliacao: discrepanciaCents === 0 ? 'conciliado' : 'discrepancia_detectada',
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
