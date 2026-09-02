# Atalhos assumidos nesta pasta

> Notas locais dos atalhos tomados em `src/server/store/`.
> O documento que compila todos está na raiz: [`RISCOS_ASSUMIDOS.md`](../../../RISCOS_ASSUMIDOS.md).

---

## RA-08 🟡 — produção roda sem garantia de concorrência

**Verificado na Vercel em 01/09/2026**, pelo CLI.

A camada ativa em produção é **Redis (Vercel KV)**: existem `KV_REST_API_URL`,
`KV_REST_API_TOKEN`, `KV_URL` e `REDIS_URL`; **não** existem `POSTGRES_URL` nem
`DATABASE_URL`.

**A consequência, em uma frase:** duas ações no mesmo segundo podem fazer uma desaparecer,
em silêncio, sem erro e sem log.

| Camada | Concorrência |
|---|---|
| Postgres | `SELECT … FOR UPDATE` — serializa de verdade |
| **Redis (ativo hoje)** | **Última gravação vence** |
| Memória | Estado se recria a cada cold start |

**Por que é 🟡 e não 🔴:** com sete sócios testando, a chance de duas escritas colidirem no
mesmo segundo é desprezível. Com cliente real e volume, deixa de ser.

**O que torna isto barato de pagar:** o adaptador Postgres **já está implementado e
testado** (`postgres.ts`). Ligá-lo é acrescentar uma variável de ambiente — não há código a
escrever. A precedência em `index.ts` é automática.

**Como se paga:** a Fase 1 (Supabase Postgres) resolve por construção. Esta pasta inteira é
substituída por `src/server/db/`.

**Custo de pagar:** o banco novo nasce vazio e semeia do zero — saldos, anúncios e senhas
trocadas voltam ao seed.

---

## O que NÃO é atalho nesta pasta

- **O `Map` em `globalThis` no `memory.ts`** é correção, não gambiarra: sem ela, dois
  grafos de bundle do Next manteriam dois estados divergentes no mesmo processo de
  desenvolvimento.
- **O blob JSON único** é o desenho atual, não um atalho. Muda na Fase 1.
