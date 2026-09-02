# Prompt — Sessão B-2 · Limpeza depois de a produção rodar sobre tabelas

> Copie o bloco abaixo inteiro como primeira mensagem de um chat dedicado. **Só abra
> depois que** a produção estiver rodando sobre as tabelas do Supabase há alguns dias sem
> incidente (Fase 1 de `docs/EXECUCAO_BRANCH_B_O_QUE_FALTA.md` concluída) e as frentes A e
> C já tiverem sido mergeadas.

---

Você vai trabalhar no repositório da **Áurea Custódia / Real Olímpico**, numa branch nova
`chore/remover-blob` a partir do `main`, fechando o módulo M1: o estado já vive em tabelas
no Supabase e o caminho antigo do blob JSON precisa sair do código.

## Leia nesta ordem, antes de editar

1. `CLAUDE.md` (raiz)
2. `docs/EXECUCAO_BRANCH_B_O_QUE_FALTA.md` — **seções 3.3, 2.6, 2.7 e Fase 2**
3. `src/server/db/README.md`, `src/server/db/ATALHOS.md` (RA-13.e), `src/server/store/README.md`
4. `src/server/state.ts` — os dois ramos de `getState`/`mutateState`
5. `RISCOS_ASSUMIDOS.md`, RA-08 e RA-13

## O que fazer, nesta ordem, um commit por item, `npm test` entre cada

1. **Documentação antes do código.** Corrigir nos READMEs de `db/` e `store/` a frase
   "rede de segurança": sem `POSTGRES_URL` o app cai em Redis ou memória, nunca no blob
   Postgres, e o rollback de produção é o Instant Rollback da Vercel. Atualizar o plano do
   M1 em `docs/EXECUCAO_POR_MODULO.md` para bater com o que foi entregue (sem
   `schema.sql`; `actions/*` intocadas; repositórios `account.ts` e `seq.ts`).
2. `package.json`: `engines.node` para `>=20.12` (o `db:migrate` usa `process.loadEnvFile`).
3. **Remover o blob:** apagar `src/server/store/` inteira, o ramo sem banco de
   `state.ts` (que passa a exigir `POSTGRES_URL` e a falhar com mensagem clara sem ela),
   `STORE_KEY` em `src/domain/constants.ts` e `AUREA_STORE_KEY` do `.env.example`.
   `npm run dev` sem banco deixa de funcionar — documentar no ritual de sessão que o
   `.env.local` precisa de `POSTGRES_URL` + `AUREA_DB_SCHEMA=aurea_local`.
4. **Migration `003_limpeza.sql`:** `DROP TABLE IF EXISTS aurea.aurea_state`. Se a frente A
   já tiver fechado o RA-02, também `ALTER TABLE aurea.users DROP COLUMN pass` e a remoção
   de `User.pass` em `types.ts` — **pare e confirme com o Gabriel antes**, é superfície
   protegida.
5. **Registro:** RA-13.e pago e RA-08 encerrado em `RISCOS_ASSUMIDOS.md`; `ATALHOS.md`
   de `src/server/db/` e de `src/server/`; catálogo 4.1 completo; entrada nova no
   `VERSION_COMPARISON_DAILY.md`.
6. `rm -rf .next && npm run typecheck && npm run lint && npm test && npm run build`.

## Regras que valem sempre

- `AUREA_DB_SCHEMA` continua sendo o que separa local de produção — não invente outro mecanismo
- Tudo no schema `aurea`, RLS ligada; nada em `public`
- Dinheiro em centavos inteiros
- Nenhuma credencial em commit
- Comentários em português explicando o porquê
- Superfície protegida (`types.ts`, `constants.ts`, `fees.ts`, `market.ts`, Server Actions): parar e confirmar antes de mudar comportamento
