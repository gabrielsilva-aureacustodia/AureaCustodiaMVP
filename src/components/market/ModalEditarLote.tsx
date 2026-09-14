'use client'

import { useState } from 'react'
import type { ReactNode } from 'react'

import { useApp } from '@/components/providers/AppProvider'
import { useModal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { availableCoinsForSell } from '@/domain/market'
import { parsePrice } from '@/domain/money'
import type { Lot } from '@/domain/types'
import { editLot } from '@/server/actions/sell'

export function ModalEditarLote({ lote }: { lote: Lot }): ReactNode {
  const { state, me, run } = useApp()
  const { close } = useModal()
  const toast = useToast()

  const moedasLoteAtual = lote.coinIds.length
  // Moedas livres do mesmo tipo que podem ser acrescentadas ao lote
  const livres = availableCoinsForSell(state, me, lote.tipoMoeda)
  const maxPossivel = moedasLoteAtual + livres.length

  const [precoTexto, setPrecoTexto] = useState(() =>
    (lote.price / 100).toFixed(2).replace('.', ','),
  )
  const [qty, setQty] = useState(moedasLoteAtual)
  const [obs, setObs] = useState(lote.obs ?? '')

  function ajustar(d: number): void {
    setQty((atual) => Math.min(maxPossivel, Math.max(1, atual + d)))
  }

  function salvar(): void {
    const cents = parsePrice(precoTexto)
    if (!cents || cents <= 0) {
      toast('Informe um preço válido.')
      return
    }
    close()
    void run(() => editLot(lote.lotId, cents, qty, obs.trim()))
  }

  return (
    <>
      <h3 className="serif">Editar anúncio de venda</h3>
      <p>
        Moeda: <b style={{ color: 'var(--gold)' }}>{lote.tipoMoeda}</b> — {moedasLoteAtual} moeda(s) anunciada(s) atualmente.
      </p>

      <div className="field-lbl">Novo preço unitário</div>
      <div className="price-input">
        <span>R$</span>
        <input
          inputMode="decimal"
          aria-label="Novo preço unitário em reais"
          value={precoTexto}
          onChange={(e) => setPrecoTexto(e.target.value)}
        />
      </div>

      <div className="field-lbl">Quantidade anunciada</div>
      <div className="stepper">
        <button
          type="button"
          style={{ minHeight: '44px', minWidth: '44px' }}
          disabled={qty <= 1}
          onClick={() => ajustar(-1)}
          aria-label="Diminuir quantidade"
        >
          −
        </button>
        <span className="n">{qty}</span>
        <button
          type="button"
          style={{ minHeight: '44px', minWidth: '44px' }}
          disabled={qty >= maxPossivel}
          onClick={() => ajustar(1)}
          aria-label="Aumentar quantidade"
        >
          +
        </button>
      </div>
      <p style={{ fontSize: 12, marginTop: 4 }}>
        Você tem {livres.length} moeda(s) livre(s) desse tipo para acrescentar.
        Moedas reduzidas voltam ao inventário livre; moedas acrescentadas saem do seu inventário.
      </p>

      <div className="field-lbl">Observação (opcional, máx. 140 caracteres)</div>
      <textarea
        className="obs"
        maxLength={140}
        rows={2}
        placeholder="Ex.: Moedas em custódia na Áurea."
        aria-label="Observação do anúncio"
        value={obs}
        onChange={(e) => setObs(e.target.value)}
      />

      <div className="note" style={{ marginTop: 12, marginBottom: 12 }}>
        Mudar o preço ou aumentar a quantidade leva a oferta para o fim da fila.
      </div>

      <div className="m-actions">
        <button
          className="btn btn-outline"
          type="button"
          style={{ minHeight: '44px', minWidth: '44px' }}
          onClick={close}
        >
          Cancelar
        </button>
        <button
          className="btn btn-gold"
          type="button"
          style={{ minHeight: '44px', minWidth: '44px' }}
          onClick={salvar}
        >
          Salvar alterações
        </button>
      </div>
    </>
  )
}
