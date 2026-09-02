# Execução pós-frentes paralelas — o que está pronto e o que falta

**Auditoria das três branches abertas em 02/09/2026 e o plano de execução do que resta**

```
Escrito em:  03/09/2026 (véspera: 02/09 os agentes A, B e C entregaram)
Base:        main em dd38a74
Branches:    feat/auth-landing (A) · feat/banco-supabase (B) · feat/pagamentos-correios (C)
Método:      leitura dos diffs contra main, dos relatórios de cada frente e
             execução de typecheck, lint, testes e build em cada branch
```

> Este documento substitui a pergunta "onde paramos?" das três frentes. Ele não
> repete o que os relatórios de cada frente já dizem; aponta o que **confere**, o
> que **não confere** e o que **falta**, em ordem de execução.

---

# Em uma frase, para o Rogério

As três frentes construíram o que prometeram e o código compila e passa nos testes
em todas elas; **mas nenhuma está ligada às outras nem em produção**, e a junção
tem quatro pontos que, se feitos fora de ordem, deixam os sócios sem conseguir entrar
na plataforma ou creditam um depósito duas vezes.

---

# 1. O placar

## 1.1 Verificação executada nesta auditoria

| Branch | Commits sobre `main` | Publicada no `origin` | typecheck | lint | testes | build |
|---|---|---|---|---|---|---|
| **A** `feat/auth-landing` | 1 (`0e2f1f4`) | ✅ | ✅ | ✅ | 38/38 | ✅ |
| **B** `feat/banco-supabase` | 1 (`119aff8`) | ❌ **só local** | ✅ | ✅ | 67 passam, 1 pulado | ✅ |
| **C** `feat/pagamentos-correios` | 2 (`98a79da`, `49f0c24`) | ✅ | ✅ | ✅ | 67/67 | ✅ |

O teste pulado da B é o bloco que roda contra o Supabase real e depende de
`AUREA_DB_TEST_URL` — é esperado.

## 1.2 Simulação da ordem de merge

Simulado com `git merge-tree` na ordem do `FRENTES_PARALELAS.md`:

| Passo | Resultado |
|---|---|
| B sobre `main` | Sem conflito |
| A sobre `main + B` | Sem conflito |
| C sobre `main + B` | **1 conflito**: `docs/diario/VERSION_COMPARISON_DAILY.md` — B e C criaram cada uma a "Entrada 003" |

`RISCOS_ASSUMIDOS.md` e `docs/CATALOGO_DE_FEATURES.md` foram tocados por B e C, mas
em trechos diferentes; o git junta sozinho. A correção do conflito é renumerar a
entrada da C para **004** no rebase.

## 1.3 O que cada frente entregou de fato

### 🅰️ Frente A — pronto

- Landing pública em `/`, login movido para `/entrar`, cadastro em `/cadastrar`.
- Redirects do `(app)/layout.tsx` e de `page.tsx` trocados **no mesmo commit** — sem laço.
- Login, cadastro por e-mail com confirmação e Google OAuth com PKCE via Supabase Auth,
  tudo no servidor (`src/server/auth/`).
- Aceite de Termos e Política gravado com versão e data no metadata da identidade.
- Cadastro **fechado por padrão** em duas camadas (tela e Server Action); só abre com
  cinco variáveis de ambiente preenchidas.
- README em toda pasta nova. Nenhum Client Component importa `@/server/*`.

### 🅱️ Frente B — pronto

- Dez tabelas no schema `aurea`, RLS em todas, `fee bigint` em `trades`.
- `getState()`/`mutateState()` com assinatura preservada; com `POSTGRES_URL` usam as
  tabelas, sem ela usam o `store/` antigo.
- Motor `matchOrders` intocado; os 38 testes originais passam sem alteração.
- 29 testes novos, 13 deles contra um Postgres real embutido (PGlite), cobrindo compra
  simultânea, envios simultâneos e rollback.
