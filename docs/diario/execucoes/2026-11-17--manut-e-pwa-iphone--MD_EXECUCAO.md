# MD de execução — `claude/manut-pwa-iphone-eb49d6` (frente E · pwa-iphone)

```
Projeto:           Real Olímpico / Áurea Custódia — manutenção de novembro/2026 (item 10b do Rogério)
Branch:            claude/manut-pwa-iphone-eb49d6
Worktree:          C:\dev\AureaCustodiaMVP\.claude\worktrees\manut-pwa-iphone-eb49d6
Assignee:          chat de branch E (nível 2); filhos: Execução, Auditoria, Específico
Packet:            C:\dev\AureaCustodiaMVP\docs\manutencao-2026-11\  (FORA do Git — ler por caminho absoluto)
Ref_commit:        9e21fe1
Aberta em:         2026-11-17
Atualizada em:     2026-11-17 (Execução: T1 em andamento)
Estado da branch:  aberta
Prazo:             30/11/2026 · Onda de merge 1 · Migration reservada: nenhuma
```

## RETOMADA

- **Estado (17/11, Execução):** T1 a T5 **fechados**. Diagnóstico v1 com a leitura em produção; 2 defeitos nossos corrigidos com teste; painel do iPhone e roteiro prontos; contrato D↔E escrito; lote único verde às 22:50 (`typecheck` sem erro; vitest de `src/lib/pwa`, `src/components/pwa` e `middleware.test.ts`: 5 arquivos, 86 testes). Falta só o que depende de aparelho real, depois do deploy (roteiro). Filhos abertos: Execução, Auditoria, Específico.
- **REGRAS PERMANENTES DO GABRIEL (repassadas pelo Controle, 17/11):** (1) **nada de servidores locais, `npm run dev`, preview ou container: tudo direto para produção** — não existe mais "build de produção local + emulação WebKit"; (2) **pausa de memória** (RAM da máquina no limite): nenhum build, Playwright, Lighthouse local ou navegador headless até o Controle liberar; testes unitários só no fim, em lote único. O teste no aparelho real é **ação manual do Gabriel depois do deploy**.
- **Git:** `claude/manut-pwa-iphone-eb49d6` sobre `9e21fe1`, 0 commits (B1); arquivos alterados só dentro do Touch.
- **Próximo ato (um):** o chat de branch recebe "FRENTE E PRONTA" e avisa Auditoria e Controle. Depois do deploy, Gabriel ou Rogério fazem `docs/pwa/ROTEIRO_IPHONE_REAL.md`; os passos 4, 5 e 7 dizem se falta consertar algo (login Google no app = frente D). Lista final de arquivos e a linha de ATALHOS ("nenhuma") estão no "Fechamento", logo depois do T5.
- **Já rodado (com OK do Controle, um arquivo):** `GuiaDeInstalacao.test.ts` → 11 testes verdes. Antes da pausa: `src/lib/pwa` + `middleware.test.ts` → 75 verdes.
- **O pedido do Rogério, nas palavras dele:** "Você mandou que o Real Olímpico pode ser visualizado como app, mas isto não está funcionando, principalmente no iPhone."
- **Registro vivo da frente:** `C:\dev\AureaCustodiaMVP\docs\manutencao-2026-11\registro\E.md` **não pode ser escrito pela worktree** (o hook barra a pasta base). O registro vive na pasta de notas da família: `C:\Users\Gabriel\AppData\Local\Claude-Data\claude_pzs8sxrjxfjjc\side-session-notes\local_e259126b-4373-4132-9e89-79edb7fa94ec\registro-E.md`. Só o chat de branch o escreve.

## Aceite

Em uma frase: o Real Olímpico instala e abre como app no iPhone (e continua no Android), **ou** o relatório diz com prova o que é limite da Apple e o que é defeito nosso — e o defeito nosso está corrigido.

- [x] **Diagnóstico (feito, 17/11)** `docs/pwa/DIAGNOSTICO_PWA.md`: causa(s) por evidência, separando **limite da Apple** de **defeito nosso**. Checar, no mínimo:
  1. `start_url` e `scope`: a URL inicial responde 200 sem redirecionar? (`/inicio` redireciona 307 para `/entrar` sem sessão)
  2. o **app instalado no iPhone não compartilha cookie com o Safari** (fato do iOS): o cliente precisa entrar **de novo dentro do app** — o fluxo prevê isso e a tela inicial do app é utilizável?
  3. **login Google dentro do app instalado** (popup/redirect; contrato D↔E)
  4. `apple-touch-icon` 180×180 e metatags iOS (`appleWebApp`, título, barra de status) realmente no `<head>` renderizado
  5. `display: standalone`, ícones 192/512 `any` e `maskable`
  6. o service worker controla a página e não serve HTML velho de saldo (D1 do MD do PWA)
  7. cabeçalhos de `/manifest.webmanifest` e `/sw.js`
  8. o botão/banner e o painel de instruções batem com o iOS **atual**
