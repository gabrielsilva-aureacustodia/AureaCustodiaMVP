'use client'

/**
 * Modal de custódia não paga (AG8).
 *
 * Aberta quando o usuário tenta vender uma moeda cuja custódia ainda não foi
 * quitada. Mostra o motivo, as faturas em aberto e um botão que leva direto
 * ao pagamento — exigência do AG8: "recusa sem caminho de resolução gera
 * chamado no WhatsApp".
 */

import Link from 'next/link'
import type { ReactNode } from 'react'

import { MENSAGEM_CUSTODIA_NAO_PAGA, faturasAbertasDaMoeda } from '@/domain/bloqueio-por-debito'
import { brl } from '@/domain/money'
import type { FaturaCustodia, PlanoCustodia } from '@/domain/types'
import { useModal } from '@/components/ui/Modal'

interface ModalCustodiaNaoPagaProps {
  coinId: string
  faturas: readonly FaturaCustodia[]
  planos: readonly PlanoCustodia[] | undefined
  email: string
}

export function ModalCustodiaNaoPaga({
  coinId,
  faturas,
  planos,
  email,
}: ModalCustodiaNaoPagaProps): ReactNode {
  const { close } = useModal()

  const abertas = faturasAbertasDaMoeda(faturas, planos, email, coinId)
  const total = abertas.reduce((s, f) => s + f.valorCents, 0)

  return (
    <>
      <h3 className="serif">{MENSAGEM_CUSTODIA_NAO_PAGA}</h3>
      <p>
        A moeda <b style={{ color: 'var(--gold)' }}>{coinId}</b> está com a custódia em aberto.
        Enquanto ela não for paga, esta moeda não pode ser colocada à venda.
      </p>

      {abertas.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: 6 }}>
            {abertas.length === 1 ? 'Fatura pendente:' : 'Faturas pendentes:'}
          </div>
          {abertas.map((f) => (
            <div
              key={f.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '6px 0',
                fontSize: '13px',
                borderBottom: '1px solid var(--line-soft)',
              }}
            >
              <span>{f.competencia}</span>
              <span style={{ fontWeight: 700, color: '#f85149' }}>{brl(f.valorCents)}</span>
            </div>
          ))}
          {abertas.length > 1 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '8px 0 0',
                fontSize: '14px',
                fontWeight: 700,
              }}
            >
              <span>Total</span>
              <span style={{ color: '#f85149' }}>{brl(total)}</span>
            </div>
          )}
        </div>
      )}

      <div className="m-actions">
        <button className="btn btn-outline" type="button" onClick={close}>
          Fechar
        </button>
        <Link
          href="/conta/faturas"
          className="btn btn-gold"
          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minHeight: 44, textDecoration: 'none' }}
          onClick={close}
        >
          Pagar custódia →
        </Link>
      </div>
    </>
  )
}
