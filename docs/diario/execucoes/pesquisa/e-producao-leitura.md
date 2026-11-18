# E · Leitura HTTP de produção — manifesto, service worker, `<head>`, ícones e `/inicio` (o "antes")

```
Frente:      E · manut-pwa-iphone (item 10b do Rogério)        Autor: Específico (chat local_dea20203…)
Alvo:        https://realolimpico.com.br  (produção, base de código 9e21fe1)
Medido em:   2026-11-17, de 22:38 a 22:40 (-03:00)  ·  GMT: 2026-11-18 01:38–01:40
Método:      só GET/HEAD com curl.exe 8.22 (sem POST, sem conta, sem cookie, sem navegador, sem servidor local, sem Playwright)
Substitui:   o antigo "e-emulacao-webkit.md" (cancelado por regra do Gabriel: nada de servidor local; e pausa de memória do Controle)
Como ler:    FATO = medido agora, saída real abaixo · SUPOSIÇÃO = minha leitura, sem prova · APARELHO = só um iPhone real decide
```

## CONCLUSÃO (leia só isto se tiver pressa)

1. **FATO — produção é o que o repositório diz.** O manifesto publicado é **idêntico** ao de `src/app/manifest.ts@9e21fe1`
   (`deepStrictEqual` verdadeiro) e o `/sw.js` publicado tem **3.310 bytes, idênticos** ao que `montarServiceWorker()` de
   `src/lib/pwa/service-worker.ts@9e21fe1` gera com a versão publicada (`dpl_13YTwLp5kFLQMAsKcZV3mVhjfhSx`). Nenhuma diferença
   além da versão. Logo, **o diagnóstico estático do código vale como diagnóstico de produção.**
2. **FATO — o manifesto e os ícones estão corretos em forma.** `200`, `Content-Type: application/manifest+json`, JSON válido,
   `id`, `name`, `start_url`, `scope`, `display: standalone`, ícones 192 e 512 `any` e 512 `maskable`, **todos existem, são PNG e têm
   a dimensão declarada**. O `apple-touch-icon` publicado é **180×180**, PNG de paleta **sem transparência** (sem `tRNS`; a imagem é o
   medalhão sobre fundo azul-noite opaco). Nenhum ícone quebrado.
3. **FATO — o `<head>` tem as metatags do iPhone**, tanto em `/` quanto em `/entrar`: `<link rel="manifest">`, `apple-touch-icon`
   `sizes="180x180"`, `apple-mobile-web-app-title`, `apple-mobile-web-app-status-bar-style=black`, `mobile-web-app-capable=yes`,
   `theme-color`. **Falta a `apple-mobile-web-app-capable`** (o Next só emite a versão sem prefixo). No iOS 26/27 isso é irrelevante
   para instalar; ver `e-ios-requisitos.md` §3.
4. **FATO — a `start_url` NÃO responde 200 direto:** `/inicio` sem sessão → **307**, `Location: /entrar` → **200** (1 salto,
   mesma origem, dentro do `scope: "/"`). **SUPOSIÇÃO:** o iOS tolera esse salto interno; não há fonte contra nem a favor
   (`e-ios-requisitos.md` §5.1). **APARELHO** decide qual tela abre.
5. **FATO — o service worker está como o D1 prometeu, por leitura do texto:** `200`, `application/javascript`,
   `Cache-Control: no-cache, no-store, must-revalidate`, `Service-Worker-Allowed: /`; navegação vai à rede e, sem rede, a
   `/offline.html`; **não há `cache.put` de HTML** (só `/_next/static/`, `/pwa/`, `/brand/`). **Isto não prova o comportamento no aparelho**
   (a emulação foi cancelada) — prova só o que o arquivo diz.
6. **Nada nesta leitura explica sozinho o "não funciona no iPhone".** Os candidatos reais continuam sendo os que só o aparelho mostra:
   cookie isolado do app instalado, Google no app, e a chave "Abrir como app web" do iOS 26. Candidatos **de código** que esta leitura
   encontrou (todos pequenos, ver §8): meta com prefixo ausente; `start_url` que passa por 307; o logo de `/entrar` leva à landing
   (que **pode** mostrar o convite de instalar dentro do app — a conferir no código/aparelho); pré-cache do service worker com um `.webp` de 772 KB.

---

## 1. (a) Cabeçalhos de `/manifest.webmanifest` e `/sw.js`

