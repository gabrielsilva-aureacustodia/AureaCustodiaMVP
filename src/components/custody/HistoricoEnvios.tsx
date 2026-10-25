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
import { rotuloStatusRastreio, textoDoRastreio } from '@/domain/rastreio'
import type { Envio } from '@/domain/types'
import { EstadoVazio } from '@/components/ui/EstadoVazio'

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
      <div className="panel hist-envios">
        <h3>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4z" />
          </svg>
          Histórico de acompanhamento dos envios
        </h3>
        <p className="lead">
          Todos os seus envios para custódia física aparecem aqui com o status detalhado de cada fase.
        </p>
        <EstadoVazio
          titulo="Você ainda não possui envios cadastrados."
          ilustracao="etiquetaFrete"
        >
          Utilize o formulário acima para gerar seu primeiro protocolo.
        </EstadoVazio>
      </div>
    )
  }

  return (
    <div className="panel hist-envios">
      <div className="panel-cab">
        <div>
          <h3>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4z" />
            </svg>
            Acompanhamento de todos os seus envios
          </h3>
          <p className="sub">
            Status de cada fase postal e pericial, inclusive envios pendentes de postagem.
          </p>
        </div>

        {/* Filtros em chips com aria-pressed (eram botões dourados — o dourado é da ação primária). */}
        <div className="chips" role="group" aria-label="Filtrar envios por situação">
          <button type="button" className="chip" aria-pressed={filtro === 'todos'} onClick={() => setFiltro('todos')}>
            Todos ({todos.length})
          </button>
          <button
            type="button"
            className="chip"
            aria-pressed={filtro === 'em_andamento'}
            onClick={() => setFiltro('em_andamento')}
          >
            Em andamento ({emAndamento.length})
          </button>
          <button type="button" className="chip" aria-pressed={filtro === 'concluidos'} onClick={() => setFiltro('concluidos')}>
            Concluídos ({concluidos.length})
          </button>
          {desconsiderados.length > 0 && (
            <button
              type="button"
              className="chip"
              aria-pressed={filtro === 'desconsiderados'}
              onClick={() => setFiltro('desconsiderados')}
            >
              Desconsiderados ({desconsiderados.length})
            </button>
          )}
        </div>
      </div>

      {listaFiltrada.length === 0 ? (
        <EstadoVazio
          titulo="Nenhum envio nesta categoria."
          acao={
            <button type="button" className="btn btn-outline" onClick={() => setFiltro('todos')}>
              Ver todos os envios
            </button>
          }
        />
      ) : (
        <ul className="hist-lista">
          {listaFiltrada.map((item) => {
            const rastreio = rastreios[item.protocolo] ?? null
            const statusInfo = statusFaseEnvio(item, rastreio, agora)
            const prazo = prazoPostagemEnvio(item, agora)
            const desconsiderado = isEnvioDesconsiderado(item, agora)

            // Cor do selo pela variante, só com tokens (eram hexadecimais soltos).
            const badgeCls = `hist-selo ${statusInfo.badgeVariant}`

            return (
              <li key={item.protocolo} className={desconsiderado ? 'hist-item desconsiderado' : 'hist-item'}>
                {/* Cabeçalho do Card */}
                <div className="hist-cab">
                  <div>
                    <div className="hist-titulo">
                      <span className="hist-protocolo" translate="no">
                        {item.protocolo}
                      </span>
                      <span className={badgeCls}>{statusInfo.rotulo}</span>
                    </div>
                    <div className="hist-meta">
                      Gerado em {fdate(item.createdAt)} • {item.quantidade} moeda(s) {item.tipoMoeda} ({item.ano})
                      {item.modalidadeEnvio ? ` • ${item.modalidadeEnvio}` : ''}
                    </div>
                  </div>

                  {/* Ação rápida para envio não postado e ativo */}
                  {statusInfo.fase === 'nao_postado' && onContinuarEnvio && (
                    <button
                      type="button"
                      className="btn btn-gold auto hist-acao"
                      onClick={() => onContinuarEnvio(item.protocolo)}
                    >
                      {item.prePostagem ? 'Ver etiqueta e envio →' : 'Continuar envio →'}
                      <span className="sr-only"> {item.protocolo}</span>
                    </button>
                  )}

                  {/* Ação rápida para envio concluído */}
                  {statusInfo.fase === 'analisado' && (
                    <Link href="/recibos" className="btn btn-outline auto hist-acao">
                      Ver no cofre / Recibos ↗<span className="sr-only"> do envio {item.protocolo}</span>
                    </Link>
                  )}
                </div>

                {/* Bloco de Mensagem Explícita por Fase */}
                {statusInfo.fase === 'nao_postado' && (
                  <div className="hist-aviso alerta">
                    <div className="hist-aviso-t">
                      <span aria-hidden="true">!</span> Ainda não postado — o sistema ainda não reconheceu nenhum código de postagem
                    </div>
                    <div className="hist-aviso-d">{prazo.mensagemAlerta}</div>
                    {item.prePostagem ? (
                      // Etiqueta do contrato (22/10/2026): o código já existe e a postagem é
                      // reconhecida pelo rastreio — não há código para o cliente informar.
                      <div className="hist-aviso-d menor">
                        <b>Correios ({item.codigoRastreio}):</b>{' '}
                        {rastreio
                          ? textoDoRastreio(rastreio)
                          : rotuloStatusRastreio(item.prePostagem.canceladaEm ? 'cancelado' : 'aguardando_postagem')}
                        . Leve o pacote com a etiqueta a uma agência; a postagem aparece aqui sozinha quando os Correios a registrarem.
                      </div>
                    ) : (
                      <div className="hist-aviso-d menor">
                        {/* Sem etiqueta ainda: com o contrato, o caminho é pagar o frete e imprimir a etiqueta
                            oficial no passo dos Correios; sem contrato (ou envio antigo), postar no balcão e
                            informar o código. O texto cobre os dois sem a lista precisar saber qual vale. */}
                        Continue o envio para pagar o frete do contrato e imprimir a etiqueta oficial dos Correios. Se você já postou pagando no balcão, informe lá o código do comprovante.
                      </div>
                    )}
                  </div>
                )}

                {statusInfo.fase === 'desconsiderado' && (
                  <div className="hist-aviso perigo">
                    <div className="hist-aviso-t">
                      <span aria-hidden="true">✕</span> Protocolo desconsiderado após 3 dias sem postagem
                    </div>
                    <div className="hist-aviso-d">
                      O prazo limite de 3 dias para postagem deste protocolo expirou. Por segurança e controle de numeração postal, o protocolo foi encerrado e não pode mais ser utilizado. Caso ainda deseje enviar suas moedas, gere um novo protocolo.
                    </div>
                  </div>
                )}

                {statusInfo.fase === 'postado' && (
                  <div className="note hist-nota">
                    <b>Correios:</b> Código de rastreamento <b>{item.codigoRastreio}</b> postado em{' '}
                    {item.dataPostagem ? fdate(item.dataPostagem) : 'data pendente'}.
                    <br />
                    Aguardando primeira movimentação física nos Correios.
                  </div>
                )}

                {statusInfo.fase === 'em_transito' && (
                  <div className="note hist-nota">
                    <b>Correios ({item.codigoRastreio}):</b> {statusInfo.descricao}
                    {rastreio?.atualizadoEm && (
                      <span className="hist-checagem">
                        Última checagem registrada em {fdate(rastreio.atualizadoEm)}.
                      </span>
                    )}
                  </div>
                )}

                {statusInfo.fase === 'recebido' && (
                  <div className="note hist-nota">
                    <b>Custódia:</b> Pacote recebido no cofre em{' '}
                    {item.dataRecebimento ? fdate(item.dataRecebimento) : ''}. Aguardando início da perícia na bancada.
                  </div>
                )}

                {statusInfo.fase === 'em_analise' && (
                  <div className="note hist-nota">
                    <b>Bancada:</b> Moeda em análise física técnica (pesagem em balança analítica, verificação visual e registro fotográfico).
                  </div>
                )}

                {statusInfo.fase === 'analisado' && (
                  <div className="note hist-nota">
                    <b>Concluído:</b> Perícia física aprovada. Recibo de custódia emitido com identificador(es):{' '}
                    <b>{item.codigosAtivosGerados.join(', ')}</b>.
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
