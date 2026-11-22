---
name: leitura-de-producao-sem-set-de-sessao
description: "Consulta só-leitura em produção usa BEGIN READ ONLY por transação, nunca SET de sessão — o pooler do Supabase reaproveita a conexão"
metadata:
  node_type: memory
  type: feedback
  originSessionId: 49e99c8a-c4f8-4920-9d17-be77fcae31d7
  modified: 2026-11-03T20:25:18.208Z
---

Em 03/11/2026, diagnosticando a custódia, meu script de leitura fazia `SET default_transaction_read_only = on` numa conexão
pela `POSTGRES_URL` (pooler Supavisor, porta 6543, modo transação). O SET de sessão ficou preso na conexão do servidor que
o pooler reaproveita: minutos depois, o meu próprio backup recebeu "cannot execute CREATE TABLE AS in a read-only
transaction". O site poderia ter herdado a mesma conexão e ter tido gravações recusadas (não houve erro na Vercel, mas
não dá para provar que nada falhou).

**Why:** no modo transação o pooler não reseta parâmetros de sessão entre clientes; qualquer `SET` vaza para quem pegar a
conexão depois — inclusive o site em produção.

**How to apply:** leitura de produção é `BEGIN READ ONLY` … `ROLLBACK` na mesma conexão (ou `executarNoBanco(fn,
{ somenteLeitura: true })`), nunca `SET` solto. Se um SET de sessão escapar, conferir na hora com várias conexões pelo
pooler (`current_setting('default_transaction_read_only')`) e contar ao Gabriel. Ver [[script-de-producao-fora-da-suite]].
