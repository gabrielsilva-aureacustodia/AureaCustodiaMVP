'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'

import { fdate } from '@/domain/dates'
import { brl } from '@/domain/money'
import type { Retirada } from '@/domain/types'
import { ModalCancelarRetirada } from '@/components/recibo/ModalCancelarRetirada'
import { ModalPagarRetirada } from '@/components/recibo/ModalSolicitarRetirada'
import { useApp } from '@/components/providers/AppProvider'
import { useModal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { cancelarSolicitacaoRetirada, obterMinhasRetiradas } from '@/server/actions/custody'
import { EstadoVazio } from '@/components/ui/EstadoVazio'
import { SeloDaRetirada } from '@/components/recibo/SeloDaRetirada'
import { Esqueleto } from '@/components/ui/Esqueleto'

export default function RetiradasPage(): ReactNode {
  const { session, run } = useApp()
  const modal = useModal()
  const toast = useToast()
  const [retiradas, setRetiradas] = useState<Retirada[]>([])
  const [carregando, setCarregando] = useState(true)
  const [cancelandoId, setCancelandoId] = useState<string | null>(null)

  async function recarregar(): Promise<void> {
    const res = await obterMinhasRetiradas()
    if (res.ok && res.data) {
      setRetiradas(res.data)
    }
  }

  useEffect(() => {
    let ativo = true
    void obterMinhasRetiradas().then((res) => {
      if (ativo) {
        if (res.ok && res.data) {
          setRetiradas(res.data)
        }
        setCarregando(false)
      }
    })
    return () => {
      ativo = false
    }
  }, [session])

  // A pergunta mora na modal do sistema (era `window.confirm`, 30/10/2026); o cancelamento em si é o mesmo.
  function pedirCancelamento(retiradaId: string): void {
    modal.open(<ModalCancelarRetirada onConfirmar={() => void handleCancelar(retiradaId)} />)
  }

  async function handleCancelar(retiradaId: string): Promise<void> {
    setCancelandoId(retiradaId)
    try {
      const res = await run(() => cancelarSolicitacaoRetirada(retiradaId))
      if (res.ok) {
        toast('Solicitação de retirada cancelada com sucesso.')
        await recarregar()
      } else {
        toast(res.error || 'Falha ao cancelar solicitação.')
      }
    } finally {
      setCancelandoId(null)
    }
  }

  function abrirPagamento(r: Retirada): void {
    modal.open(<ModalPagarRetirada retirada={r} onSuccess={() => void recarregar()} />)
  }

  const total = retiradas.length
  const emAndamento = retiradas.filter((r) => r.status !== 'entregue' && r.status !== 'cancelada').length
  const concluidas = retiradas.filter((r) => r.status === 'entregue').length

  return (
    <div className="cols-rev">
      <div className="panel">
        <h3>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
          </svg>
          Minhas retiradas físicas
        </h3>

        {carregando ? (
          <div className="carregando" role="status" aria-busy="true" aria-label="Carregando histórico de retiradas...">
            <Esqueleto altura="14px" largura="100%" />
            <Esqueleto altura="14px" largura="82%" />
            <Esqueleto altura="14px" largura="64%" />
          </div>
        ) : retiradas.length === 0 ? (
          <EstadoVazio
            titulo="Você ainda não solicitou a retirada de nenhuma moeda física da custódia."
            ilustracao="retirada"
            acao={
              <Link href="/recibos" className="btn btn-outline">
                Abrir Meus recibos
              </Link>
            }
          >
            Para pedir a saída de uma moeda, acesse Meus recibos, abra o recibo da moeda e clique em
            &quot;Solicitar retirada&quot;.
          </EstadoVazio>
        ) : (
          <ul className="retiradas">
            {retiradas.map((r) => (
              <li key={r.id} className="retirada">
                <div className="retirada-cab">
                  <div>
                    <div className="retirada-t">Retirada {r.id}</div>
                    <div className="retirada-d">
                      Solicitada em {fdate(r.solicitadoEm)}
                      {r.status === 'solicitada' ? (
                        ' · Aguardando pagamento da taxa'
                      ) : r.status === 'cancelada' ? (
                        ' · Cancelada'
                      ) : (
                        <>
                          {' · Recibo extinto: '}
                          <Link href={`/recibos/${r.coinId}`} className="link-ouro">
                            {r.reciboCodigo}
                          </Link>
                        </>
                      )}
                    </div>
                  </div>
                  <SeloDaRetirada status={r.status} />
                </div>

                {/* A jornada da retirada em etapas (tópico 35 passo 4b): onde está e o que falta. Só
                    desenho do status que já existe; cancelada não tem jornada. */}
                {r.status !== 'cancelada' ? <JornadaDaRetirada status={r.status} /> : null}

                <dl className="retirada-dados">
                  <div>
                    <dt>Modalidade</dt>
                    <dd>{r.modalidade === 'segura' ? 'Transporte Blindado' : 'Correios (AR)'}</dd>
                  </div>
                  <div>
                    <dt>{r.status === 'solicitada' ? 'Taxa a Pagar' : 'Taxa Paga'}</dt>
                    <dd>{brl(r.valorTaxaCents)}</dd>
                  </div>
                  <div>
                    <dt>
                      {r.status === 'solicitada'
                        ? 'Prazo para postar (30 dias corridos)'
                        : 'Limite para postar (30 dias corridos)'}
                    </dt>
                    <dd className="ouro">{r.status === 'solicitada' ? 'Inicia após pagamento' : fdate(r.dataLimiteD30)}</dd>
                  </div>
                  {r.codigoRastreio ? (
                    <div>
                      <dt>Código de Rastreio</dt>
                      <dd className="codigo verde">{r.codigoRastreio}</dd>
                      {/* Etiqueta do contrato emitida pelo painel (22/10/2026): o código já existe, mas a
                          caixa ainda não foi entregue aos Correios — quem marca "postada" é o rastreio. */}
                      {r.status === 'separacao' ? <dd className="sub">Etiqueta emitida, aguardando postagem</dd> : null}
                    </div>
                  ) : null}
                </dl>

                <p className="retirada-destino">
                  <strong>Destinatário:</strong> {r.endereco.nome} ({r.endereco.cpfOuCnpj}) —{' '}
                  {r.endereco.logradouro}, {r.endereco.numero}
                  {r.endereco.complemento ? ` (${r.endereco.complemento})` : ''} - {r.endereco.bairro},{' '}
                  {r.endereco.cidade}/{r.endereco.uf} - CEP {r.endereco.cep}
                </p>

                <div className="acoes">
                  {r.status === 'solicitada' ? (
                    <>
                      <button type="button" className="btn btn-gold" onClick={() => abrirPagamento(r)}>
                        Pagar taxa ({brl(r.valorTaxaCents)})<span className="sr-only"> da retirada {r.id}</span>
                      </button>
                      <Link href={`/recibos/${r.coinId}`} className="btn btn-outline">
                        Ver recibo<span className="sr-only"> {r.reciboCodigo}</span>
                      </Link>
                      {/* Desfazer fica por último e é o .btn-danger do Brandbook (§9.2): destrutivo, com confirmação. */}
                      <button
                        type="button"
                        className="btn btn-danger"
                        disabled={cancelandoId === r.id}
                        onClick={() => pedirCancelamento(r.id)}
                      >
                        {cancelandoId === r.id ? 'Cancelando...' : 'Cancelar solicitação'}
                        <span className="sr-only"> da retirada {r.id}</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <Link href={`/recibos/${r.coinId}`} className="btn btn-outline">
                        Ver recibo extinto<span className="sr-only"> {r.reciboCodigo}</span>
                      </Link>
                      {r.status !== 'cancelada' ? (
                        <a
                          href={`/api/retiradas/etiqueta/${r.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-outline"
                        >
                          Imprimir etiqueta Correios<span className="sr-only"> da retirada {r.id} (abre em nova aba)</span>
                        </a>
                      ) : null}
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="coluna-pilha">
        <div className="panel">
          <h3>Resumo de saídas</h3>
          <div className="summary-row">
            <span className="k">Total solicitadas</span>
            <span className="v">{total}</span>
          </div>
          <div className="summary-row">
            <span className="k">Em andamento</span>
            <span className="v">{emAndamento}</span>
          </div>
          <div className="summary-row total">
            <span className="k">Entregues</span>
            <span className="v">{concluidas}</span>
          </div>
        </div>

        <div className="panel">
          <div className="note">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />
            </svg>
            Ao solicitar a retirada física, o recibo de custódia é extinto imediatamente e a moeda deixa
            o acervo negociável. O Real Olímpico tem até 30 dias corridos para preparar e POSTAR; a
            entrega depende do prazo dos Correios, que corre por fora e tem rastreamento oficial.
          </div>
        </div>
      </div>
    </div>
  )
}

/** Etapas na ordem em que o status avança (o tipo StatusRetirada, sem 'cancelada'). */
const ETAPAS: { status: Exclude<Retirada['status'], 'cancelada'>; rotulo: string }[] = [
  { status: 'solicitada', rotulo: 'Solicitada' },
  { status: 'paga', rotulo: 'Taxa paga' },
  { status: 'separacao', rotulo: 'Em separação' },
  { status: 'postada', rotulo: 'Postada' },
  { status: 'entregue', rotulo: 'Entregue' },
]

/**
 * A jornada da retirada como lista ordenada: cada etapa diz se já passou, se é a atual ou se
 * falta. O "✓" e o "atual" também vão em texto para o leitor de tela — a cor não é o único sinal.
 */
function JornadaDaRetirada({ status }: { status: Exclude<Retirada['status'], 'cancelada'> }): ReactNode {
  const atual = ETAPAS.findIndex((e) => e.status === status)
  return (
    <ol className="jornada" aria-label="Etapas da retirada">
      {ETAPAS.map((e, i) => {
        const estado = i < atual ? 'feita' : i === atual ? 'atual' : 'falta'
        return (
          <li key={e.status} className={`jornada-etapa ${estado}`} aria-current={estado === 'atual' ? 'step' : undefined}>
            <span className="jornada-ponto" aria-hidden="true">
              {estado === 'feita' ? '✓' : i + 1}
            </span>
            <span className="jornada-rotulo">
              {e.rotulo}
              <span className="sr-only">{estado === 'feita' ? ' (concluída)' : estado === 'atual' ? ' (etapa atual)' : ''}</span>
            </span>
          </li>
        )
      })}
    </ol>
  )
}
