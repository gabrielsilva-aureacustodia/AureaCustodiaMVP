# Prompt — Sessão C-3 · Integração de pagamentos e rastreio no `main`

> Copie o bloco abaixo inteiro como primeira mensagem de um chat dedicado. **Só abra
> depois que** (1) `feat/banco-supabase` estiver no `main` e a produção rodando sobre
> tabelas, (2) a sessão C-2 estiver commitada e a branch C rebaseada e mergeada, e
> (3) `MP_ACCESS_TOKEN_TEST` e `MP_WEBHOOK_SECRET` existirem no ambiente Preview da
> Vercel e no `.env.local`.

---

Você vai trabalhar no repositório da **Áurea Custódia / Real Olímpico**, numa branch nova
`feat/pagamentos-integracao` a partir do `main`, ligando as bibliotecas da frente C ao
estado da plataforma. O contrato de propriedade de `docs/FRENTES_PARALELAS.md` **já
terminou** (as três frentes foram mergeadas); vale de novo a regra normal do `CLAUDE.md`:
superfície protegida exige parada e confirmação.

## Leia nesta ordem, antes de editar

1. `CLAUDE.md` (raiz)
2. `docs/EXECUCAO_BRANCH_C_O_QUE_FALTA.md` — **seções 2.1 (etapa 2), 2.2, 2.5, 2.7, 4 e
   6.4 a 6.6**. A seção 4 é o desenho que você implementa
3. `src/server/db/README.md`, `repositories/README.md`, `migrations/README.md` e
   `ATALHOS.md` — o padrão da camada de banco (Consulta, Executor, `nomeDoSchema()`,
   `num()`)
4. `src/server/db/estado.ts` e `src/server/state.ts` — como `mutateState` grava o diff
5. `src/server/actions/account.ts` — o `deposit()` atual é o que o webhook passa a fazer
6. `RISCOS_ASSUMIDOS.md`, RA-01, RA-07 e RA-14

## O que fazer, nesta ordem, um commit por item, `npm test` entre cada

1. **Migration `002_pagamentos_rastreio.sql`** com `payment_events`, `payment_intents`
   e `rastreios`, exatamente como a seção 4.1, RLS nas três. Teste em `db.test.ts`
   (PGlite): a migration aplica sobre a `001`, nenhuma tabela em `public`.
2. **Repositórios** `src/server/db/repositories/payments.ts` e `rastreios.ts`.
   `reivindicarEvento` é `INSERT … ON CONFLICT DO NOTHING RETURNING`. Teste com **duas
   conexões** reivindicando o mesmo `event_id`: uma só recebe `true`.
3. **Adaptador Postgres da idempotência** em `src/lib/payments/idempotencia.ts`;
   `repositorioIdempotencia()` devolve o Postgres quando `bancoConfigurado()`.
4. **Server Action `src/server/actions/payments.ts`**: `iniciarDeposito(valorCents,
   metodo)` — validações idênticas ao `deposit()` (inteiro, positivo, `DEPOSITO_MAX`),
   `external_reference` = `DEP-<ulid ou uuid>`, grava a intenção, chama o gateway,
   devolve QR/link. **Não credita.** Mensagem de erro clara quando o Mercado Pago não está
   configurado.
5. **Webhook credita**, seguindo o fluxo 4.2 à risca: status `approved` consultado no
   gateway, valor conferido contra a intenção, reivindicação atômica da intenção,
   `mutateState` com o mesmo código de `deposit()`, intenção `creditado`. Responder 200
   antes de processar com `after()` de `next/server` se a versão instalada o tiver
   estável; senão, manter síncrono e **atualizar o RA-14.e**.
6. **Cron**: bloco `crons` diário no `vercel.json`; a rota lê `getState().envios`,
   chama `atualizarRastreiosEmLote`, faz upsert em `rastreios`. Teste da rota com o
   repositório mockado.
7. **Telas**, na ordem: `ModalDeposito` com Pix (QR na modal) e Checkout Pro (nova
   aba), texto de ambiente de teste, sem crédito no retorno; `/envios` mostrando o
   último rastreio. **Pare antes** do campo modalidade/CEP no wizard: ele exige
   `modalidade` em `Envio` (`types.ts`) e coluna em `envios` — descreva a mudança e
   espere o Gabriel confirmar.
8. **Registro**: RA-14 atualizado (a e d pagos, e conforme o passo 5), `ATALHOS.md` de
   `src/lib/payments/` e `src/server/db/`, `.env.example` se surgir variável nova,
   `docs/CATALOGO_DE_FEATURES.md` 4.4 e 4.5, entrada nova no
   `VERSION_COMPARISON_DAILY.md`.
9. **Prova em sandbox**: siga os tutoriais 6.4, 6.5 e 6.6 no Preview da Vercel e cole
   no relatório final os três resultados: Pix creditado uma vez após três notificações,
   Checkout Pro aprovado, cron respondendo com os códigos pendentes.
10. `rm -rf .next && npm run typecheck && npm run lint && npm test && npm run build`.

## Travas inegociáveis

- **Sandbox somente.** `MP_SANDBOX` nunca `false`; token de produção nunca. RA-01
- Saldo só se move no processamento do webhook, nunca no retorno da tela
- Nunca confiar no payload do webhook para valor ou status: sempre consultar o gateway
- Nenhum dado de cartão no servidor; Checkout Pro é hospedado
- Dinheiro em centavos inteiros
- Tabelas só no schema `aurea`, RLS ligada
- Nada de `@/server/*` em Client Component
- Nenhuma credencial em commit
- Superfície protegida (`types.ts`, `constants.ts`, `fees.ts`, `market.ts`, Server
  Actions existentes): parar e confirmar antes de mudar comportamento
- Comentários em português explicando o porquê; toda pasta nova com `README.md`
