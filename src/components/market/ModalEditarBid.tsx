'use client'

import { useState } from 'react'
import type { ReactNode } from 'react'

import { useApp } from '@/components/providers/AppProvider'
import { useModal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { parsePrice } from '@/domain/money'
import type { BuyOrder } from '@/domain/types'
import { editBid } from '@/server/actions/market'

const BID_INVALIDO_EDITAR = 'Informe quantidade e preço válidos.'

export function ModalEditarBid({ bid }: { bid: BuyOrder }): ReactNode {
  const { run } = useApp()
  const { close } = useModal()
  const toast = useToast()

  const [qtyTexto, setQtyTexto] = useState(String(bid.qty))
  const [precoTexto, setPrecoTexto] = useState((bid.price / 100).toFixed(2).replace('.', ','))

  const qty = parseInt(qtyTexto, 10) || 1
  const preco = parsePrice(precoTexto)

  async function salvar(): Promise<void> {
    if (!preco || preco <= 0 || !qty || qty <= 0) {
      toast(BID_INVALIDO_EDITAR)
      return
    }
    close()
    await run(() => editBid(bid.id, qty, preco))
  }

  return (
    <>
      <h3 className="serif">Editar oferta de compra</h3>
      <p>
        Moeda: <b style={{ color: 'var(--gold)' }}>{bid.tipoMoeda}</b>
      </p>

      <div className="field-lbl">Quantidade desejada</div>
      <input
        id="editBidQty"
        type="number"
        min="1"
        className="tinput"
        value={qtyTexto}
        onChange={(e) => setQtyTexto(e.target.value)}
      />

      <div className="field-lbl">Preço unitário máximo</div>
      <div className="price-input">
        <span>R$</span>
        <input
          id="editBidPrice"
          inputMode="decimal"
          value={precoTexto}
          onChange={(e) => setPrecoTexto(e.target.value)}
        />
      </div>

      <div className="note" style={{ marginTop: 12, marginBottom: 12 }}>
        Mudar o preço ou aumentar a quantidade leva a oferta para o fim da fila.
      </div>

      <div className="m-actions">
        <button
          type="button"
          className="btn btn-outline"
          style={{ minHeight: '44px', minWidth: '44px' }}
          onClick={close}
        >
          Cancelar
        </button>
        <button
          type="button"
          className="btn btn-gold"
          style={{ minHeight: '44px', minWidth: '44px' }}
          onClick={() => void salvar()}
        >
          Salvar alterações
        </button>
      </div>
    </>
  )
}
