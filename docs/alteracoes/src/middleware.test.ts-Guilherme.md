# src/middleware.test.ts

**Arquivo:** `src/middleware.test.ts`
**Camada:** teste
**Responsável:** Guilherme

---

## 19/09/2026 — Criado: 13 verificações da rede de rotas

**O que foi alterado**

Arquivo novo, em dois blocos.

**Comportamento.** Rota pública passa sem sessão; rota protegida sem cookie vira
redirecionamento; `/admin/*` vai para `/painel` e nunca para `/entrar`; `/api/*` responde
401 em JSON; cookie forjado não passa; `/entrar/nova-senha` é protegida apesar de começar
com `/entrar`; e **rota que não existe é barrada**, que é a brecha original.

**Inventário.** Varre `src/app` e exige que toda rota esteja em uma de três situações
declaradas: protegida por grupo, pública por decisão, ou guardada por conta própria.

**Por que foi alterado**

O bloco de comportamento prova que o middleware faz o que promete. O de inventário é o
que impede a brecha de **voltar**: sem ele, o middleware protegeria as rotas de hoje, e
amanhã alguém abriria uma rota nova acrescentando uma linha na lista de públicas sem
ninguém reparar.

**O que observar**

A lista `SE_PROTEGEM_SOZINHAS` é uma afirmação sobre o código, e há um teste que a
confere: se um arquivo listado ali deixar de mencionar `getSessionEmail` ou equivalente,
a suíte reprova. Declarar não basta.

Rota nova fora de `(app)` e `(admin)` **reprova a suíte**, com a mensagem dizendo as três
saídas possíveis. É por design: a decisão de acesso passa a ser obrigatória, não opcional.

Há também uma verificação no sentido inverso — rota pública declarada que não existe mais
no disco reprova, para a lista não acumular entrada morta que ninguém ousa remover.
