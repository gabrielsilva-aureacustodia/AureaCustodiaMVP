/**
 * Reenvio de e-mail ao cliente pelo painel — a trilha `admin.email.reenviar` e a leitura do
 * "último envio" que a ficha mostra ao lado de cada botão.
 *
 * POR QUE EXISTE. Até 01/10/2026 o painel só disparava um e-mail ao cliente (o link de
 * redefinição de senha) e não sabia dizer se ele já tinha saído. Quando a pessoa diz "não
 * recebi", o atendente precisa de duas coisas: reenviar com um clique e ver quando foi a
 * última tentativa, para não mandar três e-mails em cinco minutos.
 *
 * Sem `server-only`, como `auditar.ts`: recebe o executor e o remetente prontos, por isso
 * roda na suíte contra o Postgres embutido.
 */

import { nomeDoSchema, num, type Consulta } from '@/server/db/sql'

import { registrarAcaoAdmin } from './auditar'

export type TipoDeReenvio = 'redefinicao_senha' | 'convite_equipe' | 'aviso_reserva'

export const TIPOS_DE_REENVIO: readonly TipoDeReenvio[] = ['redefinicao_senha', 'convite_equipe', 'aviso_reserva']

/** Chave do mapa de últimos envios: a reserva entra no nome porque cada uma tem o seu aviso. */
export function chaveDoEnvio(tipo: TipoDeReenvio, referencia?: string): string {
  return referencia ? `${tipo}:${referencia}` : tipo
}

export async function gravarReenvio(
  tx: Consulta,
  a: { ator: string; tipo: TipoDeReenvio; email: string; referencia?: string; simulado?: boolean; primeiro?: boolean; agora?: number },
): Promise<void> {
  await registrarAcaoAdmin(tx, {
    ator: a.ator,
    area: 'email',
    // O primeiro envio de um convite (ao adicionar o membro) é `admin.email.enviar`; só o clique
    // em "Reenviar" grava `admin.email.reenviar`.
    verbo: a.primeiro ? 'enviar' : 'reenviar',
    entidade: 'email',
    entidadeId: a.referencia ?? a.email,
    usuariosAfetados: [a.email],
    detalhes: { tipo: a.tipo, ...(a.referencia ? { referencia: a.referencia } : {}), simulado: a.simulado === true },
    agora: a.agora,
  })
}

/**
 * Quando cada e-mail saiu pela última vez para esta conta (milissegundos), pela chave de
 * `chaveDoEnvio`. Conta como envio tanto o reenvio (`admin.email.reenviar`) quanto o primeiro
 * link de senha, que a ação antiga já gravava como `admin.usuarios.redefinir_senha` com
 * `modo = link`. Envio simulado (sem RESEND_API_KEY) não conta: o e-mail não saiu.
 */
export async function ultimosEnvios(tx: Consulta, email: string): Promise<Record<string, number>> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<{ acao: string; detalhes: unknown; created_at: unknown }>(
    `SELECT acao, detalhes, created_at FROM ${S}.audit_log
      WHERE $1 = ANY(usuarios_afetados)
        AND (acao IN ('admin.email.reenviar', 'admin.email.enviar')
             OR (acao = 'admin.usuarios.redefinir_senha' AND detalhes->>'modo' = 'link'))
      ORDER BY id DESC LIMIT 200`,
    [email],
  )
  const mapa: Record<string, number> = {}
  for (const r of rows) {
    const d = (typeof r.detalhes === 'string' ? JSON.parse(r.detalhes) : r.detalhes ?? {}) as { tipo?: string; referencia?: string; simulado?: boolean }
    if (d.simulado === true) continue
    const chave = r.acao.startsWith('admin.email.') ? chaveDoEnvio((d.tipo ?? '') as TipoDeReenvio, d.referencia) : chaveDoEnvio('redefinicao_senha')
    if (!(chave in mapa)) mapa[chave] = num(r.created_at)
  }
  return mapa
}

/** O convite de quem acaba de entrar na equipe — mesmo texto no primeiro envio e no reenvio. */
export function conviteDeEquipe(nome: string, papelNome: string, link: string): { assunto: string; texto: string } {
  return {
    assunto: 'Você foi adicionado à equipe do Real Olímpico',
    texto:
      `Olá, ${nome || 'tudo bem'}.\n\n` +
      `Você foi adicionado à equipe do Real Olímpico com o papel "${papelNome}".\n\n` +
      `Para acessar o painel, entre com o mesmo login que você usa no Real Olímpico: ${link}\n\n` +
      `Real Olímpico — AUREA CUSTODIA LTDA`,
  }
}

/** Quando o convite de equipe saiu pela última vez para cada membro (e-mail → milissegundos). */
export async function ultimosConvites(tx: Consulta): Promise<Record<string, number>> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<{ entidade_id: string | null; detalhes: unknown; created_at: unknown }>(
    `SELECT entidade_id, detalhes, created_at FROM ${S}.audit_log
      WHERE acao IN ('admin.email.reenviar', 'admin.email.enviar') AND detalhes->>'tipo' = 'convite_equipe'
      ORDER BY id DESC LIMIT 500`,
  )
  const mapa: Record<string, number> = {}
  for (const r of rows) {
    const d = (typeof r.detalhes === 'string' ? JSON.parse(r.detalhes) : r.detalhes ?? {}) as { simulado?: boolean }
    if (d.simulado === true || !r.entidade_id || r.entidade_id in mapa) continue
    mapa[r.entidade_id] = num(r.created_at)
  }
  return mapa
}
