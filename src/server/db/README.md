# `src/server/db/` — o estado em tabelas (Supabase Postgres)

**Superfície protegida.** Esta pasta é o motor por baixo de `getState()` e `mutateState()`
quando `POSTGRES_URL` existe. Substitui o blob JSON de `../store/`, que continua no
repositório até o passo 9 do M1.

> ⚠️ **`../store/` não é rede de segurança, e a distinção importa no dia do cutover.**
> Com `POSTGRES_URL` definida, `state.ts` escolhe esta pasta **antes** de olhar para o
> `store/` — o adaptador de blob em `store/postgres.ts` nunca mais é selecionado. Tirar a
> variável **não** volta para o blob: manda a aplicação para o Redis (se as variáveis do KV
> existirem) ou para a memória, ou seja, para um estado vazio ou velho.
>
> **O rollback de produção é o "Instant Rollback" da Vercel** para o deploy anterior, que é
> o build que ainda lê o blob. Ver [`docs/CUTOVER_BANCO_PRODUCAO.md`](../../../docs/CUTOVER_BANCO_PRODUCAO.md).

## A frase que explica a pasta

**O estado é carregado inteiro, a função de negócio muta em memória, e só a diferença é
gravada — dentro de uma transação, atrás de uma trava.** O motor de casamento
(`src/domain/market.ts`) não foi traduzido para SQL: ele roda sobre o mesmo `AppState` de
sempre, e os 38 testes do domínio continuam valendo sem uma linha alterada.

## Arquivos

| Arquivo | O que faz | `server-only` |
|---|---|---|
| `client.ts` | Pool `pg` (um por processo, em `globalThis`), TLS, `executarNoBanco` — **a única porta de entrada da credencial** | ✅ |
| `sql.ts` | O vocabulário: `Consulta`, `Executor`, `nomeDoSchema()`, `num()` | — |
| `estado.ts` | `lerEstado` / `mutarEstado` — o ciclo carregar → mutar → gravar o diff | — |
| `diff.ts` | **Puro.** Compara dois `AppState` e devolve a lista de operações, na ordem das chaves estrangeiras | — |
| `migrar.ts` | Aplica `migrations/*.sql` (a versão que os testes usam) | — |
| `migrations/001_inicial.sql` | O schema: 10 tabelas no schema `aurea`, RLS em todas | — |
| `repositories/` | Uma tabela (ou par) por arquivo: SQL de leitura e escrita. Ver [README](repositories/README.md) | — |
| `diff.test.ts` | 16 testes do planejador, sem banco | — |
| `db.test.ts` | 15 testes de integração contra um **Postgres real embutido** (PGlite), incluindo o diagnóstico do `db:check` | — |
| `ATALHOS.md` | O que esta pasta deve ao próprio rigor | — |

Só `client.ts` tem `import 'server-only'`, e é o único que lê `process.env.POSTGRES_URL`.
Os demais são parametrizados pelo `Executor` — é o que permite à suíte rodá-los contra um
Postgres embutido sem Docker nem rede.

## O ciclo de uma mutação

```
mutateState(fn)                                  src/server/state.ts
  └─ mutarEstado(executarNoBanco, fn)            estado.ts
       └─ BEGIN
          1. SELECT … FROM aurea.seq WHERE id = 1 FOR UPDATE   ← a fila de escrita
          2. carregarEstado(tx)                  repositories/state.ts (9 consultas)
          3. state = structuredClone(antes); result = fn(state)
          4. planejarDiff(antes, state)          diff.ts  → lista de operações
          5. executa cada operação               repositories/*
          COMMIT
```

**A trava vem antes da leitura.** Quem chega segundo espera o commit do primeiro e lê o
estado já gravado. É o que faz duas compras simultâneas da mesma oferta virarem uma compra
e uma recusa — e é a mesma garantia que o blob tinha, só que sobre tabelas.

**A leitura não trava.** `getState()` abre uma transação `REPEATABLE READ READ ONLY`: as nove
consultas veem o mesmo instantâneo, e o polling de 10 s de sete contas não enfileira atrás
das escritas.

## Regras que valem aqui

- **Tudo no schema `aurea`, nunca em `public`.** O Supabase publica `public` como API REST na
  internet com a chave `anon`, que está num repositório aberto. `npm run db:migrate` avisa se
  encontrar tabela em `public`.
- **RLS ligada em todas as tabelas, sem política.** Nega tudo a `anon` e `authenticated`;
  o dono (`postgres`, por conexão direta) não é afetado.
- **Dinheiro é `bigint` em centavos.** O `pg` devolve `bigint` como string; `num()` em `sql.ts`
  converte, e é o único lugar onde isso acontece.
- **`trades` e `deposits` são append-only.** Não há `UPDATE`/`DELETE` nos repositórios e o
  planejador recusa lista que encolheu.
- **`fee` em `trades`** é a comissão congelada na gravação (RA-06). O extrato ainda recalcula —
  ligar os dois é decisão dos sócios (CD-09).
- **Toda leitura devolve um `AppState` idêntico ao do blob** — mesmas chaves, mesma ordem dos
  arrays, campo opcional ausente (não `null`) quando o domínio o deixa ausente. É o que mantém
  telas e seletores intocados.

## Variáveis de ambiente

