# Diagnóstico do PWA no iPhone — Real Olímpico (frente E, item 10b do Rogério)

```
Pedido:    "Você mandou que o Real Olímpico pode ser visualizado como app, mas isto não está funcionando,
            principalmente no iPhone." (Rogério)
Base:      9e21fe1 · branch claude/manut-pwa-iphone-eb49d6 · sem migration · sem commit até o merge
Versão:    v1 (17/11/2026) — 8 pontos, pesquisa do iOS, correções e roteiro prontos. Itens "T2" esperam a leitura em
            produção (Específico); não há servidor local nem emulação de navegador nesta frente.
iOS vigente: 27.x (Safari 27.1, 23/10/2026). Pesquisa completa, com fonte e data de cada afirmação:
            docs/diario/execucoes/pesquisa/e-ios-requisitos.md · leitura em produção: e-producao-leitura.md
Legenda:   OK · LIMITE DA APPLE · DEFEITO NOSSO · NÃO VERIFICÁVEL AQUI (só um iPhone real prova)
```

## Resumo (em palavras que o Rogério lê)

1. **O iPhone não tem o "botão de instalar" que o Android tem.** Em nenhum navegador do iPhone. A instalação é sempre
   manual (Compartilhar → Adicionar à Tela de Início). Isso é **limite da Apple** e não dá para consertar; dá para
   explicar bem, e é aí que o painel de instruções pesa.
2. **O código do app instalável está de pé** (manifesto, ícones, service worker, ícone da Apple de 180×180 opaco,
   arquivos liberados sem login). Achei **dois** defeitos nossos, e nenhum é a causa principal: uma etiqueta técnica da
   Apple que o Next não gera (corrigida) e o **texto do passo a passo do iPhone**, que não avisava do que o iOS exige
   (reescrito). Também **faltavam provas**: não havia teste do comportamento do service worker nem do filtro que decide
   quem entra sem login. Agora há.
3. **As causas mais prováveis do "não funciona" são de uso, não de código** — e o passo a passo antigo não avisava de nenhuma:
   - **a sessão:** o app da Tela de Início tem armazenamento **separado** do Safari. Desde o iOS 17.2 a Apple copia o login
     **uma vez, na hora em que a pessoa toca em "Adicionar"**. Quem adicionou **sem estar logado** abre o app na tela de
     entrada e precisa entrar de novo — e vê "um app que pede senha". → o passo a passo agora diz **"entre na sua conta
     antes de adicionar"**;
   - **a chave "Abrir como app web"** (iOS 26 em diante): se for desligada ao adicionar, o ícone abre o site **dentro do
     Safari**, com barra e tudo — parece que "não é app". → o passo a passo agora pede para **deixar ligada**;
   - **link aberto de dentro do Instagram, Facebook ou TikTok:** esses navegadores não oferecem "Adicionar à Tela de
     Início". O painel já mandava abrir no Safari e continua assim;
   - **login com Google dentro do app instalado:** o Google abre numa folha do Safari e o retorno pode não achar o
     cookie do login. **Nenhuma fonte atual resolve isso — só um iPhone real.** O caso está descrito para a equipe que cuida
     da tela de entrada (frente D).
4. **O que falta e só o Gabriel ou o Rogério fazem:** o roteiro de 10 passos no iPhone real (arquivo
   `docs/pwa/ROTEIRO_IPHONE_REAL.md`). Os passos 4, 5 e 7 decidem se ainda falta consertar algo.

## Os 8 pontos

