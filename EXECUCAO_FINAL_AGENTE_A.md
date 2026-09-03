# Execução — Agente A · Login, cadastro e landing

**O que falta na frente A para ela entrar no `main`**

```
Escrito em: 03/09/2026, à noite
Para:       o agente que trabalha em feat/auth-landing
Base nova:  main local, com as frentes B e C já mergeadas (não publicado)
Substitui:  docs/EXECUCAO_BRANCH_A_O_QUE_FALTA.md, de 03/09 pela manhã
```

> **Leia antes de tudo:** o `main` mudou muito desde que a sua branch nasceu. As frentes B
> (banco em tabelas) e C (pagamentos e Correios) já estão nele, e há duas rotas provisórias
> que existem só até você entregar. A seção 2 é o que muda para você.

---

# 1. Em uma frase

A frente A é a única que ainda não entrou, e o que falta dela é sobretudo **configuração
externa** — DNS do Resend, provedor Google, contas dos sócios — mais sete ajustes de código
que ninguém além de você deve fazer.

---

# 2. O que mudou no `main` enquanto você trabalhava

| Mudança | O que significa para a sua branch |
|---|---|
| **Frente B mergeada** | `getState()`/`mutateState()` mantêm a assinatura, mas por baixo falam com tabelas no Supabase quando há `POSTGRES_URL`. **Seu código não muda por causa disso** — era esse o contrato |
| **Frente C mergeada** | Novas rotas `/api/webhooks/mercadopago`, `/api/cron/shipping`, `/api/rastreios`; novas pastas `src/server/payments/` e `src/server/shipping/`. Não encostam em autenticação |
| **Migration 002** | Três tabelas novas (`payment_events`, `payment_intents`, `rastreios`). `payment_intents` tem chave estrangeira para `aurea.users` |
| 🔴 **`/criar-conta` e `/entrar-demo` existem** | Cadastro simulado e login **sem senha**, criados para a demonstração local. **São seus para apagar** — ver a seção 4 |
| **`RA-15` no registro de riscos** | O atalho acima, documentado. Você o encerra |

**Antes de qualquer coisa:** `git rebase origin/main` (ou sobre o `main` local, se o Gabriel
ainda não tiver publicado). Não há conflito previsto em código; se houver em
`RISCOS_ASSUMIDOS.md` ou no diário, a regra é **manter os dois lados**.

---

# 3. O que falta, em ordem

Legenda: 🤖 você faz · 👤 depende do Gabriel · ⛔ bloqueia o merge

## 3.1 🔴 ⛔ Contingência de login — sem isto, ninguém entra depois do merge

**O problema.** Seu `login()` vai só ao Supabase Auth. No `main` de hoje não há
`SUPABASE_URL` nem chave publicável configuradas, o Supabase Auth não tem nenhum usuário, e
os sete e-mails do seed são `@testeaurea.com.br`, que não recebem confirmação. No instante
em que a sua branch entrar, a plataforma fica inacessível para todo mundo.

**O que fazer.** Enquanto `isAuthConfigured()` for falso, `login()` cai na regra antiga
(`ACCOUNTS` e `user.pass`, exatamente como está no `main` hoje), com comentário dizendo que
é atalho e por quê. Com o Supabase configurado, o caminho novo assume sozinho.

Isso não enfraquece nada: a regra antiga é a que está em produção neste momento.

## 3.2 🔴 ⛔ Registro dos atalhos — a regra dos dois lugares

Sua branch não tocou em `RISCOS_ASSUMIDOS.md`, não criou `src/server/auth/ATALHOS.md` e não
marcou nada no catálogo. O padrão do repositório é: **todo atalho entra no documento da raiz
E na nota da pasta, no mesmo commit**.

Crie **RA-16 — Atalhos da frente A** (o RA-15 já está ocupado), no formato do RA-13 e do
RA-14, com pelo menos:

- **a** — a contingência de login de 3.1, e quando ela sai;
- **b** — a troca de senha órfã de 3.4;
- **c** — as contas de teste com senha em texto puro, até a recriação com e-mails reais.

E marque no `docs/CATALOGO_DE_FEATURES.md` os itens 4.2 (Supabase Auth) e 4.3 (landing).

## 3.3 🔴 ⛔ Apagar as rotas provisórias (RA-15)

No mesmo commit em que o login novo passar a funcionar:

```bash
git rm -r src/app/criar-conta src/app/entrar-demo src/components/login/SignupForm.tsx src/server/actions/signup.ts
```

E tire o link "Criar conta de demonstração" que a `LoginForm.tsx` do `main` ganhou — a sua
versão do arquivo já tem o link certo, para `/cadastrar`.

Depois marque o **RA-15 como encerrado** em `RISCOS_ASSUMIDOS.md`, com a data. Enquanto
essas rotas existirem, há um login sem senha escrito num repositório público.

## 3.4 🟠 👤 Troca de senha órfã

`changePassword` em `src/server/actions/account.ts` ainda grava `user.pass`, que o login
novo não lê. Trocar a senha na tela deixa de ter efeito.

Duas saídas, e a escolha é do Gabriel:

1. apontar para `supabase.auth.updateUser({ password })`;
2. esconder o controle até a recriação das contas.

`account.ts` era da frente B pelo contrato antigo, mas as frentes já foram mergeadas — o que
vale agora é a regra normal do `CLAUDE.md`: **é superfície protegida, então descreva a
mudança e espere o "sim"**.

## 3.5 🟠 👤 Seed com os e-mails reais dos sócios

