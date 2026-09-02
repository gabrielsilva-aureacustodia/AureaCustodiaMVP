# Handoff — Frente B · Banco de dados e backend (módulo M1)

**O que foi entregue, o que falta, e o que o Gabriel precisa fazer**

```
Escrito em: 02/09/2026
Branch:     feat/banco-supabase (worktree em C:\dev\AureaCustodiaMVP-banco)
Base:       main em dd38a74
Estado:     typecheck ✅ · lint ✅ · 67 testes ✅ (1 pulado) · build ✅
```

---

# Em uma frase, para o Rogério

O estado da plataforma — contas, saldos, moedas, anúncios, negociações, envios — **deixou de
ser um único arquivo JSON e passou a ser dez tabelas num banco de verdade**, com a regra de
"quem chega segundo espera o primeiro terminar" garantida pelo banco, e sem mexer na regra
de negócio que decide quem compra de quem.

---

# O que está pronto

## A camada `src/server/db/` (nova)

| Arquivo | Papel |
|---|---|
| `migrations/001_inicial.sql` | As 10 tabelas no schema `aurea`, chaves estrangeiras, `CHECK`s, índices, a linha única de `seq`, RLS em todas |
| `client.ts` | Pool `pg` por processo, TLS, transações. **Único arquivo com `server-only`** |
| `sql.ts` | `Consulta`, `Executor`, `nomeDoSchema()`, `num()` |
| `estado.ts` | `lerEstado` / `mutarEstado`: trava → carrega → muta → grava o diff → commit |
| `diff.ts` | Planejador puro: dois `AppState` entram, a lista de operações sai, na ordem das FKs |
| `migrar.ts` | Aplicador de migrations usado pelos testes |
| `repositories/` | `users`, `coins` (+`nfts`), `offers`, `trades`, `envios`, `account`, `seq`, `state` |
| `diff.test.ts` | 16 testes, sem banco |
| `db.test.ts` | 13 testes contra um Postgres real embutido (PGlite): migration, RLS, semeadura, ida e volta, compra simultânea, envios simultâneos, wizard, ordens, rollback |
| `README.md`, `ATALHOS.md`, `repositories/README.md`, `migrations/README.md` | Documentação da pasta |

## O que mudou fora dela

| Arquivo | Mudança |
|---|---|
| `src/server/state.ts` | `getState()`/`mutateState()` — **assinatura preservada** — usam as tabelas quando há `POSTGRES_URL`; sem ela, o `store/` antigo |
| `src/domain/types.ts` | `Trade.fee?: Cents` (opcional, aditivo) — a comissão congelada. **Pede ratificação dos sócios** |
| `scripts/db-migrate.mjs` + `scripts/README.md` | `npm run db:migrate` aplica as migrations no Supabase |
| `package.json` | script `db:migrate`; devDependency `@electric-sql/pglite` |
| `.env.example` | `POSTGRES_URL_DIRECT`, `AUREA_DB_SCHEMA`, `AUREA_DB_TEST_URL` documentadas |
| `vitest.config.mts` | Comentário atualizado: `src/server/db/` agora tem testes |
| `RISCOS_ASSUMIDOS.md` | RA-13 (novo), atualizações em RA-04, RA-06, RA-08 e **RA-12 subiu para 🔴** |
| `src/server/README.md`, `src/server/ATALHOS.md`, `src/server/store/README.md`, `src/domain/ATALHOS.md` | Notas sobre a nova camada e o que ela paga |
| `docs/PROXIMOS_PASSOS_SUPABASE.md` | **Senha removida do texto** (ver abaixo) |
| `docs/CATALOGO_DE_FEATURES.md` | 4.1 marcada como entregue na branch |
| `docs/diario/VERSION_COMPARISON_DAILY.md` | Entrada 003 acrescentada |
| `docs/diario/RITUAL_DE_SESSAO.md` | Passo do `db:migrate` e as variáveis novas |
| `docs/README.md` | Este documento no índice |

## O que NÃO mudou (e era obrigação não mudar)

- `src/domain/market.ts`, `fees.ts`, `constants.ts` — o motor e as taxas, intocados
- As assinaturas de `getState()` e `mutateState()`
- `src/server/actions/*` — **nenhuma linha**. As ações continuam chamando `mutateState`, e é
  a camada por baixo que mudou. Isso é o contrato das frentes funcionando
- `src/server/actions/auth.ts`, `src/server/session.ts` — da frente A, não tocados
- `src/app/`, `src/components/` — não são da frente B

---

# 🔴 O achado que precisa de ação antes de tudo

