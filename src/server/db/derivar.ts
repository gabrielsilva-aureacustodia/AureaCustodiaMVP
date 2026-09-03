/**
 * Deriva, de uma mutação já planejada, o que vai para o ledger e para a
 * trilha de auditoria. MÓDULO PURO — sem I/O, sem `server-only` — testado
 * contra o Postgres embutido em db.test.ts através de estado.ts.
 *
 * POR QUE O LEDGER É DERIVADO AQUI, E NÃO ESCRITO PELAS SERVER ACTIONS
 * --------------------------------------------------------------------
 * As Server Actions são superfície protegida, e cada uma mexe no saldo do seu
 * jeito (`buyer.balance -= price`). Pedir a cada ação que também gravasse o
 * lançamento correspondente seria abrir a porta para a ação que esquece — e
 * um ledger com buracos não fecha. Derivar do DIFF fecha a porta por
 * construção: o que mudou de saldo entre o estado que entrou e o que saiu
 * precisa ser explicado por negociações, depósitos e contas novas; o que
 * sobrar vira um `ajuste` explícito, visível no relatório, em vez de sumir.
 *
 * A INVARIANTE que `derivarLancamentos` garante: para toda conta,
 * saldo_antes + soma(valor × sinal dos lançamentos novos) = saldo_depois.
 *
 * A SEMEADURA. Num banco vazio, `depois` é o seed inteiro: sete contas com
 * saldo e ~32 negociações passadas. As contas ganham um `saldo_inicial`
 * calculado para que, somado às negociações do histórico, o livro chegue
 * exatamente ao saldo do seed — assim o histórico de demonstração também tem
 * ledger, com saldo resultante linha a linha, e a DRE mostra a receita dele.
 */

import { fdate } from '@/domain/dates'
import { tradeFee } from '@/domain/fees'
import {
  encadear,
  lancamentoDeAjuste,
  lancamentoDeCustodia,
  lancamentoDeDeposito,
  lancamentoDeSaldoInicial,
  lancamentosDeTrade,
  type LancamentoPendente,
  type LedgerEntry,
} from '@/domain/ledger'
import type { AppState, Cents, UserEmail } from '@/domain/types'

import type { Operacao } from './diff'

export interface ContextoDerivacao {
  antes: AppState
  depois: AppState
  ops: readonly Operacao[]
  /** true quando `antes` estava vazio e `depois` é o seed. */
  semeadura: boolean
  agora: number
  hashAnterior: string
}

export interface Derivado {
  lancamentos: LedgerEntry[]
  /** Contas cujo saldo mudou sem explicação — cada uma virou um `ajuste`. */
  ajustes: Array<{ email: UserEmail; diferenca: Cents }>
}

/** 'dd/mm/aaaa' -> ms local, ou `fallback` quando malformada. */
function deDataBR(s: string, fallback: number): number {
  const [d, m, a] = s.split('/').map((x) => parseInt(x, 10))
  if (!d || !m || !a) return fallback
  return new Date(a, m - 1, d).getTime()
}

export function derivarLancamentos(ctx: ContextoDerivacao): Derivado {
  const { antes, depois, ops, semeadura, agora, hashAnterior } = ctx
  const nomes: Record<UserEmail, string> = {}
  for (const [email, u] of Object.entries(depois.users)) nomes[email] = u.name

  const pendentes: LancamentoPendente[] = []

  /* negociações novas — ref = posição no histórico, que é o id em aurea.trades */
  const tradesNovos = depois.trades.slice(antes.trades.length)
  tradesNovos.forEach((t, i) => {
    const fee = t.fee ?? tradeFee(t.price) * (t.qty || 1)
    pendentes.push(...lancamentosDeTrade(t, fee, `TRADE-${antes.trades.length + i + 1}`, nomes))
  })

  /* depósitos novos */
  const depositsNovos = depois.deposits.slice(antes.deposits.length)
  depositsNovos.forEach((d, i) => {
    pendentes.push(lancamentoDeDeposito(d, `DEP-${antes.deposits.length + i + 1}`))
  })

  /* cobranças de custódia gravadas nesta mutação (sinal zero) */
  for (const op of ops) {
    if (op.tipo !== 'custodyCharge.gravar') continue
    const quando = semeadura ? deDataBR(op.cobranca.dataCobranca, agora) : agora
    pendentes.push(lancamentoDeCustodia(op.email, op.cobranca, quando, null))
  }

  /* efeito líquido dos lançamentos acima, por conta */
  const efeito: Record<UserEmail, Cents> = {}
  for (const p of pendentes) efeito[p.userEmail] = (efeito[p.userEmail] ?? 0) + p.valor * p.sinal

  /* contas novas: saldo_inicial = saldo final − o que os lançamentos já explicam */
  const saldosIniciais: Record<UserEmail, Cents> = {}
  for (const [email, u] of Object.entries(antes.users)) saldosIniciais[email] = u.balance

  const primeiroFato = pendentes.reduce((min, p) => Math.min(min, p.createdAt), agora)
  const aberturas: LancamentoPendente[] = []
  for (const [email, u] of Object.entries(depois.users)) {
    if (email in antes.users) continue
    const abertura = u.balance - (efeito[email] ?? 0)
    saldosIniciais[email] = 0
    aberturas.push(
      lancamentoDeSaldoInicial(
        email,
        abertura,
        // Antes de qualquer fato desta mutação: o livro da conta começa aqui.
        semeadura ? primeiroFato - 1 : agora,
        semeadura ? 'Saldo inicial da conta de demonstração (seed)' : 'Saldo inicial da conta',
      ),
    )
  }

  /* ordem do livro: abertura primeiro; o resto na ordem cronológica dos fatos */
  const ordenados = [...aberturas, ...pendentes.slice().sort((a, b) => a.createdAt - b.createdAt)]

  const { lancamentos, saldos } = encadear(ordenados, saldosIniciais, hashAnterior)

  /* o que sobrou sem explicação vira ajuste, na ponta da cadeia */
  const ajustes: Derivado['ajustes'] = []
  let hashCorrente = lancamentos.length ? lancamentos[lancamentos.length - 1].hash : hashAnterior
  for (const [email, u] of Object.entries(depois.users)) {
    const calculado = saldos[email] ?? saldosIniciais[email] ?? 0
    const diferenca = u.balance - calculado
    if (diferenca === 0) continue
    ajustes.push({ email, diferenca })
    const { lancamentos: extra } = encadear(
      [lancamentoDeAjuste(email, diferenca, agora, 'Variação de saldo não explicada por negociação, depósito ou abertura')],
      { [email]: calculado },
      hashCorrente,
    )
    lancamentos.push(...extra)
    hashCorrente = extra[0].hash
  }

  return { lancamentos, ajustes }
}

