# Branch B — o backbone: o que confere, o que falta e como colocar em produção sem derrubar o site

```
Escrito em:  03/09/2026
Branch:      feat/banco-supabase (commit 119aff8) — SÓ LOCAL, não está no origin
Worktree:    C:\dev\AureaCustodiaMVP-banco
Base:        main em dd38a74
Verificado:  typecheck ✅ · lint ✅ · 67 testes ✅ (1 pulado: o bloco contra Supabase real) · build ✅
Supabase:    conexão local NÃO autentica (senha do .env.local desatualizada);
             migration 001 NÃO aplicada; nada da B rodou contra o banco de verdade
```

> Auditoria feita com calma, arquivo por arquivo: migration, cliente, transação,
> planejador de diff, os oito repositórios, os dois aplicadores de migration, os 29 testes
> e toda a documentação da frente. O veredito está na seção 1; o resto é a prova e o plano.

---

# Em uma frase, para o Rogério

A frente B fez o trabalho certo do jeito certo: o estado saiu de um arquivão JSON e virou
dez tabelas de banco, com a regra "quem chega segundo espera o primeiro" garantida pelo
próprio banco e sem mexer na regra de negócio. **O que falta não é código, é operação**: a
branch existe só neste computador, nunca falou com o Supabase de verdade, e a ida para
produção tem uma ordem obrigatória — aplicar a migration **antes** de publicar — que, se
invertida, deixa o site fora do ar até alguém rodar um comando.

---

# 1. Veredito

| Pergunta | Resposta |
|---|---|
| O desenho está correto? | **Sim.** Trava antes da leitura, diff na ordem das chaves estrangeiras, histórico append-only recusado pelo planejador, dinheiro em `bigint`, tudo no schema `aurea` com RLS. Não encontrei defeito de lógica |
| Os 38 testes passam sem alteração? | **Sim**, e o motor `matchOrders` não foi tocado |
| A assinatura de `getState`/`mutateState` foi preservada? | **Sim.** Nenhuma Server Action mudou — o contrato das frentes funcionou |
| Foi provado contra o Supabase? | **Não.** Nem a migration, nem a fila de escrita com duas conexões. O PGlite tem uma conexão só e **não consegue** exercitar o `FOR UPDATE` |
| Pode ir para produção hoje? | **Não sem a Fase 1 desta página.** Publicar antes da migration derruba o site (seção 3.2) |

---

# 2. O que foi conferido, ponto a ponto

Cada linha é uma coisa que eu procurei e o que encontrei. É a parte "com calma".

## 2.1 Migration `001_inicial.sql`

| Conferência | Resultado |
|---|---|
| Todas as tabelas em `aurea`, nenhuma em `public` | ✅ 10 tabelas + `schema_migrations`, criada pelo aplicador |
| RLS ligada em todas, sem política | ✅ Nega tudo a `anon`/`authenticated`; o dono (`postgres`) passa. Correto para o Supabase |
| Dinheiro em `bigint` centavos, `CHECK` de sinal | ✅ `balance >= 0`, `price > 0`, `fee >= 0` |
| `balance >= 0` pode recusar uma operação legítima? | ✅ Não. `matchOrders` só executa se `buyer.balance >= price`; `buyLot`, `publishBid`, `editBid` e `sellToBid` conferem saldo antes. O `CHECK` é rede, não regra nova |
| `sell_offers.coin_id UNIQUE` pode conflitar? | ✅ Não. O planejador remove ofertas antes de inserir, e o domínio nunca põe a mesma moeda em duas ofertas |
| Ordem dos arrays preservada | ✅ `ord bigserial` em users/ofertas/bids/envios, `posicao` em coins, `id` em trades/deposits. O motor desempata por posição no array, e a leitura reproduz |
| Idempotente | ✅ `IF NOT EXISTS` / `ON CONFLICT` — rodar duas vezes não dói |
| `pass text` | ⚠️ Texto puro, como no seed (RA-02). Sai numa migration futura quando a frente A fechar o RA-02 |