| # | Ponto | Veredito | Evidência |
|---|---|---|---|
| 1 | `start_url` e `scope` | OK, com um risco para o aparelho | `manifest.ts:42-43`: `start_url: '/inicio'`, `scope: '/'`, `id: '/'`. Sem sessão, `/inicio` responde **307 → `/entrar`** (`middleware.ts:54-57`; provado em `middleware.test.ts`, "sem cookie, página vai para /entrar"); `/entrar` responde 200 (pública). O iOS carrega a `start_url` na primeira abertura (WWDC23, 10120) e o limite que a Apple documenta é de **escopo**, não de redirecionamento: os dois endereços estão no mesmo domínio e dentro de `scope: '/'`. **Não achei fonte da Apple sobre 307 na `start_url`.** **Lido em produção (17/11, 22:39):** `/inicio` sem login → 307 com `Location: /entrar` → 200, um salto só, os dois no mesmo domínio e dentro do escopo. Só o aparelho diz qual tela o ícone abre quando se adiciona a partir de `/`: passo 7 do roteiro. |
| 2 | App instalado não divide cookie com o Safari | LIMITE DA APPLE, **com atenuante** | Armazenamento separado: WebKit, "Tracking Prevention". **Cópia única dos cookies no ato de adicionar, desde o iOS 17.2** (WebKit, 11/12/2023): "só se a autenticação estiver em cookies", e `localStorage` não é copiado. A nossa sessão é cookie HttpOnly de 7 dias (`src/server/session.ts`) → a cópia funciona para nós. Quem adiciona deslogado, ou com iOS < 17.2, **entra dentro do app**: e-mail e senha fecha o ciclo na própria janela (`LoginForm.tsx:98`). A tela de entrada é utilizável no app, e o app abre mesmo logado? Passos 4 e 7 do roteiro. |
| 3 | Login Google dentro do app instalado | NÃO VERIFICÁVEL AQUI — vai a D como pedido de teste | `LoginForm.tsx:93-98` + `auth.ts:204`: a ação do servidor monta a URL do Google (PKCE, verificador em **cookie**) e a página navega **na mesma janela**, sem pop-up — é o caminho compatível. Mas `accounts.google.com` fica **fora do escopo**, e o iOS abre isso numa folha do Safari (WWDC23). Se a folha compartilha o cookie do app, o ciclo fecha; se tem cookie próprio, `exchangeCodeForSession` falha em `/entrar/callback` e a folha mostra `?erro=callback`. Fontes de 2019 e de 2023 se contradizem e nenhuma descreve o iOS 26/27. Ver "Contrato D↔E". |
| 4 | `apple-touch-icon` 180×180 e metatags iOS no `<head>` | OK; uma tag a mais por prudência (**não é a causa**) | `apple-icon.png`: 180×180, PNG de paleta **sem transparência** (sem bloco `tRNS`; leitura dos bytes). O Next 15.5 emite `mobile-web-app-capable` e **não** `apple-mobile-web-app-capable` (`node_modules/next/dist/lib/metadata/generate/basic.js:263`), ao contrário do que o MD do PWA de 04/11 supunha. O iOS 26+ não exige nenhuma das duas; no 16.4–18 vale o `display: standalone` do manifesto (que temos) **ou** a tag da Apple. Acrescentada em `src/lib/pwa/metadados.ts`. **`<head>` publicado hoje (o "antes" da correção, lido em produção às 22:38):** tem `manifest`, `apple-touch-icon` 180×180, nome, `mobile-web-app-capable` e `theme-color`, tanto em `/` quanto em `/entrar`, no HTML cru; **falta** só `apple-mobile-web-app-capable`. O ícone publicado tem de fato 180×180, sem transparência. |
| 5 | `display: standalone`, ícones 192/512 `any` e `maskable` | OK | `manifest.ts:48,53-59`; `icon-192.png` 192×192, `icon-512.png` 512×512, `icon-maskable-512.png` 512×512, todos opacos. O iOS **ignora** `maskable`, `background_color`, `shortcuts` e `orientation`: isso só vale no Android (limite da Apple, não defeito). Sem `screenshots`: só tira a versão "rica" do diálogo do Android. |
| 6 | Service worker controla a página e não serve HTML velho | OK no código (provado por teste); "controla a página" no aparelho: só aparelho real | `src/lib/pwa/service-worker.test.ts` (novo) executa o worker de verdade num navegador de mentira: navegação vai sempre à rede e **nada de HTML é guardado**, a 2ª visita não serve a 1ª, o 307 de `/inicio` passa intacto, sem rede mostra "Sem conexão", API/POST/outra origem (Google, Mercado Pago) nem são tocados, só estáticos 200 entram no cache. No iOS 26+ o app **instala sem service worker**; ele só serve a tela offline. |
| 7 | Cabeçalhos de `/manifest.webmanifest` e `/sw.js` | OK (lido em produção) | **Produção, 17/11 22:38:** `/manifest.webmanifest` → 200, `application/manifest+json`, revalida a cada uso; `/sw.js` → 200, `application/javascript`, `Cache-Control: no-cache, no-store, must-revalidate`, `Service-Worker-Allowed: /`; nenhum `Content-Security-Policy` que bloqueie o worker. Por código: `/sw.js` com `Cache-Control: no-cache, no-store, must-revalidate` e `Service-Worker-Allowed: /` (`sw.js/route.ts:21-27`, repetido em `next.config.mjs:24-32`). O matcher do middleware deixa os dois fora da checagem de sessão (teste do matcher, abaixo). Os valores reais acima conferem com o código. |
| 8 | Botão, banner e painel batem com o iOS atual | **DEFEITO NOSSO (texto)** — corrigido no T4 (ver "Defeito → correção → teste") | O painel (`GuiaDeInstalacao.tsx:150-203`) descreve Compartilhar → Adicionar à Tela de Início → Adicionar, o que ainda vale. **Faltavam três coisas que a pesquisa mostra decisivas:** (a) "entre antes de adicionar"; (b) a chave "Abrir como app web" (iOS 26+) — deixar ligada; (c) a **posição** do botão Compartilhar varia com o desenho do Safari (MacMagazine, 10/10/2025), e a ilustração `BarraDoSafari` (`IconesDoGuia.tsx:137`) mostra **um único desenho** de barra, com o botão no meio — pode mostrar à pessoa uma tela que ela não tem. A pesquisa recomenda citar só o ícone e o nome, não a posição. Texto novo aplicado em 17/11, aprovado pelo chat de branch. |

