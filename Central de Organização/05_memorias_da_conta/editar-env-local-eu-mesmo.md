---
name: editar-env-local-eu-mesmo
description: "Gabriel quer que eu mesmo edite o .env.local (variável nova, valor novo) em vez de mandar instruções para ele editar"
metadata:
  node_type: memory
  type: feedback
  originSessionId: 1f0fee96-03ff-4e67-8250-624965d98b1c
  modified: 2026-10-22T15:31:09.450Z
---

Quando uma variável de ambiente nova ou um valor novo precisar entrar no `.env.local`, eu edito o arquivo
direto — não entrego o bloco para o Gabriel colar.

**Why:** pedido explícito em 22/10/2026 ("você mesmo sempre edita"), depois de eu ter mandado o bloco das
variáveis dos Correios para ele colar.

**How to apply:** valores não secretos entram direto. Segredo que só existe numa tela (código de acesso, chave
de API) eu não consigo extrair da página — o classificador bloqueia ler campo de senha. Nesse caso gravo a linha
com um marcador `COLE_AQUI_...` e peço só o valor. O arquivo é ignorado pelo git (`.env*`); nunca commitar.
Ver [[variavel-ja-cadastrada-nao-se-pede-de-novo]] e [[entregar-comando-quando-bloqueado]].
