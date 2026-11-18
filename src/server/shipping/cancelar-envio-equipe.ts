/* ============================================================================
 * ATENÇÃO — MÓDULO EXCLUSIVO DE SERVIDOR.
 *
 * O cancelamento de envio feito pela EQUIPE (frente H, 17/11/2026): a ordem de `cancelarEnvioNoServidor` mais a
 * trilha `admin.logistica.cancelar_envio` em `audit_log`. É o mesmo gesto por duas portas — o painel de
 * logística e o "Cancelar validação" da bancada —, então a trilha vive aqui, uma vez, e cada porta só confere a
 * permissão dela (`logistica.expedir` × `bancada.analisar`) ANTES de chamar.
 *
 * NÃO É `'use server'` DE PROPÓSITO: todo export de arquivo `'use server'` vira endpoint, e esta função devolve
 * dinheiro ao saldo de qualquer conta sem conferir permissão. Quem confere é o chamador.
 * ==========================================================================*/

import 'server-only'

import type { MembroAdmin } from '@/domain/admin/permissoes'
import type { ActionResult, Cents, UserEmail } from '@/domain/types'
import { registrarAcaoAdmin } from '@/server/admin/auditar'
import { bancoConfigurado, executarNoBanco } from '@/server/db/client'

import { cancelarEnvioNoServidor, type SituacaoDaEtiqueta } from './cancelar-envio'

/** Por onde a equipe entrou. Muda a permissão; a trilha é a mesma e registra a porta em `detalhes.via`. */
export type ViaDoCancelamento = 'logistica' | 'bancada'

export interface DadosDoCancelamentoDaEquipe {
  protocolo: string
  titular: UserEmail
  freteEstornadoCents: Cents
  /** Frete pago que NÃO voltou porque o pacote já tinha sido postado (D-H1). */
  freteRetidoCents: Cents
  primeiroMesEstornadoCents: Cents
  totalAoSaldoCents: Cents
  etiqueta: SituacaoDaEtiqueta
  /** Já estava cancelado: nada foi devolvido de novo. */
  jaCancelado: boolean
  /** A nota do 1º mês é de outro mês — o contador pede o cancelamento dentro do mês. */
  avisoDoMes: string | null
}

export interface PedidoDaEquipe {
  membro: MembroAdmin
  via: ViaDoCancelamento
  protocolo: string
  motivo: string
}

export async function cancelarEnvioPelaEquipe(p: PedidoDaEquipe): Promise<ActionResult<DadosDoCancelamentoDaEquipe>> {
  const protocolo = typeof p.protocolo === 'string' ? p.protocolo.trim() : ''
  if (!protocolo) return { ok: false, error: 'Envio não informado.' }

  const r = await cancelarEnvioNoServidor({ protocolo, por: 'equipe', motivo: p.motivo })
  if (!r.ok) return { ok: false, error: r.erro }

  const { resumo } = r
  const dados: DadosDoCancelamentoDaEquipe = {
    protocolo,
    titular: r.titular,
    freteEstornadoCents: resumo.freteEstornadoCents,
    freteRetidoCents: resumo.freteRetidoCents,
    primeiroMesEstornadoCents: resumo.primeiroMesEstornadoCents,
    totalAoSaldoCents: resumo.totalAoSaldoCents,
    etiqueta: r.etiqueta,
    jaCancelado: r.jaCancelado,
    avisoDoMes: resumo.avisoDoMes,
  }

  // Segundo clique, ou outra mão que já cancelou: não houve ação nova, então não há o que registrar.
  if (!r.jaCancelado) {
    await auditar(p.membro, p.via, resumo.motivo, dados, resumo.faturaIds, resumo.planoIds, resumo.jaPostado)
  }
  return { ok: true, message: r.mensagem, data: dados }
}

/**
 * Trilha da equipe. Gravada DEPOIS da ação e sem desfazê-la se falhar — a regra de todo arquivo de ações do
 * painel: o dinheiro já voltou e a nota já foi pedida, e o cancelamento fica de qualquer jeito nos campos do
 * próprio `Envio` (quem, quando, por quê). O que NÃO se grava aqui é nenhum dado pessoal além do e-mail do titular
 * em `usuariosAfetados`, que é o campo feito para isso.
 */
async function auditar(
  membro: MembroAdmin,
  via: ViaDoCancelamento,
  motivo: string,
  dados: DadosDoCancelamentoDaEquipe,
  faturaIds: readonly string[],
  planoIds: readonly string[],
  jaPostado: boolean,
): Promise<void> {
  if (!bancoConfigurado()) return
  try {
    await executarNoBanco((tx) =>
      registrarAcaoAdmin(tx, {
        ator: membro.email,
        area: 'logistica',
        verbo: 'cancelar_envio',
        entidade: 'envio',
        entidadeId: dados.protocolo,
        usuariosAfetados: [dados.titular],
        detalhes: {
          ok: true,
          via,
          motivo,
          jaPostado,
          freteEstornadoCents: dados.freteEstornadoCents,
          freteRetidoCents: dados.freteRetidoCents,
          primeiroMesEstornadoCents: dados.primeiroMesEstornadoCents,
          totalAoSaldoCents: dados.totalAoSaldoCents,
          faturas: faturaIds,
          planos: planoIds,
          etiqueta: dados.etiqueta,
        },
      }),
    )
  } catch (err) {
    console.error('[admin] falha ao gravar a trilha do cancelamento de envio:', err)
  }
}
