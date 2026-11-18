/* ============================================================================
 * ATENÇÃO — MÓDULO EXCLUSIVO DE SERVIDOR.
 *
 * A ordem do cancelamento de envio, com o I/O que a regra pura não pode ter: Correios e Mercado Pago.
 * Nada daqui pode chegar a um Client Component.
 *
 * NÃO É UM ARQUIVO `'use server'` DE PROPÓSITO. Todo export de arquivo `'use server'` vira endpoint HTTP, e
 * esta função devolve dinheiro ao saldo de qualquer conta que se passe a ela, sem conferir sessão nem
 * permissão. Quem confere é cada chamador, antes de tudo: `cancelarMeuEnvio` (dono da conta, em
 * actions/cancelar-envio.ts), `cancelarEnvioNoPainel` (logistica.expedir) e `cancelarValidacaoNoPainel`
 * (bancada.analisar), em actions/admin/.
 * ==========================================================================*/

import 'server-only'

import {
  cancelarEnvio,
  envioJaPostado,
  motivoValido,
  type QuemCancela,
  type ResumoCancelamento,
} from '@/domain/cancelar-envio'
import { envioCancelado, prePostagemAtiva } from '@/domain/envios'
import type { UserEmail } from '@/domain/types'
import { cancelarAssinaturaRecorrente } from '@/lib/payments'
import { correiosConfigurado } from '@/lib/shipping/cws/config'
import { cancelarPrePostagem, consultarPrePostagem } from '@/lib/shipping/cws/prepostagem'
import { getState, mutateState } from '@/server/state'

import { acaoParaStatusDaEtiqueta } from './frete-envio'

/**
 * A ORDEM (decisão da branch, 17/11/2026: consultar → cancelar a etiqueta → só então estornar — o padrão de
 * `cancelarEtiquetaRetirada`):
 *  1. a regra pura roda num retrato do estado, só para recusar cedo — sem I/O e sem gravar nada;
 *  2. etiqueta ativa num envio não postado: CONSULTA o status nos Correios e decide por ele, nunca pelo texto de
 *     erro do DELETE. 2 (pré-postado) e 7 (pendente) → DELETE; o DELETE aceito é a prova de que o pacote não foi
 *     postado. 4 (expirado) e 5 (cancelado) → sem DELETE, só se anota. 1 (pré-atendido: o cliente está no
 *     balcão), 3 (postado), 6 (estornado), sem status, sem resposta ou erro de rede ⇒ RECUSA sem alterar nada:
 *     na dúvida NÃO se desfaz um envio que pode estar a caminho. Se o DELETE passar e o resto falhar, a nova
 *     tentativa consulta, vê o status 5 e vai direto ao estorno;
 *  3. débito recorrente no cartão: cancelado no gateway ANTES de gravar. Marcar o plano cancelado e falhar
 *     no Mercado Pago deixaria o cartão sendo debitado todo mês, sem ninguém para notar;
 *  4. UMA `mutateState` com a guarda dupla dentro (o rastreio pode ter marcado a postagem no meio): saldo,
 *     frete, fatura, plano, envio e o `canceladaEm` da etiqueta mudam juntos — e é a transição da fatura paga
 *     para cancelada que cancela a NFS-e e lança o `estorno` no ledger, nessa mesma transação.
 *  Envio SEM etiqueta ativa (ou já postado, quando a equipe o cancela) pula os passos 2 e só estorna.
 */

export interface PedidoDeCancelamentoNoServidor {
  protocolo: string
  por: QuemCancela
  motivo: string
  /** Cliente: só o dono cancela. Painel da equipe: não se passa. */
  donoEsperado?: UserEmail
}

/** O que aconteceu com a etiqueta dos Correios. (Não existe mais "pendente": a etiqueta se cancela ANTES do estorno.) */
export type SituacaoDaEtiqueta = 'nao_havia' | 'cancelada'

