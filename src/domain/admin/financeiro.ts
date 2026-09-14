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
  for (const l of noPer) {
    switch (l.tipo) {
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
