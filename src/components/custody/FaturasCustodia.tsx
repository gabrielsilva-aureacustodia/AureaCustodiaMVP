'use client'

/**
 * Faturas de Custódia e Planos Ativos (Passo B2.7).
 *
 * Exibe:
 * 1. Resumo e lista de faturas do usuário com status (Paga, Pendente, Em atraso, Cancelada).
 * 2. Botão "Pagar" para faturas em aberto, acionando o PainelPagamento inline (Saldo, Pix ou Cartão).
 * 3. Lista de planos de custódia contratados e vigentes (anual, moedas cobertas, pago até).
 */

import { useCallback, useEffect, useState, type ReactNode } from 'react'

import { fimDaCoberturaDaFatura } from '@/domain/custody'
import { rotuloDaOrigem, lotesDaFatura } from '@/domain/custodia-do-cliente'
import { fdate } from '@/domain/dates'
import { brl } from '@/domain/money'
import type { FaturaCustodia, PlanoCustodia } from '@/domain/types'
import { useApp } from '@/components/providers/AppProvider'
import { useBloqueioPorPendencia } from '@/components/custody/useBloqueioPorPendencia'
import { PainelPagamento } from '@/components/pagamento/PainelPagamento'
import { EstadoVazio } from '@/components/ui/EstadoVazio'
import { Selo } from '@/components/ui/Selo'
import { Esqueleto } from '@/components/ui/Esqueleto'
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


  const faturasPendentesOuAtrasadas = faturas.filter(
    (f) => f.status === 'pendente' || f.status === 'atrasada',
  )

  return (
    <div className="faturas">
      {/* Aviso de fatura atrasada / inadimplência */}
      {minhaContaBloqueada && (
        <div className="warn-box aviso-topo" role="alert">
          <svg viewBox="0 0 24 24" aria-hidden="true">
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

      {/* Abas: Faturas × Planos. Papel de aba de verdade (tablist/tab/aria-selected) desde
          25/10/2026; antes eram dois botões pintados à mão com cor fixa (#000). */}
      <div className="abas" role="tablist" aria-label="Faturas e planos de custódia">
        <button
          type="button"
          role="tab"
          id="aba-faturas"
          aria-selected={abaAtiva === 'faturas'}
          aria-controls="painel-faturas"
          className="aba"
          onClick={() => setAbaAtiva('faturas')}
        >
          Faturas de Custódia{' '}
          {faturasPendentesOuAtrasadas.length > 0 && (
            <span className="aba-n">({faturasPendentesOuAtrasadas.length} em aberto)</span>
          )}
        </button>
        <button
          type="button"
          role="tab"
          id="aba-planos"
          aria-selected={abaAtiva === 'planos'}
          aria-controls="painel-planos"
          className="aba"
          onClick={() => setAbaAtiva('planos')}
        >
          Meus Planos de Custódia <span className="aba-n">({planos.length})</span>
        </button>
      </div>

      {carregando ? (
        // Já com o papel de painel da aba ativa: enquanto carrega, o `aria-controls` da aba não pode apontar para nada
        // (axe: aria-valid-attr-value, 30/10/2026).
        <div
          className="panel"
          role="tabpanel"
          id={abaAtiva === 'faturas' ? 'painel-faturas' : 'painel-planos'}
          aria-labelledby={abaAtiva === 'faturas' ? 'aba-faturas' : 'aba-planos'}
        >
          <div className="carregando" role="status" aria-busy="true" aria-label="Carregando informações de custódia...">
            <Esqueleto altura="14px" largura="100%" />
            <Esqueleto altura="14px" largura="82%" />
            <Esqueleto altura="14px" largura="64%" />
          </div>
        </div>
      ) : abaAtiva === 'faturas' ? (
        /* ======================== SEÇÃO FATURAS ======================== */
        <div role="tabpanel" id="painel-faturas" aria-labelledby="aba-faturas">
          {/* Painel de Liquidação de Fatura */}
          {faturaSelecionada && (
            <div className="panel pagar-fatura">
              <div className="panel-cab">
                <h3>
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <rect x="3" y="7" width="18" height="13" rx="2" />
                    <path d="M16 13h2M3 11h18" />
                  </svg>
                  Pagar Fatura {faturaSelecionada.competencia}
                </h3>
                <button type="button" className="btn btn-outline auto" onClick={() => setFaturaEmPagamento(null)}>
                  Fechar<span className="sr-only"> o pagamento da fatura {faturaSelecionada.id}</span> ✕
                </button>
              </div>

              <div className="summary-box">
                <div className="sr">
                  <span className="k">Identificador</span>
                  <span className="v">{faturaSelecionada.id}</span>
                </div>
                <div className="sr">
                  <span className="k">Guarda coberta até</span>
                  <span className="v">
                    {fdate(fimDaCoberturaDaFatura(faturaSelecionada))} ({faturaSelecionada.competencia})
                  </span>
                </div>
                <div className="sr">
                  <span className="k">Quantidade de moedas</span>
                  <span className="v">{faturaSelecionada.quantidadeMoedas} moeda(s)</span>
                </div>
                <div className="sr">
                  <span className="k">Valor da fatura</span>
                  <span className="v v-ouro">{brl(faturaSelecionada.valorCents)}</span>
                </div>
                <div className="sr">
                  <span className="k">Prazo para pagar</span>
                  <span className="v">{fdate(faturaSelecionada.dataVencimento)}</span>
                </div>
              </div>

              <PainelPagamento
                valorCents={faturaSelecionada.valorCents}
                parcelasMax={1}
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
            <div className="panel">
              <EstadoVazio
                titulo="Nenhuma fatura de custódia gerada até o momento."
                ilustracao="custodiaAPagar"
              >
                A primeira fatura nasce quando uma moeda sua é aceita na custódia; depois, uma por mês no dia em que ela foi aceita.
              </EstadoVazio>
            </div>
          ) : (
            <div className="panel">
              <div className="tabela-fixa" tabIndex={0} role="region" aria-label="Faturas de custódia (role para o lado no celular)">
                <table className="ro-tabela">
                  <thead>
                    <tr>
                      <th scope="col">Competência</th>
                      <th scope="col">Origem</th>
                      <th scope="col" className="num">
                        Moedas
                      </th>
                      <th scope="col" className="num">
                        Valor
                      </th>
                      {/* "Vencimento" aqui era o PRAZO PARA PAGAR, e numa linha já
                          paga isso lia-se como "a custódia expira nesta data" —
                          ainda por cima numa data posterior ao fim da cobertura.
                          Agora a coluna diz o que é, e some quando não há mais o
                          que pagar. */}
                      <th scope="col">Prazo para pagar</th>
                      <th scope="col">Status</th>
                      <th scope="col" className="num">
                        Ação
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {faturas.map((f) => {
                      const aberta = f.status === 'pendente' || f.status === 'atrasada'
                      // A lista de origens vive em domain/custodia-do-cliente.ts.
                      // Repetida aqui, ela não conhecia 'entrada_no_acervo' e
                      // rotulava a fatura de entrada como "Ciclo mensal".
                      const origemNome = rotuloDaOrigem(f.origem)
                      // Selo com cor + ícone + texto (Carbon; BENCHMARK.md D9).
                      const selo =
                        f.status === 'paga'
                          ? { tom: 'sucesso' as const, txt: 'Paga' }
                          : f.status === 'pendente'
                            ? { tom: 'aviso' as const, txt: 'Pendente' }
                            : f.status === 'atrasada'
                              ? { tom: 'perigo' as const, txt: 'Em atraso' }
                              : { tom: 'neutro' as const, txt: 'Cancelada' }

                      return (
                        <tr key={f.id}>
                          <th scope="row">
                            {f.competencia}
                            <div className="cel-sub">guarda até {fdate(fimDaCoberturaDaFatura(f))}</div>
                            <div className="cel-sub">{f.id}</div>
                          </th>
                          <td>
                            {origemNome}
                            {lotesDaFatura(me.coins, f).length > 0 && (
                              <div className="cel-sub">
                                {lotesDaFatura(me.coins, f).length > 1 ? 'Lotes ' : 'Lote '}
                                {lotesDaFatura(me.coins, f).join(', ')}
                              </div>
                            )}
                          </td>
                          <td className="num">{f.quantidadeMoedas}</td>
                          <td className="num forte">{brl(f.valorCents)}</td>
                          <td className="nowrap">{aberta ? fdate(f.dataVencimento) : '—'}</td>
                          <td>
                            <Selo tom={selo.tom}>{selo.txt}</Selo>
                            {f.dataPagamento && (
                              <div className="cel-sub">
                                Pago em {fdate(f.dataPagamento)} ({f.formaPagamento ?? 'saldo'})
                              </div>
                            )}
                          </td>
                          <td className="num">
                            {aberta ? (
                              <button
                                type="button"
                                className="btn btn-gold auto btn-linha"
                                onClick={() => setFaturaEmPagamento(f.id)}
                              >
                                Pagar fatura<span className="sr-only"> {f.id} de {brl(f.valorCents)}</span>
                              </button>
                            ) : (
                              <span className="cel-sub">—</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ======================== SEÇÃO PLANOS ======================== */
        <div role="tabpanel" id="painel-planos" aria-labelledby="aba-planos">
          {planos.length === 0 ? (
            <div className="panel">
              <EstadoVazio
                titulo="Nenhum plano de custódia contratado ainda."
              >
                Os planos são contratados durante o envio de novas moedas para a custódia.
              </EstadoVazio>
            </div>
          ) : (
            <div className="grade-planos">
              {planos.map((p) => {
                const selo =
                  p.status === 'vigente'
                    ? { tom: 'sucesso' as const, txt: 'Vigente' }
                    : p.status === 'aguardando_pagamento'
                      ? { tom: 'aviso' as const, txt: 'Aguardando Pagamento' }
                      : { tom: 'neutro' as const, txt: 'Cancelado' }
                return (
                  <div key={p.id} className="panel plano">
                    <div className="plano-cab">
                      <div>
                        <h4>Plano Mensal de Custódia</h4>
                        <div className="plano-id">
                          {p.id} · Envio {p.protocoloEnvio}
                        </div>
                      </div>
                      <Selo tom={selo.tom}>{selo.txt}</Selo>
                    </div>

                    <div className="summary-box">
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
                        <span className="v">{brl(p.valorTotalCents)} / mês</span>
                      </div>
                      <div className="sr">
                        <span className="k">Início da vigência</span>
                        <span className="v">{p.inicioCompetencia}</span>
                      </div>
                      <div className="sr">
                        <span className="k">Pago até</span>
                        <span className="v">{p.pagoAteCompetencia ? p.pagoAteCompetencia : 'Aguardando pagamento'}</span>
                      </div>
                      {p.estornadoCents > 0 && (
                        <div className="sr">
                          <span className="k">Estorno por moedas recusadas</span>
                          <span className="v v-verde">{brl(p.estornadoCents)}</span>
                        </div>
                      )}
                    </div>

                    {p.status === 'aguardando_pagamento' && (
                      <button
                        type="button"
                        className="btn btn-gold"
                        onClick={() => {
                          setAbaAtiva('faturas')
                          const fat = faturas.find((f) => f.planoId === p.id && f.status !== 'paga')
                          if (fat) setFaturaEmPagamento(fat.id)
                        }}
                      >
                        Quitar fatura deste plano<span className="sr-only"> ({p.id})</span> →
                      </button>
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
