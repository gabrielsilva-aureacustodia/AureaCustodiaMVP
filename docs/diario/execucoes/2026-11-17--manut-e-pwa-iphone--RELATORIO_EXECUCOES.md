# Relatório de Execuções (detalhado) — frente E · manut-pwa-iphone

**Auditoria, 17/11/2026 22:55. T5 fechado e lote verde (ver §4).**

## 1. Cabeçalho
Projeto Real Olímpico · branch `claude/manut-pwa-iphone-eb49d6` · ref_commit `9e21fe1` · item 10b do Rogério (prazo 30/11/2026) · sem migration · 0 commits durante o trabalho (B1) · packet: `C:\dev\AureaCustodiaMVP\docs\manutencao-2026-11\frentes\E-pwa-iphone.md` · aberta e trabalhada em 17/11/2026.

## 2. Tópicos na ordem real
1. **T1 — Diagnóstico estático + pesquisa iOS:** fechado. `docs/pwa/DIAGNOSTICO_PWA.md` v1 com os 8 pontos; Específico entregou `e-ios-requisitos.md` (iOS vigente 27.x). A pesquisa reclassificou o defeito das metatags como menor e apontou a sessão (cookie) e a chave "Abrir como app web" como causas prováveis.
2. **T3 (adiantado, antes do T2) — Correções + testes:** fechado. Dois defeitos nossos corrigidos; proteções acrescentadas.
3. **T4 — Painel do iPhone + roteiro:** fechado. Texto aprovado pelo chat de branch com ajuste de frase; roteiro de 10 passos (iPhone) + 4 (Android).
4. **T2 — REPLANEJADO** por ordem do Controle (regra do Gabriel: nada de servidor local; pausa de memória): em vez de build local + emulação WebKit, leitura HTTP de produção pelo Específico (`e-producao-leitura.md`, 22:38–22:40). Fechado. Lighthouse e instalabilidade no Chrome: **não feitos** (viram passo Android do roteiro).
5. **T5 — Contrato D↔E + suíte da branch:** contrato D↔E escrito no diagnóstico; lote único: verde às 22:50 (17/11): `npm run typecheck` sem erro; `vitest run --maxWorkers=1 src/lib/pwa src/components/pwa src/middleware.test.ts` = 5 arquivos, 86 testes, 0 vermelhos. Não rodados por ordem do Controle: build, `npm test` inteiro, lint (bateria pós-merge).

## 3. Arquivos tocados (uma linha de porquê)
Modificados:
- `src/app/layout.tsx` — só o bloco `metadata`: passa a espalhar `METADADOS_DO_PWA`.
- `src/components/pwa/GuiaDeInstalacao.tsx` — aba iPhone reescrita (entrar antes, chave "Abrir como app web", Compartilhar sem posição, nota Chrome/Edge/Firefox).
- `src/components/pwa/IconesDoGuia.tsx` — remove `BarraDoSafari` (código morto).
- `src/components/pwa/README.md`, `src/styles/pwa.css` — comentário/README acompanhando.
- `src/middleware.test.ts` — bloco "matcher" (+72/−1): prova que arquivos do PWA ficam fora e nenhuma rota logada saiu da rede.

Novos:
- `src/lib/pwa/metadados.ts` + `metadados.test.ts` — `apple-mobile-web-app-capable` que o Next não emite.
- `src/lib/pwa/service-worker.test.ts` — comportamento real do SW (16 testes).
- `src/components/pwa/GuiaDeInstalacao.test.ts` — trava a copy do painel.
- `docs/pwa/DIAGNOSTICO_PWA.md`, `docs/pwa/ROTEIRO_IPHONE_REAL.md` — entregáveis.
- `docs/diario/execucoes/pesquisa/e-ios-requisitos.md`, `e-producao-leitura.md` — pesquisas do Específico.
- MD de execução, LOG, CONTINUIDADE e estes relatórios — processo da frente.

