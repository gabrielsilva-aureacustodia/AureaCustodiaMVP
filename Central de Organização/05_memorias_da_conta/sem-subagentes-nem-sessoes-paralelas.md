---
name: sem-subagentes-nem-sessoes-paralelas
description: "Crie as branches" = worktree + MD + prompt para o Gabriel colar em outro agente; eu nunca abro subagente nem sessão paralela
metadata:
  type: feedback
---

Em 24/10/2026, no pedido do polimento estético do Real Olímpico ("Crie as Branches..."), eu tentei abrir cinco sessões
paralelas (start_session), uma por branch. Gabriel cortou: **"EU MANDEI CRIAR BRANCHES E NÃO EXECUÇÕES EM PARALELO! O
USO DE SUBAGENTES É PROIBIDO!"** e completou: **"É pra me dar o prompt para cada agente executar uma branch de forma
independente com sua worktree e no final todos fazem merge por aqui!"**

**Why:** quem abre e opera os agentes é ele (Claude, Antigravity, outros); eu sou o orquestrador que prepara e depois
faz o merge. Agente aberto por mim gasta o que ele não autorizou e tira o controle dele.

**How to apply:** nunca usar Agent/subagente, start_session, Workflow ou fork neste projeto, salvo pedido com essas
palavras. Pedido de branches = para cada frente: `git worktree add C:\dev\AureaCustodiaMVP-<frente> -b <branch>`
(node_modules por junção), MD de execução no disco dentro da worktree (sem commit — [[plano-de-execucao-nao-se-commita]])
e, na resposta, **um prompt curto por agente** apontando para esse MD. O merge de todas volta para este chat.

**Exceção expressa (17/11/2026):** quando o Gabriel invoca o [[processo-eficiente-de-branches-2-0]] e manda criar chats de controle, de branch, de execução, de auditoria e específico, esse é o "pedido com essas palavras" — aí abro as sessões, só as que ele descreveu.
