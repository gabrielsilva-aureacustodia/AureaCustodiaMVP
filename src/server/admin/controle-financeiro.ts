/**
 * O carregador da tela de controle financeiro (`/admin/resultados/controle`).
 *
 * Junta, para o período escolhido, o que já existia — a DRE inteira (receitas por tipo, deduções
 * com as alíquotas do contador, tarifas do Mercado Pago na 4.1.07, despesas manuais, IRPJ e CSLL),
 * pelo MESMO `carregarFinanceiro` da tela Financeiro — com o que a migration 046 trouxe: setores,
 * recorrentes e o setor de cada lançamento. Mais duas leituras de apoio: as tarifas do Mercado
 * Pago por meio de pagamento e as NFS-e do período. Nenhum número é recalculado aqui: o que é
 * DRE vem da DRE.
 *
 * Só leitura. Uma tabela ausente (046 não aplicada) não derruba a tela: vira `migracaoPendente`.
 */

import type { PeriodoEscolhido } from '@/domain/admin/periodo'
import { diaDeBrasilia } from '@/domain/financeiro/controle'
import { listarContas, listarParametros, type ParametroGravado } from '@/server/db/repositories/contabil'
import {
  lancamentosValidosDoPeriodo,
  listarRecorrentes,
  listarSetores,
  notasDoPeriodo,
  tarifasDoGatewayPorMeio,
  type LancamentoDoControle,
  type NotasDoPeriodo,
  type RecorrenteGravado,
  type Setor,
  type TarifasPorMeio,
} from '@/server/db/repositories/financeiro'
import { bancoConfigurado, executarNoBanco } from '@/server/db/client'
import type { ContaContabil } from '@/domain/dre'
import { PLANO_DE_CONTAS } from '@/domain/dre'

import { carregarFinanceiro, type DadosFinanceiro } from './resultados'

export interface DadosControleFinanceiro {
  financeiro: DadosFinanceiro
  hoje: string
  semBanco: boolean
  migracaoPendente: boolean
  contas: ContaContabil[]
  parametros: ParametroGravado[]
  setores: Setor[]
  recorrentes: RecorrenteGravado[]
  lancamentos: LancamentoDoControle[]
  tarifas: TarifasPorMeio[]
  notas: NotasDoPeriodo[]
}

function tabelaAusente(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: string }).code === '42P01'
}

export async function carregarControleFinanceiro(p: PeriodoEscolhido, agora: number = Date.now()): Promise<DadosControleFinanceiro> {
  const financeiro = await carregarFinanceiro(p)
  const hoje = diaDeBrasilia(agora)
  const vazio = { contas: [...PLANO_DE_CONTAS], parametros: [], setores: [], recorrentes: [], lancamentos: [], tarifas: [], notas: [] }
  if (!bancoConfigurado()) return { financeiro, hoje, semBanco: true, migracaoPendente: false, ...vazio }

  const { inicio, fim } = financeiro.dre.periodo
  try {
    const [base, controle] = await Promise.all([
      executarNoBanco(async (tx) => ({ contas: await listarContas(tx), parametros: await listarParametros(tx), tarifas: await tarifasDoGatewayPorMeio(tx, inicio, fim) }), { somenteLeitura: true }),
      executarNoBanco(
        async (tx) => ({
          setores: await listarSetores(tx),
          recorrentes: await listarRecorrentes(tx),
          lancamentos: await lancamentosValidosDoPeriodo(tx, inicio, fim),
        }),
        { somenteLeitura: true },
      ).catch((err: unknown) => {
        if (tabelaAusente(err)) return null
        throw err
      }),
    ])
    // NFS-e é enfeite desta tela: falha de leitura não pode derrubar o controle.
    const notas = await executarNoBanco((tx) => notasDoPeriodo(tx, inicio, fim), { somenteLeitura: true }).catch(() => [])
    return {
      financeiro,
      hoje,
      semBanco: false,
      migracaoPendente: controle === null,
      contas: base.contas.length ? base.contas : [...PLANO_DE_CONTAS],
      parametros: base.parametros,
      tarifas: base.tarifas,
      notas,
      setores: controle?.setores ?? [],
      recorrentes: controle?.recorrentes ?? [],
      lancamentos: controle?.lancamentos ?? [],
    }
  } catch (err) {
    console.error('[admin] falha ao carregar o controle financeiro:', err)
    return { financeiro, hoje, semBanco: false, migracaoPendente: tabelaAusente(err), ...vazio }
  }
}