- [x] **Correções do que é defeito nosso (feito: 2 defeitos, cada um com teste)** (manifest, metadados, SW, middleware/rotas públicas, fluxo de abertura do app instalado, painel de instruções do iPhone). Cada correção com o teste que a prova.
- [x] **Painel "Como instalar no iPhone" revisado (feito, texto aprovado pelo chat de branch)** com o passo a passo real do iOS de hoje (Safari → Compartilhar → Adicionar à Tela de Início; Chrome do iPhone a partir do iOS 16.4; o que muda no navegador do Instagram/Facebook).
- [x] **Provas — ADAPTADO em 17/11 (regra do Gabriel: sem servidor local; pausa de memória): Lighthouse, instalabilidade no Chrome e emulação WebKit NÃO foram feitos; no lugar: leitura HTTP em produção (produção == código), testes de unidade e a tabela "o que testei aqui × o que só aparelho prova". Original:** Lighthouse/instalabilidade no Chrome, emulação de WebKit (Playwright) do manifesto e do SW, e uma **tabela "o que testei aqui × o que só um aparelho real prova"**. O **teste no iPhone real fica com o Gabriel/Rogério**, com roteiro de até 10 linhas pronto no relatório.
- [ ] **Android — PENDENTE: só aparelho real, depois do deploy (bloco Android de `docs/pwa/ROTEIRO_IPHONE_REAL.md`; ação do Gabriel/Rogério):** reconfirmar que instala e abre (Chrome).
- [x] (adaptado: janela do Controle 22:50) `npm run typecheck` verde (17,6 s) e `vitest run --maxWorkers=1` dos arquivos da E: 5 arquivos, 86 testes, 0 vermelhos; `npm test` da suíte inteira e `npm run build` ficam na bateria do merge do Controle. Original: `npm run typecheck`, `npm test`, `npm run build` ao fim da branch (um conjunto só, no fim).

## Ler (e só isto)

- `docs/pwa/MD_EXECUCAO.md` — o que o PWA prometeu em 05/11 e as decisões D1–D10 (D1 SW nunca guarda HTML; D5 iPhone sem sinal de instalação)
- `src/app/manifest.ts`, `src/app/sw.js/route.ts`, `src/app/apple-icon.png` — manifesto, rota do service worker, ícone da Apple
- `src/lib/pwa/*` (`README.md`, `ATALHOS.md`, `service-worker.ts`, `instalacao.ts`, `navegador.ts`, `atualizacao.ts`, `instalacao.test.ts`) — regras puras de instalação e o texto do SW
- `src/components/pwa/*` — banner, botão da landing e painel de instruções
- `src/app/layout.tsx` — **só** `metadata`/`viewport` (e o `<script>` do convite do Chrome, se for preciso entendê-lo)
- `src/middleware.ts`, `src/middleware.test.ts`, `src/server/rotas-publicas.ts` — por que `/inicio` vira `/entrar` e quais rotas são públicas
- `next.config.mjs` — cabeçalhos de `/manifest.webmanifest` e `/sw.js`, `htmlLimitedBots`
- `public/pwa/`, `public/offline.html`, `src/styles/pwa.css` — ícones, tela sem conexão e CSS do painel
- `RISCOS_ASSUMIDOS.md` — só o **RA-60** (atalho do PWA)
- `docs/polimento/plataforma/ferramentas/README.md` — como ver tela logada sem banco (para testar o app instalado)
- Para o contrato D↔E, **só leitura**: `src/components/login/**`, `src/app/entrar/**` (o botão de Google e como ele navega)

Se a Execução abrir algo que não está aqui nem em Touch, **acrescenta aqui com o motivo** (E7).

## Touch

