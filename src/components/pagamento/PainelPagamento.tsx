'use client'

/**
 * Painel de Pagamento Reutilizável (Passo B1.5).
 *
 * Suporta as 3 formas de pagamento:
 *  1. Saldo em conta (opcional — requer `pagarComSaldo`).
 *  2. Pix (QR Code + Copia e Cola com polling a cada 5s).
 *  3. Cartão de Crédito (Checkout Pro em aba segura com suporte a parcelasMax).
 *
 * REGRAS INEGOCIÁVEIS:
 *  - Client Component seguro (sem imports de @/server/* exceto Server Actions).
 *  - Alvo de toque mínimo de 44px em todos os controles.
 *  - Saldo insuficiente não bloqueia nem esconde Pix/Cartão.
 *  - Simulador (`simulado: true`) avisa no próprio painel e não abre abas externas.
 */

import { useEffect, useState, type ReactNode } from 'react'

import { brl } from '@/domain/money'
import type { Cents } from '@/domain/types'
import type { CobrancaCartao, CobrancaPix } from '@/lib/payments'
import { consultarStatusCobranca } from '@/server/actions/payments'
import type { DepositoIniciado } from '@/server/payments/tipos'

export interface PainelPagamentoProps {
  valorCents: Cents
  parcelasMax?: number
  saldoDisponivel?: Cents
  pagarComSaldo?: () => Promise<void> | void
  iniciarPix: () => Promise<CobrancaPix | DepositoIniciado | null>
  iniciarCartao: () => Promise<CobrancaCartao | DepositoIniciado | null>
  aoConcluir?: () => void
}

type AbaPagamento = 'saldo' | 'pix' | 'cartao'

