/* ============================================================================
 * ATENÇÃO — MÓDULO EXCLUSIVO DE SERVIDOR.
 *
 * Liga o despacho (despachar.ts, que é puro e testável) ao banco real e ao provedor de e-mail real. É o único
 * arquivo do módulo que junta os dois; quem importa daqui roda no servidor.
 * ==========================================================================*/

import 'server-only'

import { enviarEmail } from '@/lib/email'
import { bancoConfigurado, executarNoBanco } from '@/server/db/client'

import { despacharAgora, despacharPendentes, type ResumoDoDespacho } from './despachar'
import type { EventoDeEmail } from './tipos'

const VAZIO: ResumoDoDespacho = { enviados: 0, simulados: 0, falhas: 0, expirados: 0 }

/**
 * Esvazia a fila de e-mails. É o contrato exportado para quem quer reforçar o reenvio (o cron diário, uma linha) —
 * a mutação seguinte também a esvazia. Sem banco configurado não há fila, e devolve vazio.
 */
export async function despacharEmailsPendentes(): Promise<ResumoDoDespacho> {
  if (!bancoConfigurado()) return VAZIO
  return despacharPendentes(executarNoBanco, enviarEmail)
}

/**
 * Ramo SEM banco (Redis/memória — só desenvolvimento): envia na hora, sem fila. Nunca lança; sem
 * `RESEND_API_KEY` o provedor cai no registro local e o texto aparece no log do servidor.
 * Na suíte (`NODE_ENV === 'test'`) não envia, pelo mesmo motivo de `agendarEnvioDeEmails`.
 */
export async function enviarSemFila(eventos: readonly EventoDeEmail[]): Promise<number> {
  if (eventos.length === 0 || process.env.NODE_ENV === 'test') return 0
  return despacharAgora(eventos, enviarEmail)
}
