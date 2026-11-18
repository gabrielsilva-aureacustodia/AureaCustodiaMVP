/**
 * Tipos do envio de e-mail transacional.
 *
 * Vivem separados do `index.ts` porque lá tem `import 'server-only'`, e uma
 * tela que precise do formato da mensagem não pode arrastar o servidor para o
 * bundle. Como são só tipos, a importação some na compilação — é o mesmo
 * arranjo de `src/server/payments/tipos.ts`.
 */

export interface MensagemDeEmail {
  /** Destinatário. Uma pessoa por envio: nada de cópia oculta em massa. */
  para: string
  assunto: string
  /** Corpo em texto puro. É o que todo cliente de e-mail lê. */
  texto: string
  /** Corpo em HTML, opcional. Sem ele, o provedor manda só o texto. */
  html?: string
  /**
   * Identidade do evento que originou este e-mail (frente C, 17/11/2026). O Resend a recebe no cabeçalho
   * `Idempotency-Key`: se o servidor mandou e caiu antes de anotar, a repetição com a mesma chave não gera um
   * segundo e-mail. É uma camada EXTRA — a garantia de não duplicar é a chave única da fila
   * (src/server/emails/fila.ts). Ausente = sem proteção do provedor, como era antes.
   */
  idempotencyKey?: string
}

export interface ResultadoDeEnvio {
  ok: boolean
  /** Identificador do provedor, quando há. */
  id?: string
  erro?: string
  /**
   * true quando não havia provedor configurado e a mensagem foi apenas
   * registrada. A tela usa isso para não prometer que o e-mail saiu.
   */
  simulado?: boolean
}

export interface ProvedorDeEmail {
  /** Nome para diagnóstico e para a tela do painel. */
  readonly nome: string
  /** Variáveis que faltam para este provedor funcionar. Vazio = pronto. */
  readonly faltando: readonly string[]
  enviar(m: MensagemDeEmail): Promise<ResultadoDeEnvio>
}
