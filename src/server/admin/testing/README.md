# `src/server/admin/testing/` — apoio aos testes do painel

| Arquivo | O que faz |
|---|---|
| `pglite.ts` | `bancoDeTeste()`: sobe o Postgres embutido (PGlite) com todas as migrations aplicadas e devolve o `Executor`. Mesmo executor de `src/server/db/db.test.ts` |

**Não é código de produção.** Nada fora de arquivos `*.test.ts` importa daqui.

Cada instância do PGlite ocupa memória de verdade; várias ao mesmo tempo derrubam workers do
Vitest em silêncio (ver `src/server/db/README.md`). Por isso os testes de banco do painel ficam
num arquivo só, `../banco.test.ts`, com uma instância.