## 2.2 `client.ts` (a única porta da credencial)

| Conferência | Resultado |
|---|---|
| `import 'server-only'` na primeira linha útil | ✅ |
| Um pool por processo em `globalThis`, promessa guardada | ✅ Evita dois pools em dev e esgotamento no serverless |
| `pg` importado dinamicamente | ✅ Ambientes sem banco não carregam o driver |
| Compatível com o pooler do Supabase em modo transação (porta 6543) | ✅ Statements anônimos, sem `SET`, sem prepared nomeado, `BEGIN … COMMIT` na mesma conexão |
| TLS | ✅ Deduzido da string, `rejectUnauthorized: false` para provedor gerenciado |
| `max: 5` por instância | ✅ Adequado ao plano Free (pool de 15 no pooler) |

## 2.3 `estado.ts` + `repositories/seq.ts` (a transação e a trava)

| Conferência | Resultado |
|---|---|
| Trava vem **antes** de qualquer leitura | ✅ `carregarSeq(tx, { travar: true })` é a primeira consulta. Trava depois seria corrida de dados |
| Segunda transação lê o estado já commitado | ✅ `READ COMMITTED`: depois de esperar o `FOR UPDATE`, cada `SELECT` vê o commit anterior |
| Leitura não enfileira atrás das escritas | ✅ `REPEATABLE READ READ ONLY`, sem trava — o polling de 10 s não bloqueia ninguém |
| Semeadura dupla em duas primeiras requisições | ✅ Impossível: a semeadura passa pela trava; a segunda vê o seed da primeira |
| `fn` que lança exceção | ✅ Rollback; nada gravado |
| `fn` que devolve `ok: false` | ⚠️ Grava mesmo assim — **igual ao blob**, comportamento preservado de propósito. Não é defeito |
| `Trade.fee` igual na ida e na volta | ✅ `congelarComissoes` — achado e corrigido pela própria B (H-05) |

## 2.4 `diff.ts` (o planejador) e os repositórios

| Conferência | Resultado |
|---|---|
| Ordem das operações respeita as chaves estrangeiras | ✅ Remoções das folhas para as raízes, depois users, coins, o resto |
| Histórico append-only | ✅ `trades`/`deposits` que encolhem viram exceção antes de qualquer gravação; nenhuma rotina do domínio remove ou reordena esses arrays |
| `bigint` do `pg` (string) e do PGlite (`BigInt`) | ✅ `num()` centraliza; estoura se sair do inteiro seguro |
| `jsonb` (settings, códigos gerados) | ✅ `json()` tolera driver que devolva string |
| Campo opcional ausente vs `null` | ✅ Ausente no `AppState` quando nulo — testado (`prevAccess`) |
| Troca de dono de moeda | ✅ Vira `coin.atualizar` com dono e posição novos; sem `UNIQUE` em (dono, posição), então não há conflito transitório |
| `Promise.all` de 8 consultas numa conexão | ✅ O `pg` serializa na mesma conexão; o PGlite também. Sem risco |
| `AUREA_DB_SCHEMA` entra na SQL por interpolação | ✅ Validado por regex de identificador antes — não vira injeção |
| Reescrita `aurea.` → `schema.` nas migrations | ✅ Regex com `\b`; alcança comentários, sem efeito. `aurea_test.` não casa |

## 2.5 Testes

| Conferência | Resultado |
|---|---|
| 16 testes do planejador, sem banco | ✅ Cobrem depósito, transferência, livro, casamento, envios, custódia, append-only, fee |
| 13 testes contra PGlite | ✅ Migration, RLS, semeadura, ida e volta, diff mínimo, casamento, wizard, edição/cancelamento, preferências, rollback, ordem das moedas |
| "Duas compras simultâneas" e "dois envios simultâneos" | ⚠️ **No PGlite provam só o caminho da recusa**, não a espera na trava: há uma conexão só, e ele enfileira transações por construção. O critério de aceite fica **aberto** até rodar com `AUREA_DB_TEST_URL` (Fase 0, passo 4). A B foi honesta sobre isso no RA-13.d |
| Modo contra banco real | ✅ Existe, no mesmo arquivo, com schema `aurea_test` descartável |

