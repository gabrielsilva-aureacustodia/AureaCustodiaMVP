/**
 * Seed fictício da Áurea Custódia — 7 contas de teste com acervo e ~1 mês de
 * negociações já concluídas.
 *
 * Port fiel de `mkCoin` / `mkCoinsForUser` / `genHistoryTrades` / `seedState`
 * do MVP monolítico (aurea-mvp-teste.html, linhas 806-882). Os números mágicos
 * daqui (72%, 23500, 6500, 28 dias, 24 trades...) não são chutes de refatoração:
 * são exatamente os do original e definem a "cara" da demonstração — o gráfico
 * de mercado só sobe de R$235 para R$300 porque a deriva abaixo diz isso.
 *
 * Math.random() é chamado à vontade, mas SEMPRE dentro das funções: se rodasse
 * no escopo do módulo, o Next avaliaria o valor uma única vez na build e
 * congelaria o acervo no bundle estático.
 */

import { COIN, COIN_TYPES, coinTypeInfo, faixaValor } from '@/domain/constants'
import { genHash, nextCoinCode, nextEnvioCode, nextNftCode } from '@/domain/codes'
import { custodyFeeForCount } from '@/domain/fees'
import { DAY_MS } from '@/domain/dates'
import type {
  AppState,
  Cents,
  Coin,
  CustodyCharge,
  DateBR,
  Seq,
  Trade,
  User,
  UserEmail,
} from '@/domain/types'

/**
 * Definição de uma conta fictícia, na mesma ordem posicional do array
 * `usersDef` do original: e-mail, nome, saldo (centavos), nº de moedas e
 * data de entrada em custódia.
 */
type SeedUserDef = readonly [UserEmail, string, Cents, number, DateBR]

/** Moeda-referência do marketplace — e, por isso, a que domina o acervo. */
const BANDEIRA = COIN.name

/** O segundo ativo negociável, incluído no acervo de todas as contas de teste. */
const DIREITOS_HUMANOS = 'Direitos Humanos'

/**
 * Quantas Direitos Humanos cada conta fictícia recebe: de 1 a 3.
 *
 * Elas são recortadas do total já definido em `usersDef`, e não somadas a ele.
 * Somar mudaria a contagem de moedas de cada conta e, com ela, a faixa da taxa
 * de custódia anual — um efeito colateral silencioso numa tabela de preços que
 * só os sócios podem alterar.
 */
const DH_MIN = 1
const DH_MAX = 3

/**
 * Tipos que entram no acervo apenas como variedade visual: os olímpicos de 2016
 * que não são negociáveis. A lista sai do próprio catálogo — assim um ativo
 * negociável novo nunca cai aqui por engano.
 */
const TIPOS_DECORATIVOS = COIN_TYPES.filter((t) => !t.negociavel)

/** Sorteia um valor dentro da faixa do tipo, na granularidade de R$ 5,00. */
function valorSorteado(tipo: string): Cents {
  const { min, max } = faixaValor(tipo)
  const bruto = min + Math.floor(Math.random() * (max - min))
  return Math.round(bruto / 500) * 500
}

/**
 * Cria uma moeda já validada e em cofre, com o recibo NFT emitido.
 *
 * Consome DOIS contadores de `seq`: o do ativo e o de envio. No MVP cada moeda
 * do seed nasce com um protocolo próprio mesmo sem existir registro em
 * `state.envios` — o protocolo aqui é só rastro de origem, não chave estrangeira.
 */
export function mkCoin(
  seq: Seq,
  type: string,
  ano: number,
  entrada: DateBR,
  valorEstimado: Cents,
): Coin {
  const id = nextCoinCode(seq)
  return {
    id,
    tipoMoeda: type,
    ano,
    entrada,
    statusFisico: 'Armazenado',
    statusDigital: 'Validado',
    valorEstimado,
    protocolo: nextEnvioCode(seq),
    // dataEmissao nasce igual à entrada e fica congelada: o recibo não é
    // reemitido quando a moeda troca de dono.
    nft: { codigo: nextNftCode(id), hash: genHash(), dataEmissao: entrada, status: 'Ativo' },
  }
}