- Tudo o que é PWA: `src/app/manifest.ts`, `src/app/sw.js/**`, `src/app/apple-icon.png`, `src/lib/pwa/**`, `src/components/pwa/**`, `src/styles/pwa.css`, `public/pwa/**`, `public/offline.html`
- `src/app/layout.tsx` — **somente** o bloco `metadata`/`viewport` (dono da região; D não edita)
- `src/middleware.ts` e `src/server/rotas-publicas.ts` — mudança **mínima**, protegida por `src/middleware.test.ts`; **qualquer mudança prova com teste que nenhuma rota logada ficou pública**
- `next.config.mjs` — só os cabeçalhos de PWA (`/manifest.webmanifest`, `/sw.js`), se o diagnóstico exigir
- Testes novos ou ajustados: `src/lib/pwa/*.test.ts`, `src/middleware.test.ts`
- Documentos da frente: `docs/pwa/DIAGNOSTICO_PWA.md`, `docs/pwa/ROTEIRO_IPHONE_REAL.md` (o roteiro de até 10 linhas também entra no diagnóstico), `docs/pwa/MD_EXECUCAO.md` (só para registrar o que mudou), `docs/diario/execucoes/pesquisa/e-*.md` (Específico)
- Arquivos do processo da frente em `docs/diario/execucoes/2026-11-17--manut-e-pwa-iphone--*` e a memória R11 em `docs/memorias/2026-11-17--claude-code--manut-pwa-iphone.md` (Auditoria)

## Do not touch

- `src/components/login/**`, `src/app/entrar/**`, `src/app/cadastrar/**` — são da frente **D**; o que quebrar no login do iPhone instalado vai como pedido a D, pelo chat de branch (contrato D↔E)
- Landing (`src/components/landing/**`) — salvo o `import` do `BotaoBaixarApp` que já existe; mudança de landing é da D/polimento
- Qualquer regra de negócio, Server Action, `src/domain/**`, `src/server/**` (menos `rotas-publicas.ts`)
- Superfície protegida: `constants.ts`, `fees.ts`, `market.ts`, `types.ts`, `store/types.ts`
- Arquivo geral da raiz: `CLAUDE.md`, `RISCOS_ASSUMIDOS.md`, `docs/memorias/README.md`, `docs/INDICE_VEGA.md`, `ESTADO-GERAL-*` (B5) — as linhas prontas vão ao registro; o Controle encaixa no merge
- `.env.local`, segredos, `node_modules` (é uma junção para a pasta principal: nunca apagar, nunca reinstalar)

## Fora de escopo

App nativo (Swift/Kotlin), publicação em App Store ou Play Store, notificações push, modo offline com dados.

## Regras que valem aqui (apontadas, não reescritas)

Nenhum commit (B1) · sem lint/typecheck/suíte por arquivo; testes **da branch** ao fim (E3) · MD de execução atualizado a cada tópico (E4) · segurança é decisão do Gabriel (R10): **não criar trava nova** · não criar regra que o Gabriel não falou (R13) · sem a palavra token/NFT/cripto/ativo digital/investimento/rentabilidade em texto novo (nem no painel do iPhone) · marca **Real Olímpico** (masculino) · comentários em português explicando o porquê · TypeScript strict, sem `any` · teste visual/página de conferência é temporário e **sai antes do commit** · leitura de produção só com `BEGIN READ ONLY` (esta frente nem precisa do banco).

## Achados do chat de branch (leitura inicial, para a Execução não redescobrir)

1. **Fato do pedido:** o PWA saiu em `2b48b04` (05/11) e **nunca foi testado em aparelho real**; D5 do MD do PWA já avisa que o iPhone não tem sinal de instalação visto do Safari.
2. **Contrato D↔E** (executivo §4.3): o login por Google precisa fechar o ciclo **dentro do app instalado** (redirect na mesma janela, sem popup). E só **confere e devolve a D**; não edita login.
3. **O app instalado no iPhone tem armazenamento próprio**, sem os cookies do Safari. Logo, o cliente que entrou no Safari **entra de novo** no app. Se o diagnóstico mostrar que o fluxo de entrada dentro do app é ruim (por exemplo, `start_url` leva a `/entrar` e o login Google abre outra janela), isso é **defeito nosso** com conserto parte em E (start_url/escopo) e parte em D (botão).
4. **`/inicio` sem sessão responde 307 → `/entrar`** (MD do PWA, "O que foi testado"): conferir se o `start_url` do manifesto cai aí, o que a Apple considera redirecionamento e pode mostrar a barra do Safari ou perder o escopo.
5. **Hook da worktree:** barra Write/Edit fora da worktree (pasta base). O `registro/E.md` da pasta base não é gravável; o registro vai para a pasta de notas da família.
6. **Playwright/WebKit:** ainda **não conferido** se o Playwright está instalado em `node_modules` (junção). O Específico confere e, se faltar o navegador WebKit, avisa o chat de branch com o comando (instalar WebKit é download pesado; não instalar sem avisar).

