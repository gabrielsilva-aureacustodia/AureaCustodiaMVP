'use client'

/**
 * Bloco de acompanhamento de todos os envios do cliente.
 *
 * Branch: exec/ag7-envios-status (21/09/2026).
 *
 * REGRAS INEGOCIÁVEIS:
 * - Lista TODOS os envios do cliente com o status de cada fase.
 * - Envio que ainda não foi postado aparece de forma inequívoca com o texto:
 *   "Ainda não postado — o sistema ainda não reconheceu nenhum código de postagem."
 * - Envio não postado é desconsiderado em até 3 dias, exibindo o tempo restante antes
 *   de expirar e saindo da lista ativa quando expira (permanecendo com o desfecho no histórico).
 * - Client Component: NUNCA importar `@/server/*`.
 */

import { useState, useMemo } from 'react'
import type { ReactNode } from 'react'
import Link from 'next/link'

import { fdate } from '@/domain/dates'
import { isEnvioDesconsiderado, prazoPostagemEnvio, statusFaseEnvio } from '@/domain/envios'
import type { Envio } from '@/domain/types'

export interface RastreioNaLista {
  statusAtual: string
  etapaDescricao: string
  atualizadoEm: number
}

export interface HistoricoEnviosProps {
  envios: Envio[]
  rastreios: Record<string, RastreioNaLista>
  onContinuarEnvio?: (protocolo: string) => void
}

type FiltroTab = 'todos' | 'em_andamento' | 'concluidos' | 'desconsiderados'

