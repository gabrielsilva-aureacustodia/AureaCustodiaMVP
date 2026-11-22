---
name: processo-eficiente-de-branches-2-0
description: "Processo 2.0 do Gabriel — chat de Controle (rotina 5 min) + chats de branch (rotina 5 min) + Execução, Auditoria (rotina 3 min) e Específico por branch, todos em \"ignorar permissões\"; merge/commit/push/deploy só no Controle"
metadata:
  node_type: memory
  type: feedback
  originSessionId: 959e6ea0-dc44-4466-9343-fa9e7eb251a9
  modified: 2026-11-18T01:19:35.589Z
---

Em 17/11/2026 o Gabriel definiu (e pediu para salvar com este nome; depois será atualizado no painel A2A) o "processo eficiente de branches 2.0". O texto dele, sem edição, está em `docs/processo/PROCESSO_EFICIENTE_DE_BRANCHES_2.0.md`.

**Estrutura:** (1) chat de **Controle** — único com quem ele fala, rotina de 5 em 5 min olhando todos os chats de branch, faz check-up, merge, commit, push e deploy; (2) um **chat por branch/tarefa**, todas concomitantes e sem conflito, cada uma com contexto e MDs próprios e o próprio MD de execução, com rotina de 5 em 5 min que reenvia o MD + um prompt de check-up curto aos filhos; (3) dentro de cada branch: **Execução**, **Auditoria** (rotina de 3 em 3 min: monta logs de execução, rituais, MDs de continuidade, corrige quebra de regra) e **Específico** (só se precisar: pesquisa, navegação, compilação). Todos criados em modo "ignorar permissões".

**Aninhamento (correção do Gabriel, 17/11):** o chat de Controle é de **nível superior** — nunca subchat do chat que o preparou (abri com `start_session` e soltei com `detach_session`). Os chats de branch ficam aninhados no Controle, e Execução/Auditoria/Específico de cada branch ficam aninhados no chat da respectiva branch. Tarefa que não é de código (ex.: análise de tráfego de anúncios) não ganha branch nem chat: o chat de preparação faz, só leitura, e ele logado no navegador interno.

**Why:** ele quer que ninguém fique prolixo, perdido ou confuso; a rotina de check-up reenvia a tarefa o tempo todo e a auditoria separada mantém logs e continuidade sem parar quem executa.

**How to apply:** o método-base é o da Sintetica (`C:\dev\Sintetica\processo\`: `06_REGRAS_DO_GABRIEL_NA_INTEGRA.md`, R1–R13, E1–E12, B1–B6, ritual de sessão, MD de execução e relatórios) — os chats de auditoria recebem essa leitura; nunca afirmar que li o método sem ter achado (ele pediu aviso). O nome de cada chat tem que bater com o trabalho (R12): ele colou um nome de outro projeto uma vez e eu adaptei, avisando. Este processo é o pedido expresso que libera chats/sessões paralelas — fora dele, vale [[sem-subagentes-nem-sessoes-paralelas]]. Commit só depois do merge ([[commit-so-depois-do-merge]]), plano de branch não se commita antes ([[plano-de-execucao-nao-se-commita]]), higiene só depois do OK ([[higiene-de-pastas-apos-merge]]), segmentar ao máximo ([[segmentar-em-branches-e-agentes]]).
