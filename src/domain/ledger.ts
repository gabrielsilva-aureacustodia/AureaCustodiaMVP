/**
 * Livro-razão financeiro (ledger) — módulo M4.
 *
 * NÃO É PORT. O monolito guardava só o saldo final de cada conta; quem quisesse
 * saber de onde veio cada centavo tinha de acreditar. O ledger é a resposta:
 * TODA movimentação de dinheiro vira um lançamento imutável, com o saldo
 * resultante gravado e um hash que incorpora o do lançamento anterior.
 *
 * REGRA PURA, como tudo em @/domain: recebe negociações, depósitos e cobranças
 * e devolve lançamentos. Quem grava é src/server/db/repositories/ledger.ts;
 * quem decide QUANDO derivar é src/server/db/estado.ts, dentro da mesma
 * transação que grava a mutação — não existe saldo alterado sem lançamento.
 *
 * O QUE CADA MUTAÇÃO DO SALDO PRODUZ
 * ----------------------------------
 *  - negociação: `compra` (comprador, −preço×qtd), `venda` (vendedor, +preço×qtd)
 *    e `comissao` (vendedor, −taxa). A comissão sai do lado do vendedor, como no
 *    motor e no extrato; o lançamento `comissao` é também a RECEITA da Áurea, e
 *    é dele que a DRE lê a receita de corretagem — nunca recalculando;
 *  - depósito: `deposito` (+valor);
 *  - saldo inicial de conta nova (seed ou cadastro): `saldo_inicial`, com o
 *    valor que a conta trouxe, para que a soma do ledger bata com o saldo;
 *  - cobrança de custódia: `custodia`, com SINAL ZERO. A plataforma registra a
 *    taxa mas ainda não a debita (ver o extrato). Entra no ledger para a DRE
 *    conhecer a receita de custódia registrada, sem mexer no saldo de ninguém;
 *  - `ajuste`: a válvula de escape. Se uma mutação alterar saldo por um caminho
 *    que o derivador não reconhece, a diferença vira um `ajuste` explícito em
 *    vez de sumir. Um ledger que não fecha é pior que um ledger com um ajuste
 *    visível — e o ajuste aparece no relatório para alguém explicar.
 *
 * INVARIANTE: para toda conta, soma(valor × sinal) dos lançamentos = saldo
 * atual, ao centavo. `encadear` garante isso por construção e é testado.
 *
 * DINHEIRO É `Cents` INTEIRO. `valor` é sempre >= 0 e o sentido está em `sinal`.
 */

import { hashEncadeado, type CampoDeHash } from '@/domain/hash'
import type { Cents, Deposit, FaturaCustodia, Timestamp, Trade, UserEmail } from '@/domain/types'

export type LedgerTipo =
  | 'saldo_inicial'
  | 'deposito'
  | 'compra'
  | 'venda'
  | 'comissao'
  | 'custodia'
  | 'estorno'
  | 'ajuste'
  | 'saque'
  | 'taxa_saque'
  | 'taxa_retirada'

export type Sinal = -1 | 0 | 1

/** Um lançamento ANTES do encadeamento: sem saldo resultante e sem hash. */
export interface LancamentoPendente {
  createdAt: Timestamp
  userEmail: UserEmail
  tipo: LedgerTipo
  /** Sempre >= 0; o sentido é `sinal`. */
  valor: Cents
  sinal: Sinal
  tipoMoeda: string | null
  quantidade: number | null
  /** Identificador interno do fato gerador (negociação, depósito, protocolo). */
  refInterna: string | null
  /** Identificador em sistema externo (id do pagamento no gateway). */
  refExterna: string | null
  descricao: string
}

/** O lançamento completo, como vai para `aurea.ledger_entries`. */
export interface LedgerEntry extends LancamentoPendente {
  /** Saldo da conta DEPOIS deste lançamento. */
  saldoApos: Cents
  hashAnterior: string
  hash: string
}

/**
 * A ordem dos campos que entram no hash. CONGELADA — ver hash.ts. `saldoApos`
 * entra de propósito: uma linha com saldo adulterado quebra a cadeia mesmo que
 * o valor não mude.
 */
export const CAMPOS_DO_LANCAMENTO = [
  'createdAt',
  'userEmail',
  'tipo',
  'valor',
  'sinal',
  'saldoApos',
  'tipoMoeda',
  'quantidade',
  'refInterna',
  'refExterna',
  'descricao',
] as const

export function camposParaHash(e: Omit<LedgerEntry, 'hash' | 'hashAnterior'>): CampoDeHash[] {
  return CAMPOS_DO_LANCAMENTO.map((c) => e[c])
}

