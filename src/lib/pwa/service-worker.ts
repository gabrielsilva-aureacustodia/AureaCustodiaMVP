/**
 * Texto do service worker do Real Olímpico, montado como string para que a VERSÃO do deploy entre dentro dele.
 *
 * POR QUE O SERVICE WORKER É UMA ROTA E NÃO UM ARQUIVO EM public/
 * ---------------------------------------------------------------
 * O navegador decide "tem versão nova do app?" comparando os BYTES do service worker. Um `public/sw.js` fixo nunca
 * muda entre deploys, e então `registration.update()` jamais encontra nada: quem deixa o app aberto ou em segundo
 * plano ficaria com o sistema velho até recarregar a página por conta própria. Com a versão do deploy escrita no
 * texto (src/app/sw.js/route.ts), cada deploy produz um arquivo diferente e o app percebe a mudança sozinho.
 *
 * O QUE ELE FAZ — e, de propósito, o que ele NÃO faz
 * --------------------------------------------------
 * O Real Olímpico mostra saldo, ofertas, custódia e pagamentos. Um número velho vindo de cache é PIOR do que "sem
 * conexão": o cliente decidiria com base em dado que já mudou. Então o service worker:
 *   1. existe, porque o Chrome só oferece "Instalar app" a quem tem um com `fetch`;
 *   2. guarda só o que é IMUTÁVEL ou de marca (`/_next/static/**`, ícones, logos), para o app abrir rápido;
 *   3. se a rede cair numa navegação, mostra `/offline.html` — honesto — em vez do dinossauro do navegador.
 * Ele NUNCA guarda HTML, resposta de /api/ nem payload RSC do Next. Nunca.
 *
 * ATUALIZAÇÃO AUTOMÁTICA
 * ----------------------
 * `skipWaiting()` no install e `clients.claim()` no activate fazem a versão nova assumir sem esperar as abas
 * fecharem. A página (src/components/pwa/RegistroDoServiceWorker.tsx) percebe a troca e recarrega num momento seguro.
 * Apagar os caches das versões anteriores acontece no activate.
 *
 * Escrito em JavaScript antigo (var, funções) porque roda cru no navegador, sem transpilar, e porque o texto passa por
 * um template do TypeScript: nada de crase nem `${}` aqui dentro.
 */

/** Tudo que entra no cache de "casco" de cada versão. Curto de propósito: nenhuma tela entra aqui. */
const PRE_CACHE: readonly string[] = ['/offline.html', '/pwa/icon-192.png', '/brand/logo-real-olimpico-emblema.webp']

export function montarServiceWorker(versao: string): string {
  return `/* Service worker do Real Olímpico — versão ${versao.replace(/[^\w.:-]/g, '_')}. Gerado por src/lib/pwa/service-worker.ts. */
'use strict';

var VERSAO = ${JSON.stringify(versao)};
var PREFIXO = 'ro-casco-';
var CACHE = PREFIXO + VERSAO;
var PRE_CACHE = ${JSON.stringify(PRE_CACHE)};

// Só o que é imutável (arquivos com hash no nome) ou de marca. Qualquer outra coisa passa direto pela rede.
var ESTATICO = /^\\/(_next\\/static\\/|pwa\\/|brand\\/)/;

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      // Item por item, e engolindo falha: um arquivo fora do ar não pode impedir o service worker de instalar,
      // porque sem ele o app deixa de ser instalável e de receber atualização.
      return Promise.all(PRE_CACHE.map(function (url) { return cache.add(url).catch(function () {}); }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (nomes) {
      return Promise.all(nomes
        .filter(function (nome) { return nome.indexOf(PREFIXO) === 0 && nome !== CACHE; })
        .map(function (nome) { return caches.delete(nome); }));
    }).then(function () {
      // Com a pré-carga de navegação ligada, a rede começa a responder enquanto o service worker ainda acorda:
      // sem ela, todo clique em link pagaria o tempo de partida do worker.
      if (self.registration.navigationPreload) return self.registration.navigationPreload.enable();
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  var req = event.request;

  // 1. Só leitura. POST, PUT e DELETE mudam estado no servidor — e nas Server Actions o Next usa POST.
  if (req.method !== 'GET') return;

  var url = new URL(req.url);

  // 2. Só o nosso domínio: Supabase, Mercado Pago e Correios passam direto, sem o worker no meio.
  if (url.origin !== self.location.origin) return;

  // 3. NUNCA a API. Saldo, ofertas e custódia jamais saem de cache.
  if (url.pathname.indexOf('/api/') === 0) return;

  // 4. Navegação (o documento da página): rede sempre; sem rede, a tela de "sem conexão". HTML não é guardado.
  if (req.mode === 'navigate') {
    event.respondWith((async function () {
      try {
        var antecipada = await event.preloadResponse;
        return antecipada || await fetch(req);
      } catch (erro) {
        var offline = await caches.match('/offline.html');
        return offline || Response.error();
      }
    })());
    return;
  }

  // 5. Estáticos imutáveis e de marca: cache primeiro. As buscas de dados do Next (RSC) não casam com o padrão
  //    e seguem direto para a rede.
  if (ESTATICO.test(url.pathname)) {
    event.respondWith(caches.open(CACHE).then(function (cache) {
      return cache.match(req).then(function (guardado) {
        if (guardado) return guardado;
        return fetch(req).then(function (resposta) {
          // 200 apenas: o cache recusa 206 (parcial) e não há por que guardar erro.
          if (resposta.status === 200) cache.put(req, resposta.clone());
          return resposta;
        });
      });
    }));
  }
});
`
}
