/**
 * O recibo de custódia desenhado como documento, no herói: a ideia inteira do serviço (a moeda fica no cofre,
 * você fica com o recibo) numa imagem só — padrão "demonstração viva ao lado do título" do Vercel SaaS
 * Starter (doc 15 §1.5 do aprendizado_frontend).
 *
 * NENHUM dado inventado: moeda, ano, tiragem e peso de referência vêm do catálogo (`COIN_TYPES`); o cofre é o
 * que a landing já diz. Não há número de recibo nem titular — o campo diz "exemplo", e o rodapé leva o rótulo
 * "código simulado", o mesmo do QR do recibo real (deliberado, CLAUDE.md: não há blockchain).
 * Com a Frente 2, ganha a moldura de papel-moeda e o selo da perícia (SVG em currentColor, pintados por máscara
 * CSS na tinta dourada do certificado). Marcação pura, sem 'use client'.
 */

import type { CSSProperties, ReactNode } from 'react'

import { COIN_TYPES } from '@/domain/constants'

import { FRENTE_2_MESCLADA, MOLDURA_GUILLOCHE, SELO_PERICIA } from './visuais'

const DH = COIN_TYPES.find((c) => c.key === 'Direitos Humanos')

function gramas(mg: number | undefined): string {
  return mg === undefined ? '—' : `${(mg / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} g`
}

export function ReciboIlustrado(): ReactNode {
  return (
    <figure
      className="pub-recibo"
      aria-label="Exemplo ilustrativo de recibo de custódia"
      style={
        FRENTE_2_MESCLADA
          ? ({ '--moldura': `url(${MOLDURA_GUILLOCHE})`, '--selo': `url(${SELO_PERICIA})` } as CSSProperties)
          : undefined
      }
    >
      <div className="pub-recibo-topo">
        <span className="pub-recibo-tipo">Recibo de custódia</span>
        <span className="pub-recibo-status pub-carimbo">Guardada</span>
      </div>
      <dl className="pub-recibo-campos">
        <div className="pub-recibo-largo">
          <dt>Moeda</dt>
          <dd>{DH?.key ?? 'Direitos Humanos'} · {DH?.anoPadrao ?? 1998}</dd>
        </div>
        <div>
          <dt>Tiragem</dt>
          <dd>{DH?.tiragem ?? '—'}</dd>
        </div>
        <div>
          <dt>Peso de referência</dt>
          <dd>{gramas(DH?.pesoPadraoMg)}</dd>
        </div>
        <div>
          <dt>Guarda</dt>
          <dd>Cofre Sicoob</dd>
        </div>
        <div>
          <dt>Titular</dt>
          <dd>Você</dd>
        </div>
      </dl>
      <figcaption className="pub-recibo-pe">
        <span className="pub-recibo-qr" aria-hidden="true" />
        <span>Exemplo ilustrativo · código simulado</span>
      </figcaption>
    </figure>
  )
}