export function hashDeLancamento(e: Omit<LedgerEntry, 'hash'>): string {
  return hashEncadeado(e.hashAnterior, camposParaHash(e))
}

/* ---------- derivação a partir dos fatos do domínio ---------- */

/** Comissão total da negociação: a congelada, quando existe, senão a calculada por quem chama. */
export function lancamentosDeTrade(
  t: Trade,
  feeTotal: Cents,
  refInterna: string,
  nomes: Record<UserEmail, string> = {},
): LancamentoPendente[] {
  const qty = t.qty || 1
  const bruto = t.price * qty
  const nomeVendedor = nomes[t.seller] ?? t.seller
  const nomeComprador = nomes[t.buyer] ?? t.buyer
  return [
    {
      createdAt: t.date,
      userEmail: t.buyer,
      tipo: 'compra',
      valor: bruto,
      sinal: -1,
      tipoMoeda: t.tipoMoeda,
      quantidade: qty,
      refInterna,
      refExterna: null,
      descricao: `Compra de ${qty} ${t.tipoMoeda} de ${nomeVendedor}`,
    },
    {
      createdAt: t.date,
      userEmail: t.seller,
      tipo: 'venda',
      valor: bruto,
      sinal: 1,
      tipoMoeda: t.tipoMoeda,
      quantidade: qty,
      refInterna,
      refExterna: null,
      descricao: `Venda de ${qty} ${t.tipoMoeda} para ${nomeComprador}`,
    },
    {
      createdAt: t.date,
      userEmail: t.seller,
      tipo: 'comissao',
      valor: feeTotal,
      sinal: -1,
      tipoMoeda: t.tipoMoeda,
      quantidade: qty,
      refInterna,
      refExterna: null,
      descricao: `Comissão de corretagem (0,5% + R$ 1,00 por moeda)`,
    },
  ]
}

export function lancamentoDeDeposito(d: Deposit, refInterna: string, refExterna: string | null = null): LancamentoPendente {
  return {
    createdAt: d.date,
    userEmail: d.userEmail,
    tipo: 'deposito',
    valor: d.valor,
    sinal: 1,
    tipoMoeda: null,
    quantidade: null,
    refInterna,
    refExterna,
    descricao: refExterna ? 'Depósito confirmado pelo gateway' : 'Depósito simulado em conta',
  }
}

export function lancamentoDeSaldoInicial(email: UserEmail, saldo: Cents, quando: Timestamp, motivo: string): LancamentoPendente {
  return {
    createdAt: quando,
    userEmail: email,
    tipo: 'saldo_inicial',
    valor: Math.abs(saldo),
    sinal: saldo >= 0 ? 1 : -1,
    tipoMoeda: null,
    quantidade: null,
    refInterna: null,
    refExterna: null,
    descricao: motivo,
  }
}

/**
 * Fatura mensal de custódia.
 *
 * O sinal depende de o dinheiro ter saído: fatura liquidada com saldo é saída
 * de caixa (-1); fatura pendente, cancelada ou paga por fora é registro, com
 * sinal ZERO, para o livro não afirmar uma movimentação que não houve.
 *
 * Substituiu `lancamentoDeCustodia(CustodyCharge)` em 11/09/2026, quando o
 * mecanismo antigo — cobrança única por usuário, rotulada "anual" e calculada
 * pela tabela de faixas — saiu por decisão do Gabriel.
 */
export function lancamentoDeCustodia(
  email: UserEmail,
  f: FaturaCustodia,
  quando: Timestamp,
  refInterna: string | null,
): LancamentoPendente {
  const debitouSaldo = f.status === 'paga' && f.formaPagamento === 'saldo'
  return {
    createdAt: quando,
    userEmail: email,
    tipo: 'custodia',
    valor: f.valorCents,
    sinal: debitouSaldo ? -1 : 0,
    tipoMoeda: null,
    quantidade: f.quantidadeMoedas,
    refInterna: refInterna ?? f.id,
    refExterna: null,
    descricao: `Custódia mensal ${f.competencia} · ${f.quantidadeMoedas} moeda(s) — ${f.status}`,
  }
}

export function lancamentoDeAjuste(email: UserEmail, diferenca: Cents, quando: Timestamp, motivo: string): LancamentoPendente {
  return {
    createdAt: quando,
    userEmail: email,
    tipo: 'ajuste',
    valor: Math.abs(diferenca),
    sinal: diferenca >= 0 ? 1 : -1,
    tipoMoeda: null,
    quantidade: null,
    refInterna: null,
    refExterna: null,
    descricao: motivo,
  }
}

