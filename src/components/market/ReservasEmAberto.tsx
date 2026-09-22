'use client'

/**
 * As reservas de compra pós-paga com o relógio correndo.
 *
 * Quando uma oferta pós-paga casa com uma venda, a moeda fica reservada e o
 * comprador tem dez minutos para pagar. O e-mail avisa, mas quem já está com a
 * tela aberta precisa ver o prazo aqui — e vê-lo andando, porque um prazo
 * escrito em texto fixo não comunica urgência nenhuma.
 *
 * O CONTADOR É DE APRESENTAÇÃO, NÃO DE REGRA
 * ------------------------------------------
 * Quem decide se a reserva ainda vale é o servidor, sempre: `expiraEm` é
 * comparado no domínio (`marcarReservaPaga`) e de novo na conciliação do
 * pagamento. Este componente só desenha o tempo que o servidor informou. Se o
 * relógio da máquina do cliente estiver adiantado, ele vê zero antes da hora e
 * o pagamento continua sendo aceito — o contrário, que seria grave, não
 * acontece.
 *
 * Silencioso quando não há reserva: bloco que aparece sempre vira paisagem.
 */

import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'

import { brl } from '@/domain/money'
import { useApp } from '@/components/providers/AppProvider'
import {
  listarMinhasReservas,
  pagarReservaComSaldo,
  type ReservaNaTela,
} from '@/server/actions/reserva'

function mmss(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export function ReservasEmAberto(): ReactNode {
  const { run } = useApp()
  const [reservas, setReservas] = useState<ReservaNaTela[]>([])
  const [tick, setTick] = useState(0)

  async function carregar(): Promise<void> {
    const res = await listarMinhasReservas()
    setReservas(res.ok && res.data ? res.data : [])
  }

  useEffect(() => {
    void carregar()
    // Recarrega do servidor a cada 30 s: é ele que sabe se a reserva ainda
    // existe. O segundo intervalo, de 1 s, só move o contador na tela.
    const doServidor = window.setInterval(() => void carregar(), 30_000)
    const doRelogio = window.setInterval(() => setTick((t) => t + 1), 1000)
    return () => {
      window.clearInterval(doServidor)
      window.clearInterval(doRelogio)
    }
  }, [])

  if (reservas.length === 0) return null

  return (
    <div className="panel warn-box" style={{ marginBottom: 18 }}>
      <h3 style={{ marginTop: 0 }}>
        <svg viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 3" />
        </svg>
        {reservas.length === 1 ? 'Compra reservada' : `${reservas.length} compras reservadas`}
      </h3>

      <p style={{ marginTop: 0, fontSize: 13 }}>
        A sua oferta foi aceita e a moeda está reservada no seu nome. Pague dentro do prazo, ou ela
        volta ao mercado e a sua oferta vai para o fim da fila do mesmo preço.
      </p>

      {reservas.map((r) => {
        // `tick` não entra na conta: quem dá o tempo é o relógio, e ele existe
        // só para o React redesenhar a cada segundo. A referência abaixo é o
        // que amarra o redesenho ao intervalo.
        void tick
        const restante = Math.max(0, r.expiraEm - Date.now())
        const acabando = restante <= 120_000
        return (
          <div
            key={r.id}
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 10,
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 0',
              borderTop: '1px solid var(--line-soft)',
            }}
          >
            <div>
              <div style={{ fontWeight: 600 }}>
                1 {r.tipoMoeda} · {brl(r.totalCents)}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {brl(r.precoCents)} de preço + {brl(r.comissaoCompradorCents)} de comissão
              </div>
            </div>

            <div
              style={{
                fontVariantNumeric: 'tabular-nums',
                fontWeight: 700,
                fontSize: 18,
                color: acabando ? 'var(--danger, #c0392b)' : 'var(--gold)',
              }}
              aria-label={`Tempo restante: ${mmss(restante)}`}
            >
              {mmss(restante)}
            </div>

            <button
              type="button"
              className="btn btn-gold"
              style={{ minHeight: 44 }}
              disabled={restante <= 0}
              onClick={async () => {
                const res = await run(() => pagarReservaComSaldo(r.id))
                if (res.ok) await carregar()
              }}
            >
              Pagar com saldo
            </button>
          </div>
        )
      })}

      <div className="note" style={{ marginTop: 10 }}>
        Sem saldo suficiente? Deposite em Minha Conta e volte aqui — o prazo continua correndo.
      </div>
    </div>
  )
}
