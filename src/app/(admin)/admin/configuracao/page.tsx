/**
 * /admin/configuracao — taxas, catálogo de moedas, parâmetros operacionais, integrações e o
 * histórico de tudo (plano do Admin, seção 3.3).
 *
 * As abas moram na URL (`?aba=`). Ver pede `config.ver`; salvar taxa, parâmetro, prazo dos Termos ou
 * canal de atendimento pede `config.taxas`, e mexer no catálogo pede `config.catalogo` — e as Server
 * Actions conferem de novo.
 *
 * Mudar taxa publica versão nova da Tabela de Taxas; mudar prazo dos Termos publica versão nova dos
 * Termos. A versão publicada aparece ao lado do formulário que a muda.
 */

import Link from 'next/link'
import type { ReactNode } from 'react'

import { AvisoSemBanco, SemPermissao } from '@/components/admin/Blocos'
import { CatalogoDeMoedas } from '@/components/admin/configuracao/CatalogoDeMoedas'
import { DocumentoPublicado, type ResumoDocumento } from '@/components/admin/configuracao/DocumentoPublicado'
import { FormGrupoConfig, type MetaGravada } from '@/components/admin/configuracao/FormGrupoConfig'
import { dataHora } from '@/components/admin/formatos'
import { linhasIniciaisDoCatalogo, type TipoMoedaGravado } from '@/domain/admin/catalogo'
import { definicaoDe, formatarValor, type ValorConfig } from '@/domain/admin/configuracao'
import { primeiroValor, type ParametrosDaUrl } from '@/domain/admin/periodo'
import { temPermissao } from '@/domain/admin/permissoes'
import type { ChaveDocumento } from '@/domain/documentos-legais/types'
import { membroDaPagina } from '@/server/admin/acesso'
import { garantirCatalogoNoBanco } from '@/server/admin/configuracao'
import { executorOuNulo } from '@/server/admin/portas'
import { carregarConfiguracaoDoSite, type ConfiguracaoDoSite } from '@/server/config/carregar'
import { carregarDocumentosVigentes } from '@/server/config/documentos'
import { integracoesDoAmbiente } from '@/server/config/integracoes'
import { bancoConfigurado, executarNoBanco } from '@/server/db/client'
import { listarHistoricoConfig, type HistoricoConfig } from '@/server/db/repositories/config'
import { tabelaExiste } from '@/server/db/repositories/painel-leituras'
import { getState } from '@/server/state'

export const dynamic = 'force-dynamic'

const ABAS = [
  { id: 'taxas', rotulo: 'Taxas e comissões' },
  { id: 'catalogo', rotulo: 'Catálogo de moedas' },
  { id: 'operacional', rotulo: 'Operacional' },
  { id: 'integracoes', rotulo: 'Integrações' },
  { id: 'historico', rotulo: 'Histórico' },
] as const

type Aba = (typeof ABAS)[number]['id']

const NOME_DOC: Record<'tabela_de_taxas' | 'termos_de_uso', { nome: string; rota: string }> = {
  tabela_de_taxas: { nome: 'Tabela de Taxas', rota: '/taxas' },
  termos_de_uso: { nome: 'Termos de Uso', rota: '/termos' },
}

function metas(config: ConfiguracaoDoSite): Record<string, MetaGravada> {
  return Object.fromEntries(Object.entries(config.gravados).map(([k, g]) => [k, { atualizadoEm: g.atualizadoEm, atualizadoPor: g.atualizadoPor }]))
}

async function resumosDosDocumentos(config: ConfiguracaoDoSite): Promise<Record<string, ResumoDocumento>> {
  const chaves: ChaveDocumento[] = ['tabela_de_taxas', 'termos_de_uso']
  const docs = await carregarDocumentosVigentes(chaves, config)
  return Object.fromEntries(
    docs.map((d) => {
      const n = NOME_DOC[d.chave as 'tabela_de_taxas' | 'termos_de_uso']
      return [d.chave, { chave: d.chave, nome: n.nome, rota: n.rota, versao: d.versao, hash: d.hash, vigenteDesde: d.vigenteDesde, confere: d.confere, doBanco: d.doBanco }]
    }),
  )
}

