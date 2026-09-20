/**
 * DOMÍNIO — o estado com que a plataforma nasce quando não há nada gravado.
 *
 * Existe separado de `seed.ts` para que nenhum módulo de produção precise
 * importar o seed. Até 20/09/2026 era `seedState()` que preenchia um banco
 * vazio, e ele traz sete contas de demonstração com saldo de milhares de reais,
 * dezenas de moedas e um histórico de negociações inventado. Enquanto o site era
 * ambiente de teste isso era a demonstração; publicado no domínio oficial virou
 * dinheiro que ninguém depositou e moeda que ninguém enviou.
 *
 * `seedState()` continua existindo — os testes precisam de um estado com dados
 * para exercitar mercado, custódia e ledger. O que mudou é que produção nunca
 * mais o chama.
 */

import type { AppState, Seq } from '@/domain/types'

export function estadoVazio(): AppState {
  const seq: Seq = { coin: 0, envio: 0, analise: 0, planoCustodia: 0 }
  return {
    users: {},
    sellOffers: [],
    buyOrders: [],
    trades: [],
    envios: [],
    seq,
    deposits: [],
    analises: [],
    saques: [],
    faturasCustodia: [],
    planosCustodia: [],
  }
}
