# Prompt — Agente B · Banco de dados e backend

> Copie o bloco abaixo inteiro como primeira mensagem do chat dedicado a esta frente.

---

Você vai trabalhar no repositório da **Áurea Custódia / Real Olímpico**
(`C:\dev\AureaCustodiaMVP`), na frente mais estruturante: **migrar o estado de um blob JSON
para tabelas relacionais no Supabase**.

**Sua frente é a fundação — as outras duas dependem dela.** Outros dois agentes trabalham em
paralelo neste repositório, e existe um contrato escrito de quem edita o quê.

## Antes de escrever qualquer linha, leia nesta ordem

1. **`CLAUDE.md`** (raiz) — as regras. Carregado automaticamente
2. **`docs/FRENTES_PARALELAS.md`** — ⚠️ **leia com atenção especial.** Ele define uma
   obrigação que recai só sobre você: **preservar a assinatura de `getState()` e
   `mutateState()`**. É o que desacopla as outras duas frentes
3. **`docs/EXECUCAO_POR_MODULO.md`**, módulo **M1** — o passo a passo, o schema mínimo e o
   critério de aceite
4. **`docs/DECISOES_D1_D9_E_PLANO.md`** — a seção "D1 respondido" explica por que o motor
   **não** é reescrito em SQL
5. **`docs/referencia/INFRAESTRUTURA_SUPABASE.md`** — os dados de conexão
6. **`docs/PROXIMOS_PASSOS_SUPABASE.md`** — o estado atual da conexão
7. **`src/domain/README.md`**, **`src/server/README.md`**, **`src/server/store/README.md`**

## Seu escopo

**Branch:** `feat/banco-supabase`

Você é o **único dono de `src/domain/types.ts`**. Os outros dois agentes pedem mudanças ali
através do Gabriel — se receber um pedido, avalie o impacto (mudança em `types.ts` obriga
rotação de `AUREA_STORE_KEY`).

**Não toque em `src/server/actions/auth.ts` nem `src/server/session.ts`** — são da frente A.

## ⚠️ A obrigação que torna o paralelismo possível

```typescript
// Estas assinaturas NÃO MUDAM. A migração acontece DENTRO delas.
export async function getState(): Promise<AppState>
export async function mutateState<T>(
  fn: (state: AppState) => T | Promise<T>
): Promise<{ state: AppState; result: T }>
```

As outras duas frentes escrevem código chamando `mutateState` hoje, e ele precisa continuar
funcionando depois da migração. **É também a decisão mais segura tecnicamente:** preserva os
38 testes e toda a superfície de chamada.

## ⚠️ A parte que exige mais cuidado: o motor de casamento de ordens

`matchOrders` em `src/domain/market.ts` decide **quem compra de quem, por quanto e com que
comissão**. Tem 38 testes cobrindo aritmética, prioridade preço-tempo e isolamento entre
ativos.

**NÃO traduza esse motor para SQL.** Traduzir jogaria os testes fora e reescreveria no
escuro a regra mais crítica da plataforma. O padrão correto:

```typescript
await db.transaction(async (tx) => {
  // 1. carrega SÓ o livro daquele tipo de moeda, travando as linhas
  const parcial = await carregarLivroParaMotor(tx, tipoMoeda)
  // 2. roda a função pura, sem alterar UMA LINHA dela
  const resultado = matchOrders(parcial)
  // 3. persiste o diff
  await persistirResultado(tx, parcial, resultado)
})
```

**O critério de aceite mais importante da sua frente: os 38 testes atuais passam sem
alteração.**

## O que construir

```
src/server/db/
├── README.md              obrigatório
├── ATALHOS.md             se algum atalho for tomado
├── client.ts              import 'server-only' na PRIMEIRA linha
├── schema.sql             versionado
├── migrations/001_inicial.sql
└── repositories/          users, coins, offers, trades, envios, state
```

Tabelas mínimas, **todas no schema `aurea`**: `users`, `coins`, `nfts`, `sell_offers`,
`buy_orders`, `trades`, `deposits`, `envios`, `custody_charges`, `seq`.

**Acrescente `fee bigint` em `trades`** — isso paga o **RA-06** (a comissão do extrato hoje é
recalculada a cada leitura, então o extrato muda o passado se uma taxa mudar).

## 🔴 Segurança do schema — não negocie isto

**Todas as tabelas vão no schema `aurea`, nunca em `public`.**

O Supabase publica automaticamente uma API REST na internet para o schema `public`,
acessível com a chave `anon` — que é pública por design e **está num repositório aberto**.
Uma tabela em `public` seria o estado inteiro (saldos, ofertas) legível e **alterável** por
qualquer pessoa, sem passar pela plataforma.

O adaptador atual já faz isso e liga RLS — veja `src/server/store/postgres.ts` como
referência. Mantenha as duas defesas.

## Ordem dos passos

1. Schema e migration inicial; aplicar no Supabase
2. `client.ts` com `import 'server-only'`
3. Repositórios de leitura, um por vez, com teste de integração
4. `carregarLivroParaMotor` + `persistirResultado` — **o passo mais delicado**
5. `state.ts` apontando para os repositórios, **assinatura preservada**
6. Server Actions (`market`, `sell`, `custody`, `account`), uma por vez, `npm test` entre cada
7. Os ~30 pontos de leitura em telas e seletores
8. Semear as 7 contas no banco novo
9. **Só então** remover `src/server/store/`

## O que NÃO fazer

- ❌ Reescrever `matchOrders` em SQL
- ❌ Criar tabela no schema `public`
- ❌ Mudar a assinatura de `getState`/`mutateState`
- ❌ Remover `src/server/store/` antes do passo 9
- ❌ `float` para dinheiro — sempre `bigint` em centavos
- ❌ Tocar em `auth.ts` ou `session.ts`

## Critério de aceite

- [ ] **Os 38 testes passam sem alteração** — o mais importante
- [ ] Duas compras simultâneas da mesma oferta: uma vence, a outra recebe recusa clara
- [ ] Dois envios simultâneos não geram o mesmo código `RO-`
- [ ] O ambiente sobe do zero com o seed
- [ ] `npm run build` verde
- [ ] Nenhuma tabela em `public`

## Regras que valem sempre

- Antes de commitar: `npm run typecheck`, `npm test`, `npm run build`
- **Todo atalho** vai para `RISCOS_ASSUMIDOS.md` **e** o `ATALHOS.md` da pasta, no mesmo commit
- **Toda pasta nova nasce com `README.md`**
- **Repositório público de propósito.** Nenhuma credencial em commit
- Comentários em português, explicando o **porquê**

## Superfície protegida

`src/domain/constants.ts`, `fees.ts`, `market.ts`, `types.ts`, o contrato de
`src/server/store/types.ts` e as Server Actions **exigem parada e decisão dos sócios** antes
de mudar comportamento. Sua frente encosta em quase todos — **explique e confirme antes**.

## Como começar

Confirme primeiro que a conexão com o Supabase está funcionando (ver
`docs/PROXIMOS_PASSOS_SUPABASE.md`). Depois, **descreva o plano antes de editar** e espere
aprovação — regra 1 do `CLAUDE.md`.
