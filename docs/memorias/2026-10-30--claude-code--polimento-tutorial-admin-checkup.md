---
name: polimento-tutorial-admin-checkup
description: As 4 frentes de 30/10/2026 (polimento do cliente e do admin, tutorial do painel, check-up), PRs #13 a #17, tutorial v3 em produção e o que ficou pendente
metadata:
  type: project
---

Quatro frentes, cada uma em worktree e branch próprias, sobre a `main` `d29727a`, todas mergeadas:

| Frente | PR | Merge commit | Resumo |
|---|---|---|---|
| 1 · polimento da plataforma do cliente | #13 | `0124c41` | estados (`error.tsx`, `loading.tsx`), modal no lugar de `window.confirm`, alvo de toque 44 px, contraste e impressão do recibo, layout sem salto no tour |
| 2 · polimento do `/admin` | #14 | `82d803a` | `TabelaRolavel` focável (46 tabelas), `<title>` por página, títulos sem salto, `@media print`, `style={{}}` 48 → 6, rótulo do campo Caixa da bancada |
| 3 · tutorial do `/admin` por papel | #15 e #17 | `29f3257` e `6a0b8ac` | `src/domain/tutorial-admin.ts` + `TutorialAdmin.tsx`; tour só na primeira entrada de cada membro, nas telas só o botão "Ver tutorial desta página"; depois `h2`, passo da busca em ≤ 560 px e **`VERSAO_DO_TUTORIAL` v3** |
| 4 · check-up final (sessão paralela) | #16 | `4edfe4f` | só leitura em produção: 0 erro de console, APIs privadas respondem 401 em JSON; nenhum defeito de código sem login |

**Produção:** o merge `6a0b8ac` gerou deploy `Production` com sucesso; `realolimpico.com.br` serve a chave `ro-tutorial:v3` e o título do tour em `h2`. O tutorial v3 só muda a chave do localStorage (sem migration, sem dado): todo cliente revê o tour no próximo acesso.

**Why:** o admin tinha sido redesenhado em 25/10 sem inventário nem benchmark commitados, e o tutorial só existia para o cliente. O Gabriel pediu ativar o tutorial para todos.

**Pendências (nada disto está feito):**
- **Área logada, `/admin` e webhooks não testados contra produção**: sem credenciais liberadas, o check-up cobre só a parte pública e as respostas 401. POST de `/api/webhooks/*`, `/api/eventos` e estação ficaram sem teste (escrita).
- **Papéis sócio e operação vistos só em teste de domínio**, nunca no navegador (sem Postgres local só existe `dev`); telas sem dado (Atendimento, Uso, Contábil, NFS-e, trilha) sem as âncoras do tutorial conferidas.
- **Atalho `/` da busca (WCAG 2.1.4, tecla única) não aplicado**; propostas P2 a P4 do `docs/polimento/admin/BENCHMARK.md` §6 também (chips de filtro, colunas visíveis, gráficos em SVG).
- **Teste instável sem causa identificada:** a suíte falhou 2 vezes (7 arquivos; depois 1 teste) e passou na repetição, sem mudança de código.
- **As 5 rodadas do Distilla ainda não foram recebidas** (o plano dele chegaria pelo Gabriel); as frentes seguiram o método lido direto em `agentes/distilla/`.
- Revisão de linguagem dos textos do tutorial do painel pedida ao DeepSeek (T3-01 em `/workspace/aurea-polimento/pedidos_workers.md`); Firefox/WebKit não medidos; sem CSP e `/robots.txt`/`sitemap.xml` 404 (observações do check-up).

**How to apply:**
- **Sessões paralelas por branch:** uma frente = uma worktree = uma branch = uma sessão; cada uma só toca nas pastas dela (a frente 3 não mexe em `docs/polimento/` das 1–2 nem em `docs/checkup/`). Quando duas sessões faziam o mesmo trabalho (o check-up), a ordem foi parar a duplicada e entregar o que já se tinha em arquivo.
- **Push e merge sem esperar, mas só do que está verde:** quando o Gabriel mandou mergear, o que não estava commitado e verificado ficou fora do PR e foi para branch nova a partir da `main` (`git stash` → `git switch -c … origin/main` → `git stash pop`). Merge só com CI verde e merge commit.
- **Push da conta certa:** o git da máquina usa `gabrielsilva-sintetica` (403 no repositório). Usar o token de `gabrielsilva-aureacustodia` só no comando, por `http.extraheader` ou `GH_TOKEN`, sem `gh auth switch` e sem imprimir.
- **Ambiente de medição local:** `.env.test.local` ignorado, store em memória, `next start` (não `next dev`), cookie de sessão calculado com o `SESSION_SECRET` descartável; Playwright + axe com `/usr/bin/google-chrome`.
- **Mexer na versão do tutorial** (`VERSAO_DO_TUTORIAL`, `VERSAO_DO_TUTORIAL_ADMIN`) é o botão de "refazer para todos". Detalhes em `docs/polimento/admin/TUTORIAL_MD_EXECUCAO.md`.
