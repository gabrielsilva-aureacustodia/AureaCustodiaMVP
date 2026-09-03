# `src/server/db/migrations/` — o schema, versionado

Um arquivo `.sql` por mudança de estrutura, com prefixo numérico que define a ordem.
Aplicados por `npm run db:migrate` (Supabase) e por `../migrar.ts` (testes). A tabela
`aurea.schema_migrations` registra o que já entrou; rodar de novo não reaplica.

| Arquivo | O que faz |
|---|---|
| `001_inicial.sql` | As 10 tabelas do M1 no schema `aurea`, índices, chaves estrangeiras, `CHECK`s, a linha única de `seq` e RLS em todas |
| `002_pagamentos_rastreio.sql` | Frente C: `payment_events` (idempotência), `payment_intents`, `rastreios` |
| `003_ledger_dre_auditoria.sql` | M4/M7: `ledger_entries` (append-only, hash encadeado), `audit_log`, `parametros_contabeis`, `contas_contabeis`, `lancamentos_manuais`, `exportacoes`. Só cria tabelas; os catálogos vêm de `src/domain/dre.ts` |

A próxima é a **004** (a de limpeza do passo 9 do M1, ver `docs/prompts/AGENTE_B2_POS_PRODUCAO.md`).

## Regras

- **Nunca edite uma migration já aplicada.** Crie `002_…`. O registro em `schema_migrations`
  impede a 001 de rodar de novo, e uma 001 diferente da que está no banco é história
  reescrita.
- **Sempre `aurea.` explícito** nos nomes. Assim o arquivo pode ser colado no editor SQL do
  Supabase sem nunca cair em `public`. A troca de schema para ambiente local
  (`AUREA_DB_SCHEMA`) é feita pelo aplicador, por substituição textual.
- **Toda tabela nova nasce com `ENABLE ROW LEVEL SECURITY`**, sem política.
- **Dinheiro é `bigint`.** Nunca `numeric`, nunca `real`.
- **Idempotente** (`IF NOT EXISTS`, `ON CONFLICT DO NOTHING`) sempre que a SQL permitir.

## Como aplicar no Supabase

```bash
npm run db:migrate
```

Usa `POSTGRES_URL_DIRECT` (porta 5432 — o pooler de transação recusa DDL). Lê `.env.local`
se a variável não estiver no ambiente. Ao final, avisa se encontrar qualquer tabela em
`public`.
