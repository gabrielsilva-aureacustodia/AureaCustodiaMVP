---
name: sem-docker-local
description: Evitar Docker, container e servidor local (dev server, preview) na máquina do Gabriel — pesado; servidor local só de vez em quando para testar tela ou função, e Docker nunca; o resto se confere em produção
metadata:
  node_type: memory
  type: feedback
  originSessionId: 7c710f94-0317-4336-8b79-4415099465c7
  modified: 2026-11-18T01:33:01.395Z
---

Docker e container: não usar. Servidor local (`npm run dev`, preview): **só uma vez ou outra, para testar telas ou funções — evitar quando possível**. O resto se testa por vitest e se confere em produção, depois do merge e do deploy.

**Why:** em 25/10/2026 abri o Docker Desktop para um Postgres de teste e o Gabriel pediu para parar: "fica muito pesado localmente" (naquele dia publicou e testou em produção, com `git revert` se desse erro). Em 17/11/2026, com 15 sessões em paralelo, RAM no limite e erro 1455 derrubando sessões, ele pediu primeiro "nada de servidores locais ou containers, tudo sempre direto pra produção" e logo em seguida suavizou: "servidor local só uma vez ou outra para testar telas ou funções, evite quando possível".

**How to apply:** não subir Docker nem container; não deixar servidor local rodando — se subir um para ver uma tela, é um por vez, só o necessário, e encerrar logo depois (conferir que a porta ficou livre). Com várias sessões em paralelo ou aviso de memória do Controle, nenhum servidor até ele liberar. Testar por vitest de um arquivo (domínio, render, PDF) e conferir a tela em produção depois do deploy. Merge, commit, push e deploy continuam do chat de Controle com o OK do Gabriel — "direto pra produção" não autoriza branch de frente a dar push sozinha. Se precisar de banco real, perguntar antes como ele quer testar. Ligado a [[entregar-ligado-para-testar]], [[teste-visual-nunca-vai-para-producao]] e [[commit-so-depois-do-merge]].
