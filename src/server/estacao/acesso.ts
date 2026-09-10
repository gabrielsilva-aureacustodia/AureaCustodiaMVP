/* ============================================================================
 * ATENÇÃO — MÓDULO EXCLUSIVO DE SERVIDOR.
 *
 * Lê AUREA_ESTACAO_TOKEN. Decide se quem bateu na rota é a bancada — não
 * importe de Client Component.
 * ==========================================================================*/

import 'server-only'

import { timingSafeEqual } from 'node:crypto'

/**
 * A ESTAÇÃO NÃO É UM USUÁRIO.
 *
 * Ela não tem sessão, não tem cookie e não aparece em `state.users`. É uma
 * máquina numa bancada, e o que a identifica é uma chave própria — decisão E.4
 * da frente E. Reaproveitar a sessão de um sócio significaria que fechar o
 * navegador dele derruba a análise no meio, e que o vídeo de custódia ficaria
 * assinado por "quem estava logado", não por quem operou.
 *
 * O molde é o mesmo de `src/server/relatorios/acesso.ts`, inclusive a
 * comparação em tempo constante: token de API comparado com `===` vaza o
 * tamanho do prefixo certo pelo tempo de resposta.
 */
export function tokenDaEstacaoValido(recebido: string | null | undefined): boolean {
  const esperado = process.env.AUREA_ESTACAO_TOKEN
  // Sem a variável, o acesso da bancada está DESLIGADO. Não há fallback para
  // um valor de desenvolvimento: uma rota que grava recibo de custódia não
  // pode ficar aberta porque alguém esqueceu de configurar o ambiente.
  if (!esperado || esperado.length < 16 || !recebido) return false
  const a = Buffer.from(recebido, 'utf8')
  const b = Buffer.from(esperado, 'utf8')
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

/** Lê o token do cabeçalho `Authorization: Bearer …`. */
export function tokenDoCabecalho(auth: string | null): string | null {
  if (!auth) return null
  return auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : null
}

export type AcessoEstacao =
  | { ok: true }
  | { ok: false; status: 401 | 503; erro: string }

/**
 * Autoriza uma requisição da bancada.
 *
 * Distingue "não configurado" (503) de "chave errada" (401) de propósito: o
 * operador que vê 503 sabe que falta variável na Vercel; o que vê 401 sabe que
 * o `estacao.json` do notebook está com a chave errada. Um 401 genérico faria
 * as duas falhas parecerem a mesma, e a segunda é a única que ele resolve
 * sozinho.
 */
export function autorizarEstacao(auth: string | null): AcessoEstacao {
  const esperado = process.env.AUREA_ESTACAO_TOKEN
  if (!esperado || esperado.length < 16) {
    return {
      ok: false,
      status: 503,
      erro: 'A estação não está habilitada neste ambiente: falta AUREA_ESTACAO_TOKEN.',
    }
  }
  if (!tokenDaEstacaoValido(tokenDoCabecalho(auth))) {
    return { ok: false, status: 401, erro: 'Chave da estação inválida.' }
  }
  return { ok: true }
}