## Tópicos

### T1 — Diagnóstico estático (os 8 pontos) + pesquisa dos requisitos atuais do iOS

Estado: **fechado em 17/11** — `docs/pwa/DIAGNOSTICO_PWA.md` v1 com os 8 pontos e a pesquisa do iOS (`e-ios-requisitos.md`, entregue pelo Específico, iOS vigente 27.x). Os itens que dependiam de leitura em produção foram preenchidos no T2.
Aceite deste tópico: `docs/pwa/DIAGNOSTICO_PWA.md` v1 com os 8 pontos, cada um marcado **OK · limite da Apple · defeito nosso · não verificável aqui**, com a evidência (arquivo:linha ou saída de comando) ao lado.
Arquivos deste tópico: `docs/pwa/DIAGNOSTICO_PWA.md` (novo); leitura de todos os da lista Ler. **Específico** entrega `docs/diario/execucoes/pesquisa/e-ios-requisitos.md` (versão do iOS vigente, data e fonte de cada requisito: instalar pelo Safari, Chrome do iPhone ≥ iOS 16.4, navegadores embutidos, `apple-touch-icon`, `appleWebApp`, `display: standalone`, escopo/`start_url`, cookies isolados, OAuth no modo standalone).
Log:
- 17/11 Execução leu a lista Ler inteira (manifest, sw.js/route, service-worker.ts, instalacao.ts, navegador.ts, atualizacao.ts, GuiaDeInstalacao, RaizDoPwa, layout metadata, middleware + rotas-publicas + middleware.test, next.config, offline.html, README/ATALHOS de `src/lib/pwa`, RA-60, `LoginForm`/`auth.ts`/`callback` só leitura).
- 17/11 **Achado 1 (defeito nosso, menor):** o Next 15.5 só emite `mobile-web-app-capable` a partir de `appleWebApp.capable` (`node_modules/next/dist/lib/metadata/generate/basic.js:263`); a tag documentada pela Apple, `apple-mobile-web-app-capable`, **não saía** no `<head>` (o MD do PWA de 04/11 supunha que sim). Corrigido já em `src/lib/pwa/metadados.ts` (usado por `layout.tsx`) + `metadados.test.ts`.
- 17/11 **Achado 2:** o login Google navega **na mesma janela** (`LoginForm.tsx:98`, sem pop-up): cumpre o contrato D↔E no que depende da página. O que o iOS faz ao sair do escopo para o Google e voltar ao callback fica para a pesquisa.
- 17/11 **Achado 3:** não existia teste de **comportamento** do service worker (só de trecho do texto) nem do `matcher` do middleware. Acrescentados `service-worker.test.ts` e o bloco "matcher" em `middleware.test.ts` (nenhuma página logada fora da rede; nomes parecidos continuam protegidos). Ainda **não rodados** (suíte só ao fim, E3).
- 17/11 Pedido enviado ao Específico (`E: Pesquisa iOS e emulação WebKit`): pesquisa do iOS + build de produção + `<head>`/cabeçalhos/SW no WebKit e no Chromium. **Só o Específico compila nesta worktree** (um `.next` só).
- 17/11 Específico entregou `e-ios-requisitos.md` (§0–§11, fontes e datas). Conclusões que mudaram o diagnóstico: (a) iOS 26+ não tem requisito de instalabilidade, então o **Achado 1 é menor** e não explica o problema (reclassificado); (b) cookies de login são **copiados uma vez no ato de adicionar (iOS ≥ 17.2)** → "entre antes de adicionar" é a orientação que falta; (c) chave **"Abrir como app web"** (iOS 26+): desligada, o ícone abre no Safari; (d) Google no app: nenhuma fonte atual resolve, só aparelho.
- 17/11 Conferido por leitura dos bytes: `apple-icon.png` 180×180 e os três ícones de `public/pwa/` são PNG de paleta **sem bloco `tRNS`** (opacos).
- 17/11 Rodado **uma vez**: `vitest run src/lib/pwa src/middleware.test.ts` → 4 arquivos, 75 testes verdes (inclui os novos `service-worker.test.ts` 16, `metadados.test.ts` 4 e 3 do matcher).
Próximo ato deste tópico: nenhum (fechado).

### T2 — Conferência por leitura: manifesto, SW e cabeçalhos em PRODUÇÃO (sem servidor local) — REPLANEJADO em 17/11

