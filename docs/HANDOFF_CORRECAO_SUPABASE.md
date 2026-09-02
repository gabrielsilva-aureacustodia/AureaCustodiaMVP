# Handoff — correção da conexão Supabase em produção

**Documento autossuficiente para um chat dedicado a este problema**

```
Escrito em:   02/09/2026, 03:20
Repositório:  github.com/gabrielsilva-aureacustodia/AureaCustodiaMVP · branch main
Commit atual: 1819574
Estado:       🔴 PRODUÇÃO QUEBRADA para usuário logado
Causa:        valor malformado em POSTGRES_URL na Vercel (NÃO é o banco, NÃO é a senha)
```

> **Como usar.** Cole este documento inteiro num chat novo. Ele tem todo o contexto
> necessário: o que é o projeto, o que foi feito, o que está provado funcionando, qual é
> exatamente o defeito e como corrigi-lo. Não é preciso ler a conversa anterior.

---

# 1. O problema, em uma frase

A aplicação em produção tenta resolver o hostname **`base`** em vez de
`aws-0-sa-east-1.pooler.supabase.com` — ou seja, **o texto colado na variável
`POSTGRES_URL` da Vercel não é uma URL de conexão válida.**

O banco está perfeito. A senha está correta. O código está correto e já em produção. **O
único defeito está no valor da variável de ambiente.**

## A evidência

Log de runtime da Vercel, rota `/inicio`:

```
Error: getaddrinfo ENOTFOUND base
    at async Object.get (.next/server/chunks/405.js:5:54)
  errno: -3008,
  code: 'ENOTFOUND',
  syscall: 'getaddrinfo',
  hostname: 'base',          ← deveria ser aws-0-sa-east-1.pooler.supabase.com
  digest: '3027745663'
```

## O sintoma para o usuário

| Rota | Hoje | Por quê |
|---|---|---|
| `/` (login) | ✅ 200 | Não toca o banco |
| `/inicio`, `/mercado` sem sessão | ✅ 307 → login | Redireciona antes de ler o estado |
| **Qualquer rota COM sessão** | 🔴 **"Application error: a server-side exception has occurred"** | Aqui o código lê o estado e a conexão falha |

**Na prática: quem consegue entrar, quebra.** Os sócios não conseguem usar o ambiente.

---

# 2. O que JÁ ESTÁ PROVADO funcionando

Não repita estes testes — todos foram executados e passaram em 02/09/2026.

## ✅ O banco Supabase

| Verificação | Resultado |
|---|---|
| Projeto | `aurea-custodia`, ref `vjbqikfamqdttbmaqrxf` |
| Região | `sa-east-1` (São Paulo) — confere com as funções da Vercel em `gru1` |
| Versão | PostgreSQL 17.6 |
| Conexão porta 6543 (transaction pooler) | ✅ ~150 ms |
| Conexão porta 5432 (session pooler) | ✅ ~120 ms |
| `BEGIN` / `SELECT … FOR UPDATE` / `COMMIT` | ✅ Funciona no pooler de transação |
| Prepared statements nomeados | ✅ Funcionam (2 execuções seguidas) |
| `CREATE SCHEMA` / `CREATE TABLE` / `ENABLE ROW LEVEL SECURITY` | ✅ Permitido |

## ✅ A senha

**A senha correta tinha dois pontos de exclamação literais** (valor removido deste documento
em 02/09/2026 pela frente B — senha em repositório público é senha vazada; ela já foi
rotacionada de qualquer forma, ver RA-12).

Verificado passando a senha como campo separado (sem depender de codificação de URL): as
duas portas aceitam. A variante com `%21` literal **falha** — foi gravada por engano numa
das rotações e depois desfeita.

**Na connection string ela precisava ser codificada:** `!` → `%21`.

## ✅ A aplicação, rodando localmente contra o Supabase

Login local com `gabrielsilva@testeaurea.com.br` / `12345678` funcionou:

```
Painel Real Olímpico · Olá, Gabriel
R$ 54.000,00 · Moedas em custódia 87 · Volume negociado R$ 12.250,00
```

O seed foi gravado no Supabase. Estado da tabela agora:

| key | tamanho | trades |
|---|---|---|
| `aurea-market-v6` | 34 kB | 32 |
| `aurea-market-v6-local` | 34 kB | 32 |

## ✅ A segurança do schema

| Verificação | Resultado |
|---|---|
| Tabela criada em | `aurea.aurea_state` |
| Row Level Security | ✅ **Ligada** (`relrowsecurity = true`) |
| `public.aurea_state` existe? | ✅ **Não** — nada exposto pela API REST pública |

