# Execuções manuais pendentes — o que só o Gabriel (ou os sócios) pode fazer

**Guia didático do que falta configurar, decidir e cadastrar para a plataforma rodar sem
surpresa**

```
Escrito em: 03/09/2026, madrugada, no check-up geral do repositório
Estado do código: main em e612aaa + correções do check-up — typecheck, lint,
                  154 testes e build verdes
Para quem: Gabriel, e o que ele precisa pedir aos sócios, ao contador e ao advogado
```

> **Como ler.** Cada bloco diz **o que é**, **por que importa**, **onde se faz**, **como
> conferir que deu certo** e **o que quebra se pular**. A ordem dos blocos é a ordem em que
> as coisas destravam umas às outras. Nada aqui é código: tudo o que era código já está no
> repositório, testado.

---

# 0. O mapa, em uma olhada

| # | Bloco | Depende de | Destrava |
|---|---|---|---|
| 1 | Banco em produção (Supabase) | senha do banco em mãos | **Tudo.** Sem isto a produção continua no blob antigo |
| 2 | Frente A: rebase e merge | bloco 1 | Login real, landing, cadastro |
| 3 | Supabase Auth, Google e Resend | bloco 2 e o DNS do domínio | Sócios entrando com e-mail de verdade |
| 4 | Vercel: variáveis de operação | — | Cron, relatórios, administradores |
| 5 | Mercado Pago em sandbox | login do Rogério | Depósito de verdade (de mentira) |
| 6 | Correios | contrato comercial | Etiqueta e rastreio reais |
| 7 | Contador | bloco 1 | DRE com número |
| 8 | Sócios e advogado | reunião | Saque, custódia debitada, dinheiro real, cadastro público |
| 9 | Uma semana depois | produção estável | Limpeza do código antigo |

---

# 1. Banco em produção — a virada para tabelas

## O que é

Hoje a produção guarda o estado num único documento JSON (`aurea.aurea_state`). O código
novo já grava em **19 tabelas** (contas, moedas, ofertas, negociações, envios, pagamentos,
rastreio, ledger, auditoria, DRE). O código está publicado no `main`; **o banco de produção
ainda não tem as tabelas**.

## Por que importa

A produção **já tem `POSTGRES_URL`**. No instante em que o deploy atual subir, a aplicação
vai procurar `aurea.seq` — e ela não existe. **Toda requisição falha, inclusive o login.** A
ordem obrigatória é: tabelas primeiro, deploy depois.

## Onde se faz

Terminal, na pasta do projeto, com o `.env.local` correto.

## Passo a passo

**1.1 — Corrigir o `.env.local`.** A conexão local ainda recusa a senha. Abra o painel do
Supabase → *Connect* e copie as duas strings:

```
POSTGRES_URL="<Transaction pooler, porta 6543>"
POSTGRES_URL_DIRECT="<Session pooler, porta 5432>"
AUREA_DB_SCHEMA="aurea_local"
```

A terceira linha é a sua "gaveta" local: mexe num schema separado e nunca no dos sócios.

**1.2 — Conferir que autentica.**

```bash
npm run db:check
```

Esperado: o host, o schema e um diagnóstico. Na primeira vez ele dirá que a migration não
foi aplicada — é o esperado.

**1.3 — Criar a gaveta local e passear.**

```bash
npm run db:migrate
```

Esperado: `+ 001_inicial`, `+ 002_pagamentos_rastreio`, `+ 003_ledger_dre_auditoria`,
`✓ nenhuma tabela em public`. Depois `npm run dev`, entrar, publicar um anúncio, comprar com
outra conta, abrir o extrato e `/relatorios`.

**1.4 — Provar a fila de escrita com duas conexões reais.** É o único teste que o Postgres
embutido da suíte não consegue fazer.

```bash
AUREA_DB_TEST_URL="<POSTGRES_URL_DIRECT>" npm test
```

No PowerShell: `$env:AUREA_DB_TEST_URL="..."; npm test`. Esperado: **0 pulados**. Se um
teste de concorrência falhar aqui, **pare** e me chame.

**1.5 — Migration em PRODUÇÃO, antes do deploy.**

```bash
AUREA_DB_SCHEMA=aurea npm run db:migrate
```

Seguro: só cria tabelas novas ao lado do blob; o site no ar nem as enxerga.

**1.6 — Conferir na Vercel** que `POSTGRES_URL` é **uma linha só**, começa com
`postgresql://` e usa a porta **6543** do pooler.