Estado: **fechado em 17/11** — o Específico entregou `e-producao-leitura.md` (leitura de 22:38 a 22:40, base `9e21fe1`) e a tabela "provado por teste × lido em produção × só aparelho real" está no diagnóstico. **Substitui** o T2 original ("emulação WebKit/Chrome com build de produção local"), que a regra permanente do Gabriel proíbe (sem servidor local, sem `npm run dev`/`start`, sem container; e a máquina está sem memória para navegador headless).
Aceite deste tópico: tabela de evidências no diagnóstico, só com o que se mede **lendo** (HTTP simples contra `https://realolimpico.com.br`, sem subir nada): (a) cabeçalhos reais de `/manifest.webmanifest` e `/sw.js` (`curl.exe -sI`); (b) `<head>` do HTML publicado (`curl.exe -s`) com as metatags iOS — vale como o **"antes"**: a produção está no estado `9e21fe1`, as correções só aparecem depois do deploy; (c) o que `/inicio` responde sem sessão, sem seguir redirecionamento (esperado 307 → `/entrar`); (d) ícones publicados: tipo e tamanho; (e) manifesto publicado × `manifest.ts`; (f) corpo de `/sw.js` publicado × `service-worker.ts`; (g) Lighthouse/instalabilidade: **só remoto e leve, e só se o Controle liberar** (nenhum navegador local); (h) tabela **"o que testei aqui × o que só um aparelho real prova"**, agora mais longa: tudo o que exige rodar o app (SW controlando a página, WebKit, standalone, login Google no app, cookie copiado ao adicionar) vira item de aparelho real / conferência pós-deploy.
Arquivos deste tópico: `docs/pwa/DIAGNOSTICO_PWA.md`; `docs/diario/execucoes/pesquisa/e-producao-leitura.md` (Específico: saída real de cada comando, com data e hora). Nenhum código de produto. O antigo `e-emulacao-webkit.md` **não será feito**.
Log:
- 17/11 22:45 replanejado pelo chat de branch por ordem do Controle (regra permanente do Gabriel). O comportamento do service worker segue provado pelo teste `src/lib/pwa/service-worker.test.ts` (roda o worker de verdade num ambiente de teste), não por navegador.
- 17/11 Específico entregou `e-producao-leitura.md`: produção == repositório (manifesto idêntico a `manifest.ts`; `/sw.js` idêntico byte a byte, 3.310 bytes); ícones 192/512/maskable/180×180 existem, com a dimensão declarada e sem transparência; `<head>` de `/` e `/entrar` traz as metatags do iPhone no HTML cru, **só falta** `apple-mobile-web-app-capable` (já corrigida); `/inicio` sem login → 307 → `/entrar` → 200 (1 salto, no escopo); cabeçalhos de manifesto e `/sw.js` corretos.
- 17/11 Execução copiou a leitura para o diagnóstico (linhas 1, 4 e 7 dos 8 pontos + seção "o que testei aqui × o que só um aparelho real prova", em três quadros). Trocados também os jargões do Resumo (R13, T4) por palavras de negócio e os números das perguntas do roteiro (`start_url` = passo 7).
- 17/11 Dos 6 achados do §8 do Específico: **1** já corrigido; **2** (`start_url` 307) segue sem mexer, é o passo 7 do roteiro; **3** (logo de `/entrar` leva à landing com o convite) — **conferido no código**: dentro do app (`standalone`) o caminho vira "instalado" e o botão some (`resolverCaminho`, teste em `instalacao.test.ts:110`), então não confunde; **4** (emblema de 772 KB no pré-cache do SW, refeito a cada deploy) e **5** (favicon de 394 KB) são peso, não função: **não mexidos** (o 4 mexeria em `service-worker.ts`, `offline.html` e no teste, sem ninguém ter pedido); anotados no diagnóstico para o polimento; **6** é limite da Apple, nada a fazer. Nenhum defeito novo: o T3 não reabre.
- 17/11 **Não feito, por regra do Gabriel/Controle:** Lighthouse remoto (a categoria PWA nem existe desde o Lighthouse 12) e instalabilidade pelo DevTools do Chrome. Isso vai para o aparelho Android do roteiro.
Próximo ato deste tópico: nenhum (fechado).

### T3 — Correções do que é defeito nosso + testes

