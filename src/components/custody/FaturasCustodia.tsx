'use client'

/**
 * Faturas de Custódia e Planos Ativos (Passo B2.7).
 *
 * Exibe:
 * 1. Resumo e lista de faturas do usuário com status (Paga, Pendente, Em atraso, Cancelada).
 * 2. Botão "Pagar" para faturas em aberto, acionando o PainelPagamento inline (Saldo, Pix ou Cartão).
 * 3. Lista de planos de custódia contratados e vigentes (Mensal/Anual, moedas cobertas, pago até).
 */

import { useCallback, useEffect, useState, type ReactNode } from 'react'

import { fdate } from '@/domain/dates'
import { brl } from '@/domain/money'
import type { FaturaCustodia, PlanoCustodia } from '@/domain/types'
import { useApp } from '@/components/providers/AppProvider'
import { useBloqueioPorPendencia } from '@/components/custody/useBloqueioPorPendencia'
import { PainelPagamento } from '@/components/pagamento/PainelPagamento'
import {
  iniciarCartaoFatura,
  iniciarPixFatura,
  listarMeusPlanos,
  listarMinhasFaturas,
  pagarFaturaComSaldo,
} from '@/server/actions/plano-custodia'

export function FaturasCustodia(): ReactNode {
  const { me } = useApp()
  const { minhaContaBloqueada, consultar } = useBloqueioPorPendencia()
  const [faturas, setFaturas] = useState<FaturaCustodia[]>([])
  const [planos, setPlanos] = useState<PlanoCustodia[]>([])
  const [carregando, setCarregando] = useState(true)
  const [faturaEmPagamento, setFaturaEmPagamento] = useState<string | null>(null)
  const [abaAtiva, setAbaAtiva] = useState<'faturas' | 'planos'>('faturas')

  const carregar = useCallback(async () => {
    try {
      const [resFaturas, resPlanos] = await Promise.all([
        listarMinhasFaturas(),
        listarMeusPlanos(),
      ])
      if (resFaturas.ok && resFaturas.data) {
        setFaturas(resFaturas.data)
      }
      if (resPlanos.ok && resPlanos.data) {
        setPlanos(resPlanos.data)
      }
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    void carregar()
  }, [carregar])

  useEffect(() => {
    void consultar()
  }, [consultar])

  const faturaSelecionada = faturas.find((f) => f.id === faturaEmPagamento)
  const planoDaFatura = faturaSelecionada?.planoId
    ? planos.find((p) => p.id === faturaSelecionada.planoId)
    : null

  const faturasPendentesOuAtrasadas = faturas.filter(
    (f) => f.status === 'pendente' || f.status === 'atrasada',
  )

  return (
    <div>
      {/* Aviso de fatura atrasada / inadimplência */}
      {minhaContaBloqueada && (
        <div
          className="warn-box"
          style={{ marginBottom: 18, border: '1px solid #d9383a' }}
        >
          <svg viewBox="0 0 24 24">
            <path d="M12 3l9 16H3z" />
            <path d="M12 10v4M12 17v.5" />
          </svg>
          <div>
            <b>Atenção:</b> Você tem fatura de custódia com prazo vencido. Até a quitação, a venda e a
            retirada dos seus recibos ficam bloqueadas e seus anúncios ficam pausados. Pagar libera
            na hora.
          </div>
        </div>
      )}

      {/* Navegação entre Abas: Faturas vs Planos */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          marginBottom: 20,
          borderBottom: '1px solid var(--line-soft)',
          paddingBottom: 8,
        }}
      >
        <button
          type="button"
          className="btn"
          onClick={() => setAbaAtiva('faturas')}
          style={{
            minHeight: 44,
            padding: '8px 18px',
            background: abaAtiva === 'faturas' ? 'var(--gold)' : 'transparent',
            color: abaAtiva === 'faturas' ? '#000' : 'var(--text-main)',
            border: abaAtiva === 'faturas' ? 'none' : '1px solid var(--line-soft)',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Faturas de Custódia {faturasPendentesOuAtrasadas.length > 0 && `(${faturasPendentesOuAtrasadas.length} em aberto)`}
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => setAbaAtiva('planos')}
          style={{
            minHeight: 44,
            padding: '8px 18px',
            background: abaAtiva === 'planos' ? 'var(--gold)' : 'transparent',
            color: abaAtiva === 'planos' ? '#000' : 'var(--text-main)',
            border: abaAtiva === 'planos' ? 'none' : '1px solid var(--line-soft)',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Meus Planos de Custódia ({planos.length})
        </button>
      </div>

      {carregando ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
          Carregando informações de custódia...
        </div>
      ) : abaAtiva === 'faturas' ? (
        /* ======================== SEÇÃO FATURAS ======================== */
        <div>
          {/* Modal / Painel de Liquidação de Fatura */}
          {faturaSelecionada && (
            <div
              className="panel"
              style={{
                marginBottom: 24,
                border: '2px solid var(--gold)',
                background: 'var(--card-bg)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <h3 style={{ margin: 0 }}>
                  <svg viewBox="0 0 24 24">
                    <rect x="3" y="7" width="18" height="13" rx="2" />
                    <path d="M16 13h2M3 11h18" />
                  </svg>
                  Pagar Fatura {faturaSelecionada.competencia}
                </h3>
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ minHeight: 36, padding: '4px 12px', fontSize: '12px' }}
                  onClick={() => setFaturaEmPagamento(null)}
                >
                  Fechar ✕
                </button>
              </div>

              <div className="summary-box" style={{ marginBottom: 16 }}>
                <div className="sr">
                  <span className="k">Identificador</span>
                  <span className="v">{faturaSelecionada.id}</span>
                </div>
                <div className="sr">
                  <span className="k">Competência</span>
                  <span className="v">{faturaSelecionada.competencia}</span>
                </div>
                <div className="sr">
                  <span className="k">Quantidade de moedas</span>
                  <span className="v">{faturaSelecionada.quantidadeMoedas} moeda(s)</span>
                </div>
                <div className="sr">
                  <span className="k">Valor da fatura</span>
                  <span className="v" style={{ color: 'var(--gold)', fontWeight: 700 }}>
                    {brl(faturaSelecionada.valorCents)}
                  </span>
                </div>
                <div className="sr">
                  <span className="k">Vencimento</span>
                  <span className="v">{fdate(faturaSelecionada.dataVencimento)}</span>
                </div>
              </div>

              <PainelPagamento
                valorCents={faturaSelecionada.valorCents}
                parcelasMax={planoDaFatura?.parcelasMax ?? (faturaSelecionada.origem === 'renovacao_anual' ? 12 : 1)}
                saldoDisponivel={me?.balance ?? 0}
                pagarComSaldo={async () => {
                  const res = await pagarFaturaComSaldo(faturaSelecionada.id)
                  if (!res.ok) throw new Error(res.error)
                }}
                iniciarPix={async () => {
                  const res = await iniciarPixFatura(faturaSelecionada.id)
                  return res.ok && res.data ? res.data : null
                }}
                iniciarCartao={async () => {
                  const res = await iniciarCartaoFatura(faturaSelecionada.id)
                  return res.ok && res.data ? res.data : null
                }}
                aoConcluir={() => {
                  setFaturaEmPagamento(null)
                  void carregar()
                }}
              />
            </div>
          )}

          {/* Tabela / Lista de Faturas */}
          {faturas.length === 0 ? (
            <div className="panel" style={{ textAlign: 'center', padding: '30px' }}>
              <div className="empty">Nenhuma fatura de custódia gerada até o momento.</div>
            </div>
          ) : (
            <div className="panel" style={{ overflowX: 'auto' }}>
              <table className="tbl" style={{ width: '100%', minWidth: 600 }}>
                <thead>
                  <tr>
                    <th>Competência</th>
                    <th>Origem</th>
                    <th>Moedas</th>
                    <th>Valor</th>
                    <th>Vencimento</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {faturas.map((f) => {
                    const aberta = f.status === 'pendente' || f.status === 'atrasada'
                    const origemNome =
                      f.origem === 'contratacao'
                        ? 'Contratação'
                        : f.origem === 'renovacao_anual'
                          ? 'Renovação anual'
                          : 'Ciclo mensal'

                    return (
                      <tr key={f.id}>
                        <td>
                          <b>{f.competencia}</b>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{f.id}</div>
                        </td>
                        <td>
                          <span style={{ fontSize: '12.5px' }}>{origemNome}</span>
                        </td>
                        <td>{f.quantidadeMoedas}</td>
                        <td style={{ fontWeight: 600 }}>{brl(f.valorCents)}</td>
                        <td>{fdate(f.dataVencimento)}</td>
                        <td>
                          {f.status === 'paga' && (
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '3px 8px',
                                borderRadius: 12,
                                fontSize: '11px',
                                fontWeight: 700,
                                background: 'rgba(26, 127, 55, 0.2)',
                                color: '#3fb950',
                              }}
                            >
                              Paga ✓
                            </span>
                          )}
                          {f.status === 'pendente' && (
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '3px 8px',
                                borderRadius: 12,
                                fontSize: '11px',
                                fontWeight: 700,
                                background: 'rgba(212, 175, 55, 0.2)',
                                color: 'var(--gold)',
                              }}
                            >
                              Pendente
                            </span>
                          )}
                          {f.status === 'atrasada' && (
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '3px 8px',
                                borderRadius: 12,
                                fontSize: '11px',
                                fontWeight: 700,
                                background: 'rgba(248, 81, 73, 0.2)',
                                color: '#f85149',
                              }}
                            >
                              Em atraso
                            </span>
                          )}
                          {f.status === 'cancelada' && (
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '3px 8px',
                                borderRadius: 12,
                                fontSize: '11px',
                                fontWeight: 700,
                                background: 'var(--input-bg)',
                                color: 'var(--text-muted)',
                              }}
                            >
                              Cancelada
                            </span>
                          )}
                          {f.dataPagamento && (
                            <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: 2 }}>
                              Pago em {fdate(f.dataPagamento)} ({f.formaPagamento ?? 'saldo'})
                            </div>
                          )}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {aberta ? (
                            <button
                              type="button"
                              className="btn btn-gold"
                              style={{ minHeight: 44, minWidth: 80, padding: '6px 14px', fontSize: '12px' }}
                              onClick={() => setFaturaEmPagamento(f.id)}
                            >
                              Pagar fatura
                            </button>
                          ) : (
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* ======================== SEÇÃO PLANOS ======================== */
        <div>
          {planos.length === 0 ? (
            <div className="panel" style={{ textAlign: 'center', padding: '30px' }}>
              <div className="empty">Nenhum plano de custódia contratado ainda.</div>
              <div style={{ marginTop: 12 }}>
                Os planos são contratados durante o envio de novas moedas para a custódia.
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
              {planos.map((p) => {
                const isAnual = p.modalidade === 'anual'
                return (
                  <div key={p.id} className="panel" style={{ position: 'relative' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '16px', color: 'var(--text-main)' }}>
                          {isAnual ? 'Plano Anual de Custódia' : 'Plano Mensal de Custódia'}
                        </h4>
                        <div style={{ fontSize: '12px', color: 'var(--gold)', marginTop: 2 }}>
                          {p.id} · Envio {p.protocoloEnvio}
                        </div>
                      </div>
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: 12,
                          fontSize: '11px',
                          fontWeight: 700,
                          background:
                            p.status === 'vigente'
                              ? 'rgba(26, 127, 55, 0.2)'
                              : p.status === 'aguardando_pagamento'
                                ? 'rgba(212, 175, 55, 0.2)'
                                : 'var(--input-bg)',
                          color:
                            p.status === 'vigente'
                              ? '#3fb950'
                              : p.status === 'aguardando_pagamento'
                                ? 'var(--gold)'
                                : 'var(--text-muted)',
                        }}
                      >
                        {p.status === 'vigente'
                          ? 'Vigente'
                          : p.status === 'aguardando_pagamento'
                            ? 'Aguardando Pagamento'
                            : 'Cancelado'}
                      </span>
                    </div>

                    <div className="summary-box" style={{ marginBottom: 12 }}>
                      <div className="sr">
                        <span className="k">Quantidade contratada</span>
                        <span className="v">{p.quantidadeContratada} moeda(s)</span>
                      </div>
                      <div className="sr">
                        <span className="k">Moedas cobertas</span>
                        <span className="v">
                          {p.moedaIds.length > 0 ? p.moedaIds.join(', ') : 'Aguardando validação física'}
                        </span>
                      </div>
                      <div className="sr">
                        <span className="k">Valor do plano</span>
                        <span className="v">
                          {brl(p.valorTotalCents)} {isAnual ? '/ ano' : '/ mês'}
                        </span>
                      </div>
                      <div className="sr">
                        <span className="k">Início da vigência</span>
                        <span className="v">{p.inicioCompetencia}</span>
                      </div>
                      <div className="sr">
                        <span className="k">Pago até</span>
                        <span className="v">
                          {p.pagoAteCompetencia ? p.pagoAteCompetencia : 'Aguardando pagamento'}
                        </span>
                      </div>
                      {p.estornadoCents > 0 && (
                        <div className="sr">
                          <span className="k">Estorno por moedas recusadas</span>
                          <span className="v" style={{ color: '#3fb950' }}>
                            {brl(p.estornadoCents)}
                          </span>
                        </div>
                      )}
                    </div>

                    {p.status === 'aguardando_pagamento' && (
                      <div style={{ marginTop: 10 }}>
                        <button
                          type="button"
                          className="btn btn-gold"
                          style={{ width: '100%', minHeight: 44 }}
                          onClick={() => {
                            setAbaAtiva('faturas')
                            const fat = faturas.find((f) => f.planoId === p.id && f.status !== 'paga')
                            if (fat) setFaturaEmPagamento(fat.id)
                          }}
                        >
                          Quitar fatura deste plano →
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
