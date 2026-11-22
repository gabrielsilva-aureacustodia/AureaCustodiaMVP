# docs/manutencao-2026-11 — pacote da manutenção do Real Olímpico (pendências do Rogério)

```
Criado em:  17/11/2026        Base Git: main = origin/main = 9e21fe1
Estado:     arquivos de trabalho LOCAIS, sem commit até o fim (B2). Vão para a main como log depois da execução e do commit.
Processo:   docs/processo/PROCESSO_EFICIENTE_DE_BRANCHES_2.0.md (Controle → Branch → Execução/Auditoria/Específico)
```

| Arquivo | Para quem | O que é |
|---|---|---|
| `00_MD_EXECUTIVO.md` | Controle (e qualquer um que precise do todo) | Os 16 itens do Rogério, o que já existe no código, matriz de arquivos, contratos entre frentes, decisões D1–D9, ordem de merge, riscos |
| `01_CONTROLE.md` | chat de Controle | Papel, setup, como abrir as frentes, rotina de 5 min, check-up/merge/commit/push/deploy, o que devolver ao Gabriel |
| `02_MODELO_DOS_CHATS_DE_BRANCH.md` | chats de branch e filhos | Passo 0 da worktree, registro vivo, papéis, prompts de Execução/Auditoria/Específico, rotinas de 5 e 3 min, completude, fallbacks |
| `frentes/A…L-*.md` | cada frente | Ficha: pedido do Rogério, aceite, Ler/Touch/Do not touch, decisões, tópicos |
| `frentes/M-*.md` | chat de preparação | **Sem branch e sem chat de branch.** Análise do tráfego pago (gerenciador de anúncios, só leitura, pelo navegador interno) — redefinida pelo Gabriel em 17/11. Resultado em `entregas/ANALISE_DE_TRAFEGO.md`. **Adiada por ordem do Gabriel (17/11): fica por último; a melhoria do site vira branch própria que ele abre depois** |
| `registro/<ID>.md`, `registro/_CONTROLE.md`, `registro/_QUADRO.md` | cada frente escreve só o seu; o Controle lê todos | Estado vivo (criados na execução) |
| `entregas/` | — | Vídeos e arquivos para o Gabriel levar ao Rogério (fora do Git) |
| `OPERACIONAL_FORNECEDORES.md` | Gabriel | Item 5 (criado pelo Controle) |

## Prompt de partida do Controle (colar numa sessão nova, se for preciso reabrir)

```text
Você é o chat de CONTROLE da manutenção do Real Olímpico (projeto Áurea Custódia, C:\dev\AureaCustodiaMVP, branch main, base 9e21fe1).
Leia e siga, nesta ordem, por caminho absoluto: C:\dev\AureaCustodiaMVP\docs\manutencao-2026-11\01_CONTROLE.md (é o seu papel),
00_MD_EXECUTIVO.md, 02_MODELO_DOS_CHATS_DE_BRANCH.md e docs\processo\PROCESSO_EFICIENTE_DE_BRANCHES_2.0.md.
Faça o setup da seção 2 do 01_CONTROLE.md (nome, registro, rotina de 5 minutos), abra as 12 frentes (A a L) numa única rodada e mande o primeiro relatório ao Gabriel.
Você roda em "ignorar permissões" e é o único chat com quem o Gabriel fala. Não peça aprovação do plano: o plano já está escrito.
```