Estado: **fechado em 17/11** quanto ao que o T1 achou; se o T2 (leitura de produção) achar outro defeito, reabre só para ele.
Aceite deste tópico: cada defeito do T1/T2 tem correção em arquivo da lista Touch e **um teste que a prova** (vermelho antes, verde depois quando possível). Mudança em `middleware.ts`/`rotas-publicas.ts`: teste de que **nenhuma rota logada ficou pública**. Cada correção anotada em uma linha no diagnóstico ("defeito → correção → teste").
Arquivos deste tópico: os da lista Touch.
Log:
- 17/11 **Defeito 1 (menor):** `apple-mobile-web-app-capable` não saía no `<head>` (Next 15.5). Correção: `src/lib/pwa/metadados.ts` (novo; `other`) usado por `src/app/layout.tsx` (só o bloco `metadata`). Teste: `src/lib/pwa/metadados.test.ts` (4). Não é a causa do "não funciona" (o iOS 26+ lê o manifesto).
- 17/11 **Defeito 2 (texto do painel do iPhone):** ver T4. Teste: `GuiaDeInstalacao.test.ts`.
- 17/11 **Proteções, sem defeito por trás:** `src/lib/pwa/service-worker.test.ts` (16; o worker roda de verdade num navegador de mentira: nada de HTML guardado, 307 passa intacto, API/POST/outra origem intocados) e o bloco "matcher" em `src/middleware.test.ts` (3; nenhuma página de `(app)`/`(admin)` fora da rede; `/pwa`, `/offline`, `/manifest` seguem protegidos).
- 17/11 **Não mexido, por decisão:** `middleware.ts`, `rotas-publicas.ts`, `manifest.ts`, `next.config.mjs`, `service-worker.ts` — nenhuma evidência pediu. `start_url: '/inicio'` (307 deslogado) fica; vira pergunta 7 do roteiro e, se o aparelho mostrar problema, volta com dado. Superfície protegida tocada: **nada**.
- 17/11 Rodado uma vez, **antes** da pausa de memória: `vitest run src/lib/pwa src/middleware.test.ts` → 4 arquivos, 75 testes verdes (sem o `GuiaDeInstalacao.test.ts`, que veio depois). Suíte inteira, `typecheck` e `lint`: só no T5, em lote único.
Próximo ato deste tópico: nenhum.

### T4 — Painel "Como instalar no iPhone" revisado + roteiro do aparelho real