export function HistoricoEnvios({
  envios,
  rastreios,
  onContinuarEnvio,
}: HistoricoEnviosProps): ReactNode {
  const [filtro, setFiltro] = useState<FiltroTab>('todos')

  const agora = Date.now()

  // Classificação dos envios
  const { todos, emAndamento, concluidos, desconsiderados } = useMemo(() => {
    const ordenados = [...envios].sort((a, b) => b.createdAt - a.createdAt)

    const emAndamentoList = ordenados.filter(
      (e) => e.etapaAtual !== 'Recibo emitido' && !isEnvioDesconsiderado(e, agora),
    )
    const concluidosList = ordenados.filter((e) => e.etapaAtual === 'Recibo emitido')
    const desconsideradosList = ordenados.filter((e) => isEnvioDesconsiderado(e, agora))

    return {
      todos: ordenados,
      emAndamento: emAndamentoList,
      concluidos: concluidosList,
      desconsiderados: desconsideradosList,
    }
  }, [envios, agora])

  const listaFiltrada = useMemo(() => {
    switch (filtro) {
      case 'em_andamento':
        return emAndamento
      case 'concluidos':
        return concluidos
      case 'desconsiderados':
        return desconsiderados
      case 'todos':
      default:
        return todos
    }
  }, [filtro, todos, emAndamento, concluidos, desconsiderados])

  if (envios.length === 0) {
    return (
      <div className="panel" style={{ marginTop: 24 }}>
        <h3>
          <svg viewBox="0 0 24 24">
            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4z" />
          </svg>
          Histórico de acompanhamento dos envios
        </h3>
        <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', marginBottom: 12 }}>
          Todos os seus envios para custódia física aparecem aqui com o status detalhado de cada fase.
        </p>
        <div className="empty" style={{ padding: '24px 0' }}>
          Você ainda não possui envios cadastrados. Utilize o formulário acima para gerar seu primeiro protocolo.
        </div>
      </div>
    )
  }

  return (
    <div className="panel" style={{ marginTop: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <div>
          <h3 style={{ margin: 0 }}>
            <svg viewBox="0 0 24 24">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4z" />
            </svg>
            Acompanhamento de todos os seus envios
          </h3>
          <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', marginTop: 4, marginBottom: 0 }}>
            Status de cada fase postal e pericial, inclusive envios pendentes de postagem.
          </p>
        </div>

        {/* Abas de filtro */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`btn ${filtro === 'todos' ? 'btn-gold' : 'btn-outline'}`}
            style={{ fontSize: '12px', padding: '6px 12px', minHeight: 32 }}
            onClick={() => setFiltro('todos')}
          >
            Todos ({todos.length})
          </button>
          <button
            type="button"
            className={`btn ${filtro === 'em_andamento' ? 'btn-gold' : 'btn-outline'}`}
            style={{ fontSize: '12px', padding: '6px 12px', minHeight: 32 }}
            onClick={() => setFiltro('em_andamento')}
          >
            Em andamento ({emAndamento.length})
          </button>
          <button
            type="button"
            className={`btn ${filtro === 'concluidos' ? 'btn-gold' : 'btn-outline'}`}
            style={{ fontSize: '12px', padding: '6px 12px', minHeight: 32 }}
            onClick={() => setFiltro('concluidos')}
          >
            Concluídos ({concluidos.length})
          </button>
          {desconsiderados.length > 0 && (
            <button
              type="button"
              className={`btn ${filtro === 'desconsiderados' ? 'btn-gold' : 'btn-outline'}`}
              style={{ fontSize: '12px', padding: '6px 12px', minHeight: 32 }}
              onClick={() => setFiltro('desconsiderados')}
            >
              Desconsiderados ({desconsiderados.length})
            </button>
          )}
        </div>
      </div>

      {listaFiltrada.length === 0 ? (
        <div className="empty" style={{ padding: '24px 0' }}>
          Nenhum envio nesta categoria.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {listaFiltrada.map((item) => {
            const rastreio = rastreios[item.protocolo] ?? null
            const statusInfo = statusFaseEnvio(item, rastreio, agora)
            const prazo = prazoPostagemEnvio(item, agora)
            const desconsiderado = isEnvioDesconsiderado(item, agora)

            // Cores do badge
            const badgeBg =
              statusInfo.badgeVariant === 'danger'
                ? '#dc2626'
                : statusInfo.badgeVariant === 'warning'
                  ? '#d97706'
                  : statusInfo.badgeVariant === 'success'
                    ? '#16a34a'
                    : statusInfo.badgeVariant === 'info'
                      ? '#2563eb'
                      : 'var(--gold)'

            return (
              <div
                key={item.protocolo}
                style={{
                  border: '1px solid var(--line-soft)',
                  borderRadius: 8,
                  padding: 16,
                  background: desconsiderado ? 'rgba(239, 68, 68, 0.03)' : 'var(--input-bg)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                {/* Cabeçalho do Card */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 800, fontSize: '15px', color: 'var(--gold)' }}>
                        {item.protocolo}
                      </span>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 12,
                          background: badgeBg,
                          color: '#fff',
                          textTransform: 'uppercase',
                          letterSpacing: '0.3px',
                        }}
                      >
                        {statusInfo.rotulo}
                      </span>
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: 4 }}>
                      Gerado em {fdate(item.createdAt)} • {item.quantidade} moeda(s) {item.tipoMoeda} ({item.ano})
                      {item.modalidadeEnvio ? ` • ${item.modalidadeEnvio}` : ''}
                    </div>
                  </div>

                  {/* Ação rápida para envio não postado e ativo */}
                  {statusInfo.fase === 'nao_postado' && onContinuarEnvio && (
                    <button
                      type="button"
                      className="btn btn-gold"
                      style={{ fontSize: '12px', padding: '6px 14px', minHeight: 34 }}
                      onClick={() => onContinuarEnvio(item.protocolo)}
                    >
                      Informar código de postagem →
                    </button>
                  )}

                  {/* Ação rápida para envio concluído */}
                  {statusInfo.fase === 'analisado' && (
                    <Link
                      href="/recibos"
                      className="btn btn-outline"
                      style={{ fontSize: '12px', padding: '6px 14px', minHeight: 34, textDecoration: 'none' }}
                    >
                      Ver no cofre / Recibos ↗
                    </Link>
                  )}
                </div>

                {/* Bloco de Mensagem Explícita por Fase */}
                {statusInfo.fase === 'nao_postado' && (
                  <div
                    style={{
                      padding: 12,
                      borderRadius: 6,
                      background: 'rgba(217, 119, 6, 0.1)',
                      border: '1px solid rgba(217, 119, 6, 0.3)',
                      fontSize: '12.5px',
                    }}
                  >
                    <div style={{ fontWeight: 700, color: '#d97706', marginBottom: 4 }}>
                      ⚠️ Ainda não postado — o sistema ainda não reconheceu nenhum código de postagem
                    </div>
                    <div style={{ color: 'var(--text-muted)' }}>
                      {prazo.mensagemAlerta}
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: 6 }}>
                      Poste seu pacote nos Correios e confirme o código de rastreamento do comprovante para que nossa equipe acompanhe a chegada ao cofre.
                    </div>
                  </div>
                )}

                {statusInfo.fase === 'desconsiderado' && (
                  <div
                    style={{
                      padding: 12,
                      borderRadius: 6,
                      background: 'rgba(220, 38, 38, 0.08)',
                      border: '1px solid rgba(220, 38, 38, 0.25)',
                      fontSize: '12.5px',
                    }}
                  >
                    <div style={{ fontWeight: 700, color: '#dc2626', marginBottom: 2 }}>
                      ✕ Protocolo desconsiderado após 3 dias sem postagem
                    </div>
                    <div style={{ color: 'var(--text-muted)' }}>
                      O prazo limite de 3 dias para postagem deste protocolo expirou. Por segurança e controle de numeração postal, o protocolo foi encerrado e não pode mais ser utilizado. Caso ainda deseje enviar suas moedas, gere um novo protocolo.
                    </div>
                  </div>
                )}

                {statusInfo.fase === 'postado' && (
                  <div className="note" style={{ margin: 0 }}>
                    <b>Correios:</b> Código de rastreamento <b>{item.codigoRastreio}</b> postado em{' '}
                    {item.dataPostagem ? fdate(item.dataPostagem) : 'data pendente'}.
                    <br />
                    Aguardando primeira movimentação física nos Correios.
                  </div>
                )}

                {statusInfo.fase === 'em_transito' && (
                  <div className="note" style={{ margin: 0 }}>
                    <b>Correios ({item.codigoRastreio}):</b> {statusInfo.descricao}
                    {rastreio?.atualizadoEm && (
                      <span style={{ display: 'block', fontSize: '11.5px', marginTop: 4 }}>
                        Última checagem registrada em {fdate(rastreio.atualizadoEm)}.
                      </span>
                    )}
                  </div>
                )}

                {statusInfo.fase === 'recebido' && (
                  <div className="note" style={{ margin: 0 }}>
                    <b>Custódia:</b> Pacote recebido no cofre em{' '}
                    {item.dataRecebimento ? fdate(item.dataRecebimento) : ''}. Aguardando início da perícia na bancada.
                  </div>
                )}

                {statusInfo.fase === 'em_analise' && (
                  <div className="note" style={{ margin: 0 }}>
                    <b>Bancada:</b> Moeda em análise física técnica (pesagem em balança analítica, verificação visual e registro fotográfico).
                  </div>
                )}

                {statusInfo.fase === 'analisado' && (
                  <div className="note" style={{ margin: 0 }}>
                    <b>Concluído:</b> Perícia física aprovada. Recibo de custódia emitido com identificador(es):{' '}
                    <b>{item.codigosAtivosGerados.join(', ')}</b>.
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