Isso importa porque o Supabase publica automaticamente uma API REST na internet para o
schema `public`, acessível pela chave `anon` — que é pública por design e está num
**repositório aberto**. As duas defesas (schema fora da lista de expostos + RLS sem
política) já estão em pé.

---

# 3. Como corrigir

## Opção A — restaurar o site AGORA (30 segundos)

Se a prioridade for o ambiente voltar a funcionar imediatamente:

**Vercel → `aurea-custodia-mvp` → Settings → Environment Variables → apagar `POSTGRES_URL`
→ Redeploy.**

A aplicação escolhe o banco por ordem de prioridade (`src/server/store/index.ts`): Postgres →
Redis → memória. Sem `POSTGRES_URL`, ela volta ao **Redis (Upstash KV)**, que é o que rodava
até hoje de manhã e funciona.

**Custo:** o estado volta ao que está no Redis (não ao Supabase). Nada se perde — o dado do
Supabase continua lá.

## Opção B — corrigir o valor (o certo)

**Vercel → `aurea-custodia-mvp` → Settings → Environment Variables → `POSTGRES_URL` → Edit.**

Apague **todo** o conteúdo do campo e cole exatamente esta linha, **sem quebra de linha, sem
espaço antes ou depois, sem aspas**:

```
postgresql://postgres.vjbqikfamqdttbmaqrxf:SENHA_CODIFICADA@aws-0-sa-east-1.pooler.supabase.com:6543/postgres
```

Repita para `POSTGRES_URL_DIRECT`, trocando **apenas a porta** de `6543` para `5432`:

```
postgresql://postgres.vjbqikfamqdttbmaqrxf:SENHA_CODIFICADA@aws-0-sa-east-1.pooler.supabase.com:5432/postgres
```

Depois: **Deployments → o mais recente → `⋯` → Redeploy.** Variável de ambiente só entra em
vigor em build novo.

### O que provavelmente está errado no valor atual

O hostname resolvido foi `base`, o que sugere que o texto colado não é a URI, e sim o **bloco
"Connection parameters"** que o painel do Supabase mostra logo acima dela:

```
host:aws-0-sa-east-1.pooler.supabase.com
port:6543
database:postgres          ← o "base" do erro provavelmente vem daqui
user:postgres.vjbqikfamqdttbmaqrxf
```

**O valor certo é a linha única que começa com `postgresql://`**, não esse bloco.

## Como verificar sem adivinhar

Depois do Redeploy, com sessão aberta em `https://aurea-custodia-mvp.vercel.app/inicio`:

- ✅ **Certo:** o painel carrega com saldo e moedas
- ❌ **Errado:** "Application error"

E no log: `vercel logs https://aurea-custodia-mvp.vercel.app` — não pode haver `ENOTFOUND`.

Para conferir se produção realmente gravou no Supabase, consultar
`aurea.aurea_state` e ver se `updated_at` da chave `aurea-market-v6` avançou.

---

# 4. Contexto do projeto, para quem chega agora

## O que é

Plataforma da **AUREA CUSTODIA LTDA** (CNPJ 68.071.452/0001-06), nome fantasia **Real
Olímpico**: custódia física de moedas comemorativas brasileiras, marketplace de negociação
entre os donos e, no futuro, crédito com garantia.

**Ambiente é MVP de teste com 7 contas de sócios — não há cliente real nem dinheiro real.**

Stack: Next.js 15 (App Router) + React 19 + TypeScript strict, na Vercel.

## As camadas

```
src/domain/     Regra de negócio PURA. Sem React, sem I/O. 38 testes.
src/server/     Só servidor. Persistência, sessão, Server Actions. import 'server-only'.
src/app/        Rotas do App Router.
src/components/ UI. Client Components.
src/lib/        Integrações externas.
src/styles/     CSS global por área.
```

**Regra inviolável:** nada de `@/server/*` importado por Client Component — o
`import 'server-only'` quebra o build se acontecer.

## Como a persistência funciona hoje

Todo o estado é **um único documento JSON** gravado sob a chave `STORE_KEY` (hoje
`aurea-market-v6`). O adaptador é escolhido por variável de ambiente, nesta ordem
(`src/server/store/index.ts`):

| Prioridade | Variáveis | Adaptador |
|---|---|---|
| 1 | `POSTGRES_URL` ou `DATABASE_URL` | Postgres — resolve concorrência com `FOR UPDATE` |
| 2 | `KV_REST_API_URL` + `KV_REST_API_TOKEN` | Redis (Upstash KV) — última gravação vence |
| 3 | `UPSTASH_REDIS_REST_*` | Redis |
| 4 | *(nenhuma)* | Memória — some no cold start |

**É por isso que apagar `POSTGRES_URL` restaura o site:** ele cai para o nível 2.

