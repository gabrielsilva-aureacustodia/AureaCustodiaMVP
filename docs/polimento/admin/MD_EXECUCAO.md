# MD de execução — `polish/aurea-admin` (Frente 2 — painel administrativo)

```
Worktree:   /workspace/aurea/wt/admin        (npm ci próprio; sem junção nem symlink)
Branch:     polish/aurea-admin               base origin/main @ d29727a
Agente:     Claude Code (bot "ÁUREA · Polimento, tutorial do Admin e check-up")
Porta:      next start em 127.0.0.1:3105     (a frente 1 usava 3104)
Merge:      sem push e sem PR — o Gabriel faz os dois
```

## Regras desta frente
- **Touch:** `src/app/(admin)`, `src/components/admin`, `src/styles/admin.css`, `docs/polimento/admin/**`.
- **Não tocar:** permissões (`src/domain/admin/permissoes.ts`, `temPermissao`/`temAlguma` e as conferências de página e de Server Action), `domain/`,
  `server/`, `api/`, migrations, dados, `src/components/ui/**` (só consumir), `(app)` e `recibo.css` (frente 1, PR #13).
- Ambiente: `.env.test.local` ignorado + store em memória; nada de produção. Commits pelo `commit.md` (português, imperativo, sem co-autoria e sem rodapé);
  antes de cada commit, `typecheck`, `test` e `build`. Sem push, sem PR.
- **Distilla lido direto** (`/workspace/sintetica/agentes/distilla/`), nunca por API. Componentes de alto nível (taxonomia do Distilla): composição,
  acessível por padrão, tokens, estados desenhados, nada de componente órfão, usando `src/components/ui/`. Peça visual, ilustração, ícone, imagem ou
  revisão de texto **não se gera aqui**: vai para `/workspace/aurea-polimento/pedidos_workers.md`.

## Sessões

### Sessão 1 — 30/10/2026 (Claude Code, Sonnet 5.5)

**Abertura.** `git status` limpo na worktree; base `d29727a`. `npm ci` só nela (Node 20.20: aviso `EBADENGINE` do Supabase, sem efeito).
Identidade git só deste repositório (`Claude Code (bot Áurea polimento)`).

**Base medida antes de mexer:** typecheck ok · lint 0 erros / 16 avisos (todos fora desta frente) · test 157/157 arquivos, 1.457 passando · build ok.

**Descoberta:** o admin já foi redesenhado em 25/10 (`3f50da6`), e os documentos que o README e o `navegacao.tsx` citam (`docs/polimento/admin/BENCHMARK.md`,
`INVENTARIO.md` §9, `BRIEF_DE_DESIGN.md`) **nunca foram commitados**. Esta frente cria os três pedidos (INVENTARIO, BENCHMARK, MD de execução); o
`BRIEF_DE_DESIGN.md` citado no README de `components/admin` não foi pedido — o brief curto está em `BENCHMARK.md` §4 e a citação fica como pendência de texto.

**Bloco 1 — inventário e benchmark: FEITO.** `INVENTARIO.md` (rotas × permissões × componentes × escritas, contrato, ganchos para o tutorial da frente 3,
auditorias, medição) e `BENCHMARK.md` (cinco lentes, tabelas contra o conceito 23, brief, decisões D1–D8, propostas P1–P4 que não apliquei).
Medição em navegador local isolado (`next start`, store em memória, sessão `dev`): 18 rotas × 3 larguras × 2 temas = **0 rolagem horizontal, 0 erro de console**.

**Achados (lista de trabalho, em ordem):**

| # | Achado | Lente | Evidência |
|---|---|---|---|
| R1 | Recibo de `/admin/moedas/[codigo]/cliente` com contraste 4,33:1 e 3,89:1 (mín. 4,5:1) | 5 | axe `color-contrast` |
| R2 | 46 `div.table-scroll` à mão; 3 rotas com região rolável sem teclado | 2/3/5 | axe `scrollable-region-focusable` em Financeiro, Indicadores, Equipe |
| R3 | Mesmo `<title>` nas 17 telas medidas | 1 | `page.title()` |
| R4 | Salto de nível de título em Bancada e Notas fiscais | 5 | axe `heading-order` |
| R5 | Linha de tabela de 63–88 px; "REC-/000001" quebra no meio do código no acervo | 2 | captura 1440 e medição de altura |
| R6 | 48 `style={{}}` | 3 | varredura (parte dinâmica) |
| R7 | `100vh` sem `dvh` no menu lateral | 2 | `admin.css` |
| R8 | Sem `@media print` | 5 | `admin.css` |

**Próximo:** R1 + R2 (acessibilidade e o componente `TabelaRolavel`), R3 + R4 (títulos), R5 + R7 + R8 (tabela, `dvh`, impressão), R6 (estilos inline). Pedidos a workers: nenhum.

**Limites do ambiente (sem Postgres):** 9 das 18 rotas abrem com "Ambiente sem banco de dados"; papéis `socio` e `operacao` (só `dev` aqui), conversas de WhatsApp,
DRE com valores, fila de NFS-e e trilha real **não foram vistos**. As correções valem pelo que dá para medir; o que depende de dado fica marcado como não medido.
