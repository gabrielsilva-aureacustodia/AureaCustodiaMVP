/**
 * A análise do controle financeiro — só reorganiza números que a DRE já calculou, para a tela
 * contar a história "do faturamento ao resultado" (25/10/2026).
 *
 * NADA DE ALÍQUOTA AQUI. ISS, PIS, COFINS, IRPJ e CSLL vêm prontos de `Dre.totais` (calculados
 * com os parâmetros que o contador preenche); as tarifas do Mercado Pago, da linha 4.1.07 da DRE
 * (gravadas pela conciliação, uma por pagamento). Esta camada soma, agrupa e faz proporção.
 */

import type { Dre, LinhaDre } from '@/domain/dre'
import type { Cents } from '@/domain/types'

import { MESES_DA_PERIODICIDADE, ocorrenciasEntre, somarMeses, valorMensalizado, vigente, type Recorrente } from './controle'

export const CONTA_TARIFAS_GATEWAY = '4.1.07'

export type NaturezaPasso = 'entrada' | 'saida' | 'resultado'

export interface PassoDaCascata {
  chave: string
  rotulo: string
  /** Sempre positivo; a natureza diz se soma ou subtrai. */
  valor: Cents
  natureza: NaturezaPasso
  detalhe?: string
}

function linha(dre: Dre, codigo: string): LinhaDre | undefined {
  return dre.linhas.find((l) => l.codigo === codigo)
}

/**
 * Na DRE as linhas de dedução, despesa e imposto vêm NEGATIVAS ("(−) Despesas"), e os totais vêm
 * positivos. Esta camada trabalha sempre com o valor absoluto da linha — achado no teste em
 * produção de 25/10/2026, quando a tarifa apareceu como −R$ 16,63 e os custos em dobro.
 */
export function tarifaGatewayDaDre(dre: Dre): Cents {
  return Math.abs(linha(dre, CONTA_TARIFAS_GATEWAY)?.valor ?? 0)
}

/** Despesas manuais (4.x) sem a tarifa de gateway, que tem passo próprio. */
export function despesasSemGateway(dre: Dre): Cents {
  return Math.max(0, dre.totais.despesasOperacionais - tarifaGatewayDaDre(dre))
}

/** Do faturamento ao resultado, na ordem em que o dinheiro sai. */
export function cascata(dre: Dre): PassoDaCascata[] {
  const t = dre.totais
  const gateway = tarifaGatewayDaDre(dre)
  return [
    { chave: 'receita', rotulo: 'Receita bruta', valor: t.receitaBruta, natureza: 'entrada', detalhe: 'comissões, custódia, tarifas e outras receitas' },
    { chave: 'deducoes', rotulo: 'Impostos sobre a receita', valor: t.deducoes, natureza: 'saida', detalhe: 'ISS, PIS e COFINS' },
    { chave: 'gateway', rotulo: 'Tarifas do Mercado Pago', valor: gateway, natureza: 'saida', detalhe: 'descontadas de cada pagamento recebido' },
    { chave: 'custos', rotulo: 'Custos e despesas da empresa', valor: despesasSemGateway(dre), natureza: 'saida', detalhe: 'lançamentos manuais e recorrentes' },
    { chave: 'ir', rotulo: 'IRPJ e CSLL', valor: t.irpj + t.irpjAdicional + t.csll, natureza: 'saida', detalhe: 'sobre o lucro presumido' },
    { chave: 'resultado', rotulo: 'Resultado líquido', valor: Math.abs(t.resultadoLiquido), natureza: 'resultado', detalhe: t.resultadoLiquido < 0 ? 'prejuízo no período' : 'o que sobrou' },
  ]
}

/** Quanto de cada R$ 100 de receita foi para impostos + tarifas + custos. Null sem receita. */
export function pesoSobreReceitaBp(parte: Cents, receita: Cents): number | null {
  return receita > 0 ? Math.round((parte * 10000) / receita) : null
}

export interface FatiaNomeada {
  chave: string
  rotulo: string
  valor: Cents
}