export function lancamentoDeSaque(
  email: UserEmail,
  valorLiquido: Cents,
  quando: Timestamp,
  refInterna: string,
  refExterna: string | null = null,
): LancamentoPendente {
  return {
    createdAt: quando,
    userEmail: email,
    tipo: 'saque',
    valor: valorLiquido,
    sinal: -1,
    tipoMoeda: null,
    quantidade: null,
    refInterna,
    refExterna,
    descricao: refExterna
      ? `Saque de saldo via Pix/transferência (${refExterna})`
      : 'Saque de saldo via Pix/transferência bancária',
  }
}

export function lancamentoDeTaxaSaque(
  email: UserEmail,
  taxa: Cents,
  quando: Timestamp,
  refInterna: string,
): LancamentoPendente {
  return {
    createdAt: quando,
    userEmail: email,
    tipo: 'taxa_saque',
    valor: taxa,
    sinal: -1,
    tipoMoeda: null,
    quantidade: null,
    refInterna,
    refExterna: null,
    descricao: 'Tarifa fixa de saque de recursos',
  }
}

export function lancamentoDeTaxaRetirada(
  email: UserEmail,
  valor: Cents,
  quando: Timestamp,
  coinId: string,
  descricao = `Taxa de retirada física da moeda ${coinId}`,
): LancamentoPendente {
  return {
    createdAt: quando,
    userEmail: email,
    tipo: 'taxa_retirada',
    valor,
    sinal: -1,
    tipoMoeda: null,
    quantidade: 1,
    refInterna: coinId,
    refExterna: null,
    descricao,
  }
}

/* ---------- encadeamento ---------- */

/**
 * Transforma lançamentos pendentes em lançamentos completos: calcula o saldo
 * resultante de cada conta na ordem recebida e encadeia os hashes a partir de
 * `hashAnterior` (o último hash gravado, ou GENESIS num livro vazio).
 *
 * A ORDEM RECEBIDA É A ORDEM DO LIVRO. Quem chama garante que ela é a ordem
 * cronológica dos fatos dentro da transação — o encadeamento não reordena,
 * porque reordenar mudaria o saldo intermediário de cada linha.
 *
 * Devolve também os saldos finais, para quem chama conferir contra o estado.
 */
export function encadear(
  pendentes: readonly LancamentoPendente[],
  saldosIniciais: Readonly<Record<UserEmail, Cents>>,
  hashAnterior: string,
): { lancamentos: LedgerEntry[]; saldos: Record<UserEmail, Cents> } {
  const saldos: Record<UserEmail, Cents> = { ...saldosIniciais }
  const lancamentos: LedgerEntry[] = []
  let anterior = hashAnterior

  for (const p of pendentes) {
    if (!Number.isInteger(p.valor) || p.valor < 0) {
      throw new Error(`Lançamento com valor inválido (${String(p.valor)}) para ${p.userEmail}`)
    }
    const saldoApos = (saldos[p.userEmail] ?? 0) + p.valor * p.sinal
    saldos[p.userEmail] = saldoApos
    const semHash: Omit<LedgerEntry, 'hash'> = { ...p, saldoApos, hashAnterior: anterior }
    const hash = hashDeLancamento(semHash)
    lancamentos.push({ ...semHash, hash })
    anterior = hash
  }

  return { lancamentos, saldos }
}

/* ---------- leituras ---------- */

/** Soma do ledger de uma conta: precisa bater com `user.balance`, ao centavo. */
export function saldoPorSoma(lancamentos: readonly LedgerEntry[], email: UserEmail): Cents {
  return lancamentos
    .filter((l) => l.userEmail === email)
    .reduce((s, l) => s + l.valor * l.sinal, 0)
}

export interface VerificacaoCadeia {
  ok: boolean
  /** Índice (na lista recebida) da primeira linha cujo hash não confere, ou null. */
  primeiraQuebra: number | null
  motivo: string | null
}

/**
 * Reconfere a cadeia inteira: cada linha precisa (1) apontar para o hash da
 * anterior e (2) ter o hash que os próprios campos produzem. A lista tem de
 * vir na ordem do livro (por id crescente).
 */
export function verificarCadeia(lancamentos: readonly LedgerEntry[], genesis: string): VerificacaoCadeia {
  let anterior = genesis
  for (let i = 0; i < lancamentos.length; i++) {
    const l = lancamentos[i]
    if (l.hashAnterior !== anterior) {
      return { ok: false, primeiraQuebra: i, motivo: 'hash_anterior não aponta para a linha anterior' }
    }
    const esperado = hashDeLancamento({ ...l })
    if (esperado !== l.hash) {
      return { ok: false, primeiraQuebra: i, motivo: 'o conteúdo da linha não produz o hash gravado' }
    }
    anterior = l.hash
  }
  return { ok: true, primeiraQuebra: null, motivo: null }
}
