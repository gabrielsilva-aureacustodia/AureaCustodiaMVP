/**
 * /admin/resultados/controle — o controle financeiro da empresa (25/10/2026, migration 046).
 *
 * Quatro abas (`?aba=`): a visão geral (do faturamento ao resultado, receitas por tipo, custos
 * por conta e por setor, impostos com a alíquota do contador, tarifas do Mercado Pago por meio,
 * notas fiscais e os próximos vencimentos), os custos e receitas recorrentes (cadastro), o livro
 * de lançamentos do período e os setores. O período (`?ano=&mes=&trimestre=`) vale para todas.
 *
 * Server Component: confere `resultados.ver` ANTES de ler qualquer dado. Os botões de cadastro
 * aparecem com `contabil.lancar`, e cada Server Action confere de novo.
 */

import type { ReactNode } from 'react'

import { AvisoSemBanco, SemPermissao } from '@/components/admin/Blocos'
import { AnaliseFinanceira } from '@/components/admin/financeiro/AnaliseFinanceira'
import { LancamentosDoPeriodo } from '@/components/admin/financeiro/LancamentosDoPeriodo'
import { PainelRecorrentes } from '@/components/admin/financeiro/PainelRecorrentes'
import { PainelSetores } from '@/components/admin/financeiro/PainelSetores'
import { Abas } from '@/components/admin/Pecas'
import { SeletorPeriodo } from '@/components/admin/SeletorPeriodo'
import { consultaDoPeriodo, lerPeriodo, type ParametrosDaUrl } from '@/domain/admin/periodo'
import { temPermissao } from '@/domain/admin/permissoes'
import { membroDaPagina } from '@/server/admin/acesso'
import { carregarControleFinanceiro } from '@/server/admin/controle-financeiro'
import type { Metadata } from 'next'
import { tituloDaPagina } from '@/components/admin/navegacao'

export const metadata: Metadata = { title: tituloDaPagina('/admin/resultados/controle') }

export const dynamic = 'force-dynamic'

const ABAS = [
  { id: 'visao', rotulo: 'Visão geral' },
  { id: 'recorrentes', rotulo: 'Custos e receitas recorrentes' },
  { id: 'lancamentos', rotulo: 'Lançamentos do período' },
  { id: 'setores', rotulo: 'Setores' },
] as const
type Aba = (typeof ABAS)[number]['id']

export default async function ControleFinanceiroPage({ searchParams }: { searchParams: Promise<ParametrosDaUrl> }): Promise<ReactNode> {
  const membro = await membroDaPagina()
  if (!temPermissao(membro, 'resultados.ver')) return <SemPermissao permissoes={['resultados.ver']} />

  const params = await searchParams
  const bruta = Array.isArray(params.aba) ? params.aba[0] : params.aba
  const aba: Aba = ABAS.find((a) => a.id === bruta)?.id ?? 'visao'
  const periodo = lerPeriodo(params, Date.now())
  const dados = await carregarControleFinanceiro(periodo)
  const sufixo = `&${consultaDoPeriodo(periodo)}`
  const podeLancar = temPermissao(membro, 'contabil.lancar')

  const totaisPorSetor: Record<number, number> = {}
  for (const l of dados.lancamentos) if (l.setorId !== null && l.contaCodigo.startsWith('4.')) totaisPorSetor[l.setorId] = (totaisPorSetor[l.setorId] ?? 0) + l.valor

  return (
    <>
      {dados.semBanco ? <AvisoSemBanco>Sem banco não há livro-razão, lançamentos nem recorrentes: os números ficam zerados.</AvisoSemBanco> : null}
      {dados.migracaoPendente ? (
        <p className="note adm-secao">
          <span>O banco ainda não tem as tabelas do controle financeiro (migration 046). Rode npm run db:migrate — até lá, a visão geral funciona e o cadastro fica indisponível.</span>
        </p>
      ) : null}

      <div className="adm-ferramentas">
        <SeletorPeriodo ano={periodo.ano} mes={periodo.mes} trimestre={periodo.trimestre} manter={aba === 'visao' ? {} : { aba }} />
      </div>

      <Abas
        rotulo="Controle financeiro"
        itens={ABAS.map((a) => ({
          href: `/admin/resultados/controle?aba=${a.id}${sufixo}`,
          rotulo: a.rotulo,
          atual: a.id === aba,
          contagem: a.id === 'recorrentes' ? dados.recorrentes.filter((r) => r.ativo).length : a.id === 'lancamentos' ? dados.lancamentos.length : undefined,
        }))}
      />

      {aba === 'visao' ? <AnaliseFinanceira dados={dados} sufixo={sufixo} /> : null}
      {aba === 'recorrentes' ? (
        <PainelRecorrentes
          recorrentes={dados.recorrentes}
          setores={dados.setores}
          contas={dados.contas}
          hoje={dados.hoje}
          podeLancar={podeLancar && !dados.migracaoPendente}
          semBanco={dados.semBanco}
        />
      ) : null}
      {aba === 'lancamentos' ? <LancamentosDoPeriodo dados={dados} /> : null}
      {aba === 'setores' ? <PainelSetores setores={dados.setores} totais={totaisPorSetor} podeEditar={podeLancar && !dados.semBanco && !dados.migracaoPendente} /> : null}
    </>
  )
}
