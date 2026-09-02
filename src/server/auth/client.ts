/* ============================================================================
 * CLIENTE SUPABASE AUTH — módulo exclusivo de servidor.
 *
 * O adaptador SSR guarda apenas o verificador PKCE e a sessão transitória do
 * OAuth. A sessão da aplicação continua no cookie assinado de session.ts, o
 * que preserva o contrato usado pelas Server Actions enquanto a frente B
 * troca a persistência por baixo de getState()/mutateState().
 * ==========================================================================*/

import 'server-only'

import { createServerClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

import { getAuthConfig } from '@/server/auth/config'

export async function createAuthClient(): Promise<SupabaseClient> {
  const { url, anonKey } = getAuthConfig()
  const jar = await cookies()

  return createServerClient(url, anonKey, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (values) => {
        for (const { name, value, options } of values) {
          jar.set(name, value, options)
        }
      },
    },
  })
}