Comandos executados às 22:38:40 (-03:00). Saída real, sem filtro.

```
$ curl.exe -sI https://realolimpico.com.br/manifest.webmanifest
HTTP/1.1 200 OK
Accept-Ranges: bytes
Access-Control-Allow-Origin: *
Age: 192956
Cache-Control: public, max-age=0, must-revalidate
Content-Disposition: inline
Content-Length: 915
Content-Type: application/manifest+json
Date: Wed, 18 Nov 2026 01:38:40 GMT
Etag: "246e9064ff53ca5ed5808ce1b4d416b3"
Referrer-Policy: strict-origin-when-cross-origin
Server: Vercel
Strict-Transport-Security: max-age=63072000
Vary: rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-Matched-Path: /manifest.webmanifest
X-Vercel-Cache: HIT

$ curl.exe -sI https://realolimpico.com.br/sw.js
HTTP/1.1 200 OK
Accept-Ranges: bytes
Access-Control-Allow-Origin: *
Age: 192959
Cache-Control: no-cache, no-store, must-revalidate
Content-Disposition: inline
Content-Length: 3310
Content-Type: application/javascript; charset=utf-8
Date: Wed, 18 Nov 2026 01:38:40 GMT
Etag: "e4a8e53c862c5a3a0728e067b3d3897f"
Referrer-Policy: strict-origin-when-cross-origin
Server: Vercel
Service-Worker-Allowed: /
Strict-Transport-Security: max-age=63072000
Vary: rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-Matched-Path: /sw.js
X-Vercel-Cache: HIT
```
(Omiti só a linha `X-Vercel-Id`, que é identificador de requisição. O `GET` com `-D -` devolveu os mesmos cabeçalhos e o mesmo `Etag`.)

**Leitura:**
- **FATO** `manifest`: `application/manifest+json` é o tipo certo; `Cache-Control: public, max-age=0, must-revalidate` revalida a cada uso (bom: troca de
  manifesto chega rápido); `Access-Control-Allow-Origin: *` é inofensivo.
- **FATO** `sw.js`: `no-store` + `Service-Worker-Allowed: /` conferem com `next.config.mjs` e `src/app/sw.js/route.ts`.
  `X-Vercel-Cache: HIT` com `Age: 192959 s` (≈ 53,6 h) é o arquivo **estático do build** (a rota é `force-static`), não um cache velho de CDN:
  a `VERSAO` dentro do arquivo é a do deploy atual. **SUPOSIÇÃO**: o deploy em produção é de ≈ 15/11/2026 à tarde (hora de Brasília), pela idade do `Age`.
- **FATO** nenhum `Content-Security-Policy` nem `Permissions-Policy`: nada bloqueia o registro do service worker nem o manifesto.
- **FATO** `X-Frame-Options: DENY` em tudo (irrelevante para PWA; só impede ser embutido em iframe).

## 2. (e) Manifesto publicado × `src/app/manifest.ts`

Comando às 22:39:51: `node comparar.mjs` (Node 24.19; importa `manifest.ts` de `9e21fe1` por *type stripping* e compara com o JSON publicado).

```
manifesto publicado == manifest.ts@9e21fe1 (deepStrictEqual): true
campos publicados: id, name, short_name, description, lang, dir, start_url, scope, display,
                   background_color, theme_color, categories, icons, shortcuts, prefer_related_applications
```

Corpo publicado (915 bytes, `curl.exe -s -o manifest.json …`): `id: "/"`, `name`/`short_name: "Real Olímpico"`, `start_url: "/inicio"`, `scope: "/"`,
`display: "standalone"`, `background_color`/`theme_color: "#081226"`, ícones `icon-192.png` (192×192 `any`), `icon-512.png` (512×512 `any`),
`icon-maskable-512.png` (512×512 `maskable`), 3 `shortcuts` (`/mercado`, `/vender`, `/conta/extrato`), `prefer_related_applications: false`.

**Checagem estrutural (FATO, por leitura do JSON):** `name`/`short_name` ✔ · `start_url` dentro do `scope` ✔ · `display` ∈ {standalone} ✔ ·
ícones 192 e 512 `any` ✔ · maskable separado de `any` (boa prática) ✔ · `prefer_related_applications` não é `true` ✔ · servido por HTTPS ✔.
**SUPOSIÇÃO** (critério de instalabilidade do Chrome conhecido de memória; **não** reli a página da Google nesta sessão e **não** rodei o DevTools): isto basta
para o Chrome/Android oferecer "Instalar app". Fica para o aparelho Android.

