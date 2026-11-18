/* ============================================================================
 * EVENTOS DE SEGURANÇA — frente A, 17/11/2026 (contrato A → C).
 *
 * Toda troca de SENHA, de E-MAIL e de PIX/conta bancária deixa uma linha em
 * `aurea.audit_log` com a ação `seguranca.<tipo>`. É o que a frente C lê para avisar
 * o cliente por e-mail ("a senha da sua conta foi trocada; se não foi você, fale
 * com a gente"); sem a C, a linha fica só no log — a trilha vale por si.
 *
 *   seguranca.senha_alterada   detalhes: { }
 *   seguranca.email_alterado   detalhes: { de, para, senhaDefinida, googleDesvinculado }
 *   seguranca.pix_alterado     detalhes: { primeiroCadastro, campos: ['chavePix', …] }
 *
 * `ator` e `entidadeId` são o e-mail que a conta tinha ANTES da troca (é a chave da
 * conta e é para onde o aviso deve ir: se a conta foi tomada, o e-mail novo já é do
 * invasor). `usuariosAfetados` leva esse e-mail e, na troca de e-mail, o novo também.
 *
 * O QUE NUNCA ENTRA NA LINHA: senha (nem a antiga, nem a nova), código de confirmação,
 * chave Pix, número de conta. Os `campos` do Pix são NOMES de campo, não valores: a
 * trilha de auditoria não coleta mais do que a plataforma já tem (LGPD, ver o topo de
 * repositories/auditoria.ts).
 *
 * A GRAVAÇÃO NUNCA DERRUBA A TROCA. A senha e o e-mail já mudaram no Supabase Auth
 * quando esta função roda — desfazer só porque a linha de auditoria falhou deixaria a
 * pessoa sem acesso e sem aviso. Falha vira `console.warn` e a troca segue. Pelo mesmo
 * motivo a linha é gravada DEPOIS da troca, numa transação própria, e não dentro da
 * `mutateState` da ação: o Supabase Auth não participa de transação nossa, então "as
 * duas commitam ou nenhuma" não existe para a senha, e o e-mail já tem a sua linha
 * `usuario.trocar_email` dentro da transação do rename (users.ts) — esta é a versão
 * `seguranca.*` para a C filtrar tudo por um prefixo só.
 *
 * Sem Postgres (store em memória ou Redis) não existe `audit_log`; a função não faz
 * nada, como o resto da trilha (a `mutateState` também não grava auditoria nesses stores).
 *
 * Os `Date.now()` ficam em `registrarEventoDeSeguranca`; o resto é puro para o teste.
 * ==========================================================================*/

import 'server-only'

import { normalizarEmail } from '@/domain/admin/permissoes'
import { bancoConfigurado, executarNoBanco } from '@/server/db/client'
import { registrarAuditoria, type EntradaAuditoria } from '@/server/db/repositories/auditoria'

export type TipoDeEventoDeSeguranca = 'senha_alterada' | 'email_alterado' | 'pix_alterado'

/** Prefixo comum: a frente C filtra `acao LIKE 'seguranca.%'`. */
export const PREFIXO_DOS_EVENTOS_DE_SEGURANCA = 'seguranca.'

export function nomeDoEventoDeSeguranca(tipo: TipoDeEventoDeSeguranca): string {
  return `${PREFIXO_DOS_EVENTOS_DE_SEGURANCA}${tipo}`
}

export interface EventoDeSeguranca {
  tipo: TipoDeEventoDeSeguranca
  /** O e-mail que a conta tinha antes da troca. */
  conta: string
  /** Só dado que não é segredo (ver o topo do arquivo). */
  detalhes?: Record<string, unknown>
  /** Outras contas que o evento toca (o e-mail novo, na troca de e-mail). */
  tambemAfeta?: readonly string[]
}

/** Monta a linha de auditoria. Pura: o relógio entra por parâmetro. */
export function montarEventoDeSeguranca(e: EventoDeSeguranca, agora: number): EntradaAuditoria {
  const conta = normalizarEmail(e.conta)
  const afetados = [conta]
  for (const outra of e.tambemAfeta ?? []) {
    const email = normalizarEmail(outra)
    if (!afetados.includes(email)) afetados.push(email)
  }
  return {
    createdAt: agora,
    ator: conta,
    acao: nomeDoEventoDeSeguranca(e.tipo),
    entidade: 'conta',
    entidadeId: conta,
    usuariosAfetados: afetados,
    detalhes: { ...(e.detalhes ?? {}) },
  }
}

/** Grava o evento. Nunca lança: ver "A GRAVAÇÃO NUNCA DERRUBA A TROCA" no topo. */
export async function registrarEventoDeSeguranca(e: EventoDeSeguranca): Promise<void> {
  if (!bancoConfigurado()) return
  try {
    const linha = montarEventoDeSeguranca(e, Date.now())
    await executarNoBanco((tx) => registrarAuditoria(tx, linha))
  } catch (err) {
    console.warn(
      `[seguranca] evento ${nomeDoEventoDeSeguranca(e.tipo)} não gravado no audit_log:`,
      err instanceof Error ? err.message : err,
    )
  }
}

/* ---------- Pix e dados bancários ---------- */

const CAMPOS_BANCARIOS = ['chavePix', 'tipoChavePix', 'banco', 'agencia', 'conta', 'tipoConta'] as const

export type CampoBancario = (typeof CAMPOS_BANCARIOS)[number]

export type DadosBancariosComparaveis = { [C in CampoBancario]?: string }

/**
 * Quais campos bancários o cliente MUDOU (nomes, nunca valores). As duas pontas vão
 * ao mesmo formato antes de comparar — sem espaço nas bordas, campo vazio igual a
 * campo ausente —, senão o formulário reenviado depois de confirmar pareceria mudança.
 * É a única régua de "mudou o Pix?": serve à guarda de `salvarCadastro` e ao evento.
 */
export function camposBancariosAlterados(
  antes: DadosBancariosComparaveis | undefined,
  depois: DadosBancariosComparaveis | undefined,
): CampoBancario[] {
  return CAMPOS_BANCARIOS.filter((c) => (antes?.[c] ?? '').trim() !== (depois?.[c] ?? '').trim())
}
