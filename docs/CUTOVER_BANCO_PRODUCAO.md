# Cutover — pôr a produção sobre tabelas sem derrubar o site

**O roteiro do dia da virada. Para executar com o passo a passo aberto na tela.**

```
Escrito em: 03/09/2026 · frente B (banco e backend)
Vale para:  a entrada de src/server/db/ em produção (módulo M1)
Branch:     feat/banco-supabase — publicada em origin
```

> Este documento existe porque a virada tem **uma ordem obrigatória que é o contrário do
> instinto**: a migration vai **antes** do merge. Invertendo, o site fica fora do ar até
> alguém rodar um comando.

---

# Em uma frase, para o Rogério

Hoje o site guarda tudo num arquivão; depois da virada, guarda em tabelas. A troca é
segura desde que a "estante" seja montada **antes** de o site novo entrar no ar — se
entrar primeiro e a estante não existir, ele não acha onde guardar nada e nem a tela de
entrar funciona.

---

# Por que a ordem é essa

A produção **já tem `POSTGRES_URL`** — é ela que hoje aponta para o arquivão em
`aurea.aurea_state`. No código novo, essa mesma variável significa outra coisa: "o estado
está em tabelas". Assim que o deploy novo subir, toda requisição vai procurar
`aurea.seq`. Se a migration não tiver rodado, a resposta é sempre a mesma:

```
aurea.seq está vazia — a migration inicial não foi aplicada. Rode: npm run db:migrate
```

E isso inclui a tela de login. **Rodar a migration antes é seguro** porque ela só cria
tabelas novas ao lado do arquivão; o código que está no ar hoje não enxerga essas tabelas
e continua funcionando exatamente como antes.

---

# Pré-requisito: a senha do banco

🔴 **A senha atual está no histórico público do GitHub** (commit `0a7d517`, RA-12) e a que
está no `.env.local` já não é aceita pelo Supabase. Antes de qualquer passo:

1. Supabase → **Settings → Database → Reset database password** → **Generate a password**
2. Guardar no gerenciador de senhas
3. Atualizar `.env.local` (na pasta principal, `C:\dev\AureaCustodiaMVP`) e as duas
   variáveis na Vercel
4. Esperar um minuto: **o pooler leva alguns segundos para aprender a senha nova** — erro
   logo após a rotação não quer dizer senha errada

O `.env.local` precisa ficar assim, com a senha nova nas duas linhas:

```
POSTGRES_URL="postgresql://postgres.vjbqikfamqdttbmaqrxf:SENHA@aws-0-sa-east-1.pooler.supabase.com:6543/postgres"
POSTGRES_URL_DIRECT="postgresql://postgres.vjbqikfamqdttbmaqrxf:SENHA@aws-0-sa-east-1.pooler.supabase.com:5432/postgres"
AUREA_DB_SCHEMA="aurea_local"
```

> **O `.env.local` mora na pasta principal, não no worktree.** Ele é ignorado pelo Git e
> não viaja entre worktrees. Os comandos `db:check` e `db:migrate` procuram nos dois
> lugares e dizem, na primeira linha da saída, qual arquivo usaram.

---

# Fase 0 — Ensaio local (≈ 15 min)

Tudo aqui acontece na gaveta `aurea_local`. **Nada toca o estado dos sócios.**

## 1. Conferir a conexão

```bash
cd C:/dev/AureaCustodiaMVP-banco && npm run db:check
```

Esperado: `✓ senha aceita` e, como a gaveta ainda não existe,
`✗ schema "aurea_local": migration NÃO aplicada`. **Se a senha for recusada aqui, pare** —
o resto depende dela.

## 2. Criar a gaveta local

```bash
cd C:/dev/AureaCustodiaMVP-banco && npm run db:migrate
```

Esperado: `+ 001_inicial`, o schema `aurea_local` e `✓ nenhuma tabela em public`. Rodando
de novo, `= 001_inicial (já aplicada)` — o comando é idempotente.

## 3. Conferir de novo

```bash
cd C:/dev/AureaCustodiaMVP-banco && npm run db:check
```

Esperado agora: `✓ as 10 tabelas do M1 existem`, `✓ RLS ligada em todas as tabelas do
schema`, `· users vazia: a primeira requisição semeia as 7 contas` e `Pronto para uso.`

## 4. Provar a fila de escrita com duas conexões reais 🔴

**Este é o passo que não pode ser pulado.** A suíte roda hoje contra um Postgres embutido
que tem **uma conexão só** — ele enfileira transações por construção e, por isso, **não
consegue provar** que duas compras simultâneas disputam a trava de verdade. É a única
garantia de concorrência da plataforma e ela nunca foi vista funcionando.

```bash
cd C:/dev/AureaCustodiaMVP-banco && AUREA_DB_TEST_URL="postgresql://postgres.vjbqikfamqdttbmaqrxf:SENHA@aws-0-sa-east-1.pooler.supabase.com:5432/postgres" npm test
```

No PowerShell:

```bash
$env:AUREA_DB_TEST_URL="postgresql://postgres.vjbqikfamqdttbmaqrxf:SENHA@aws-0-sa-east-1.pooler.supabase.com:5432/postgres"; npm test
```

Esperado: **83 testes, 0 pulados** (sem a variável são 69 e 1 pulado). A suíte cria e apaga um schema `aurea_test`; não toca
em `aurea` nem em `aurea_local`. **Falhando algum teste aqui, pare** — é exatamente o que
o Postgres embutido não podia mostrar, e é melhor descobrir agora do que com os sócios
dentro do sistema.

## 5. Subir e clicar

