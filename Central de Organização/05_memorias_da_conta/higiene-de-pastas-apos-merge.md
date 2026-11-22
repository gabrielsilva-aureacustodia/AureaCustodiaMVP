---
name: higiene-de-pastas-apos-merge
description: "Ritual da Áurea Custódia — depois de merge de branches e dos testes (meus e manuais do Gabriel), perguntar se está tudo ok, relatar erros, e então remover os worktrees e pastas de branch que sobraram em C:\\dev."
metadata: 
  node_type: memory
  pinned: false
  originSessionId: 22aafff8-a5af-4bbe-b7ae-265d5b5f30c5
  modified: 2026-09-15T11:46:15.828Z
---

# Depois do merge: confirmar com o Gabriel e limpar as pastas

Em 15/09/2026 havia treze pastas de worktree em `C:\dev` (as das frentes A/B/C, `-admin`, e as sete
`-e1` a `-e7` das branches de execução). Gabriel entendeu por que existiam, mas pediu um ritual:
**"após merge de branches e testes tanto aqui no ambiente, como testes manuais da minha parte, você deve
me perguntar se está tudo ok (e me avisar de erros encontrados ou se está tudo bem) e então, higienizar as
pastas criadas, excluindo o que não precisa mais e colocando tudo na pasta Main."** Ele pediu que isso
seja feito quando as sete branches de execução (E1 a E7) forem integradas.

## O ritual

1. **Depois do merge e dos testes do ambiente** (typecheck, lint, suíte, build, deploy conferido),
   relatar ao Gabriel o que passou e os erros encontrados, e **perguntar se os testes manuais dele
   estão ok**. Não limpar antes da resposta.
2. **Com o ok dele**, higienizar: conferir que cada branch está mesclada na `main` e publicada
   (`git branch --merged origin/main`), que o worktree não tem alteração sem commit
   (`git -C <pasta> status --short`), e então `git worktree remove <pasta>` e apagar a branch local já
   mesclada. Por fim `git worktree prune`.
3. **Deixar tudo na pasta principal** `C:\dev\AureaCustodiaMVP`, atualizada com `git pull --ff-only`.
4. **Exceções** — manter a pasta e dizer por quê: branch com trabalho não mesclado, worktree com
   alteração sem commit, ou frente ainda em andamento. Nunca apagar pasta que não seja worktree deste
   repositório (`C:\dev` tem outros projetos, como `IOCUS_Park` e `Maquina_de_Vendas`).

O ritual também está escrito em `docs/diario/RITUAL_DE_SESSAO.md` e em
`docs/execucao-pendencias/INTEGRACAO.md`.