- `npm run db:migrate`, `.env.example`, READMEs, `ATALHOS.md`, RA-13 registrado.

### 🅲 Frente C — pronto

- `src/lib/payments/`: Checkout Pro e Pix em centavos, verificação HMAC do webhook com
  `timingSafeEqual` e janela de replay, controle de idempotência.
- `src/lib/shipping/`: PAC/SEDEX como tipo fechado, carta comum irrepresentável,
  declaração fixa "Moeda comemorativa / colecionável", rastreio em lote, CEP sem
  histórico.
- Rotas `/api/webhooks/mercadopago` e `/api/cron/shipping`.
- 29 testes novos. READMEs e `ATALHOS.md` nas duas bibliotecas.

---

# 2. Os quatro achados que mudam o plano

Estes não estão nos relatórios das frentes, ou estão descritos de forma mais otimista
do que o código sustenta.

## 🔴 2.1 Depois do merge da A, ninguém consegue entrar

O login novo (`src/server/actions/auth.ts`) vai **só** ao Supabase Auth. Não há
caminho de contingência para as sete contas do seed. Hoje:

- `.env.local` não tem `SUPABASE_URL` nem chave publicável → localmente o login
  responde "autenticação ainda não configurada".
- A Vercel também não tem essas variáveis.
- Mesmo com as variáveis, o Supabase Auth **não tem nenhum usuário**. E as contas do
  seed usam `@testeaurea.com.br`, que não recebe e-mail de confirmação.
- E ainda: `authorizeProvisionedUser` exige que o e-mail autenticado exista em
  `state.users`. Se as contas forem recriadas com os e-mails reais dos sócios (decisão
  registrada pela A), o **seed precisa mudar para os e-mails reais** — e `seed.ts` é da
  frente B.

**Consequência:** a A não pode ir para o `main` antes de (a) Supabase Auth configurado,
(b) sete usuários criados e confirmados lá, (c) seed alinhado com esses e-mails. Ver
Fase 2.

## 🔴 2.2 A idempotência do webhook é em memória — não sobrevive à Vercel

`src/lib/payments/idempotencia.ts` guarda os eventos num `Map` do processo. Em
serverless cada instância e cada cold start começam com o mapa vazio: **dois reenvios
do Mercado Pago que caírem em instâncias diferentes passam os dois**. O relatório da C
diz "RA-07 pago"; o que está pago é o teste unitário, não o risco. A trava real precisa
de uma tabela com o id do evento como chave única — e tabela é da frente B (schema).

## 🔴 2.3 A branch B existe só nesta máquina

`feat/banco-supabase` não foi enviada ao `origin`. É a fundação das outras duas e está
num único disco. Primeiro comando da Fase 0.

## 🟠 2.4 O cron de rastreio não está agendado e não faz nada

`vercel.json` não tem bloco `crons`; a rota `/api/cron/shipping` recebe uma lista
vazia de códigos (comentário "a serem integrados com o repositório de envios"). Está
correto como esqueleto, mas o critério "rastreio atualiza por job agendado" **não**
está atendido ainda.

---

# 3. O que falta, frente por frente

Legenda: ⏳ falta · 👤 depende do Gabriel (conta, credencial, decisão) · 🤝 depende de outra frente

## 🅰️ Frente A

