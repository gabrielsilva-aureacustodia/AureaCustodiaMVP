/**
 * A rede de segurança de rotas, verificada por dois ângulos.
 *
 * COMPORTAMENTO: o middleware deixa passar o que é público, barra o que não é,
 * e manda cada um para o lugar certo.
 *
 * INVENTÁRIO: o teste varre `src/app` e exige que TODA rota do projeto esteja
 * em uma de três situações declaradas — protegida por grupo, pública por
 * decisão, ou guardada por conta própria. Rota nova que não se encaixe reprova
 * a suíte.
 *
 * É o segundo teste que impede a brecha de voltar. Sem ele, o middleware
 * protegeria as rotas de hoje e alguém poderia, amanhã, abrir uma rota nova
 * acrescentando uma linha na lista de públicas sem ninguém reparar.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

import { NextRequest } from 'next/server'
import { beforeAll, describe, expect, it } from 'vitest'

import { middleware } from '@/middleware'
import { ROTAS_PUBLICAS_EXATAS, ehRotaPublica } from '@/server/rotas-publicas'
import { valorDoCookie } from '@/server/session-core'

const SEGREDO = 'segredo-de-teste-nao-usar-em-producao'
const EMAIL = 'rogeriopena@testeaurea.com.br'

beforeAll(() => {
  process.env.SESSION_SECRET = SEGREDO
})

function requisicao(caminho: string, cookie?: string): NextRequest {
  const req = new NextRequest(new URL(`http://localhost:3000${caminho}`))
  if (cookie) req.cookies.set('aurea_session', cookie)
  return req
}

/** NextResponse.next() sinaliza continuidade por cabeçalho, não por status. */
function passou(res: Response): boolean {
  return res.headers.get('x-middleware-next') === '1'
}

describe('rotas públicas passam sem sessão', () => {
  it('cada página pública da lista', async () => {
    for (const rota of ROTAS_PUBLICAS_EXATAS) {
      expect(passou(await middleware(requisicao(rota))), `${rota} deveria ser pública`).toBe(true)
    }
  })

  it('as que se autenticam por outro meio que não o cookie', async () => {
    const rotas = [
      '/api/webhooks/mercadopago',
      '/api/webhooks/whatsapp',
      '/api/cron/faturamento',
      '/api/cron/shipping',
      '/api/estacao',
      '/api/estacao/fila',
      '/api/estacao/analise/fechar',
      '/entrar/callback',
      '/entrar/sair',
      '/api/crypto',
    ]
    for (const rota of rotas) {
      expect(passou(await middleware(requisicao(rota))), `${rota} não pode ser barrada`).toBe(true)
    }
  })
})

describe('rotas protegidas exigem sessão válida', () => {
  it('sem cookie, página vai para /entrar', async () => {
    for (const rota of ['/inicio', '/mercado', '/vender', '/conta/extrato', '/recibos/RO-000001']) {
      const res = await middleware(requisicao(rota))
      expect(res.status, rota).toBe(307)
      expect(new URL(res.headers.get('location') ?? '').pathname, rota).toBe('/entrar')
    }
  })

  it('sem cookie, /admin vai para /painel e NUNCA para /entrar (RA-48)', async () => {
    for (const rota of ['/admin', '/admin/usuarios', '/admin/resultados/kpis']) {
      const res = await middleware(requisicao(rota))
      expect(res.status, rota).toBe(307)
      expect(new URL(res.headers.get('location') ?? '').pathname, rota).toBe('/painel')
    }
  })

  it('sem cookie, API responde 401 em JSON — não redireciona um fetch para HTML', async () => {
    const res = await middleware(requisicao('/api/state'))
    expect(res.status).toBe(401)
    expect(res.headers.get('content-type')).toContain('application/json')
    await expect(res.json()).resolves.toEqual({ error: 'Sessão expirada.' })
  })

  it('/entrar/nova-senha é protegida, apesar de começar com /entrar', async () => {
    const res = await middleware(requisicao('/entrar/nova-senha'))
    expect(res.status).toBe(307)
    expect(new URL(res.headers.get('location') ?? '').pathname).toBe('/entrar')
  })

  it('com cookie válido, passa', async () => {
    const cookie = await valorDoCookie(EMAIL)
    for (const rota of ['/inicio', '/admin', '/api/state', '/entrar/nova-senha']) {
      expect(passou(await middleware(requisicao(rota, cookie))), rota).toBe(true)
    }
  })

  it('com cookie forjado, não passa', async () => {
    const forjado = `${Buffer.from(EMAIL).toString('base64url')}.${'a'.repeat(64)}`
    const res = await middleware(requisicao('/inicio', forjado))
    expect(passou(res)).toBe(false)
    expect(res.status).toBe(307)
  })

  it('ROTA QUE NÃO EXISTE também é barrada — é esta a brecha que o arquivo fecha', async () => {
    const res = await middleware(requisicao('/pagina-nova-que-alguem-criou'))
    expect(passou(res)).toBe(false)
    expect(new URL(res.headers.get('location') ?? '').pathname).toBe('/entrar')
  })
})