## Defeito → correção → teste

| Defeito nosso | Correção | Teste que prova |
|---|---|---|
| `apple-mobile-web-app-capable` não saía no `<head>` (o Next 15.5 só emite a versão sem prefixo). **Menor: o iOS atual lê o modo app do manifesto; não é isto que quebra o app** | `src/lib/pwa/metadados.ts` (`other`), usado por `src/app/layout.tsx` | `src/lib/pwa/metadados.test.ts` |
| Painel do iPhone sem "entre antes de adicionar" e sem a chave "Abrir como app web" (iOS 26+); dizia onde fica o Compartilhar e desenhava uma barra do Safari que pode não ser a da pessoa | `GuiaDeInstalacao.tsx` (aba iPhone), `IconesDoGuia.tsx` (sai `BarraDoSafari`), `pwa.css`, README — texto aprovado pelo chat de branch em 17/11 | `src/components/pwa/GuiaDeInstalacao.test.ts` (renderiza as duas abas: frases, 4 passos nas duas abas, sem ilustração do Safari, sem palavra proibida, marca no masculino) |

## Proteções acrescentadas (não corrigem defeito; impedem regressão)

| O quê | Teste |
|---|---|
| O service worker nunca guarda HTML, API nem dado; o 307 `/inicio → /entrar` passa intacto | `src/lib/pwa/service-worker.test.ts` (16 testes) |
| O `matcher` do middleware deixa fora só os arquivos do PWA: nenhuma página de `(app)` ou `(admin)` saiu da rede de segurança, e nomes parecidos (`/pwa`, `/offline`, `/manifest`) continuam protegidos | `src/middleware.test.ts`, bloco "matcher: quem fica fora da rede de segurança" (3 testes) |

## O que **não** vou mudar, e por quê

- **`start_url` com 307.** Não há fonte contra, e tornar o endereço inicial 200 nos dois estados exigiria rota nova ou mexer no
  filtro de login do site — mudança maior que a evidência justifica, e ninguém pediu. Fica como passo 7 do roteiro; se o aparelho
  mostrar que o ícone abre a página de vendas ou o Safari, volto a isto com dado na mão.
- **`statusBarStyle: 'black'`** (decisão D10): é o valor conservador; `black-translucent` tem relatos de regressão no iOS 26/27.
- **Sem `startupImage`:** o iPhone abre com fundo branco por cerca de 1 s (conhecido; não impede usar).

## Contrato D↔E (login Google no app instalado)

**Escrito para o Controle repassar à frente D.** A frente E não editou nada de login (`src/components/login/**`, `src/app/entrar|cadastrar`): só leu.

### Como o Google funciona hoje dentro do app instalado (lido no código; o comportamento do iOS só o aparelho confirma)

1. `LoginForm.tsx:86-102`: o toque chama `loginWithGoogle()` (`src/server/actions/auth.ts:204`), que monta a URL do Google no **servidor**
   (`signInWithOAuth` com `skipBrowserRedirect: true`). O verificador do PKCE e o destino pós-login ficam em **cookies**, gravados
   pela resposta da própria Server Action. Depois a página faz `window.location.assign(url)`: **mesma janela, sem pop-up**. O cadastro
   (`registerWithGoogle`) é igual, com o aceite dos termos também em cookie.
2. O Google fica **fora do escopo** do app. O iOS abre o que sai do escopo numa folha do Safari ("Safari View Controller", WWDC23). O retorno cai
   em `/entrar/callback?code=…`, que troca o código lendo o cookie do verificador (`callback/route.ts`, `exchangeCodeForSession`) e grava
   o cookie de sessão `aurea_session`.
