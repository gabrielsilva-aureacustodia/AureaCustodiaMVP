/* ============================================================================
 * ATENÇÃO — MÓDULO EXCLUSIVO DE SERVIDOR.
 *
 * Lê SUPABASE_SERVICE_ROLE_KEY, que dá acesso total ao projeto Supabase —
 * inclusive criar, bloquear e trocar a senha de qualquer login. Ela NUNCA sai
 * daqui. Não importe de Client Component.
 * ==========================================================================*/

import 'server-only'

import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'
import { bancoConfigurado, executarNoBanco } from '@/server/db/client'

import type { IdentidadeResumo, PortaDeIdentidade, RespostaIdentidade } from './usuarios'

/**
 * A porta do painel para o Supabase Auth — a Admin API, pela chave de serviço (plano do
 * Admin, seção 2.6: "a chave de serviço do Supabase nunca sai do servidor").
 *
 * Mesmo desenho de src/server/estacao/video.ts: sem as variáveis, nada quebra — a porta
 * responde `configurada: false` com os nomes do que falta, e cada ação do painel diz isso
 * na tela em vez de lançar.
 *
 * BUSCA POR E-MAIL. A Admin API do supabase-js não filtra usuário por e-mail (`listUsers`
 * só pagina). A busca percorre as páginas de mil em mil — com as contas de hoje, uma página.
 * O teto de 50 páginas é anteparo contra laço infinito, não limite de negócio.
 */

const POR_PAGINA = 1_000
const PAGINAS_MAX = 50
/** "Para sempre" no formato que o Supabase aceita: cem anos, em horas. */
const BLOQUEIO_PERMANENTE = '876000h'

function configuracao(): { url: string; chave: string } | { faltando: string[] } {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY
  const faltando = [...(url ? [] : ['SUPABASE_URL']), ...(chave ? [] : ['SUPABASE_SERVICE_ROLE_KEY'])]
  return url && chave ? { url, chave } : { faltando }
}

function resumo(u: User): IdentidadeResumo {
  const banida = (u as User & { banned_until?: string | null }).banned_until ?? null
  const identProvedores = (u.identities ?? []).map((i) => i.provider)
  const metaProvedores = ((u.app_metadata?.providers as string[]) ?? [])
  const metaProvedor = (u.app_metadata?.provider as string) ?? null
  const todosProvedores = Array.from(
    new Set([
      ...identProvedores,
      ...metaProvedores,
      ...(metaProvedor ? [metaProvedor] : []),
    ]),
  )
  return {
    id: u.id,
    email: (u.email ?? '').toLowerCase(),
    criadaEm: u.created_at ?? null,
    confirmadaEm: u.email_confirmed_at ?? null,
    ultimoLogin: u.last_sign_in_at ?? null,
    // O Supabase devolve a data do fim do bloqueio; no passado, a conta já está livre.
    bloqueadaAte: banida && new Date(banida).getTime() > Date.now() ? banida : null,
    provedores: todosProvedores,
  }
}

function falha(erro: { message?: string } | null | undefined): RespostaIdentidade<never> {
  return { ok: false, erro: erro?.message || 'erro sem descrição' }
}

export function portaDeIdentidadeDoAmbiente(): PortaDeIdentidade {
  const cfg = configuracao()
  if ('faltando' in cfg) {
    const recusa = async (): Promise<RespostaIdentidade<never>> => ({ ok: false, erro: `falta ${cfg.faltando.join(' e ')}` })
    return {
      configurada: false,
      faltando: cfg.faltando,
      buscar: async () => null,
      criar: recusa,
      definirSenha: recusa,
      bloquear: recusa,
      enviarLinkDeSenha: recusa,
      atualizarLogin: recusa,
    }
  }

  let cliente: SupabaseClient | null = null
  const supabase = (): SupabaseClient => {
    cliente ??= createClient(cfg.url, cfg.chave, { auth: { persistSession: false, autoRefreshToken: false } })
    return cliente
  }

  return {
    configurada: true,
    faltando: [],

    async buscar(email) {
      const alvo = email.trim().toLowerCase()
      for (let pagina = 1; pagina <= PAGINAS_MAX; pagina += 1) {
        const { data, error } = await supabase().auth.admin.listUsers({ page: pagina, perPage: POR_PAGINA })
        if (error) throw new Error(`Supabase Auth: ${error.message}`)
        const achado = data.users.find((u) => (u.email ?? '').toLowerCase() === alvo)
        if (achado) return resumo(achado)
        if (data.users.length < POR_PAGINA) return null
      }
      return null
    },

    async criar({ email, senha, nome }) {
      // `email_confirm: true`: quem cria é a equipe, que já sabe de quem é o e-mail. Sem isso
      // o login pediria a confirmação por e-mail antes de funcionar.
      const { data, error } = await supabase().auth.admin.createUser({
        email,
        ...(senha ? { password: senha } : {}),
        email_confirm: true,
        user_metadata: { full_name: nome, criado_pelo_painel: true },
      })
      if (error || !data.user) return falha(error)
      return { ok: true, dados: { id: data.user.id } }
    },

    async definirSenha(id, senha) {
      const { error } = await supabase().auth.admin.updateUserById(id, { password: senha })
      return error ? falha(error) : { ok: true, dados: undefined }
    },

    async bloquear(id, bloquear) {
      const { error } = await supabase().auth.admin.updateUserById(id, { ban_duration: bloquear ? BLOQUEIO_PERMANENTE : 'none' })
      return error ? falha(error) : { ok: true, dados: undefined }
    },

    async enviarLinkDeSenha(email, redirecionarPara) {
      // O e-mail sai do Supabase com o modelo padrão dele — nenhum template editado, nenhum
      // SMTP próprio exigido.
      const { error } = await supabase().auth.resetPasswordForEmail(email, { redirectTo: redirecionarPara })
      return error ? falha(error) : { ok: true, dados: undefined }
    },

    async atualizarLogin(id, dados) {
      const attributes: Record<string, unknown> = {}
      if (dados.email) {
        attributes.email = dados.email.trim().toLowerCase()
        attributes.email_confirm = true
      }
      if (dados.senha) {
        attributes.password = dados.senha
      }
      if (dados.removerVinculoGoogle) {
        attributes.app_metadata = { provider: 'email', providers: ['email'] }
      }
      const { error } = await supabase().auth.admin.updateUserById(id, attributes)
      if (error) return falha(error)

      if (dados.removerVinculoGoogle && bancoConfigurado()) {
        try {
          await executarNoBanco(async (tx) => {
            await tx.query('DELETE FROM auth.identities WHERE user_id = $1 AND provider = $2', [id, 'google'])
          })
        } catch (err) {
          console.warn('[identidade] aviso ao limpar identidade google em auth.identities:', err)
        }
      }

      return { ok: true, dados: undefined }
    },
  }
}