export type ResultadoDoCancelamentoNoServidor =
  | {
      ok: true
      jaCancelado: boolean
      resumo: ResumoCancelamento
      mensagem: string
      etiqueta: SituacaoDaEtiqueta
      /** O titular do envio, para a trilha da equipe (`usuariosAfetados`). */
      titular: UserEmail
    }
  | { ok: false; erro: string }

export const FALHA_AO_CANCELAR = 'Falha ao cancelar o envio. Nada foi alterado — tente de novo em instantes.'

const SEM_CONFIRMACAO_DOS_CORREIOS =
  'Não foi possível confirmar nos Correios que o pacote ainda não foi postado. Nada foi alterado — tente de novo em instantes.'
const PACOTE_COM_OS_CORREIOS =
  'Os Correios indicam que este pacote já está em atendimento ou foi postado, então o envio não pode ser cancelado agora. Se já postou, a confirmação chega pelo rastreio; se não, tente de novo em instantes.'
const ETIQUETA_NAO_CANCELOU =
  'Os Correios não confirmaram o cancelamento da etiqueta, então o envio não foi cancelado. Nada foi devolvido — tente de novo em instantes.'
const FALHA_NO_CARTAO =
  'Não foi possível cancelar a cobrança recorrente no cartão agora. Nada foi alterado — tente de novo em alguns minutos ou fale com o atendimento.'

export async function cancelarEnvioNoServidor(pedido: PedidoDeCancelamentoNoServidor): Promise<ResultadoDoCancelamentoNoServidor> {
  const motivo = motivoValido(pedido.motivo)
  const base = { agora: Date.now(), por: pedido.por, motivo: motivo ?? '', donoEsperado: pedido.donoEsperado }

  // 1. Retrato do estado: a regra pura roda numa CÓPIA (ela muta) só para recusar cedo e dizer o que há
  // para desfazer. Nada é gravado aqui.
  const estado = await getState()
  const original = estado.envios.find((e) => e.protocolo === pedido.protocolo)
  const seco = cancelarEnvio(structuredClone(estado), pedido.protocolo, base)
  if (!seco.ok) return { ok: false, erro: seco.erro }
  if (!original) return { ok: false, erro: 'Envio não encontrado.' }
  const titular = original.userEmail
  if (seco.jaCancelado) {
    return { ok: true, jaCancelado: true, resumo: seco.resumo, mensagem: seco.mensagem, etiqueta: 'nao_havia', titular }
  }

  // 2. Os Correios, ANTES de qualquer dinheiro: a etiqueta ativa de um envio ainda não postado é consultada e,
  // se ainda vale, cancelada. O cancelamento aceito pelos Correios É a prova de que o pacote não foi postado —
  // estornar primeiro deixaria uma janela com o dinheiro devolvido e a etiqueta viva, e a Áurea paga o frete se
  // o pacote for postado nela (é a ordem de `cancelarEtiquetaRetirada`).
  const etiqueta = !envioCancelado(original) && !envioJaPostado(original) ? prePostagemAtiva(original) : null
  let etiquetaTratada = false
  if (etiqueta) {
    if (!correiosConfigurado()) return { ok: false, erro: SEM_CONFIRMACAO_DOS_CORREIOS }
    let status: number | null
    try {
      status = (await consultarPrePostagem(etiqueta.codigoObjeto))?.statusAtual ?? null
    } catch (err) {
      // Rede, timeout, 5xx: estado INCERTO. Não se estorna na dúvida; a repetição consulta de novo.
      console.error(`[cancelar-envio] situação da pré-postagem do ${pedido.protocolo} não leu:`, err)
      return { ok: false, erro: SEM_CONFIRMACAO_DOS_CORREIOS }
    }
    const acao = acaoParaStatusDaEtiqueta(status)
    if (acao === 'esperar') return { ok: false, erro: status === null ? SEM_CONFIRMACAO_DOS_CORREIOS : PACOTE_COM_OS_CORREIOS }
    if (acao === 'apagar') {
      // Se o DELETE passar e o resto falhar, a nova tentativa consulta, vê o status 5 e vai direto ao estorno.
      if (!(await cancelarSemLancar(etiqueta.id, pedido.protocolo))) return { ok: false, erro: ETIQUETA_NAO_CANCELOU }
    }
    // 'so_anotar' (4 expirado, 5 cancelado): já não vale, sem DELETE — só a anotação do `canceladaEm`, na transação.
    etiquetaTratada = true
  }

  // 3. O cartão, antes do banco.
  for (const assinaturaId of seco.resumo.assinaturaIds) {
    const r = await cancelarAssinaturaRecorrente(assinaturaId)
    if (!r.ok) {
      console.error(`[cancelar-envio] assinatura ${assinaturaId} do ${pedido.protocolo} não cancelou: ${r.error ?? 'sem detalhe'}`)
      return { ok: false, erro: FALHA_NO_CARTAO }
    }
  }

  // 4. A transação. A regra roda DE NOVO sobre o estado de verdade: o retrato acima é de antes das chamadas
  // de rede, e no meio delas o rastreio pode ter marcado a postagem ou outra mão ter cancelado.
  let resultado: Awaited<ReturnType<typeof gravar>>
  try {
    resultado = await gravar(pedido, base, seco.resumo.assinaturaIds, etiquetaTratada)
  } catch (err) {
    console.error(`[cancelar-envio] o cancelamento do ${pedido.protocolo} não gravou:`, err)
    return { ok: false, erro: FALHA_AO_CANCELAR }
  }
  if (!resultado.ok) return { ok: false, erro: resultado.erro }
  const { resumo, jaCancelado } = resultado
  let mensagem = resultado.mensagem
  if (jaCancelado) {
    return { ok: true, jaCancelado: true, resumo, mensagem, etiqueta: 'nao_havia', titular }
  }

  // A etiqueta já foi cancelada no passo 2 e o `canceladaEm` entrou na MESMA transação do estorno: não há mais
  // janela em que o dinheiro voltou e a etiqueta segue viva.
  let situacaoDaEtiqueta: SituacaoDaEtiqueta = 'nao_havia'
  if (etiquetaTratada) {
    situacaoDaEtiqueta = 'cancelada'
    mensagem += ' A etiqueta dos Correios foi cancelada: não use mais o rótulo impresso.'
  }

  return { ok: true, jaCancelado: false, resumo, mensagem, etiqueta: situacaoDaEtiqueta, titular }
}

