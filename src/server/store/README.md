# `src/server/store/` — persistência plugável ⚠️

**Superfície protegida.** O contrato desta pasta é o que garante que trocar de banco não
muda comportamento.

## O contrato

```typescript
// types.ts — o contrato inteiro
get<T>(key): Promise<T | null>
mutate<R, T>(key, mutator, pick): Promise<{ state: T; result: R }>
```

Duas operações. Todo o estado da plataforma é **um único documento JSON** gravado sob a
chave `STORE_KEY` (hoje `aurea-market-v6`).

## Arquivos

| Arquivo | O que faz | Concorrência |
|---|---|---|
| `types.ts` | **O contrato.** Mudar aqui obriga mudar os três adaptadores | ⚠️ |
| `index.ts` | Escolhe o adaptador por variável de ambiente | |
| `postgres.ts` | Transação com `SELECT … FOR UPDATE` | ✅ Resolve de verdade |
| `redis.ts` | Leitura, mutação e escrita | ⚠️ Última gravação vence |
| `memory.ts` | `Map` pendurado em `globalThis` | ❌ Some no cold start |

## A ordem de precedência

Escolhida sozinha em `index.ts`, **nesta ordem**:

| Prioridade | Variáveis | Adaptador |
|---|---|---|
| 1 | `POSTGRES_URL` ou `DATABASE_URL` | Postgres |
| 2 | `KV_REST_API_URL` + `KV_REST_API_TOKEN` | Redis (Vercel KV) |
| 3 | `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` | Redis (Upstash) |
| 4 | *(nenhuma)* | Memória |

**Em produção hoje roda o nível 2 — Redis (Vercel KV)**, verificado em 01/09/2026. O
Postgres já está implementado e testado; ligá-lo é acrescentar uma variável, não escrever
código.

## O blob vive em `aurea.aurea_state`, com RLS ligada — desde 02/09/2026

O adaptador Postgres cria a tabela no schema **`aurea`**, não no `public`, e liga **Row
Level Security** sem política nenhuma. Não é enfeite:

- o Supabase publica automaticamente uma API REST na internet para toda tabela do schema
  `public`, acessível com a chave `anon` — que é pública por design e está no repositório
  aberto. Uma `public.aurea_state` sem RLS seria o estado inteiro **legível e alterável por
  qualquer pessoa**, sem passar pela plataforma;
- `aurea` não está na lista de schemas expostos (conferir em *Settings → Data API*), e a RLS
  sem política nega tudo aos papéis `anon`/`authenticated`. O dono da tabela — o usuário
  `postgres`, via conexão direta — não é afetado.

Em Postgres fora do Supabase (Neon, local) as duas medidas são inócuas.

## Duas armadilhas que já custaram caro

**`globalThis` em `memory.ts`.** O `Map` fica pendurado em `globalThis`, não no escopo do
módulo. Em desenvolvimento o Next mantém **dois grafos de bundle** no mesmo processo, e um
`Map` de módulo viraria dois estados divergentes — o mercado mudaria conforme a rota que
você abrisse.

**`FOR UPDATE` só tranca linha existente.** Numa base recém-criada não há linha para
travar, e o adaptador precisa tratar esse caso — está anotado no próprio arquivo.

## O que quebra se você mexer aqui

| Se você mexer em… | Quebra ou muda… |
|---|---|
| `types.ts` | **Os três adaptadores de uma vez.** Mudar um só cria divergência silenciosa entre bancos |
| `index.ts` | Qual banco a plataforma usa. Errar a ordem pode mandar produção para a memória |
| `postgres.ts` | A única garantia de concorrência que a plataforma tem |
| `STORE_KEY` (em `domain/constants.ts`) | **Zera o banco.** É deliberado quando o formato de `AppState` muda |

## Sobre `AUREA_STORE_KEY`

A variável de ambiente **deve ficar ausente ou comentada**. Sem ela, o código usa o padrão
de `src/domain/constants.ts`, que é sempre o valor certo para o formato da versão atual.

**Apontá-la para uma versão anterior é defeito**, não configuração: ordens gravadas antes do
mercado multi-ativo não têm `tipoMoeda`, e duas delas casam entre si porque
`undefined === undefined` é verdadeiro. É o item CD-01 de
[`docs/diario/CRITICAL_DEBUGS.md`](../../../docs/diario/CRITICAL_DEBUGS.md).

`garantirFormato()` em `../state.ts` descarta essas ordens, mas a proteção real é a chave
certa.

## Quem depende desta pasta

Só `src/server/state.ts`. **Nenhum outro arquivo do projeto importa daqui** — e é assim que
deve continuar: o resto da aplicação fala com `getState()`/`mutateState()`, não com o banco.

## O que muda com o Supabase

Esta pasta inteira **será substituída** por `src/server/db/`, com repositórios por agregado
em vez de um blob único. A decisão é a D1, e o plano de migração está em
[`docs/DECISOES_D1_D9_E_PLANO.md`](../../../docs/DECISOES_D1_D9_E_PLANO.md).

**Nada sai antes da nova camada estar de pé** — remover cedo derruba o ambiente que os
sócios usam para testar.
