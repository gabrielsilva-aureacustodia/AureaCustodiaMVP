/**
 * Tipos compartilhados entre a Server Action de depósito e a tela que a chama.
 *
 * Vivem aqui, e não dentro de `src/server/actions/payments.ts`, porque um
 * arquivo `'use server'` só deve exportar funções assíncronas — é a mesma razão
 * pela qual `NotifKey` está declarada na tela em `AccountModals.tsx`.
 *
 * Sem `import 'server-only'` de propósito: não há segredo aqui, só formato, e o
 * Client Component precisa poder fazer `import type` sem arrastar servidor para
 * o bundle. Como são apenas tipos, a importação some na compilação.
 */

import type { Cents } from '@/domain/types'

/** Forma de pagamento escolhida na tela de depósito. */
export type MetodoDeposito = 'pix' | 'checkout_pro'

/** O que a tela precisa mostrar depois de a cobrança ser aberta no gateway. */
export interface DepositoIniciado {
  metodo: MetodoDeposito
  /** A referência que liga esta cobrança à conta a creditar. */
  externalReference: string
  valorCents: Cents
  /** Pix: o código copia e cola. */
  qrCode?: string
  /** Pix: a imagem do QR, em base64. */
  qrCodeBase64?: string
  /** Checkout Pro: para onde mandar o navegador. */
  initPoint?: string
}
