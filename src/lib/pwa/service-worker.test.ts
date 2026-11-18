/**
 * O service worker de verdade, executado contra um navegador de mentira.
 *
 * Os testes de `instalacao.test.ts` olham o TEXTO do worker (procuram trechos). Aqui o texto roda: o script gerado por
 * `montarServiceWorker` é executado num contexto isolado (`node:vm`) com `self`, `caches` e `fetch` falsos, e cada pedido
 * é simulado como o navegador o faria. É a prova do que o MD do PWA promete na decisão D1 — "o service worker nunca
 * guarda HTML, API nem dados" — sem depender de um aparelho: o que o cliente via de errado (saldo velho, tela de
 * login velha) só pode vir de uma resposta guardada, e aqui se confere que nenhuma é.
 *
 * Frente E (PWA no iPhone), 17/11/2026. Não substitui o teste em Safari de verdade (ver docs/pwa/DIAGNOSTICO_PWA.md).
 */

import { createContext, runInContext } from 'node:vm'

import { describe, expect, it } from 'vitest'

import { montarServiceWorker } from './service-worker'

const ORIGEM = 'https://realolimpico.test'

type Ouvinte = (evento: unknown) => void

interface PedidoSimulado {
  url: string
  method?: string
  mode?: string
}

/** Um cache falso, indexado pela URL absoluta — o suficiente para `add`, `match` e `put`. */
function criarCache(buscarNaRede: (url: string) => Promise<Response>, gravacoes: string[]) {
  const guardado = new Map<string, Response>()
  const chave = (req: string | { url: string }): string =>
    typeof req === 'string' ? new URL(req, ORIGEM).href : req.url
  return {
    guardado,
    async add(req: string): Promise<void> {
      const resposta = await buscarNaRede(chave(req))
      guardado.set(chave(req), resposta)
    },
    async match(req: string | { url: string }): Promise<Response | undefined> {
      return guardado.get(chave(req))
    },
    async put(req: { url: string }, resposta: Response): Promise<void> {
      gravacoes.push(new URL(req.url).pathname)
      guardado.set(chave(req), resposta)
    },
  }
}

/** Sobe o worker numa "página" falsa e devolve os controles para simular pedidos. */
function subirWorker(versao = 'dpl_TESTE') {
  const ouvintes: Record<string, Ouvinte> = {}
  const idas: string[] = []
  const gravacoes: string[] = []
  const estado: { rede: (url: string) => Promise<Response> } = {
    rede: async () => new Response('conteudo', { status: 200 }),
  }

  const buscarNaRede = (url: string): Promise<Response> => {
    idas.push(new URL(url).pathname)
    return estado.rede(url)
  }

  const caches = new Map<string, ReturnType<typeof criarCache>>()
  const armazem = {
    async open(nome: string) {
      let cache = caches.get(nome)
      if (!cache) {
        cache = criarCache(buscarNaRede, gravacoes)
        caches.set(nome, cache)
      }
      return cache
    },
    async keys(): Promise<string[]> {
      return [...caches.keys()]
    },
    async delete(nome: string): Promise<boolean> {
      return caches.delete(nome)
    },
    /** `caches.match` olha todos os caches, como o de verdade. */
    async match(req: string): Promise<Response | undefined> {
      for (const cache of caches.values()) {
        const achado = await cache.match(req)
        if (achado) return achado
      }
      return undefined
    },
  }

  const avisos = { skipWaiting: 0, claim: 0, preloadLigado: 0 }
  const self = {
    location: { origin: ORIGEM },
    addEventListener: (tipo: string, ouvinte: Ouvinte): void => {
      ouvintes[tipo] = ouvinte
    },
    skipWaiting: async (): Promise<void> => {
      avisos.skipWaiting += 1
    },
    clients: {
      claim: async (): Promise<void> => {
        avisos.claim += 1
      },
    },
    registration: {
      navigationPreload: {
        enable: async (): Promise<void> => {
          avisos.preloadLigado += 1
        },
      },
    },
  }

  const contexto = createContext({ self, caches: armazem, fetch: (req: { url: string }) => buscarNaRede(req.url), URL, Response })
  runInContext(montarServiceWorker(versao), contexto)

  /** Dispara `install` ou `activate` e espera o que o worker pediu para aguardar (`waitUntil`). */
  async function ciclo(tipo: 'install' | 'activate'): Promise<void> {
    const espera: Promise<unknown>[] = []
    ouvintes[tipo]?.({ waitUntil: (p: Promise<unknown>) => espera.push(p) })
    await Promise.all(espera)
  }

  /**
   * Simula um pedido. Devolve `null` se o worker NÃO interveio (o navegador vai direto à rede), ou a resposta que o
   * worker deu. `preload` é a resposta da pré-carga de navegação, quando houver.
   */
  async function pedir(pedido: PedidoSimulado, preload?: Response): Promise<Response | null> {
    const captura: { resposta: Promise<Response> | null } = { resposta: null }
    ouvintes.fetch?.({
      request: { method: pedido.method ?? 'GET', url: new URL(pedido.url, ORIGEM).href, mode: pedido.mode ?? 'no-cors' },
      preloadResponse: Promise.resolve(preload),
      respondWith: (resposta: Promise<Response> | Response): void => {
        captura.resposta = Promise.resolve(resposta)
      },
    })
    return captura.resposta ? await captura.resposta : null
  }

  return { estado, idas, gravacoes, caches, avisos, ciclo, pedir, ouvintes }
}

