# `scripts/` — utilitários de linha de comando

Node puro, sem TypeScript e sem bundler: rodam fora do Next, direto com `node`.

| Arquivo | Comando | O que faz |
|---|---|---|
| `db-migrate.mjs` | `npm run db:migrate` | Aplica `src/server/db/migrations/*.sql` no banco de `POSTGRES_URL_DIRECT` (ou `POSTGRES_URL`), registrando em `aurea.schema_migrations`. Lê `.env.local` se preciso. Avisa se houver tabela em `public` |

## Regras

- **Nenhum segredo no log.** O `db-migrate` imprime o host e o schema; a senha, nunca.
- **A SQL vive em `src/server/db/migrations/`**, não aqui. Este script só a lê.
- A lógica de "aplicar o que falta" está repetida em `src/server/db/migrar.ts`, que os testes
  usam. Mudou a regra num, muda no outro — está anotado nos dois.

## Conexões

- `package.json` → `"db:migrate"`.
- `src/server/db/migrations/` → a SQL.
- `docs/referencia/INFRAESTRUTURA_SUPABASE.md` → de onde vêm as duas URLs.
