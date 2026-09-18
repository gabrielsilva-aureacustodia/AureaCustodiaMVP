# Integração das branches E1–E7 na `main`

> ✅ **Concluída em 18/09/2026.** E3, E2, E1, E4 e E7 estão na `main` e no `origin/main`; `git branch
> --no-merged main` volta vazio, com 845 testes verdes e typecheck limpo. **E5 e E6 foram canceladas** no
> mesmo dia, então as linhas 5 e 6 das tabelas deste documento não têm mais uso. O documento fica como
> registro de como a integração foi feita. A E8 ainda não foi executada.

```
Quando:      depois de E1, E2, E3, E4 e E7 relatarem "E<N> pronta para integração — <hash>".
Eficiência:  typecheck, lint, suíte e build uma vez no fim dos merges, ou logo após um merge com conflito de código
Quem:        o agente de integração (prompt em PROMPTS.md) ou o Gabriel pedindo ao Claude
Worktree:    C:\dev\AureaCustodiaMVP-integracao, branch integracao/execucao-pendencias a partir de origin/main
Publica:     git push origin HEAD:main (avanço simples, sem forçar)
```

> **Para o Rogério.** É a etapa que junta o trabalho dos sete agentes na versão oficial do site, um de
> cada vez, conferindo depois de cada um que nada quebrou.

## 0. Antes de começar

- `git fetch origin` e conferir que as sete branches existem em `origin/exec/e*` e que cada relatório em
  `docs/execucao-pendencias/relatorios/E<N>.md` termina na linha de pronta.
- Parar qualquer `npm run dev` deste worktree. A suíte roda sem servidor local.
- Base: **86 arquivos de teste, 741 testes passando, 1 pulado.**

## 1. Ordem e o que conferir depois de cada merge

Ordem desta rodada: **E3 → E2 → E1 → E4 → E7** (linhas 5 e 6 ficam para a integração de E5 e E6).
Cada merge é `git merge --no-ff origin/exec/<branch>`. `npm run typecheck`, `npm run lint`, `npm test`
(comparando a contagem de arquivos) e `npm run build` rodam **uma vez depois do último merge**; só rodam
no meio se um merge tiver conflito em código. A conferência extra de cada linha entra nesse ciclo final.

| Ordem | Branch | Arquivos de teste depois do merge (estimativa) | Conflitos esperados | Conferência extra |
|---|---|---|---|---|
| 1 | E3 limpeza | 86 (739 testes: saem 2) | nenhum | build: `/relatorios`, `/api/relatorios/*`, `/painel` e `/admin` continuam na lista |
| 2 | E2 cobrança | 88 | nenhum | `npx vitest run src/server/payments src/server/estacao src/domain/analise.test.ts src/server/db/derivar.test.ts` |
| 3 | E1 portas de entrada | 94 | nenhum | suíte completa; `/painel` e `/entrar/nova-senha` no build |
| 4 | E4 custódia | 99 | `RISCOS_ASSUMIDOS.md` (índice e fim), `src/server/actions/ATALHOS.md` (fim), talvez `src/server/actions/README.md` | build |
| 5 | E5 QA C1/C2 | 109 | `RISCOS_ASSUMIDOS.md`; talvez `src/components/admin/README.md` | suíte completa |
| 6 | E6 QA C3 | 121 | `RISCOS_ASSUMIDOS.md` (linhas RA-45/46 encostam em RA-44 e RA-47); imports de `src/app/(app)/vender/page.tsx`; talvez `src/components/README.md`, `src/server/admin/ATALHOS.md`, `src/styles/admin.css` | suíte completa e build |
| 7 | E7 documentação | 121 | nenhum | — |

A estimativa sai dos próprios documentos; **vale o número que o relatório de cada branch declarar**.
Contagem menor que a do relatório é worker de teste que morreu: rodar de novo, com o servidor parado.

**Como resolver:** em `RISCOS_ASSUMIDOS.md` e nos `ATALHOS.md`, **pela união** — cada linha com o texto da
branch dona, índice e seções em ordem numérica (RA-49, 50, 51, 52, 53, 54, 55). Em imports, as duas linhas.
Em código, parar e ler os dois lados; se o conflito não for trivial, registrar e pedir ao dono.

## 2. Commit da integração, depois do último merge

- **Pendências feitas**: em `docs/finalizacoes/PENDENCIAS_AGENTE_C.md` marcar ✅ FEITO P-C1-03 (E3),
  P-C2-04, P-C2-05, P-C2-09 (E1), P-C3-01 (feito em 14/09, migrations 024 e 025) e P-C3-03 (E2); corrigir o
  passo 4 do P-C1-02 (conta fora da equipe vai para `/painel`, não para `/inicio`) e o parágrafo "Se quiser
  usar o e-mail real" do mesmo item (desde o RA-48, o e-mail do Gabriel já abre o painel). P-C2-03 já está
  marcado como feito (a chave está cadastrada na Vercel, confirmado pelo Gabriel em 15/09). Em
  `docs/publish_docs/PENDENCIAS_MANUAIS_AGENTE_C.md`, marcar a **D-2 ✅ decidida em 15/09**: 30 dias corridos
  para **postar** a moeda; a entrega depende dos Correios (o alinhamento dos textos é a tarefa 8b da E8). Em `docs/finalizacoes/PENDENCIAS_AGENTE_B.md`, a seção 4 que a E7 deixa
  "em execução na E2" passa a "feita — merge da E2". Em
  `docs/publish_docs/PENDENCIAS_MANUAIS_AGENTE_A.md` marcar A-4 e em `_B.md` marcar B-2 (E4), cada um com
  o hash do merge.
