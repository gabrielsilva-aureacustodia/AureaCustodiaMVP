/* ============================================================================
 * ATENÇÃO — MÓDULO EXCLUSIVO DE SERVIDOR.
 * ==========================================================================*/

import 'server-only'

import type { UserSettings } from '@/domain/types'
import { bancoConfigurado, executarNoBanco } from '@/server/db/client'
import { repositorioRetiradas } from '@/server/shipping/retiradas'
import { getState } from '@/server/state'

import { agendarEnvioDeEmails } from './agendar'
import { deveEnviar } from './catalogo'
import { enviarSemFila } from './despacho'
import { enfileirarEmails } from './fila'
import type { EventoDeEmail } from './tipos'

/**
 * Os avisos que NÃO nascem do diff do estado e por isso são chamados por quem faz a coisa acontecer.
 *
 * POR QUE EXISTEM. `eventosDeEmail` (eventos.ts) enxerga tudo que passa por `mutarEstado`. Dois fatos não passam:
 *  - A troca de senha e a de e-mail vão pelo Supabase Auth — nada muda no `AppState`.
 *  - A retirada mora em `aurea.retiradas` (repositório próprio) e nunca está no estado carregado.
 * Quem move essas coisas chama a função certa, em UMA linha, depois de o fato dar certo. A chave de idempotência
 * é a mesma do caminho do diff: chamar duas vezes (retry, job rodando de novo) não manda dois e-mails.
 *
 * NUNCA LANÇAM. Falha aqui (banco, provedor, estado) vira uma linha de log e a função volta: um aviso que não saiu
 * jamais pode desfazer a troca de senha ou travar a postagem de uma retirada.
 */

/** Grava na fila e agenda o envio; sem banco (só desenvolvimento), envia na hora. */
async function registrar(evento: EventoDeEmail): Promise<void> {
  if (bancoConfigurado()) {
    const entrou = await executarNoBanco((tx) => enfileirarEmails(tx, [evento], Date.now()))
    if (entrou > 0) agendarEnvioDeEmails()
    return
  }
  await enviarSemFila([evento])
}

/** O primeiro nome e as preferências do cliente; sem conta achada, o texto cai em "Olá." e vale o padrão. */
async function quemE(email: string): Promise<{ nome: string | null; settings: UserSettings | undefined }> {
  try {
    const conta = (await getState()).users[email]
    const nome = conta?.name?.trim().split(/\s+/)[0]
    return { nome: nome || null, settings: conta?.settings }
  } catch {
    return { nome: null, settings: undefined }
  }
}

export interface PedidoDeAvisoDeSeguranca {
  /** `senha`: a senha da conta mudou. `email`: o e-mail da conta mudou. A chave Pix NÃO entra aqui — vem do diff. */
  tipo: 'senha' | 'email'
  /** Para onde o aviso vai. Na troca de e-mail, o endereço ANTIGO (é quem pode perceber que não foi ele). */
  para: string
  /** Instante da troca. Padrão: agora. */
  quando?: number
}

/** Contrato com a frente A: uma linha, depois da troca dar certo. */
export async function avisarSeguranca(pedido: PedidoDeAvisoDeSeguranca): Promise<void> {
  try {
    const quando = pedido.quando ?? Date.now()
    const { nome } = await quemE(pedido.para)
    const base = { chave: `seguranca-${pedido.tipo}:${pedido.para}:${quando}`, para: pedido.para } as const
    await registrar(
      pedido.tipo === 'senha'
        ? { ...base, tipo: 'seguranca_senha', dados: { nome, quando } }
        : { ...base, tipo: 'seguranca_email', dados: { nome, quando } },
    )
  } catch (err) {
    console.error('[emails] aviso de segurança não saiu:', err)
  }
}

/** Contrato com quem move a retirada (rastreio diário e postagem manual do painel): uma linha, depois de gravar. */
export async function avisarRetiradaPostada(retiradaId: string): Promise<void> {
  try {
    const retirada = await repositorioRetiradas().buscarPorId(retiradaId)
    // Só avisa de retirada que de fato saiu: chamada em hora errada não pode prometer uma postagem que não houve.
    if (!retirada || (retirada.status !== 'postada' && retirada.status !== 'entregue')) return
    const { nome, settings } = await quemE(retirada.userEmail)
    if (!deveEnviar('retirada_postada', settings)) return
    await registrar({
      chave: `retirada-postada:${retirada.id}`,
      tipo: 'retirada_postada',
      para: retirada.userEmail,
      dados: { nome, retiradaId: retirada.id, coinId: retirada.coinId, codigoRastreio: retirada.codigoRastreio ?? null },
    })
  } catch (err) {
    console.error('[emails] aviso de retirada postada não saiu:', err)
  }
}
