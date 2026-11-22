/**
 * Regressão do B01 (QA do Davi, 22/11/2026): nenhuma rota, página ou componente novo pode entregar o `AppState`
 * COMPLETO ao navegador. O único caminho é `visaoDoUsuario` (`src/server/estado-do-usuario.ts`).
 *
 * É uma varredura estática do código, como `session-core.test.ts` faz com o núcleo da sessão: barata, sem banco,
 * e falha NA HORA em que alguém abrir um caminho novo. Se falhar, não "ajuste a lista": leia o comentário do
 * teste que quebrou, decida se o caminho novo entrega dado de outra conta e, só então, acrescente-o aqui.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

function arquivos(dir: string, achados: string[] = []): string[] {
  for (const nome of readdirSync(dir)) {
    const caminho = join(dir, nome)
    if (statSync(caminho).isDirectory()) arquivos(caminho, achados)
    else if (/\.tsx?$/.test(nome) && !/\.test\.tsx?$/.test(nome)) achados.push(caminho)
  }
  return achados
}

const norm = (f: string): string => f.replace(/\\/g, '/')
const todos = arquivos('src').map((f) => ({ f: norm(f), t: readFileSync(f, 'utf8') }))

describe('o estado completo nunca vai ao navegador (B01)', () => {
  it('o AppProvider só recebe a visão do usuário', () => {
    const usos = todos.filter(({ t }) => /initialState=\{/.test(t))
    expect(usos.length).toBeGreaterThan(0)
    for (const { f, t } of usos) {
      expect(t, `${f}: initialState precisa vir de visaoDoUsuario(...)`).toMatch(/initialState=\{visaoDoUsuario\(/)
      expect(t, `${f}: initialState={state} entrega o estado inteiro`).not.toMatch(/initialState=\{state\}/)
    }
  })

  it('nenhum arquivo serializa o estado inteiro (JSON.stringify de state/estado, fora do cliente que só compara)', () => {
    const suspeitos = todos
      .filter(({ f }) => f !== 'src/components/providers/AppProvider.tsx') // compara a VISÃO já filtrada com a anterior
      .filter(({ t }) => /JSON\.stringify\(\s*(state|estado|getState\(\))\b/.test(t))
      .map(({ f }) => f)
    expect(suspeitos).toEqual([])
  })

  it('rotas de API e páginas só devolvem state pela visão (NextResponse.json({ state: ... }))', () => {
    const vazando = todos
      .filter(({ f }) => f.startsWith('src/app/'))
      .filter(({ t }) => /(?:NextResponse|Response)\.json\([^)]*(?:[{,]\s*state\s*[,}]|\bstate:\s*state\b)/.test(t))
      .map(({ f }) => f)
    expect(vazando, 'devolve { state } sem visaoDoUsuario').toEqual([])

    const route = todos.find(({ f }) => f === 'src/app/api/state/route.ts')
    expect(route?.t).toContain('state: visaoDoUsuario(state, session)')
  })

  it('Server Component do cliente (app) passa ao cliente só a visão — nunca props com state inteiro', () => {
    const props = todos
      .filter(({ f }) => f.startsWith('src/app/(app)/') && /(page|layout)\.tsx$/.test(f))
      .filter(({ t }) => /<[A-Z]\w*[^>]*\b(state|estado)=\{(state|estado)\}/.test(t))
      .map(({ f }) => f)
    expect(props).toEqual([])
  })

  /**
   * Quem lê o estado completo no servidor. Ler é normal (o servidor decide em cima dele); o que importa é o que
   * SAI. Lista fechada de propósito: rota ou página nova que chame getState() quebra aqui e obriga a revisão
   * "isto devolve dado de outra conta?". Revisadas em 22/11/2026:
   *  - layout (app) e api/state: entregam visaoDoUsuario;
   *  - cadastrar, entrar, page (raiz): só conferem se a sessão existe no estado, para redirecionar;
   *  - recibos/[coinId]: passa só o coinId, 404 para moeda alheia;
   *  - api/envios/etiqueta e api/rastreios: filtram pelo dono (ou permissão do painel) antes de responder;
   *  - admin/bancada e admin/configuracao: páginas do painel, com permissão própria conferida na página.
   */
  it('lista fechada de rotas e páginas que leem o estado completo no servidor', () => {
    const leem = todos
      .filter(({ f }) => f.startsWith('src/app/'))
      .filter(({ t }) => /\bgetState\(\)/.test(t))
      .map(({ f }) => f)
      .sort()
    expect(leem).toEqual(
      [
        'src/app/(admin)/admin/bancada/page.tsx',
        'src/app/(admin)/admin/configuracao/page.tsx',
        'src/app/(app)/layout.tsx',
        'src/app/(app)/recibos/[coinId]/page.tsx',
        'src/app/api/envios/etiqueta/[protocolo]/route.ts',
        'src/app/api/rastreios/route.ts',
        'src/app/api/state/route.ts',
        'src/app/cadastrar/page.tsx',
        'src/app/entrar/page.tsx',
        'src/app/page.tsx',
      ].sort(),
    )
  })

  it('Client Components não importam o estado do servidor nem a visão (o pseudônimo usa segredo)', () => {
    const clientes = todos.filter(({ t }) => /^\s*['"]use client['"]/.test(t))
    const intrusos = clientes
      .filter(({ t }) => /from '@\/server\/(state|estado-do-usuario)'/.test(t))
      .map(({ f }) => f)
    expect(intrusos).toEqual([])
  })
})
