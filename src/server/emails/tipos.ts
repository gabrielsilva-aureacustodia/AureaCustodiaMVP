/**
 * Tipos da central de e-mails de movimentação (frente C, 17/11/2026).
 *
 * Sem `server-only` de propósito, como `src/server/db/sql.ts`: aqui só há tipos e nada carrega segredo, e a
 * suíte de testes precisa importar a derivação, os modelos e a fila sem arrastar o provedor de e-mail.
 *
 * O QUE UM EVENTO GUARDA. `dados` é um objeto pequeno de FATOS já prontos — valores em centavos, o primeiro
 * nome, códigos, datas, e-mail e chave Pix JÁ MASCARADOS. Ele vai para a fila como JSON e o texto só é montado
 * na hora de enviar (`modelos.ts`), a partir desses fatos. Por isso nada sensível chega ao banco da fila: a
 * máscara acontece ao DERIVAR o evento, nunca ao montar o texto.
 */

import type { Cents, Timestamp } from '@/domain/types'

/** Todo e-mail que a central sabe montar. A tabela `CATALOGO` (catalogo.ts) diz o que cada um exige. */
export type TipoDeEmail =
  | 'compra'
  | 'venda'
  | 'deposito'
  | 'envio_postado'
  | 'envio_recebido'
  | 'moeda_aceita'
  | 'moeda_recusada'
  | 'fatura_paga'
  | 'retirada_postada'
  | 'seguranca_senha'
  | 'seguranca_email'
  | 'seguranca_pix'

/** Os três e-mails de saque NÃO são da central: seguem em `src/server/saques/avisos.ts` (decisão do Controle, 17/11/2026). */
export type TipoCobertoPorOutroModulo = 'saque_pedido' | 'saque_pago' | 'saque_recusado'

/** Primeiro nome do cliente; `null` quando a conta não é achada — o texto cai em "Olá,". */
type Nome = string | null

export interface DadosCompra {
  nome: Nome
  quantidade: number
  tipoMoeda: string
  valorMoedasCents: Cents
  comissaoCents: Cents
  /** Primeiro mês de custódia embutido na compra (fatura `origem: 'compra'`); 0 quando não houve. */
  custodiaCents: Cents
  totalCents: Cents
  data: Timestamp
}

export interface DadosVenda {
  nome: Nome
  quantidade: number
  tipoMoeda: string
  valorCents: Cents
  comissaoCents: Cents
  liquidoCents: Cents
  data: Timestamp
}

export interface DadosDeposito {
  nome: Nome
  valorCents: Cents
  metodo: 'pix' | 'cartao' | null
  data: Timestamp
}

export interface DadosEnvioPostado {
  nome: Nome
  protocolo: string
  quantidade: number
  tipoMoeda: string
  codigoRastreio: string | null
}

export interface DadosEnvioRecebido {
  nome: Nome
  protocolo: string
  quantidade: number
  tipoMoeda: string
}

export interface DadosMoedaAceita {
  nome: Nome
  protocoloEnvio: string
  quantidade: number
  tipoMoeda: string
  codigos: string[]
  /** O primeiro mês de custódia já estava pago (cadastro sem envio com a caixa marcada). */
  primeiroMesPago: boolean
}

export interface DadosMoedaRecusada {
  nome: Nome
  protocoloEnvio: string
  quantidade: number
  tipoMoeda: string
  motivos: string[]
}

export interface DadosFaturaPaga {
  nome: Nome
  faturaId: string
  valorCents: Cents
  quantidadeMoedas: number
  /** 'AAAA-MM'. */
  competencia: string
  forma: 'saldo' | 'pix' | 'cartao' | null
  data: Timestamp
}

export interface DadosRetiradaPostada {
  nome: Nome
  retiradaId: string
  coinId: string
  codigoRastreio: string | null
}

export interface DadosSegurancaSenha {
  nome: Nome
  quando: Timestamp
}

export interface DadosSegurancaEmail {
  nome: Nome
  quando: Timestamp
}

export interface DadosSegurancaPix {
  nome: Nome
  quando: Timestamp
  /** Já mascarada ("terminada em 1234"): a chave inteira nunca entra no evento. */
  chaveMascarada: string
}

export interface DadosPorTipo {
  compra: DadosCompra
  venda: DadosVenda
  deposito: DadosDeposito
  envio_postado: DadosEnvioPostado
  envio_recebido: DadosEnvioRecebido
  moeda_aceita: DadosMoedaAceita
  moeda_recusada: DadosMoedaRecusada
  fatura_paga: DadosFaturaPaga
  retirada_postada: DadosRetiradaPostada
  seguranca_senha: DadosSegurancaSenha
  seguranca_email: DadosSegurancaEmail
  seguranca_pix: DadosSegurancaPix
}

/**
 * Um e-mail a enviar, ainda sem texto.
 *
 * `chave` é a identidade do EVENTO: dois eventos com a mesma chave são o mesmo e-mail, e a fila (UNIQUE) só
 * guarda um. É o que faz reprocessar a mesma mutação — ou o webhook entregue duas vezes — não mandar duas vezes.
 */
export type EventoDeEmail = {
  [K in TipoDeEmail]: { chave: string; tipo: K; para: string; dados: DadosPorTipo[K] }
}[TipoDeEmail]

/** O que `modelos.ts` devolve. Texto puro: vale em qualquer cliente de e-mail. */
export interface EmailMontado {
  assunto: string
  texto: string
}
