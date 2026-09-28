'use client'

/**
 * A cobrança da oferta de compra PRÉ-PAGA.
 *
 * POR QUE ESTE COMPONENTE EXISTE (27/09/2026)
 * -------------------------------------------
 * A oferta pré-paga nasce com `pagoAntecipadoCents: 0` e não casa com nada
 * enquanto estiver assim — é essa a definição da modalidade. O backend da
 * cobrança existia desde 22/09 (`financiarOfertaPrepaga`, com liquidador
 * próprio na conciliação), mas NENHUMA TELA o chamava: a pessoa escolhia
 * "pré-pago", publicava, lia "Pague R$ X para a oferta entrar no mercado" — e
 * não havia lugar nenhum para pagar. A oferta ficava no livro sem lastro, sem
 * casar, para sempre.
 *
 * O desenho é deliberadamente o MESMO da compra direta na página de Mercado
 * (`ConfirmarCompraModal`): "Comprar com saldo" primeiro, "Comprar com Pix ou
 * cartão" depois, e o Pix copia-e-cola aparecendo no próprio pop-up. São
 * a mesma pergunta para o usuário — "como você vai pagar este valor agora?" —
 * e duas telas diferentes para a mesma pergunta é o que faz alguém achar que
 * uma delas não cobra.
 *
 * O TOTAL JÁ INCLUI A COMISSÃO DE COMPRA, como na compra direta: o que se
 * paga aqui é exatamente o que a oferta precisa ter para poder executar.
 */

import { useState, type ReactNode } from 'react'

import { brl } from '@/domain/money'
import type { Cents } from '@/domain/types'
import { useApp } from '@/components/providers/AppProvider'
import { useModal } from '@/components/ui/Modal'
import {
  financiarOfertaPrepaga,
  financiarOfertaPrepagaComSaldo,
} from '@/server/actions/reserva'

export interface ModalOfertaPrePagaProps {
  bidId: string
  qty: number
  tipoMoeda: string
  precoUnit: Cents
  /** Preço mais taxa de compra, vezes a quantidade. É o que se paga. */
  totalCents: Cents
}