/**
 * Monta o acervo de um usuário.
 *
 * De 1 a 3 moedas são Direitos Humanos, para que as sete contas já cheguem com
 * o segundo ativo negociável em mãos e o mercado dele tenha os dois lados desde
 * o primeiro acesso. Do que sobra, a primeira é sempre a Bandeira e as demais
 * têm 72% de chance de também ser — é o que garante liquidez suficiente para o
 * marketplace funcionar na demonstração; os tipos não negociáveis entram só
 * como variedade visual na carteira.
 *
 * Os valores são arredondados para múltiplo de R$5,00 para que as cotações
 * fictícias tenham a mesma "granularidade" dos preços digitados pelos usuários.
 */
export function mkCoinsForUser(seq: Seq, n: number, entrada: DateBR): Coin[] {
  const arr: Coin[] = []

  // Teto de segurança: numa conta pequena as DH não podem engolir a Bandeira,
  // senão o usuário abre a tela de venda sem nada do ativo principal.
  const nDh = Math.min(DH_MIN + Math.floor(Math.random() * (DH_MAX - DH_MIN + 1)), Math.max(0, n - 1))

  for (let i = 0; i < nDh; i++) {
    const info = coinTypeInfo(DIREITOS_HUMANOS)
    arr.push(
      mkCoin(seq, DIREITOS_HUMANOS, info.anoPadrao, entrada, valorSorteado(DIREITOS_HUMANOS)),
    )
  }

  for (let i = 0; i < n - nDh; i++) {
    const type =
      i === 0 || Math.random() < 0.72
        ? BANDEIRA
        : TIPOS_DECORATIVOS[Math.floor(Math.random() * TIPOS_DECORATIVOS.length)].key
    const info = coinTypeInfo(type)
    arr.push(mkCoin(seq, type, info.anoPadrao, entrada, valorSorteado(type)))
  }

  return arr
}

/**
 * Parâmetros da série fictícia de um ativo: de quanto para quanto o preço
 * caminha em 28 dias, o piso e quantas negociações gerar.
 */
interface SerieDef {
  tipoMoeda: string
  /** Preço no começo da janela. */
  de: Cents
  /** Preço no fim da janela — a deriva é linear entre os dois. */
  para: Cents
  /** Piso absoluto: o jitter nunca produz preço abaixo disto. */
  piso: Cents
  /** Quantas negociações espalhar pelos 28 dias. */
  n: number
}

/**
 * As duas séries do seed.
 *
 * Os números da Bandeira são exatamente os do MVP original (R$235 -> R$300 em
 * 24 negociações) e não podem mudar: é a deriva que dá ao gráfico da home a
 * inclinação positiva que a demonstração mostra.
 *
 * Os da Direitos Humanos são novos e mais discretos de propósito — 8
 * negociações num mercado que acabou de abrir, girando em torno de R$ 450, que
 * é o meio da faixa praticada por lojas numismáticas.
 */
const SERIES: readonly SerieDef[] = [
  { tipoMoeda: BANDEIRA, de: 23500, para: 30000, piso: 20000, n: 24 },
  { tipoMoeda: DIREITOS_HUMANOS, de: 42000, para: 46000, piso: 38000, n: 8 },
]

/**
 * Simula ~1 mês (28 dias) de negociações concluídas nos dois ativos
 * negociáveis, espalhadas entre os 7 usuários fictícios.
 *
 * A deriva linear é o que dá inclinação ao gráfico; o jitter de +/- R$13,00
 * evita que a curva vire uma reta artificial. O piso existe para o jitter nunca
 * produzir preço fora da faixa plausível de cada moeda.
 */
