/* ============================================================================
 * ATENÇÃO — MÓDULO EXCLUSIVO DE SERVIDOR.
 *
 * Lê AUREA_ADMIN_EMAILS e AUREA_RELATORIOS_TOKEN. Decide quem pode ver os
 * relatórios financeiros da empresa — não importe de Client Component.
 * ==========================================================================*/

import 'server-only'

import { timingSafeEqual } from 'node:crypto'

import { ehEmailDeBootstrap, type ChavePermissao } from '@/domain/admin/permissoes'
import { ACCOUNTS } from '@/domain/constants'
import { carregarMembro } from '@/server/admin/acesso'

/**
 * Quem é administrador PELO AMBIENTE — o bootstrap do painel.
 *
 * Com `AUREA_ADMIN_EMAILS` definida (lista separada por vírgula), vale ela.
 * Sem ela, valem as sete contas de sócios do seed (`ACCOUNTS`): é o ambiente
 * de teste, e os sócios são exatamente quem precisa ver a DRE. Uma conta
 * criada por `/criar-conta` NÃO é administradora em nenhum dos dois casos.
 *
 * Desde a C1 (13/09/2026) a regra mora em src/domain/admin/permissoes.ts, e esta
 * função continua SÍNCRONA e com o mesmo resultado de antes — de propósito. Quem
 * pergunta "e os papéis do painel?" chama `autorizarRelatorioNoPainel` (abaixo) ou
 * `carregarMembro` (src/server/admin/acesso.ts). Trocar esta assinatura por uma
 * assíncrona faria um `if (!ehAdmin(x))` esquecido em outra frente virar
 * `!Promise`, que é sempre falso: todo mundo passaria a ser administrador.
 */
export function ehAdmin(email: string | null | undefined): boolean {
  return ehEmailDeBootstrap(email, process.env.AUREA_ADMIN_EMAILS, ACCOUNTS)
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
 * Decide o acesso a um relatório consultando os PAPÉIS DO PAINEL
 * (plano do Admin, seção 1.3). É a função que as rotas de `/api/relatorios/*` usam.
 *
 * A ordem é sessão primeiro: quem está logado com a permissão não precisa da
 * chave de integração, e uma chave errada na URL de quem está logado não derruba
 * a leitura. Substitui a versão síncrona antiga que ignorava papéis e conferia só
 * a lista de ambiente.
 *
 *  - Sessão de membro com `permissao` entra. Quem está no bootstrap do ambiente é
 *    `dev` e tem todas — para os sócios de hoje, nada muda.
 *  - Leitura na tela pede `resultados.ver`; CSV, XLSX e o envio ao Google Sheets
 *    pedem `resultados.exportar`. É o que permite um papel "contador" ver a DRE sem
 *    poder levar a planilha de extratos de todas as contas.
 *  - A chave de integração (`?token=`) continua valendo exatamente como antes: ela é
 *    do contador e do Sheets, não de uma pessoa da equipe.
 *
 * Mesmos códigos de sempre: 401 sem sessão e sem chave válida; 403 logado sem a
 * permissão (e sem chave).
 */
export async function autorizarRelatorioNoPainel(
  sessao: string | null,
  tokenRecebido: string | null,
  permissao: Extract<ChavePermissao, 'resultados.ver' | 'resultados.exportar'> = 'resultados.ver',
): Promise<Autorizacao> {
  if (sessao) {
    const membro = await carregarMembro(sessao)
    if (membro && membro.permissoes.includes(permissao)) return { ok: true, ator: sessao, via: 'sessao' }
    if (!tokenRecebido) {
      return {
        ok: false,
        status: 403,
        erro: membro ? 'Seu papel no painel não inclui esta leitura ou exportação.' : 'Esta área é restrita aos administradores.',
      }
    }
  }
  if (tokenDeIntegracaoValido(tokenRecebido)) return { ok: true, ator: 'integracao:token', via: 'token' }
  return { ok: false, status: 401, erro: 'Sessão expirada.' }
}

