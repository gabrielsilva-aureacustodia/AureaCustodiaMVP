# E · Pesquisa — requisitos do iOS vigente para INSTALAR e ABRIR um PWA no iPhone

```
Frente:        E · manut-pwa-iphone (item 10b do Rogério)      Autor: Específico (chat local_dea20203…)
Data:          2026-11-17        Base do código: 9e21fe1        iOS vigente: 27.0.x (ver §0)
Pedido:        PEDIDO 1 da Execução e do chat de branch
Como ler:      FATO = li a página e ela diz isso · SECUNDÁRIO = blog/fórum/vendor, não é a Apple ·
               SUPOSIÇÃO = conclusão minha, sem fonte que a afirme · APARELHO = só um iPhone real decide
```

## CONCLUSÃO (leia só isto se tiver pressa)

1. **No iOS 26 e 27 não existe mais "requisito de instalabilidade" no Safari.** Todo site adicionado à Tela de Início
   abre como web app por padrão (a pessoa pode desligar "Abrir como app web" no ato de adicionar). WebKit, 15/09/2025:
   "there are now zero requirements for 'installability' in Safari". Logo, **a pergunta "`mobile-web-app-capable` basta ou
   precisa do `apple-mobile-web-app-capable`?" está vencida para o iOS 26+**: nenhuma das duas é necessária para abrir como app.
   Só importa para iPhone com iOS 16.4–18, e ali o que a Apple documenta é `display: standalone|fullscreen` no manifesto
   **ou** a meta `apple-mobile-web-app-capable`. Não achei documentação da Apple/WebKit dizendo que o Safari lê a
   `mobile-web-app-capable` sem prefixo. O nosso manifesto já tem `display: standalone`, então o caminho documentado está coberto.
2. **O motivo mais provável de "não funciona no iPhone" não é ícone nem manifesto: é a sessão.** O app instalado tem
   cookies e armazenamento **separados** do Safari. Desde o iOS 17.2 a Apple **copia os cookies do Safari uma única vez, no
   instante em que a pessoa toca em "Adicionar"** (inclusive o estado de login, "só se a autenticação estiver em cookies").
   Depois disso, entrar ou sair em um lado não aparece no outro. A nossa sessão é cookie assinado, HttpOnly, 7 dias
   (`src/server/session.ts`) → por documentação, **quem estava logado no Safari ao adicionar abre o app logado; quem não
   estava, precisa entrar dentro do app.** (Inferência a partir de fonte documentada → confirmar no APARELHO.)
3. **Não existe convite de instalação nem sinal de instalação no iPhone, em nenhum navegador.** `beforeinstallprompt`,
   `appinstalled` e banner nativo não existem (firt.dev, 13/10/2026, cobrindo iOS até 27.0). A instalação é sempre manual
   (Compartilhar → Adicionar à Tela de Início). Chrome, Edge e Firefox no iPhone rodam sobre WebKit e, desde o iOS 16.4,
   **podem** oferecer "Adicionar à Tela de Início", mas só se o navegador tiver a permissão especial da Apple; o app criado
   abre como web app **independente do navegador que o criou**. Navegador embutido do Instagram/Facebook/TikTok **não** oferece
   a opção (fonte secundária): o caminho é "Abrir no Safari" primeiro.
4. **Login com Google dentro do app instalado é a única parte que nenhuma fonte atual resolve.** A Apple documenta que
   navegação para fora do escopo abre numa folha do Safari (Safari View Controller); o Google exige essa folha (não aceita
   webview). Se a folha compartilha o cookie do app, o nosso fluxo (PKCE com cookie) fecha o ciclo; se tem cookie próprio, o
   callback roda sem o cookie do PKCE e falha. **Só o aparelho decide.** E-mail e senha não tem esse risco (tudo no mesmo escopo).
5. **O que não temos como consertar** (limite da Apple): sem convite, sem sinal de instalação, cookies isolados, links de
   e-mail/WhatsApp **sempre abrem no Safari**, nunca no app instalado, e sem `background_color`/atalhos/ícone maskable no iOS.
   **O que controlamos:** manifesto, `apple-touch-icon` 180×180, metas, `start_url`/`scope` estáveis, o texto do painel,
   avisar "entre antes de adicionar", e deixar e-mail/senha como caminho garantido. Tabela completa no fim (§10).

**Recomendação em uma linha para a Execução:** manter `display: standalone`, `id`, `start_url`, `scope: '/'`; garantir o
`apple-touch-icon` 180×180 opaco; acrescentar a meta `apple-mobile-web-app-capable` ao lado da `mobile-web-app-capable` só
por cinto-e-suspensório (custo zero, ver §3); reescrever o painel com o fluxo do iOS 26/27 (§9); e mandar o Google no app
instalado para teste de aparelho, com e-mail/senha como saída.

---

## 0. Qual é o iOS "vigente"