Estado: **fechado em 17/11** (código, teste escrito e roteiro) — texto aprovado pelo chat de branch com um ajuste de frase ("costuma abrir já com o seu acesso", sem prometer). Falta só a **reconfirmação do Android**, que sem navegador local vira o bloco Android do roteiro (conferência manual pós-deploy).
Proposta aprovada (aba iPhone de `GuiaDeInstalacao.tsx`; aba Android e aviso flutuante ficam como estão; conferida com o iOS 27.x, pesquisa de 17/11/2026, `e-ios-requisitos.md` §1, §2, §6, §9):
- **Nota nova no topo da aba** (some dentro de navegador embutido): "**Antes de adicionar, entre na sua conta.** Assim o app já abre com o seu acesso. Se ainda não entrou, ele pede o seu login na primeira vez." _(Por quê: o iOS copia o login uma única vez, na hora de adicionar — WebKit, iOS 17.2.)_
- **Passo 1** — "Toque em **Compartilhar**" · dica: "O ícone é um quadrado com uma seta para cima. Não achou? Toque em **⋯** (Mais)." _(tira "na barra do Safari": a posição varia com o desenho do Safari.)_
- **Passo 2** — "Toque em **Adicionar à Tela de Início**" · dica: "Role a lista para baixo, se precisar." _(igual a hoje.)_
- **Passo 3** — "Deixe ligada a chave **Abrir como app web** e toque em **Adicionar**" · dica: "Ligada, o ícone abre o Real Olímpico em tela cheia. Desligada, ele abre só um atalho dentro do Safari. Se a chave não aparecer no seu iPhone, é só tocar em Adicionar." _(iOS 26+; rótulo exato só o aparelho confirma — por isso o efeito vem descrito.)_
- **Passo 4** — "Abra pelo ícone do Real Olímpico" · dica: "Ele fica na tela inicial, como qualquer outro app, e se atualiza sozinho." _(igual a hoje.)_
- **Fora do Safari no iPhone** (Chrome, Edge, Firefox) — nota: "Você está no {navegador}. O caminho mais seguro no iPhone é o **Safari**. Pelo {navegador} também pode dar certo, no botão **Compartilhar**; se “Adicionar à Tela de Início” não aparecer, abra este endereço no **Safari**."
- **Ilustração `BarraDoSafari` sai da aba iPhone** (mostra um único desenho de barra; a posição do Compartilhar varia). O ícone de cada passo continua.
- **Navegador embutido** (Instagram, Facebook, TikTok) e botão "Já adicionei ao meu iPhone": sem mudança.
Aceite deste tópico: texto do painel conferido com o iOS vigente (versão e data citadas); passo a passo Safari → Compartilhar → Adicionar à Tela de Início; Chrome do iPhone (a partir do iOS 16.4); o que muda no navegador embutido do Instagram/Facebook/TikTok; **roteiro de até 10 linhas** para o Gabriel/Rogério testarem no iPhone real, copiado no diagnóstico e em `docs/pwa/ROTEIRO_IPHONE_REAL.md`; e a reconfirmação do **Android** (Chrome instala e abre). O **texto do painel precisa de OK do chat de branch** antes de entrar (copy visível ao cliente).
Arquivos deste tópico: `src/components/pwa/GuiaDeInstalacao.tsx`, `IconesDoGuia.tsx`, `src/lib/pwa/instalacao.ts` (+ testes), `src/styles/pwa.css`, `docs/pwa/ROTEIRO_IPHONE_REAL.md`.
Log:
- 17/11 OK do chat de branch com um ajuste na nota do topo (frase sem promessa). Aplicado em `GuiaDeInstalacao.tsx` (`PassosIphone`, agora exportada, e `PassosAndroid`, exportada só para o teste): nota "entre antes de adicionar" (não aparece em navegador embutido), passo 1 sem "na barra do Safari", passo 3 "Deixe ligada a chave Abrir como app web", nota do Chrome/Edge/Firefox com o Safari como caminho mais seguro; passos 2 e 4, aba Android, navegador embutido e "Já adicionei" intactos (4 passos nas duas abas).
- 17/11 `BarraDoSafari` apagada de `IconesDoGuia.tsx` (código morto depois da mudança); comentário de `pwa.css` e README de `src/components/pwa/` atualizados.
- 17/11 Teste novo `src/components/pwa/GuiaDeInstalacao.test.ts` (renderiza as duas abas com `renderToStaticMarkup`). Pedido do chat de branch: "atualizar testes de `instalacao.ts` que dependam desses textos" → **nenhum** depende (o texto mora no TSX; `instalacao.test.ts` só testa regras), então o teste novo é o que cobre o texto. **Rodado depois**, com o OK do Controle para um arquivo por vez (ver a linha abaixo).
- 17/11 22:43 Rodado: `npx vitest run src/components/pwa/GuiaDeInstalacao.test.ts` → **1 arquivo, 11 testes verdes** (464 ms). Nada vermelho, nada corrigido.
- 17/11 `docs/pwa/ROTEIRO_IPHONE_REAL.md` escrito: 10 passos de iPhone (cobrem as 10 perguntas de aparelho de `e-ios-requisitos.md` §11; a 10ª, de 7 dias, vai como lembrete) + 4 passos de Android; cópia curta no diagnóstico. Cobre os itens pedidos pelo chat de branch: entrar antes e conferir se abre logado, chave ligada × desligada, tela cheia, Google no app, e-mail e senha no app, link de WhatsApp/e-mail abre no Safari, Instagram, Android.
- 17/11 Versão e data do iOS conferidas: iOS 27.x, pesquisa de 17/11/2026 (`e-ios-requisitos.md` §0).
Próximo ato deste tópico: nenhum (fechado).

### T5 — Contrato com D (OAuth no app instalado) + suíte da branch

