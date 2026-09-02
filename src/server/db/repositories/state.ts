/**
 * Monta o AppState a partir das tabelas e grava de volta o que mudou.
 *
 * É o `carregarLivroParaMotor` / `persistirResultado` do plano do M1, com um
 * nome mais honesto: o que se carrega é o estado INTEIRO, não só o livro de um
 * tipo. O motivo está em `mutateState(fn)`: a assinatura não diz o que `fn` vai
 * ler, e um estado parcial faria `medianSellPrice` de outro tipo — ou o saldo
 * de um terceiro — voltar errado sem erro nenhum. Com sete contas e algumas
 * dezenas de moedas, carregar tudo são nove consultas pequenas na mesma
 * transação; o recorte por livro é otimização para quando houver volume, e
 * está anotado em ATALHOS.md.
 *
 * O que ESTE arquivo garante:
 *  - o objeto que sai de `carregarEstado` é indistinguível do que saía do blob
 *    (mesmas chaves, mesma ordem dos arrays, `undefined` onde o domínio deixa
 *    ausente) — é o que mantém as telas e os seletores funcionando sem edição;
 *  - `persistirEstado` grava SÓ a diferença, na ordem que as chaves
 *    estrangeiras aceitam, dentro da mesma transação que carregou.
 */

import type { AppState, User, UserEmail } from '@/domain/types'

import { planejarDiff, type Operacao } from '../diff'
import type { Consulta } from '../sql'
import {
  carregarCustodyCharges,
  carregarDeposits,
  gravarCustodyCharge,
  inserirDeposit,
  removerCustodyCharge,
} from './account'
import { atualizarCoin, carregarCoins, inserirCoin, removerCoin } from './coins'
import { atualizarEnvio, carregarEnvios, inserirEnvio, removerEnvio } from './envios'
import {
  atualizarBuyOrder,
  atualizarSellOffer,
  carregarBuyOrders,
  carregarSellOffers,
  inserirBuyOrder,
  inserirSellOffer,
  removerBuyOrder,
  removerSellOffer,
} from './offers'
import { atualizarSeq, carregarSeq } from './seq'
import { carregarTrades, inserirTrade } from './trades'
import { atualizarUser, carregarUsers, inserirUser, removerUser } from './users'

export interface OpcoesCarregar {
  /**
   * Trava a linha de `seq` com FOR UPDATE ANTES de ler o resto. Obrigatório em
   * toda mutação: é o que faz a segunda transação esperar a primeira e ler o
   * estado já gravado, em vez de cada uma partir do mesmo retrato antigo.
   */
  travar?: boolean
}

/**
 * Carrega o estado inteiro. A trava, quando pedida, vem PRIMEIRO — se viesse
 * depois das leituras, duas transações leriam o mesmo retrato, uma esperaria a
 * outra e depois gravaria por cima com dado velho. A ordem não é estilo, é a
 * garantia.
 */
export async function carregarEstado(tx: Consulta, opcoes: OpcoesCarregar = {}): Promise<AppState> {
  const seq = await carregarSeq(tx, { travar: opcoes.travar === true })

  const [usersRows, coins, sellOffers, buyOrders, trades, envios, deposits, cobrancas] =
    await Promise.all([
      carregarUsers(tx),
      carregarCoins(tx),
      carregarSellOffers(tx),
      carregarBuyOrders(tx),
      carregarTrades(tx),
      carregarEnvios(tx),
      carregarDeposits(tx),
      carregarCustodyCharges(tx),
    ])

  const users: Record<UserEmail, User> = {}
  for (const { email, user } of usersRows) {
    // Campos opcionais ficam AUSENTES quando nulos, não `undefined` explícito:
    // o AppState é serializado em JSON para o polling, e a forma precisa ser a
    // mesma que o seed produz — sem chave a mais para o diff confundir.
    const u: User = { name: user.name, balance: user.balance, coins: [] }
    if (user.pass !== null) u.pass = user.pass
    if (user.lastAccess !== null) u.lastAccess = user.lastAccess
    if (user.prevAccess !== null) u.prevAccess = user.prevAccess
    if (user.settings !== null) u.settings = user.settings
    users[email] = u
  }

  // As linhas chegam ordenadas por (dono, posição); o push reproduz o array.
  for (const { owner, coin } of coins) {
    const dono = users[owner]
    if (!dono) throw new Error(`Moeda ${coin.id} pertence a ${owner}, que não existe em users`)
    dono.coins.push(coin)
  }

  const custodyCharges: AppState['custodyCharges'] = {}
  for (const { email, cobranca } of cobrancas) custodyCharges[email] = cobranca

  return { users, sellOffers, buyOrders, trades, envios, seq, custodyCharges, deposits }
}

/** Banco recém-migrado: nenhuma conta. É o gatilho da semeadura, como o `null` do blob era. */
export function estaVazio(state: AppState): boolean {
  return Object.keys(state.users).length === 0
}

/**
 * Grava a diferença entre `antes` e `depois`. Devolve as operações executadas
 * — útil em teste e em diagnóstico ("o que essa ação gravou?").
 */
export async function persistirEstado(
  tx: Consulta,
  antes: AppState,
  depois: AppState,
): Promise<Operacao[]> {
  const ops = planejarDiff(antes, depois)
  // Sequencial de propósito: a ordem das operações é a ordem das chaves
  // estrangeiras, e o Postgres executa na ordem em que recebe na MESMA
  // conexão — mas um Promise.all aqui embaralharia a fila de envio.
  for (const op of ops) await executarOperacao(tx, op)
  return ops
}

export async function executarOperacao(tx: Consulta, op: Operacao): Promise<void> {
  switch (op.tipo) {
    case 'user.inserir':
      return inserirUser(tx, op.email, op.user)
    case 'user.atualizar':
      return atualizarUser(tx, op.email, op.user)
    case 'user.remover':
      return removerUser(tx, op.email)
    case 'coin.inserir':
      return inserirCoin(tx, op.registro)
    case 'coin.atualizar':
      return atualizarCoin(tx, op.registro)
    case 'coin.remover':
      return removerCoin(tx, op.id)
    case 'sellOffer.inserir':
      return inserirSellOffer(tx, op.oferta)
    case 'sellOffer.atualizar':
      return atualizarSellOffer(tx, op.oferta)
    case 'sellOffer.remover':
      return removerSellOffer(tx, op.id)
    case 'buyOrder.inserir':
      return inserirBuyOrder(tx, op.ordem)
    case 'buyOrder.atualizar':
      return atualizarBuyOrder(tx, op.ordem)
    case 'buyOrder.remover':
      return removerBuyOrder(tx, op.id)
    case 'trade.inserir':
      return inserirTrade(tx, op.trade)
    case 'envio.inserir':
      return inserirEnvio(tx, op.envio)
    case 'envio.atualizar':
      return atualizarEnvio(tx, op.envio)
    case 'envio.remover':
      return removerEnvio(tx, op.protocolo)
    case 'deposit.inserir':
      return inserirDeposit(tx, op.deposito)
    case 'custodyCharge.gravar':
      return gravarCustodyCharge(tx, op.email, op.cobranca)
    case 'custodyCharge.remover':
      return removerCustodyCharge(tx, op.email)
    case 'seq.atualizar':
      return atualizarSeq(tx, op.seq)
  }
}
