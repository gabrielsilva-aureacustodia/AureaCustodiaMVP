# Relatório de Modificações — frente E · manut-pwa-iphone

Comparado a: `9e21fe1` · sem commit · rascunho 17/11/2026 22:50.

| Item | Tipo | Path | Consequência |
|---|---|---|---|
| Metatags do iPhone em módulo próprio | contrato (metadados do `<head>`) | `src/lib/pwa/metadados.ts`; usado em `src/app/layout.tsx` (só bloco `metadata`) | O `<head>` passa a trazer `apple-mobile-web-app-capable`, que o Next 15.5 não emite |
| Painel "Como instalar no iPhone" | crítico para o cliente (texto visível) | `src/components/pwa/GuiaDeInstalacao.tsx`, `IconesDoGuia.tsx`, `src/styles/pwa.css` | Nota "entre antes de adicionar", chave "Abrir como app web", sem posição do Compartilhar; some a ilustração do Safari |
| Teste do filtro de entrada | crítico (segurança do middleware) | `src/middleware.test.ts` (bloco "matcher") | Qualquer mudança futura do matcher prova que nenhuma rota logada saiu da rede |
| Testes do PWA | infra de teste | `src/lib/pwa/service-worker.test.ts`, `metadados.test.ts`, `src/components/pwa/GuiaDeInstalacao.test.ts` | Service worker, metatags e copy do painel passam a ter prova |
| Documentos da frente | docs | `docs/pwa/DIAGNOSTICO_PWA.md`, `docs/pwa/ROTEIRO_IPHONE_REAL.md`, `docs/diario/execucoes/pesquisa/e-*.md` | Diagnóstico por evidência e roteiro de aparelho real |

**Não mudou de estrutura:** nenhuma pasta nova na raiz, nenhuma migration, nenhuma variável de ambiente, nenhuma integração nova; `middleware.ts`, `rotas-publicas.ts`, `manifest.ts`, `next.config.mjs`, `service-worker.ts` e a superfície protegida intactos.

**MDs de pasta atualizados:** `src/components/pwa/README.md`. Linhas para os índices (memórias, INDICE_VEGA, ESTADO-GERAL): vão por mensagem ao chat de branch (B5), que as leva ao registro.

**NÃO FEITO: teste em iPhone real e em Android real (Gabriel/Rogério, depois do deploy); Lighthouse e emulação WebKit (cancelados por regra do Gabriel: sem servidor local); `npm run build`, `npm test` inteiro e `npm run lint` (bateria pós-merge do Controle).**

## Lista exata de arquivos (fechamento, 17/11/2026)
**Modificados (7):** `src/app/layout.tsx` (só o bloco `metadata`) · `src/components/pwa/GuiaDeInstalacao.tsx` · `src/components/pwa/IconesDoGuia.tsx` · `src/components/pwa/README.md` · `src/middleware.test.ts` · `src/styles/pwa.css` (só comentário) · `docs/pwa/MD_EXECUCAO.md`.
**Novos de código (4):** `src/lib/pwa/metadados.ts` · `src/lib/pwa/metadados.test.ts` · `src/lib/pwa/service-worker.test.ts` · `src/components/pwa/GuiaDeInstalacao.test.ts`.
**Novos de documento:** `docs/pwa/DIAGNOSTICO_PWA.md` · `docs/pwa/ROTEIRO_IPHONE_REAL.md` · `docs/diario/execucoes/pesquisa/e-ios-requisitos.md` · `docs/diario/execucoes/pesquisa/e-producao-leitura.md` · arquivos de processo `docs/diario/execucoes/2026-11-17--manut-e-pwa-iphone--*` (MD de execução, LOG, CONTINUIDADE, relatórios) · memória `docs/memorias/2026-11-17--claude-code--manut-pwa-iphone.md`.
**Não tocados:** `middleware.ts`, `rotas-publicas.ts`, `manifest.ts`, `next.config.mjs`, `service-worker.ts`, login, `src/app/entrar|cadastrar`, landing, superfície protegida. Migration: nenhuma. Commits: 0.