| # | Item | Tipo |
|---|---|---|
| A1 | Registrar o que a frente assumiu: **não tocou `RISCOS_ASSUMIDOS.md`**, não criou `src/server/auth/ATALHOS.md`, não marcou nada no `CATALOGO_DE_FEATURES.md`. O critério do M2 exige RA-02 marcado como pago — e ele **não pode** ser marcado ainda (ver A3) | ⏳ |
| A2 | Decidir o destino do relatório expandido **não commitado** em `docs/ENTREGA_AUTH_LANDING.md` no worktree temporário `%TEMP%\aurea-auth-report-codex` (298 linhas contra 150 commitadas). Pasta temporária pode ser apagada pelo sistema | ⏳ |
| A3 | RA-02 continua meio aberto: `account.ts` (troca de senha) ainda grava `user.pass` e lê `ACCOUNTS`. Trocar senha na tela agora não afeta o login. Precisa virar `updateUser` do Supabase ou sair da tela. `account.ts` é da B e `types.ts` (campo `pass`) também | 🤝 B |
| A4 | Alinhar o seed com os e-mails reais dos sócios (ou decidir criar os usuários do Supabase com os e-mails `@testeaurea.com.br` e confirmá-los à mão no painel, sem e-mail) | 👤 + 🤝 B |
| A5 | Configurar Supabase Auth: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` em Development, Preview e Production; autorizar `https://<domínio>/entrar/callback` | 👤 |
| A6 | Google OAuth: credencial no Google Cloud, provedor habilitado no Supabase | 👤 |
| A7 | Resend: SMTP customizado no Supabase, template "Confirm signup" com `token_hash`, tracking de link desligado | 👤 |
| A8 | Termos de Uso e Política de Privacidade (RA-03): documentos, aprovação dos sócios, URLs públicas, versões nas variáveis. **Até lá o cadastro fica fechado** | 👤 |
| A9 | Criar as sete contas reais no Supabase Auth, confirmar cada e-mail, testar login/recarga/logout/`/inicio` por conta | 👤 |

## 🅱️ Frente B

| # | Item | Tipo |
|---|---|---|
| B1 | `git push -u origin feat/banco-supabase` | ⏳ |
| B2 | Conferir que `POSTGRES_URL` e `POSTGRES_URL_DIRECT` do `.env.local` autenticam (a frente B relatou "password authentication failed" na sessão dela); acrescentar `AUREA_DB_SCHEMA="aurea_local"` no `.env.local`. A questão da senha no histórico fica registrada no RA-12 e é decisão do Gabriel deixar para a fase de cliente real | 👤 |
| B3 | `npm run db:migrate` — uma vez com `AUREA_DB_SCHEMA=aurea_local` (ambiente local) e uma vez sem (produção, schema `aurea`). Saída esperada: `+ 001_inicial` e `✓ nenhuma tabela em public` | 👤 |
| B4 | Provar o `FOR UPDATE` contra o Supabase: `AUREA_DB_TEST_URL=… npm test` → 80 testes, 0 pulados | 👤 |
| B5 | `npm run dev` e clicar: login com conta do seed, painel, anúncio, compra com outra conta, extrato | 👤 |
| B6 | **Atenção na ordem local:** `.env.local` já tem `POSTGRES_URL`. Assim que a B entrar no `main`, o `npm run dev` passa a usar tabelas — se a migration (B3) não tiver rodado, a aplicação falha ao subir. B3 vem antes de qualquer sessão sobre o `main` novo | ⏳ |
| B7 | Ratificação dos sócios: `Trade.fee?` em `types.ts` (aditivo, opcional) | 👤 |
| B8 | CD-09: extrato passar a ler `t.fee` (fecha RA-06). Uma linha em `statement.ts`, superfície protegida | 👤 |
| B9 | Passo 7 do M1: os ~30 pontos de leitura em telas passarem a receber fatias em vez do `AppState` inteiro (RA-13.b). Só depois do merge das três | ⏳ |
| B10 | Passo 9 do M1: remover `src/server/store/`, o ramo antigo de `state.ts`, `STORE_KEY` e `AUREA_STORE_KEY` (RA-13.e). Só depois de a produção rodar sobre tabelas | ⏳ |
| B11 | Novas tabelas pedidas pelas outras frentes: `payment_events` (idempotência do webhook, C), e a decisão sobre `users.pass` (A3). Só a B edita schema e `types.ts` | 🤝 A, C |

## 🅲 Frente C