3. **O que decide tudo:** a folha enxerga os cookies do app? Se sim, o ciclo fecha e o app fica logado. Se a folha tem cookie próprio,
   o verificador não está lá, `exchangeCodeForSession` falha e a folha mostra `/entrar?erro=callback&motivo=exchangeCode…`; o app segue
   deslogado. Fontes de 2019 (compartilha) e de 2023 (folha própria) se contradizem; **nenhuma descreve o iOS 26/27**. Por isso: aparelho.
4. Risco secundário, de relato de campo (Progressier, 2024): o callback pode receber **dois pedidos** com o mesmo código (um do app, outro da
   folha); o segundo falha com "código já usado". Aqui `falha()` mandaria o cliente para `/entrar?erro=callback` mesmo com a sessão já aberta.

### O que D precisa entregar: **nada agora**, e três cuidados enquanto faz o "Google primeiro"

- **Não mudar a forma do fluxo:** continuar com redirecionamento na mesma janela e estado em **cookies**. Pop-up (`window.open`,
  `signInWithPopup`) não serve no app instalado, e o iOS só copia **cookies** ao adicionar (nada de `localStorage`/`sessionStorage`).
  Se o verificador do PKCE, o destino ou o aceite pendente fossem para o armazenamento do navegador, o ciclo quebraria só no iPhone.
- **Não pôr o botão do Google como único caminho de entrada.** Enquanto o roteiro do aparelho (passos 5 e 7) não responder, e-mail e
  senha é o caminho que dentro do app depende só de cookies da própria janela. **Atenção:** quem criou a conta só pelo Google não tem
  senha, e pelo que li **a tela de entrar não tem "esqueci minha senha"** (só o painel da equipe envia o link de redefinição:
  `src/server/admin/usuarios.ts`). Se o Google falhar no app, essa pessoa fica sem caminho dentro do app até definir uma senha.
  Vale D decidir, com o Gabriel, se o "Google primeiro" ganha esse caminho de saída (o link de redefinição abre no **Safari**,
  não no app — limite da Apple —, e a senha criada ali vale para entrar no app).
- **Depois do teste no aparelho:** se aparecer o cenário "folha com cookie próprio" (erro `exchangeCode` no passo 5), a correção é de D,
  **com decisão do Gabriel**: esconder o botão do Google quando o app roda em modo app (`navigator.standalone` ou
  `display-mode: standalone`, que `src/lib/pwa/navegador.ts` já expõe em `lerStandalone()`) e explicar "entre com e-mail e senha", ou
  trocar o verificador em cookie por um estado guardado no servidor. Se o erro for só o do item 4 (sessão aberta mesmo assim),
  o ajuste é pequeno: no callback, se a troca falhar mas já existir sessão válida, seguir para o destino em vez de mostrar o erro.

**Pendência de D anotada:** conferir os passos 5 e 7 do roteiro depois do deploy e decidir com o Gabriel; nenhuma mudança de código é
pedida antes disso: não se cria trava nem regra nova sem o Gabriel pedir.

## O que testei aqui × o que só um aparelho real prova

Esta frente **não subiu servidor, navegador nem emulação** (regra do Gabriel de 17/11/2026). Tudo abaixo é de três tipos:
**teste de unidade** (roda no código, sem aparelho), **leitura em produção** (só `GET`/`HEAD` no site publicado, feita pelo
Específico em 17/11/2026, 22:38–22:40; texto completo em `docs/diario/execucoes/pesquisa/e-producao-leitura.md`) e **só um
aparelho real**. A leitura em produção é do código de **antes** das correções desta frente (base `9e21fe1`); o que mudamos
(etiqueta da Apple, texto do painel) só aparece publicado depois do deploy.

### Provado por teste de unidade

| O quê | Teste |
|---|---|
| Service worker: nunca guarda HTML, API ou dado; navegação sempre vai à rede; o 307 passa intacto; sem rede mostra "Sem conexão"; Google e Mercado Pago nem são tocados | `src/lib/pwa/service-worker.test.ts` |
| Nenhuma rota logada ficou pública; só os arquivos do PWA ficam fora do filtro de login | `src/middleware.test.ts` (matcher) |
| A etiqueta `apple-mobile-web-app-capable` e o nome do app entram nos metadados | `src/lib/pwa/metadados.test.ts` |
| Texto do passo a passo do iPhone e do Android: "entre antes", chave "Abrir como app web", sem posição do Compartilhar, sem palavra proibida | `src/components/pwa/GuiaDeInstalacao.test.ts` |
| O botão "Baixar o app" some dentro do app instalado (`standalone` → caminho "instalado") | `src/lib/pwa/instalacao.test.ts` (já existia) |

