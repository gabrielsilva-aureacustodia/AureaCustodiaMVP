/* ============================================================================
 * AS CAIXAS CADASTRADAS, PARA QUEM GRAVA A ANÁLISE — somente servidor.
 *
 * O cadastro de moeda (direto, sem envio e a bancada) decide em que caixa e posição a moeda
 * fica a partir das caixas cadastradas e do que já ocupa cada uma — ver `alocarNasCaixas` em
 * src/domain/admin/caixas.ts. Este arquivo só LÊ o catálogo.
 *
 * Fica fora de src/server/admin/portas.ts de propósito: lá se importa `fecharAnalise`, e
 * `fecharAnalise` importa daqui — o laço seria circular.
 *
 * Falha de leitura, banco ausente ou tabela ainda não migrada devolvem lista vazia, e lista
 * vazia significa "sem regra de caixa": a moeda nasce com o que foi digitado, como sempre foi.
 * Moeda que já está na bancada não pode deixar de nascer porque o catálogo de caixas não
 * respondeu.
 * ==========================================================================*/

import 'server-only'

import type { CaixaCadastrada } from '@/domain/admin/caixas'
import { bancoConfigurado, executarNoBanco } from '@/server/db/client'
import { tabelaExiste } from '@/server/db/repositories/painel-leituras'
import { listarCaixas } from '@/server/db/repositories/caixas'

export async function carregarCaixasParaAlocar(): Promise<CaixaCadastrada[]> {
  if (!bancoConfigurado()) return []
  try {
    return await executarNoBanco(async (tx) => ((await tabelaExiste(tx, 'caixas')) ? listarCaixas(tx) : []), { somenteLeitura: true })
  } catch (err) {
    console.error('[caixas] o catálogo de caixas não leu; a moeda segue com a caixa digitada:', err)
    return []
  }
}
