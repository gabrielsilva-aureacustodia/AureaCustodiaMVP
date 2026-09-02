/**
 * Planejador de diff: o que mudou entre o AppState que entrou na transação e o
 * que saiu dela, traduzido em operações de banco.
 *
 * É AQUI que a migração para tabelas acontece sem tocar no motor. O padrão do
 * blob era "carrega tudo, muta no lugar, grava tudo"; o das tabelas é "carrega
 * tudo, muta no lugar, grava SÓ O QUE MUDOU". A função de negócio (`matchOrders`,
 * `transferCoin`, as Server Actions) continua recebendo um AppState e mutando
 * arrays — nenhuma linha dela muda, e os 38 testes continuam valendo.
 *
 * MÓDULO PURO: sem I/O, sem `server-only`, testado em diff.test.ts. Ele produz
 * uma lista de `Operacao`; quem executa é repositories/state.ts.
 *
 * COMO SE DETECTA MUDANÇA
 * -----------------------
 * Cada entidade é normalizada para uma forma canônica (mesmas chaves, na mesma
 * ordem, `null` no lugar de ausente) e comparada pelo JSON. Não se compara o
 * objeto do domínio direto porque ele chega de dois lugares — do banco, montado
 * pelos repositórios, e do código de negócio, que cria `{ price, qty, ... }` na
 * ordem que lhe convém e às vezes deixa um campo `undefined`. A normalização é
 * a mesma que os repositórios usam para gravar, então "igual no JSON" significa
 * "igual na linha".
 *
 * APPEND-ONLY
 * -----------
 * `trades` e `deposits` nunca são alterados nem removidos — são o histórico, e
 * histórico alterável não vale como prova. O planejador só aceita que a lista
 * CRESÇA: as linhas novas são as que estão além do comprimento anterior, e um
 * encolhimento é erro, não operação.
 */

import { tradeFee } from '@/domain/fees'
import type {
  AppState,
  BuyOrder,
  Cents,
  Coin,
  CustodyCharge,
  Deposit,
  Envio,
  SellOffer,
  Seq,
  Trade,
  User,
  UserEmail,
  UserSettings,
} from '@/domain/types'

/* ---------- formas canônicas ---------- */

/** A linha de `users`: o `User` sem o array `coins`, que vive em `coins`. */
export interface UserRegistro {
  name: string
  balance: Cents
  pass: string | null
  lastAccess: number | null
  prevAccess: number | null
  settings: UserSettings | null
}

/** A linha de `coins` + `nfts`: a moeda, seu dono e sua posição no inventário dele. */
export interface CoinRegistro {
  owner: UserEmail
  posicao: number
  coin: Coin
}

/** A linha de `trades`: o `Trade` com a comissão congelada (RA-06). */
export interface TradeRegistro extends Trade {
  fee: Cents
}

export function normalizarUser(u: User): UserRegistro {
  return {
    name: u.name,
    balance: u.balance,
    pass: u.pass ?? null,
    lastAccess: u.lastAccess ?? null,
    prevAccess: u.prevAccess ?? null,
    settings: u.settings
      ? {
          twoFA: u.settings.twoFA,
          notifEnvios: u.settings.notifEnvios,
          notifNegociacoes: u.settings.notifNegociacoes,
          notifNovidades: u.settings.notifNovidades,
        }
      : null,
  }
}

/**
 * `transferido` só entra quando é `true`, exatamente como o domínio o cria:
 * `transferCoin` grava `true` e o seed nem menciona o campo. Assim a moeda que
 * sai do banco é indistinguível da que saiu do seed.
 */
export function normalizarCoin(c: Coin): Coin {
  return {
    id: c.id,
    tipoMoeda: c.tipoMoeda,
    ano: c.ano,
    entrada: c.entrada,
    statusFisico: c.statusFisico,
    statusDigital: c.statusDigital,
    valorEstimado: c.valorEstimado,
    protocolo: c.protocolo,
    ...(c.transferido ? { transferido: true as const } : {}),
    nft: {
      codigo: c.nft.codigo,
      hash: c.nft.hash,
      dataEmissao: c.nft.dataEmissao,
      status: c.nft.status,
    },
  }
}

export function normalizarSellOffer(o: SellOffer): SellOffer {
  return {
    id: o.id,
    coinId: o.coinId,
    seller: o.seller,
    price: o.price,
    obs: o.obs,
    lotId: o.lotId,
    createdAt: o.createdAt,
    tipoMoeda: o.tipoMoeda,
  }
}

export function normalizarBuyOrder(b: BuyOrder): BuyOrder {
  return {
    id: b.id,
    buyer: b.buyer,
    price: b.price,
    qty: b.qty,
    createdAt: b.createdAt,
    tipoMoeda: b.tipoMoeda,
  }
}

/**
 * A comissão congelada é a que o motor cobrou: `tradeFee(price)` por moeda,
 * vezes a quantidade. Quando o registro já veio do banco com `fee`, vale o que
 * está gravado — é o ponto inteiro do RA-06.
 */
