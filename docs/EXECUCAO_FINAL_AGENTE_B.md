# Execução — Agente B · Banco e backend

**O que falta na frente B: nada de código, e uma virada de produção com ordem obrigatória**

```
Escrito em: 03/09/2026, à noite
Para:       o agente que trabalha no banco (feat/banco-supabase, já mergeada)
Estado:     código mergeado no main local · typecheck, lint, 117 testes e build verdes
Substitui:  docs/EXECUCAO_BRANCH_B_O_QUE_FALTA.md, de 03/09 pela manhã
```

> **A frente B está pronta em código.** O que resta é operação: aplicar as migrations no
> Supabase, provar a fila de escrita com duas conexões reais, e virar a produção na ordem
> certa. Fazer isso fora de ordem derruba o site.

---

# 1. Em uma frase

O estado já vive em tabelas no código, e o `main` local passa em tudo; **falta o banco de
verdade nunca ter sido tocado** — a senha do `.env.local` continua recusada, a migration não
foi aplicada e a produção ainda roda sobre o blob JSON.

---

# 2. O que mudou desde a auditoria da manhã

| Mudança | Efeito na frente B |
|---|---|
| **Frentes B e C mergeadas no `main` local** | Nada a fazer; a B foi a primeira, como o contrato mandava |
| **Migration `002_pagamentos_rastreio.sql`** (frente C) | Três tabelas novas no schema `aurea`: `payment_events`, `payment_intents`, `rastreios`. **Duas delas têm chave estrangeira para `users` e `envios`** |
| `scripts/db-check.mjs` | `TABELAS_ESPERADAS` passou de 10 para 13; o diagnóstico só aprova um banco com as duas migrations |
| `db.test.ts` | O `TRUNCATE` e a lista de tabelas esperadas foram atualizados. **Sem isso a suíte inteira quebrava** — o Postgres recusa truncar tabela referenciada se quem a referencia ficar de fora |
| `scripts/db-check.d.mts` | Corrigido: o `R` de `ClienteDeConsulta` estava sem restrição e quebrava `npm run typecheck` |
| **Um commit novo na branch B** (`f3bc05d`) | Trouxe `db:check`, `env-local.mjs` e `docs/CUTOVER_BANCO_PRODUCAO.md`. Está tudo no `main` |

---

# 3. O que falta

Legenda: 🤖 o agente faz · 👤 depende do Gabriel · ⛔ bloqueia a virada

## 3.1 🔴 ⛔ 👤 A conexão local não autentica

Conferido de novo hoje, com uma consulta somente de leitura: o DNS resolve, o pooler do
Supabase responde, e a senha é recusada (`password authentication failed`). **Nenhuma
consulta desta frente jamais tocou o banco real** — é o RA-13.d, e continua aberto.

Enquanto isso não for resolvido, nada da seção 4 acontece. Não é código: é colar no
`.env.local` a string atual do painel do Supabase (Connect → *Session pooler* para
`POSTGRES_URL_DIRECT`, *Transaction pooler* para `POSTGRES_URL`).

## 3.2 🔴 ⛔ A branch B nunca foi publicada

`feat/banco-supabase` existe só no disco desta máquina. É a fundação das outras duas.

```bash
git -C C:/dev/AureaCustodiaMVP-banco push -u origin feat/banco-supabase
```

## 3.3 🔴 ⛔ Publicar antes da migration derruba o site

A produção **já tem `POSTGRES_URL`** — o blob vive em `aurea.aurea_state` desde o commit
`9e392db`. Depois do merge, `bancoConfigurado()` passa a ser verdadeiro e `state.ts` vai
direto para as tabelas. Sem `aurea.seq`, **toda requisição falha**, inclusive o login.

A ordem segura é a inversa do instinto: **aplicar as migrations no schema `aurea` de
produção ANTES do deploy**. É seguro porque elas só criam tabelas novas ao lado do blob, e o
`main` publicado hoje não as enxerga.

O roteiro completo está em `docs/CUTOVER_BANCO_PRODUCAO.md`, escrito pela própria frente B.

## 3.4 🟠 ⛔ A fila de escrita nunca foi vista funcionando

O PGlite tem **uma conexão só** e enfileira transações por construção. Os testes "duas
compras simultâneas" e "dois envios simultâneos" provam o caminho da recusa, não a espera no
`FOR UPDATE`. A prova real custa um comando (4.4) e precisa acontecer antes da virada — é a
única garantia de concorrência da plataforma.

## 3.5 🟡 A produção recomeça do seed

Saldos, anúncios, envios e senhas trocadas voltam ao início. É o RA-08, aceito no
`CLAUDE.md`. **Avisar os sócios no dia.** Preservar o que existe hoje seria trabalho novo
(exportar o blob, importar nas tabelas) e não está feito.

## 3.6 🟡 O rollback não é "tirar a variável"

Com `POSTGRES_URL` definida, o adaptador de blob em `store/postgres.ts` **nunca é
selecionado**. Removê-la de um deploy que já roda sobre tabelas manda a aplicação para Redis
ou memória, não para o blob. O rollback real é o **Instant Rollback da Vercel** para o build
anterior. Isso já foi corrigido nos READMEs pelo commit `f3bc05d`.