**1.7 — Avisar os sócios:** o ambiente **recomeça do seed** (saldos, anúncios, envios e
senhas trocadas voltam ao início). É o RA-08, aceito.

**1.8 — Deploy** (o `main` já está publicado; um redeploy na Vercel basta) e, em dois
minutos:

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://aurea-custodia-mvp.vercel.app/
```

Esperado `200`; depois login manual e painel com saldo e moedas.

## O que quebra se pular

- Pular 1.5 e publicar: **site fora do ar** até a migration rodar.
- Tentar "voltar atrás" tirando `POSTGRES_URL`: **não volta para o blob** — cai em memória.
  O rollback certo é o *Instant Rollback* da Vercel.

## Como conferir depois

`npm run db:check` com `AUREA_DB_SCHEMA=aurea` deve aprovar **19 tabelas** e nada em `public`.

---

# 2. Frente A — ✅ rebase e fechamento executados; falta apenas o merge

## O que é

A branch `feat/auth-landing` (landing, `/entrar`, `/cadastrar`, `/termos`, `/privacidade`,
Supabase Auth) foi rebaseada sobre a `main` local em 06/09/2026 e recebeu o fechamento do
provisionamento e do Google Auth.

## Passo a passo

**2.1 — ✅ Rebase sobre o `main`.** O conflito previsto em `LoginForm.tsx` foi resolvido.
O `main` tem um link provisório para `/criar-conta`; a sua versão tem o link para
`/cadastrar`. **Fica a sua versão.**

**2.2 — ✅ Contingência de login** (item 3.1 de `docs/EXECUCAO_FINAL_AGENTE_A.md`). Sem ela,
no instante do merge ninguém entra, porque o Supabase Auth ainda não tem usuário.

**2.3 — ✅ Rotas provisórias apagadas** no mesmo fechamento:

```bash
git rm -r src/app/criar-conta src/app/entrar-demo src/components/login/SignupForm.tsx src/server/actions/signup.ts
```

E encerrar o **RA-15** em `RISCOS_ASSUMIDOS.md`.

**2.4 — ✅ Registro dos atalhos da frente A.** O RA-17 foi criado.
pedia "RA-16", mas o RA-16 já foi ocupado pelo ledger. **Use RA-17.**

**2.5 — Verificar e mergear.** A validação local e os commits pertencem à entrega da branch;
o Gabriel só precisa mergeá-la e validar o OAuth no deployment resultante.

## O que quebra se pular

- Sem 2.2: **ninguém entra** depois do merge.
- Sem 2.3: fica um login sem senha escrito num repositório público.

---

# 3. Supabase Auth, Google e Resend — os sócios entrando de verdade

## O que é

O login novo confere a senha no Supabase Auth, confirma o e-mail por link, e aceita
"Continuar com Google". Três serviços precisam estar ligados entre si.

## Onde se faz

Painéis do Supabase, do Google Cloud, do Resend e do provedor de DNS do domínio. O roteiro
canônico, já ajustado à decisão de manter o site na Vercel e usar a HostGator somente para
domínios, DNS e caixas humanas, é
`docs/GUIA_VERCEL_HOSTGATOR_EMAIL_E_DOMINIOS.md`.

## Passo a passo

**3.1 — Supabase: chave publicável.** Project Settings → API Keys → *Publishable key*
(começa com `sb_publishable_`). **Nunca** a *Secret key* nem a `service_role`.

**3.2 — Vercel (Production, Preview e Development):**

```
SUPABASE_URL=https://vjbqikfamqdttbmaqrxf.supabase.co
SUPABASE_PUBLISHABLE_KEY=<a chave de 3.1>
AUREA_SITE_URL=https://aurea-custodia-mvp.vercel.app
AUREA_TERMS_VERSION=RASCUNHO-0.1-2026-09-02
AUREA_PRIVACY_VERSION=RASCUNHO-0.1-2026-09-02
AUTH_LEGAL_SECRET=<node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
```

⚠️ **`AUREA_SIGNUP_ENABLED` fica FORA de Production.** Os termos são rascunho; o cadastro
público só abre depois do advogado (RA-03). Em *Preview* pode ficar `true` para testar.

**3.3 — Supabase: Redirect URLs.** Auth → URL Configuration → adicionar
`https://aurea-custodia-mvp.vercel.app/entrar/callback` e a URL do Preview.

