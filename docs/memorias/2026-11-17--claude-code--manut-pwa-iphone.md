# PWA no iPhone (frente E, item 10b do Rogério) — memória do agente

- **Data:** 2026-11-17 · **Agente:** claude-code (Auditoria da frente E; fatos tirados do MD de execução, do diagnóstico e das duas pesquisas) · **Projeto/branch:** manut-pwa-iphone (`claude/manut-pwa-iphone-eb49d6`, base `9e21fe1`)

## 1. Estado em uma tela
- Produção == repositório: manifesto idêntico a `src/app/manifest.ts` e `/sw.js` idêntico byte a byte (3.310 bytes) ao que `montarServiceWorker()` gera. O diagnóstico estático vale como diagnóstico de produção.
- Manifesto, ícones 192/512/maskable e `apple-touch-icon` 180×180 opaco: corretos em forma. Cabeçalhos de `/manifest.webmanifest` e `/sw.js`: corretos.
- Dois defeitos nossos achados, **nenhum é a causa principal**: (1) `apple-mobile-web-app-capable` não saía no `<head>` (o Next 15.5 só emite `mobile-web-app-capable`) → corrigido em `src/lib/pwa/metadados.ts`, usado pelo bloco `metadata` de `layout.tsx`; (2) texto do painel do iPhone → reescrito em `GuiaDeInstalacao.tsx`.
- Provas novas: `metadados.test.ts`, `service-worker.test.ts` (executa o worker de verdade), `GuiaDeInstalacao.test.ts`, bloco "matcher" em `src/middleware.test.ts`. `middleware.ts` e `rotas-publicas.ts` **não** foram tocados.
- Roteiro de aparelho real pronto (`docs/pwa/ROTEIRO_IPHONE_REAL.md`, 10 passos iPhone + 4 Android). T1–T5 fechados; falta o teste manual do Gabriel/Rogério. Resultado do T5: `verde às 22:50 (17/11): `npm run typecheck` sem erro; `vitest run --maxWorkers=1 src/lib/pwa src/components/pwa src/middleware.test.ts` = 5 arquivos, 86 testes, 0 vermelhos. Não rodados por ordem do Controle: build, `npm test` inteiro, lint (bateria pós-merge)`.

## 2. Decisões e o porquê
- `start_url: '/inicio'` (307 → `/entrar` deslogado) **não mexido** — nenhuma fonte da Apple trata 307 na `start_url` como problema (limite documentado é de escopo) e nada pediu; vira o passo 7 do roteiro.
- Emblema de 772 KB no pré-cache do SW e favicon de 394 KB: peso, não função; **não mexidos**, anotados para o polimento.
- T2 original (build local + emulação WebKit) **cancelado**; virou leitura HTTP em produção (`e-producao-leitura.md`), por regra do Gabriel (abaixo).
- Texto do painel do iPhone: OK do chat de branch com ajuste ("costuma abrir já com o seu acesso", sem prometer).
- **Regra permanente do Gabriel (via Controle, 17/11/2026):** "Nada de servidores locais ou containers, tudo sempre direto pra produção" — sem `npm run dev`/`start`, preview, container, build+emulação local.

## 3. O que aprendi (armadilhas, fatos que valem para o futuro)
- **iOS 26+ não tem mais requisito de instalabilidade no Safari** (WebKit, 15/09/2025: "zero requirements"): todo site adicionado abre como web app por padrão. Para iOS 16.4–18 vale `display: standalone` no manifesto **ou** a meta `apple-mobile-web-app-capable`.
- **Cookies: o app da Tela de Início tem armazenamento separado do Safari.** Desde o **iOS 17.2** a Apple copia os cookies **uma única vez, no toque em "Adicionar"** (só se a autenticação for por cookie; `localStorage` não vai). Nossa sessão é cookie HttpOnly de 7 dias → quem adiciona logado abre logado; quem adiciona deslogado entra de novo no app. Daí a orientação "entre antes de adicionar".
- **Chave "Abrir como app web" (iOS 26+):** desligada, o ícone abre um atalho dentro do Safari (parece "não é app"). O rótulo exato só o aparelho confirma — o painel descreve o efeito.
- A posição do botão Compartilhar varia com o desenho do Safari; citar o ícone e o nome, nunca a posição. Navegadores embutidos (Instagram/Facebook/TikTok) não oferecem "Adicionar à Tela de Início".
- **Google no app instalado: só aparelho real decide.** O login navega na mesma janela (`LoginForm.tsx:98`, sem popup), mas `accounts.google.com` sai do escopo e o iOS abre folha do Safari; fontes de 2019 e 2023 se contradizem. Falha provável: `?erro=callback` em `/entrar/callback`. Contrato D↔E no diagnóstico.
- **"Esqueci minha senha" não existe** na tela de entrada (conferido no código pelo chat de branch em 17/11, base 9e21fe1: `resetPasswordForEmail` só em `src/server/admin/identidade.ts:134` e `redefinirSenha` em `src/server/admin/usuarios.ts:433`, ambos do painel da equipe; `LoginForm.tsx` sem link nem ação; existe só a tela de destino `src/app/entrar/nova-senha/page.tsx` + `NovaSenhaForm.tsx` e o tratamento `type=recovery` em `src/app/entrar/callback/route.ts:11`) — pendência de D, não da frente E.
- Em iOS 26+ o app instala sem service worker; ele só serve a tela offline. SW nunca guarda HTML (D1 do `docs/pwa/MD_EXECUCAO.md`).
- **Máquina com ~0,2 GB de RAM livres (17/11/2026):** Controle pausou build, Playwright, Lighthouse local e navegador headless; testes só em lote único no fim. Lighthouse 12 nem tem mais categoria PWA.
- Método de leitura de produção sem servidor: `curl.exe` GET/HEAD (sem POST, sem cookie), citando hora e versão do deploy (`dpl_…`).
- Caminhos: pesquisas em `docs/diario/execucoes/pesquisa/` (`e-ios-requisitos.md`, `e-producao-leitura.md`); diagnóstico `docs/pwa/DIAGNOSTICO_PWA.md`. Hook da worktree barra escrita na pasta base (`docs/manutencao-2026-11/registro/`): o registro vai pela pasta de notas da família.
- Contas/variáveis: nenhuma usada (frente sem banco, sem env, sem migration).

