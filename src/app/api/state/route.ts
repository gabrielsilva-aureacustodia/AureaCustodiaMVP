/**
 * GET /api/state — a leitura que alimenta o ciclo de sincronização de 10s do
 * AppProvider. É o `loadState()` do monolito (linha 905), agora do outro lado
 * da rede.
 *
 * OS TRÊS "NÃO CACHEIE" PRECISAM ESTAR TODOS AQUI
 * -----------------------------------------------
 * Esta rota é o ponto onde ports deste tipo costumam quebrar em silêncio: em
 * desenvolvimento tudo funciona, e na Vercel a sincronização entre contas
 * simplesmente para de acontecer, sem erro nenhum no console.
 *
 *   1. `export const dynamic = 'force-dynamic'` — impede o Next de tentar
 *      pré-renderizar a rota no build. (Ler cookies já forçaria dinâmico, mas
 *      deixar explícito é o que documenta a intenção.)
 *   2. `Cache-Control: no-store` na resposta — impede o CDN da Vercel de guardar
 *      o corpo. Sem este cabeçalho, todo mundo passaria a ler o mesmo retrato do
 *      estado de dez minutos atrás.
 *   3. `cache: 'no-store'` no fetch do cliente (ver AppProvider) — impede o
 *      próprio navegador de devolver a resposta anterior.
 *
 * Faltando qualquer um dos três, o polling continua rodando e continua
 * recebendo 200 — só que sempre o mesmo conteúdo.
 */

import { NextResponse } from 'next/server'

import { getSessionEmail } from '@/server/session'
import { getState } from '@/server/state'

export const dynamic = 'force-dynamic'

/** Repetido em todas as respostas, inclusive nas de erro: um 401 cacheado prenderia o usuário fora. */
const SEM_CACHE = { 'Cache-Control': 'no-store, max-age=0' } as const

export async function GET(): Promise<NextResponse> {
  const session = await getSessionEmail()

  // Mesma frase que as server actions devolvem quando a sessão sumiu. O cliente
  // reage ao status 401, não ao texto — ele redireciona para o login.
  if (!session) {
    return NextResponse.json({ error: 'Sessão expirada.' }, { status: 401, headers: SEM_CACHE })
  }

  try {
    const state = await getState()
    return NextResponse.json({ state, session }, { headers: SEM_CACHE })
  } catch {
    // getState propaga exceção (banco fora do ar, variável de ambiente errada).
    // O AppProvider ignora respostas não-ok e mantém o último estado conhecido
    // na tela, então este texto nunca chega ao usuário — existe para o log e
    // para quem estiver depurando com o inspetor de rede aberto.
    return NextResponse.json(
      { error: 'Falha ao ler o estado.' },
      { status: 500, headers: SEM_CACHE },
    )
  }
}