## 2.6 Aplicadores de migration

| Conferência | Resultado |
|---|---|
| `migrar.ts` (testes) e `scripts/db-migrate.mjs` (linha de comando) | ✅ Mesma SQL, mesma regra, duplicação declarada e justificada |
| Usa `POSTGRES_URL_DIRECT` (porta 5432) | ✅ Correto: DDL pelo pooler de transação é frágil |
| `process.loadEnvFile` | ⚠️ Exige Node ≥ 20.12. `engines` diz `>=20`; a máquina tem 24, a Vercel usa 20.x/22.x recentes. Ajustar `engines` para `>=20.12` evita surpresa |
| Aviso de tabela em `public` | ✅ |

## 2.7 Documentação da frente

| Conferência | Resultado |
|---|---|
| README em cada pasta nova (`db/`, `repositories/`, `migrations/`, `scripts/`) | ✅ |
| `ATALHOS.md` + RA-13 na raiz, no mesmo commit | ✅ Modelo de como se registra atalho |
| `.env.example`, ritual de sessão, catálogo, diário | ✅ |
| Afirmação "o `store/` é rede de segurança" | ❌ **Imprecisa** — ver 3.3 |
| Plano do M1 (`EXECUCAO_POR_MODULO.md`) | ⚠️ Divergências benignas: não há `schema.sql` separado (a migration é o schema); `actions/*` não mudaram (melhor que o plano); repositórios `account.ts` e `seq.ts` a mais. Atualizar o plano para bater com o entregue |

---

# 3. Achados que o handoff não conta (ou conta de forma mais leve)

## 3.1 🔴 A branch existe só neste computador

`git branch -a` mostra `feat/banco-supabase` sem `origin/`. É a fundação das outras duas
frentes num único disco. **Primeiro comando de tudo:**

```bash
git -C C:/dev/AureaCustodiaMVP-banco push -u origin feat/banco-supabase
```

## 3.2 🔴 Publicar antes da migration derruba o site

A produção **já tem `POSTGRES_URL`** (o blob vive em `aurea.aurea_state` desde o commit
`9e392db`). Depois do merge, `bancoConfigurado()` é verdadeiro e `state.ts` vai direto para
as tabelas. Se `aurea.seq` não existir, **toda requisição** falha com
"`aurea.seq` está vazia — a migration inicial não foi aplicada", inclusive o login.

**A ordem segura é a inversa do instinto:** rodar `npm run db:migrate` no schema `aurea`
de produção **antes** do merge. É seguro porque a migration só cria tabelas novas ao lado
do blob; o `main` atual não as enxerga. Depois, o deploy encontra tudo pronto e semeia na
primeira requisição. Passo a passo na Fase 1.

## 3.3 🟠 O adaptador de blob em Postgres virou código morto — e a "rede de segurança" não é a que o README diz

Com `POSTGRES_URL` definida, `state.ts` escolhe as tabelas **antes** de consultar o
`store/`. O `store/postgres.ts` (blob) nunca mais é selecionado. Consequências:

- **Rollback não é "tirar a variável".** Sem `POSTGRES_URL`, o app cai em Redis (se as
  variáveis existirem) ou memória — não no blob antigo. O rollback de produção é o
  **"Instant Rollback" da Vercel** para o deploy anterior, que ainda usa o blob. Isso
  precisa estar escrito no plano de cutover (Fase 1, passo 7).
- O README de `db/` e `store/` dizem "rede de segurança"; o certo é "Redis ou memória
  quando não há Postgres". Corrigir na sessão B-2.
- Reforça o passo 9: remover `store/` e a tabela `aurea.aurea_state` (migration `003`).

## 3.4 🟠 A conexão local não autentica