## 3. (f) `/sw.js` publicado × `src/lib/pwa/service-worker.ts`

```
VERSAO publicada no sw.js: dpl_13YTwLp5kFLQMAsKcZV3mVhjfhSx
sw.js publicado == montarServiceWorker(versao publicada)@9e21fe1: true (3310 bytes publicado, 3310 bytes gerado)
```
**FATO: nenhuma diferença além da versão** (o arquivo gerado a partir do código de `9e21fe1` com a mesma versão é byte a byte o publicado).

**O que o texto do service worker faz (lido do arquivo gerado; FATO sobre o texto, não sobre o comportamento no aparelho):**
- `install`: abre o cache `ro-casco-<versão>` e adiciona, **item a item e engolindo falha**, `/offline.html`, `/pwa/icon-192.png` e `/brand/logo-real-olimpico-emblema.webp`; depois `skipWaiting()`.
- `activate`: apaga caches `ro-casco-*` de outras versões, liga `navigationPreload` e faz `clients.claim()`.
- `fetch`: ignora não-GET, outra origem e `/api/`; **navegação** → `preloadResponse || fetch(req)`, e na falha `caches.match('/offline.html')` (**HTML nunca é guardado**);
  estáticos que casam `^/(_next/static/|pwa/|brand/)` → cache primeiro, `cache.put` só com status 200. O resto vai direto à rede (RSC, páginas, dados).
- **D1 (nunca HTML de saldo): CONFERE por leitura.** Não existe caminho de código que grave página, `/api/` ou RSC.
- **Observação (SUPOSIÇÃO de custo, não defeito de função):** o pré-cache inclui `logo-real-olimpico-emblema.webp` com **772.108 bytes** (§5). Cada deploy cria um cache novo e
  baixa esse arquivo de novo, no celular do cliente, para mostrar um ícone que só a tela offline usa. Vale a Execução decidir se o pré-cache precisa dele (ou se a tela offline usa só o `icon-192`).
- No iOS 26+ o app **instala sem service worker** (`e-ios-requisitos.md` §8); ele só importa para `offline.html`. Este SW não é causa provável de falha de instalação.

## 4. (b) `<head>` publicado de `/` e de `/entrar`

Comandos às 22:38:50, com o *user agent* de um Safari de iPhone (`…iPhone OS 26_6… Version/26.6 Mobile/15E148 Safari/604.1`):
`curl.exe -s -D - -o raiz-iphone.html -A "<UA>" https://realolimpico.com.br/` e o mesmo para `/entrar`. **O HTML do UA de iPhone e o do UA padrão são byte a byte idênticos** nas duas páginas (`cmp`), então não há variação por navegador.

Cabeçalhos de resposta (FATO): `/` → `HTTP/1.1 200 OK`, `Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate`, `Content-Type: text/html; charset=utf-8`, `X-Matched-Path: /`, `X-Vercel-Cache: MISS`.
`/entrar` → `200 OK`, mesmos `Cache-Control` e tipo, `X-Matched-Path: /entrar`. **Nenhum `Set-Cookie` em nenhuma das duas.**

**`<head>` de `/entrar`** (13 tags; script abaixo extraído do HTML cru com `node extrair-head.cjs`, ignorando `preload`/`stylesheet`):
```
<title>Entrar | Real Olímpico</title>
<meta charSet="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<meta name="next-size-adjust" content=""/>
<meta name="theme-color" content="#081226"/>
<meta name="description" content="Acesse a plataforma de custódia e negociação do Real Olímpico."/>
<meta name="application-name" content="Real Olímpico"/>
<link rel="manifest" href="/manifest.webmanifest"/>
<meta name="format-detection" content="telephone=no"/>
<meta name="mobile-web-app-capable" content="yes"/>
<meta name="apple-mobile-web-app-title" content="Real Olímpico"/>
<meta name="apple-mobile-web-app-status-bar-style" content="black"/>
<link rel="icon" href="/icon.png?cfa10926ebc79665" type="image/png" sizes="512x512"/>
<link rel="apple-touch-icon" href="/apple-icon.png?46e70391fb139ad9" type="image/png" sizes="180x180"/>
```
**`<head>` de `/`** (28 tags): as mesmas 13 acima, com `title` "Real Olímpico | Guarda e marketplace de itens de coleção" e a descrição da landing, **mais** 15 tags de `og:*`/`twitter:*`
(imagem 1200×675). `<html lang="pt-BR">`. (As tags da lista são as de `<meta>`/`<link>` que sobraram depois de ignorar `preload`/`stylesheet`; não são todas as linhas do `<head>`.)