describe('service worker em execução', () => {
  it('registra install, activate e fetch', () => {
    const w = subirWorker()
    expect(Object.keys(w.ouvintes).sort()).toEqual(['activate', 'fetch', 'install'])
  })

  describe('install e activate', () => {
    it('install guarda só o casco (tela sem conexão, ícone e emblema) e assume sem esperar as abas fecharem', async () => {
      const w = subirWorker('dpl_V1')
      await w.ciclo('install')
      const guardado = w.caches.get('ro-casco-dpl_V1')?.guardado
      expect([...(guardado?.keys() ?? [])].map((u) => new URL(u).pathname).sort()).toEqual([
        '/brand/logo-real-olimpico-emblema.webp',
        '/offline.html',
        '/pwa/icon-192.png',
      ])
      expect(w.avisos.skipWaiting).toBe(1)
    })

    it('um arquivo do casco fora do ar não impede o worker de instalar (sem worker não há instalação nem atualização)', async () => {
      const w = subirWorker()
      w.estado.rede = async () => {
        throw new Error('sem rede')
      }
      await expect(w.ciclo('install')).resolves.toBeUndefined()
      expect(w.avisos.skipWaiting).toBe(1)
    })

    it('activate apaga o cache de versões antigas, mantém o atual e não mexe em cache de outra origem', async () => {
      const w = subirWorker('dpl_NOVA')
      w.caches.set('ro-casco-dpl_ANTIGA', criarCache(async () => new Response(''), []))
      w.caches.set('ro-casco-dpl_NOVA', criarCache(async () => new Response(''), []))
      w.caches.set('outro-app-cache', criarCache(async () => new Response(''), []))
      await w.ciclo('activate')
      expect([...w.caches.keys()].sort()).toEqual(['outro-app-cache', 'ro-casco-dpl_NOVA'])
      expect(w.avisos.claim).toBe(1)
      expect(w.avisos.preloadLigado).toBe(1)
    })
  })

  describe('navegação (o HTML da página)', () => {
    it('vai sempre à rede e NUNCA guarda a resposta', async () => {
      const w = subirWorker()
      await w.ciclo('install')
      w.gravacoes.length = 0
      w.estado.rede = async () => new Response('<html>saldo R$ 1.000,00</html>', { status: 200 })

      const resposta = await w.pedir({ url: '/inicio', mode: 'navigate' })

      expect(await resposta?.text()).toContain('saldo R$ 1.000,00')
      expect(w.gravacoes, 'nenhum HTML pode ir para o cache').toEqual([])
    })

    it('a segunda visita não serve a primeira: saldo novo na rede, saldo novo na tela', async () => {
      const w = subirWorker()
      await w.ciclo('install')
      w.estado.rede = async () => new Response('saldo 1.000', { status: 200 })
      await w.pedir({ url: '/inicio', mode: 'navigate' })
      w.estado.rede = async () => new Response('saldo 2.500', { status: 200 })
      const segunda = await w.pedir({ url: '/inicio', mode: 'navigate' })
      expect(await segunda?.text()).toBe('saldo 2.500')
    })

    it('usa a resposta da pré-carga de navegação, sem pedir de novo', async () => {
      const w = subirWorker()
      await w.ciclo('install')
      w.idas.length = 0
      const resposta = await w.pedir({ url: '/mercado', mode: 'navigate' }, new Response('da pré-carga', { status: 200 }))
      expect(await resposta?.text()).toBe('da pré-carga')
      expect(w.idas).toEqual([])
    })

    it('redirecionamento (start_url deslogado: /inicio → /entrar) passa intacto e nada é guardado', async () => {
      const w = subirWorker()
      await w.ciclo('install')
      w.gravacoes.length = 0
      w.estado.rede = async () => Response.redirect(`${ORIGEM}/entrar`, 307)

      const resposta = await w.pedir({ url: '/inicio', mode: 'navigate' })

      expect(resposta?.status).toBe(307)
      expect(resposta?.headers.get('location')).toBe(`${ORIGEM}/entrar`)
      expect(w.gravacoes).toEqual([])
    })

    it('sem rede, mostra a tela "Sem conexão" e não o erro do navegador', async () => {
      const w = subirWorker()
      await w.ciclo('install')
      w.estado.rede = async () => {
        throw new TypeError('Failed to fetch')
      }
      const resposta = await w.pedir({ url: '/inicio', mode: 'navigate' })
      expect(resposta?.status).toBe(200)
      expect(await resposta?.text()).toBe('conteudo') // o que o casco guardou como /offline.html
    })

    it('sem rede e sem a tela guardada, devolve erro de rede (nunca um HTML velho de outra rota)', async () => {
      const w = subirWorker()
      w.estado.rede = async () => {
        throw new TypeError('Failed to fetch')
      }
      const resposta = await w.pedir({ url: '/inicio', mode: 'navigate' })
      expect(resposta?.type).toBe('error')
    })
  })

  describe('o que o worker nem toca', () => {
    it('API, em qualquer método', async () => {
      const w = subirWorker()
      await w.ciclo('install')
      expect(await w.pedir({ url: '/api/state' })).toBeNull()
      expect(await w.pedir({ url: '/api/relatorios/dre', mode: 'cors' })).toBeNull()
      expect(await w.pedir({ url: '/api/state', method: 'POST' })).toBeNull()
    })

    it('POST e outros métodos que mudam estado (Server Actions do Next usam POST)', async () => {
      const w = subirWorker()
      await w.ciclo('install')
      for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
        expect(await w.pedir({ url: '/inicio', method, mode: 'cors' }), method).toBeNull()
      }
    })

    it('outra origem (Supabase, Mercado Pago, Correios, Google)', async () => {
      const w = subirWorker()
      await w.ciclo('install')
      expect(await w.pedir({ url: 'https://accounts.google.com/o/oauth2/v2/auth', mode: 'navigate' })).toBeNull()
      expect(await w.pedir({ url: 'https://api.mercadopago.com/v1/payments', mode: 'cors' })).toBeNull()
    })

    it('busca de dados do Next (RSC) de uma tela: segue para a rede, sem cache', async () => {
      const w = subirWorker()
      await w.ciclo('install')
      expect(await w.pedir({ url: '/mercado?_rsc=abc123', mode: 'cors' })).toBeNull()
      expect(await w.pedir({ url: '/conta/extrato', mode: 'cors' })).toBeNull()
    })
  })

  describe('estáticos imutáveis e de marca', () => {
    it('cache primeiro: a segunda vez nem vai à rede', async () => {
      const w = subirWorker()
      await w.ciclo('install')
      w.idas.length = 0

      const primeira = await w.pedir({ url: '/_next/static/chunks/app-1f3a.js' })
      const segunda = await w.pedir({ url: '/_next/static/chunks/app-1f3a.js' })

      expect(primeira?.status).toBe(200)
      expect(segunda?.status).toBe(200)
      expect(w.idas).toEqual(['/_next/static/chunks/app-1f3a.js'])
    })

    it('guarda só resposta 200: erro e conteúdo parcial ficam de fora', async () => {
      const w = subirWorker()
      await w.ciclo('install')
      w.gravacoes.length = 0
      w.estado.rede = async () => new Response('não achei', { status: 404 })
      await w.pedir({ url: '/_next/static/chunks/sumiu.js' })
      expect(w.gravacoes).toEqual([])
    })
  })
})
