# MD de execução — check-up final (frente 4)

Branch `fix/aurea-checkup-final`, base `main` d29727a. Escopo: `docs/checkup/` e correções pequenas.
Não toca `src/components/tutorial`, `src/domain/tutorial*`, `src/app/(admin)/admin/layout.tsx`,
`docs/polimento/` (outras frentes, PRs #13 e #14).

## Sessão 1 — 30/10/2026

### Bloco 1 — Preparação
- Lidos `CLAUDE.md` e `AGENTS.md`. Worktree limpa. Playwright 1.64.1 global + Google Chrome local.
- Regra de VM: nada pesado; a varredura é curta e foi local.
- Descoberto na leitura do código: rotas públicas (`src/server/rotas-publicas.ts`) e a conferência
  do cron (`src/server/cron-auth.ts`), para garantir que uma GET sem cabeçalho nos crons só pode
  receber 401 antes de qualquer sondagem.

### Bloco 2 — Sonda de API (GET, sem credencial)
- 19 caminhos, produção e alias: resultados idênticos. Ver relatório, seção 2.
- Critério de segurança: nenhuma POST; webhooks e crons só com GET sem cabeçalho.

### Bloco 3 — Varredura Playwright
- 22 rotas × 2 viewports × 2 hosts. Coleta de console, `pageerror`, `requestfailed`, respostas ≥ 400,
  rolagem horizontal, `h1`, `alt`, alvos de toque. Cliques apenas em links internos e botões que não
  enviam/autenticam; os de Google foram pulados de propósito.
- Achado falso: botão de senha com 40×40 na medição; o CSS já amplia a 44 px por `::before`.
- Achado benigno: 8 `ERR_ABORTED` de prefetch `_rsc`.

### Bloco 4 — Relatório
- `RELATORIO_CHECKUP.md` escrito. Sem alteração de código.

### Checks finais
- `npm run typecheck`: passou.
- `npm run lint`: 0 erros, 16 avisos (já existentes, fora do escopo).
- `npm run build`: passou.
- `npm run test`: 1418 passaram, 38 ignorados; na primeira rodada 5 arquivos de banco (PGlite:
  `admin/banco`, `db/db`, `db/livro-de-ordens`, `db/payments`, `db/troca-email`) estouraram o tempo
  limite com a máquina carregada por outras frentes (8 CPUs, ~10 GB em uso). Rodados sozinhos e em
  série: 5/5 arquivos, 100 testes passaram em 17 s. Falha de ambiente, não de código.

### Fora de escopo / não feito
- Qualquer área logada (sem credencial), POST de qualquer rota, preview de branch (URL não informada).
