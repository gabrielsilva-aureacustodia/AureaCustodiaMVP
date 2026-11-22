---
name: nunca-usar-ferramenta-agent-subagente
description: "Gabriel proíbe o uso da ferramenta Agent (subagentes) neste projeto, inclusive para pesquisa própria antes de escrever prompts de branch — ler arquivos diretamente."
metadata:
  node_type: memory
  pinned: false
  originSessionId: acf601ea-cd67-4b31-9044-e20eff16470a
  modified: 2026-10-01T23:39:55.053Z
---

# Nunca usar a ferramenta Agent neste projeto — nem para pesquisa própria

Em 01/10/2026, ao preparar prompts de execução para cinco branches novas (mudanças internas,
reenvio de e-mail no admin, deduplicação de contas, redesenho da landing page e módulo de
tutorial), usei a ferramenta `Agent` com `subagent_type: Explore` para levantar caminhos de
arquivo antes de escrever os prompts — um uso que eu considerava inofensivo, já que era pesquisa
minha, não execução da tarefa em si. Gabriel interrompeu no meio da chamada: **"NÃO CRIE
SUBAGENTES, ME DÊ OS PROMPTS PARA CADA AGENTE, FICOU CLARO?"**

## Por que isso é mais amplo do que eu tinha entendido

A regra que já existia (ver `segmentar-em-branches-e-agentes.md`) — "Evite o uso de subagentes
numa tarefa; o mais inteligente é separar as tarefas em branches e executar em agentes
separados" — eu tinha lido como uma restrição sobre como dividir a **execução** do trabalho
pedido. A reação a esta pesquisa, que não tocava código nem executava nada, mostra que a regra é
mais simples e mais ampla: **a ferramenta Agent não se usa neste projeto, ponto**, nem para
levantar contexto antes de planejar.

O motivo que ele já tinha dado, em suas próprias palavras: subagente "demanda um micromanagement
que não vai dar certo na execução, resultando não só em perdas de informação, mas também em
desperdícios obscenos de processamento e tempo." Isso vale tanto para delegar uma feature inteira
quanto para delegar uma busca de cinco minutos.

## O que isso muda no comportamento

Quando eu precisar localizar arquivos, entender uma estrutura ou responder "onde fica X" antes de
escrever um plano ou um prompt de branch — inclusive quando são várias perguntas independentes —
uso `Read`, `Grep` e `Glob` diretamente, eu mesmo, em sequência se precisar, nunca a ferramenta
`Agent` (nem `Explore`, nem `general-purpose`). Se a pesquisa for grande demais para eu fazer
sozinho em tempo razoável, a resposta não é delegar a um subagente: é entregar o levantamento como
parte do próprio prompt de uma branch, que ele vai disparar depois como sessão separada, dizendo
exatamente o que ler.

Isso vale para toda sessão deste repositório, não só para a tarefa que originou a correção.
