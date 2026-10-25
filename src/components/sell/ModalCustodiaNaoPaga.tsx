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

import { MENSAGEM_CUSTODIA_NAO_PAGA } from '@/domain/bloqueio-por-debito'
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

  // Todas as faturas em aberto da moeda — inclusive a de entrada, ainda dentro do prazo: desde 12/10/2026
  // é ela, e não só a vencida, que impede a venda.
  const abertas = faturas.filter(
    (f) =>
      f.userEmail === email &&
      f.status !== 'paga' &&
      f.status !== 'cancelada' &&
      ((f.moedaIds ?? []).includes(coinId) ||
        Boolean(f.planoId && planos?.find((p) => p.id === f.planoId)?.moedaIds?.includes(coinId))),
  )
  const total = abertas.reduce((s, f) => s + f.valorCents, 0)

  return (
    <>
      <h3 className="serif">{MENSAGEM_CUSTODIA_NAO_PAGA}</h3>
      <p>
        A moeda <b className="u-ouro">{coinId}</b> está com a custódia em aberto.
        Enquanto ela não for paga, esta moeda não pode ser colocada à venda.
      </p>

      {abertas.length > 0 && (
        <div className="u-mb16">
          <div className="u-f13 u-semi u-mb6">
            {abertas.length === 1 ? 'Fatura pendente:' : 'Faturas pendentes:'}
          </div>
          {abertas.map((f) => (
            <div
              key={f.id} className="u-linha-tabela"
            >
              <span>{f.competencia}</span>
              <span className="u-forte u-erro">{brl(f.valorCents)}</span>
            </div>
          ))}
          {abertas.length > 1 && (
            <div className="u-linha-total"
            >
              <span>Total</span>
              <span className="u-erro">{brl(total)}</span>
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
          className="btn btn-gold u-btn-link"
          onClick={close}
        >
          Pagar custódia →
        </Link>
      </div>
    </>
  )
}