**Leitura:**
- **FATO** todas as metatags do iPhone que a Execução listou estão **no `<head>` do HTML cru** (não só no DOM depois do JavaScript): graças a `htmlLimitedBots: /.*/` em `next.config.mjs`, o Next não manda os metadados em *streaming* para o `<body>`.
  Contagem de tags de PWA no `<body>`: **0**.
- **FATO** o `apple-touch-icon` declara `sizes="180x180"` e o arquivo real tem 180×180 (§5): declarado = real.
- **FATO** **ausente**: `apple-mobile-web-app-capable` (a presente é `mobile-web-app-capable`). Também **ausentes** `apple-touch-startup-image` e `viewport-fit=cover` (não são necessários hoje).
- **FATO** o script de captura do convite (`window.addEventListener('beforeinstallprompt',function(e){window.__roPwaEvento=e})`) está **no início do `<body>`**, logo antes de `<main class="pub-page landing-page">`,
  e **aparece em `/` e em `/entrar`** (em cada uma há 2 ocorrências de "beforeinstallprompt": o `<script>` inline e a cópia dentro do payload do React/RSC). Vem do `layout.tsx` raiz, por isso está em todas as páginas.
  O fato é que ele fica no corpo, não no `<head>`; roda durante o parse, antes do React. Sem efeito no iPhone (não existe `beforeinstallprompt` no iOS).
- **FATO** `/` responde `private, no-cache, no-store` (página dinâmica, `MISS` a cada pedido): não é "estática do build". Sem relação com PWA; só explica por que o `<head>` da landing não vem de CDN.

## 5. (d) Ícones publicados — tipo, bytes, dimensões (lidas do cabeçalho `IHDR` do PNG)

Comandos às 22:39:24: `curl.exe -sI "<url>"` (filtrado com `grep` para `HTTP`, `content-type`, `content-length`, `cache-control`, `x-vercel-cache`, `age`, `etag`) e download com `curl.exe -s -o`; dimensões por script Node que lê os bytes 16–25 do PNG.

| URL (como o `<head>`/manifesto indica) | HTTP | Content-Type | Bytes | Dimensão real | Cor | Canal alfa / `tRNS` | `Cache-Control` |
|---|---|---|---|---|---|---|---|
| `/pwa/icon-192.png` (manifesto, `any`) | 200 | image/png | 14.823 | **192×192** | paleta 8 bits | **não** | `public, max-age=0, must-revalidate` |
| `/pwa/icon-512.png` (manifesto, `any`) | 200 | image/png | 88.321 | **512×512** | paleta 8 bits | **não** | idem |
| `/pwa/icon-maskable-512.png` (manifesto, `maskable`) | 200 | image/png | 53.174 | **512×512** | paleta 8 bits | **não** | idem |
| `/apple-icon.png?46e70391fb139ad9` (`apple-touch-icon`) | 200 | image/png | 11.115 | **180×180** | paleta 8 bits | **não** | `public, immutable, no-transform, max-age=31536000` |
| `/icon.png?cfa10926ebc79665` (`<link rel="icon">` 512) | 200 | image/png | 394.356 | 512×512 | RGB 8 bits | não | `public, immutable, …, max-age=31536000` |
| `/brand/logo-real-olimpico-emblema.webp` (pré-cache do SW) | 200 | image/webp | **772.108** | (webp; não medi) | — | — | `public, max-age=0, must-revalidate` |

**FATO:** declarado = real em todos os ícones do manifesto e no `apple-touch-icon`. **FATO:** o `apple-touch-icon` não tem transparência (paleta sem `tRNS`) — vi a imagem: medalhão dourado centrado sobre fundo azul-noite
liso (`#081226`-ish), sem canto vazado, **que é o formato que o iOS espera**. O ícone `maskable` serve só ao Android (o iOS o ignora; `e-ios-requisitos.md` §4).
**Observações (não são defeitos de PWA):** o favicon `icon.png` tem **394 KB** e é buscado em toda página; o `.webp` do emblema tem 772 KB e entra no pré-cache do SW.

