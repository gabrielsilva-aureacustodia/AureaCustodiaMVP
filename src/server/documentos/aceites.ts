/* ============================================================================
 * SERVIÇO DE REGISTRO FORMAL DE ACEITES — exclusivo de servidor.
 *
 * Registra o aceite com prova imutável e encadeamento criptográfico SHA-256
 * em aurea.aceites_documentos, e sincroniza com o estado da aplicação.
 * ==========================================================================*/

import 'server-only'

import type { AceiteDocumentoGravado } from '@/server/db/repositories/aceites'
import {
  buscarAceitePorId,
  buscarUltimoAceitePorDocumento,
  inserirAceites,
  listarAceitesPorUsuario,
} from '@/server/db/repositories/aceites'
import { garantirDocumentosVigentes } from '@/server/db/repositories/documentos'
import { carregarDocumentosVigentes } from '@/server/config/documentos'
import { bancoConfigurado, executarNoBanco } from '@/server/db/client'
import { mutateState } from '@/server/state'
import { DOCUMENTOS_VIGENTES } from '@/domain/documentos-legais'
import type {
  CanalAceite,
  ChaveDocumento,
} from '@/domain/documentos-legais/types'
import type { AceitePendente } from '@/domain/aceite'
import {
  VERSAO_TERMOS_VIGENTE,
  VERSAO_PRIVACIDADE_VIGENTE,
  TODOS_OS_BLOCOS_IDS,
} from '@/domain/legal'
import type { LegalBlockAcceptance } from '@/domain/types'

export interface OpcoesRegistroAceite {
  ip?: string | null
  userAgent?: string | null
  arbitragem?: {
    assinada: boolean
    nomeDigitado?: string | null
  }
  documentos?: ChaveDocumento[]
  textoExibidoCustomizado?: Partial<Record<ChaveDocumento, string>>
}

export const TEXTOS_EXIBIDOS_PADRAO: Record<ChaveDocumento, string> = {
  termos_de_uso:
    'Ao criar sua conta ou confirmar, você concorda com os Termos de Uso (versão 1.0) da Áurea Custódia.',
  politica_privacidade:
    'Ao criar sua conta ou confirmar, você concorda com a Política de Privacidade (versão 1.0) da Áurea Custódia.',
  tabela_de_taxas:
    'Ao criar sua conta ou confirmar, você concorda com a Tabela de Taxas vigente da Áurea Custódia.',
  clausula_arbitragem:
    'Declaro que li e concordo expressamente com a Cláusula Compromissória de Arbitragem (Capítulo 14.4 dos Termos de Uso), instituindo o juízo arbitral para resolução de controvérsias.',
}

/**
 * Registra o aceite formal de documentos legais para um usuário.
 */