describe('inventário: toda rota do projeto tem situação declarada', () => {
  /**
   * Rotas fora dos grupos `(app)` e `(admin)` que conferem a sessão por conta
   * própria. Entrar nesta lista é afirmar que o arquivo faz a verificação —
   * o teste abaixo confere que ele ao menos menciona a função que a faz.
   */
  const SE_PROTEGEM_SOZINHAS: Record<string, string> = {
    '/entrar/nova-senha': 'src/app/entrar/nova-senha/page.tsx',
    '/api/state': 'src/app/api/state/route.ts',
    '/api/eventos': 'src/app/api/eventos/route.ts',
    '/api/rastreios': 'src/app/api/rastreios/route.ts',
    '/api/relatorios': 'src/app/api/relatorios/route.ts',
    '/api/relatorios/[relatorio]': 'src/app/api/relatorios/[relatorio]/route.ts',
    '/api/relatorios/sheets': 'src/app/api/relatorios/sheets/route.ts',
    '/api/admin/conciliacao': 'src/app/api/admin/conciliacao/route.ts',
    '/api/envios/etiqueta/[protocolo]': 'src/app/api/envios/etiqueta/[protocolo]/route.ts',
    '/api/retiradas/etiqueta/[id]': 'src/app/api/retiradas/etiqueta/[id]/route.ts',
  }

  function rotas(dir: string, achados: string[] = []): string[] {
    for (const nome of readdirSync(dir)) {
      const caminho = join(dir, nome)
      if (statSync(caminho).isDirectory()) rotas(caminho, achados)
      else if (nome === 'page.tsx' || nome === 'route.ts') achados.push(caminho.replace(/\\/g, '/'))
    }
    return achados
  }

  /** `src/app/(app)/conta/extrato/page.tsx` -> `/conta/extrato` */
  function url(arquivo: string): string {
    const semRaiz = arquivo.replace(/^src\/app/, '').replace(/\/(page\.tsx|route\.ts)$/, '')
    const semGrupos = semRaiz.replace(/\/\([^)]+\)/g, '')
    return semGrupos === '' ? '/' : semGrupos
  }

  const todas = rotas('src/app')

  it('encontrou as rotas do projeto', () => {
    expect(todas.length).toBeGreaterThan(50)
  })

  it('nenhuma rota fica sem decisão de acesso', () => {
    const semDecisao = todas.filter((arquivo) => {
      // Dentro de (app) ou (admin): o layout do grupo já é a guarda.
      if (/\/\((app|admin)\)\//.test(arquivo)) return false
      const rota = url(arquivo)
      if (ehRotaPublica(rota)) return false
      if (rota in SE_PROTEGEM_SOZINHAS) return false
      return true
    })

    expect(
      semDecisao,
      'Rota fora de (app)/(admin) sem decisão declarada. Escolha uma: mover para um grupo ' +
        'protegido, declarar em src/server/rotas-publicas.ts, ou conferir a sessão no próprio ' +
        'arquivo e registrá-la em SE_PROTEGEM_SOZINHAS neste teste.',
    ).toEqual([])
  })

  it('quem diz se proteger sozinha realmente confere a sessão', () => {
    const mentirosas = Object.entries(SE_PROTEGEM_SOZINHAS).filter(([, arquivo]) => {
      const fonte = readFileSync(arquivo, 'utf8')
      return !/getSessionEmail|membroDaSessao|exigirPermissao|permissaoParaAcao/.test(fonte)
    })
    expect(mentirosas.map(([rota]) => rota)).toEqual([])
  })

  it('nenhuma rota pública declarada aponta para o vazio', () => {
    const existentes = new Set(todas.map(url))
    const fantasmas = ROTAS_PUBLICAS_EXATAS.filter((r) => !existentes.has(r))
    expect(fantasmas, 'rota pública declarada que não existe mais no disco').toEqual([])
  })
})
