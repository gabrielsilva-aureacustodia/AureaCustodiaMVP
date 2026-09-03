/* ============================================================================
 * ATENÇÃO — MÓDULO EXCLUSIVO DE SERVIDOR.
 *
 * Lê AUREA_ADMIN_EMAILS e AUREA_RELATORIOS_TOKEN. Decide quem pode ver os
 * relatórios financeiros da empresa — não importe de Client Component.
 * ==========================================================================*/

import 'server-only'

import { timingSafeEqual } from 'node:crypto'

import { ACCOUNTS } from '@/domain/constants'

/**
 * Quem é administrador — quem enxerga o ledger inteiro, a DRE e a trilha.
 *
 * Com `AUREA_ADMIN_EMAILS` definida (lista separada por vírgula), vale ela.
 * Sem ela, valem as sete contas de sócios do seed (`ACCOUNTS`): é o ambiente
 * de teste, e os sócios são exatamente quem precisa ver a DRE. Uma conta
 * criada por `/criar-conta` NÃO é administradora em nenhum dos dois casos.
 *
 * Registrado como atalho (RA-16.a): quando a frente A trouxer papéis de
 * usuário no Supabase Auth, a resposta passa a vir do banco, não do ambiente.
 */
export function ehAdmin(email: string | null | undefined): boolean {
  if (!email) return false
  const e = email.trim().toLowerCase()
  const lista = process.env.AUREA_ADMIN_EMAILS
  if (lista && lista.trim().length > 0) {
    return lista
      .split(',')
      .map((x) => x.trim().toLowerCase())
      .filter(Boolean)
      .includes(e)
  }
  return Object.prototype.hasOwnProperty.call(ACCOUNTS, e)
}

/**
 * Token de integração para leitura dos relatórios sem sessão — é o que o
 * `IMPORTDATA` do Google Sheets (que não manda cabeçalho nenhum) e o Power
 * Query do Excel usam. Sem a variável, o acesso por token está DESLIGADO e
 * só sessão de administrador vale.
 *
 * Comparação em tempo constante: token de API comparado com `===` vaza o
 * tamanho do prefixo certo pelo tempo de resposta.
 */
export function tokenDeIntegracaoValido(recebido: string | null | undefined): boolean {
  const esperado = process.env.AUREA_RELATORIOS_TOKEN
  if (!esperado || esperado.length < 16 || !recebido) return false
  const a = Buffer.from(recebido, 'utf8')
  const b = Buffer.from(esperado, 'utf8')
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

export type Autorizacao =
  | { ok: true; ator: string; via: 'sessao' | 'token' }
  | { ok: false; status: 401 | 403; erro: string }

/**
 * Decide o acesso a um relatório: sessão de administrador OU token de
 * integração (cabeçalho `Authorization: Bearer …` ou `?token=`). A ordem é
 * sessão primeiro — quem está logado como admin não precisa de token, e um
 * token errado numa URL de quem está logado não derruba a leitura.
 */
export function autorizarRelatorio(
  sessao: string | null,
  tokenRecebido: string | null,
): Autorizacao {
  if (sessao) {
    if (ehAdmin(sessao)) return { ok: true, ator: sessao, via: 'sessao' }
    if (!tokenRecebido) return { ok: false, status: 403, erro: 'Esta área é restrita aos administradores.' }
  }
  if (tokenDeIntegracaoValido(tokenRecebido)) return { ok: true, ator: 'integracao:token', via: 'token' }
  return { ok: false, status: 401, erro: 'Sessão expirada.' }
}
