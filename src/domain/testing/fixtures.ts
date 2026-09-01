/**
 * Fábricas de estado para os testes do domínio — e SÓ para eles.
 *
 * Nada daqui é importado por código de produção. Vive dentro de src/domain
 * porque monta exatamente os tipos do domínio, e um teste que montasse o
 * estado à mão em cada arquivo divergiria dos tipos na primeira mudança de
 * formato — que é justamente o momento em que os testes mais precisam
 * compilar.
 *
 * Os valores padrão são deliberadamente "de manual": moeda armazenada,
 * validada, com recibo ativo. Cada teste sobrescreve só o que o cenário
 * exige, e o resto não distrai.
 */

import type { AppState, BuyOrder, Coin, SellOffer, User } from '@/domain/types'

/** A moeda-referência do marketplace — nome exato do catálogo. */
export const BAN = 'Entrega da Bandeira Olímpica'

/** O segundo ativo negociável — nome exato do catálogo. */
export const DH = 'Direitos Humanos'

export function moeda(id: string, tipo: string): Coin {
  return {
    id,
    tipoMoeda: tipo,
    ano: 2012,
    entrada: '01/01/2026',
    statusFisico: 'Armazenado',
    statusDigital: 'Validado',
    valorEstimado: 28500,
    protocolo: 'RO-ENV-0001',
    nft: {
      codigo: 'NFT-' + id.split('-')[1],
      hash: '0xA1B2...C3D4',
      dataEmissao: '01/01/2026',
      status: 'Ativo',
    },
  }
}

export function usuario(nome: string, saldo: number, coins: Coin[]): User {
  return { name: nome, balance: saldo, coins }
}

export function estado(users: Record<string, User>): AppState {
  return {
    users,
    sellOffers: [],
    buyOrders: [],
    trades: [],
    envios: [],
    seq: { coin: 100, envio: 100 },
    custodyCharges: {},
    deposits: [],
  }
}

export function venda(
  id: string,
  coinId: string,
  seller: string,
  price: number,
  tipo: string,
  t: number,
): SellOffer {
  return { id, coinId, seller, price, obs: '', lotId: 'LOT-' + id, createdAt: t, tipoMoeda: tipo }
}

export function compra(
  id: string,
  buyer: string,
  price: number,
  qty: number,
  tipo: string,
  t: number,
): BuyOrder {
  return { id, buyer, price, qty, createdAt: t, tipoMoeda: tipo }
}
