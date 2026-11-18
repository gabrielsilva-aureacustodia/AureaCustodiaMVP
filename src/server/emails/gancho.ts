/**
 * O gancho de `mutarEstado`: da diferença entre `antes` e `depois` à fila de e-mails, DENTRO da transação.
 *
 * Fica num arquivo próprio, e não solto em `estado.ts`, por um motivo só: a frase "falha de e-mail nunca derruba
 * a operação" precisa valer aqui dentro da transação do dinheiro, onde um erro de SQL aborta TUDO. Duas redes:
 *
 *  1. A derivação (`eventosDeEmail`) roda em `try/catch`: um defeito nela vira log, e a mutação segue.
 *  2. A gravação na fila roda dentro de um SAVEPOINT. Se ela falhar — o caso real é a migration 053 ainda não
 *     aplicada no banco do ambiente —, só o savepoint volta atrás; a negociação, o ledger e as NFS-e que já
 *     estavam na transação commitam normalmente. Sem isto, subir o código antes da migration travaria TODA
 *     mutação do site.
 *
 * Sem `server-only` (como `estado.ts`, que o importa): aqui não há segredo, só SQL parametrizada pela `Consulta`.
 */

import type { AppState } from '@/domain/types'
import type { Consulta } from '@/server/db/sql'

import { eventosDeEmail } from './eventos'
import { enfileirarEmails } from './fila'
import type { EventoDeEmail } from './tipos'

/** Deriva os e-mails da mutação e os grava na fila. Devolve quantos ENTRARAM (evento repetido não conta). */
export async function pedirEmailsDaMutacao(tx: Consulta, antes: AppState, depois: AppState, agora: number): Promise<number> {
  let eventos: EventoDeEmail[]
  try {
    eventos = eventosDeEmail(antes, depois, agora)
  } catch (err) {
    console.error('[aurea] e-mails: a derivação dos eventos falhou; a operação segue sem aviso:', err)
    return 0
  }
  if (eventos.length === 0) return 0

  await tx.query('SAVEPOINT emails_fila')
  try {
    const entraram = await enfileirarEmails(tx, eventos, agora)
    await tx.query('RELEASE SAVEPOINT emails_fila')
    return entraram
  } catch (err) {
    await tx.query('ROLLBACK TO SAVEPOINT emails_fila')
    console.error('[aurea] e-mails: não consegui gravar a fila (migration 053 aplicada?); a operação segue sem aviso:', err)
    return 0
  }
}
