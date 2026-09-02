# Atalhos assumidos nesta pasta

> Notas locais dos atalhos tomados em `src/server/db/`.
> O documento que compila todos está na raiz: [`RISCOS_ASSUMIDOS.md`](../../../RISCOS_ASSUMIDOS.md), seção **RA-13**.

Todos foram tomados em 02/09/2026, na entrega do módulo M1 (frente B).

---

## RA-13.a 🟡 — uma fila de escrita para tudo, não uma por livro de ordens

**Arquivo:** `repositories/seq.ts`, `estado.ts`

Toda mutação trava a linha única de `aurea.seq` com `FOR UPDATE`. Uma compra de Bandeira
espera um depósito de outro usuário terminar, mesmo sem relação entre os dois.

**Por quê:** `mutateState(fn)` não sabe o que `fn` vai tocar, e a assinatura está congelada
pelo contrato das frentes paralelas. Travar por livro exigiria que cada chamador declarasse
o tipo de moeda — mudança de assinatura.

**O que fica descoberto:** nada de correção. É a MESMA garantia do blob (uma linha, uma
trava). O custo é só de vazão, e com sete sócios ele é zero.

**Como se paga:** uma segunda porta, `mutateBook(tipoMoeda, fn)`, que trava só as ofertas
e bids daquele tipo (`SELECT … FOR UPDATE` filtrado) e carrega o estado parcial. As Server
Actions de mercado migram para ela; as demais continuam na fila única.

---

## RA-13.b 🟡 — o estado inteiro é carregado a cada leitura e a cada escrita

**Arquivo:** `repositories/state.ts`

Nove consultas por `getState()`, sempre — inclusive no polling de 10 s de cada conta logada.

**Por quê:** os ~30 pontos de leitura em telas e seletores (`src/app/`, `src/components/`)
esperam o `AppState` inteiro, e essas pastas **não pertencem à frente B** pelo contrato de
`docs/FRENTES_PARALELAS.md`. Trocar a assinatura de `getState()` quebraria as outras duas
frentes no meio do trabalho.

**O que fica descoberto:** desempenho com volume. Com 7 contas e ~90 moedas são
milissegundos; com milhares, o polling vira o gargalo.

**Como se paga:** depois do merge das três frentes, migrar as leituras para consultas
recortadas (seletores que recebem só a fatia). É o passo 7 do plano do M1, adiado por
contrato, não por esquecimento.

---

## RA-13.c 🟠 — a comissão está gravada, mas o extrato ainda recalcula

**Arquivo:** `migrations/001_inicial.sql` (coluna `trades.fee`), `diff.ts` (`normalizarTrade`)

Toda negociação nova entra com `fee` congelada, e toda negociação lida do banco a carrega.
`src/domain/statement.ts` continua chamando `tradeFee(t.price)` e ignorando o campo.

**Por quê:** `statement.ts` é superfície protegida e a mudança de comportamento do extrato é
a decisão **CD-09**, dos sócios. A frente B preparou o dado; não decidiu pelo extrato.

**Como se paga:** uma linha em `statement.ts` — `const taxa = t.fee ?? tradeFee(t.price) * qty`
— depois do "sim" dos sócios. Fecha o RA-06.

---

## RA-13.d 🟠 — verificado contra Postgres embutido, não contra o Supabase

**Arquivo:** `db.test.ts`

A suíte roda contra o PGlite (Postgres 17 em WebAssembly). Nesta sessão a senha local do
Supabase estava desatualizada e o agente não podia aplicá-la, então **nenhuma consulta foi
feita ao banco real**: a migration não foi aplicada em produção e o `FOR UPDATE` com duas
conexões de verdade não foi exercitado.

**O que fica descoberto:** diferenças entre PGlite e o pooler do Supabase (Supavisor) — em
especial statements com várias instruções e o comportamento sob duas conexões. O PGlite tem
**uma conexão só** e enfileira transações por construção: os testes de compra e envio
simultâneos provam o caminho da recusa, **não a espera na trava**. O critério de aceite
"duas compras simultâneas" continua aberto até rodar contra o banco real.

**Como se paga:** `npm run db:migrate` no Supabase e, uma vez,
`AUREA_DB_TEST_URL="postgresql://…" npm test` — a mesma suíte roda contra o banco real num
schema `aurea_test` descartável. São dois comandos do Gabriel, e estão no passo 4 de
`docs/CUTOVER_BANCO_PRODUCAO.md`.

**Situação em 03/09/2026:** ainda não pago. A senha do `.env.local` continua recusada pelo
Supabase (`npm run db:check` confirma), então nenhuma consulta desta frente jamais tocou o
banco real.

---

## RA-13.e 🟡 — `src/server/store/` continua no repositório, e parte dele é código morto

**Arquivo:** `../store/*`, `../state.ts`

O blob antigo fica como caminho de `getState()`/`mutateState()` quando não há
`POSTGRES_URL`. Dois motores para a mesma fachada.

**Por quê:** o passo 9 do plano do M1 diz "só então remover", e "então" é depois de a
produção ter rodado sobre tabelas — o que depende do passo do Gabriel na Vercel. Remover
antes deixaria `npm run dev` sem banco nenhum para subir.

**A correção de 03/09/2026:** a primeira versão desta nota chamava o `store/` de "rede de
segurança". **Está errado, e é o tipo de erro que custa caro na hora errada.** Com
`POSTGRES_URL` definida, `store/postgres.ts` nunca é selecionado — é código morto. Tirar a
variável de um deploy que já roda sobre tabelas manda a aplicação para Redis ou memória, e
não para o blob. O rollback é o "Instant Rollback" da Vercel para o build anterior; está
escrito em `docs/CUTOVER_BANCO_PRODUCAO.md`.

**Como se paga:** um commit que apaga `src/server/store/`, o ramo antigo de `state.ts`,
`STORE_KEY` em `constants.ts` e a variável `AUREA_STORE_KEY` do `.env.example`, mais uma
migration com `DROP TABLE aurea.aurea_state`.

---

## O que NÃO é atalho nesta pasta

- **Duas versões do aplicador de migrations** (`migrar.ts` e `scripts/db-migrate.mjs`) —
  uma é TypeScript com alias para os testes, a outra é Node puro para a linha de comando.
  A SQL é uma só. Está anotado nos dois arquivos.
- **`structuredClone` do estado inteiro a cada mutação** — é o que dá ao planejador os dois
  retratos. Com o tamanho atual do estado custa menos de um milissegundo.
- **Chaves estrangeiras e `CHECK`s** — não existiam no blob. São proteção, não dívida: uma
  oferta apontando para moeda inexistente agora é impossível, não só improvável.
