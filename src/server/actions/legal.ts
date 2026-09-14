'use server'

/**
 * Server Actions para o Aceite Legal por Blocos.
 *
 * Permite aos Client Components consultar o estado do aceite da conta logada
 * e submeter a confirmação dos 6 blocos obrigatórios de termos de uso e privacidade.
 */

import { headers } from 'next/headers'

import type { ActionResult, LegalBlockAcceptance } from '@/domain/types'
import {
  obterStatusAceiteLegal,
  registrarAceiteLegal,
  type StatusAceiteLegal,
} from '@/server/auth/legal'
import type { AceiteDocumentoGravado } from '@/server/db/repositories/aceites'
import {
  listarAceitesDoUsuario,
  obterComprovantePorId,
  registrarAceitesFormais,
  verificarSeUsuarioAceitouDocumento,
} from '@/server/documentos/aceites'
import { getSessionEmail } from '@/server/session'

const SESSAO_EXPIRADA = 'Sessão expirada.'

/**
 * Registra a aceitação dos blocos de termos e condições para o usuário logado.
 */
export async function salvarAceiteLegal(
  blocosMarcados: string[],
): Promise<ActionResult<LegalBlockAcceptance>> {
  const email = await getSessionEmail()
  if (!email) return { ok: false, error: SESSAO_EXPIRADA }

  return registrarAceiteLegal(email, blocosMarcados)
}

/**
 * Consulta se o usuário logado possui o aceite vigente com todos os blocos.
 */
export async function consultarStatusAceiteLegal(): Promise<ActionResult<StatusAceiteLegal>> {
  const email = await getSessionEmail()
  if (!email) return { ok: false, error: SESSAO_EXPIRADA }

  const status = await obterStatusAceiteLegal(email)
  return { ok: true, data: status }
}

/**
 * Registra formalmente a aceitação dos termos de uso, política de privacidade
 * e tabela de taxas vigentes (versão 1.0) pelo usuário autenticado (via banner ou tela).
 */
export async function aceitarTermosVigentes(): Promise<ActionResult<AceiteDocumentoGravado[]>> {
  const email = await getSessionEmail()
  if (!email) return { ok: false, error: SESSAO_EXPIRADA }

  try {
    const h = await headers()
    const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || null
    const userAgent = h.get('user-agent') || null

    const gravados = await registrarAceitesFormais(email, 'banner_atualizacao', {
      ip,
      userAgent,
    })

    return {
      ok: true,
      message: 'Termos e documentos legais vigentes aceitos com sucesso.',
      data: gravados,
    }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Falha ao registrar aceite.',
    }
  }
}

/**
 * Assina especificamente a Cláusula Compromissória de Arbitragem com nome digitado
 * (Lei 9.307/1996, art. 4º, §2º) na área de configurações da conta.
 */
export async function assinarClausulaArbitragem(
  nomeCompleto: string,
): Promise<ActionResult<AceiteDocumentoGravado>> {
  const email = await getSessionEmail()
  if (!email) return { ok: false, error: SESSAO_EXPIRADA }

  const nomeLimpo = nomeCompleto.trim()
  if (nomeLimpo.length < 3) {
    return {
      ok: false,
      error: 'Digite seu nome completo para assinar a cláusula arbitral.',
    }
  }

  try {
    const h = await headers()
    const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || null
    const userAgent = h.get('user-agent') || null

    const gravados = await registrarAceitesFormais(email, 'conta_documentos', {
      ip,
      userAgent,
      documentos: [], // Não repete termos gerais, foca na cláusula
      arbitragem: {
        assinada: true,
        nomeDigitado: nomeLimpo,
      },
    })

    const aceiteArbitragem = gravados.find((g) => g.documentoChave === 'clausula_arbitragem')
    return {
      ok: true,
      message: 'Cláusula arbitral assinada com sucesso.',
      data: aceiteArbitragem,
    }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Falha ao assinar cláusula arbitral.',
    }
  }
}

/**
 * Lista todos os aceites de documentos legais registrados para o usuário logado.
 */
export async function listarMeusAceites(): Promise<ActionResult<AceiteDocumentoGravado[]>> {
  const email = await getSessionEmail()
  if (!email) return { ok: false, error: SESSAO_EXPIRADA }

  try {
    const lista = await listarAceitesDoUsuario(email)
    return { ok: true, data: lista }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Falha ao listar histórico de aceites.',
    }
  }
}

/**
 * Obtém os dados completos de um comprovante de aceite para impressão ou visualização de prova.
 */
export async function obterComprovanteAceite(
  id: number,
): Promise<ActionResult<AceiteDocumentoGravado>> {
  const email = await getSessionEmail()
  if (!email) return { ok: false, error: SESSAO_EXPIRADA }

  try {
    const aceite = await obterComprovantePorId(id)
    if (!aceite) {
      return { ok: false, error: 'Comprovante de aceite não encontrado.' }
    }

    if (aceite.userEmail.toLowerCase() !== email.toLowerCase()) {
      return { ok: false, error: 'Acesso não autorizado a este comprovante.' }
    }

    return { ok: true, data: aceite }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Falha ao obter comprovante de aceite.',
    }
  }
}

/**
 * Verifica se o usuário atual já assinou a Cláusula de Arbitragem.
 */
export async function verificarStatusArbitragem(): Promise<
  ActionResult<{ assinada: boolean; aceite: AceiteDocumentoGravado | null }>
> {
  const email = await getSessionEmail()
  if (!email) return { ok: false, error: SESSAO_EXPIRADA }

  try {
    const aceite = await verificarSeUsuarioAceitouDocumento(email, 'clausula_arbitragem')
    return {
      ok: true,
      data: {
        assinada: aceite !== null,
        aceite,
      },
    }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Falha ao verificar cláusula arbitral.',
    }
  }
}
