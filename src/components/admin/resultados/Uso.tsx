/**
 * A aba Uso da Central de Resultados: páginas mais abertas, horário de pico, ações por
 * conta, a jornada até a primeira venda e a trilha de auditoria com filtro.
 *
 * Duas fontes lidas juntas (plano do Admin, seção 1.6): o registro de uso
 * (`eventos_uso`, o que as pessoas ABRIRAM) e a trilha de auditoria (`audit_log`, o que
 * elas FIZERAM). Os agregados vêm prontos de `resumirUso` (src/domain/admin/uso.ts).
 *
 * A trilha completa só aparece para quem tem `admin.auditoria` — e, sem ela, a página
 * nem a busca no banco.
 *
 * Sem 'use client': desenhado no servidor; período e filtro são os únicos pedaços de
 * cliente.
 */

import type { ReactNode } from 'react'

import type { PeriodoEscolhido } from '@/domain/admin/periodo'
import type { DadosUso, FiltroDaTrilha } from '@/server/admin/resultados'

import { AvisoSemBanco, Cartao } from '../Blocos'
import { SeletorPeriodo } from '../SeletorPeriodo'
import { dataHora, duracao, numero } from '../formatos'
import { FiltroTrilha } from './FiltroTrilha'

const PLATAFORMA: Record<string, string> = {
  android: 'Android',
  ios: 'iPhone / iPad',
  windows: 'Windows',
  macos: 'Mac',
  linux: 'Linux',
  chromeos: 'Chromebook',
  outra: 'Outra',
}