## 6. (c) O que `/inicio` responde sem sessão

Comandos às 22:39:14, sem cookie, sem seguir redirecionamento onde importa. Saída real:

```
$ curl.exe -sI https://realolimpico.com.br/inicio
HTTP/1.1 307 Temporary Redirect
Cache-Control: public, max-age=0, must-revalidate
Content-Type: text/plain
Date: Wed, 18 Nov 2026 01:39:15 GMT
Location: /entrar
Referrer-Policy: strict-origin-when-cross-origin
Server: Vercel
Strict-Transport-Security: max-age=63072000
X-Content-Type-Options: nosniff
X-Frame-Options: DENY

$ curl.exe -s -o NUL -w "%{http_code} -> %{redirect_url}\n" https://realolimpico.com.br/inicio
307 -> https://realolimpico.com.br/entrar

$ curl.exe -s -o NUL -L -w "final=%{url_effective} codigo=%{http_code} saltos=%{num_redirects}\n" https://realolimpico.com.br/inicio
final=https://realolimpico.com.br/entrar codigo=200 saltos=1
```

Outras rotas, mesma hora (`-w "%{http_code} -> %{redirect_url}"`): `/painel` → **200**; `/admin` → **307 → /painel**; `/mercado` → **307 → /entrar**; `/offline.html` → **200**; `/entrar` → **200**.

**Leitura:**
- **FATO** a `start_url` do manifesto (`/inicio`) **não é 200**: é um 307 de 1 salto para `/entrar`, ambos em `https://realolimpico.com.br`, ambos dentro do `scope: "/"`. O `Location` é **relativo** (`/entrar`).
- **FATO** `/inicio` sem sessão não vaza dado: manda para a entrada. Para quem **tem** sessão (cookie) o `/inicio` presumivelmente responde 200 (não testado: exigiria cookie).
- **SUPOSIÇÃO** (alta, não provada): redirecionamento interno, dentro do escopo, não tira o app do modo standalone no iOS; não achei fonte que diga o contrário (`e-ios-requisitos.md` §5.1). **APARELHO.**
- **Opção para a Execução (decisão de produto, não minha):** como a `start_url` que quase todo cliente deslogado abre é, na prática, `/entrar`, uma `start_url` que responda **200 direto** tiraria uma variável
  do aparelho. Mexer no `middleware.ts` ou nas rotas públicas exige o teste de "nenhuma rota logada ficou pública" (ficha).

## 7. Tela de entrada dentro do app (o que o HTML publicado de `/entrar` oferece)

Lido de `entrar-iphone.html`: 2 campos (`type="email"` `autoComplete="username"`; `type="password"` `autoComplete="current-password"`), botões "Entrar" e "Entrar com Google", links "Real Olímpico … → `/`" (o logo) e "Criar conta → `/cadastrar`".
- **FATO** a tela é utilizável sem sessão: e-mail e senha são campos nativos; a senha se preenche pelo gerenciador de senhas do iOS (`autoComplete` correto).
- **FATO** o **logo** de `/entrar` leva a `/` (a landing). Dentro do app instalado, a landing está no escopo e continua mostrando o convite "Baixar app" (**SUPOSIÇÃO**: o componente esconde o convite quando `display-mode: standalone`; não conferi o código; **APARELHO**).
- **NÃO FEITO** (proibido: exige POST): nenhum login, nenhuma conta, nenhum teste do botão Google.

## 8. Candidatos a defeito nosso encontrados SÓ por esta leitura (para o diagnóstico da Execução)