Conferido hoje com uma consulta somente de leitura: o host resolve, o pooler responde e
recusa a senha ("password authentication failed"). É o mesmo bloqueio que a B relatou. Sem
isso, os passos 2 a 5 da Fase 0 não rodam. A correção é colar no `.env.local` a string
atual do painel do Supabase (Connect → Session pooler para `POSTGRES_URL_DIRECT`,
Transaction pooler para `POSTGRES_URL`). Não é assunto de segurança; é só a string errada.

## 3.5 🟠 O critério "duas compras simultâneas" ainda não está provado

Ver 2.5. A prova custa um comando (Fase 0, passo 4) e precisa acontecer **antes** do
cutover — é a única garantia de concorrência da plataforma e nunca foi vista funcionando
com duas conexões reais.

## 3.6 🟡 A produção recomeça do seed, e os sócios vão notar

Saldos, anúncios, envios e senhas trocadas voltam ao início (RA-08, aceito no `CLAUDE.md`).
Avisar os sócios no dia do cutover. Se quiserem preservar algo, é trabalho novo
(exportar o blob e importar nas tabelas) — não está feito e não estava no escopo.

## 3.7 🟡 Pedidos das outras frentes que chegam à B

| Pedido | De quem | O que a B faz |
|---|---|---|
| `aurea.payment_events`, `payment_intents`, `rastreios` — migration `002` | C-3 | Já desenhada em `EXECUCAO_BRANCH_C_O_QUE_FALTA.md` §4.1. Conferir padrão e RLS |
| Coluna `envios.modalidade` + `Envio.modalidade` | C-3 | Mudança em `types.ts`: decisão do Gabriel |
| Retirar `users.pass` e `User.pass` | A (RA-02) | Migration `003`, junto com a remoção do blob |
| Seed com e-mails reais dos sócios | A | `seed.ts` é da B; decisão do Gabriel (A4) |
| Extrato ler `t.fee` (CD-09) | sócios | Uma linha em `statement.ts` após o "sim" |

Numeração sugerida: `002` pagamentos e rastreio (C-3), `003` limpeza (blob, `pass`). Como
as frentes já terão sido mergeadas, quem escreve cada migration é a sessão que precisa dela,
seguindo o padrão de `migrations/README.md`.

## 3.8 🟡 Miúdos

- `docs/diario/VERSION_COMPARISON_DAILY.md`: a "Entrada 003" da B colide com a da C. A
  sessão C-2 renumera a da C para 004; a da B fica.
- `engines.node` → `>=20.12` (2.6).
- `Trade.fee?` em `types.ts` pede ratificação dos sócios (aditivo, opcional, sem
  comportamento novo). Recomendo ratificar.

---

# 4. Critério de aceite do M1, conferido

| Critério | Estado | O que fecha |
|---|---|---|
| Os 38 testes passam sem alteração | ✅ | — |
| Duas compras simultâneas: uma vence, a outra recebe recusa | ⚠️ PGlite (uma conexão) | Fase 0, passo 4 |
| Dois envios simultâneos não repetem `RO-` | ⚠️ idem | Fase 0, passo 4 |
| O ambiente sobe do zero com o seed | ✅ PGlite · ⏳ Supabase | Fase 0, passos 3 e 5 |
| `npm run build` verde | ✅ | — |
| Nenhuma tabela em `public` | ✅ testado · ⏳ conferir no Supabase | `npm run db:migrate` imprime |
| Produção sobre tabelas | ❌ | Fase 1 |
| `src/server/store/` removido (passo 9) | ❌ | Fase 2 |

---

# 5. Plano de execução

## Fase 0 — Hoje, local (Gabriel, ~20 min)

1. **Publicar a branch** (3.1).
2. **Corrigir o `.env.local`** (3.4) e acrescentar `AUREA_DB_SCHEMA="aurea_local"`. Conferir
   com o tutorial 6.2 antes de seguir.
3. **Criar a gaveta local:**
   ```bash
   cd C:/dev/AureaCustodiaMVP-banco && npm run db:migrate
   ```
   Saída esperada: `+ 001_inicial`, schema `aurea_local`, `✓ nenhuma tabela em public`.
