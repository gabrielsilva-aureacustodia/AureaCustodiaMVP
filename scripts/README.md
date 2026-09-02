# `scripts/` — utilitários de linha de comando

Node puro, sem TypeScript e sem bundler: rodam fora do Next, direto com `node`.

| Arquivo | Comando | O que faz |
|---|---|---|
| `db-check.mjs` | `npm run db:check` | **Somente leitura.** Diz se a conexão vale, se a migration foi aplicada, se as tabelas existem com RLS e se há tabela em `public`. Sai com código 0 quando está pronto e 1 quando falta algo |
| `db-migrate.mjs` | `npm run db:migrate` | Aplica `src/server/db/migrations/*.sql`, registrando em `<schema>.schema_migrations`. Idempotente |
| `env-local.mjs` | — | Módulo compartilhado: acha o `.env.local` e descreve a URL sem revelar a senha |

## `env-local.mjs` — por que existe

As frentes trabalham em **git worktrees** separados, e um worktree compartilha os commits,
não os arquivos ignorados pelo Git. Como `.env.local` é ignorado, `npm run db:migrate`
rodado no worktree não achava arquivo nenhum e morria dizendo que a variável não estava
definida — quando ela estava viva na pasta principal, a um diretório de distância.

O módulo procura nos dois lugares e **imprime qual arquivo usou**, na primeira linha da
saída. Quem lê o log sabe de onde veio a credencial sem adivinhar.

## Regras

- **Nenhum segredo no log.** Os comandos imprimem host, porta, usuário e schema; a senha,
  nunca.
- **A SQL vive em `src/server/db/migrations/`**, não aqui. Estes scripts só a leem.
- A lógica de "aplicar o que falta" está repetida em `src/server/db/migrar.ts`, que os
  testes usam. Mudou a regra num, muda no outro — está anotado nos dois.
- **`db-check.mjs` exporta `diagnosticar()`** e é exercitado pela suíte
  (`src/server/db/db.test.ts`), contra o Postgres embutido, nos dois cenários: banco pronto
  e banco sem migration. Um comando de conferência que nunca foi conferido não confere
  nada — e este é o que decide se o cutover pode acontecer.
- Node **≥ 20.12** (por causa de `process.loadEnvFile`), declarado em `engines`.

## Conexões

- `package.json` → `db:migrate`, `db:check`.
- `src/server/db/migrations/` → a SQL aplicada.
- `src/server/db/db.test.ts` → importa `diagnosticar` de `db-check.mjs`.
- `scripts/db-check.d.mts` → os tipos que permitem esse import a partir de TypeScript.
- `docs/CUTOVER_BANCO_PRODUCAO.md` → onde estes comandos entram no roteiro da virada.
- `docs/referencia/INFRAESTRUTURA_SUPABASE.md` → de onde vêm as duas URLs.
