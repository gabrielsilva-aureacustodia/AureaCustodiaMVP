/* ============================================================================
 * ACEITE LEGAL PENDENTE NO OAUTH — módulo exclusivo de servidor.
 *
 * O Google tira o visitante do site antes de criar a identidade. Este cookie
 * assinado leva até o callback as versões aceitas antes da saída sem confiar
 * em campos enviados pelo navegador nem expor o conteúdo a JavaScript.
 * ==========================================================================*/

import 'server-only'

import { createHmac, timingSafeEqual } from 'node:crypto'

import { cookies } from 'next/headers'

import type { RegistrationStatus } from '@/server/auth/config'

const COOKIE_NAME = 'aurea_oauth_legal'
const MAX_AGE_S = 10 * 60
const DEV_SECRET = 'aurea-auth-legal-dev-only'

export interface LegalAcceptance {
  termsVersion: string
  privacyVersion: string
  acceptedAt: string
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
): Promise<void> {
  if (!status.enabled || !status.termsVersion || !status.privacyVersion) {
    throw new Error('O cadastro não está habilitado com documentos legais vigentes.')
  }

  const acceptance: LegalAcceptance = {
    termsVersion: status.termsVersion,
    privacyVersion: status.privacyVersion,
    acceptedAt: new Date().toISOString(),
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
    return {
      termsVersion: parsed.termsVersion,
      privacyVersion: parsed.privacyVersion,
      acceptedAt: parsed.acceptedAt,
    }
  } catch {
    return null
  }
}
