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
  /**
   * true quando não há credencial do gateway no ambiente e a cobrança veio do
   * simulador. A tela usa isso para explicar em vez de abrir aba nenhuma —
   * ver a nota em `src/lib/payments/types.ts`.
   */
  simulado?: boolean
}

/** O que a tela de mercado precisa mostrar após abrir a cobrança de compra direta no gateway. */
export interface CompraDiretaIniciada extends DepositoIniciado {
  lotId: string
  qty: number
  tipoMoeda: string
}

/** Status de uma cobrança consultada pelo frontend (B1.6). */
export type StatusCobranca = 'pendente' | 'creditado' | 'recusado'

export interface StatusCobrancaInfo {
  status: StatusCobranca
  motivo?: string | null
}


/**
 * O que a tela mostra depois de registrada uma solicitação de depósito por Pix
 * direto — transferência para a chave da empresa, sem gateway no meio.
 *
 * Não há `qrCode` nem `initPoint`: não existe cobrança aberta em lugar nenhum.
 * O que o cliente recebe é a chave, o valor exato a transferir e a referência
 * que a equipe usa para conferir o extrato e liberar o saldo.
 */
export interface DepositoPixDireto {
  /** Referência gerada pela plataforma, colada pelo cliente na descrição do Pix. */
  referencia: string
  /** Chave Pix da empresa, para copiar e colar. */
  chavePix: string
  /** Nome que aparece no aplicativo do banco. */
  favorecido: string
  /** O que entra no saldo depois da conferência. */
  creditoCents: Cents
  /** A taxa fixa retida pela empresa. */
  taxaCents: Cents
  /** O valor exato a transferir: crédito + taxa. */
  totalCents: Cents
}