| # | Achado | Tipo | Impacto no iPhone | Sugestão |
|---|---|---|---|---|
| 1 | Falta `apple-mobile-web-app-capable` (só a sem prefixo) | FATO | Nenhum no iOS 26/27; mínimo no 16.4–18; também libera `apple-touch-startup-image` no futuro | Acrescentar com `other:` no `metadata` (custo zero) |
| 2 | `start_url` = `/inicio` → 307 → `/entrar` (não é 200 direto) | FATO; efeito = SUPOSIÇÃO | Pode ser nada; só o aparelho diz | Decidir se vale uma `start_url` 200; senão registrar como "limite não comprovado" |
| 3 | Logo de `/entrar` → `/` (landing), que mostra o convite dentro do app | FATO (link) + SUPOSIÇÃO (convite) | Confunde quem já instalou | Conferir no código se o convite some em `display-mode: standalone` / `navigator.standalone` |
| 4 | Pré-cache do SW com `emblema.webp` de 772 KB, refeito a cada deploy | FATO | Dado móvel gasto; nenhum erro | Trocar por imagem leve ou tirar do pré-cache |
| 5 | Favicon `icon.png` de 394 KB buscado em toda página | FATO | Peso, não função | Fora do escopo da frente; anotar para o polimento |
| 6 | `shortcuts` e `background_color` do manifesto não valem no iOS | FATO (pesquisa) | Nenhum; é limite da Apple | Não prometer atalhos no iPhone |

**Nada achado que impeça instalar ou abrir.** Os ícones, o manifesto e o service worker estão consistentes entre si e com o código.

## 9. O que esta leitura prova × o que só um aparelho real prova

A emulação WebKit/Chromium (Playwright, Lighthouse, instalabilidade pelo DevTools) **não foi feita** por ordem do Gabriel e do Controle; isto reduz o que se prova aqui.

| Pergunta | Provado por esta leitura (FATO) | Só um iPhone/Android real prova |
|---|---|---|
| Manifesto válido e igual ao código | Sim (§2) | — |
| Ícones 192/512/maskable e 180×180 existem e têm o tamanho certo | Sim (§5) | O ícone aparecer certo na tela inicial |
| Metatags do iPhone no `<head>` cru | Sim (§4) | O iOS 26/27 usar o nome/ícone/barra como esperado |
| Cabeçalhos de `/manifest.webmanifest` e `/sw.js` | Sim (§1) | — |
| `start_url` e `scope` | Sim: 307 de 1 salto, tudo no escopo (§6) | **Qual tela abre** ao tocar no ícone; se o salto mantém o modo app |
| Texto do SW sem cache de HTML (D1) | Sim, por leitura (§3) | Que o SW **controla** a página e funciona no WebKit; comportamento offline real |
| Chrome/Android: instalável | **Não** (critério conhecido, sem DevTools) | O convite do Chrome e o app abrir em `standalone` |
| Lighthouse | **Não** — e a categoria PWA nem existe desde o Lighthouse 12 (05/2024) (https://github.com/GoogleChrome/lighthouse/releases) | Instalabilidade pelo DevTools (aba Application) |
| Sessão do app instalado (cookie copiado do Safari no ato de adicionar) | **Não** | Sim — `e-ios-requisitos.md` §6 e §11 |
| Login com Google no app instalado | **Não** (proibido testar: exige POST/conta) | Sim — §7 de `e-ios-requisitos.md` |
| Chave "Abrir como app web" do iOS 26; texto exato do botão em português | **Não** | Sim |
| Navegador embutido do Instagram/Facebook | **Não** | Sim |

## 10. Reprodução (somente leitura; PowerShell ou Bash com `curl.exe`)

```powershell
curl.exe -sI https://realolimpico.com.br/manifest.webmanifest
curl.exe -sI https://realolimpico.com.br/sw.js
curl.exe -sI https://realolimpico.com.br/inicio
curl.exe -s -o NUL -w "%{http_code} -> %{redirect_url}\n" https://realolimpico.com.br/inicio
curl.exe -s -o manifest.json https://realolimpico.com.br/manifest.webmanifest
curl.exe -s -o sw-publicado.js https://realolimpico.com.br/sw.js
curl.exe -s -o raiz.html https://realolimpico.com.br/
curl.exe -s -o entrar.html https://realolimpico.com.br/entrar
```
Os arquivos brutos desta leitura (HTML, manifesto, `sw-publicado.js`, o `sw-gerado-9e21fe1.js` e os ícones) ficaram no scratchpad da sessão e **não** entram no repositório.

## 11. Pendência: (g) Lighthouse remoto

**Não feito, por ordem.** Quando o Controle liberar: página pública do PageSpeed Insights sobre `https://realolimpico.com.br/`. Aviso honesto: o PageSpeed (Lighthouse ≥ 12) **não** tem a categoria PWA;
vai medir desempenho/acessibilidade, não instalabilidade. Instalabilidade só se vê no DevTools de um Chrome/Android real (aba Application → Manifest).
