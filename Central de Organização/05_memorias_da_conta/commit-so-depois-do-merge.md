---
name: commit-so-depois-do-merge
description: "Commit só no fim, depois do merge de todas as branches — plano de branch, lint, typecheck e teste não se commitam antes da execução; tudo roda local até lá."
metadata: 
  node_type: memory
  pinned: false
  originSessionId: acf601ea-cd67-4b31-9044-e20eff16470a
  modified: 2026-09-21T23:58:13.163Z
---

# Commit é no fim, depois do merge — não a cada pedaço

Em 21/09/2026, depois de eu commitar planos de branch e pedaços de execução ao
longo do dia, o Gabriel escreveu a regra por extenso:

> **"Nenhum commit deve ser realizado antes de finalizar features e execução
> completa. Não serve de literalmente NADA realizar commit de pedaço por pedaço
> de execução. Cada branch simplesmente confirma finalização da tarefa; no fim,
> eu realizo merge e commit num agente só, de todas as branches. (…) Temos
> repositório local não é atoa, é pra poder fazer tudo aqui, testar NO FINAL de
> execuções e aí se der tudo certo, realizar merge e commit."**

> **"Nenhum commit de MD de plano executivo de Branches deve ser feito, nem
> lint, nem typecheck, nem nenhum teste, nem nada do tipo, antes de executar de
> fato o plano. (…) Isso serve para colocar no github APÓS a execução completa e
> commit, para servir como log do que foi feito, principalmente para resolução
> de bugs e modificações posteriores."**

## O que isso muda

**Enquanto a branch está sendo feita, nada vai para o histórico.** A branch
existe como espaço de trabalho local; quando a tarefa termina, o agente
**avisa** que terminou, e é só. O merge e o commit de todas as branches acontecem
depois, num agente só.

**O MD de plano não se commita antes da execução.** Ele nasce em `docs/` no
disco e fica lá, sem `git add`. Depois que a execução termina e o merge é feito,
aí sim ele entra no repositório — como registro do que foi feito, útil para
depurar bug e para a modificação seguinte. Antes disso, é instrução de trabalho
em andamento e não tem por que estar no GitHub.

**Typecheck, lint e suíte também são do fim.** Não se roda nem se commita nada
disso antes de o plano estar executado. Vale para mim ao montar as branches e
para cada agente dentro da sua.

## A exceção, que ele mesmo delimitou

Commit no meio só para o que **afeta a próxima execução mesmo local**:
configuração de servidor, variável de ambiente na Vercel, migration que precisa
ter rodado, correção de algo já publicado. "Se não afeta, só faz commit após
merge."

## Por que ele insiste

Commit de pedaço sem merge não entrega nada: o arquivo local vai ser editado de
novo na etapa seguinte de qualquer jeito. O histórico enche de estados
intermediários que ninguém vai consultar, e o trabalho real — a feature pronta —
fica mais difícil de achar no meio deles.