async function gravar(
  pedido: PedidoDeCancelamentoNoServidor,
  base: { agora: number; por: QuemCancela; motivo: string; donoEsperado: UserEmail | undefined },
  assinaturaIds: readonly string[],
  etiquetaTratada: boolean,
) {
  const { result } = await mutateState((s) => {
    const r = cancelarEnvio(s, pedido.protocolo, base)
    if (r.ok && !r.jaCancelado) {
      // O gateway já cancelou: o plano deixa de guardar a assinatura, senão a tela a mostraria como ativa.
      if (assinaturaIds.length > 0) {
        for (const p of s.planosCustodia ?? []) {
          if (p.assinaturaId && assinaturaIds.includes(p.assinaturaId)) p.assinaturaId = null
        }
      }
      // Os Correios já cancelaram (ou já tinham cancelado/expirado) a etiqueta: anota na mesma transação.
      if (etiquetaTratada) {
        const e = s.envios.find((x) => x.protocolo === pedido.protocolo)
        if (e?.prePostagem && !e.prePostagem.canceladaEm) e.prePostagem = { ...e.prePostagem, canceladaEm: base.agora }
      }
    }
    return r
  })
  return result
}

async function cancelarSemLancar(id: string, protocolo: string): Promise<boolean> {
  try {
    await cancelarPrePostagem(id)
    return true
  } catch (err) {
    console.error(`[cancelar-envio] não cancelou a pré-postagem ${id} (${protocolo}):`, err)
    return false
  }
}

