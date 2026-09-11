/* ============================================================================
 * ACEITE LEGAL E CONDIÇÕES OPERACIONAIS — módulo exclusivo de servidor.
 *
 * Reunião jurídica de 09/09/2026 (Felipe Moraes, Gabriel):
 * O aceite é exigido por blocos temáticos para operar (primeira movimentação),
 * nunca como trava de login ou de navegação deslogada.
 *
 * Este módulo gerencia:
 * 1. O cookie assinado do OAuth para transitar versões até o callback;
 * 2. A consulta do status do aceite vigente de cada usuário;
 * 3. A gravação atômica dos blocos aceitos com versão e timestamp;
 * 4. A trava legal de operações (Trava 3 da Seção 3.3).
 * ==========================================================================*/

import 'server-only'

import { createHmac, timingSafeEqual } from 'node:crypto'

import { cookies } from 'next/headers'

import {
  TODOS_OS_BLOCOS_IDS,
  validarAceiteBlocos,
  verificarAceiteVigente,
  VERSAO_PRIVACIDADE_VIGENTE,
  VERSAO_TERMOS_VIGENTE,
} from '@/domain/legal'
import type {
  ActionResult,
  LegalBlockAcceptance,
  LegalBlockId,
} from '@/domain/types'
import { createAuthClient } from '@/server/auth/client'
import {
  getRegistrationStatus,
  isAuthConfigured,
  type RegistrationStatus,
} from '@/server/auth/config'
import { getState, mutateState } from '@/server/state'

const COOKIE_NAME = 'aurea_oauth_legal'
const MAX_AGE_S = 10 * 60
const DEV_SECRET = 'aurea-auth-legal-dev-only'

export interface LegalAcceptance {
  termsVersion: string
  privacyVersion: string
  acceptedAt: string
  blocks?: string[]
}

export interface StatusAceiteLegal {
  aceito: boolean
  aceite: LegalBlockAcceptance | null
  versaoTermos: string
  versaoPrivacidade: string
  blocosFaltando: LegalBlockId[]
}

function secret(): string {
  const configured = process.env.AUTH_LEGAL_SECRET?.trim() || process.env.SESSION_SECRET?.trim()
  if (configured) return configured
  if (process.env.NODE_ENV !== 'production') return DEV_SECRET
  throw new Error('AUTH_LEGAL_SECRET ou SESSION_SECRET é obrigatória para o OAuth.')
}

function signature(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('hex')
}

function sameSignature(received: string, expected: string): boolean {
  if (received.length !== expected.length) return false
  return timingSafeEqual(Buffer.from(received), Buffer.from(expected))
}

export async function setPendingLegalAcceptance(
  status: RegistrationStatus,
  blocks?: string[],
): Promise<void> {
  // Guardar o aceite e registro, nao autorizacao: nunca lanca nem interrompe o
  // cadastro. Sem versao no ambiente, cai no padrao vigente. Ver RA-18.
  const acceptance: LegalAcceptance = {
    termsVersion: status.termsVersion ?? VERSAO_TERMOS_VIGENTE,
    privacyVersion: status.privacyVersion ?? VERSAO_PRIVACIDADE_VIGENTE,
    acceptedAt: new Date().toISOString(),
    blocks: blocks && blocks.length > 0 ? [...blocks] : undefined,
  }
  const payload = Buffer.from(JSON.stringify(acceptance), 'utf8').toString('base64url')
  const jar = await cookies()
  jar.set(COOKIE_NAME, `${payload}.${signature(payload)}`, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/entrar/callback',
    maxAge: MAX_AGE_S,
  })
}

export async function consumePendingLegalAcceptance(): Promise<LegalAcceptance | null> {
  const jar = await cookies()
  const raw = jar.get(COOKIE_NAME)?.value
  jar.delete(COOKIE_NAME)
  if (!raw) return null

  const cut = raw.lastIndexOf('.')
  if (cut <= 0) return null
  const payload = raw.slice(0, cut)
  const received = raw.slice(cut + 1)
  if (!sameSignature(received, signature(payload))) return null

  try {
    const parsed: unknown = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !('termsVersion' in parsed) ||
      !('privacyVersion' in parsed) ||
      !('acceptedAt' in parsed) ||
      typeof parsed.termsVersion !== 'string' ||
      typeof parsed.privacyVersion !== 'string' ||
      typeof parsed.acceptedAt !== 'string'
    ) {
      return null
    }

    const blocks =
      'blocks' in parsed && Array.isArray(parsed.blocks) && parsed.blocks.every((b) => typeof b === 'string')
        ? (parsed.blocks as string[])
        : undefined

    return {
      termsVersion: parsed.termsVersion,
      privacyVersion: parsed.privacyVersion,
      acceptedAt: parsed.acceptedAt,
      ...(blocks ? { blocks } : {}),
    }
  } catch {
    return null
  }
}

