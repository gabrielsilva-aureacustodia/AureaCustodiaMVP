/* ============================================================================
 * ATENÇÃO — MÓDULO EXCLUSIVO DE SERVIDOR.
 *
 * Lê a configuração do site do banco. Não importe de Client Component: o
 * cliente recebe os valores prontos pelo layout e por /api/state.
 * ==========================================================================*/

import 'server-only'

import { catalogoDasLinhas, type TipoMoedaGravado } from '@/domain/admin/catalogo'
import {
  canaisDe,
  operacionalDe,
  tabelaDeTaxasDe,
  termosDe,
  valoresVigentes,
  type CanaisDeAtendimento,
  type ConfigDoCliente,
  type ParametrosDosTermos,
  type ParametrosOperacionais,
  type ValoresConfig,
} from '@/domain/admin/configuracao'
import type { TabelaDeTaxas } from '@/domain/fees'
import type { CoinType } from '@/domain/types'
import { bancoConfigurado, executarNoBanco } from '@/server/db/client'
import { lerConfiguracao, listarTiposMoeda, type ConfigGravada } from '@/server/db/repositories/config'
import { tabelaExiste } from '@/server/db/repositories/painel-leituras'

/**
 * A configuração vigente do site — taxas, parâmetros operacionais, parâmetros dos Termos, canais de
 * atendimento e catálogo de moedas (frente C, C3).
 *
 * UMA LEITURA, TUDO JUNTO. Quem precisa de um pedaço chama a função do pedaço, e ela lê o conjunto
 * numa transação curta de três consultas. Não há cópia em memória entre requisições: em serverless,
 * duas requisições caem em processos diferentes e uma cópia guardada viraria taxa velha — o mesmo
 * motivo de o `AppState` não ser guardado (src/server/state.ts).
 *
 * FALHA DE LEITURA NÃO DERRUBA O SITE. Sem banco, antes da migration 024 ou com o banco oscilando, a
 * configuração volta ao padrão do código — que é exatamente o que a plataforma cobrava até a C3 — e o
 * erro vai para o log. Uma tela de mercado que não abre porque a tabela de taxas não respondeu seria
 * pior do que cobrar a tabela padrão por um minuto.
 */

export interface ConfiguracaoDoSite {
  valores: ValoresConfig
  gravados: Record<string, ConfigGravada>
  taxas: TabelaDeTaxas
  operacional: ParametrosOperacionais
  termos: ParametrosDosTermos
  canais: CanaisDeAtendimento
  catalogo: CoinType[]
  /** As linhas de `tipos_moeda`; `null` sem banco ou sem a tabela. Vazio = ainda não semeada. */
  tipos: TipoMoedaGravado[] | null
  /** De onde veio: 'banco', 'padrao' (sem banco ou sem tabela) ou 'falha' (leitura deu erro). */
  origem: 'banco' | 'padrao' | 'falha'
}

function montar(gravados: Record<string, ConfigGravada>, tipos: TipoMoedaGravado[] | null, origem: ConfiguracaoDoSite['origem']): ConfiguracaoDoSite {
  const brutos: Record<string, unknown> = {}
  for (const [chave, g] of Object.entries(gravados)) brutos[chave] = g.valor
  const valores = valoresVigentes(brutos)
  return {
    valores,
    gravados,
    taxas: tabelaDeTaxasDe(valores),
    operacional: operacionalDe(valores),
    termos: termosDe(valores),
    canais: canaisDe(valores),
    catalogo: catalogoDasLinhas(tipos ?? []),
    tipos,
    origem,
  }
}

export async function carregarConfiguracaoDoSite(): Promise<ConfiguracaoDoSite> {
  if (!bancoConfigurado()) return montar({}, null, 'padrao')
  try {
    return await executarNoBanco(
      async (tx) => {
        if (!(await tabelaExiste(tx, 'config_plataforma'))) return montar({}, null, 'padrao')
        const [gravados, tipos] = await Promise.all([lerConfiguracao(tx), listarTiposMoeda(tx)])
        return montar(gravados, tipos, 'banco')
      },
      { somenteLeitura: true },
    )
  } catch (err) {
    console.error('[config] leitura da configuração falhou; valendo o padrão do código:', err)
    return montar({}, null, 'falha')
  }
}

/** O que as regras de mercado, custódia e conta precisam: a tabela de taxas, o catálogo e os limites. */
export interface RegrasDoMercado {
  taxas: TabelaDeTaxas
  catalogo: CoinType[]
  depositoMaxCents: number
}

export async function carregarRegrasDoMercado(): Promise<RegrasDoMercado> {
  const c = await carregarConfiguracaoDoSite()
  return { taxas: c.taxas, catalogo: c.catalogo, depositoMaxCents: c.operacional.depositoMaxCents }
}

export async function carregarTabelaDeTaxasVigente(): Promise<TabelaDeTaxas> {
  return (await carregarConfiguracaoDoSite()).taxas
}

export async function carregarParametrosOperacionais(): Promise<ParametrosOperacionais> {
  return (await carregarConfiguracaoDoSite()).operacional
}

export async function carregarCatalogo(): Promise<CoinType[]> {
  return (await carregarConfiguracaoDoSite()).catalogo
}

export async function carregarCanaisDeAtendimento(): Promise<CanaisDeAtendimento> {
  return (await carregarConfiguracaoDoSite()).canais
}

/** O que o app do cliente precisa da configuração: vai no layout e em /api/state. */
export function configDoCliente(c: ConfiguracaoDoSite): ConfigDoCliente {
  return { taxas: c.taxas, catalogo: c.catalogo, depositoMaxCents: c.operacional.depositoMaxCents, syncMs: c.operacional.syncMs }
}