export function ModalOfertaPrePaga({
  bidId,
  qty,
  tipoMoeda,
  precoUnit,
  totalCents,
}: ModalOfertaPrePagaProps): ReactNode {
  const { me, run } = useApp()
  const { close } = useModal()

  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const [pix, setPix] = useState<{ qrCode?: string; qrCodeBase64?: string } | null>(null)

  const temSaldo = me.balance >= totalCents
  const comissao = totalCents - precoUnit * qty

  async function pagarComSaldo(): Promise<void> {
    setEnviando(true)
    setErro('')
    try {
      const res = await run(() => financiarOfertaPrepagaComSaldo(bidId))
      if (res.ok) close()
    } finally {
      setEnviando(false)
    }
  }

  async function cobrarPeloGateway(forma: 'pix' | 'cartao'): Promise<void> {
    setEnviando(true)
    setErro('')
    try {
      const res = await financiarOfertaPrepaga(bidId, forma)
      if (!res.ok || !res.data) {
        setErro(res.error ?? 'Não foi possível abrir a cobrança. Tente novamente.')
        return
      }
      if (forma === 'pix' && res.data.forma === 'pix') {
        setPix({ qrCode: res.data.qrCode, qrCodeBase64: res.data.qrCodeBase64 })
        return
      }
      // O checkout do cartão abre em outra aba, como na compra direta: a oferta
      // já está publicada, e trocar a aba desta tela perderia o Pix se a pessoa
      // voltasse atrás.
      const destino = res.data.forma === 'cartao' ? res.data.initPoint : undefined
      if (destino) {
        window.open(destino, '_blank', 'noopener,noreferrer')
      } else {
        setErro('Não foi possível abrir a tela de pagamento. Tente novamente.')
      }
    } catch {
      setErro('Não foi possível falar com o meio de pagamento. Tente novamente.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <>
      <h3 className="serif">Pagar a oferta de compra</h3>
      <p style={{ marginBottom: 12 }}>
        <b style={{ color: 'var(--gold)' }}>{tipoMoeda}</b> · {qty} unidade(s) a {brl(precoUnit)}
      </p>

      <div className="summary-row">
        <span className="k">Subtotal das moedas</span>
        <span className="v">{brl(precoUnit * qty)}</span>
      </div>
      <div className="summary-row">
        <span className="k">Taxa de compra do Real Olímpico</span>
        <span className="v">+ {brl(comissao)}</span>
      </div>
      <div className="summary-row total">
        <span className="k">Total a pagar agora</span>
        <span className="v" style={{ fontWeight: 600 }}>
          {brl(totalCents)}
        </span>
      </div>
      <div className="summary-row">
        <span className="k">Seu saldo em conta</span>
        <span className="v">{brl(me.balance)}</span>
      </div>

      <div className="note" style={{ marginTop: 12 }}>
        A oferta já está publicada, mas <b>só entra no mercado depois do pagamento</b>. O valor
        fica preso a ela: não volta para o saldo e não pode ser gasto em outra compra. Se você
        cancelar a oferta antes de ela executar, o dinheiro volta como saldo em conta.
      </div>

      {/* A mesma ordem e os mesmos títulos da compra direta do Mercado. O
          título de cada bloco é a própria escolha: "gateway" é palavra de quem
          escreve o código, e numerar as opções gasta a linha mais visível sem
          dizer nada a quem está comprando. */}
      <div
        style={{
          marginTop: 14,
          padding: '12px 14px',
          background: 'var(--input-bg)',
          borderRadius: 8,
          border: '1px solid var(--line-soft)',
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-strong)', marginBottom: 4 }}>
          Comprar com saldo
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
          {temSaldo
            ? `O total de ${brl(totalCents)} será debitado do seu saldo e ficará preso a esta oferta.`
            : `Saldo insuficiente (faltam ${brl(totalCents - me.balance)}).`}
        </div>
        <button
          type="button"
          className={temSaldo ? 'btn btn-gold' : 'btn btn-outline'}
          style={{ width: '100%', minHeight: 44 }}
          disabled={!temSaldo || enviando}
          onClick={() => void pagarComSaldo()}
        >
          {temSaldo ? 'Pagar com saldo em conta' : 'Saldo insuficiente'}
        </button>
      </div>

      {/* Pix e cartão, sem passar pelo saldo. */}
      <div
        style={{
          marginTop: 12,
          padding: '12px 14px',
          background: 'var(--input-bg)',
          borderRadius: 8,
          border: '1px solid var(--line-soft)',
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-strong)', marginBottom: 4 }}>
          Comprar com Pix ou cartão
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
          Pague {brl(totalCents)} por Pix ou cartão, sem usar o saldo em conta. A oferta entra no
          mercado assim que o pagamento for aprovado.
        </div>
        <div className="m-actions" style={{ marginTop: 0 }}>
          <button
            type="button"
            className="btn btn-outline"
            style={{ minHeight: 44 }}
            disabled={enviando}
            onClick={() => void cobrarPeloGateway('pix')}
          >
            Pagar com Pix
          </button>
          <button
            type="button"
            className="btn btn-outline"
            style={{ minHeight: 44 }}
            disabled={enviando}
            onClick={() => void cobrarPeloGateway('cartao')}
          >
            Cartão ou boleto
          </button>
        </div>
      </div>

      {erro ? (
        <div className="note" style={{ marginTop: 12 }}>
          {erro}
        </div>
      ) : null}

      {pix ? (
        <div style={{ marginTop: 14 }}>
          <div className="field-lbl">Pix copia e cola</div>
          <textarea
            readOnly
            rows={3}
            aria-label="Código Pix copia e cola"
            value={pix.qrCode ?? ''}
            style={{ width: '100%', fontFamily: 'monospace', fontSize: 12 }}
          />
          {pix.qrCodeBase64 ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`data:image/png;base64,${pix.qrCodeBase64}`}
              alt="QR Code do Pix"
              style={{ display: 'block', width: 180, height: 180, margin: '12px auto' }}
            />
          ) : null}
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Assim que o pagamento for confirmado, a oferta entra no mercado sozinha — não é preciso
            voltar aqui.
          </p>
        </div>
      ) : null}

      <div className="m-actions" style={{ marginTop: 14 }}>
        <button type="button" className="btn btn-outline" style={{ minHeight: 44 }} onClick={close}>
          Pagar depois
        </button>
      </div>
    </>
  )
}
