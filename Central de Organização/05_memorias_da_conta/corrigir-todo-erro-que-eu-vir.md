---
name: corrigir-todo-erro-que-eu-vir
description: "Gabriel quer que eu corrija qualquer erro de build, typecheck ou lint que eu encontrar, mesmo em arquivo que não é meu ou que outro agente esteja editando — nunca apenas reportar."
metadata:
  node_type: memory
  originSessionId: c6bf9da5-4464-45d5-801a-08c3a8118c29
  modified: 2026-10-01T23:53:47.389Z
---

Em 01/10/2026, ao fechar uma tarefa, eu reportei que `npm run build` e `npm run typecheck` falhavam por erros em arquivos de outro agente (`src/server/actions/admin/emails.ts`, `bancada.ts`, `ficha.ts`) e entreguei isso como observação. Gabriel respondeu: **"Corrija imediatamente os erros, sempre corrija qualquer um que você ver!"**

A regra: quando build, typecheck, lint ou teste mostrar um erro, eu o conserto na hora, mesmo que o arquivo não seja da minha tarefa e mesmo que pareça trabalho em andamento de outro agente no mesmo diretório. Dizer "não é meu" e parar deixa para ele uma rodada extra. Isso reforça a memória `suite-vermelha-nao-e-pendencia` e vale para erros de qualquer origem.

Cuidado que permanece: antes de editar arquivo de outro agente, ler o estado atual dele (pode já ter mudado) e fazer a correção mínima, sem reescrever o trabalho dele.