/* ---------- auditoria ---------- */

export interface ResumoAuditoria {
  acao: string
  usuariosAfetados: string[]
  detalhes: Record<string, unknown>
}

/**
 * Resume as operações gravadas numa linha de auditoria: a ação inferida, as
 * contas tocadas e a contagem por tipo de operação com as chaves envolvidas.
 * Não guarda valores — o ledger já os tem, com hash.
 */
export function resumirParaAuditoria(ops: readonly Operacao[], semeadura: boolean, ajustes: Derivado['ajustes']): ResumoAuditoria {
  const contagem: Record<string, number> = {}
  const chaves: Record<string, string[]> = {}
  const afetados = new Set<string>()

  const anotar = (op: Operacao, chave: string, ...emails: string[]): void => {
    contagem[op.tipo] = (contagem[op.tipo] ?? 0) + 1
    ;(chaves[op.tipo] ??= []).push(chave)
    for (const e of emails) afetados.add(e)
  }

  for (const op of ops) {
    switch (op.tipo) {
      case 'user.inserir':
      case 'user.atualizar':
      case 'user.remover':
        anotar(op, op.email, op.email)
        break
      case 'coin.inserir':
      case 'coin.atualizar':
        anotar(op, op.registro.coin.id, op.registro.owner)
        break
      case 'coin.remover':
        anotar(op, op.id)
        break
      case 'sellOffer.inserir':
      case 'sellOffer.atualizar':
        anotar(op, op.oferta.id, op.oferta.seller)
        break
      case 'sellOffer.remover':
      case 'buyOrder.remover':
        anotar(op, op.id)
        break
      case 'buyOrder.inserir':
      case 'buyOrder.atualizar':
        anotar(op, op.ordem.id, op.ordem.buyer)
        break
      case 'trade.inserir':
        anotar(op, `${op.trade.tipoMoeda} ×${op.trade.qty}`, op.trade.buyer, op.trade.seller)
        break
      case 'envio.inserir':
      case 'envio.atualizar':
        anotar(op, op.envio.protocolo, op.envio.userEmail)
        break
      case 'envio.remover':
        anotar(op, op.protocolo)
        break
      case 'deposit.inserir':
        anotar(op, String(op.deposito.valor), op.deposito.userEmail)
        break
      case 'custodyCharge.gravar':
      case 'custodyCharge.remover':
        anotar(op, op.email, op.email)
        break
      case 'seq.atualizar':
        anotar(op, `${op.seq.coin}/${op.seq.envio}`)
        break
    }
  }

  const tem = (t: Operacao['tipo']): boolean => (contagem[t] ?? 0) > 0
  let acao = 'mutacao'
  if (semeadura) acao = 'semeadura'
  else if (tem('trade.inserir')) acao = 'negociacao'
  else if (tem('deposit.inserir')) acao = 'deposito'
  else if (tem('user.inserir')) acao = 'conta.criar'
  else if (tem('custodyCharge.gravar')) acao = 'custodia.cobranca'
  else if (tem('envio.inserir')) acao = 'envio.criar'
  else if (tem('envio.atualizar')) acao = 'envio.atualizar'
  else if (tem('sellOffer.inserir')) acao = 'anuncio.publicar'
  else if (tem('sellOffer.atualizar')) acao = 'anuncio.editar'
  else if (tem('sellOffer.remover')) acao = 'anuncio.remover'
  else if (tem('buyOrder.inserir')) acao = 'bid.publicar'
  else if (tem('buyOrder.atualizar')) acao = 'bid.editar'
  else if (tem('buyOrder.remover')) acao = 'bid.remover'
  else if (tem('user.atualizar')) acao = 'conta.atualizar'

  // Chaves limitadas: a semeadura toca ~90 moedas e a linha não precisa listá-las.
  const chavesResumidas: Record<string, string[]> = {}
  for (const [tipo, lista] of Object.entries(chaves)) chavesResumidas[tipo] = lista.slice(0, 20)

  return {
    acao,
    usuariosAfetados: [...afetados].sort(),
    detalhes: {
      operacoes: contagem,
      chaves: chavesResumidas,
      ...(ajustes.length ? { ajustes: ajustes.map((a) => ({ email: a.email, diferenca: a.diferenca })) } : {}),
      registradoEm: fdate(Date.now()),
    },
  }
}