## 4. Como continuar (próximos passos exatos)
1. Bateria pós-merge do Controle: `npm run build`, `npm test` inteiro e `npm run lint` (não rodados na branch por ordem do Controle).
2. Merge pelo Controle (onda 1); depois do deploy, o Gabriel/Rogério seguem `docs/pwa/ROTEIRO_IPHONE_REAL.md` num iPhone real (passos 4, 5 e 7 decidem se ainda falta consertar algo, em especial `start_url` e Google no app).
3. Repassar à frente D o contrato D↔E (Google no app instalado; "esqueci minha senha").

## 5. Pendências e riscos
- Teste em iPhone real e Android real: só Gabriel/Rogério. Sem ele, "instala e abre" fica provado só por leitura e teste unitário.
- Google no app instalado: risco aberto, depende de aparelho e de D.
- Peso do pré-cache (772 KB) e favicon (394 KB): polimento, ninguém pediu.

## 6. Ligações
[[terminologia-juridica-aurea]] · [[marca-real-olimpico-no-site]] · `docs/pwa/MD_EXECUCAO.md` (PWA de 05/11) · MD de execução, LOG e CONTINUIDADE desta frente em `docs/diario/execucoes/2026-11-17--manut-e-pwa-iphone--*`.



## 7. Fechamento
**NÃO FEITO: teste em iPhone real e em Android real (Gabriel/Rogério, depois do deploy); Lighthouse e emulação WebKit (cancelados por regra do Gabriel: sem servidor local); `npm run build`, `npm test` inteiro e `npm run lint` (bateria pós-merge do Controle).**

## Lista exata de arquivos (fechamento, 17/11/2026)
**Modificados (7):** `src/app/layout.tsx` (só o bloco `metadata`) · `src/components/pwa/GuiaDeInstalacao.tsx` · `src/components/pwa/IconesDoGuia.tsx` · `src/components/pwa/README.md` · `src/middleware.test.ts` · `src/styles/pwa.css` (só comentário) · `docs/pwa/MD_EXECUCAO.md`.
**Novos de código (4):** `src/lib/pwa/metadados.ts` · `src/lib/pwa/metadados.test.ts` · `src/lib/pwa/service-worker.test.ts` · `src/components/pwa/GuiaDeInstalacao.test.ts`.
**Novos de documento:** `docs/pwa/DIAGNOSTICO_PWA.md` · `docs/pwa/ROTEIRO_IPHONE_REAL.md` · `docs/diario/execucoes/pesquisa/e-ios-requisitos.md` · `docs/diario/execucoes/pesquisa/e-producao-leitura.md` · arquivos de processo `docs/diario/execucoes/2026-11-17--manut-e-pwa-iphone--*` (MD de execução, LOG, CONTINUIDADE, relatórios) · memória `docs/memorias/2026-11-17--claude-code--manut-pwa-iphone.md`.
**Não tocados:** `middleware.ts`, `rotas-publicas.ts`, `manifest.ts`, `next.config.mjs`, `service-worker.ts`, login, `src/app/entrar|cadastrar`, landing, superfície protegida. Migration: nenhuma. Commits: ver nota Git abaixo.

**Git:** Durante o trabalho da branch: 0 commits (B1 respeitado). Depois do "FRENTE E PRONTA" apareceu o commit 82257a7 (22:54), feito fora da branch de trabalho (autoria operacional a confirmar com o Controle); working tree limpa naquele momento.