export function normalizarTrade(t: Trade): TradeRegistro {
  return {
    price: t.price,
    qty: t.qty,
    date: t.date,
    buyer: t.buyer,
    seller: t.seller,
    tipoMoeda: t.tipoMoeda,
    fee: t.fee ?? tradeFee(t.price) * (t.qty || 1),
  }
}

export function normalizarEnvio(e: Envio): Envio {
  return {
    protocolo: e.protocolo,
    userEmail: e.userEmail,
    tipoMoeda: e.tipoMoeda,
    ano: e.ano,
    quantidade: e.quantidade,
    codigoRastreio: e.codigoRastreio ?? null,
    dataPostagem: e.dataPostagem ?? null,
    dataRecebimento: e.dataRecebimento ?? null,
    etapaAtual: e.etapaAtual,
    createdAt: e.createdAt,
    codigosAtivosGerados: [...e.codigosAtivosGerados],
  }
}

export function normalizarDeposit(d: Deposit): Deposit {
  return { userEmail: d.userEmail, valor: d.valor, date: d.date }
}

export function normalizarCustodyCharge(c: CustodyCharge): CustodyCharge {
  return {
    totalMoedas: c.totalMoedas,
    valorCobrado: c.valorCobrado,
    dataCobranca: c.dataCobranca,
    statusPagamento: c.statusPagamento,
  }
}

export function normalizarSeq(s: Seq): Seq {
  return { coin: s.coin, envio: s.envio }
}

/** Achata os inventários: uma entrada por moeda, com dono e posição. */
export function achatarCoins(state: AppState): CoinRegistro[] {
  const out: CoinRegistro[] = []
  for (const [owner, u] of Object.entries(state.users)) {
    u.coins.forEach((coin, posicao) => out.push({ owner, posicao, coin: normalizarCoin(coin) }))
  }
  return out
}

/* ---------- as operações ---------- */

export type Operacao =
  | { tipo: 'user.inserir'; email: UserEmail; user: UserRegistro }
  | { tipo: 'user.atualizar'; email: UserEmail; user: UserRegistro }
  | { tipo: 'user.remover'; email: UserEmail }
  | { tipo: 'coin.inserir'; registro: CoinRegistro }
  | { tipo: 'coin.atualizar'; registro: CoinRegistro }
  | { tipo: 'coin.remover'; id: string }
  | { tipo: 'sellOffer.inserir'; oferta: SellOffer }
  | { tipo: 'sellOffer.atualizar'; oferta: SellOffer }
  | { tipo: 'sellOffer.remover'; id: string }
  | { tipo: 'buyOrder.inserir'; ordem: BuyOrder }
  | { tipo: 'buyOrder.atualizar'; ordem: BuyOrder }
  | { tipo: 'buyOrder.remover'; id: string }
  | { tipo: 'trade.inserir'; trade: TradeRegistro }
  | { tipo: 'envio.inserir'; envio: Envio }
  | { tipo: 'envio.atualizar'; envio: Envio }
  | { tipo: 'envio.remover'; protocolo: string }
  | { tipo: 'deposit.inserir'; deposito: Deposit }
  | { tipo: 'custodyCharge.gravar'; email: UserEmail; cobranca: CustodyCharge }
  | { tipo: 'custodyCharge.remover'; email: UserEmail }
  | { tipo: 'seq.atualizar'; seq: Seq }

/* ---------- o diff genérico por chave ---------- */

interface DiffPorChave<T> {
  inseridos: T[]
  atualizados: T[]
  removidos: string[]
}

/**
 * Compara dois conjuntos indexados pela mesma chave. "Igual" é igualdade do
 * JSON da forma canônica — por isso os mapas recebem objetos JÁ normalizados.
 */
function diffPorChave<T>(antes: Map<string, T>, depois: Map<string, T>): DiffPorChave<T> {
  const inseridos: T[] = []
  const atualizados: T[] = []
  const removidos: string[] = []

  for (const [chave, novo] of depois) {
    const velho = antes.get(chave)
    if (velho === undefined) inseridos.push(novo)
    else if (JSON.stringify(velho) !== JSON.stringify(novo)) atualizados.push(novo)
  }
  for (const chave of antes.keys()) {
    if (!depois.has(chave)) removidos.push(chave)
  }
  return { inseridos, atualizados, removidos }
}

function indexar<T>(itens: Iterable<T>, chave: (t: T) => string): Map<string, T> {
  const m = new Map<string, T>()
  for (const item of itens) m.set(chave(item), item)
  return m
}

function usersDe(state: AppState): Map<string, { email: UserEmail; user: UserRegistro }> {
  return indexar(
    Object.entries(state.users).map(([email, u]) => ({ email, user: normalizarUser(u) })),
    (x) => x.email,
  )
}

/**
 * Garante que uma lista append-only só cresceu e devolve a cauda nova.
 *
 * A conferência é pelo comprimento, não elemento a elemento: nenhuma rotina do
 * domínio substitui ou reordena `trades`/`deposits`, e comparar N registros a
 * cada escrita custaria mais do que protege. Encolher, porém, é sinal de bug
 * grave — apagar histórico — e vira exceção antes de qualquer gravação.
 */
