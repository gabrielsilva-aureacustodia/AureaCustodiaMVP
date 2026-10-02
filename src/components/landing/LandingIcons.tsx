/**
 * Ícones SVG da landing pública do Real Olímpico.
 *
 * Desenhados sob medida com traço nítido, 24x24 viewBox, stroke currentColor,
 * vectorEffect="non-scaling-stroke", acessíveis (aria-hidden="true") e sem
 * dependência de bibliotecas externas (0 KB JS).
 */

import type { ReactNode } from 'react'

interface IconProps {
  className?: string
}

/** Ícone de cofre / custódia física reforçada */
export function VaultIcon({ className }: IconProps): ReactNode {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" vectorEffect="non-scaling-stroke" />
      <circle cx="12" cy="12" r="4" vectorEffect="non-scaling-stroke" />
      <path d="M12 8v1.5" vectorEffect="non-scaling-stroke" />
      <path d="M12 14.5V16" vectorEffect="non-scaling-stroke" />
      <path d="M8 12h1.5" vectorEffect="non-scaling-stroke" />
      <path d="M14.5 12H16" vectorEffect="non-scaling-stroke" />
      <circle cx="17.5" cy="6.5" r=".75" fill="currentColor" />
      <circle cx="17.5" cy="17.5" r=".75" fill="currentColor" />
    </svg>
  )
}

/** Ícone de recibo lastreado / certificado com selo */
export function ReceiptIcon({ className }: IconProps): ReactNode {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16l3-1.5 3 1.5 3-1.5 3 1.5 3-1.5 3 1.5V8z" vectorEffect="non-scaling-stroke" />
      <path d="M14 2v6h6" vectorEffect="non-scaling-stroke" />
      <path d="M8 13h8" vectorEffect="non-scaling-stroke" />
      <path d="M8 17h5" vectorEffect="non-scaling-stroke" />
      <circle cx="16" cy="16" r="2.5" stroke="currentColor" fill="none" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

/** Ícone de marketplace / negociação entre colecionadores */
export function MarketTradeIcon({ className }: IconProps): ReactNode {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M7 10h14l-3-3" vectorEffect="non-scaling-stroke" />
      <path d="M17 14H3l3 3" vectorEffect="non-scaling-stroke" />
      <circle cx="6" cy="10" r="2" vectorEffect="non-scaling-stroke" />
      <circle cx="18" cy="14" r="2" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

/** Ícone de lingotes / reserva de valor / patrimônio tangível */
export function ValueReserveIcon({ className }: IconProps): ReactNode {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 17l3-7h12l3 7H3z" vectorEffect="non-scaling-stroke" />
      <path d="M6 10l2-4h8l2 4" vectorEffect="non-scaling-stroke" />
      <path d="M5.5 17L8 12" vectorEffect="non-scaling-stroke" />
      <path d="M18.5 17L16 12" vectorEffect="non-scaling-stroke" />
      <path d="M12 6v4" vectorEffect="non-scaling-stroke" />
      <path d="M12 12v5" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

/** Ícone de coleção / desafio do colecionador (moedas guardadas em domicílio) */
export function CollectorBoxIcon({ className }: IconProps): ReactNode {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" vectorEffect="non-scaling-stroke" />
      <path d="m3.3 7 8.7 5 8.7-5" vectorEffect="non-scaling-stroke" />
      <path d="M12 22V12" vectorEffect="non-scaling-stroke" />
      <circle cx="12" cy="7" r="1.5" fill="currentColor" />
    </svg>
  )
}

/** Ícone de solução institucional / cofre com auditoria */
export function ShieldVaultIcon({ className }: IconProps): ReactNode {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" vectorEffect="non-scaling-stroke" />
      <circle cx="12" cy="11" r="3" vectorEffect="non-scaling-stroke" />
      <path d="M12 14v2" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

/** Ícone de carro forte / transporte de alta segurança */
export function ArmoredCarIcon({ className }: IconProps): ReactNode {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 7a1 1 0 0 1 1-1h11a1 1 0 0 1 1 1v2l4 3v4a1 1 0 0 1-1 1h-1" vectorEffect="non-scaling-stroke" />
      <path d="M2 17h1" vectorEffect="non-scaling-stroke" />
      <path d="M7 17h6" vectorEffect="non-scaling-stroke" />
      <circle cx="5" cy="17" r="2" vectorEffect="non-scaling-stroke" />
      <circle cx="16" cy="17" r="2" vectorEffect="non-scaling-stroke" />
      <path d="M15 9h3.5l2.5 3H15z" vectorEffect="non-scaling-stroke" />
      <path d="M2 11h6" vectorEffect="non-scaling-stroke" />
      <path d="M2 14h4" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

/** Ícone de cofre bancário pesado */
export function BankVaultIcon({ className }: IconProps): ReactNode {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="2" y="4" width="20" height="16" rx="2" vectorEffect="non-scaling-stroke" />
      <circle cx="12" cy="12" r="5" vectorEffect="non-scaling-stroke" />
      <circle cx="12" cy="12" r="2" vectorEffect="non-scaling-stroke" />
      <path d="M12 7v1" vectorEffect="non-scaling-stroke" />
      <path d="M12 16v1" vectorEffect="non-scaling-stroke" />
      <path d="M7 12h1" vectorEffect="non-scaling-stroke" />
      <path d="M16 12h1" vectorEffect="non-scaling-stroke" />
      <path d="M2 8h1" vectorEffect="non-scaling-stroke" />
      <path d="M2 16h1" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

/** Ícone de lacre / intocado após avaliação pericial */
export function UntouchedSealIcon({ className }: IconProps): ReactNode {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="5" y="11" width="14" height="10" rx="2" vectorEffect="non-scaling-stroke" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" vectorEffect="non-scaling-stroke" />
      <circle cx="12" cy="16" r="1.5" fill="currentColor" />
      <path d="M12 2v2" vectorEffect="non-scaling-stroke" />
      <path d="M4 4l1.5 1.5" vectorEffect="non-scaling-stroke" />
      <path d="M20 4l-1.5 1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}