| # | Item | Tipo |
|---|---|---|
| C1 | Renumerar a "Entrada 003" de `VERSION_COMPARISON_DAILY.md` para **004** no rebase sobre `main + B` (é o único conflito) | ⏳ |
| C2 | Registro honesto dos atalhos: `RISCOS_ASSUMIDOS.md` mudou só 3 linhas (o relatório diz que RA-01 e RA-07 foram atualizados; o texto do RA-07 não mudou). Falta um **RA-14** da frente C com: idempotência em memória, simulador determinístico sem credencial, webhook que aceita assinatura ausente fora de produção, cron sem agendamento | ⏳ |
| C3 | Corrigir `src/lib/shipping/ATALHOS.md`: cita a rota `/api/envios/etiqueta/[protocolo]`, que **não existe** na branch | ⏳ |
| C4 | `.env.example` não ganhou as variáveis novas: `MP_ACCESS_TOKEN_TEST`, `MP_WEBHOOK_SECRET`, `MP_SANDBOX`, `CORREIOS_TOKEN`, `CORREIOS_CARTAO_POSTAGEM`, `CRON_SECRET`, `NEXT_PUBLIC_APP_URL` | ⏳ |
| C5 | Idempotência persistente: trocar o `Map` por `aurea.payment_events` (id do evento como chave única) — depende de B11 | 🤝 B |
| C6 | Ligar o passo 7 do fluxo: webhook aprovado → `deposit()` via `mutateState` em `account.ts`, mapeando `external_reference` → e-mail do usuário. Hoje o webhook consulta o pagamento e **para**; nenhum saldo se move. E o processamento acontece **antes** da resposta 200, não depois (o prompt pedia "grava, responde, processa") | 🤝 B |
| C7 | Agendar o cron: bloco `crons` em `vercel.json` apontando para `/api/cron/shipping`; a rota ler os códigos pendentes do repositório de envios e gravar o último estado | 🤝 B |
| C8 | Telas: `src/app/(app)/envios/` **não foi tocada**. Falta o botão "Depositar via Mercado Pago" em `/conta`, a escolha PAC/SEDEX e o CEP na tela de envio, e a tela de saque | ⏳ |
| C9 | Saque (M5 inclui "saque reflete no ledger e no extrato"): não existe. Depende das quatro perguntas abertas abaixo | 👤 |
| C10 | Ponta a ponta em sandbox (Pix, cartão, boleto) nunca foi executado — não havia credencial. Criar conta de teste do Mercado Pago e `MP_ACCESS_TOKEN_TEST` | 👤 |
| C11 | Contrato de API dos Correios (CWS): comercial, pode levar dias. Até lá o adaptador determinístico responde | 👤 |
| C12 | E-mail com código e instruções ao solicitar envio (critério M6) — depende de e-mail transacional (Resend, A7) | 🤝 A |

### Perguntas que a C deixou abertas e ninguém respondeu

1. Como o cliente **saca**? Pix para chave dele, transferência, ou os dois?
2. Há **prazo de retenção** antes do primeiro saque?
3. **Teto de depósito por período** e de saldo acumulado? Hoje: R$ 100.000 por operação, sem limite de repetição.
4. Taxa de custódia vira **débito automático** do saldo?

Sem respostas, C8 (tela de saque) e C9 não começam.

---

# 4. Plano de execução, em ordem

Cada fase termina com `npm run typecheck`, `npm test` e `npm run build` verdes.
Uma sessão de chat por fase (ou por item, quando indicado).

## Fase 0 — Hoje, sem código (Gabriel, ~15 min)

1. `git push -u origin feat/banco-supabase` (B1).
2. Conferir a conexão local com o banco e a variável de schema (B2).
3. Apagar os quatro arquivos soltos na raiz — `AGENTE_A_LOGIN_LANDING.md`,
   `AGENTE_B_BANCO_BACKEND.md`, `AGENTE_C_PAGAMENTOS_CORREIOS.md`,
   `FRENTES_PARALELAS.md`. São **cópias idênticas** de `docs/prompts/*` e de
   `docs/FRENTES_PARALELAS.md`, não estão versionados e só confundem.
