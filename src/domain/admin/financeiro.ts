/**
 * O resumo financeiro da Central de Resultados — os cartões e o fluxo mês a mês que
 * ficam acima da DRE na aba Financeiro (plano do Admin, seção 1.6).
 *
 * A DRE continua sendo a fonte oficial de receita e resultado (`dre.ts`, montada por
 * `dreCompleta()`). Este arquivo responde as perguntas de caixa que a DRE não responde
 * sozinha: quanto entrou de depósito, quanto saiu em saque, quanto de custódia foi
 * faturado e quanto foi pago.
 *
 * TUDO SAI DO LIVRO-RAZÃO E DAS FATURAS, NUNCA DE RECÁLCULO. Comissão é o lançamento
 * `comissao`; custódia paga é o lançamento `custodia` com sinal de saída; tarifa de
 * saque e de retirada são os lançamentos delas. Quando as frentes A e B mudarem como a
 * comissão e a custódia são lançadas, o fluxo acompanha sem mudar aqui.
 *
 * Regra pura: sem I/O. Dinheiro em centavos inteiros.
 */

import { chaveMes, type Periodo } from '@/domain/dre'
import type { LedgerEntry } from '@/domain/ledger'
import type { Cents, FaturaCustodia, Saque } from '@/domain/types'

export interface MesDoFluxo {
  /** 'AAAA-MM', no horário local — a mesma chave da DRE. */
  mes: string
  depositos: Cents
  saques: Cents
  comissoes: Cents
  custodiaPaga: Cents
  tarifas: Cents
  /** comissões + custódia paga + tarifas. */
  receita: Cents
}

export interface ResumoFinanceiro {
  depositos: { quantidade: number; valor: Cents; peloGateway: { quantidade: number; valor: Cents } }
  saquesPagos: { quantidade: number; valorLiquido: Cents; tarifas: Cents }
  saquesPendentes: { quantidade: number; valorLiquido: Cents }
  custodiaFaturada: { faturas: number; valor: Cents; pago: Cents }
  fluxoMensal: MesDoFluxo[]
}

function noPeriodo(ts: number | null | undefined, p: Periodo): boolean {
  return typeof ts === 'number' && ts >= p.inicio && ts < p.fim
}

export function resumirFinanceiro(entrada: {
  ledger: readonly LedgerEntry[]
  saques: readonly Saque[]
  faturas: readonly FaturaCustodia[]
  periodo: Periodo
}): ResumoFinanceiro {
  const { periodo } = entrada
  const noPer = entrada.ledger.filter((l) => noPeriodo(l.createdAt, periodo))

  const depositos = noPer.filter((l) => l.tipo === 'deposito')
  const peloGateway = depositos.filter((l) => l.refExterna !== null)

  const saquesPagos = entrada.saques.filter((s) => s.status === 'pago' && noPeriodo(s.pagoEm ?? null, periodo))
  const saquesPendentes = entrada.saques.filter((s) => s.status === 'solicitado' || s.status === 'em_processamento')

  const faturas = entrada.faturas.filter((f) => f.status !== 'cancelada' && noPeriodo(f.dataEmissao, periodo))

  const meses = new Map<string, MesDoFluxo>()
  const mesDe = (ts: number): MesDoFluxo => {
    const chave = chaveMes(ts)
    let m = meses.get(chave)
    if (!m) {
      m = { mes: chave, depositos: 0, saques: 0, comissoes: 0, custodiaPaga: 0, tarifas: 0, receita: 0 }
      meses.set(chave, m)
    }
    return m
  }
  // Saque recusado: o `estorno` devolve líquido + tarifa. A coluna de saques perde o líquido e a de
  // tarifas perde a tarifa — o mesmo desconto que a DRE faz na linha 3.1.03.
  const taxaPorSaque = new Map<string, Cents>()
  for (const l of entrada.ledger) if (l.tipo === 'taxa_saque' && l.refInterna) taxaPorSaque.set(l.refInterna, l.valor)
  for (const l of noPer) {
    switch (l.tipo) {
      case 'estorno': {
        if (l.refInterna?.startsWith('SAQ-')) {
          const taxa = taxaPorSaque.get(l.refInterna) ?? 0
          mesDe(l.createdAt).saques -= l.valor - taxa
          mesDe(l.createdAt).tarifas -= taxa
        }
        break
      }
      case 'deposito':
        mesDe(l.createdAt).depositos += l.valor
        break
      case 'saque':
        mesDe(l.createdAt).saques += l.valor
        break
      case 'comissao':
        mesDe(l.createdAt).comissoes += l.valor
        break
      case 'custodia':
        // Sinal zero é registro de fatura emitida; só a saída é dinheiro que entrou.
        if (l.sinal === -1) mesDe(l.createdAt).custodiaPaga += l.valor
        break
      case 'taxa_saque':
      case 'taxa_retirada':
        mesDe(l.createdAt).tarifas += l.valor
        break
      default:
        break
    }
  }
  for (const m of meses.values()) m.receita = m.comissoes + m.custodiaPaga + m.tarifas

  return {
    depositos: {
      quantidade: depositos.length,
      valor: depositos.reduce((s, l) => s + l.valor, 0),
      peloGateway: { quantidade: peloGateway.length, valor: peloGateway.reduce((s, l) => s + l.valor, 0) },
    },
    saquesPagos: {
      quantidade: saquesPagos.length,
      valorLiquido: saquesPagos.reduce((s, x) => s + x.valorLiquido, 0),
      tarifas: saquesPagos.reduce((s, x) => s + x.taxa, 0),
    },
    saquesPendentes: { quantidade: saquesPendentes.length, valorLiquido: saquesPendentes.reduce((s, x) => s + x.valorLiquido, 0) },
    custodiaFaturada: {
      faturas: faturas.length,
      valor: faturas.reduce((s, f) => s + f.valorCents, 0),
      pago: faturas.filter((f) => f.status === 'paga').reduce((s, f) => s + f.valorCents, 0),
    },
    fluxoMensal: [...meses.values()].sort((a, b) => (a.mes < b.mes ? -1 : 1)),
  }
}

