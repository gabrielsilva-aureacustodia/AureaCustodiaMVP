/* ============================================================================
 * ATENÇÃO — MÓDULO EXCLUSIVO DE SERVIDOR.
 *
 * Decide qual versão de cada documento contratual está vigente, lendo o banco.
 * Não importe de Client Component.
 * ==========================================================================*/

import 'server-only'

import { documentoTabelaDeTaxas, documentoTermosDeUso } from '@/domain/admin/documentos'
import { DOCUMENTOS_VIGENTES, hashDoDocumento, textoCanonico } from '@/domain/documentos-legais'
import type { ChaveDocumento, DocumentoLegalEstruturado } from '@/domain/documentos-legais/types'
import { bancoConfigurado, executarNoBanco } from '@/server/db/client'
import { buscarUltimoAceitePorDocumento } from '@/server/db/repositories/aceites'
import { buscarDocumentoVigente } from '@/server/db/repositories/documentos'
import { tabelaExiste } from '@/server/db/repositories/painel-leituras'
import type { Consulta } from '@/server/db/sql'

import { carregarConfiguracaoDoSite, type ConfiguracaoDoSite } from './carregar'

/**
 * A versão vigente de cada documento contratual (frente C, C3).
 *
 * ATÉ A C3 O DOCUMENTO VIGENTE ERA O DO CÓDIGO. `DOCUMENTOS_VIGENTES` (A3) é a versão 1.0, e o aceite
 * gravava a versão e o hash dela. Desde a C3, mudar uma taxa ou um prazo dos Termos publica versão
 * nova em `aurea.documentos_legais` — então a versão vigente é a mais recente do banco, e o texto
 * dela é o que a configuração vigente produz (src/domain/admin/documentos.ts).
 *
 * `confere` diz se o texto que a configuração produz hoje tem o hash da última versão publicada. Se
 * não tiver — a taxa mudou e a publicação falhou, por exemplo —, a tela de configuração oferece
 * "publicar a versão vigente" em vez de esconder a diferença.
 *
 * Tudo numa transação só por chamada: a faixa de termos atualizados relê isto a cada ciclo de
 * sincronização do app.
 */

export interface DocumentoVigente {
  chave: ChaveDocumento
  versao: string
  hash: string
  vigenteDesde: string
  documento: DocumentoLegalEstruturado
  /** true = o texto montado pela configuração tem o hash da última versão publicada. */
  confere: boolean
  /** true = a versão e o hash vêm de `documentos_legais`; false = do código (sem banco ou nada publicado). */
  doBanco: boolean
}

/** O documento como a configuração vigente o monta. */
export function documentoDaConfiguracao(chave: ChaveDocumento, config: ConfiguracaoDoSite): DocumentoLegalEstruturado {
  switch (chave) {
    case 'tabela_de_taxas':
      return documentoTabelaDeTaxas(config.taxas, String(config.valores.tabelaDeTaxasVigencia))
    case 'termos_de_uso':
      return documentoTermosDeUso(config.termos)
    default:
      return DOCUMENTOS_VIGENTES[chave].documento
  }
}

export function conteudoDaConfiguracao(chave: ChaveDocumento, config: ConfiguracaoDoSite): string {
  return textoCanonico(documentoDaConfiguracao(chave, config))
}

type Registro = { versao: string; hash: string }

async function registrosPublicados(tx: Consulta, chaves: readonly ChaveDocumento[]): Promise<Map<ChaveDocumento, Registro>> {
  const saida = new Map<ChaveDocumento, Registro>()
  if (!(await tabelaExiste(tx, 'documentos_legais'))) return saida
  for (const chave of chaves) {
    const r = await buscarDocumentoVigente(tx, chave)
    if (r) saida.set(chave, { versao: r.versao, hash: r.hashConteudo })
  }
  return saida
}

function montarVigente(chave: ChaveDocumento, config: ConfiguracaoDoSite, registro: Registro | undefined): DocumentoVigente {
  const documento = documentoDaConfiguracao(chave, config)
  const hashMontado = hashDoDocumento(documento)
  const doCodigo = DOCUMENTOS_VIGENTES[chave]
  const versao = registro?.versao ?? doCodigo.versao
  return {
    chave,
    versao,
    hash: registro?.hash ?? hashMontado,
    vigenteDesde: documento.vigenteDesde,
    documento: { ...documento, versao },
    confere: registro ? registro.hash === hashMontado : hashMontado === doCodigo.hash,
    doBanco: registro !== undefined,
  }
}

export async function carregarDocumentosVigentes(chaves: readonly ChaveDocumento[], config?: ConfiguracaoDoSite): Promise<DocumentoVigente[]> {
  const c = config ?? (await carregarConfiguracaoDoSite())
  let registros = new Map<ChaveDocumento, Registro>()
  if (bancoConfigurado()) {
    try {
      registros = await executarNoBanco((tx) => registrosPublicados(tx, chaves), { somenteLeitura: true })
    } catch (err) {
      console.error('[config] versões publicadas indisponíveis; valendo as do código:', err)
    }
  }
  return chaves.map((chave) => montarVigente(chave, c, registros.get(chave)))
}

export async function carregarDocumentoVigente(chave: ChaveDocumento, config?: ConfiguracaoDoSite): Promise<DocumentoVigente> {
  return (await carregarDocumentosVigentes([chave], config))[0]
}

/** Os documentos que o cadastro e a faixa de atualização pedem para aceitar. */
export const DOCUMENTOS_DO_ACEITE_GERAL: readonly ChaveDocumento[] = ['termos_de_uso', 'politica_privacidade', 'tabela_de_taxas']

/**
 * O que a conta ainda não aceitou na versão vigente — comparando o hash do último aceite de cada
 * documento com o hash vigente. `null` quando não dá para saber (sem banco ou sem a tabela de
 * aceites): quem chama mantém o comportamento que tinha.
 */
export async function documentosPendentesDeAceite(email: string, config?: ConfiguracaoDoSite): Promise<ChaveDocumento[] | null> {
  if (!bancoConfigurado() || !email) return null
  try {
    const c = config ?? (await carregarConfiguracaoDoSite())
    return await executarNoBanco(
      async (tx) => {
        if (!(await tabelaExiste(tx, 'aceites_documentos'))) return null
        const registros = await registrosPublicados(tx, DOCUMENTOS_DO_ACEITE_GERAL)
        const pendentes: ChaveDocumento[] = []
        for (const chave of DOCUMENTOS_DO_ACEITE_GERAL) {
          const vigente = montarVigente(chave, c, registros.get(chave))
          const ultimo = await buscarUltimoAceitePorDocumento(tx, email, chave)
          if (!ultimo || ultimo.hashConteudo !== vigente.hash) pendentes.push(chave)
        }
        return pendentes
      },
      { somenteLeitura: true },
    )
  } catch (err) {
    console.error('[config] pendência de aceite indisponível:', err)
    return null
  }
}
