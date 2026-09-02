# Prompt — Agente B-2 · Limpeza pós-produção do banco (passo 9 do M1)

> Copie o bloco abaixo inteiro como primeira mensagem do chat dedicado a esta sessão.
>
> ⚠️ **Só abra esta frente depois de a produção rodar sobre tabelas por pelo menos uma
> semana, sem incidente.** Antes disso, o que esta sessão remove ainda é o caminho de volta.

---

Você vai trabalhar no repositório da **Áurea Custódia / Real Olímpico**
(`C:\dev\AureaCustodiaMVP`), fechando o **passo 9 do módulo M1**: remover o blob JSON que a
migração para tabelas deixou para trás.

## Antes de escrever qualquer linha, leia nesta ordem

1. **`CLAUDE.md`** (raiz) — as regras. Carregado automaticamente
2. **`docs/CUTOVER_BANCO_PRODUCAO.md`** — como a produção chegou onde está
3. **`docs/HANDOFF_FRENTE_B_BANCO.md`** — o que a frente B entregou
4. **`src/server/db/README.md`** e **`src/server/db/ATALHOS.md`** — em especial o RA-13
5. **`RISCOS_ASSUMIDOS.md`**, RA-13 e RA-08

## Confirme ANTES de remover qualquer coisa

Nenhum destes é opcional:

- [ ] A produção roda sobre tabelas há pelo menos uma semana, sem incidente
- [ ] `npm run db:check` em produção (`AUREA_DB_SCHEMA=aurea`) responde `Pronto para uso.`
- [ ] Ninguém precisou de Instant Rollback desde a virada
- [ ] O `AUREA_DB_TEST_URL` já rodou verde ao menos uma vez (critério de concorrência)

Faltando qualquer um, **pare e diga ao Gabriel**. Remover o caminho antigo é irreversível
na prática: depois disso, voltar exige um deploy antigo E o dado que estava no blob.

## O que fazer, em ordem, com `npm test` entre cada passo

### 1. Remover o motor antigo

- `src/server/store/` inteira
- Em `src/server/state.ts`: o ramo que chama `getStore()`, o `import` correspondente e a
  função `garantirFormato()` — ela normaliza documentos do blob e deixa de ter sentido
- `STORE_KEY` em `src/domain/constants.ts`
- `AUREA_STORE_KEY` no `.env.example` e em toda a documentação que a cita
- `src/server/README.md`: a linha de `store/` na tabela de arquivos

**Atenção:** sem `POSTGRES_URL`, a aplicação passa a **não subir**. Isso é uma mudança de
comportamento real — `npm run dev` sem banco deixa de funcionar. Decida com o Gabriel entre
(a) exigir o banco sempre, com mensagem de erro clara, ou (b) manter só o store de memória
para desenvolvimento. **Não escolha sozinho.**

### 2. Migration de limpeza

Crie `src/server/db/migrations/003_limpeza.sql` (a `002` é da frente C — confira antes se
ela já existe e ajuste o número):

- `DROP TABLE IF EXISTS aurea.aurea_state`
- Se a frente A já tiver fechado o **RA-02** (senhas em texto puro): `ALTER TABLE
  aurea.users DROP COLUMN pass`, mais a remoção de `User.pass` em `src/domain/types.ts` e
  do campo em `src/server/db/repositories/users.ts` e `diff.ts`

Siga o padrão de `src/server/db/migrations/README.md`: **nunca edite uma migration já
aplicada**, sempre uma nova.

### 3. Atualizar os registros

- `RISCOS_ASSUMIDOS.md`: RA-13.e passa a pago; RA-08 idem, com a data
- `src/server/db/ATALHOS.md`: mesma coisa
- `docs/diario/VERSION_COMPARISON_DAILY.md`: entrada nova, **append-only**
- `docs/CATALOGO_DE_FEATURES.md`: a linha "Remoção de `src/server/store/`" do item 4.1

## O que NÃO fazer

- ❌ Remover antes de confirmar a lista acima
- ❌ Editar uma migration já aplicada
- ❌ Mudar a assinatura de `getState()`/`mutateState()` — as frentes A e C dependem dela
- ❌ Encostar em `matchOrders`, `fees.ts` ou `constants.ts` além da remoção de `STORE_KEY`
- ❌ Decidir sozinho o comportamento sem `POSTGRES_URL` (passo 1)

## Fora do escopo desta sessão, mas registrado

- **RA-13.a** (trava por livro de ordens em vez de fila única) e **RA-13.b** (leituras
  recortadas em vez do estado inteiro): só fazem sentido com volume. Não faça agora
- **CD-09** (o extrato ler `t.fee`): depende do "sim" dos sócios, não da limpeza

## Regras que valem sempre

- Antes de commitar: `npm run typecheck`, `npm test`, `npm run build`
- **Todo atalho** vai para `RISCOS_ASSUMIDOS.md` **e** o `ATALHOS.md` da pasta, no mesmo commit
- **Repositório público de propósito.** Nenhuma credencial em commit
- Comentários em português, explicando o **porquê**
- Trabalhe num worktree próprio, para não atropelar outra frente:
  `git worktree add ../AureaCustodiaMVP-b2 -b feat/limpeza-store`