- **Índice único** (`docs/PENDENCIAS_ABERTAS.md`, da E7): mover as linhas resolvidas por E1–E6 de "em
  execução" para "feitas".
- **README** desta pasta: a tabela de status passa as sete para "integrada — <hash>".
- **Migrations**: nenhuma branch usa as reservadas por padrão. Se alguma criou migration, rodar
  `npm run db:migrate` **antes** do push; senão, `npm run db:check` termina em `025_caixas_fisicas`.

## 3. Publicar e conferir

1. `git push origin HEAD:main`.
2. Esperar o status "Vercel" do commit sair de pending (`gh api repos/gabrielsilva-aureacustodia/AureaCustodiaMVP/commits/<hash>/status --jq .state`).
3. Sem login: `https://aurea-custodia-mvp.vercel.app/painel` responde 200 com "Entrar no painel";
   `https://aurea-custodia-mvp.vercel.app/admin` responde 307 para `/painel`; `/entrar`, `/taxas`,
   `/termos`, `/suporte` respondem 200.

## 4. Roteiro manual consolidado para o Gabriel

Juntar num documento só, sem repetir passos: os roteiros A–C da E1, os da E5 (com a limpeza usando conta
de teste, nunca conta da equipe), os da E6, o opcional da E4 e **uma única conferência de comissão** — em
`/admin/configuracao`, **numa mesma gravação**, a comissão percentual do vendedor vai para `1,25` e a fixa
para `1,50`; confere-se a simulação, `/taxas` com a versão nova e a tela de venda (E6); e numa segunda
gravação as duas voltam para `0,5` e `1,00`. Cada salvar publica versão nova da Tabela de Taxas e reabre a
faixa de aceite de todas as contas: são duas publicações, não quatro. A compra direta com a taxa vigente
(E2) **não** entra no roteiro: sem Mercado Pago o modal para em "Nenhuma cobrança foi aberta", e a prova é
o teste `src/server/payments/compra-direta-taxa-vigente.test.ts`.

## 5. Depois da integração: perguntar ao Gabriel, e só então limpar as pastas

Ritual da Parte 4.1 de `docs/diario/RITUAL_DE_SESSAO.md`, pedido do Gabriel em 15/09/2026.

1. **Relatar ao Gabriel** o resultado dos testes do ambiente (o que passou e **os erros encontrados**, ou que
   está tudo bem), entregar o roteiro manual consolidado da seção 4 e **perguntar se os testes manuais dele
   estão ok**. Não limpar nada antes da resposta.
2. **Com o ok**, para cada pasta `C:\dev\AureaCustodiaMVP-e1` a `-e7` e `C:\dev\AureaCustodiaMVP-integracao`:
   conferir que a branch aparece em `git -C C:/dev/AureaCustodiaMVP branch --merged origin/main` e que
   `git -C <pasta> status --short` volta vazio; então `git -C C:/dev/AureaCustodiaMVP worktree remove <pasta>`
   e `git -C C:/dev/AureaCustodiaMVP branch -d <branch>`. No fim, `git -C C:/dev/AureaCustodiaMVP worktree prune`
   e `git -C C:/dev/AureaCustodiaMVP pull --ff-only`.
3. **Também entram na limpeza** os worktrees antigos já mesclados das rodadas anteriores
   (`-banco`, `-cadastro`, `-cobranca`, `-juridico`, `-mercado`, `-admin`), com a mesma conferência. Pasta com
   alteração sem commit ou branch não mesclada fica, e o relatório diz qual e por quê.
4. **Nunca** apagar pasta que não seja worktree deste repositório: `C:\dev` tem outros projetos.
5. Liberar a **E8** (prompt em `PROMPTS.md`), que parte da `main` integrada. A pasta `-e8` e a de integração
   da E8 são limpas pelo mesmo ritual depois da integração dela.

## 6. Integração da E8

Quando o relatório `relatorios/E8.md` terminar em "E8 pronta para integração":

1. Worktree de integração a partir de `origin/main` e `git merge --no-ff origin/exec/e8-segunda-onda-conciliacao-e-rastreio`.
2. `npm run typecheck`, `npm run lint`, `npm test` (sem servidor local) e `npm run build`.
3. **Se a E8 criou a migration 030**: `npm run db:migrate` neste worktree, **antes** do push (o script acha o
   `.env.local` da pasta principal sozinho), e `npm run db:check` listando a 030.
4. Commit da integração: RA-24 e RA-53 marcados em `docs/PENDENCIAS_ABERTAS.md` e em `RISCOS_ASSUMIDOS.md`
   conforme o relatório; a tabela de situação do `README.md` desta pasta com a E8 integrada.
5. `git push origin HEAD:main`, deploy conferido como na seção 3.