/* ------------------------------------------------------------------ *
 * Saldo dos clientes (Rogério, 22/11/2026: "quanto temos em nossa     *
 * conta bancária que pertence aos clientes")                          *
 * ------------------------------------------------------------------ */

/** Uma linha da conta que fecha o saldo: o que ela é, de onde vem e quanto mexeu no saldo (com sinal). */
export interface LinhaDeReconciliacao {
  chave: string
  rotulo: string
  /** Com sinal: positivo aumentou o saldo dos clientes, negativo diminuiu. */
  valor: Cents
}

export interface SaldoDosClientes {
  /** Quantas contas entram na soma. */
  contas: number
  /** Σ `balance`: o que cada cliente pode gastar agora. */
  disponivel: Cents
  /** Dinheiro que saiu do disponível e ainda não terminou o caminho: ofertas pré-pagas + saques a caminho. */
  emReserva: Cents
  reservas: { ofertasPrePagas: Cents; saquesACaminho: Cents }
  /** `disponivel + emReserva`: o dinheiro de terceiros que a Áurea guarda. */
  total: Cents
  /** A conta que fecha o disponível a partir do livro-razão (todo o histórico, não só o período). */
  reconciliacao: {
    linhas: LinhaDeReconciliacao[]
    /** Σ dos lançamentos com sinal, das mesmas contas. */
    somaDosLancamentos: Cents
    /** `disponivel − somaDosLancamentos`. Zero quando fecha; senão aparece como "diferença a explicar", nunca escondida. */
    diferencaAExplicar: Cents
  }
}