export function genHistoryTrades(emails: UserEmail[]): Trade[] {
  const now = Date.now()
  const d = DAY_MS
  const days = 28
  const trades: Trade[] = []

  for (const serie of SERIES) {
    for (let i = 0; i < serie.n; i++) {
      const t = i / (serie.n - 1)
      const dayOffset = days - t * days
      const drift = serie.de + t * (serie.para - serie.de)
      const jitter = (Math.random() - 0.5) * 2600
      const price = Math.max(serie.piso, Math.round((drift + jitter) / 500) * 500)
      const seller = emails[Math.floor(Math.random() * emails.length)]
      let buyer = emails[Math.floor(Math.random() * emails.length)]
      // Guarda de 10 tentativas: ninguém negocia consigo mesmo, mas com 7 contas
      // o sorteio pode empatar — e um laço sem teto trava a geração.
      let guard = 0
      while (buyer === seller && guard++ < 10) {
        buyer = emails[Math.floor(Math.random() * emails.length)]
      }
      const qty = Math.random() < 0.16 ? 2 : 1
      // Espalha a hora dentro do dia (até 70% dele) para as negociações não
      // caírem todas no mesmo instante da janela de 24h da mediana.
      const date = Math.round(now - dayOffset * d - Math.random() * d * 0.7)
      trades.push({ price, qty, date, buyer, seller, tipoMoeda: serie.tipoMoeda })
    }
  }

  // Ordenação cronológica GLOBAL: `lastTrade` devolve o último item do array, e
  // o histórico precisa continuar sendo lido como uma linha do tempo única
  // mesmo com dois ativos intercalados.
  trades.sort((a, b) => a.date - b.date)
  return trades
}

/**
 * Estado inicial completo do sistema fictício: 7 contas, seus acervos com
 * recibo NFT, a cobrança de custódia já quitada e o histórico de mercado.
 *
 * A ordem das chamadas importa: os acervos são gerados ANTES das cobranças
 * (que dependem da contagem final de moedas) e o `seq` sai daqui já adiantado,
 * de modo que os códigos criados em produção continuem da sequência do seed.
 */
export function seedState(): AppState {
  const seq: Seq = { coin: 0, envio: 0 }
  const usersDef: readonly SeedUserDef[] = [
    ['rogeriopena@testeaurea.com.br', 'Rogério Pena', 6200000, 15, '18/06/2026'],
    ['gabrielsilva@testeaurea.com.br', 'Gabriel Silva', 5400000, 13, '20/06/2026'],
    ['alex@testeaurea.com.br', 'Alex', 3800000, 9, '22/06/2026'],
    ['pegge@testeaurea.com.br', 'Pegge', 4100000, 10, '22/06/2026'],
    ['rozane@testeaurea.com.br', 'Rozane', 3550000, 8, '23/06/2026'],
    ['goturuba@testeaurea.com.br', 'Goturuba', 9700000, 21, '18/06/2026'],
    ['solares@testeaurea.com.br', 'Solares', 4400000, 11, '24/06/2026'],
  ]

  const users: Record<UserEmail, User> = {}
  for (const [email, name, balance, n, entrada] of usersDef) {
    // Sem `pass`: a senha vale a padrão de ACCOUNTS até o usuário trocá-la.
    users[email] = { name, balance, coins: mkCoinsForUser(seq, n, entrada) }
  }

  // Uma cobrança por usuário, já paga e datada da entrada em custódia — o
  // seed não simula inadimplência.
  const custodyCharges: Record<UserEmail, CustodyCharge> = {}
  for (const [email, , , , entrada] of usersDef) {
    const n = users[email].coins.length
    custodyCharges[email] = {
      totalMoedas: n,
      valorCobrado: custodyFeeForCount(n),
      dataCobranca: entrada,
      statusPagamento: 'Pago',
    }
  }

  return {
    users,
    sellOffers: [],
    buyOrders: [],
    trades: genHistoryTrades(usersDef.map((u) => u[0])),
    envios: [],
    seq,
    custodyCharges,
    // O saldo inicial de cada conta vem de `usersDef` e não é depósito: é
    // dinheiro que a demonstração assume como pré-existente. O extrato começa
    // vazio de propósito — só aporte feito na plataforma entra aqui.
    deposits: [],
  }
}
