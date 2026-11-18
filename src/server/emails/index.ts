/* ============================================================================
 * ATENÇÃO — MÓDULO EXCLUSIVO DE SERVIDOR.
 * ==========================================================================*/

import 'server-only'

/**
 * A porta de entrada da central de e-mails de movimentação (frente C, 17/11/2026).
 *
 * O contrato que outras frentes usam, e só ele:
 *  - `avisarSeguranca({ tipo, para })` — a frente A, depois de trocar senha ou e-mail.
 *  - `avisarRetiradaPostada(id)` — quem move a retirada para `postada` (rastreio diário, painel de logística).
 *  - `despacharEmailsPendentes()` — o cron, para reforçar o reenvio.
 *
 * O resto (derivação, fila, modelos) é interno: o gancho único de `mutarEstado` importa direto dos arquivos
 * puros, e não por aqui, porque `src/server/db/estado.ts` não carrega `server-only`.
 */
export { avisarRetiradaPostada, avisarSeguranca, type PedidoDeAvisoDeSeguranca } from './avisos'
export { despacharEmailsPendentes } from './despacho'