## 3.7 🟡 Decisões que pedem o "sim" dos sócios

| Decisão | O que muda |
|---|---|
| `Trade.fee?` em `types.ts` | Campo opcional e aditivo, já em uso. Se discordarem, é uma linha a reverter |
| **CD-09** — o extrato ler `t.fee` | Fecha o RA-06. Uma linha em `statement.ts`: `const taxa = t.fee ?? tradeFee(t.price) * qty` |

## 3.8 🟡 Depois de uma semana de produção sobre tabelas

O passo 9 do M1: remover `src/server/store/`, o ramo antigo de `state.ts`, `STORE_KEY` e
`AUREA_STORE_KEY`, mais uma migration `003_limpeza.sql` com `DROP TABLE aurea.aurea_state`.
O prompt já existe: `docs/prompts/AGENTE_B2_POS_PRODUCAO.md`. **Não abra antes da semana.**

RA-13.a (trava por livro de ordens) e RA-13.b (leituras recortadas) só fazem sentido com
volume. Ficam registrados, não se fazem agora.

---

# 4. A virada, passo a passo

Cada passo tem verificação antes do seguinte. Não pule nenhum.

## 4.1 Corrigir a conexão local (👤, 3 min)

Cole no `.env.local` as duas strings atuais do painel e acrescente:

```
AUREA_DB_SCHEMA="aurea_local"
```

## 4.2 Conferir que autentica (🤖, 1 min)

```bash
cd C:/dev/AureaCustodiaMVP && npm run db:check
```

Esperado: o host, o schema e o diagnóstico. Se disser que a migration não foi aplicada, siga
para 4.3 — é o esperado na primeira vez.

## 4.3 Criar a gaveta local (🤖, 1 min)

```bash
cd C:/dev/AureaCustodiaMVP && npm run db:migrate
```

Esperado: `+ 001_inicial`, `+ 002_pagamentos_rastreio`, e `✓ nenhuma tabela em public`.

## 4.4 Provar a fila de escrita com duas conexões reais (🤖, 2 min)

```bash
cd C:/dev/AureaCustodiaMVP && AUREA_DB_TEST_URL="<POSTGRES_URL_DIRECT>" npm test
```

No PowerShell: `$env:AUREA_DB_TEST_URL="..."; npm test`. A suíte roda **também** contra o
Supabase, num schema `aurea_test` que ela cria e apaga. Esperado: **0 pulados**. Se algum
teste de concorrência falhar aqui, **pare**: é exatamente o que o PGlite não podia mostrar.

## 4.5 Passear pela aplicação local (👤, 3 min)

```bash
npm run dev
```

Entrar, publicar um anúncio, comprar com outra conta, abrir o extrato. A primeira requisição
semeia as sete contas em `aurea_local`.

## 4.6 Migration em PRODUÇÃO, antes do merge (🤖 + 👤, 2 min)

```bash
cd C:/dev/AureaCustodiaMVP && AUREA_DB_SCHEMA=aurea npm run db:migrate
```

O site em produção continua no blob, intacto. Confirme na Vercel que `POSTGRES_URL` é **uma
linha só**, começando com `postgresql://`, na porta 6543 do pooler.

## 4.7 Avisar os sócios (👤)

O ambiente recomeça do seed.

## 4.8 Merge e deploy (🤖)

```bash
cd C:/dev/AureaCustodiaMVP && git push origin main
```

## 4.9 Verificar em até dois minutos (🤖)

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://aurea-custodia-mvp.vercel.app/
```

Esperado `200`, depois login manual e painel com saldo e moedas. Dando errado:

```bash
vercel logs https://aurea-custodia-mvp.vercel.app
```

E o rollback é o **Instant Rollback** da Vercel, nunca remover `POSTGRES_URL`.

## 4.10 Registrar (🤖)

Entrada nova em `docs/diario/VERSION_COMPARISON_DAILY.md` com a data, o deploy e o resultado
do passo 4.9. Append-only.

---

# 5. Critério de aceite do M1, conferido

| Critério | Estado |
|---|---|
| Os 38 testes do domínio passam sem alteração | ✅ |
| Duas compras simultâneas: uma vence, a outra recebe recusa | ⚠️ provado no PGlite · falta 4.4 |
| Dois envios simultâneos não repetem `RO-` | ⚠️ idem |
| O ambiente sobe do zero com o seed | ✅ local · ⏳ produção |
| Nenhuma tabela em `public` | ✅ testado · ⏳ conferir com `db:check` em produção |
| `npm run build` verde | ✅ |
| Produção sobre tabelas | ❌ é a seção 4 |
| `src/server/store/` removido (passo 9) | ❌ uma semana depois da virada |

---

# 6. O que NÃO fazer

- ❌ Publicar o `main` antes de aplicar as migrations em produção (3.3)
- ❌ Remover `POSTGRES_URL` para "voltar atrás" (3.6)
- ❌ Editar uma migration já aplicada — crie a próxima
- ❌ Abrir a sessão B-2 antes de uma semana de produção estável
- ❌ Mudar a assinatura de `getState()`/`mutateState()`
- ❌ `float` para dinheiro, em qualquer ponto
