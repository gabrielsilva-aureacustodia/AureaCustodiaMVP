# Próximos passos — Supabase

**O que o Gabriel faz, o que o agente faz. Nesta ordem.**

```
Escrito em: 02/09/2026, 03:30
Contexto completo: docs/HANDOFF_CORRECAO_SUPABASE.md
```

---

> 🔴 **Nota da frente B (02/09/2026, madrugada).** A primeira versão deste documento foi
> commitada **com a senha do banco em texto puro** (commit `0a7d517`) e enviada ao GitHub —
> repositório público. A senha foi removida daqui, mas **continua no histórico do git**. Isso
> obriga uma nova rotação; ver RA-12 em `RISCOS_ASSUMIDOS.md` e o passo 1 de
> `docs/HANDOFF_FRENTE_B_BANCO.md`. Os passos abaixo continuam válidos com a senha que sair
> dessa rotação.

# ⚡ O que mudou desde o handoff

**A senha foi rotacionada para uma sem caracteres especiais**, e isso elimina a causa raiz de
todas as falhas até aqui.

| Antes | Agora |
|---|---|
| a senha antiga, com `!!` | a senha nova, só letras e números — **no gerenciador de senhas, não aqui** |
| Precisava virar `%21%21` na URL | **Nenhuma codificação** — só letras e números |
| Três rotações, três falhas de autenticação | ✅ Testada e funcionando |

**Verificado em 02/09/2026, 03:30**, direto contra o Supabase:

| Porta | Resultado |
|---|---|
| 6543 (transaction pooler) | ✅ OK |
| 5432 (session pooler) | ✅ OK |

> Nota: a porta 6543 falhou na primeira tentativa e passou na segunda. **O pooler leva alguns
> segundos para aprender a senha nova.** Se der erro logo após uma rotação, esperar e repetir
> antes de suspeitar da senha.

---

# 👤 PASSOS DO GABRIEL — 2 minutos

## 1. Corrigir as duas variáveis na Vercel

**Vercel → `aurea-custodia-mvp` → Settings → Environment Variables**

Para **`POSTGRES_URL`**: clique em `⋯` → **Edit**, **apague tudo** que está no campo e cole
exatamente esta linha — sem aspas, sem espaço, sem quebra de linha:

```
postgresql://postgres.vjbqikfamqdttbmaqrxf:SENHA_DO_GERENCIADOR@aws-0-sa-east-1.pooler.supabase.com:6543/postgres
```

Para **`POSTGRES_URL_DIRECT`**: mesma coisa, mudando **só a porta** para `5432`:

```
postgresql://postgres.vjbqikfamqdttbmaqrxf:SENHA_DO_GERENCIADOR@aws-0-sa-east-1.pooler.supabase.com:5432/postgres
```

> ⚠️ **O erro anterior foi colar o bloco "Connection parameters"** (aquele com `host:`,
> `port:`, `database:`, `user:` em linhas separadas) em vez da linha única. Por isso a
> aplicação tentava resolver o hostname `base` — ele vinha da palavra `database`.
>
> **O valor certo é uma linha só, começando com `postgresql://`.**

## 2. Marcar os ambientes certos

| Variável | Production | Preview | Development |
|---|---|---|---|
| `POSTGRES_URL` | ✅ | ✅ | ✅ |
| `POSTGRES_URL_DIRECT` | ✅ | ✅ **(falta)** | ✅ **(falta)** |

`POSTGRES_URL_DIRECT` existe **só em Production** hoje. O agente vai precisar dela nos outros
dois para as migrations.

## 3. Redeploy

**Deployments → o mais recente → `⋯` → Redeploy.**

Variável de ambiente só entra em vigor em build novo. Sem isso, nada muda.

## 4. Conferir (30 segundos)

Entre em `https://aurea-custodia-mvp.vercel.app` com `gabrielsilva@testeaurea.com.br` /
`12345678`.

- ✅ **Deu certo:** o painel carrega com saldo e moedas
- ❌ **Ainda quebrado:** "Application error: a server-side exception has occurred"

**Se ainda quebrar:** apague `POSTGRES_URL` e faça Redeploy. O site volta ao Redis e funciona
enquanto o agente investiga.

---

# 🤖 PASSOS DO AGENTE — na ordem

## Passo 1 — Confirmar que a produção voltou