export function Uso({
  dados,
  periodo,
  filtro,
  podeVerUso,
  podeVerTrilha,
}: {
  dados: DadosUso
  periodo: PeriodoEscolhido
  filtro: FiltroDaTrilha
  podeVerUso: boolean
  podeVerTrilha: boolean
}): ReactNode {
  if (dados.semBanco) {
    return (
      <>
        <AvisoSemBanco>O registro de uso e a trilha só existem com o banco.</AvisoSemBanco>
        <div className="panel">
          <SeletorPeriodo ano={periodo.ano} mes={periodo.mes} trimestre={periodo.trimestre} />
        </div>
      </>
    )
  }

  const r = dados.resumo
  const picoMax = r ? Math.max(1, ...r.porHora) : 1

  return (
    <>
      <div className="panel adm-secao">
        <SeletorPeriodo ano={periodo.ano} mes={periodo.mes} trimestre={periodo.trimestre} manter={{ ...(filtro.ator ? { ator: filtro.ator } : {}), ...(filtro.acao ? { acao: filtro.acao } : {}) }} />
        {dados.eventosNoLimite ? (
          <p className="adm-fraco" style={{ marginTop: 10 }}>
            O período tem mais registros do que a tela lê de uma vez; os números abaixo cobrem o começo dele. Escolha um período
            menor para ver tudo.
          </p>
        ) : null}
      </div>

      {podeVerUso && r ? (
        <>
          <div className="adm-grade">
            <Cartao rotulo="Páginas abertas" valor={numero(r.paginasVistas)} detalhe={`${numero(r.sessoes)} sessão(ões) de navegação`} />
            <Cartao rotulo="Contas que usaram" valor={numero(r.contas)} />
            <Cartao rotulo="Cliques registrados" valor={numero(r.acoesNaTela)} detalhe="elementos marcados para contagem" />
            <Cartao
              rotulo="Até a primeira venda"
              valor={duracao(r.jornadas.medianaMinutos === null ? null : r.jornadas.medianaMinutos * 60000)}
              detalhe={`mediana de ${numero(r.jornadas.contasComJornada)} conta(s) · ${r.jornadas.mediaPaginasAntes === null ? '—' : r.jornadas.mediaPaginasAntes.toLocaleString('pt-BR')} página(s) antes, em média`}
            />
          </div>

          <div className="adm-grade-larga">
            <div className="panel">
              <h3>Páginas mais abertas</h3>
              {r.paginasMaisAbertas.length ? (
                <div className="table-scroll">
                  <table className="audit-table">
                    <thead>
                      <tr>
                        <th>Página</th>
                        <th className="adm-num">Vezes</th>
                        <th className="adm-num">Contas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {r.paginasMaisAbertas.map((p) => (
                        <tr key={p.rota}>
                          <td className="adm-mono">{p.rota}</td>
                          <td className="adm-num">{numero(p.vezes)}</td>
                          <td className="adm-num">{numero(p.contas)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty">Nenhuma página registrada no período. O registro começou com a C1.</div>
              )}
            </div>

            <div className="panel">
              <h3>Horário de pico (Brasília)</h3>
              <div className="table-scroll">
                <table className="audit-table">
                  <thead>
                    <tr>
                      <th>Hora</th>
                      <th className="adm-num">Atividade</th>
                      <th style={{ width: '55%' }} aria-hidden="true" />
                    </tr>
                  </thead>
                  <tbody>
                    {r.porHora.map((n, hora) => (
                      <tr key={hora}>
                        <td>{String(hora).padStart(2, '0')}h</td>
                        <td className="adm-num">{numero(n)}</td>
                        <td aria-hidden="true">
                          <div className="adm-trilho">
                            <div className="adm-barra" style={{ width: `${Math.round((n / picoMax) * 100)}%` }} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="adm-fraco" style={{ marginTop: 10 }}>
                Páginas abertas e ações gravadas pelo servidor, por hora do dia.
              </p>
            </div>
          </div>

          <div className="adm-grade-larga">
            <div className="panel">
              <h3>Ações por conta</h3>
              {r.acoesPorConta.length ? (
                <div className="table-scroll">
                  <table className="audit-table">
                    <thead>
                      <tr>
                        <th>Conta</th>
                        <th className="adm-num">Páginas</th>
                        <th className="adm-num">Cliques</th>
                        <th className="adm-num">Operações</th>
                        <th>Última atividade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {r.acoesPorConta.slice(0, 50).map((c) => (
                        <tr key={c.email}>
                          <td>{c.email}</td>
                          <td className="adm-num">{numero(c.paginas)}</td>
                          <td className="adm-num">{numero(c.acoesNaTela)}</td>
                          <td className="adm-num">{numero(c.acoesNoServidor)}</td>
                          <td className="adm-fraco">{dataHora(c.ultimaAtividade)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty">Nenhuma atividade de conta no período.</div>
              )}
              <p className="adm-fraco" style={{ marginTop: 10 }}>
                Operações são o que ficou na trilha: negociações, anúncios, envios, retiradas, ações do painel.
              </p>
            </div>

            <div className="panel">
              <h3>Jornada até a primeira venda</h3>
              {r.jornadas.detalhes.length ? (
                <>
                  <div className="table-scroll">
                    <table className="audit-table">
                      <thead>
                        <tr>
                          <th>Conta</th>
                          <th>Primeira venda</th>
                          <th className="adm-num">Páginas antes</th>
                          <th className="adm-num">Tempo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {r.jornadas.detalhes.slice(0, 30).map((j) => (
                          <tr key={j.email}>
                            <td>{j.email}</td>
                            <td className="adm-fraco">{dataHora(j.primeiraVendaEm)}</td>
                            <td className="adm-num">{numero(j.paginasAntes)}</td>
                            <td className="adm-num">{duracao(j.minutos * 60000)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <h4 className="adm-subtitulo">Páginas vistas antes da primeira venda</h4>
                  <p className="adm-fraco">
                    {r.jornadas.paginasAntesDaVenda.map((p) => `${p.rota} (${numero(p.contas)})`).join(' · ') || '—'}
                  </p>
                </>
              ) : (
                <div className="empty">
                  {numero(r.jornadas.contasComVenda)} conta(s) já venderam, mas nenhuma com páginas registradas antes da primeira
                  venda neste período.
                </div>
              )}
            </div>
          </div>

          {r.plataformas.length ? (
            <div className="panel adm-secao">
              <h3>Plataformas</h3>
              <p className="adm-fraco">
                {r.plataformas.map((p) => `${PLATAFORMA[p.plataforma] ?? p.plataforma}: ${numero(p.eventos)}`).join(' · ')}
              </p>
            </div>
          ) : null}
        </>
      ) : null}

      {podeVerTrilha ? (
        <div className="panel adm-secao">
          <h3>Trilha de auditoria</h3>
          <FiltroTrilha ator={filtro.ator} acao={filtro.acao} periodo={periodo} />
          {dados.trilha && dados.trilha.length ? (
            <div className="table-scroll">
              <table className="audit-table">
                <thead>
                  <tr>
                    <th>Quando</th>
                    <th>Quem</th>
                    <th>Ação</th>
                    <th>Sobre</th>
                    <th>Contas afetadas</th>
                  </tr>
                </thead>
                <tbody>
                  {dados.trilha.map((t) => (
                    <tr key={t.id}>
                      <td className="adm-fraco">{dataHora(t.createdAt)}</td>
                      <td>{t.ator}</td>
                      <td className="adm-mono" title={JSON.stringify(t.detalhes)}>
                        {t.acao}
                      </td>
                      <td className="adm-fraco">{[t.entidade, t.entidadeId].filter(Boolean).join(' · ') || '—'}</td>
                      <td className="adm-fraco">{t.usuariosAfetados.join(', ') || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty">Nenhuma linha da trilha com este filtro no período.</div>
          )}
          {dados.trilhaNoLimite ? <p className="adm-fraco" style={{ marginTop: 10 }}>Mostrando as 300 mais recentes. Refine o filtro para ver as anteriores.</p> : null}
        </div>
      ) : null}
    </>
  )
}