Intocados por decisão: `middleware.ts`, `rotas-publicas.ts`, `manifest.ts`, `next.config.mjs`, `service-worker.ts`, `src/components/login/**`, `src/app/entrar|cadastrar`, landing.

## 4. Testes rodados
- `vitest run src/lib/pwa src/middleware.test.ts` — **uma vez**, 22:3x, antes da pausa de memória: 4 arquivos, 75 verdes (sem `GuiaDeInstalacao.test.ts`, que veio depois).
- Lote do T5 (janela do Controle, 22:50): verde às 22:50 (17/11): `npm run typecheck` sem erro; `vitest run --maxWorkers=1 src/lib/pwa src/components/pwa src/middleware.test.ts` = 5 arquivos, 86 testes, 0 vermelhos. Não rodados por ordem do Controle: build, `npm test` inteiro, lint (bateria pós-merge).
- Leitura de produção por `curl.exe` GET/HEAD (sem servidor, navegador nem POST).

## 5. Bloqueios para o humano
- Teste no iPhone real e no Android real (Gabriel/Rogério), depois do deploy: `docs/pwa/ROTEIRO_IPHONE_REAL.md`.

## 6. O que o MD de execução já cobre
Todos os tópicos com log por data: `2026-11-17--manut-e-pwa-iphone--MD_EXECUCAO.md`. A trilha da Auditoria: `...--LOG_DE_EXECUCAO.md`. Desvios de regra da Auditoria: nenhum (única observação, a copy aprovada antes de aplicada, ficou resolvida).

## 7. Próximo ato (um)
Chat de branch recebe "FRENTE E PRONTA"; Controle roda build, suíte inteira e lint na bateria pós-merge; depois do deploy, Gabriel/Rogério fazem o roteiro do aparelho real.




**NÃO FEITO: teste em iPhone real e em Android real (Gabriel/Rogério, depois do deploy); Lighthouse e emulação WebKit (cancelados por regra do Gabriel: sem servidor local); `npm run build`, `npm test` inteiro e `npm run lint` (bateria pós-merge do Controle).**

## Lista exata de arquivos (fechamento, 17/11/2026)
**Modificados (7):** `src/app/layout.tsx` (só o bloco `metadata`) · `src/components/pwa/GuiaDeInstalacao.tsx` · `src/components/pwa/IconesDoGuia.tsx` · `src/components/pwa/README.md` · `src/middleware.test.ts` · `src/styles/pwa.css` (só comentário) · `docs/pwa/MD_EXECUCAO.md`.
**Novos de código (4):** `src/lib/pwa/metadados.ts` · `src/lib/pwa/metadados.test.ts` · `src/lib/pwa/service-worker.test.ts` · `src/components/pwa/GuiaDeInstalacao.test.ts`.
**Novos de documento:** `docs/pwa/DIAGNOSTICO_PWA.md` · `docs/pwa/ROTEIRO_IPHONE_REAL.md` · `docs/diario/execucoes/pesquisa/e-ios-requisitos.md` · `docs/diario/execucoes/pesquisa/e-producao-leitura.md` · arquivos de processo `docs/diario/execucoes/2026-11-17--manut-e-pwa-iphone--*` (MD de execução, LOG, CONTINUIDADE, relatórios) · memória `docs/memorias/2026-11-17--claude-code--manut-pwa-iphone.md`.
**Não tocados:** `middleware.ts`, `rotas-publicas.ts`, `manifest.ts`, `next.config.mjs`, `service-worker.ts`, login, `src/app/entrar|cadastrar`, landing, superfície protegida. Migration: nenhuma. Commits: 0.

## Git
Durante o trabalho da branch: 0 commits (B1 respeitado). Depois do "FRENTE E PRONTA" apareceu o commit 82257a7 (22:54), feito fora da branch de trabalho (autoria operacional a confirmar com o Controle); working tree limpa naquele momento.