function caudaNova<T>(nome: string, antes: readonly T[], depois: readonly T[]): T[] {
  if (depois.length < antes.length) {
    throw new Error(
      `${nome} é append-only: a lista tinha ${antes.length} registro(s) e passou a ter ${depois.length}.`,
    )
  }
  return depois.slice(antes.length)
}

/* ---------- o planejador ---------- */

/**
 * Traduz a diferença entre `antes` e `depois` em operações, NA ORDEM em que o
 * banco as aceita: remoções primeiro (uma oferta que aponta para uma moeda
 * precisa sumir antes da moeda), depois usuários (as moedas têm chave
 * estrangeira para eles), depois moedas (as ofertas apontam para elas), e por
 * fim o resto. Trocar a ordem quebra uma FK em algum cenário raro — e "raro" em
 * banco é "na sexta à noite".
 */
export function planejarDiff(antes: AppState, depois: AppState): Operacao[] {
  const ops: Operacao[] = []

  const users = diffPorChave(usersDe(antes), usersDe(depois))
  const coins = diffPorChave(
    indexar(achatarCoins(antes), (r) => r.coin.id),
    indexar(achatarCoins(depois), (r) => r.coin.id),
  )
  const sellOffers = diffPorChave(
    indexar(antes.sellOffers.map(normalizarSellOffer), (o) => o.id),
    indexar(depois.sellOffers.map(normalizarSellOffer), (o) => o.id),
  )
  const buyOrders = diffPorChave(
    indexar(antes.buyOrders.map(normalizarBuyOrder), (b) => b.id),
    indexar(depois.buyOrders.map(normalizarBuyOrder), (b) => b.id),
  )
  const envios = diffPorChave(
    indexar(antes.envios.map(normalizarEnvio), (e) => e.protocolo),
    indexar(depois.envios.map(normalizarEnvio), (e) => e.protocolo),
  )
  const cobrancas = diffPorChave(
    indexar(
      Object.entries(antes.custodyCharges).map(([email, c]) => ({ email, cobranca: normalizarCustodyCharge(c) })),
      (x) => x.email,
    ),
    indexar(
      Object.entries(depois.custodyCharges).map(([email, c]) => ({ email, cobranca: normalizarCustodyCharge(c) })),
      (x) => x.email,
    ),
  )
  const tradesNovos = caudaNova('trades', antes.trades, depois.trades).map(normalizarTrade)
  const depositsNovos = caudaNova('deposits', antes.deposits, depois.deposits).map(normalizarDeposit)

  // 1. remoções, das folhas para as raízes
  for (const id of sellOffers.removidos) ops.push({ tipo: 'sellOffer.remover', id })
  for (const id of buyOrders.removidos) ops.push({ tipo: 'buyOrder.remover', id })
  for (const protocolo of envios.removidos) ops.push({ tipo: 'envio.remover', protocolo })
  for (const email of cobrancas.removidos) ops.push({ tipo: 'custodyCharge.remover', email })
  for (const id of coins.removidos) ops.push({ tipo: 'coin.remover', id })
  for (const email of users.removidos) ops.push({ tipo: 'user.remover', email })

  // 2. usuários — antes das moedas, que apontam para eles
  for (const { email, user } of users.inseridos) ops.push({ tipo: 'user.inserir', email, user })
  for (const { email, user } of users.atualizados) ops.push({ tipo: 'user.atualizar', email, user })

  // 3. moedas — antes das ofertas, que apontam para elas
  for (const registro of coins.inseridos) ops.push({ tipo: 'coin.inserir', registro })
  for (const registro of coins.atualizados) ops.push({ tipo: 'coin.atualizar', registro })

  // 4. o resto, em qualquer ordem
  for (const oferta of sellOffers.inseridos) ops.push({ tipo: 'sellOffer.inserir', oferta })
  for (const oferta of sellOffers.atualizados) ops.push({ tipo: 'sellOffer.atualizar', oferta })
  for (const ordem of buyOrders.inseridos) ops.push({ tipo: 'buyOrder.inserir', ordem })
  for (const ordem of buyOrders.atualizados) ops.push({ tipo: 'buyOrder.atualizar', ordem })
  for (const envio of envios.inseridos) ops.push({ tipo: 'envio.inserir', envio })
  for (const envio of envios.atualizados) ops.push({ tipo: 'envio.atualizar', envio })
  for (const trade of tradesNovos) ops.push({ tipo: 'trade.inserir', trade })
  for (const deposito of depositsNovos) ops.push({ tipo: 'deposit.inserir', deposito })
  for (const { email, cobranca } of [...cobrancas.inseridos, ...cobrancas.atualizados]) {
    ops.push({ tipo: 'custodyCharge.gravar', email, cobranca })
  }

  const seqAntes = normalizarSeq(antes.seq)
  const seqDepois = normalizarSeq(depois.seq)
  if (seqAntes.coin !== seqDepois.coin || seqAntes.envio !== seqDepois.envio) {
    ops.push({ tipo: 'seq.atualizar', seq: seqDepois })
  }

  return ops
}