Antes de qualquer código:

```bash
vercel logs https://aurea-custodia-mvp.vercel.app
```

**Não pode haver `ENOTFOUND`.** Depois, confirmar que produção escreveu no Supabase: a chave
`aurea-market-v6` em `aurea.aurea_state` precisa ter `updated_at` recente.

Só siga se isso estiver verde.

## Passo 2 — Atualizar o `.env.local`

O arquivo local ainda tem a senha antiga. É gitignorado; a senha nova está no gerenciador
de senhas do Gabriel e entra sem codificação:

```
POSTGRES_URL="postgresql://postgres.vjbqikfamqdttbmaqrxf:SENHA_DO_GERENCIADOR@aws-0-sa-east-1.pooler.supabase.com:6543/postgres"
POSTGRES_URL_DIRECT="postgresql://postgres.vjbqikfamqdttbmaqrxf:SENHA_DO_GERENCIADOR@aws-0-sa-east-1.pooler.supabase.com:5432/postgres"
AUREA_STORE_KEY="aurea-market-v6-local"
```

A `AUREA_STORE_KEY` local existe para os testes não mexerem no estado dos sócios.

## Passo 3 — Fechar o RA-12

Em `RISCOS_ASSUMIDOS.md`, o RA-12 (senha trafegou por chat) **continua aberto** — a senha nova
também passou por aqui. Marcar que a rotação foi feita e que uma última fica pendente para
quando o repositório for fechado.

Atualizar também `docs/referencia/INFRAESTRUTURA_SUPABASE.md`: a seção sobre percent-encoding
vira histórico, porque a senha atual não precisa disso.

## Passo 4 — Só então, começar o M1

Com a conexão estável, seguir `docs/EXECUCAO_POR_MODULO.md`, módulo M1:

1. `src/server/db/` com README e `client.ts` (`import 'server-only'` na primeira linha)
2. `schema.sql` + `migrations/001_inicial.sql` — **tudo no schema `aurea`**, nunca em `public`
3. Repositórios de leitura, um por vez
4. `carregarLivroParaMotor` + `persistirResultado` — **o passo mais delicado**
5. Server Actions, uma por vez, com `npm test` entre cada
6. Os ~30 pontos de leitura em telas e seletores
7. **Só no fim**, remover `src/server/store/`

### O que NÃO fazer no M1

- ❌ **Reescrever `matchOrders` em SQL.** Ele roda dentro da transação sobre um `AppState`
  parcial carregado com `SELECT … FOR UPDATE`. Os 38 testes continuam valendo sem alteração —
  esse é o critério de aceite mais importante da fase
- ❌ Criar tabela em `public` — o Supabase publica esse schema como API REST na internet
- ❌ Remover `src/server/store/` antes do passo 7
- ❌ `float` para dinheiro. Sempre `Cents` inteiro / `bigint`

---

# 📌 Estado atual, em uma tabela

| Item | Situação |
|---|---|
| Banco Supabase | ✅ PostgreSQL 17.6, São Paulo, funcionando |
| Senha rotacionada (no gerenciador) | ✅ Testada nas duas portas em 02/09, 03:30 — **mas commitada: rotacionar de novo** |
| Tabela `aurea.aurea_state` | ✅ Criada, RLS ligada, seed gravado (32 negociações) |
| `public.aurea_state` | ✅ Não existe — nada exposto na API pública |
| Código (commits `9e392db`, `1819574`, `93b7121`) | ✅ Em produção |
| 38 testes, lint, build | ✅ Verdes |
| **Variáveis na Vercel** | ❌ **Valor malformado — é o único defeito** |
| **Produção para usuário logado** | 🔴 **Quebrada até o Redeploy** |

---

# ⚠️ Duas regras que o próximo agente não pode esquecer

**1. Todo atalho vai para dois lugares.** `RISCOS_ASSUMIDOS.md` na raiz **e** o `ATALHOS.md`
da pasta afetada, no mesmo commit que introduziu o atalho.

**2. O repositório está público de propósito.** Decisão do Gabriel, para agentes lerem sem
fricção; ele fecha quando as edições terminarem. **Nenhuma senha, token ou credencial entra
em commit** — nem em documento, nem em comentário de código.

Antes de commitar: `npm run typecheck`, `npm test`, `npm run build`.
