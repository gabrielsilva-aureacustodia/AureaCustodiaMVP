/* ============================================================================
 * ATENÇÃO — MÓDULO EXCLUSIVO DE SERVIDOR.
 *
 * Lê e grava os interruptores de /admin/features (ver src/domain/admin/features.ts). Os valores
 * moram em `aurea.config_plataforma`, com a chave `feature.<nome>`.
 *
 * FALHA DE LEITURA NÃO DERRUBA NADA. Sem banco, sem a tabela ou com o banco oscilando, vale o
 * PADRÃO do código — o mesmo desenho de `carregar.ts` (RA-47). Sem cópia em memória: em serverless
 * duas requisições caem em processos diferentes, e uma cópia guardada serviria interruptor velho.
 * ==========================================================================*/

import 'server-only'

import {
  chaveNoBanco,
  definicaoDeFeature,
  featuresPadrao,
  featuresVigentes,
  PREFIXO_FEATURE,
  type FeaturesVigentes,
} from '@/domain/admin/features'
import { registrarAcaoAdmin } from '@/server/admin/auditar'
import { bancoConfigurado, executarNoBanco } from '@/server/db/client'
import { gravarConfiguracao, inserirHistoricoConfig, lerConfiguracao } from '@/server/db/repositories/config'
import { tabelaExiste } from '@/server/db/repositories/painel-leituras'

export async function carregarFeatures(): Promise<FeaturesVigentes> {
  if (!bancoConfigurado()) return featuresPadrao()
  try {
    return await executarNoBanco(
      async (tx) => {
        if (!(await tabelaExiste(tx, 'config_plataforma'))) return featuresPadrao()
        const gravados = await lerConfiguracao(tx)
        const brutos: Record<string, unknown> = {}
        for (const [k, g] of Object.entries(gravados)) if (k.startsWith(PREFIXO_FEATURE)) brutos[k] = g.valor
        return featuresVigentes(brutos)
      },
      { somenteLeitura: true },
    )
  } catch (err) {
    console.error('[features] falha ao ler os interruptores; valendo o padrão do código:', err)
    return featuresPadrao()
  }
}

export async function featureLigada(chave: string): Promise<boolean> {
  const f = await carregarFeatures()
  return f[chave] ?? definicaoDeFeature(chave)?.padrao ?? false
}

export type ResultadoDaTroca = { ok: true; ligada: boolean; mudou: boolean } | { ok: false; erro: string }

/** Liga ou desliga uma feature, com histórico e trilha de auditoria (`admin.features.<chave>`). */
export async function alternarFeature(ator: string, chave: string, ligada: boolean, agora: number = Date.now()): Promise<ResultadoDaTroca> {
  const def = definicaoDeFeature(chave)
  if (!def) return { ok: false, erro: 'Feature desconhecida.' }
  if (!bancoConfigurado()) return { ok: false, erro: 'Sem banco configurado neste ambiente: o interruptor não tem onde ser gravado.' }
  return executarNoBanco(async (tx) => {
    if (!(await tabelaExiste(tx, 'config_plataforma'))) {
      return { ok: false as const, erro: 'O banco ainda não tem a tabela de configuração. Rode npm run db:migrate.' }
    }
    const gravados = await lerConfiguracao(tx)
    const brutos: Record<string, unknown> = {}
    for (const [k, g] of Object.entries(gravados)) brutos[k] = g.valor
    const antes = featuresVigentes(brutos)[chave] ?? def.padrao
    if (antes === ligada && chaveNoBanco(chave) in gravados) return { ok: true as const, ligada, mudou: false }
    await gravarConfiguracao(tx, {
      chave: chaveNoBanco(chave),
      valor: ligada ? 1 : 0,
      tipo: 'inteiro',
      rotulo: def.rotulo,
      descricao: def.descricao,
      agora,
      ator,
    })
    await inserirHistoricoConfig(tx, { chave: chaveNoBanco(chave), valorAntigo: antes ? 1 : 0, valorNovo: ligada ? 1 : 0, ator, agora })
    await registrarAcaoAdmin(tx, {
      ator,
      area: 'features',
      verbo: 'alternar',
      entidade: 'feature',
      entidadeId: chave,
      detalhes: { antes, depois: ligada },
      agora,
    })
    return { ok: true as const, ligada, mudou: antes !== ligada }
  })
}
