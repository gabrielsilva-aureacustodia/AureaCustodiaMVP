/**
 * Contrato de tipos da Áurea Custódia.
 *
 * Espelha fielmente o modelo de dados do MVP monolítico (aurea-mvp-teste.html,
 * seedState linhas 853-882) e a correspondência com o schema de 9 tabelas
 * descrita na Seção 2.5 do documento técnico.
 *
 * CONVENÇÕES INEGOCIÁVEIS — valem em todo o projeto:
 *
 *  - Dinheiro é SEMPRE inteiro em centavos. R$ 285,00 é 28500, nunca 285.0.
 *    Ponto flutuante erra centavos; inteiro nunca erra. A formatação para
 *    exibição acontece num único lugar: `brl()` em domain/money.ts.
 *
 *  - Datas existem em duas formas, e a distinção é semântica:
 *      * `Timestamp` (number, Date.now()) para tudo que precisa de ordenação
 *        ou janela de tempo — negociações, médias de 7 dias, mediana 24h.
 *      * `DateBR` (string 'dd/mm/aaaa') para campos congelados por regra de
 *        negócio — a data de emissão do NFT não muda quando a moeda troca
 *        de dono.
 *
 *  - Identificadores são sequenciais e persistentes, gerados a partir de
 *    `state.seq`: RO-000001 (ativo), NFT-000001 (recibo, espelha o ativo),
 *    RO-ENV-0001 (protocolo de envio).
 */

/** Milissegundos desde a época Unix (Date.now()). */
export type Timestamp = number

/** Data já formatada para exibição no padrão brasileiro: 'dd/mm/aaaa'. */
export type DateBR = string

/** Valor monetário inteiro, em centavos. R$ 285,00 === 28500. */
export type Cents = number

/** Chave de usuário no estado. No MVP é o e-mail; em produção vira U-0001. */
export type UserEmail = string

// ---------------------------------------------------------------------------
// Moedas e recibos NFT
// ---------------------------------------------------------------------------

/**
 * Situação física do item dentro da operação de custódia.
 * 'Recebido' = chegou ao centro; 'Armazenado' = já em cofre.
 */
export type StatusFisico = 'Recebido' | 'Armazenado'

/** Situação do registro digital. No MVP toda moeda validada nasce 'Validado'. */
export type StatusDigital = 'Validado'

/** Situação do recibo NFT. 'Extinto' fica reservado para a retirada física (bloco 4.3). */
export type NftStatus = 'Ativo' | 'Extinto'

/**
 * Recibo NFT de custódia. Relação 1:1 com a moeda — desnormalização
 * consciente descrita na Seção 2.5 do documento técnico.
 */
export interface Nft {
  /** Deriva do código do ativo: RO-000042 -> NFT-000042. */
  codigo: string
  /** Hash curto no formato 0xA1B2...C3D4. SIMULADO — não há blockchain. */
  hash: string
  /** Congelada na emissão: não muda quando a moeda troca de dono. */
  dataEmissao: DateBR
  status: NftStatus
}

/** Moeda física em custódia, com seu recibo NFT embutido. */
export interface Coin {
  /** Código sequencial global do ativo: 'RO-000042'. */
  id: string
  /** Chave do catálogo COIN_TYPES. */
  tipoMoeda: string
  ano: number
  /** Data de aquisição pelo dono ATUAL — reescrita a cada transferência. */
  entrada: DateBR
  statusFisico: StatusFisico
  statusDigital: StatusDigital
  valorEstimado: Cents
  /** Protocolo de envio que originou a moeda: 'RO-ENV-0001'. */
  protocolo: string
  /** true quando a moeda já mudou de dono ao menos uma vez ('Alienado' na auditoria). */
  transferido?: boolean
  nft: Nft
}

// ---------------------------------------------------------------------------
// Usuário
// ---------------------------------------------------------------------------

/** Preferências de segurança e notificação (tela 3.2). */
export interface UserSettings {
  twoFA: boolean
  notifEnvios: boolean
  notifNegociacoes: boolean
  notifNovidades: boolean
}

export interface User {
  name: string
  /** Saldo em centavos. */
  balance: Cents
  /**
   * Senha sobrescrita pelo usuário. Ausente = vale a senha padrão de ACCOUNTS.
   * PORT FIEL: continua em texto puro, como no MVP. A troca por hash é a
   * Etapa 2 da migração (Seção 4.4 do documento técnico) e está fora deste escopo.
   */
  pass?: string
  coins: Coin[]
  lastAccess?: Timestamp
  prevAccess?: Timestamp
  settings?: UserSettings
}

// ---------------------------------------------------------------------------
// Mercado
// ---------------------------------------------------------------------------

/**
 * Oferta de venda — UM registro por moeda. Ofertas do mesmo anúncio
 * compartilham `lotId`, o que permite a compra parcial de um lote.
 */