**3.4 — Google OAuth.** Google Cloud → credencial OAuth (tipo Web) com a URI de retorno **do
Supabase** (`https://vjbqikfamqdttbmaqrxf.supabase.co/auth/v1/callback`); depois Supabase →
Auth → Providers → Google → colar Client ID e Secret.

**3.5 — Resend: adiado na fase Vercel-only.** A URL `.vercel.app` não é um domínio cujo
DNS controlamos e, portanto, não pode ser usada como domínio remetente no Resend. Quando
esta etapa for ativada, usar `auth.aureacustodia.com.br` e criar na Zona DNS da HostGator
somente os registros exatos mostrados pelo Resend. Os MX de `aureacustodia.com.br`
continuam pertencendo às caixas humanas da HostGator/Titan.

**3.6 — Supabase: SMTP.** Auth → SMTP Settings → host, porta, usuário e senha do Resend;
remetente com o domínio verificado.

**3.7 — Supabase: template de confirmação.** Auth → Email Templates → *Confirm signup*:

```html
<a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=email">Confirmar e-mail</a>
```

E **desligar o tracking de links** no Resend, senão o link é reescrito e o hash quebra.

**3.8 — Criar as sete contas** dos sócios no Supabase (Auth → Users) e confirmar cada
e-mail. Decida antes: e-mails reais (muda `seed.ts`) ou os `@testeaurea.com.br` confirmados
à mão.

## Como conferir

No Preview: cadastro → e-mail chega → link confirma → `/inicio`. "Continuar com Google" →
volta logado. Sair e entrar de novo.

---

# 4. Vercel — variáveis de operação

Todas em Settings → Environment Variables. Gere segredos com
`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.

| Variável | Para quê | Sem ela |
|---|---|---|
| `CRON_SECRET` | Protege `/api/cron/shipping`. A Vercel envia o Bearer sozinha | Em produção a rota recusa tudo (fecha) — o rastreio nunca atualiza |
| `AUREA_ADMIN_EMAILS` | Quem vê `/relatorios` e `/api/admin/conciliacao`. Lista por vírgula | Valem as 7 contas do seed |
| `AUREA_RELATORIOS_TOKEN` | Leitura dos relatórios por URL (Sheets/Excel). Mínimo 16 caracteres | Acesso por token desligado (só sessão de admin) |
| `NEXT_PUBLIC_APP_URL` | URLs de retorno do Checkout Pro | Volta para `localhost` |
| `GOOGLE_SHEETS_SPREADSHEET_ID`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | Botão "Enviar ao Google Sheets" | O botão diz o que falta |

O cron está agendado **diário às 9h** porque o plano Hobby só permite um por dia.

## Como conferir

```bash
curl -s -H "Authorization: Bearer $CRON_SECRET" https://aurea-custodia-mvp.vercel.app/api/cron/shipping
```

Esperado `ok: true`. Sem o header: `401`.

---

# 5. Mercado Pago — sandbox de ponta a ponta

## O que é

O depósito com Pix e Checkout Pro está inteiro no código e testado com dublês. **Nunca
rodou contra o Mercado Pago de verdade**, porque a conta é do Rogério.

## Passo a passo

**5.1 — Com o login do Rogério:** developers.mercadopago.com → Suas integrações → criar
aplicação → **Credenciais de teste** → `MP_ACCESS_TOKEN_TEST`. Nunca a de produção (RA-01).

**5.2 — Webhooks** → Configurar notificações → URL de **teste**:
`https://<preview>.vercel.app/api/webhooks/mercadopago`, evento "Pagamentos" → copiar a
**Assinatura secreta** → `MP_WEBHOOK_SECRET`.

**5.3 — Contas de teste** (comprador e vendedor) na mesma aplicação.

**5.4 — Vercel (Preview):** as duas variáveis + `NEXT_PUBLIC_APP_URL` do Preview.
`MP_SANDBOX` fica **ausente** (o padrão já é sandbox).

## Como conferir

1. No Preview: `/conta` → Depositar → **Pagar com Pix** → QR aparece, saldo **não** muda.
2. Pagar com a conta de teste compradora, ou "Simular notificação" no painel.
3. Em até 10 s o saldo muda sozinho.
4. Reenviar a notificação duas vezes pelo painel: **o saldo não muda de novo** e o extrato
   tem um depósito só. É o RA-07 provado.

## O que quebra se pular

Nada quebra: sem token, o simulador responde. Mas o critério "ponta a ponta em sandbox"
continua em aberto.

---

# 6. Correios — contrato e credenciais