## Chaves de estado separadas por ambiente

Para os testes locais não mexerem no saldo dos sócios, cada ambiente tem sua chave:

| Ambiente | `AUREA_STORE_KEY` |
|---|---|
| Produção | *(não definida)* → usa o padrão `aurea-market-v6` |
| Preview | `aurea-market-v6-preview` |
| Local (`.env.local`) | `aurea-market-v6-local` |

---

# 5. O que foi alterado no código (já em produção)

Dois commits, ambos empurrados:

| Commit | O quê |
|---|---|
| `9e392db` | Move o blob para o schema `aurea` e liga RLS no adaptador Postgres |
| `1819574` | Registra a lição das rotações de senha na documentação |

## `9e392db` — a mudança que importa

`src/server/store/postgres.ts`:

```typescript
const SCHEMA = 'aurea'
const TABLE = `${SCHEMA}.aurea_state`

// em ensureTable():
await pool.query(`CREATE SCHEMA IF NOT EXISTS ${SCHEMA}`)
await pool.query(`CREATE TABLE IF NOT EXISTS ${TABLE} (...)`)
await pool.query(`ALTER TABLE ${TABLE} ENABLE ROW LEVEL SECURITY`)
```

**Por quê:** sem isso, `public.aurea_state` seria publicada como API REST na internet e o
estado inteiro (saldos, ofertas, senhas de teste) ficaria legível e alterável por qualquer
pessoa com a chave `anon`, que é pública e está no repositório aberto.

Verificado contra o Supabase real, dentro de transação com rollback. Lint, 38 testes e build
verdes.

---

# 6. Regras do repositório que valem nesta correção

## Antes de commitar

```bash
npm run typecheck
npm test          # 38 testes, todos precisam passar
npm run build
```

Existe CI no GitHub Actions rodando lint → typecheck → test → build a cada push.

## Superfície protegida — exige parada e decisão dos sócios

- `src/domain/constants.ts`, `fees.ts`, `market.ts`, `types.ts`
- O contrato de `src/server/store/types.ts`
- As Server Actions

**`src/server/store/postgres.ts` está nessa fronteira.** Mudanças de comportamento ali
precisam ser explicadas e registradas.

## Documentação obrigatória

Todo atalho de teste ou segurança tomado para entregar rápido é registrado em **dois**
lugares, no mesmo commit:

1. `RISCOS_ASSUMIDOS.md` na raiz — o compilador
2. `ATALHOS.md` da pasta afetada — a nota local

## Nunca

- Commitar senha, token ou credencial. **O repositório está público de propósito** (decisão
  do Gabriel, para agentes lerem sem fricção — ele fecha quando as edições terminarem)
- Importar `@/server/*` de Client Component
- Sugerir blockchain, tokenização ou NFT on-chain
- `float` para dinheiro — sempre `Cents` inteiro

---

# 7. Dívida registrada que se resolve junto

**RA-12** em `RISCOS_ASSUMIDOS.md`: a senha do banco trafegou por chat durante a
configuração e foi rotacionada três vezes no mesmo dia por causa da codificação de URL.

**Quando o ambiente estabilizar**, fazer a rotação final:

1. Supabase → **Settings → Database → Reset database password**
2. **Generate a password** — a senha gerada tem só letras e números, e **elimina o problema
   de codificação de uma vez**
3. Atualizar `POSTGRES_URL` e `POSTGRES_URL_DIRECT` na Vercel
4. Redeploy

**Não fazer isso agora** — resolver um problema por vez.

---

# 8. Pendências de configuração, independentes deste defeito

| Item | Situação |
|---|---|
| `POSTGRES_URL_DIRECT` | Existe **só em Production**. Precisa também em Preview e Development, para as migrations do M1 |
| Exposed schemas no Supabase | Conferir em *Settings → Data API* que lista apenas `public` (e `graphql_public`) — **sem `aurea`** |
| Chaves `anon` / `service_role` | Só serão necessárias no M2 (login com Supabase Auth) |

---

# 9. Resumo para a primeira mensagem do chat novo

> A produção da Áurea Custódia está quebrada para usuário logado com
> `getaddrinfo ENOTFOUND base`. O banco Supabase, a senha e o código estão todos
> verificados e corretos — o defeito é o valor colado em `POSTGRES_URL` na Vercel, que não é
> uma URL válida (provavelmente o bloco "Connection parameters" em vez da URI).
>
> A correção é reescrever as duas variáveis com a linha única `postgresql://…` e fazer
> Redeploy. Se precisar restaurar o site antes disso, apagar `POSTGRES_URL` faz a aplicação
> voltar ao Redis, que funciona.