export interface SellOffer {
  id: string
  coinId: string
  seller: UserEmail
  /** Preço unitário pedido. */
  price: Cents
  obs: string
  /** Agrupa as moedas publicadas no mesmo anúncio: 'LOT-<ts>-<rand>'. */
  lotId: string
  createdAt: Timestamp
}

/** Oferta de compra (bid), com preço-limite e quantidade restante. */
export interface BuyOrder {
  id: string
  buyer: UserEmail
  /** Preço-limite unitário. */
  price: Cents
  /** Quantidade ainda não preenchida. Chega a 0 e a ordem é removida. */
  qty: number
  createdAt: Timestamp
}

/** Negociação concluída. A comissão não é gravada: é recalculável (ver domain/fees.ts). */
export interface Trade {
  price: Cents
  qty: number
  date: Timestamp
  buyer: UserEmail
  seller: UserEmail
}

/**
 * Visão agregada das ofertas de venda de um mesmo anúncio.
 * Derivada de `sellOffers` em tempo de leitura — nunca persistida.
 */
export interface Lot {
  lotId: string
  seller: UserEmail
  price: Cents
  obs: string
  createdAt: Timestamp
  coinIds: string[]
}

// ---------------------------------------------------------------------------
// Envios para custódia (wizard 1.3)
// ---------------------------------------------------------------------------

/** As 5 etapas do envio, em ordem. A ordem do array É a máquina de estados. */
export const ETAPAS_ENVIO = [
  'Protocolo gerado',
  'Envio postado',
  'Recebido pela custódia',
  'Em análise física',
  'Recibo emitido',
] as const

export type EtapaEnvio = (typeof ETAPAS_ENVIO)[number]

export interface Envio {
  /** Código sequencial: 'RO-ENV-0001'. */
  protocolo: string
  userEmail: UserEmail
  tipoMoeda: string
  ano: number
  quantidade: number
  codigoRastreio: string | null
  dataPostagem: Timestamp | null
  dataRecebimento: Timestamp | null
  etapaAtual: EtapaEnvio
  createdAt: Timestamp
  /** IDs das moedas criadas quando a etapa chega a 'Recibo emitido'. */
  codigosAtivosGerados: string[]
}

// ---------------------------------------------------------------------------
// Taxa de custódia
// ---------------------------------------------------------------------------

export type StatusPagamento = 'Pago' | 'Pendente'

/** Cobrança de custódia vigente de um usuário (1 registro por usuário). */
export interface CustodyCharge {
  totalMoedas: number
  valorCobrado: Cents
  dataCobranca: DateBR
  statusPagamento: StatusPagamento
}

// ---------------------------------------------------------------------------
// Estado global
// ---------------------------------------------------------------------------

/** Contadores sequenciais persistentes dos códigos. */
export interface Seq {
  coin: number
  envio: number
}

/**
 * O estado inteiro do sistema — o que o MVP guardava numa única chave
 * compartilhada e que aqui vive na camada de persistência (src/server/store).
 * É serializável em JSON por construção: nada de Date, Map, Set ou undefined.
 */
export interface AppState {
  users: Record<UserEmail, User>
  sellOffers: SellOffer[]
  buyOrders: BuyOrder[]
  trades: Trade[]
  envios: Envio[]
  seq: Seq
  custodyCharges: Record<UserEmail, CustodyCharge>
}

// ---------------------------------------------------------------------------
// Cotações de cripto (página 2.3)
// ---------------------------------------------------------------------------

/** Um ponto da série diária de cotações, em centavos de BRL. */
export interface CryptoPoint {
  /** Início do dia (00:00:00 local) em ms — ver dayStamp() em domain/dates.ts. */
  t: Timestamp
  btc: Cents
  eth: Cents
  usdt: Cents
}

export interface CryptoData {
  series: CryptoPoint[]
  lastUpdate: Timestamp
  /** true quando a série veio do fallback simulado, não da CoinGecko. */
  simulated: boolean
}

// ---------------------------------------------------------------------------
// Catálogo
// ---------------------------------------------------------------------------

/** Tipo de moeda olímpica aceito em custódia. */
export interface CoinType {
  key: string
  anoPadrao: number
  tiragem: string
}

// ---------------------------------------------------------------------------
// Resultados de operações de negócio
// ---------------------------------------------------------------------------

/**
 * Uma execução do motor de casamento de ordens.
 * `matchOrders` muta o estado e devolve o que foi preenchido, para que a
 * camada de API possa montar a mensagem exibida ao usuário.
 */
export interface MatchResult {
  /** true se ao menos uma negociação foi executada. */
  matched: boolean
  /** Negociações criadas nesta execução. */
  trades: Trade[]
}

/** Envelope padrão de resposta das rotas de API que mutam o estado. */
export interface ActionResult<T = unknown> {
  ok: boolean
  /** Mensagem pronta para o toast. */
  message?: string
  error?: string
  data?: T
}
