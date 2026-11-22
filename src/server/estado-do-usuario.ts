/**
 * Servidor — entrega a VISÃO do estado de um cliente (B01, 22/11/2026). A regra mora em
 * `@/domain/estado-do-usuario`; aqui entra só o que exige segredo: o pseudônimo dos e-mails de terceiros.
 *
 * Pseudônimo = HMAC-SHA256 do e-mail com uma chave derivada de SESSION_SECRET, truncado. Sem a chave não se
 * volta ao e-mail nem se testa um palpite (um hash simples de e-mail se quebra por dicionário em segundos).
 * Estável entre requisições: o "mesmo vendedor" continua o mesmo para fila e pausa, sem ser identificável.
 */

import { createHmac } from 'node:crypto'

import { estadoDoUsuario } from '@/domain/estado-do-usuario'
import type { AppState, UserEmail } from '@/domain/types'

/**
 * Lê SESSION_SECRET direto do ambiente (e não de session-core, que só session.ts e o middleware podem importar —
 * barreira em session-core.test.ts). Em produção ela é obrigatória e a sessão já caiu antes de chegar aqui;
 * a constante só serve ao desenvolvimento local, onde pseudônimo previsível não protege nada de verdade.
 */
function segredoDoPseudonimo(): string {
  return process.env.SESSION_SECRET || 'pseudonimo-de-desenvolvimento'
}

export function pseudonimoDoEmail(email: UserEmail): string {
  const chave = createHmac('sha256', segredoDoPseudonimo()).update('estado-do-usuario:v1').digest()
  const h = createHmac('sha256', chave).update(email.trim().toLowerCase()).digest('hex')
  return `anon-${h.slice(0, 16)}`
}

export function visaoDoUsuario(state: AppState, email: UserEmail): AppState {
  return estadoDoUsuario(state, email, pseudonimoDoEmail)
}
