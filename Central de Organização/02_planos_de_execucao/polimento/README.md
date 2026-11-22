# Polimento estético do Real Olímpico — orquestração (24/10/2026)

MD de trabalho do orquestrador (este chat, checkout principal em `main`). Não se commita antes do merge
(memória `commit-so-depois-do-merge`). Base metodológica: `C:\dev\aprendizado_frontend` (RITUAIS.md, AGENTS.md,
toolkits/, doc 35 com as lições do K2CON) — o mesmo uso feito no K2CON (`BRIEF_DE_DESIGN.md`, `DESIGN_SYSTEM.md`,
skill `revisao-de-design`, `scripts/qa/*`).

## Frentes (uma frente = uma branch = um agente = um conjunto de pastas)

| # | Frente | Branch (slug) | Touch (só estes) | Pasta de docs |
|---|---|---|---|---|
| 1 | Brandbook e tokens | `feat/brandbook-real-olimpico` | `src/styles/tokens.css`, `base.css`, `src/app/layout.tsx` (fontes), `src/app/globals.css` (só se precisar de import novo, `responsive.css` continua por último), `src/components/ui/**`, `src/brand/**` (novo, pronto para virar package), `docs/marca/**` | `docs/polimento/brandbook/` |
| 2 | Ativos visuais (Antigravity + Nano Banana) | `assets/real-olimpico-visuais` | `.agents/**`, `public/visuais/**` (novo), `docs/polimento/assets/**` | `docs/polimento/assets/` |
| 3 | Landing e páginas públicas | `feat/landing-real-olimpico` | `src/app/page.tsx`, `src/components/landing/**`, `login/**`, `legal/**`, `src/app/{entrar,cadastrar,taxas,termos,privacidade,suporte,academy}/**` (só UI), `src/styles/{landing,login,legal}.css` | `docs/polimento/landing/` |
| 4 | Plataforma do cliente | `feat/plataforma-real-olimpico` | `src/app/(app)/**` (só UI), `src/components/{account,charts,custody,home,market,pagamento,recibo,reports,sell,shell,svg,tutorial}/**`, `src/styles/{shell,home,market,wizard,recibo,reports,account,pagamento,tutorial,responsive}.css` | `docs/polimento/plataforma/` |
| 5 | Admin | `feat/admin-real-olimpico` | `src/app/(admin)/**` e `src/app/painel/**` (só UI), `src/components/admin/**`, `src/styles/admin.css` | `docs/polimento/admin/` |
| 6 | Garantia de funcionamento | este chat, depois do merge | tudo (QA, tutorial, mobile/desktop, backend, migrations) | `docs/polimento/garantia/` |

## Ordem

1. Frentes 1–5 abrem juntas. A 1 entrega primeiro a **paleta, tipografia e tokens** (commit local de contrato, sem push —
   exceção da memória: afeta a próxima execução local das outras frentes) e avisa o orquestrador.
2. Frentes 3–5 fazem benchmarking + inventário + plano no início e, quando a 1 avisar, fazem `git merge` local da branch 1
   antes de recolorir. Estrutura e disposição de blocos podem começar antes, com os nomes de token atuais (a 1 mantém todos
   como aliases).
3. Frente 2 escreve os pedidos (prompt-lens reduzido) com `[SLOT]` de paleta; recebe a paleta da 1; o Gabriel roda no
   Antigravity (sem `GEMINI_API_KEY` nesta máquina — conferido em 24/10/2026).
4. Merge aqui: 1 → 2 → 3 → 4 → 5. Depois a frente 6 e as perguntas ao Gabriel (backend/regras), commit, push, deploy.

## Regras comuns a todas as frentes
- Superfície protegida intocada: `src/domain/**` (constants, fees, market, types…), `src/server/**`, Server Actions,
  migrations, `src/server/store/types.ts`. Nada de regra, alíquota, número ou dado mudado. Proposta de backend/regra vai
  para `docs/polimento/<frente>/PROPOSTAS_BACKEND.md` e é perguntada ao Gabriel **no fim**, por este chat.
- Nenhuma função removida. Reorganizar, sim; excluir, nunca.
- Terminologia jurídica (sem token, NFT, cripto, ativo digital, investimento, rentabilidade…); marca **Real Olímpico**
  (masculino); razão social AUREA CUSTODIA LTDA onde há CNPJ; logos só de `public/brand/`; sem anéis olímpicos.
- Sem commit até o fim (exceto o contrato de tokens da frente 1). Typecheck/lint/test/build só no fim da frente.
- VM do Colab (`toolkits/pesquisa-na-vm/vm.sh`) para capturas de benchmarking, sessão `ro-<frente>`; desligar só a sua.

## Worktrees (criadas em 24/10/2026 a partir de `main` @ d0398d5)
Cada agente é aberto pelo Gabriel na sua pasta, com o prompt entregue no chat orquestrador. Eu não abro agente nem
subagente (memória `sem-subagentes-nem-sessoes-paralelas`). MD de execução de cada frente: `docs/polimento/<frente>/MD_EXECUCAO.md`
dentro da worktree.

| Frente | Pasta | Branch | Agente |
|---|---|---|---|
| 1 | `C:\dev\AureaCustodiaMVP-brandbook` | `feat/brandbook-real-olimpico` | Claude Code |
| 2 | `C:\dev\AureaCustodiaMVP-assets` | `assets/real-olimpico-visuais` | Google Antigravity (Nano Banana 4K) |
| 3 | `C:\dev\AureaCustodiaMVP-landing` | `feat/landing-real-olimpico` | Claude Code |
| 4 | `C:\dev\AureaCustodiaMVP-plataforma` | `feat/plataforma-real-olimpico` | Claude Code |
| 5 | `C:\dev\AureaCustodiaMVP-admin` | `feat/admin-real-olimpico` | Claude Code |