4. Decidir A2 (relatório expandido da A: commitar ou descartar) e A4 (e-mails reais ×
   `@testeaurea.com.br` confirmados à mão).
5. Criar a conta de teste do Mercado Pago (C10) — é rápido e destrava a Fase 4.

## Fase 1 — B entra no `main` (1 sessão)

1. `npm run db:migrate` local e produção (B3). Antes de qualquer `npm run dev` sobre o
   `main` novo (B6).
2. `AUREA_DB_TEST_URL=… npm test` (B4) e o passeio manual (B5).
3. Merge de `feat/banco-supabase` em `main`, deploy, confirmar na Vercel que
   `POSTGRES_URL` tem uma linha só. A produção **recomeça do seed** (RA-08, previsto).
4. Registrar no `VERSION_COMPARISON_DAILY.md` que a Entrada 003 é a B.

## Fase 2 — A entra no `main` (2 sessões: uma de código, uma de configuração)

**Sessão de código (frente A + pedido à B):**

1. Rebase de `feat/auth-landing` sobre `main`.
2. A1: RA de aceite/registro da frente A em `RISCOS_ASSUMIDOS.md` e
   `src/server/auth/ATALHOS.md`; marcar 4.2/4.3 no catálogo.
3. A4 com a B: seed com os e-mails reais **ou** manter os fictícios. Uma decisão, um
   commit em `seed.ts`.
4. A3: retirar a troca de senha local de `account.ts` (ou apontá-la ao Supabase) e
   planejar a remoção de `pass`/`ACCOUNTS` (rotação de `AUREA_STORE_KEY` não se aplica
   mais — com tabelas, é migration `002`).

**Sessão de configuração (Gabriel, com o roteiro de `docs/ENTREGA_AUTH_LANDING.md`):**

5. A5, A6, A7 — Supabase Auth, Google, Resend.
6. A9 — sete contas criadas e confirmadas; login testado conta a conta **em Preview**.
7. Só então merge em `main`. Antes disso o `main` continua com o login antigo, que funciona.

RA-03 (A8) **não** bloqueia este merge: o cadastro está fechado por variável. Bloqueia
só a abertura ao público.

## Fase 3 — C entra no `main` (1 sessão)

1. Rebase sobre `main`; resolver C1 (Entrada 004).
2. C2, C3, C4 — registro dos atalhos, correção do `ATALHOS.md`, `.env.example`.
3. Merge. Nada muda em produção: as rotas existem, mas nada as chama ainda.

## Fase 4 — Integração, a "frente D" (a partir daqui, tudo sobre o `main`)

Ordem sugerida, um item por sessão:

1. **B11 → C5:** migration `002` com `aurea.payment_events`; `idempotencia.ts` passa a
   usar a tabela. Teste: três reenvios, um crédito, **com duas conexões**.
2. **C6:** webhook aprovado credita via `deposit()`; botão de depósito em `/conta`
   (C8, parte 1). Testado em sandbox com Pix (C10).
3. **C7:** cron agendado no `vercel.json`, lendo `envios` e gravando o último evento.
4. **C8, parte 2:** PAC/SEDEX e CEP na tela de envio, sobre `custody.ts`.
5. **B9:** leituras recortadas (RA-13.b).
6. **B10:** remoção do `store/` (RA-13.e), depois de uma semana de produção sobre tabelas.

## Fase 5 — Decisões que só os sócios destravam