/**
 * Consulta se um determinado usuário já cumpriu o aceite dos termos vigentes
 * e de todos os blocos obrigatórios.
 */
export async function obterStatusAceiteLegal(email: string): Promise<StatusAceiteLegal> {
  const normalized = email.trim().toLowerCase()
  const state = await getState()
  const user = state.users[normalized]
  const aceite = user?.settings?.legalAcceptance ?? null

  const status = getRegistrationStatus()
  const versaoTermos = status.termsVersion ?? VERSAO_TERMOS_VIGENTE
  const versaoPrivacidade = status.privacyVersion ?? VERSAO_PRIVACIDADE_VIGENTE

  const validacao = validarAceiteBlocos(aceite?.blocks)
  const aceito = verificarAceiteVigente(aceite, versaoTermos, versaoPrivacidade)

  return {
    aceito,
    aceite,
    versaoTermos,
    versaoPrivacidade,
    blocosFaltando: validacao.faltando,
  }
}

/**
 * Registra o aceite por blocos do usuário autenticado no estado da aplicação
 * e, se configurado, no Supabase Auth.
 */
export async function registrarAceiteLegal(
  email: string,
  blocosMarcados: readonly string[],
): Promise<ActionResult<LegalBlockAcceptance>> {
  const normalized = email.trim().toLowerCase()
  if (!normalized) return { ok: false, error: 'Identificação de usuário inválida.' }

  const validacao = validarAceiteBlocos(blocosMarcados)
  if (!validacao.valido) {
    return {
      ok: false,
      error: 'Todos os blocos de condições operacionais devem ser confirmados para prosseguir.',
    }
  }

  const status = getRegistrationStatus()
  const versaoTermos = status.termsVersion ?? VERSAO_TERMOS_VIGENTE
  const versaoPrivacidade = status.privacyVersion ?? VERSAO_PRIVACIDADE_VIGENTE
  const acceptedAt = new Date().toISOString()

  const acceptance: LegalBlockAcceptance = {
    termsVersion: versaoTermos,
    privacyVersion: versaoPrivacidade,
    acceptedAt,
    blocks: [...TODOS_OS_BLOCOS_IDS],
  }

  try {
    const { result } = await mutateState<ActionResult<LegalBlockAcceptance>>((s) => {
      const u = s.users[normalized]
      if (!u) return { ok: false, error: 'Usuário não encontrado no estado da aplicação.' }

      if (!u.settings) {
        u.settings = {
          twoFA: false,
          notifEnvios: true,
          notifNegociacoes: true,
          notifNovidades: false,
        }
      }
      u.settings.legalAcceptance = acceptance

      return {
        ok: true,
        message: 'Termos de uso e condições operacionais aceitos com sucesso.',
        data: acceptance,
      }
    })

    if (isAuthConfigured()) {
      try {
        const client = await createAuthClient()
        await client.auth.updateUser({
          data: {
            legal_terms_version: acceptance.termsVersion,
            privacy_policy_version: acceptance.privacyVersion,
            legal_accepted_at: acceptance.acceptedAt,
            legal_accepted_blocks: acceptance.blocks,
          },
        })
      } catch {
        // Falha no Supabase não anula a persistência no estado principal
      }
    }

    return result
  } catch {
    return { ok: false, error: 'Falha ao registrar aceite legal. Tente novamente.' }
  }
}

/**
 * Trava 3 (Seção 3.3 do Plano Executivo):
 * Exige aceite legal válido para operações financeiras e de custódia.
 * Devolve { ok: true } se aceito ou código de erro para exibição do modal.
 */
export async function exigirAceiteLegal(
  email: string,
): Promise<{ ok: true } | { ok: false; error: string; code: 'LEGAL_ACCEPTANCE_REQUIRED' }> {
  const status = await obterStatusAceiteLegal(email)
  if (!status.aceito) {
    return {
      ok: false,
      error: 'É necessário confirmar as condições operacionais e termos de uso vigentes antes de operar.',
      code: 'LEGAL_ACCEPTANCE_REQUIRED',
    }
  }
  return { ok: true }
}