`CORREIOS_TOKEN` e `CORREIOS_CARTAO_POSTAGEM` vêm do contrato comercial (API CWS). Pode
levar dias. Até lá, cotação, etiqueta e rastreio usam o **adaptador determinístico** — os
números são plausíveis, não reais. A troca é de credencial, não de código.

---

# 7. Contador — a DRE com número

## O que é

A DRE existe, lê a receita do ledger e **não tem alíquota nenhuma no código**. Todas as
linhas de imposto nascem "não configurado".

## Passo a passo

1. Decidir **Lucro Presumido × Simples com Fator R** (a contradição registrada no
   `CLAUDE.md`).
2. Em `/relatorios` (logado como administrador), preencher os parâmetros: presunção de lucro,
   IRPJ, adicional e limite, CSLL, PIS, COFINS, ISS. Valores em **pontos-base** (32% =
   3200).
3. Lançar as despesas que não passam pela plataforma (aluguel, pessoal, seguro do acervo)
   como lançamentos manuais.
4. Opcional: ligar a planilha (bloco 4) e fazer o primeiro "Enviar ao Google Sheets".

## Como conferir

`/api/relatorios/dre` mostra as linhas com valor e sem a observação "parâmetro não
configurado".

---

# 8. Sócios e advogado — decisões que só eles tomam

| Decisão | O que destrava | Onde registrar |
|---|---|---|
| **Parecer jurídico** sobre custódia de dinheiro de terceiros (RA-01) | Sair do sandbox do Mercado Pago | `RISCOS_ASSUMIDOS.md`, RA-01 |
| **Termos de Uso e Política de Privacidade** definitivos (RA-03) | Abrir o cadastro ao público (`AUREA_SIGNUP_ENABLED=true` em Production) | RA-03; versões nas variáveis |
| **D10 — saque:** Pix ou transferência? prazo de retenção? teto por período? custódia debitada do saldo? | A sessão C-4 (saque) e o limite de frequência do RA-07 | `docs/DECISOES_D1_D9_E_PLANO.md` |
| Ratificar `Trade.fee?` e **CD-09** (extrato lê a comissão gravada) | Fechar o RA-06 | `HANDOFF_FRENTE_B_BANCO.md` |
| Custódia passa a ser **debitada** do saldo? | RA-16.f | `RISCOS_ASSUMIDOS.md` |
| Troca de senha: Supabase ou esconder o controle? | Item 3.4 da frente A | `EXECUCAO_FINAL_AGENTE_A.md` |
| E-mails reais no seed ou fictícios confirmados à mão? | Item 3.5 da frente A | idem |

---

# 9. Uma semana depois da virada

Com a produção estável sobre tabelas: abrir a sessão **B-2**
(`docs/prompts/AGENTE_B2_POS_PRODUCAO.md`) para remover `src/server/store/`, o ramo antigo
de `state.ts`, `STORE_KEY` e o blob `aurea.aurea_state`. **Não antes.**

---

# 10. Higiene que evita erro inesperado

- **Rode a suíte com o `npm run dev` PARADO.** Com ele de pé, um worker morre e o resumo
  fica verde mostrando 93 de 118 testes — falso positivo silencioso. Confira sempre o
  número de arquivos e de testes.
- **Não copie documentos para a raiz.** Três vezes apareceram cópias de `docs/*.md` na
  raiz, uma delas desatualizada. A verdade mora em `docs/`.
- **`npm run build` com o dev server rodando corrompe o `.next`.** Pare um antes do outro.
- **Nunca commite `.env.local`**, token ou senha. O repositório é público de propósito.
- Antes de qualquer commit: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`.

---

# 11. Checklist final — "a plataforma está pronta para os sócios?"

- [ ] 1.5 feito e `db:check` aprova 19 tabelas em produção
- [ ] Produção responde 200 e o login funciona
- [ ] Frente A mergeada; a branch já contém contingência e não contém `/entrar-demo`
- [ ] Sete contas no Supabase Auth, confirmadas
- [ ] E-mail de confirmação chega (Resend verificado)
- [ ] `CRON_SECRET` e `AUREA_ADMIN_EMAILS` na Vercel
- [ ] Sandbox do Mercado Pago provado (Pix creditado uma vez após três notificações)
- [ ] Parâmetros contábeis preenchidos pelo contador
- [ ] Decisões do bloco 8 registradas
- [ ] `AUREA_SIGNUP_ENABLED` **continua ausente** de Production até o advogado
