/**
 * Regra pura do saque aprovado pelo painel (14/10/2026).
 *
 * POR QUE ESTE ARQUIVO EXISTE. O saque do Sidnei zerou o saldo dele e ficou parado: a solicitação era
 * gravada (`solicitarSaque`), mas nada na plataforma levava o pedido até um Pix. Aqui moram as decisões
 * que não dependem de rede nem de banco — o que o Mercado Pago precisa receber, como interpretar o que
 * ele devolveu e qual é o próximo estado do saque — para a suíte conferir cada uma sem chamar ninguém.
 *
 * O DINHEIRO NUNCA SAI POR ESTE ARQUIVO. Ele só descreve; quem chama a API é `src/lib/payments/payouts.ts`,
 * e só depois de uma pessoa da equipe com `saques.pagar` apertar o botão.
 *
 * Sem I/O, sem async, sem `process.env`.
 */

import type { Cents, DadosBancarios, Saque, StatusSaque, TipoChavePix } from '@/domain/types'

/* ---------- a fila ---------- */

/** Em aberto = ainda falta o dinheiro chegar ao cliente (ou o pedido ser recusado). */
export function saqueEmAberto(s: Pick<Saque, 'status'>): boolean {
  return s.status === 'solicitado' || s.status === 'em_processamento'
}

export const SITUACAO_DO_SAQUE: Record<StatusSaque, string> = {
  solicitado: 'Aguardando aprovação',
  em_processamento: 'Enviado ao banco — aguardando confirmação',
  pago: 'Pago',
  falhou: 'Recusado e estornado',
}

/** Quanto já espera: os pedidos mais antigos primeiro, que é a ordem em que a equipe paga. */
export function filaDeSaques<T extends Pick<Saque, 'status' | 'criadoEm'>>(saques: readonly T[]): T[] {
  return saques.filter(saqueEmAberto).sort((a, b) => a.criadoEm - b.criadoEm)
}

export interface ResumoDaFila {
  quantidade: number
  /** Soma do que sai para os clientes (líquido, sem a tarifa). */
  valorLiquido: Cents
  /** Quantos já passaram da previsão D+3 prometida ao cliente. */
  atrasados: number
  maisAntigoEm: number | null
}

export function resumirFila(saques: readonly Saque[], agora: number): ResumoDaFila {
  const fila = filaDeSaques(saques)
  return {
    quantidade: fila.length,
    valorLiquido: fila.reduce((soma, s) => soma + s.valorLiquido, 0),
    atrasados: fila.filter((s) => s.previsaoPagamentoEm < agora).length,
    maisAntigoEm: fila[0]?.criadoEm ?? null,
  }
}

/* ---------- a chave Pix, como o Mercado Pago a quer ---------- */

export type TipoChaveMercadoPago = 'CPF' | 'CNPJ' | 'EMAIL' | 'PHONE' | 'PIX_CODE'

export interface ChaveParaMercadoPago {
  tipo: TipoChaveMercadoPago
  valor: string
}

const so = (v: string): string => v.replace(/\D/g, '')