async function historico(): Promise<HistoricoConfig[] | null> {
  if (!bancoConfigurado()) return null
  return executarNoBanco(async (tx) => ((await tabelaExiste(tx, 'config_historico')) ? listarHistoricoConfig(tx, 300) : null), { somenteLeitura: true })
}

function valorLegivel(chave: string, valor: unknown): string {
  if (valor === null || valor === undefined) return '—'
  if (chave.startsWith('catalogo:')) {
    const t = valor as Partial<TipoMoedaGravado>
    return `${t.negociavel ? 'negociável' : 'fora do mercado'} · ${t.ativo === false ? 'sem envio novo' : 'aceita envio'} · ${t.categoria ?? ''} · ordem ${t.ord ?? '—'}`
  }
  const def = definicaoDe(chave)
  return def && (typeof valor === 'number' || typeof valor === 'string') ? formatarValor(def, valor as ValorConfig) : JSON.stringify(valor)
}

export default async function ConfiguracaoPage({ searchParams }: { searchParams: Promise<ParametrosDaUrl> }): Promise<ReactNode> {
  const membro = await membroDaPagina()
  if (!temPermissao(membro, 'config.ver')) return <SemPermissao permissoes={['config.ver']} />

  const pedida = primeiroValor((await searchParams).aba)
  const aba: Aba = ABAS.some((a) => a.id === pedida) ? (pedida as Aba) : 'taxas'
  const podeTaxas = temPermissao(membro, 'config.taxas')
  const podeCatalogo = temPermissao(membro, 'config.catalogo')

  // O catálogo "nasce semeado na primeira leitura": abrir a aba é a primeira leitura com escrita.
  if (aba === 'catalogo') {
    await garantirCatalogoNoBanco(executorOuNulo()).catch((err: unknown) => console.error('[admin] semeadura do catálogo falhou:', err))
  }
  const config = await carregarConfiguracaoDoSite()
  const semTabela = config.origem !== 'banco'

  let conteudo: ReactNode = null
  if (aba === 'taxas' || aba === 'operacional') {
    const docs = await resumosDosDocumentos(config)
    const gravados = metas(config)
    conteudo =
      aba === 'taxas' ? (
        <div className="panel">
          <h3>Taxas e comissões</h3>
          <DocumentoPublicado doc={docs.tabela_de_taxas} podePublicar={podeTaxas && !semTabela} />
          <FormGrupoConfig key={JSON.stringify(config.taxas)} grupo="taxas" valores={config.valores} gravados={gravados} podeEditar={podeTaxas && !semTabela} aviso="Salvar vale para as próximas operações e publica versão nova da Tabela de Taxas." />
        </div>
      ) : (
        <>
          <div className="panel">
            <h3>Operacional</h3>
            <FormGrupoConfig key={JSON.stringify(config.operacional)} grupo="operacional" valores={config.valores} gravados={gravados} podeEditar={podeTaxas && !semTabela} />
          </div>
          <div className="panel">
            <h3>Parâmetros dos Termos de Uso</h3>
            <DocumentoPublicado doc={docs.termos_de_uso} podePublicar={podeTaxas && !semTabela} />
            <FormGrupoConfig key={JSON.stringify(config.termos)} grupo="termos" valores={config.valores} gravados={gravados} podeEditar={podeTaxas && !semTabela} aviso="Salvar publica versão nova dos Termos de Uso." />
          </div>
          <div className="panel">
            <h3>Canais de atendimento</h3>
            <p className="adm-fraco">Aparecem em /suporte. Não mudam o texto dos Termos.</p>
            <FormGrupoConfig key={JSON.stringify(config.canais)} grupo="sac" valores={config.valores} gravados={gravados} podeEditar={podeTaxas && !semTabela} />
          </div>
        </>
      )
  } else if (aba === 'catalogo') {
    const state = await getState()
    const moedasPorTipo: Record<string, number> = {}
    for (const u of Object.values(state.users)) for (const c of u.coins) if (c.recibo.status !== 'Extinto') moedasPorTipo[c.tipoMoeda] = (moedasPorTipo[c.tipoMoeda] ?? 0) + 1
    const tipos: TipoMoedaGravado[] = config.tipos && config.tipos.length > 0 ? config.tipos : linhasIniciaisDoCatalogo().map((t) => ({ ...t, criadoPor: 'código', criadoEm: 0 }))
    conteudo = (
      <div className="panel">
        <h3>Catálogo de moedas</h3>
        <CatalogoDeMoedas tipos={tipos} moedasPorTipo={moedasPorTipo} podeEditar={podeCatalogo} semTabela={semTabela || !config.tipos || config.tipos.length === 0} />
      </div>
    )
  } else if (aba === 'integracoes') {
    const integracoes = integracoesDoAmbiente()
    conteudo = (
      <div className="adm-grade-larga">
        {integracoes.map((i) => (
          <div key={i.chave} className={`panel adm-integracao adm-integracao-${i.estado}`}>
            <h3>
              {i.nome} <span className={i.estado === 'ligado' ? 'pill g' : i.estado === 'parcial' ? 'pill y' : 'pill n'}>{i.estado === 'ligado' ? 'ligado' : i.estado === 'parcial' ? 'incompleto' : 'desligado'}</span>
            </h3>
            <p className="adm-fraco">{i.oQueFaz}</p>
            <ul className="adm-lista">
              {i.variaveis.map((v) => (
                <li key={v.nome}>
                  <code>{v.nome}</code> — {v.presente ? 'definida' : v.obrigatoria ? <b>falta</b> : 'não definida (opcional)'}
                </li>
              ))}
            </ul>
            {i.observacao ? <p className="adm-fraco">{i.observacao}</p> : null}
            {i.estado !== 'ligado' ? <p className="adm-fraco">Sem ela: {i.semEla}</p> : null}
          </div>
        ))}
      </div>
    )
  } else {
    const linhas = await historico()
    conteudo = (
      <div className="panel">
        <h3>Histórico da configuração</h3>
        {linhas === null ? (
          <p className="adm-fraco">Sem banco com a migration 024, não há histórico gravado.</p>
        ) : linhas.length === 0 ? (
          <p className="empty">Nenhuma mudança feita pelo painel ainda: tudo vale o padrão do código.</p>
        ) : (
          <div className="table-scroll">
            <table className="audit-table">
              <thead>
                <tr>
                  <th>Quando</th>
                  <th>Quem</th>
                  <th>O quê</th>
                  <th>Antes</th>
                  <th>Depois</th>
                </tr>
              </thead>
              <tbody>
                {linhas.map((h) => (
                  <tr key={h.id}>
                    <td>{dataHora(h.createdAt)}</td>
                    <td>{h.ator}</td>
                    <td>{h.chave.startsWith('catalogo:') ? `Catálogo: ${h.chave.slice('catalogo:'.length)}` : (definicaoDe(h.chave)?.rotulo ?? h.chave)}</td>
                    <td>{valorLegivel(h.chave, h.valorAntigo)}</td>
                    <td>{valorLegivel(h.chave, h.valorNovo)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      {config.origem === 'padrao' && !bancoConfigurado() ? <AvisoSemBanco>A configuração vale o padrão do código e não pode ser editada.</AvisoSemBanco> : null}
      {config.origem === 'padrao' && bancoConfigurado() ? <p className="note adm-secao">O banco ainda não tem as tabelas de configuração (migration 024). Rode npm run db:migrate — até lá, vale o padrão do código.</p> : null}
      {config.origem === 'falha' ? <p className="note adm-secao adm-negativo">A leitura da configuração falhou agora; a tela mostra o padrão do código. Recarregue em instantes.</p> : null}
      <nav className="adm-abas" aria-label="Abas da configuração">
        {ABAS.map((a) => (
          <Link key={a.id} href={`/admin/configuracao?aba=${a.id}`} className={`chart-tab${a.id === aba ? ' on' : ''}`} aria-current={a.id === aba ? 'page' : undefined}>
            {a.rotulo}
          </Link>
        ))}
      </nav>
      {conteudo}
    </>
  )
}
