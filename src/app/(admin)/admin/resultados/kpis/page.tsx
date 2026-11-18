/**
 * /admin/resultados/kpis — os indicadores do negócio (src/domain/kpis.ts).
 *
 * Três abas (`?aba=`), com o período (`?ano=&mes=&trimestre=`) valendo para todas:
 *   - `negocio` (padrão): mercado, acervo, envios, faturas — os KPIs de sempre;
 *   - `aquisicao` (18/11/2026, frente J): cadastros, 1ª transação, CAC, funil e atendimento — os KPIs do conselho;
 *   - `gasto`: a entrada manual do gasto de marketing, que é o numerador do CAC.
 *
 * Server Component: confere `resultados.ver` ANTES de ler qualquer dado. O atendimento só é lido com `cs.ver`, e o
 * formulário de gasto só aparece com `contabil.lancar` — e cada Server Action confere de novo.
 */

import type { ReactNode } from 'react'

import { SemPermissao } from '@/components/admin/Blocos'
import { Abas } from '@/components/admin/Pecas'
import { Aquisicao } from '@/components/admin/resultados/Aquisicao'
import { GastoDeMarketing } from '@/components/admin/resultados/GastoDeMarketing'
import { Indicadores } from '@/components/admin/resultados/Indicadores'
import { consultaDoPeriodo, lerPeriodo, primeiroValor, type ParametrosDaUrl } from '@/domain/admin/periodo'
import { temPermissao } from '@/domain/admin/permissoes'
import { membroDaPagina } from '@/server/admin/acesso'
import { carregarAquisicao, carregarKpis } from '@/server/admin/resultados'
import type { Metadata } from 'next'
import { tituloDaPagina } from '@/components/admin/navegacao'

export const metadata: Metadata = { title: tituloDaPagina('/admin/resultados/kpis') }

export const dynamic = 'force-dynamic'

const ABAS = [
  { id: 'negocio', rotulo: 'Negócio' },
  { id: 'aquisicao', rotulo: 'Aquisição e atendimento' },
  { id: 'gasto', rotulo: 'Gasto de marketing' },
] as const
type Aba = (typeof ABAS)[number]['id']

export default async function KpisPage({ searchParams }: { searchParams: Promise<ParametrosDaUrl> }): Promise<ReactNode> {
  const membro = await membroDaPagina()
  if (!temPermissao(membro, 'resultados.ver')) return <SemPermissao permissoes={['resultados.ver']} />

  const params = await searchParams
  const aba: Aba = ABAS.find((a) => a.id === primeiroValor(params.aba))?.id ?? 'negocio'
  const periodo = lerPeriodo(params, Date.now())
  const sufixo = `&${consultaDoPeriodo(periodo)}`

  const abas = (
    <Abas
      rotulo="Indicadores"
      itens={ABAS.map((a) => ({ href: `/admin/resultados/kpis?aba=${a.id}${sufixo}`, rotulo: a.rotulo, atual: a.id === aba }))}
    />
  )

  if (aba === 'negocio') {
    const { kpis, semBanco } = await carregarKpis(periodo)
    return (
      <>
        {abas}
        <Indicadores kpis={kpis} periodo={periodo} semBanco={semBanco} />
      </>
    )
  }

  const podeAtendimento = temPermissao(membro, 'cs.ver')
  // A aba de gasto não precisa dos casos: não os lê.
  const dados = await carregarAquisicao(periodo, { atendimento: aba === 'aquisicao' && podeAtendimento })
  return (
    <>
      {abas}
      {aba === 'aquisicao' ? (
        <Aquisicao dados={dados} periodo={periodo} />
      ) : (
        <GastoDeMarketing
          gastos={dados.gastos}
          hoje={dados.hoje}
          podeLancar={temPermissao(membro, 'contabil.lancar')}
          semBanco={dados.semBanco}
          migracaoPendente={dados.migracaoPendente}
        />
      )}
    </>
  )
}