4. **Provar a fila de escrita com duas conexões reais** (3.5):
   ```bash
   cd C:/dev/AureaCustodiaMVP-banco && AUREA_DB_TEST_URL="$(grep -oP '^POSTGRES_URL_DIRECT="\K[^"]+' .env.local)" npm test
   ```
   Esperado: **80 testes, 0 pulados**. Os testes de compra e envio simultâneos agora
   passam por um `FOR UPDATE` de verdade. Se algum falhar aqui, **pare**: é exatamente o
   que o PGlite não podia mostrar.
5. **Subir e clicar:** `npm run dev`, entrar com `gabrielsilva@testeaurea.com.br` /
   `12345678`, publicar um anúncio, comprar com outra conta, abrir o extrato. A primeira
   requisição semeia as 7 contas em `aurea_local`.

## Fase 1 — Cutover de produção (1 sessão, com o Gabriel presente, ~30 min)

Ordem obrigatória. Cada passo tem uma verificação antes do seguinte.

1. **Fase 0 completa**, incluindo o passo 4 verde.
2. **Confirmar na Vercel** que `POSTGRES_URL` é uma linha só começando com
   `postgresql://` e aponta para a porta **6543** do pooler (o defeito anterior era o bloco
   colado inteiro). `POSTGRES_URL_DIRECT` não precisa existir na Vercel.
3. **Migration em produção, antes do merge** (3.2), na pasta da branch B, **sem**
   `AUREA_DB_SCHEMA`:
   ```bash
   cd C:/dev/AureaCustodiaMVP-banco && AUREA_DB_SCHEMA=aurea npm run db:migrate
   ```
   Esperado: `+ 001_inicial`, schema `aurea`, `✓ nenhuma tabela em public`. O site em
   produção continua no blob, intacto — as tabelas novas ficam ao lado de `aurea_state`.
4. **Avisar os sócios** que o ambiente recomeça do seed (3.6).
5. **Merge** de `feat/banco-supabase` em `main` (é a primeira da ordem de merge) e push.
   A Vercel publica sozinha.
6. **Verificar em até 2 minutos:** abrir `https://aurea-custodia-mvp.vercel.app`, entrar,
   ver o painel com saldo e moedas. Se a tela de login responder "Falha ao salvar dados"
   ou 500, ver o passo 7.
   ```bash
   vercel logs https://aurea-custodia-mvp.vercel.app
   ```
7. **Rollback, se precisar** (3.3): Vercel → Deployments → deploy anterior → **Instant
   Rollback**. Não remover `POSTGRES_URL` — isso mandaria o app para memória, não para o
   blob. Diagnosticar no log, corrigir, novo deploy.
8. **Registrar** no `VERSION_COMPARISON_DAILY.md`: data, deploy, resultado do passo 6.

## Fase 2 — Depois de uma semana de produção sobre tabelas (sessão B-2)

Prompt pronto em `docs/prompts/AGENTE_B2_POS_PRODUCAO.md`.

1. Corrigir os READMEs de `db/` e `store/` (3.3) e o plano do M1 (2.7).
2. `engines.node >= 20.12`.
3. **Passo 9 do M1:** remover `src/server/store/`, o ramo antigo de `state.ts`,
   `STORE_KEY` e `AUREA_STORE_KEY`; migration `003` com `DROP TABLE aurea.aurea_state`
   (e a coluna `users.pass`, se a frente A já tiver fechado o RA-02).
4. CD-09, se os sócios disserem sim: `statement.ts` lê `t.fee`.
5. RA-13.a (trava por livro) e RA-13.b (leituras recortadas): só com volume. Ficam
   registrados, não se fazem agora.

## Fase 3 — O que a B recebe das outras frentes

Ver 3.7. Nada disso bloqueia a Fase 1.

---

# 6. Tutoriais de execução automática

## 6.1 Abrir a branch B num terminal do Claude Code

