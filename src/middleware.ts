/* ============================================================================
 * REDE DE SEGURANÇA DE ROTAS — fecha a brecha do "público por padrão".
 *
 * O PROBLEMA QUE ESTE ARQUIVO RESOLVE. Até 19/09/2026 o projeto não tinha
 * middleware. A autenticação vivia em dois lugares — o layout de `(app)` e o
 * `membroDaPagina()` de `(admin)` — e nada olhava a requisição antes dela
 * chegar na rota. A consequência não era um bug, era um padrão perigoso: uma
 * página criada fora desses dois grupos nascia acessível sem login, e nem
 * build, nem typecheck, nem lint acusavam. Só se descobria tentando a URL.
 *
 * A INVERSÃO. Aqui o padrão passa a ser o contrário: tudo exige sessão, menos
 * o que estiver declarado em ROTAS_PUBLICAS. Abrir uma rota ao público vira um
 * ato deliberado, escrito, que aparece no diff e pode ser revisado. Esquecer
 * agora falha para o lado fechado.
 *
 * ISTO É REDE, NÃO É A AUTORIDADE. As guardas de layout continuam exatamente
 * onde estavam, e são elas que decidem de verdade. Middleware do Next já teve
 * bypass por cabeçalho (CVE-2025-29927, corrigida na versão que usamos), e
 * depender só dele seria trocar um problema por outro. Aqui é defesa em
 * profundidade: esta camada garante que nada fica exposto por esquecimento, e
 * a camada de baixo garante que o usuário certo vê a coisa certa.
 *
 * AUTENTICAÇÃO, NÃO AUTORIZAÇÃO. Este arquivo responde "tem sessão válida?".
 * Quem responde "esta pessoa pode ver isto?" é a página — o papel de equipe do
 * painel, a posse da moeda no certificado, a permissão de cada ação.
 * ==========================================================================*/

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

import { ehRotaPublica } from '@/server/rotas-publicas'
import { COOKIE_NAME, SegredoDeSessaoAusente, emailDoCookie } from '@/server/session-core'

/**
 * Para onde mandar quem não tem sessão.
 *
 * `/admin/*` vai para `/painel`, e NUNCA para `/entrar`. Não é preferência: em
 * 14/09/2026 o painel publicado pareceu não existir justamente porque o destino
 * estava errado (RA-48), e a regra ficou registrada no CLAUDE.md.
 */
function destinoDeQuemNaoTemSessao(req: NextRequest): NextResponse {
  const { pathname } = req.nextUrl

  // API responde 401 em JSON: redirecionar um fetch para uma página de login
  // devolveria HTML onde o cliente espera dados, e o erro apareceria como
  // "JSON inválido" — longe da causa.
  if (pathname.startsWith('/api/')) {
    return NextResponse.json(
      { error: 'Sessão expirada.' },
      { status: 401, headers: { 'Cache-Control': 'no-store' } },
    )
  }

  const destino = req.nextUrl.clone()
  destino.pathname = pathname.startsWith('/admin') ? '/painel' : '/entrar'
  destino.search = ''
  return NextResponse.redirect(destino)
}

export async function middleware(req: NextRequest): Promise<NextResponse> {
  if (ehRotaPublica(req.nextUrl.pathname)) return NextResponse.next()

  let email: string | null = null
  try {
    email = await emailDoCookie(req.cookies.get(COOKIE_NAME)?.value)
  } catch (e) {
    /*
     * Faltando SESSION_SECRET em produção, `emailDoCookie` lança. Aqui isso é
     * tratado como "sem sessão" em vez de derrubar a requisição: o middleware
     * roda em TODA rota, então propagar o erro tiraria do ar também a landing,
     * os termos e o suporte. Quem precisa quebrar visivelmente é a rota
     * protegida, e ela continua quebrando — o layout confere a sessão de novo
     * e ali o erro sobe.
     */
    if (!(e instanceof SegredoDeSessaoAusente)) throw e
  }

  return email ? NextResponse.next() : destinoDeQuemNaoTemSessao(req)
}

export const config = {
  /*
   * Fora do alcance: os estáticos do Next, o favicon, as logos da marca e os
   * arquivos de raiz que buscadores pedem. Tudo o mais passa por aqui —
   * inclusive rota que ainda não existe, que é exatamente o ponto.
   */
  matcher: ['/((?!_next/static|_next/image|favicon.ico|brand/|robots.txt|sitemap.xml).*)'],
}