| Item | Dado | Fonte | Tipo |
|---|---|---|---|
| iOS 27 liberado ao público | 14/09/2026 | resumo de busca (sem a página da Apple) | SECUNDÁRIO |
| Safari 27.0 (notas de recursos) | 17/09/2026 | https://webkit.org/blog/18325/webkit-features-for-safari-27-0/ | FATO |
| Safari 27.1 (notas de recursos) | 23/10/2026 | https://webkit.org/blog/18486/webkit-features-for-safari-27-1/ | FATO |
| Última linha de iOS 26 | 26.5 (18/06/2026); existe o post "WebKit Features for Safari 26.6" (data não lida) | https://developer.apple.com/news/?id=dhwadr2x | FATO (só 26.5) |
| Mudança de web apps em 27.0/27.1 | **nenhuma encontrada** (li as duas notas por busca de trechos; só achei "Service Worker static routing" em 27.0 e correções de SW) | mesmas URLs | FATO limitado |

- **iOS 26 (15/09/2025) é a mudança decisiva** para web apps; 27.x não alterou o modelo de instalação (fonte: notas acima + pesquisa de terceiro https://github.com/waiff/sreality/issues/1763, SECUNDÁRIO).
- **Brasil:** o iOS 26.5 abriu lojas alternativas e pagamentos no Brasil (Apple, 18/06/2026). A página **não** fala de motores de
  navegador nem de web apps. **Não há evidência de que Chrome/Edge/Firefox no iPhone brasileiro deixaram de usar WebKit.**
  (SUPOSIÇÃO: continuam WebKit. A regra de "motor alternativo" que existe na União Europeia não consta para o Brasil.)
- Para quem ainda está em iOS 16.4–18, as regras antigas continuam valendo (seções abaixo dizem a versão de cada uma).

## 1. Instalar pelo Safari — Compartilhar → Adicionar à Tela de Início

| Versão | O que acontece | Fonte | Tipo |
|---|---|---|---|
| iOS 16.3 e antes | Site só virava app se o manifesto tinha `display: standalone`/`fullscreen` **ou** a meta `apple-mobile-web-app-capable`; senão virava **atalho** (favorito) | WebKit 16/02/2023 https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/ | FATO |
| iOS 16.4–18 | Idem, e o atalho (favorito) passa a abrir no **navegador padrão** do usuário | idem | FATO |
| **iOS 26 / 27** | **Todo** site adicionado abre como web app por padrão; manifesto é opcional ("Giving users a web app experience simply no longer requires a manifest file"); a pessoa pode desligar **"Open as Web App"** na hora de adicionar e então vira atalho que abre no navegador padrão. "If you define your icons in the manifest, they're used!" | WebKit 15/09/2025 https://webkit.org/blog/17333/webkit-features-in-safari-26-0/ e 09/06/2025 https://webkit.org/blog/16993/ | FATO |

- **Rótulo em português do botão (iOS 26):** a MacMagazine (10/10/2025) escreve **"Abrir como app web"**; o índice do manual
  do iPhone da Apple em pt-BR lista **"Abrir como App da Web"**. Os dois dizem a mesma coisa; **o texto exato da tela só o
  APARELHO confirma.** Recomendo o painel citar "Abrir como app web" entre aspas **e** descrever o efeito ("deixe ligado").
  Fontes: https://macmagazine.com.br/post/2025/10/10/como-colocar-um-site-do-safari-como-atalho-ou-web-app-na-tela-de-inicio-iphone-e-ipad/ (SECUNDÁRIO) e https://support.apple.com/pt-br/guide/iphone/iph42ab2f3a7/ios (índice; não consegui ler o corpo).
- **Risco novo do iOS 26:** se a pessoa desliga a chave, o ícone abre o site **dentro do Safari** — e vai parecer "o app não funciona". O painel precisa pedir para deixar ligada. (SUPOSIÇÃO de que isso gera chamados; o comportamento é FATO.)
- Fórum da Apple (pt, 2025) relata a opção sumindo do menu depois de atualizar o iOS 26 (SECUNDÁRIO): https://communities.apple.com/pt/thread/256229666 — não é regra, é ruído a conhecer.
- **Onde fica o botão Compartilhar** muda com o desenho do Safari (a própria MacMagazine diz que "varia"); não descrever posição, só o ícone e o nome.

## 2. Chrome, Edge e Firefox no iPhone (a partir do iOS 16.4)

**O que mudou (FATO, WebKit 16/02/2023, https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/):**
- o iOS 16.4 criou a API para navegadores de terceiros **oferecerem** "Adicionar à Tela de Início" no menu Compartilhar. Exige: permissão
  gerenciada `com.apple.developer.web-browser`, um `WKWebView` nos itens, página HTTP(S), e iPad fora do modo "iPad compartilhado";
- "This is true no matter which browser added the website to the Home Screen": site com manifesto `standalone` **abre como web app** independentemente de qual navegador o adicionou;
- Safari View Controller ganhou a opção no **iOS 17** ("users can add Home Screen web apps in iOS browsers and many in-app browsers" — Apple, WWDC23 sessão 10120, https://developer.apple.com/videos/play/wwdc2023/10120/, FATO).

**O que NÃO mudou:**
- todo navegador do iPhone continua sendo WebKit por baixo (regra da Apple; não há evidência de mudança no Brasil, §0);
- **não existe** `beforeinstallprompt` nem "instalar" nativo em nenhum navegador do iPhone (firt.dev 13/10/2026, https://firt.dev/notes/pwa-ios/, FATO/SECUNDÁRIO de qualidade);
- a instalação é manual: nada que o nosso JavaScript possa disparar.

**Por navegador (suporte real depende da versão do app — APARELHO):**
- **Chrome iOS:** passou a oferecer a opção no **Chrome 115 (julho/2023)**, em Compartilhar → "Adicionar à Tela de Início"; o ícone abre como instância separada, não dentro do Chrome (MacMagazine 17/07/2023, https://macmagazine.com.br/post/2023/07/17/ios-chrome-agora-permite-adicionar-web-apps-a-tela-de-inicio/, SECUNDÁRIO). Uma lista de 2024 também inclui Chrome (gadgethacks, SECUNDÁRIO); um relato de 2023 num bug do WebKit diz que o Chrome 112 ainda não tinha (número do bug **não conferido**; resumo de busca). **Não confirmado por versão.**
- **Edge iOS:** relato de 2023 diz que já tinha; **Firefox iOS:** lista de 2024 inclui; ambos SECUNDÁRIO e conflitantes — **testar em aparelho.**
- **Se o navegador que criou o app for desinstalado:** um revisor da época relatou que o ícone cai para o Safari (SECUNDÁRIO; resumo de busca de 2023, veículo exato não identificado; não verificado).
- **Se o "Abrir como app web" do iOS 26 aparece dentro do Chrome:** **desconhecido** (nenhuma fonte; a pesquisa https://github.com/waiff/sreality/issues/1763 também marca como não verificado). → **recomendação para o painel: no iPhone, sugerir o Safari como caminho principal; mostrar o caminho do Chrome só como alternativa.**
- **Instrução hoje correta e curta** (válida para os três): "toque no ícone de Compartilhar do navegador → Adicionar à Tela de Início". O texto do painel não deve prometer um botão que o aparelho não mostre.

## 3. `apple-mobile-web-app-*` e o `appleWebApp` do Next.js

**O que o Next 15.5.23 desta branch emite** (código lido, `node_modules/next/dist/lib/metadata/generate/basic.js:259-278`; FATO local):

| Campo em `metadata.appleWebApp` | `<meta>`/`<link>` que sai |
|---|---|
| `capable: true` | `<meta name="mobile-web-app-capable" content="yes">` — **sem prefixo**. A `apple-mobile-web-app-capable` **não** é emitida |
| `title` | `<meta name="apple-mobile-web-app-title" ...>` |
| `statusBarStyle` | `<meta name="apple-mobile-web-app-status-bar-style" ...>` |
| `startupImage` | `<link rel="apple-touch-startup-image" ...>` |

A documentação atual do Next (https://nextjs.org/docs/app/api-reference/functions/generate-metadata, atualizada 06/11/2026) mostra a mesma saída. **A Execução está certa.**

**E isso é problema?** Resposta por versão:
- **iOS 26/27:** não. Nada é necessário para abrir como app (§1).
- **iOS 16.4–18:** o que a Apple documenta é o **manifesto `display: standalone`** ou a meta **`apple-mobile-web-app-capable`**. Quem decide é o manifesto, e o nosso já declara `standalone`. A `mobile-web-app-capable` sem prefixo: **não achei texto da Apple/WebKit que diga que o Safari a lê** (a Apple fórum 649131 diz que ela "pode ser substituída pelo manifesto com `display: standalone`", SECUNDÁRIO). A tabela do firt.dev (13/10/2026) trata a `apple-mobile-web-app-capable` como "opcional desde o 11.3 e desnecessária desde o 26.0", e diz que **imagens de abertura (`apple-touch-startup-image`) ainda exigem a meta com prefixo**.
- **Chrome (Android/desktop):** o Chrome avisa no console que só a versão com prefixo está obsoleta e que quer a `mobile-web-app-capable` (SECUNDÁRIO; não abri o texto da Google). Por isso o Next emite a sem prefixo.

**Recomendação (SUPOSIÇÃO de custo zero):** emitir **as duas** — `appleWebApp.capable: true` (já faz a sem prefixo) **mais**
`other: { 'apple-mobile-web-app-capable': 'yes' }` no `metadata`. Efeito: cobre um iPhone 16.4–18 em que o manifesto falhe por
qualquer motivo, mantém a porta aberta para uma imagem de abertura, e não gera aviso no Chrome (que só reclama quando existe
*apenas* a de prefixo). Risco que enxergo: nenhum; ganho real: pequeno. **Não é a causa de "não funciona no iPhone".**

**`statusBarStyle`:**
- A Apple documenta (arquivo de 2016, https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html) `black` e cita "translucent black"; "não tem efeito se o modo standalone não estiver ativo". Valores `default`/`black`/`black-translucent` são os conhecidos (a página arquivada não lista `default`).
- Relato de terceiro: `black-translucent` seria "deprecated" segundo um engenheiro da Apple e há regressões de barra de status em 26.1/27 (bugs WebKit 317153, 301994, 325807, via https://github.com/waiff/sreality/issues/1763 — SECUNDÁRIO, **não verifiquei os bugs**). O nosso `black` é o valor conservador. **Manter.**
- `theme_color`: suportado desde o iOS 15.0 (firt.dev); **o efeito na barra de status do iOS 26/27 é "não estabelecido"** (mesmo terceiro). APARELHO.

## 4. `apple-touch-icon` (tamanho e comportamento)

| Afirmação | Fonte | Tipo |
|---|---|---|
| O `apple-touch-icon` **tem precedência** sobre os ícones do manifesto; sem nenhum dos dois o iOS 16.4 gera um **monograma** em vez de captura de tela | WebKit 16/02/2023 (13878) | FATO |
| Ícones do manifesto passaram a valer no iOS 15.4 (antes só o `apple-touch-icon` valia) | firt.dev 13/10/2026 | SECUNDÁRIO de qualidade |
| Regra de escolha de tamanho: sem ícone no tamanho recomendado do aparelho, usa o **menor maior** que o recomendado; se não houver maior, o **maior**. Exemplo da Apple usa `152x152` e `180x180` | Apple (arquivo, 2016) | FATO (documento antigo) |
| O iOS **ignora** `purpose: maskable` e monocromático nos ícones do manifesto; PNG ok; SVG só no manifesto e só desde o iOS 26 | firt.dev 13/10/2026 | SECUNDÁRIO |
| `apple-touch-icon` em SVG é baixado mas **não** vira ícone | firt.dev | SECUNDÁRIO |
| 180×180 como tamanho do iPhone atual | exemplo do próprio Next ("sizes: 180x180") e Apple (exemplo) | FATO (exemplo, não tabela oficial) |
| PNG **opaco, quadrado, sem cantos arredondados** (o iOS aplica a máscara; transparência vira preto) | **sem fonte lida** | SUPOSIÇÃO de campo → APARELHO |

- O arquivo `src/app/apple-icon.png` (convenção do Next) gera o `<link rel="apple-touch-icon">`; **o tamanho declarado sai da imagem real** (a conferir no `<head>` renderizado — T2/PEDIDO 2).
- O ícone `maskable-512` serve só ao Android; **para o iPhone ele é ignorado**, o que é inofensivo porque existem os `any`.

## 5. `display: standalone` e o que o iOS usa do manifesto

Fonte principal: firt.dev "iOS PWA Compatibility", atualizada 13/10/2026 (cobre até 27.0), mais Apple WWDC23 sessão 10120 e WebKit 13878.

| Membro do manifesto | Usado pelo iOS? | Desde | Observação |
|---|---|---|---|
| `display` | **Sim**: `standalone` e `browser` | 11.3 | `fullscreen` cai para `standalone`; `minimal-ui` cai para `browser` (firt). WebKit 13878 cita "standalone ou fullscreen" |
| `start_url` | **Sim** | 11.3 | "é a URL carregada quando o app abre pela primeira vez" (Apple, WWDC23) |
| `scope` | **Sim** (padrão = host) | 11.3 | links **fora do escopo abrem em Safari View Controller** (Apple, WWDC23: "In Home Screen web apps on iOS, links outside the scope will open in Safari View Controller") |
| `id` | **Sim** | 16.4 | une com o nome editável; usado para Focos |
| `name` | **Sim** (nome do app, no lugar do `<title>`) | — | WWDC23 |
| `icons` | **Sim** (se não houver `apple-touch-icon`) | 15.4 | `maskable` ignorado |
| `theme_color` | Sim | 15.0 | efeito na barra no iOS 26/27: não estabelecido |
| `background_color` | **Não** | — | **não gera tela de abertura** |
| `orientation`, `shortcuts`, `share_target` | **Não** | — | (`share_target`: bug WebKit 194593 aberto desde 2019, via terceiro) |
| Tela de abertura (splash) | Só por `apple-touch-startup-image` | 8.0 | e só com a meta `apple-mobile-web-app-capable` presente (firt) |

- **O nosso `shortcuts` (Mercado/Vender/Extrato) e `background_color` não têm efeito no iPhone** — não é defeito, é limite; só vale no Android.
- Relato isolado de bug do iOS 27.0.1: `media query` com `device-height` na tela de abertura faz o app abrir preto (bugs.webkit.org 326500, 06/10/2026 — SECUNDÁRIO, não verifiquei). **Não usamos startup images**, então não nos afeta; fica como cuidado se alguém as acrescentar.

### 5.1 `start_url` com redirecionamento (`/inicio` → 307 → `/entrar`) e `scope`

- **Fato:** o iOS carrega a `start_url` na primeira abertura (WWDC23). **Não achei fonte da Apple/WebKit sobre redirecionamento HTTP na `start_url`.**
- **Fato:** o limite que a Apple documenta é de **escopo**, não de redirecionamento: sair do escopo abre a folha do Safari. `/inicio` e `/entrar` ficam **no mesmo domínio e dentro de `scope: '/'`**.
- **Suposição (probabilidade alta, não provada):** um 307 interno, dentro do escopo, **não** tira o app do modo standalone. Busca por relatos de "start_url com redirect abre o Safari" não achou nenhum que isole essa causa (achei só relatos de redirect para **outro domínio** de login, que saem do escopo — outra coisa).
- **Risco real que NÃO é do redirecionamento:** relato antigo (Stack Overflow, anterior ao iOS 11.3 — fonte indireta) dizia que o Safari "usa a URL da página atual e ignora a `start_url`". Desde o 11.3 o `start_url` vale (firt), **mas** no iOS 26, para site **sem** manifesto, vale a URL em que a pessoa estava. APARELHO: adicionar a partir de `/` (landing) e conferir **qual tela abre** (esperado: `/inicio` → `/entrar` ou painel).
- **Por que isso importa:** na landing `/` o convite chama o app; se o iOS abrir a landing em vez do painel, o cliente "instala" a página de vendas. Só o aparelho mostra.
- **Sugestão de desenho (SUPOSIÇÃO, decisão da Execução/Gabriel):** manter `start_url` estável e que **responda 200 no estado deslogado** (hoje 307). O Chrome não exige 200 offline hoje, mas um 200 direto elimina uma variável no aparelho. Não mexer em `middleware.ts` sem o teste exigido pela ficha.

## 6. Armazenamento e COOKIES do app instalado — o cliente entra de novo?

**FATO (todas as linhas):**

| Afirmação | Versão/data | Fonte |
|---|---|---|
| App da Tela de Início tem "cookies e armazenamento separados do navegador" | iOS 16.x–17, 06/2023 | Apple WWDC23 10120 |
| "o dado de site de um web app da Tela de Início é mantido **isolado do Safari**" | atual | https://webkit.org/tracking-prevention/ |
| Ao tocar em Adicionar, os **cookies são copiados** (do Safari, do Safari View Controller ou de outro navegador), "including the information about login state"; **só funciona se a autenticação estiver em cookies**; "No other kind of local storage is copied over"; depois disso "no other website data is shared" | **iOS 17.2**, 11/12/2023 | https://webkit.org/blog/14787/webkit-features-in-safari-17-2/ |
| A isolamento é intencional (a WebKit trata o bug 181849 como "by design") | — | https://bugs.webkit.org/show_bug.cgi?id=181849 (via https://openpwa.net/reference/storage/home-screen-storage-isolation/, SECUNDÁRIO) |
| Teste de campo em iPhone 16 Pro com iOS 18.6.2: cookie definido no Safari **apareceu** no app na primeira abertura; `localStorage`/`IndexedDB` **vieram vazios**; cookies escritos depois de um lado **não** chegam ao outro | iOS 18.6.2, 10/2026 | openpwa.net (SECUNDÁRIO, vendor independente) |
| O primeiro domínio do web app **não** entra no corte de 7 dias do ITP para armazenamento escrito por script; "Web applications added to the home screen are not part of Safari" | atual / iOS 13.4 (24/03/2020) | tracking-prevention + https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/ |

**Aplicação ao nosso código (lido, FATO local):**
- A sessão é um cookie **assinado, HttpOnly, SameSite=Lax, Secure em produção, `maxAge` de 7 dias** (`src/server/session.ts`), e o Supabase usa cookies via `@supabase/ssr` (`src/server/auth/client.ts`). **A autenticação está em cookies → a cópia do iOS 17.2 funciona para nós.**
- O corte de 7 dias do ITP é para armazenamento escrito por **script**; o nosso cookie é de **servidor** (Set-Cookie), então a regra do ITP não se aplica; vale só o nosso `maxAge` de 7 dias (regra nossa, não da Apple).

**Respostas diretas:**
1. *"O cliente precisa entrar de novo?"* — **Depende de quando ele adicionou.** iOS ≥ 17.2 e logado no Safari no momento de tocar em "Adicionar": abre logado (inferência documentada; APARELHO). Deslogado no momento, ou iOS < 17.2, ou adicionado depois de limpar cookies: **entra dentro do app**.
2. *"A sessão do Safari vale no app?"* — **Não, depois da cópia.** Logout/login em um lado não afeta o outro.
3. *"Quem criou conta no Safari e clicou no link do e-mail?"* — o link abre **no Safari** (não há captura de links, §8); ele fica logado no Safari, **não** no app. Para entrar no app: abrir o app e entrar.
4. **Sessão de 7 dias:** cliente que fica mais de 7 dias sem abrir o app cai fora por regra **nossa** (cookie), não por expurgo da Apple.
5. **Recomendação de painel (SUPOSIÇÃO de produto, decisão do chat de branch):** "**entre na sua conta pelo Safari antes de adicionar**; assim o app já abre logado." Se não funcionar no aparelho, tirar a frase.

## 7. Login por Google/OAuth dentro do modo standalone

**O que é documentado:**
- Apple (WWDC23 10120, FATO): navegação para **fora do escopo** abre em **Safari View Controller** (folha com botão "OK/Concluir"). O resumo de terceiro diz que navegação **cross-origin na mesma janela** também vai para a folha.
- Google (https://developers.google.com/identity/gsi/web/guides/supported-browsers, sem data na página, FATO): "Android and iOS webviews are not supported for user sign-in"; recomenda **SFSafariViewController** no iOS; lista Chrome, Edge, Firefox e Safari como suportados; a página **não trata web app da Tela de Início**.
- firt.dev, 26/03/2019, iOS 12.2 (SECUNDÁRIO de qualidade, **antigo**): links fora do escopo abrem num "navegador interno do PWA" que **compartilha armazenamento com o PWA que o abriu** (não com o Safari); se a página externa redireciona para uma URL **dentro do escopo**, a folha **fecha e o conteúdo carrega na janela standalone** — "particularmente útil para OAuth". https://firt.dev/ios-12.2/
- Relatos de fórum 2018–2025 (Apple fórum 100407, Firebase #77, Auth0, Progressier): dizem que o Google "sai do app" ou volta ao Safari, e que o cookie do PKCE se perde. **Antigos e contraditórios — não são base de decisão.**

**Conflito que nenhuma fonte resolve:** a Apple (2023) fala em Safari View Controller; o firt (2019) fala em navegador interno que compartilha armazenamento com o app. **Não há fonte primária que diga qual é o comportamento no iOS 26/27.**

**O fluxo nosso (lido, FATO local):**
- `loginWithGoogle` (`src/server/actions/auth.ts:204`) chama `signInWithOAuth({ skipBrowserRedirect: true })` no **servidor** (PKCE: o `code_verifier` fica em **cookie** gravado pela resposta da Server Action) e devolve a URL; o formulário faz `window.location.assign(url)` (`src/components/login/LoginForm.tsx:98`). **Mesma janela, sem popup** — é o caminho certo para standalone.
- O retorno vem em `/entrar/callback?code=…` (dentro do escopo), que chama `exchangeCodeForSession(code)` lendo o cookie do verifier (`src/app/entrar/callback/route.ts:126`) e depois `setSession`.

**Cenários (APARELHO decide):**
| | A folha compartilha o cookie do app (como em 2019) | A folha tem cookie próprio (como "Safari View Controller" sugere) |
|---|---|---|
| Verifier do PKCE | está lá → troca o código → `setSession` no cookie do app | **não está lá** → `exchangeCode: …` falha → `/entrar?erro=callback&motivo=…` aparece **dentro da folha** |
| Resultado | app logado | app continua deslogado; cliente vê erro técnico e fecha a folha |

**Recomendação:**
1. **Contrato D↔E:** E não edita login. O pedido a D é **só** conferir/anotar: o fluxo é "mesma janela + PKCE em cookie", que é o compatível; **nada a mudar até o aparelho falhar.**
2. **Plano B sem código novo:** deixar claro no painel/roteiro que **e-mail e senha** funciona dentro do app (tudo dentro do escopo, cookie gravado pela própria Server Action no cookie do app). É **suposição documental**, não teste de aparelho.
3. **Se o aparelho mostrar o cenário B (folha com cookie próprio):** o conserto não é de E; é de D com decisão do Gabriel (por exemplo, esconder o botão do Google no modo standalone com `navigator.standalone`/`display-mode`, ou trocar o PKCE por um estado no servidor). Não recomendo implementar antes do teste.

## 8. Service worker no iOS (limites, expurgo, o que não tem)

| Tema | Fato | Fonte | Tipo |
|---|---|---|---|
| Suporte | Service Worker e Cache Storage desde o iOS 11.3; `fetch` desde 10.1; navigation preload desde 15.4; **Static Routing API no 27.0** | firt.dev 13/10/2026; WebKit 17/09/2026 | SECUNDÁRIO / FATO |
| Sem | **Background Sync, Periodic Background Sync, Background Fetch não existem** | firt.dev | SECUNDÁRIO |
| Push | Web Push só em **app instalado** (16.4); Declarative Web Push desde 18.4 (sem SW). Fora de escopo da frente | WebKit 13878; firt | FATO |
| Expurgo | "7 dias de uso do Safari sem interação" apaga **todo armazenamento escrito por script, incluindo registros de Service Worker e cache** — **só no Safari (aba)**. App instalado tem contador próprio e "não esperamos que o primeiro domínio do web app tenha dados apagados" | WebKit 24/03/2020 (iOS 13.4): https://webkit.org/blog/10218/ | FATO |
| Cota | App da Tela de Início tem a **mesma cota** que o navegador (origem até 15% do disco para apps comuns; 60% para navegador) e pode ser expurgado por pressão de armazenamento ou "não uso por algum tempo" | WebKit 10/08/2023 (Safari 17, iOS 17): https://webkit.org/blog/14403/updates-to-storage-policy/ | FATO |
| `navigator.storage.persist()` | concedido "por heurística, p. ex. se abre como web app da Tela de Início", **só se chamado** | idem | FATO |
| Correções recentes | 27.0 corrige registros de SW removidos quando o script principal some e rotas estáticas sem `fetch` | WebKit 17/09/2026 | FATO |

**Consequência para o D1 do MD do PWA (SW nunca guarda HTML):** como o nosso SW só guarda a tela offline e os ícones, **expurgo não
causa perda de dado nem tela velha**; na próxima visita ele se registra de novo. O SW é **opcional para instalar no iPhone**
(o iOS 26+ instala sem SW e sem manifesto); ele só importa para `offline.html`. A pergunta "o SW controla a página?" é do
PEDIDO 2 (Chromium e WebKit emulado).

## 9. O que NÃO existe no iOS (e o que isso exige da nossa interface)

| Não existe | Evidência | Consequência |
|---|---|---|
| `beforeinstallprompt`, `appinstalled`, banner nativo de instalação | firt.dev 13/10/2026: "not supported" | O botão "Baixar app" no iPhone **só pode abrir o painel de instruções**; nunca "instalar" |
| Sinal de instalação visto do Safari | idem; D5 do MD do PWA | Impossível saber de uma aba se o app já foi instalado |
| Detectar que **já está** no app | `navigator.standalone` (desde o iOS 2.0) e `display-mode: standalone` (a mídia query) | Dá para **esconder o convite dentro do app instalado**. (Conferir se `src/lib/pwa/navegador.ts` usa as duas.) |
| Captura de links ("abrir links do domínio no app") | firt.dev: "Only a push message can open an installed PWA"; link de e-mail/WhatsApp **abre no Safari** | Link de confirmação de e-mail/recuperação de senha cai no Safari, não no app (ver §6) |
| Botão voltar no standalone | relato de terceiro (waiff, 2026) | O app precisa de navegação própria; o gesto de borda só funciona dentro do escopo |
| `shortcuts`, `share_target`, `background_color`, `orientation` | firt/MDN via terceiro | Atalhos de toque longo **só Android** |
| Link para fora do escopo abre folha do Safari | WWDC23 | Links externos (suporte, termos hospedados fora) saem numa folha; já esperado |
| Navegador embutido (Instagram/Facebook/TikTok) com "Adicionar à Tela de Início" | secundário (§9.1) | Mandar abrir no Safari antes |

### 9.1 Navegador embutido do Instagram / Facebook / TikTok / WhatsApp

- **Fato indireto:** o "Adicionar à Tela de Início" para terceiros exige a permissão gerenciada `com.apple.developer.web-browser` (WebKit 13878) e o Safari View Controller ganhou o item no iOS 17 (Apple WWDC23). **Um app que usa `WKWebView` comum, sem essa permissão, não oferece o item.**
- **Secundário:** Instagram e Facebook no iOS usam `WKWebView` próprio (fórum da Glide: o item "some" dentro da visualização do Instagram e aparece no Safari; u2l.ai, vendor que vende "escapar do navegador embutido"; não achei documento da Apple ou da Meta). TikTok: sem fonte lida.
- **WhatsApp no iPhone:** **não** consegui confirmar se abre o link no Safari ou numa visualização interna. APARELHO.
- **Recomendação de painel:** se o `navegador.ts` detecta navegador embutido (Instagram/FB/TikTok/Messenger), mostrar **"Abra este endereço no Safari"** com o passo "toque nos três pontos/ícone de bússola e escolha *Abrir no navegador/Safari*"; **não afirmar o rótulo exato do menu de cada rede (muda por versão e eu não verifiquei).**

## 10. Tabela — limite da Apple × o que nós podemos controlar

| # | Assunto | Limite da Apple (fato ou provável) | O que nós controlamos |
|---|---|---|---|
| 1 | Convite/sinal de instalação | Não existe em nenhum navegador do iPhone | Painel de instruções claro; esconder o convite quando `navigator.standalone`/`display-mode: standalone` |
| 2 | Ser "app" ao abrir | iOS 26+: automático, mas a pessoa pode desligar "Abrir como app web" | Texto do painel: **deixe ligado**; manter `display: standalone` + `start_url` + `scope` + `id` para iOS 16.4–18 |
| 3 | `mobile-web-app-capable` × `apple-…` | Safari documenta só o prefixo da Apple e o manifesto | Emitir as duas metas (custo zero); manifesto já cobre |
| 4 | Ícone | Ignora `maskable`; `apple-touch-icon` ganha do manifesto; sem `background_color` | `apple-touch-icon` **180×180 opaco** presente no `<head>`; ícones `any` 192/512 |
| 5 | Tela de abertura | Só `apple-touch-startup-image` | Opcional; **não** usar `device-height` (bug do 27.0.1, SECUNDÁRIO) |
| 6 | Cookies do app | Isolados; cópia **única** no ato de adicionar (iOS ≥ 17.2) | Sessão em cookie (já é); painel: "entre antes de adicionar"; e-mail/senha como caminho garantido |
| 7 | `localStorage`/IndexedDB | Não copiados | Não guardar sessão só em `localStorage` (não guardamos; conferir) |
| 8 | Link do e-mail/WhatsApp | Sempre abre no Safari | Aviso após confirmar e-mail: "agora abra o app e entre" (decisão de produto) |
| 9 | Login Google no app | Folha do Safari para fora do escopo; comportamento do cookie no 26/27 sem fonte | Fluxo já é "mesma janela + PKCE"; testar no aparelho; plano B = e-mail/senha (frente D) |
| 10 | `start_url` com 307 | Sem fonte contra; sair do escopo abre folha | Manter `start_url`/`scope` no mesmo domínio e raiz `/`; considerar `start_url` que responda 200 deslogado |
| 11 | Chrome/Edge/Firefox no iPhone | Podem oferecer a opção (16.4+), por versão; todos WebKit | Painel: Safari como caminho principal; Chrome como "toque em Compartilhar → Adicionar à Tela de Início" |
| 12 | Navegador do Instagram/Facebook/TikTok | Não oferece Adicionar à Tela de Início (secundário) | Detectar e pedir "Abrir no Safari" |
| 13 | Service worker | Sem Background Sync; expurgo no Safari após 7 dias; app instalado protegido | SW nunca guarda HTML (D1); só offline + ícones; o app instala **sem** SW no iOS 26+ |
| 14 | Atalhos, `share_target`, orientação | Não suportados | Só Android; não prometer no iPhone |
| 15 | Notificações push | Só app instalado (16.4+) | Fora de escopo da frente |

## 11. Perguntas que só o iPhone responde (para o roteiro de aparelho real — T4)

1. O iPhone é iOS 26/27? Qual a versão exata (Ajustes → Geral → Sobre)? O texto da chave é "Abrir como app web" ou "Abrir como App da Web"?
2. Adicionando a partir de `/` (landing), qual tela o ícone abre: `/inicio`→`/entrar` ou a landing?
3. Logado no Safari ao tocar em "Adicionar": o app abre logado? (cópia de cookies, iOS ≥ 17.2)
4. Deslogado: a tela de entrada dentro do app é utilizável (teclado, botão Google, link "esqueci a senha")?
5. Botão Google dentro do app: a folha do Safari aparece? Ao final, o app fica logado (cenário A) ou aparece erro `exchangeCode`/`erro=callback` (cenário B)?
6. Chrome do iPhone: aparece "Adicionar à Tela de Início"? O ícone criado abre como app (sem barra) ou dentro do Chrome? Aparece a chave "Abrir como app web" ali?
7. Link de e-mail aberto no iPhone com o app instalado: abre no Safari (esperado). Depois, o app continua deslogado?
8. Desligando a chave "Abrir como app web", o ícone abre como aba do Safari? (confirma o risco da §1)
9. Barra de status e cor de fundo na abertura: aparece "caixa" branca/preta em volta do ícone? O `statusBarStyle: black` fica como esperado?
10. Depois de 7+ dias sem abrir: a sessão (nosso cookie de 7 dias) expirou como previsto, ou o iOS apagou antes?

## Fontes (todas consultadas em 17/11/2026)

**Apple / WebKit (primárias)**
- WebKit, "Web Push for Web Apps on iOS and iPadOS" (16/02/2023): https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/
- WebKit, "WebKit Features in Safari 17.2" (11/12/2023): https://webkit.org/blog/14787/webkit-features-in-safari-17-2/
- WebKit, "WebKit Features in Safari 26.0" (15/09/2025): https://webkit.org/blog/17333/webkit-features-in-safari-26-0/
- WebKit, "News from WWDC25" (09/06/2025): https://webkit.org/blog/16993/news-from-wwdc25-web-technology-coming-this-fall-in-safari-26-beta/
- WebKit, "WebKit Features for Safari 27.0" (17/09/2026): https://webkit.org/blog/18325/webkit-features-for-safari-27-0/ · "…27.1" (23/10/2026): https://webkit.org/blog/18486/webkit-features-for-safari-27-1/
- WebKit, "Updates to Storage Policy" (10/08/2023): https://webkit.org/blog/14403/updates-to-storage-policy/
- WebKit, "Full Third-Party Cookie Blocking and More" (24/03/2020): https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/
- WebKit, "Tracking Prevention in WebKit": https://webkit.org/tracking-prevention/
- Apple, WWDC23 sessão 10120 "What's new in web apps": https://developer.apple.com/videos/play/wwdc2023/10120/
- Apple, "Configuring Web Applications" (arquivo, 2016, iOS 7): https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html
- Apple Developer News, "Changes to iOS in Brazil" (18/06/2026): https://developer.apple.com/news/?id=dhwadr2x
- Apple Suporte pt-BR, Manual do iPhone (só o índice): https://support.apple.com/pt-br/guide/iphone/iph42ab2f3a7/ios
- Google, navegadores suportados para Entrar com Google: https://developers.google.com/identity/gsi/web/guides/supported-browsers
- Next.js, `generateMetadata` (atualizada 06/11/2026): https://nextjs.org/docs/app/api-reference/functions/generate-metadata

**Secundárias (não são a Apple)**
- firt.dev, iOS PWA Compatibility (13/10/2026): https://firt.dev/notes/pwa-ios/ · iOS 12.2 (26/03/2019): https://firt.dev/ios-12.2/
- OpenPWA, isolamento de armazenamento do app da Tela de Início (teste em iOS 18.6.2): https://openpwa.net/reference/storage/home-screen-storage-isolation/
- waiff/sreality #1763 (pesquisa de terceiro, iOS 27.0.1): https://github.com/waiff/sreality/issues/1763
- MacMagazine (10/10/2025; 17/07/2023): links no corpo
- Glide, Instagram e Adicionar à Tela de Início: https://community.glideapps.com/t/show-add-to-home-screen-cta-in-instagrams-embedded-browser-view/6083
- Bug WebKit 181850 (cross-origin, aberto, 21/06/2022): https://bugs.webkit.org/show_bug.cgi?id=181850

## Limites desta pesquisa (honestidade)

- Li as páginas pela ferramenta de busca/leitura (resumo automático por página); **trechos entre aspas são os que a ferramenta devolveu**, não conferi linha a linha no HTML original.
- **Não li:** o corpo da página de suporte da Apple em pt-BR; a nota de lançamento do iOS 27 da Apple (data 14/09/2026 vem de resumo de busca); qualquer fonte da Apple sobre `mobile-web-app-capable` (provavelmente não existe); os bugs WebKit 317153/301994/325807/326500 citados por terceiro.
- **Nenhuma fonte atual (iOS 26/27) descreve** o cookie da folha do Safari no OAuth do app instalado, nem o redirect da `start_url`, nem a chave "Abrir como app web" dentro do Chrome. Os três estão marcados APARELHO.