Já existe o worktree. Basta:

```bash
cd C:/dev/AureaCustodiaMVP-banco && git status --short && git log --oneline -1
```

## 6.2 Conferir a conexão sem mexer em nada (somente leitura)

Salve como `.db-check.tmp.mjs` **dentro** de `C:\dev\AureaCustodiaMVP-banco` (precisa do
`pg` instalado ali) e apague depois. Imprime host, DNS, se a senha vale e o que existe nos
schemas `aurea*`. Nunca imprime a senha.

```javascript
import pg from 'pg'
import dns from 'node:dns/promises'
setTimeout(() => { console.log('-- tempo esgotado'); process.exit(2) }, 45000).unref()
process.loadEnvFile('.env.local')
const url = process.env.POSTGRES_URL_DIRECT || process.env.POSTGRES_URL
const u = new URL(url)
console.log('host:', u.hostname, 'porta:', u.port, 'usuario:', u.username)
console.log('dns:', (await dns.lookup(u.hostname)).address)
const c = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 10000 })
try {
  await c.connect(); console.log('conexão: OK')
  const t = await c.query(`select table_schema, table_name from information_schema.tables
                           where table_schema like 'aurea%' or table_schema = 'public' order by 1, 2`)
  console.log('tabelas:', t.rows.map(r => `${r.table_schema}.${r.table_name}`).join(', ') || '(nenhuma)')
  const m = await c.query(`select to_regclass('aurea.schema_migrations') as r`)
  console.log(m.rows[0].r ? 'migration em aurea: aplicada' : 'migration em aurea: NÃO aplicada')
} catch (e) { console.log('conexão FALHOU:', e.message) } finally { await c.end().catch(() => {}); process.exit(0) }
```

```bash
cd C:/dev/AureaCustodiaMVP-banco && node .db-check.tmp.mjs; rm -f .db-check.tmp.mjs
```

Resultado de hoje (03/09): DNS ok, pooler responde, **senha recusada**.

## 6.3 Migration local e de produção

```bash
cd C:/dev/AureaCustodiaMVP-banco && npm run db:migrate
```

Lê `AUREA_DB_SCHEMA` do `.env.local`. Para produção, sobrescreva na linha:

```bash
cd C:/dev/AureaCustodiaMVP-banco && AUREA_DB_SCHEMA=aurea npm run db:migrate
```

No PowerShell: `$env:AUREA_DB_SCHEMA="aurea"; npm run db:migrate`. Idempotente: a segunda
execução imprime `= 001_inicial (já aplicada)`.

## 6.4 Suíte contra o banco real

```bash
cd C:/dev/AureaCustodiaMVP-banco && AUREA_DB_TEST_URL="postgresql://postgres.PROJETO:SENHA@aws-0-sa-east-1.pooler.supabase.com:5432/postgres" npm test
```

Cria e apaga o schema `aurea_test`; não toca em `aurea` nem em `aurea_local`. Esperado:
80 passados, 0 pulados, ~15 s a mais que o normal.

## 6.5 Verificação completa da branch

```bash
cd C:/dev/AureaCustodiaMVP-banco && rm -rf .next && npm run typecheck && npm run lint && npm test && npm run build
```

## 6.6 Merge da B (a primeira da fila)

Só depois da Fase 1, passos 1 a 4.

```bash
cd C:/dev/AureaCustodiaMVP && git checkout main && git pull --ff-only && git merge --no-ff feat/banco-supabase -m "Merge feat/banco-supabase: estado em tabelas no Supabase (M1)" && npm run typecheck && npm test && npm run build && git push origin main
```

Se qualquer verificação falhar, o `&&` para antes do push. Sem conflito previsto: a
simulação com `git merge-tree` foi limpa.

## 6.7 Verificar produção depois do deploy

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://aurea-custodia-mvp.vercel.app/
```

Esperado `200`. Depois, login manual e painel. Logs:

```bash
vercel logs https://aurea-custodia-mvp.vercel.app
```