| Decisão | Destrava | Onde está registrada |
|---|---|---|
| Parecer jurídico sobre custódia de dinheiro (RA-01) | Sair do sandbox do Mercado Pago | `RISCOS_ASSUMIDOS.md` RA-01 |
| Termos de Uso e Política de Privacidade (RA-03) | Abrir o cadastro ao público | RA-03, `ENTREGA_AUTH_LANDING.md` |
| As quatro perguntas do saque | C9, tela de saque | Seção 3 deste documento |
| `Trade.fee?` (B7) e CD-09 (B8) | Fechar RA-06 | `HANDOFF_FRENTE_B_BANCO.md` |
| Contrato dos Correios (C11) | Trocar o adaptador determinístico pelo real | `src/lib/shipping/ATALHOS.md` |

---

# 5. Critérios de aceite dos módulos, conferidos

| Módulo | Critério | Estado |
|---|---|---|
| M1 | 38 testes passam sem alteração | ✅ |
| M1 | Duas compras simultâneas: uma vence | ✅ PGlite · ⏳ Supabase real (B4) |
| M1 | Dois envios simultâneos não repetem `RO-` | ✅ PGlite · ⏳ Supabase real (B4) |
| M1 | Ambiente sobe do zero com o seed | ✅ |
| M1 | Nenhuma tabela em `public` | ✅ testado · ⏳ conferir após B3 |
| M2 | Google ponta a ponta cria usuário | ⏳ código pronto, credencial falta (A6) |
| M2 | E-mail exige verificação | ⏳ código pronto, SMTP falta (A7) |
| M2 | Nenhuma senha em texto puro | ❌ `user.pass` e `ACCOUNTS` continuam (A3) |
| M2 | Sessão sobrevive a recarregar | ✅ |
| M2 | RA-02 marcado como pago | ❌ não pode ainda (A3) |
| M3 | `/` responde 200 sem sessão | ✅ |
| M3 | Deslogado vai para `/entrar` sem laço | ✅ |
| M3 | Logado em `/` ou `/entrar` vai para `/inicio` | ✅ |
| M3 | Layout íntegro abaixo de 560px; toque ≥ 44px | ✅ (47–49 px, relatório da A) |
| M5 | Pix, crédito, boleto ponta a ponta em sandbox | ❌ nunca executado (C10) |
| M5 | Webhook reenviado três vezes credita uma vez | ⚠️ só em memória, num processo (C5) |
| M5 | Assinatura inválida rejeitada e registrada | ✅ em produção · ⚠️ aceita fora dela |
| M5 | Saque reflete no ledger e extrato | ❌ não existe (C9) |
| M5 | Nenhum dado de cartão no servidor | ✅ Checkout Pro |
| M5 | Conciliação gateway × ledger | ❌ não existe |
| M6 | Código e instruções na tela e por e-mail | ⏳ tela existe do port; e-mail falta (C12) |
| M6 | Carta comum não selecionável, nem forjada | ✅ tipo fechado + validação |
| M6 | Objeto declarado como moeda colecionável | ✅ constante fixa |
| M6 | Rastreio por job agendado | ❌ rota existe, cron não agendado, lista vazia (C7) |
| M6 | Nenhum CEP guardado | ✅ |

---

# 6. Dívida de registro (a regra dos dois lugares)

| Frente | Atalho tomado | `RISCOS_ASSUMIDOS.md` | `ATALHOS.md` da pasta |
|---|---|---|---|
| A | Login só via Supabase, sem contingência para o seed | ❌ | ❌ (`src/server/auth/` sem `ATALHOS.md`) |
| A | Troca de senha local ficou órfã | ❌ | ❌ |
| B | RA-13 a–e | ✅ | ✅ |
| C | Idempotência em memória | ❌ (RA-07 não atualizado) | ✅ parcial (chama de "pronta para persistência") |
| C | Simulador sem credencial (MP e Correios) | ❌ | ✅ |
| C | Assinatura aceita sem segredo fora de produção | ❌ | ❌ |
| C | Cron sem agendamento | ❌ | ❌ |

A e C fecham essa tabela nas Fases 2 e 3, antes do merge.
