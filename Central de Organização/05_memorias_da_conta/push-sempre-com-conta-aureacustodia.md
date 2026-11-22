---
name: push-sempre-com-conta-aureacustodia
description: Neste projeto o push usa sempre a conta GitHub gabrielsilva-aureacustodia (gh auth switch)
metadata:
  node_type: memory
  type: feedback
  originSessionId: 09dc6e25-94f2-45a6-bf9e-4f6014dbcbfa
  modified: 2026-11-10T19:27:51.124Z
---

Antes de todo `git push` neste repositório, rodar `gh auth switch --user gabrielsilva-aureacustodia`.

**Why:** o Git estava logado como `iocusapp` e o push deu 403 (10/11/2026); Gabriel mandou usar sempre essa conta.
**How to apply:** trocar a conta antes do push, sem perguntar; se der 403, é isso primeiro.