export async function registrarAceitesFormais(
  userEmail: string,
  canal: CanalAceite,
  opcoes?: OpcoesRegistroAceite,
): Promise<AceiteDocumentoGravado[]> {
  const email = userEmail.trim().toLowerCase()
  const agora = Date.now()
  const chavesDesejadas: ChaveDocumento[] =
    opcoes?.documentos ?? ['termos_de_uso', 'politica_privacidade', 'tabela_de_taxas']

  const pendentes: AceitePendente[] = []

  // C3 (14/09/2026): a versão aceita é a VIGENTE — a mais recente publicada em
  // `documentos_legais` quando a Tabela de Taxas ou os Termos mudam pelo painel —, e não
  // mais a 1.0 do código. Sem banco ou sem publicação, é a mesma de DOCUMENTOS_VIGENTES.
  const vigentes = new Map(
    (await carregarDocumentosVigentes([...chavesDesejadas, 'clausula_arbitragem'])).map((v) => [v.chave, v]),
  )
  const infoDe = (chave: ChaveDocumento): { versao: string; hash: string } =>
    vigentes.get(chave) ?? DOCUMENTOS_VIGENTES[chave]
  // O texto padrão cita a versão 1.0; com versão nova publicada, a frase gravada cita a vigente.
  const textoPadrao = (chave: ChaveDocumento): string =>
    TEXTOS_EXIBIDOS_PADRAO[chave].replace('(versão 1.0)', `(versão ${infoDe(chave).versao})`)

  for (const chave of chavesDesejadas) {
    const docInfo = infoDe(chave)
    const textoExibido =
      opcoes?.textoExibidoCustomizado?.[chave] ?? textoPadrao(chave)

    pendentes.push({
      createdAt: agora,
      userEmail: email,
      documentoChave: chave,
      documentoVersao: docInfo.versao,
      hashConteudo: docInfo.hash,
      canal,
      metodo: 'clique_no_botao',
      textoExibido,
      nomeDigitado: null,
      ip: opcoes?.ip ?? null,
      userAgent: opcoes?.userAgent ?? null,
    })
  }

  if (opcoes?.arbitragem?.assinada && opcoes.arbitragem.nomeDigitado?.trim()) {
    const docArbitragem = infoDe('clausula_arbitragem')
    pendentes.push({
      createdAt: agora,
      userEmail: email,
      documentoChave: 'clausula_arbitragem',
      documentoVersao: docArbitragem.versao,
      hashConteudo: docArbitragem.hash,
      canal,
      metodo: 'caixa_e_nome_digitado',
      textoExibido:
        opcoes.textoExibidoCustomizado?.clausula_arbitragem ??
        TEXTOS_EXIBIDOS_PADRAO.clausula_arbitragem,
      nomeDigitado: opcoes.arbitragem.nomeDigitado.trim(),
      ip: opcoes?.ip ?? null,
      userAgent: opcoes?.userAgent ?? null,
    })
  }

  let gravados: AceiteDocumentoGravado[] = []

  if (bancoConfigurado()) {
    gravados = await executarNoBanco(async (tx) => {
      await garantirDocumentosVigentes(tx)
      return inserirAceites(tx, pendentes)
    })
  }

  try {
    const acceptance: LegalBlockAcceptance = {
      termsVersion: VERSAO_TERMOS_VIGENTE,
      privacyVersion: VERSAO_PRIVACIDADE_VIGENTE,
      acceptedAt: new Date(agora).toISOString(),
      blocks: [...TODOS_OS_BLOCOS_IDS],
    }
    await mutateState((s) => {
      const u = s.users[email]
      if (u) {
        if (!u.settings) {
          u.settings = {
            twoFA: false,
            notifEnvios: true,
            notifNegociacoes: true,
            notifNovidades: false,
          }
        }
        u.settings.legalAcceptance = acceptance
      }
    })
  } catch {
    // Se usuário não existir no AppState ainda, a mutação pode falhar sem afetar a prova
  }

  return gravados
}

/**
 * Consulta a lista completa de aceites de um usuário.
 */
export async function listarAceitesDoUsuario(
  userEmail: string,
): Promise<AceiteDocumentoGravado[]> {
  if (!bancoConfigurado()) return []
  return executarNoBanco(async (tx) => {
    return listarAceitesPorUsuario(tx, userEmail)
  }, { somenteLeitura: true })
}

/**
 * Busca o registro e comprovante de um aceite pelo ID.
 */
export async function obterComprovantePorId(
  id: number,
): Promise<AceiteDocumentoGravado | null> {
  if (!bancoConfigurado()) return null
  return executarNoBanco(async (tx) => {
    return buscarAceitePorId(tx, id)
  }, { somenteLeitura: true })
}

/**
 * Verifica se um usuário já possui aceite registrado para determinado documento.
 */
export async function verificarSeUsuarioAceitouDocumento(
  userEmail: string,
  chave: ChaveDocumento,
): Promise<AceiteDocumentoGravado | null> {
  if (!bancoConfigurado()) return null
  return executarNoBanco(async (tx) => {
    return buscarUltimoAceitePorDocumento(tx, userEmail, chave)
  }, { somenteLeitura: true })
}