| Variável | Para quê |
|---|---|
| `POSTGRES_URL` | Liga o motor de tabelas. Pooler de transação (porta 6543) |
| `POSTGRES_URL_DIRECT` | Só para `npm run db:migrate`. Session pooler (porta 5432) |
| `AUREA_DB_SCHEMA` | Opcional. Outra "gaveta" no mesmo banco (`aurea_local`), para não mexer no estado dos sócios |
| `AUREA_DB_TEST_URL` | Opcional. Faz `db.test.ts` rodar também contra um banco real, num schema `aurea_test` descartável |

Sem `POSTGRES_URL`, `state.ts` cai no `../store/` (Redis ou memória), como antes.

> **O `.env.local` mora na pasta principal do repositório, não no worktree** — ele é
> ignorado pelo Git e não viaja entre worktrees. `db:check` e `db:migrate` procuram nos dois
> lugares e dizem, na primeira linha da saída, qual arquivo usaram. Ver `scripts/README.md`.

## Como subir do zero

```bash
npm run db:check          # a conexão vale? a migration já foi aplicada?
npm run db:migrate        # aplica migrations/*.sql no POSTGRES_URL_DIRECT
npm run dev               # a primeira requisição semeia as 7 contas
```

A semeadura acontece quando `users` está vazia, dentro da trava — duas primeiras
requisições simultâneas não semeiam duas vezes.

`npm run db:check` é somente leitura e sai com código 1 quando falta alguma coisa, então
serve dentro de um `&&`. O roteiro completo da virada para produção está em
[`docs/CUTOVER_BANCO_PRODUCAO.md`](../../../docs/CUTOVER_BANCO_PRODUCAO.md).

## O que quebra se você mexer aqui

| Se você mexer em… | Quebra ou muda… |
|---|---|
| `migrations/001_inicial.sql` | **Nada, se for acrescentando `002_…`.** Editar a 001 depois de aplicada não reaplica — crie a próxima |
| `diff.ts` | O que é gravado. Uma normalização diferente da que o repositório grava faz o diff ver mudança onde não há (grava sempre) ou não ver onde há (perde dado) |
| `repositories/state.ts`, ordem das consultas | A ordem dos arrays do `AppState` — e com ela quem `sellToBid` vende primeiro |
| `repositories/seq.ts`, o `FOR UPDATE` | A única garantia de concorrência da plataforma |
| `estado.ts`, a ordem trava → carrega | Idem: trava depois da leitura é corrida de dados com cara de código certo |

## Quem depende desta pasta

Só `src/server/state.ts`. **Nenhum outro arquivo importa daqui**, e é assim que deve
continuar: o resto da aplicação fala com `getState()`/`mutateState()`.

## Conexões com as outras pastas

| Pasta | Relação |
|---|---|
| `src/domain/types.ts` | Fonte da verdade do modelo. Cada tabela espelha um tipo; `Trade.fee?` nasceu para esta pasta |
| `src/domain/seed.ts` | `seedState()` é o que se grava num banco vazio |
| `src/domain/fees.ts` | `tradeFee` calcula a `fee` congelada de uma negociação nova |
| `src/domain/market.ts` | Roda **intocado** dentro da transação |
| `src/server/store/` | O motor antigo, ativo quando não há `POSTGRES_URL`. Sai no passo 9 |
| `scripts/db-migrate.mjs` | Aplica as mesmas migrations pela linha de comando |
| `scripts/db-check.mjs` | Diagnóstico somente leitura; sua função `diagnosticar` é testada aqui, em `db.test.ts` |

## Próximos passos (na ordem)

Roteiro completo, com verificação a cada passo, em
[`docs/CUTOVER_BANCO_PRODUCAO.md`](../../../docs/CUTOVER_BANCO_PRODUCAO.md).

1. Rotacionar a senha do banco (RA-12) e acertar o `.env.local` — hoje ela é recusada
2. `npm run db:check` e `npm run db:migrate` na gaveta local, depois no schema `aurea`
3. `AUREA_DB_TEST_URL=… npm test` uma vez contra o banco real — é o que prova o `FOR UPDATE`
   com **duas conexões**, coisa que o Postgres embutido não consegue mostrar
4. Merge e deploy, nesta ordem: **migration antes do merge**
5. Uma semana depois: remover `src/server/store/` (passo 9), junto com
   `STORE_KEY`/`AUREA_STORE_KEY` — prompt em `docs/prompts/AGENTE_B2_POS_PRODUCAO.md`
6. Trava por livro de ordens em vez de fila única — quando houver volume (ver `ATALHOS.md`)

## Rode a suíte com o `npm run dev` PARADO

Três instâncias de Postgres em WebAssembly convivem mal com o servidor de desenvolvimento na
mesma máquina: `db.test.ts` sobe duas e `payments.test.ts` sobe uma, e com o `next dev`
ocupando memória um dos workers do Vitest morre com *"Worker exited unexpectedly"*.

O sintoma é traiçoeiro: **a suíte reporta verde com testes que nunca rodaram** — some de
"16 passed / 117 tests" para "14 passed / 93 tests", e o resumo continua sem falha vermelha.
Sempre confira o número de arquivos e de testes, não só a ausência de erro.

Com o servidor parado, a suíte é determinística.
