/**
 * `/sw.js` — o service worker do PWA, servido como rota para carregar a versão do deploy no próprio texto.
 * Por que rota e não `public/sw.js`, e o que o worker faz: src/lib/pwa/service-worker.ts.
 *
 * `force-static`: o texto é montado UMA vez, no build, e a versão congela ali. Na Vercel, `VERCEL_DEPLOYMENT_ID` é
 * único por deploy (mesmo redeploy do mesmo commit); sem ele vale o hash do commit; fora da Vercel, o instante do
 * build. Nos três casos cada build gera bytes diferentes, e é isso que dispara a atualização no aparelho.
 *
 * Rota PÚBLICA de propósito (src/server/rotas-publicas.ts + `matcher` do middleware): o navegador a busca sem
 * cookie, inclusive para quem está deslogado. O conteúdo é código estático sem dado de ninguém.
 */

import { montarServiceWorker } from '@/lib/pwa/service-worker'

export const dynamic = 'force-static'

const VERSAO = process.env.VERCEL_DEPLOYMENT_ID ?? process.env.VERCEL_GIT_COMMIT_SHA ?? `local-${new Date().toISOString()}`

export function GET(): Response {
  return new Response(montarServiceWorker(VERSAO), {
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      // O navegador já ignora o cache HTTP para o script do service worker, mas um CDN no meio não: sem isto,
      // um deploy novo poderia continuar entregando o arquivo velho por um tempo.
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Service-Worker-Allowed': '/',
    },
  })
}
