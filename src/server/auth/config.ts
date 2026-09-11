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
 * Versão legal padrão do ambiente de teste. Os rascunhos vivem em /termos e
 * /privacidade; o aceite continua sendo gravado com versão e data, mas a
 * ausência da variável não fecha mais o cadastro — ver RA-18.
 */
const VERSAO_LEGAL_PADRAO = '1.0-2026-09-10'

/**
 * O cadastro fica aberto sempre que o Supabase Auth existir no ambiente.
 *
 * Antes exigia também `AUREA_SIGNUP_ENABLED=true` e as duas versões legais, e
 * uma variável faltando derrubava a função inteira em produção com a tela
 * "Cadastro temporariamente fechado". Num MVP de teste, sem cliente real e sem
 * dado pessoal de terceiros, essa trava só impedia o que se queria testar.
 * O que sobrou é dependência técnica de verdade: sem Supabase não há cadastro.
 */
export function getRegistrationStatus(): RegistrationStatus {
  const authConfigured = isAuthConfigured()
  const termsVersion = envValue('AUREA_TERMS_VERSION') ?? VERSAO_LEGAL_PADRAO
  const privacyVersion = envValue('AUREA_PRIVACY_VERSION') ?? VERSAO_LEGAL_PADRAO
  // Os rascunhos vivem na própria aplicação. URLs externas continuam aceitas
  // para a versão revisada pelo advogado, mas não são necessárias para testar
  // o aceite versionado enquanto o RA-03 segue explicitamente aberto.
  const termsUrl = envHttpUrl('AUREA_TERMS_URL') ?? '/termos'
  const privacyUrl = envHttpUrl('AUREA_PRIVACY_URL') ?? '/privacidade'

  if (!authConfigured) {
    return {
      enabled: false,
      authConfigured,
      termsVersion,
      privacyVersion,
      termsUrl,
      privacyUrl,
      reason: 'A autenticação ainda não foi configurada neste ambiente.',
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
