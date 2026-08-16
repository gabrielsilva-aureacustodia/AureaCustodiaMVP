import type { ReactElement } from 'react'

import { buildQr } from '@/lib/charts'

/**
 * Pseudo-QR do recibo de custódia (aurea-mvp-teste.html, linhas 1819-1832).
 *
 * É um padrão VISUAL, não escaneável: o desenho sai de um PRNG semeado pela
 * string recebida (ver `buildQr`), o que garante que o mesmo recibo desenhe o
 * mesmo código sempre — no servidor e no cliente, hoje e daqui a um ano.
 *
 * O selo "Código simulado" não é decoração nem placeholder: é decisão de
 * negócio. Não existe blockchain por trás deste recibo e a interface nunca
 * pode sugerir que exista uma verificação externa. Não remova o rótulo.
 */

/** Tinta do padrão. Fica escura nos dois temas: o certificado é papel creme. */
const TINTA = 'var(--qr-ink)'
/** Papel do certificado — token do projeto, mesmo valor do MVP (#f5f0e4). */
const PAPEL = 'var(--cream)'

export interface QrCodeProps {
  /** Semente determinística. No certificado: `nft.codigo + nft.hash`. */
  seed: string
  /** Lado do quadrado, em px. O certificado usa 78. */
  size?: number
}

export function QrCode({ seed, size = 78 }: QrCodeProps): ReactElement {
  const qr = buildQr(seed, size)

  return (
    <div>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ background: PAPEL, borderRadius: 4 }}
        role="img"
        aria-label="Código simulado do recibo de custódia"
      >
        {qr.rects.map((r, i) => (
          <rect
            key={`qr-${i}`}
            x={r.x}
            y={r.y}
            width={r.size}
            height={r.size}
            fill={r.ink ? TINTA : PAPEL}
          />
        ))}
      </svg>
      <div className="qr-note">Código simulado</div>
    </div>
  )
}
