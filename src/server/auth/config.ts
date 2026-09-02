/* ============================================================================
 * CONFIGURAÇÃO DO SUPABASE AUTH — módulo exclusivo de servidor.
 *
 * A autenticação usa a chave pública (anon/publishable), nunca service role.
 * Mesmo sendo uma chave publicável por definição, ela fica centralizada aqui
 * para que nenhum Client Component precise conhecer a configuração do projeto.
 * ==========================================================================*/

import 'server-only'

export interface AuthConfig {
  url: string
  anonKey: string
}

export interface RegistrationStatus {
  enabled: boolean
  authConfigured: boolean
  termsVersion?: string
  privacyVersion?: string
  termsUrl?: string
  privacyUrl?: string
  reason?: string
}

export class AuthConfigurationError extends Error {
  constructor() {
    super('Supabase Auth não está configurado neste ambiente.')
    this.name = 'AuthConfigurationError'
  }
}

function envValue(...names: string[]): string | undefined {
  for (const name of names) {
    const value = process.env[name]?.trim()
    if (value) return value
  }
  return undefined
}

function envHttpUrl(name: string): string | undefined {
  const value = envValue(name)
  if (!value) return undefined
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.toString() : undefined
  } catch {
    return undefined
  }
}

/**
 * Aceita os nomes novos do Supabase e os aliases históricos do projeto. A
 * leitura é tardia para o build continuar funcionando sem credenciais: quem
 * falha é só a tentativa real de autenticação, com mensagem controlada.
 */
export function getAuthConfig(): AuthConfig {
  const url = envValue('SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL')
  const anonKey = envValue(
    'SUPABASE_ANON_KEY',
    'SUPABASE_PUBLISHABLE_KEY',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  )

  if (!url || !anonKey) throw new AuthConfigurationError()
  return { url, anonKey }
}

export function isAuthConfigured(): boolean {
  try {
    getAuthConfig()
    return true
  } catch (error) {
    if (error instanceof AuthConfigurationError) return false
    throw error
  }
}

/**
 * O cadastro só abre quando há uma decisão operacional explícita E versões
 * dos dois documentos legais. Assim uma variável esquecida não reabre sozinha
 * a coleta pública de dados pessoais registrada no RA-03.
 */
export function getRegistrationStatus(): RegistrationStatus {
  const authConfigured = isAuthConfigured()
  const requested = process.env.AUREA_SIGNUP_ENABLED === 'true'
  const termsVersion = envValue('AUREA_TERMS_VERSION')
  const privacyVersion = envValue('AUREA_PRIVACY_VERSION')
  const termsUrl = envHttpUrl('AUREA_TERMS_URL')
  const privacyUrl = envHttpUrl('AUREA_PRIVACY_URL')

  if (!authConfigured) {
    return {
      enabled: false,
      authConfigured,
      reason: 'A autenticação ainda não foi configurada neste ambiente.',
    }
  }

  if (!requested) {
    return {
      enabled: false,
      authConfigured,
      reason: 'Novos cadastros estão temporariamente fechados.',
    }
  }

  if (!termsVersion || !privacyVersion || !termsUrl || !privacyUrl) {
    return {
      enabled: false,
      authConfigured,
      reason: 'O cadastro aguarda as versões vigentes dos documentos legais.',
    }
  }

  return {
    enabled: true,
    authConfigured,
    termsVersion,
    privacyVersion,
    termsUrl,
    privacyUrl,
  }
}