function formatarCpf(d: string): string {
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

function formatarCnpj(d: string): string {
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`
}

/**
 * Converte a chave que o cliente cadastrou no formato da API de Payouts.
 *
 * O cadastro guarda `cpf | email | telefone | aleatoria`. O CPF de 14 dígitos não existe, mas a chave
 * "cpf" digitada com CNPJ (14 dígitos) já apareceu em cadastros, então o tamanho decide. Devolve `null`
 * quando a chave não bate com o tipo — melhor travar o envio e a equipe corrigir do que mandar dinheiro
 * para uma chave que o Mercado Pago vai recusar (ou, pior, que pertence a outra pessoa).
 */
export function chaveParaMercadoPago(db: Pick<DadosBancarios, 'chavePix' | 'tipoChavePix'>): ChaveParaMercadoPago | null {
  const bruta = (db.chavePix ?? '').trim()
  const tipo: TipoChavePix | undefined = db.tipoChavePix
  if (!bruta || !tipo) return null

  switch (tipo) {
    case 'cpf': {
      const d = so(bruta)
      if (d.length === 11) return { tipo: 'CPF', valor: formatarCpf(d) }
      if (d.length === 14) return { tipo: 'CNPJ', valor: formatarCnpj(d) }
      return null
    }
    case 'email': {
      const e = bruta.toLowerCase()
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? { tipo: 'EMAIL', valor: e } : null
    }
    case 'telefone': {
      let d = so(bruta)
      if (d.length === 10 || d.length === 11) d = `55${d}`
      return d.length === 12 || d.length === 13 ? { tipo: 'PHONE', valor: `+${d}` } : null
    }
    case 'aleatoria': {
      // Chave aleatória (EVP) é um UUID: 32 hexadecimais, com ou sem hífens.
      return /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i.test(bruta)
        ? { tipo: 'PIX_CODE', valor: bruta.toLowerCase() }
        : null
    }
    default:
      return null
  }
}

/* ---------- identificadores do envio ---------- */

/**
 * Referência do payout no Mercado Pago: até 50 caracteres, só letras, números, hífen e sublinhado, e
 * NÃO PODE REPETIR. A primeira tentativa usa o próprio id do saque; as seguintes ganham `-T2`, `-T3`…,
 * porque um payout que o Mercado Pago recusou continua existindo lá e reaproveitar a referência faria
 * a nova tentativa ser rejeitada por duplicidade.
 */
export function referenciaDoPayout(saqueId: string, tentativa: number): string {
  const base = saqueId.replace(/[^A-Za-z0-9_-]/g, '-')
  const ref = tentativa <= 1 ? base : `${base}-T${tentativa}`
  return ref.slice(0, 50)
}

/** Valor em reais para o corpo da API — o único ponto em que centavos viram decimal. */
export function valorEmReais(cents: Cents): number {
  return Math.round(cents) / 100
}

/** Texto do Mercado Pago: só letras, números, hífen, sublinhado e espaço (regra da API). */
export function descricaoDoPayout(texto: string): string {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9_\- ]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 100)
}

/* ---------- o que o Mercado Pago respondeu ---------- */

export type StatusDeTransacaoMp = 'pending' | 'in_process' | 'success' | 'canceled' | 'error' | string

export interface ResultadoDoPayout {
  payoutId: string
  transacaoId: string | null
  /** Status da transação (não do payout): é ele que diz se o dinheiro chegou. */
  statusTransacao: StatusDeTransacaoMp | null
  statusDetalhe: string | null
}

export type Veredito = 'pago' | 'em_andamento' | 'recusado'

/**
 * `success` é o único estado em que o dinheiro chegou; `canceled` e `error` são finais e sem dinheiro;
 * todo o resto (ou a ausência de transação) é "ainda não sei" e NUNCA vira pago nem recusado. É a regra
 * que impede de marcar como pago um Pix que ainda não saiu — e de reenviar um que está a caminho.
 */
export function vereditoDoPayout(r: Pick<ResultadoDoPayout, 'statusTransacao'>): Veredito {
  if (r.statusTransacao === 'success') return 'pago'
  if (r.statusTransacao === 'canceled' || r.statusTransacao === 'error') return 'recusado'
  return 'em_andamento'
}

export function textoDoGateway(r: Pick<ResultadoDoPayout, 'statusTransacao' | 'statusDetalhe'>): string {
  const st = r.statusTransacao ?? 'sem transação'
  return r.statusDetalhe ? `${st} (${r.statusDetalhe})` : st
}

/**
 * Aplica a resposta do Mercado Pago ao saque. Muta no lugar, como o resto do estado.
 *
 *  - pago:         vira `pago`, guarda o id da transação como comprovante;
 *  - em andamento: continua `em_processamento`;
 *  - recusado:     volta à fila (`solicitado`) para a equipe corrigir a chave e tentar de novo, ou
 *                  recusar o saque. O dinheiro NÃO é estornado aqui: quem decide devolver é uma pessoa.
 *
 * Saque já `pago` ou `falhou` não muda — um webhook repetido não pode reabrir nada.
 */
export function aplicarResultadoDoPayout(s: Saque, r: ResultadoDoPayout, agora: number): Veredito {
  const v = vereditoDoPayout(r)
  if (s.status === 'pago' || s.status === 'falhou') return v

  s.payoutId = r.payoutId
  s.payoutTransacaoId = r.transacaoId ?? s.payoutTransacaoId ?? null
  s.detalheGateway = textoDoGateway(r)
  s.atualizadoEm = agora

  if (v === 'pago') {
    s.status = 'pago'
    s.pagoEm = agora
    s.comprovanteRef = r.transacaoId ?? r.payoutId
    s.motivoFalha = null
  } else if (v === 'recusado') {
    s.status = 'solicitado'
    s.canal = null
    s.aprovadoPor = null
    s.aprovadoEm = null
  } else {
    s.status = 'em_processamento'
  }
  return v
}