/** As linhas 3.1.xx da DRE com valor, maior primeiro. */
export function receitasPorTipo(dre: Dre): FatiaNomeada[] {
  return dre.linhas
    .filter((l) => l.nivel === 2 && l.codigo.startsWith('3.1.') && l.valor > 0)
    .map((l) => ({ chave: l.codigo, rotulo: l.descricao, valor: l.valor }))
    .sort((a, b) => b.valor - a.valor)
}

/** As linhas 4.x da DRE com valor (inclui a 4.1.07), maior primeiro. */
export function despesasPorConta(dre: Dre): FatiaNomeada[] {
  return dre.linhas
    .filter((l) => l.nivel === 2 && l.codigo.startsWith('4.') && l.valor !== 0)
    .map((l) => ({ chave: l.codigo, rotulo: l.descricao, valor: Math.abs(l.valor) }))
    .sort((a, b) => b.valor - a.valor)
}

/** Custos manuais do período somados por setor ("Sem setor" para os antigos). */
export function custosPorSetor(
  lancamentos: ReadonlyArray<{ contaCodigo: string; valor: Cents; setorId: number | null }>,
  setores: ReadonlyArray<{ id: number; nome: string }>,
): FatiaNomeada[] {
  const nomes = new Map(setores.map((s) => [s.id, s.nome]))
  const soma = new Map<string, FatiaNomeada>()
  for (const l of lancamentos) {
    if (!l.contaCodigo.startsWith('4.')) continue
    const chave = l.setorId === null ? 'sem' : String(l.setorId)
    const atual = soma.get(chave) ?? { chave, rotulo: l.setorId === null ? 'Sem setor' : (nomes.get(l.setorId) ?? 'Setor removido'), valor: 0 }
    atual.valor += l.valor
    soma.set(chave, atual)
  }
  return [...soma.values()].sort((a, b) => b.valor - a.valor)
}

export interface ResumoRecorrentes {
  /** Soma mensalizada dos custos que valem hoje (o "custo fixo" da empresa). */
  custoFixoMensal: Cents
  receitaRecorrenteMensal: Cents
  /** O que vence nos próximos 30 dias, custos e receitas separados. */
  proximos30: { custos: Cents; receitas: Cents; itens: Array<{ id: number; descricao: string; dia: string; valor: Cents; tipo: 'custo' | 'receita' }> }
  /** Custo fixo anual = mensal × 12, para o sócio pensar no ano. */
  custoFixoAnual: Cents
}

export function resumirRecorrentes(lista: readonly Recorrente[], hoje: string): ResumoRecorrentes {
  const valendo = lista.filter((r) => vigente(r, hoje))
  const custoFixoMensal = valendo.filter((r) => r.tipo === 'custo').reduce((t, r) => t + valorMensalizado(r), 0)
  const receitaRecorrenteMensal = valendo.filter((r) => r.tipo === 'receita').reduce((t, r) => t + valorMensalizado(r), 0)
  const ate = somarMeses(hoje, 1)
  const itens = lista
    .flatMap((r) => ocorrenciasEntre(r, hoje, ate).map((dia) => ({ id: r.id, descricao: r.descricao, dia, valor: r.valor, tipo: r.tipo })))
    .sort((a, b) => (a.dia < b.dia ? -1 : a.dia > b.dia ? 1 : 0))
  return {
    custoFixoMensal,
    receitaRecorrenteMensal,
    custoFixoAnual: custoFixoMensal * 12,
    proximos30: {
      custos: itens.filter((i) => i.tipo === 'custo').reduce((t, i) => t + i.valor, 0),
      receitas: itens.filter((i) => i.tipo === 'receita').reduce((t, i) => t + i.valor, 0),
      itens,
    },
  }
}

/** Quantas ocorrências por ano a periodicidade dá (para o texto "12× por ano"). */
export function vezesPorAno(r: Pick<Recorrente, 'periodicidade'>): number {
  const m = MESES_DA_PERIODICIDADE[r.periodicidade]
  return m === 0 ? 1 : 12 / m
}