export function PainelPagamento({
  valorCents,
  parcelasMax = 1,
  saldoDisponivel = 0,
  pagarComSaldo,
  iniciarPix,
  iniciarCartao,
  aoConcluir,
}: PainelPagamentoProps): ReactNode {
  const temSaldoSuficiente = saldoDisponivel >= valorCents
  const [abaAtiva, setAbaAtiva] = useState<AbaPagamento>(() => {
    if (pagarComSaldo && temSaldoSuficiente) return 'saldo'
    return 'pix'
  })

  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [copiado, setCopiado] = useState(false)

  const [pixDados, setPixDados] = useState<CobrancaPix | DepositoIniciado | null>(null)
  const [cartaoDados, setCartaoDados] = useState<CobrancaCartao | DepositoIniciado | null>(null)
  const [statusCobranca, setStatusCobranca] = useState<'pendente' | 'creditado' | 'recusado' | null>(null)

  // Referência externa ativa para polling
  const refAtiva = pixDados?.externalReference || cartaoDados?.externalReference

  // Polling automático a cada 5 segundos enquanto houver cobrança pendente
  useEffect(() => {
    if (!refAtiva || statusCobranca === 'creditado' || statusCobranca === 'recusado') {
      return
    }

    const timer = setInterval(async () => {
      try {
        const res = await consultarStatusCobranca(refAtiva)
        if (res.ok && res.data) {
          if (res.data.status === 'creditado') {
            setStatusCobranca('creditado')
            aoConcluir?.()
          } else if (res.data.status === 'recusado') {
            setStatusCobranca('recusado')
            setErro(res.data.motivo || 'Cobrança não aprovada ou recusada.')
          }
        }
      } catch {
        // Falhas transitórias de rede no polling não devem interromper o ciclo
      }
    }, 5000)

    return () => clearInterval(timer)
  }, [refAtiva, statusCobranca, aoConcluir])

  async function handlePagarSaldo(): Promise<void> {
    if (!pagarComSaldo || !temSaldoSuficiente || carregando) return
    setCarregando(true)
    setErro(null)
    try {
      await pagarComSaldo()
      setStatusCobranca('creditado')
      aoConcluir?.()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao processar pagamento com saldo.')
    } finally {
      setCarregando(false)
    }
  }

  async function handleIniciarPix(): Promise<void> {
    if (carregando) return
    setCarregando(true)
    setErro(null)
    try {
      const res = await iniciarPix()
      if (res) {
        setPixDados(res)
        setStatusCobranca('pendente')
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao gerar cobrança Pix.')
    } finally {
      setCarregando(false)
    }
  }

  async function handleIniciarCartao(): Promise<void> {
    if (carregando) return
    setCarregando(true)
    setErro(null)
    try {
      const res = await iniciarCartao()
      if (res) {
        setCartaoDados(res)
        setStatusCobranca('pendente')
        if (!res.simulado && res.initPoint) {
          window.open(res.initPoint, '_blank', 'noopener,noreferrer')
        }
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao abrir checkout de cartão.')
    } finally {
      setCarregando(false)
    }
  }

  async function copiarPix(): Promise<void> {
    if (!pixDados?.qrCode) return
    try {
      await navigator.clipboard.writeText(pixDados.qrCode)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 3000)
    } catch {
      setCopiado(false)
    }
  }

  return (
    <div className="pagamento-container">
      {/* Seletor de Abas com foco e altura de toque mínima de 44px */}
      <div className="pagamento-tabs" role="tablist" aria-label="Formas de pagamento">
        {pagarComSaldo ? (
          <button
            type="button"
            role="tab"
            aria-selected={abaAtiva === 'saldo'}
            className={`pagamento-tab ${abaAtiva === 'saldo' ? 'active' : ''}`}
            onClick={() => {
              setAbaAtiva('saldo')
              setErro(null)
            }}
          >
            Saldo em conta
          </button>
        ) : null}

        <button
          type="button"
          role="tab"
          aria-selected={abaAtiva === 'pix'}
          className={`pagamento-tab ${abaAtiva === 'pix' ? 'active' : ''}`}
          onClick={() => {
            setAbaAtiva('pix')
            setErro(null)
          }}
        >
          Pix
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={abaAtiva === 'cartao'}
          className={`pagamento-tab ${abaAtiva === 'cartao' ? 'active' : ''}`}
          onClick={() => {
            setAbaAtiva('cartao')
            setErro(null)
          }}
        >
          Cartão {parcelasMax > 1 ? `(até ${parcelasMax}x)` : ''}
        </button>
      </div>

      {erro ? (
        <div className="pagamento-status-box erro" role="alert">
          {erro}
        </div>
      ) : null}

      {statusCobranca === 'creditado' ? (
        <div className="pagamento-status-box sucesso" role="status">
          ✓ Pagamento confirmado com sucesso!
        </div>
      ) : null}

      {/* Painel 1: Saldo em Conta */}
      {pagarComSaldo && abaAtiva === 'saldo' ? (
        <div className="pagamento-panel" role="tabpanel">
          <div className="pagamento-summary">
            <div className="pagamento-summary-row">
              <span>Valor a pagar:</span>
              <span>{brl(valorCents)}</span>
            </div>
            <div className="pagamento-summary-row">
              <span>Saldo disponível:</span>
              <span>{brl(saldoDisponivel)}</span>
            </div>
            <div className="pagamento-summary-row highlight">
              <span>Saldo após débito:</span>
              <span>
                {temSaldoSuficiente ? brl(saldoDisponivel - valorCents) : 'Saldo insuficiente'}
              </span>
            </div>
          </div>

          {!temSaldoSuficiente ? (
            <div className="note" style={{ color: '#f59e0b' }}>
              Faltam {brl(valorCents - saldoDisponivel)} no seu saldo para concluir esta operação.
              Você pode pagar diretamente via <b>Pix</b> ou <b>Cartão</b> nas abas ao lado.
            </div>
          ) : null}

          <button
            type="button"
            className="btn btn-gold pagamento-btn"
            disabled={!temSaldoSuficiente || carregando || statusCobranca === 'creditado'}
            onClick={() => void handlePagarSaldo()}
          >
            {carregando ? 'Processando débito...' : `Pagar ${brl(valorCents)} com saldo`}
          </button>
        </div>
      ) : null}

      {/* Painel 2: Pix */}
      {abaAtiva === 'pix' ? (
        <div className="pagamento-panel" role="tabpanel">
          {!pixDados ? (
            <>
              <p style={{ margin: 0, fontSize: 14 }}>
                Pague à vista com o Pix do seu banco. A aprovação é imediata e o sistema atualiza
                automaticamente após a confirmação.
              </p>
              <div className="pagamento-summary">
                <div className="pagamento-summary-row highlight">
                  <span>Valor total:</span>
                  <span>{brl(valorCents)}</span>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-gold pagamento-btn"
                disabled={carregando}
                onClick={() => void handleIniciarPix()}
              >
                {carregando ? 'Gerando cobrança Pix...' : 'Gerar código Pix'}
              </button>
            </>
          ) : pixDados.simulado ? (
            <div className="note" style={{ textAlign: 'center' }}>
              Ambiente de teste: o gateway de pagamento ainda não está configurado neste ambiente.
              Nenhuma cobrança externa foi aberta.
            </div>
          ) : (
            <>
              {pixDados.qrCodeBase64 ? (
                <div className="pagamento-qr-box">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={
                      pixDados.qrCodeBase64.startsWith('data:')
                        ? pixDados.qrCodeBase64
                        : `data:image/png;base64,${pixDados.qrCodeBase64}`
                    }
                    alt="QR Code Pix"
                    className="pagamento-qr-img"
                  />
                  <span style={{ fontSize: 12, color: '#475569' }}>
                    Aponte a câmera do aplicativo do seu banco
                  </span>
                </div>
              ) : null}

              {pixDados.qrCode ? (
                <div className="pagamento-copia-cola">
                  <input
                    type="text"
                    readOnly
                    value={pixDados.qrCode}
                    className="pagamento-input-code"
                    aria-label="Código Pix Copia e Cola"
                  />
                  <button
                    type="button"
                    className="btn btn-outline"
                    style={{ minHeight: 44 }}
                    onClick={() => void copiarPix()}
                  >
                    {copiado ? 'Copiado!' : 'Copiar'}
                  </button>
                </div>
              ) : null}

              {statusCobranca !== 'creditado' ? (
                <div className="pagamento-status-box pendente">
                  Aguardando confirmação do pagamento...
                </div>
              ) : null}
            </>
          )}
        </div>
      ) : null}

      {/* Painel 3: Cartão de Crédito */}
      {abaAtiva === 'cartao' ? (
        <div className="pagamento-panel" role="tabpanel">
          {!cartaoDados ? (
            <>
              <p style={{ margin: 0, fontSize: 14 }}>
                Pague com cartão de crédito{' '}
                {parcelasMax > 1 ? (
                  <b>em até {parcelasMax}x</b>
                ) : (
                  'à vista'
                )}{' '}
                no ambiente seguro do Checkout Pro do Mercado Pago.
              </p>
              <div className="pagamento-summary">
                <div className="pagamento-summary-row highlight">
                  <span>Valor total:</span>
                  <span>{brl(valorCents)}</span>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-gold pagamento-btn"
                disabled={carregando}
                onClick={() => void handleIniciarCartao()}
              >
                {carregando ? 'Abrindo checkout...' : 'Pagar com cartão no Mercado Pago'}
              </button>
            </>
          ) : cartaoDados.simulado ? (
            <div className="note" style={{ textAlign: 'center' }}>
              Ambiente de teste: o gateway de pagamento ainda não está configurado neste ambiente.
              Nenhuma cobrança externa foi aberta.
            </div>
          ) : (
            <>
              <p style={{ fontSize: 14, margin: 0 }}>
                Uma nova aba foi aberta para você concluir o pagamento no Mercado Pago. Caso não
                tenha aberto automaticamente, utilize o botão abaixo:
              </p>
              {cartaoDados.initPoint ? (
                <a
                  href={cartaoDados.initPoint}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-gold pagamento-btn"
                  style={{ textDecoration: 'none' }}
                >
                  Abrir página de pagamento
                </a>
              ) : null}

              {statusCobranca !== 'creditado' ? (
                <div className="pagamento-status-box pendente">
                  Aguardando confirmação do pagamento...
                </div>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </div>
  )
}