Estado: **fechado em 17/11** — contrato D↔E feito; lote de testes rodado na janela do Controle (22:50), verde.
Aceite deste tópico: seção "Contrato D↔E" no diagnóstico com **como o Google funciona dentro do app instalado hoje** e **o que D precisa entregar** (ou "nada"), pronta para o Controle repassar à frente D; pendência de D anotada no registro. Ao fim, **ordem do Controle (17/11, substitui o texto anterior):** UM lote com `npm run typecheck` + `vitest run src/lib/pwa src/components/pwa src/middleware.test.ts` — **não** `npm test` da suíte inteira, **sem** build; a suíte inteira e o build rodam na bateria pós-merge do Controle. Anotar aqui o comando exato e a contagem.
Arquivos deste tópico: `docs/pwa/DIAGNOSTICO_PWA.md`; nenhum arquivo de D.
Log:
- 17/11 Seção "Contrato D↔E" escrita no diagnóstico (como o Google funciona hoje no app instalado; o que D precisa entregar: nada agora e três cuidados; pendência de D: conferir os passos 5 e 7 do roteiro depois do deploy). Nenhum arquivo de D tocado.
- 17/11 Achado ao ler `LoginForm`/`auth.ts`: a tela de entrar **não tem "esqueci minha senha"** (só o painel da equipe envia o link de redefinição). Conta criada só pelo Google fica sem saída se o Google falhar no app instalado. Está no contrato como decisão de D com o Gabriel; **não é defeito desta frente** e nada foi criado.
- **RESULTADO DO LOTE (17/11, janela aberta pelo Controle às 22:50; worktree da E, em sequência, um de cada vez):**
  1. `npm run typecheck` (`tsc --noEmit`), 22:50:10 → 22:50:28 (17,6 s): **sem nenhum erro**.
  2. `npx vitest run --maxWorkers=1 src/lib/pwa src/components/pwa src/middleware.test.ts`, 22:50:31 → 22:50:36 (1,46 s de testes): **5 arquivos, 86 testes, 0 vermelhos** (os 75 de antes + os 11 de `GuiaDeInstalacao.test.ts`).
  3. Não rodados, por ordem do Controle: `npm run build`, suíte inteira (`npm test`), `npm run lint`, servidor local, Playwright. Rodam na bateria pós-merge dele.
  Nada precisou de correção.
- **Aceite do T5:** cumprido — contrato D↔E escrito no diagnóstico e lote verde. Pendência de D anotada: conferir os passos 5 e 7 do roteiro depois do deploy.
- **Aceite geral (seção "Aceite" deste MD):** cumprido o que se prova sem aparelho — diagnóstico com os 8 pontos e fonte, leitura de produção, os dois defeitos nossos corrigidos com teste, painel do iPhone revisado, roteiro pronto, contrato com D. **Fica para o aparelho real**, depois do deploy: o roteiro do iPhone (passos 4, 5 e 7 decidem se falta consertar algo) e o bloco Android. O resto do aceite ("instala e abre como app no iPhone") só se confirma com o iPhone na mão; o relatório diz o que é limite da Apple e o que era defeito nosso.
Próximo ato deste tópico: mandar "FRENTE E PRONTA" ao chat de branch; depois do deploy, Gabriel ou Rogério fazem o roteiro.

### Fechamento — arquivos da frente E (para o chat de branch conferir no `git status`)

Modificados (6): `src/app/layout.tsx` (só `metadata`), `src/components/pwa/GuiaDeInstalacao.tsx`, `src/components/pwa/IconesDoGuia.tsx`, `src/components/pwa/README.md`, `src/middleware.test.ts`, `src/styles/pwa.css` (só comentário). Mais `docs/pwa/MD_EXECUCAO.md` (seção "Manutenção de 17/11/2026").
Novos de código: `src/lib/pwa/metadados.ts`, `src/lib/pwa/metadados.test.ts`, `src/lib/pwa/service-worker.test.ts`, `src/components/pwa/GuiaDeInstalacao.test.ts`.
Novos de documento: `docs/pwa/DIAGNOSTICO_PWA.md`, `docs/pwa/ROTEIRO_IPHONE_REAL.md`; pesquisa do Específico em `docs/diario/execucoes/pesquisa/` (`e-ios-requisitos.md`, `e-producao-leitura.md`); arquivos de processo `docs/diario/execucoes/2026-11-17--manut-e-pwa-iphone--*` (este MD, LOG e CONTINUIDADE, estes dois da Auditoria).
Não tocados: `src/middleware.ts`, `src/server/rotas-publicas.ts`, `manifest.ts`, `next.config.mjs`, `service-worker.ts`, landing, login, `src/app/entrar|cadastrar`. Superfície protegida: nada. Migration: nenhuma.
**Linha pronta para ATALHOS.md / RISCOS_ASSUMIDOS.md: nenhuma.** Nenhum atalho de teste ou segurança foi tomado. Um risco **conhecido e não resolvido**, que já está no diagnóstico e não cabe como atalho: o login do Google dentro do app instalado do iPhone só se confirma em aparelho real (roteiro, passo 5).

## Sessões

### Sessão 2026-11-17 — chat de branch (nascimento)

Tipo: E
Feito: leitura do modelo dos chats, da ficha E, do processo 2.0 e do executivo; Passo 0 (junção de `node_modules`, `.env.local`, base `9e21fe1`); este MD; registro da frente na pasta de notas.
Não feito: todos os tópicos.
Bloqueios para o humano: nenhum.
Teste rodado? não
Próximo ato (um): abrir Execução, Auditoria e Específico; criar a rotina de 5 minutos; avisar o Controle.