```bash
cd C:/dev/AureaCustodiaMVP-banco && npm run dev
```

Entrar com `gabrielsilva@testeaurea.com.br` / `12345678`. A primeira requisição semeia as
7 contas em `aurea_local`. Conferir, nesta ordem: painel com saldo e moedas → publicar um
anúncio → comprar com outra conta → abrir o extrato.

---

# Fase 1 — A virada (≈ 30 min, com o Gabriel presente)

## 1. Fase 0 completa, incluindo o passo 4 verde

## 2. Conferir a variável na Vercel

**Settings → Environment Variables → `POSTGRES_URL`.** O valor precisa ser **uma linha
só**, começando com `postgresql://`, apontando para a porta **6543** do host que termina
em `pooler.supabase.com`.

> O defeito de 02/09 foi colar o bloco "Connection parameters" (com `host:`, `port:`,
> `database:` em linhas separadas) em vez da linha única. O sintoma foi a aplicação tentar
> resolver um hostname chamado `base` — vindo da palavra `database`.

`POSTGRES_URL_DIRECT` **não precisa** existir na Vercel: ela só serve para as migrations,
que rodam da sua máquina.

## 3. Migration em produção — ANTES do merge

```bash
cd C:/dev/AureaCustodiaMVP-banco && AUREA_DB_SCHEMA=aurea npm run db:migrate
```

No PowerShell: `$env:AUREA_DB_SCHEMA="aurea"; npm run db:migrate`

Esperado: `+ 001_inicial`, schema `aurea`, `✓ nenhuma tabela em public`. Confirmar com:

```bash
cd C:/dev/AureaCustodiaMVP-banco && AUREA_DB_SCHEMA=aurea npm run db:check
```

Esperado: `Pronto para uso.` e `· aurea.aurea_state (blob antigo) ainda existe`. **O site
em produção continua funcionando normalmente neste ponto** — as tabelas novas estão ao
lado do arquivão, e o código no ar não as enxerga.

## 4. Avisar os sócios

**O ambiente recomeça do seed.** Saldos, anúncios, envios e senhas trocadas voltam ao
início. É o custo previsto no RA-08 e aceito no `CLAUDE.md`. Preservar o que existe hoje
seria trabalho novo (exportar o arquivão e importar nas tabelas) e não está feito.

## 5. Merge e deploy

A frente B é a **primeira** da ordem de merge; A e C fazem rebase depois dela.

```bash
cd C:/dev/AureaCustodiaMVP && git checkout main && git pull --ff-only && git merge --no-ff feat/banco-supabase -m "Merge feat/banco-supabase: estado em tabelas no Supabase (M1)" && npm run typecheck && npm test && npm run build && git push origin main
```

O `&&` é proposital: falhando qualquer verificação, a corrente para **antes** do push.

## 6. Verificar, em até dois minutos

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://aurea-custodia-mvp.vercel.app/
```

Esperado `200`. Depois, entrar no site e ver o painel com saldo e moedas. Se aparecer
"Application error" ou 500:

```bash
vercel logs https://aurea-custodia-mvp.vercel.app
```

## 7. Rollback, se precisar 🔴

**Vercel → Deployments → o deploy anterior → `⋯` → Instant Rollback.**

> ⚠️ **Não remova `POSTGRES_URL`.** O instinto é tirar a variável para "voltar ao que era",
> e isso **não** funciona: o build novo, sem ela, vai para o Redis ou para a memória, não
> para o arquivão. Quem lê o arquivão é o **build anterior**, e é a ele que o Instant
> Rollback devolve o site.

Com o site de volta no ar, diagnosticar pelo log com calma e refazer o deploy depois.

## 8. Registrar

Acrescentar em `docs/diario/VERSION_COMPARISON_DAILY.md` (**append-only** — entrada nova,
sem editar as anteriores): a data, o resultado do passo 4 da Fase 0, o deploy e o
resultado do passo 6.

---

# Depois da virada

| Quando | O quê |
|---|---|
| No mesmo dia | Marcar o critério "duas compras simultâneas" como fechado no `CATALOGO_DE_FEATURES.md`, se o passo 4 passou |
| Uma semana depois | Sessão B-2: passo 9 do M1 — remover `src/server/store/`, `STORE_KEY`, `AUREA_STORE_KEY` e a tabela `aurea.aurea_state`. Prompt em [`prompts/AGENTE_B2_POS_PRODUCAO.md`](prompts/AGENTE_B2_POS_PRODUCAO.md) |
| Quando os sócios decidirem | CD-09: o extrato passa a ler `t.fee` em vez de recalcular |

---

# Se alguma coisa der errado — o mapa dos sintomas

| Sintoma | Causa provável | O que fazer |
|---|---|---|
| `password authentication failed` | Senha do `.env.local` ou da Vercel diferente da do Supabase | Rotacionar e atualizar os dois. Esperar um minuto pelo pooler |
| `getaddrinfo ENOTFOUND base` | O bloco "Connection parameters" foi colado no lugar da URL | Trocar pelo valor de uma linha só |
| Falha de conexão sem explicação | Host que não é do pooler (só responde em IPv6) | Usar o host terminado em `pooler.supabase.com` |
| `aurea.seq está vazia` em produção | Deploy entrou antes da migration | Rodar o passo 3 da Fase 1 agora; o site volta sem novo deploy |
| Site 500 logo após o deploy | Qualquer uma das anteriores | Instant Rollback (passo 7), depois diagnosticar |
| `npm run db:migrate` diz que não achou variável | Rodando num worktree e o `.env.local` não existe em lugar nenhum | Criar na pasta principal; o comando procura lá também |