### Lido em produção (Específico, 17/11/2026) — o "antes"

| O quê | Resultado |
|---|---|
| Manifesto publicado × `manifest.ts` | **Idênticos** (comparação campo a campo). `200`, `application/manifest+json`, `display: standalone`, `start_url: /inicio`, `scope: /` |
| Ícones do manifesto (192, 512, 512 maskable) e `apple-touch-icon` | Existem, são PNG e têm exatamente a dimensão declarada; o da Apple é **180×180 sem transparência** |
| `<head>` de `/` e de `/entrar` | Traz manifesto, ícone da Apple, nome do app, barra de status e `theme-color`, **no HTML cru**; **falta só** `apple-mobile-web-app-capable` (corrigido nesta frente; menor) |
| `/sw.js` publicado × `service-worker.ts` | **Idênticos byte a byte** (3.310 bytes); cabeçalhos certos (`no-store`, `Service-Worker-Allowed: /`); o texto não guarda HTML |
| `/inicio` sem login | **307 → `/entrar` → 200**, um salto, mesmo domínio, dentro do escopo; não vaza dado |
| `/painel`, `/admin`, `/mercado`, `/offline.html` | `200`; `307 → /painel`; `307 → /entrar`; `200` (como o desenho manda) |
| Tela `/entrar` sem login | Campos nativos de e-mail e senha com preenchimento automático correto; botões "Entrar" e "Entrar com Google" |

**O que a leitura achou além disso (nenhum impede instalar ou abrir; nenhum foi mexido, por não ser o pedido):**
o logo de `/entrar` leva à página inicial, mas dentro do app instalado o botão "Baixar o app" **some** (conferi no código), então não confunde;
o pré-cache do service worker baixa um emblema de 772 KB a cada deploy, só para a tela "Sem conexão" (custo de dados, não de função —
anotado para o polimento, a troca é trocar a imagem em `public/offline.html` e no pré-cache); o ícone do navegador (`icon.png`) tem 394 KB
(peso, fora desta frente).

### Só um aparelho real prova

| O quê | Onde fica |
|---|---|
| Qual tela o ícone abre quando se adiciona a partir da página inicial (por causa do 307) e se o salto mantém o modo app | Roteiro, passo 7 |
| O login do Safari foi copiado para o app na hora de adicionar, e o app abre já logado | Roteiro, passos 3 e 4 |
| Entrar com Google dentro do app instalado (folha do Safari, cookie, erro `exchangeCode`/`callback`) | Roteiro, passo 5 — contrato com a frente D |
| O texto exato da chave "Abrir como app web" em português e o que acontece com ela desligada | Roteiro, passos 3 e 6 |
| Links do WhatsApp e do e-mail com o app instalado; navegador do Instagram; Chrome do iPhone | Roteiro, passos 8, 9 e 10 |
| O service worker controlar a página e a tela offline no aparelho | Roteiro (passo 4 e lembrete de uma semana) |
| Android: convite de instalação do Chrome e app em tela cheia (critério do Chrome não foi medido no DevTools) | Roteiro, bloco Android |
| Abertura branca de cerca de 1 s e cor da barra do relógio | Roteiro, passo 4 |

## Roteiro para o iPhone real (10 linhas; versão completa, com o Android, em `docs/pwa/ROTEIRO_IPHONE_REAL.md`)

1. Anote a versão do iOS e abra o site pelo **Safari**. 2. **Entre** na conta (e-mail e senha) até o painel. 3. Compartilhar → **Adicionar à Tela de Início**; anote o texto exato da chave **"Abrir como app web"** e deixe-a ligada. 4. Abra pelo ícone: tela cheia, **já logado**? (e a abertura branca, a barra de status). 5. No app, saia e use **Entrar com Google**: folha do Safari? volta logado? erro `exchangeCode`/`callback`? Repita com e-mail e senha. 6. Adicione de novo com a chave **desligada**: o ícone abre dentro do Safari? 7. Sem estar logado, pela página inicial: **qual tela o ícone abre**? A tela de entrar funciona? 8. Link do WhatsApp e do e-mail com o app instalado: abrem no Safari (esperado)? 9. Link aberto dentro do **Instagram**: o painel manda abrir no Safari? 10. (Opcional) Chrome do iPhone: aparece "Adicionar à Tela de Início"? O ícone abre como app?

Os passos **4, 5 e 7** decidem se falta consertar algo.