**A senha do banco está no histórico público do GitHub.** O commit `0a7d517` ("Documenta os
proximos passos com a senha rotacionada do Supabase") gravou `docs/PROXIMOS_PASSOS_SUPABASE.md`
com a senha nova em texto puro, dentro das duas connection strings, e foi enviado ao
`origin`. O repositório é público de propósito (RA-11) — logo a senha é pública.

O que a frente B fez: removeu a senha do arquivo atual e registrou o agravamento no RA-12.
O que ela **não** fez, e não devia fazer sozinha: reescrever o histórico do git.

**O que resolve é a rotação, não a limpeza do histórico** (a senha já pode ter sido copiada):

1. Supabase → Settings → Database → **Reset database password** → *Generate a password*
2. Vercel → `POSTGRES_URL` e `POSTGRES_URL_DIRECT` com a senha nova (sem codificação, é só
   letras e números)
3. `.env.local` com as mesmas duas linhas
4. Redeploy

---

# 👤 O que o Gabriel precisa fazer, na ordem

## 1. Rotacionar a senha (acima) — 3 minutos

## 2. Atualizar o `.env.local` — 1 minuto

O arquivo local ainda tem uma senha antiga: a conexão falhou com "password authentication
failed" nesta sessão. Com a senha nova:

```
POSTGRES_URL="postgresql://postgres.vjbqikfamqdttbmaqrxf:SENHA_NOVA@aws-0-sa-east-1.pooler.supabase.com:6543/postgres"
POSTGRES_URL_DIRECT="postgresql://postgres.vjbqikfamqdttbmaqrxf:SENHA_NOVA@aws-0-sa-east-1.pooler.supabase.com:5432/postgres"
# Gaveta separada para o ambiente local — não mexe no estado dos sócios
AUREA_DB_SCHEMA="aurea_local"
```

`AUREA_STORE_KEY` pode continuar; ela só vale para o caminho antigo (sem `POSTGRES_URL`).

## 3. Aplicar a migration — 30 segundos

Na pasta da branch B:

```bash
npm run db:migrate
```

Saída esperada: `+ 001_inicial`, o host, o schema e `✓ nenhuma tabela em public`. Com
`AUREA_DB_SCHEMA="aurea_local"` ele cria a gaveta local. **Para produção**, rode uma vez
**sem** essa variável (ou com `AUREA_DB_SCHEMA=aurea`) — é o schema que a Vercel vai usar.

## 4. Provar o `FOR UPDATE` contra o banco real — 1 minuto

```bash
AUREA_DB_TEST_URL="postgresql://postgres.vjbqikfamqdttbmaqrxf:SENHA_NOVA@aws-0-sa-east-1.pooler.supabase.com:5432/postgres" npm test
```

(No PowerShell: `$env:AUREA_DB_TEST_URL="..."; npm test`.) A suíte roda **também** contra o
Supabase, num schema `aurea_test` que ela cria e apaga. É o teste com duas conexões de
verdade — o que o PGlite não prova. Deve terminar com 80 testes verdes, 0 pulados.

## 5. Subir localmente e clicar — 2 minutos

```bash
npm run dev
```

Entrar com `gabrielsilva@testeaurea.com.br` / `12345678`. A primeira requisição semeia as 7
contas na gaveta `aurea_local`. Conferir: painel com saldo e moedas, publicar um anúncio,
comprar com outra conta, abrir o extrato.

## 6. Merge e produção

- `feat/banco-supabase` é a **primeira** a entrar no `main` (ordem de merge do
  `FRENTES_PARALELAS.md`). As frentes A e C fazem rebase depois.
- Confirmar na Vercel que `POSTGRES_URL` está com valor de **uma linha só** começando com
  `postgresql://` — o defeito anterior foi colar o bloco de parâmetros.
- No primeiro deploy sobre tabelas, a produção **recomeça do seed** (saldos, anúncios e
  senhas trocadas voltam ao início). É o custo previsto no RA-08.

## 7. Depois que a produção rodar sobre tabelas

Abrir uma sessão para o passo 9 do M1: remover `src/server/store/`, o ramo antigo de
`state.ts`, `STORE_KEY` e `AUREA_STORE_KEY`. Está anotado como RA-13.e.

---

# Decisões que pedem o "sim" dos sócios

| Decisão | O que foi feito | Se discordarem |
|---|---|---|
| `Trade.fee?` em `types.ts` | Campo opcional, aditivo; não muda comportamento | Uma linha a reverter |
| Extrato ler `fee` (CD-09) | **Não feito.** O dado está gravado; `statement.ts` ainda recalcula | — |
| Fila única de escrita | Mesma garantia do blob; trava por livro fica para quando houver volume | — |

---

# Como verificar que está tudo certo, sem confiar em mim

```bash
npm run typecheck     # sem erro
npm run lint          # sem erro
npm test              # 67 passados, 1 pulado (o bloco de banco real, sem URL)
npm run build         # verde
```

E, com o banco:

```bash
npm run db:migrate    # "+ 001_inicial" na primeira vez, "= 001_inicial (já aplicada)" depois
```

---

# Por que ficou assim (as três escolhas que explicam o desenho)

1. **Diff, não reescrita.** O blob gravava o documento inteiro; as tabelas gravam só o que
   mudou. Uma compra vira: apaga 1 oferta, atualiza 2 usuários, move 1 moeda, insere 1
   negociação. É o que dá para auditar linha a linha.
2. **A trava é uma linha de `seq`.** Não é sofisticado, e é exatamente a garantia que o blob
   tinha — só que agora sobre tabelas normalizadas. Refinar por livro de ordens é
   otimização, não correção.
3. **Testar contra Postgres de verdade, sem infraestrutura.** O PGlite roda o Postgres dentro
   do Vitest. A migration que os testes aplicam é o mesmo arquivo que vai para o Supabase —
   se a SQL estivesse errada, o teste teria quebrado aqui, não em produção.

---

# Nota sobre a sessão

Outro agente (frente A) estava editando na pasta `C:\dev\AureaCustodiaMVP` ao mesmo tempo. A
frente B foi feita num **git worktree** separado (`C:\dev\AureaCustodiaMVP-banco`) para não
atropelar — e é assim que recomendo abrir as frentes daqui em diante: um worktree por
branch, não uma pasta só trocando de branch.

```bash
git worktree add ../AureaCustodiaMVP-auth feat/auth-landing
git worktree add ../AureaCustodiaMVP-pagamentos feat/pagamentos-correios
```
