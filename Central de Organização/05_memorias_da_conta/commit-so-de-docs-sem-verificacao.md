---
name: commit-so-de-docs-sem-verificacao
description: "Commit que só mexe em MD/documentação vai direto — sem typecheck, teste nem build"
metadata:
  node_type: memory
  type: feedback
  originSessionId: 93fe74c7-a5a1-4f52-aae4-346b25424b11
  modified: 2026-10-23T12:46:28.940Z
---

Quando o commit pendente é só documentação (MD), faço `git add`, commit e push direto, sem rodar typecheck,
testes ou build.

**Why:** em 23/10/2026 eu rodei as três verificações antes de commitar duas linhas de um MD e o Gabriel
cortou: "Não precisa de typecheck e teste pra isso! Faz o commit e push logo".

**How to apply:** só vale quando o diff não toca código, migration, config ou dependência. Ainda confiro o
diff por segredo antes do `git add` — isso é rápido e não é o que ele pediu para tirar. Ver
[[minimo-necessario-nao-corta-salvaguarda]] e [[commit-so-depois-do-merge]].