Você registrou a decisão de recriar as contas com e-mails reais, mas `src/domain/seed.ts`
continua com os fictícios, e `authorizeProvisionedUser` exige que o e-mail autenticado exista
em `state.users`. Sem alinhar os dois, o sócio autentica no Supabase e recebe "conta ainda
não provisionada".

Precisa de uma decisão do Gabriel entre:

- trocar os sete e-mails do seed pelos reais; ou
- criar os usuários do Supabase com os próprios `@testeaurea.com.br` e confirmá-los à mão no
  painel, sem e-mail.

## 3.6 🟡 🤖 `.env.example` com as variáveis da frente A

Nenhuma delas está lá: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `AUREA_SIGNUP_ENABLED`,
`AUREA_TERMS_VERSION`, `AUREA_PRIVACY_VERSION`, `AUREA_TERMS_URL`, `AUREA_PRIVACY_URL`,
`AUREA_SITE_URL`, `AUTH_LEGAL_SECRET`. Comente cada uma dizendo o que faz, no estilo das
seções que já existem no arquivo.

## 3.7 🟡 🤖 Testes

Sua branch não trouxe nenhum. Dois módulos são testáveis sem infraestrutura, com
`vi.mock('server-only', () => ({}))` — o mesmo truque que a frente C usa:

- `getRegistrationStatus()` em `src/server/auth/config.ts`: fechado sem variáveis, fechado
  sem versões legais, aberto com as cinco;
- `authCallbackUrl()` em `src/server/auth/origin.ts`: com e sem `AUREA_SITE_URL`.

## 3.8 🟡 🤖 Documentos de login desatualizados

`docs/referencia/CONTAS_DE_TESTE.md` e o `README.md` da raiz ainda mandam entrar em `/` com
`12345678`. Passam a dizer `/entrar`, e explicam a contingência de 3.1.

## 3.9 🟡 🤖 Links legais do rodapé

Na landing eles apontam para `/cadastrar#documentos-legais`, uma página fechada. Devem usar
`AUREA_TERMS_URL` e `AUREA_PRIVACY_URL` quando existirem e, enquanto não existirem, mostrar
"em elaboração".

## 3.10 🟡 🤖 Relatório de entrega solto

`docs/ENTREGA_AUTH_LANDING.md` está modificado e **não commitado** num worktree em pasta
temporária do Windows (`%TEMP%\aurea-auth-report-codex`), com 298 linhas contra as 150
commitadas. Pasta temporária o sistema apaga. Commite ou descarte.

---

# 4. O que é do Gabriel, e é o que trava a entrega

| # | Item | Onde |
|---|---|---|
| 1 | **DNS do domínio no Resend**, com autenticação do e-mail do sócio majoritário | Painel do Resend + provedor de DNS |
| 2 | SMTP customizado do Supabase apontando para o Resend | Supabase → Auth → SMTP |
| 3 | Template "Confirm signup" com `{{ .TokenHash }}`, tracking de link desligado | Supabase → Auth → Email Templates |
| 4 | `SUPABASE_URL` e `SUPABASE_PUBLISHABLE_KEY` em Development, Preview e Production | Vercel |
| 5 | Autorizar `https://<domínio>/entrar/callback` como Redirect URL | Supabase → Auth → URL Configuration |
| 6 | Google OAuth: credencial no Google Cloud, provedor habilitado no Supabase | Google Cloud + Supabase |
| 7 | Criar as sete contas e confirmar cada e-mail | Supabase → Auth → Users |
| 8 | **Termos de Uso e Política de Privacidade** (RA-03) — só para ABRIR o cadastro ao público | advogado + sócios |

O item 8 **não bloqueia o merge**: o cadastro está fechado por variável, e é assim que deve
ficar. Ele bloqueia só a abertura ao público.

---

# 5. Ordem sugerida

1. Rebase sobre o `main` novo.
2. Itens 3.1, 3.2, 3.3, 3.6, 3.7, 3.8, 3.9 — um commit por item, com
   `npm run typecheck && npm test && npm run build` verdes entre cada.
3. Item 3.10 — decida o destino do relatório.
4. Itens 3.4 e 3.5 — descreva a mudança ao Gabriel e espere o "sim".
5. Com a configuração da seção 4 pronta, teste em **Preview** conta a conta.
6. Merge no `main`.

---

# 6. Critério de aceite

- [ ] `/` responde 200 sem sessão e mostra a landing
- [ ] Deslogado em rota protegida vai para `/entrar`, sem laço
- [ ] Logado em `/` ou `/entrar` vai para `/inicio`
- [ ] **Com o Supabase não configurado, o login das contas do seed continua funcionando** (3.1)
- [ ] Cadastro por e-mail exige confirmação antes de liberar a operação
- [ ] Google OAuth cria a identidade e registra o aceite legal versionado
- [ ] Nenhuma senha em texto puro no caminho novo
- [ ] `/criar-conta` e `/entrar-demo` **não existem mais**, e o RA-15 está encerrado
- [ ] RA-16 registrado em `RISCOS_ASSUMIDOS.md` e em `src/server/auth/ATALHOS.md`
- [ ] `npm run typecheck`, `npm run lint`, `npm test` e `npm run build` verdes

---

# 7. Regras que continuam valendo

- Nada de `@/server/*` em Client Component — o `server-only` quebra o build
- Nenhuma credencial em commit; o repositório é público de propósito
- Comentários em português, explicando o **porquê**
- Toda pasta nova nasce com `README.md`
- Alvo de toque mínimo no celular: 44px; `responsive.css` continua sendo o último import de
  `globals.css`
- Superfície protegida (`domain/constants.ts`, `fees.ts`, `market.ts`, `types.ts`, Server
  Actions existentes) exige parada e confirmação