/** Como cada tipo de lançamento entra na conta que fecha o saldo (rótulo de cliente leigo). */
const LINHAS_DA_RECONCILIACAO: ReadonlyArray<{ chave: string; rotulo: string; tipos: readonly string[] }> = [
  { chave: 'saldo_inicial', rotulo: 'Saldo anterior (aberto com a conta)', tipos: ['saldo_inicial'] },
  { chave: 'deposito', rotulo: 'Depósitos dos clientes', tipos: ['deposito'] },
  { chave: 'venda', rotulo: 'Vendas de moedas', tipos: ['venda'] },
  { chave: 'compra', rotulo: 'Compras de moedas', tipos: ['compra'] },
  { chave: 'saque', rotulo: 'Saques pedidos', tipos: ['saque'] },
  { chave: 'comissao', rotulo: 'Comissões de negociação', tipos: ['comissao'] },
  { chave: 'custodia', rotulo: 'Custódia paga', tipos: ['custodia'] },
  { chave: 'tarifas', rotulo: 'Tarifas de saque e de retirada', tipos: ['taxa_saque', 'taxa_retirada'] },
  { chave: 'frete', rotulo: 'Frete dos envios (repasse aos Correios)', tipos: ['frete'] },
  { chave: 'estorno', rotulo: 'Estornos (dinheiro devolvido)', tipos: ['estorno'] },
  { chave: 'ajuste', rotulo: 'Ajustes feitos pela equipe', tipos: ['ajuste'] },
]

/**
 * O dinheiro dos clientes dentro da Áurea, em duas partes — disponível e em reserva — e a conta que o fecha.
 *
 * `excluir` tira da soma as contas que não são de cliente (a da própria Áurea): o dinheiro dela não é de terceiros.
 * Conta da equipe continua dentro até o Gabriel mandar tirar.
 */
export function saldoDosClientes(entrada: {
  usuarios: Readonly<Record<string, { balance: Cents }>>
  ofertasDeCompra: ReadonlyArray<{ buyer: string; modalidade?: string; pagoAntecipadoCents?: Cents }>
  saques: readonly Saque[]
  ledger: readonly LedgerEntry[]
  excluir?: (email: string) => boolean
}): SaldoDosClientes {
  const fora = entrada.excluir ?? (() => false)
  const emails = Object.keys(entrada.usuarios).filter((e) => !fora(e))
  const disponivel = emails.reduce((s, e) => s + entrada.usuarios[e].balance, 0)
  const ofertasPrePagas = entrada.ofertasDeCompra
    .filter((b) => b.modalidade === 'prepago' && !fora(b.buyer))
    .reduce((s, b) => s + Math.max(0, b.pagoAntecipadoCents ?? 0), 0)
  const saquesACaminho = entrada.saques
    .filter((s) => (s.status === 'solicitado' || s.status === 'em_processamento') && !fora(s.userEmail))
    .reduce((s, x) => s + x.valorTotal, 0)

  const doLivro = entrada.ledger.filter((l) => !fora(l.userEmail))
  const linhas: LinhaDeReconciliacao[] = LINHAS_DA_RECONCILIACAO.map((def) => ({
    chave: def.chave,
    rotulo: def.rotulo,
    valor: doLivro.filter((l) => def.tipos.includes(l.tipo)).reduce((s, l) => s + l.valor * l.sinal, 0),
  }))
  const somaDosLancamentos = doLivro.reduce((s, l) => s + l.valor * l.sinal, 0)

  return {
    contas: emails.length,
    disponivel,
    emReserva: ofertasPrePagas + saquesACaminho,
    reservas: { ofertasPrePagas, saquesACaminho },
    total: disponivel + ofertasPrePagas + saquesACaminho,
    reconciliacao: { linhas, somaDosLancamentos, diferencaAExplicar: disponivel - somaDosLancamentos },
  }
}

/**
 * Soma as colunas de dinheiro de um relatório pelo NOME da coluna — é assim que a tela
 * lê o relatório `recebimentos-gateway`, que a frente B cria na B3. O contrato dos
 * relatórios (docs/API_RELATORIOS.md) diz que coluna de dinheiro tem "Bruto", "Tarifa",
 * "Liquido"… no nome e sai em reais; aqui ela volta a centavos.
 */
export function somarColunasDeDinheiro(
  colunas: readonly string[],
  linhas: ReadonlyArray<Record<string, string | number | boolean | null>>,
  padroes: Readonly<Record<string, RegExp>>,
): Record<string, Cents | null> {
  const saida: Record<string, Cents | null> = {}
  for (const [nome, padrao] of Object.entries(padroes)) {
    const coluna = colunas.find((c) => padrao.test(c))
    if (!coluna) {
      saida[nome] = null
      continue
    }
    saida[nome] = linhas.reduce((s, l) => s + (typeof l[coluna] === 'number' ? Math.round((l[coluna] as number) * 100) : 0), 0)
  }
  return saida
}
