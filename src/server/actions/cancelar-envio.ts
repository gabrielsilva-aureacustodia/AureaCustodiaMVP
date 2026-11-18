'use server'

/**
 * Server Action do CLIENTE: cancelar um envio ainda não postado (frente H, 17/11/2026).
 *
 * Só esta função mora aqui. Todo export de arquivo `'use server'` vira endpoint HTTP, e a ordem do
 * cancelamento (Correios → cartão → estado → etiqueta) fica em `src/server/shipping/cancelar-envio.ts`,
 * que NÃO é `'use server'` justamente para não expor, a quem quer que seja, uma função que devolve dinheiro
 * ao saldo de qualquer conta. O que impede um cliente de cancelar o envio de outro está aqui: a sessão
 * decide quem é o dono e o protocolo de outra conta responde "não encontrado".
 *
 * O cliente só cancela envio ainda em "Protocolo gerado": pacote postado, em análise ou já virado moeda
 * são recusados pela regra do domínio (`recusaDoCancelamento`). Postado, o caminho é o atendimento.
 */

import type { ActionResult, Cents } from '@/domain/types'
import { getSessionEmail } from '@/server/session'
import { cancelarEnvioNoServidor, type SituacaoDaEtiqueta } from '@/server/shipping/cancelar-envio'

const SESSAO_EXPIRADA = 'Sessão expirada.'

export interface DadosDoEnvioCancelado {
  protocolo: string
  /** Frete que voltou ao saldo. */
  freteEstornadoCents: Cents
  /** 1º mês de custódia pago que voltou ao saldo. */
  primeiroMesEstornadoCents: Cents
  /** Tudo que entrou de volta no saldo. */
  totalAoSaldoCents: Cents
  etiqueta: SituacaoDaEtiqueta
  /** Já estava cancelado: nada foi devolvido de novo (duplo clique, ou o rastreio e a tela ao mesmo tempo). */
  jaCancelado: boolean
}

export async function cancelarMeuEnvio(
  protocolo: string,
  motivo: string,
): Promise<ActionResult<DadosDoEnvioCancelado>> {
  const session = await getSessionEmail()
  if (!session) return { ok: false, error: SESSAO_EXPIRADA }
  if (typeof protocolo !== 'string' || protocolo.trim() === '') return { ok: false, error: 'Envio não encontrado.' }

  const r = await cancelarEnvioNoServidor({ protocolo: protocolo.trim(), por: 'cliente', motivo, donoEsperado: session })
  if (!r.ok) return { ok: false, error: r.erro }

  return {
    ok: true,
    message: r.mensagem,
    data: {
      protocolo: r.resumo.protocolo,
      freteEstornadoCents: r.resumo.freteEstornadoCents,
      primeiroMesEstornadoCents: r.resumo.primeiroMesEstornadoCents,
      totalAoSaldoCents: r.resumo.totalAoSaldoCents,
      etiqueta: r.etiqueta,
      jaCancelado: r.jaCancelado,
    },
  }
}
