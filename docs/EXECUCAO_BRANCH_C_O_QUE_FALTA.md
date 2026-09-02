# Branch C — o que falta, como corrigir e o que dá para rodar sozinho

**Instruções de correção da frente C (Mercado Pago e Correios) e os tutoriais de execução automática**

```
Escrito em:  03/09/2026
Branch:      feat/pagamentos-correios (commits 98a79da e 49f0c24, publicada no origin)
Base:        main em dd38a74
Verificado:  typecheck ✅ · lint ✅ · 67 testes ✅ · build ✅ (auditoria de 03/09)
Contexto:    docs/EXECUCAO_POS_FRENTES_PARALELAS.md, seção 3 (itens C1–C12)
```

> Este documento é o manual de conclusão da frente C. Ele está dividido em **três
> sessões de trabalho** (C-2, C-3 e C-4), separadas pelo que cada uma depende: nada,
> a frente B, ou credenciais e decisões do Gabriel. Cada sessão tem um prompt pronto em
> `docs/prompts/` e os tutoriais da seção 6 mostram o que roda sem mão humana.

---

# Em uma frase, para o Rogério

A frente C construiu as duas bibliotecas (pagamento e Correios) e elas funcionam nos
testes; **o que falta é ligá-las à plataforma de verdade** — o depósito ainda não credita
saldo, o rastreio ainda não é agendado, a proteção contra crédito duplicado só vale
dentro de um único servidor, e as telas não mudaram.

---

# 1. O que está pronto (e confere)

| Peça | Arquivo | Estado |
|---|---|---|
| Cliente Mercado Pago: Checkout Pro e Pix em centavos | `src/lib/payments/mercadopago.ts` | ✅ testado com mocks; simulador sem token |
| Verificação HMAC do webhook, `timingSafeEqual`, janela de replay | `src/lib/payments/webhook.ts` | ✅ |
| Extração do payload v1/v2 | `src/lib/payments/webhook.ts` | ✅ (com um furo — ver 2.3) |
| Idempotência | `src/lib/payments/idempotencia.ts` | ⚠️ em memória — ver 2.1 |
| Rota do webhook | `src/app/api/webhooks/mercadopago/route.ts` | ⚠️ não credita, aceita sem assinatura fora de produção |
| PAC/SEDEX como tipo fechado, carta comum irrepresentável | `src/lib/shipping/types.ts` | ✅ |
| Declaração "Moeda comemorativa / colecionável" fixa | `src/lib/shipping/types.ts`, `correios.ts` | ✅ |
| Cotação, pré-postagem, código simulado | `src/lib/shipping/correios.ts` | ✅ simulador sem contrato |
| Rastreio com cache e lote | `src/lib/shipping/tracking.ts` | ✅ biblioteca · ❌ ninguém chama |
| CEP sem histórico | `src/lib/shipping/cep.ts` | ✅ |
| Rota do cron | `src/app/api/cron/shipping/route.ts` | ⚠️ lista vazia, não agendado |
| 29 testes | `*.test.ts` | ✅ |
| READMEs e ATALHOS das duas bibliotecas | — | ✅ com uma referência errada — ver 2.6 |

---

# 2. O que falta, em detalhe

Cada item diz **o que está errado, onde, por que importa, como corrigir e como provar**.

## 2.1 🔴 Idempotência só em memória (RA-07 continua aberto)

**Onde:** `src/lib/payments/idempotencia.ts`, linha do `const idempotenciaMap = new Map()`.

**O problema:** a Vercel executa cada requisição numa função serverless. Duas instâncias
não compartilham memória, e cada cold start começa com o mapa vazio. O Mercado Pago
reenvia o mesmo evento até receber 200 — e reenvia mesmo depois de receber, em alguns
casos. Se o reenvio cair noutra instância, o `Map` não o conhece e o crédito acontece de
novo. O teste `idempotencia.test.ts` prova o comportamento **num processo só**, que é o
único cenário em que o problema não existe.

**Como corrigir (duas etapas):**

1. *Sessão C-2 (sem depender da B):* transformar `idempotencia.ts` numa **interface**
   com dois adaptadores — memória (para testes e `npm run dev` sem banco) e Postgres
   (vazio por enquanto). Quem escolhe é uma função `repositorioIdempotencia()` que olha
   `bancoConfigurado()`. Isso deixa a rota e os testes prontos para a troca.

   ```typescript
   // src/lib/payments/idempotencia.ts — o contrato
   export interface RepositorioIdempotencia {
     /** Devolve true se ESTE chamador ganhou o direito de processar o evento. */
     reivindicar(eventoId: string, tipo: string): Promise<boolean>
     concluir(eventoId: string, resultado?: unknown): Promise<void>
     falhar(eventoId: string): Promise<void>
   }
   ```

2. *Sessão C-3 (depois da B no `main`):* adaptador Postgres sobre a tabela
   `aurea.payment_events` (migration `002`, seção 4.1). A reivindicação vira um
   `INSERT … ON CONFLICT (gateway, event_id) DO NOTHING RETURNING event_id`: se não
   voltar linha, outro processo chegou antes. É o banco que decide, não a memória.

**Como provar:** teste em `src/server/db/db.test.ts` (PGlite) que abre **duas conexões**,
reivindica o mesmo `event_id` nas duas e confere que só uma recebe `true`. Depois, o
tutorial 6.4 dispara o webhook três vezes contra o Preview da Vercel e o extrato mostra
um depósito só.

## 2.2 🔴 O webhook não credita saldo (passo 7 do fluxo não existe)

**Onde:** `src/app/api/webhooks/mercadopago/route.ts`, bloco "3. Processamento do
Pagamento". Ele consulta o pagamento e chama `concluirEvento` — **nenhum `mutateState`,
nenhum `deposit()`**. O `external_reference` volta do gateway e é ignorado.

**Por que importa:** é o objetivo inteiro da integração. Hoje um Pix pago em sandbox
termina num `console.log`.

**O que falta para ligar (tudo na sessão C-3):**

- **Intenção de depósito.** Antes de mandar o cliente ao gateway, gravar quem pediu,
  quanto e com qual `external_reference` (tabela `aurea.payment_intents`, seção 4.1).
  Sem isso o webhook não sabe a que conta creditar — o e-mail do pagador no Mercado Pago
  **não** é confiável para isso (pode ser outro e-mail, ou conta de terceiro pagando).
- **Server Action `iniciarDeposito(valorCents, metodo)`** em
  `src/server/actions/payments.ts`: mesmas validações do `deposit()` atual (inteiro,
  positivo, `DEPOSITO_MAX`), cria a intenção, chama `criarPixDeposito` ou
  `criarPreferenciaDeposito`, devolve QR/link. **Não mexe em saldo.**
- **Crédito no webhook**, com três travas na ordem:
  1. `status === 'approved'` no retorno de `consultarPagamentoMercadoPago` (nunca no
     payload do webhook, que não é confiável);
  2. `valorCents` do gateway **igual** ao da intenção — diferença recusa e registra;
  3. `UPDATE payment_intents SET status='creditando' WHERE external_reference=$1 AND
     status='pendente' RETURNING user_email, valor` — a reivindicação atômica da
     intenção. Só quem recebe a linha credita.
  Depois: `mutateState` fazendo exatamente o que `deposit()` faz hoje
  (`u.balance += valor; s.deposits.push(...)`), e `status='creditado'`.
- **Processar depois de responder.** Hoje a consulta ao gateway acontece **antes** do
  200. Se o Mercado Pago der timeout (ele espera pouco), reenvia — e o custo é só o
  `ON CONFLICT`, mas a resposta lenta vira reenvio garantido. Usar `after()` de
  `next/server` para responder primeiro e processar depois. Se a versão do Next
  instalada não tiver `after` estável, manter síncrono e **registrar** no RA-14.

**Como provar:** tutorial 6.4 (Pix em sandbox de ponta a ponta) e o teste de duas
conexões de 2.1.

## 2.3 🟠 Evento sem id ganha um id novo a cada entrega — e fura a idempotência

**Onde:** `src/lib/payments/webhook.ts`, `processarPayloadWebhook`:

```typescript
const eventoId = String(payload.id || payload.data?.id || `EVT-${Date.now()}`)
```

**O problema:** um payload sem `id` e sem `data.id` recebe `EVT-<agora>` — diferente a
cada reenvio. O mesmo evento passa pela idempotência quantas vezes for entregue.

**Como corrigir (sessão C-2):** sem `id` e sem `data.id`, a rota responde **400** e
registra. Evento que não se identifica não se processa. Teste novo em
`route.test.ts`: payload `{}` → 400.

## 2.4 🟠 Assinatura ausente ou inválida é aceita fora de produção

**Onde:** duas linhas.

- `webhook.ts`: sem `MP_WEBHOOK_SECRET` e fora de produção, devolve `true` se **qualquer**
  header existir.
- `route.ts`: `if (!assinaturaValida && process.env.NODE_ENV === 'production')` — só
  rejeita em produção.

**Por que importa:** o Preview da Vercel roda com `NODE_ENV=production`, então lá está
protegido. Mas `npm run dev` aceita qualquer coisa, e o teste da rota passa com
`v1=simulado` — ou seja, **o teste não prova a rejeição**.

**Como corrigir (sessão C-2):**

- A rota rejeita com 401 **sempre** que `assinaturaValida` for falso.
- `validarAssinaturaWebhookMercadoPago` sem segredo devolve `true` **somente** se
  `MP_WEBHOOK_ALLOW_UNSIGNED=true` estiver definido (variável de desenvolvimento,
  documentada no `.env.example` como "nunca na Vercel"). Sem segredo e sem essa
  variável: `false`.
- Teste com assinatura **real**: o teste calcula o HMAC com um segredo de teste e o
  manifesto `id:…;request-id:…;ts:…;`, envia, espera 200; altera um caractere, espera
  401. O tutorial 6.3 tem o código de assinatura.

**Detalhe da especificação do Mercado Pago:** quando `data.id` é alfanumérico, o
manifesto usa o valor **em minúsculas**. Conferir que `dataId.toLowerCase()` está no
manifesto para não rejeitar webhook legítimo.

## 2.5 🟠 O cron não está agendado e não faz nada

**Onde:** `vercel.json` não tem `crons`; `src/app/api/cron/shipping/route.ts` tem
`const codigosPendentes: string[] = []`.

**Como corrigir (sessão C-3):**

1. `vercel.json`:
   ```json
   {
     "crons": [{ "path": "/api/cron/shipping", "schedule": "0 9 * * *" }]
   }
   ```
   **Plano Hobby da Vercel só permite cron diário** (uma vez por dia, horário fixo). O
   `*/6` de hora em hora exige plano Pro. Começar com diário às 9h; é o que o plano
   permite e é suficiente para sete sócios.
2. A rota lê `getState().envios`, filtra `codigoRastreio !== null` e etapa diferente
   de entregue, chama `atualizarRastreiosEmLote` e grava o resultado na tabela
   `aurea.rastreios` (seção 4.1), fora do `AppState` — assim não mexe em
   `types.ts`.
3. A tela `/envios` lê `aurea.rastreios` no servidor e mostra "última atualização
   às …". **Nunca** consulta os Correios na visita.
4. `CRON_SECRET` na Vercel: quando definida, a Vercel envia
   `Authorization: Bearer <CRON_SECRET>` sozinha. A rota já confere.

**Como provar:** tutorial 6.6.

## 2.6 🟡 Documentação com referência falsa e registro incompleto

- `src/lib/shipping/ATALHOS.md`, item 2, cita a rota `/api/envios/etiqueta/[protocolo]`,
  que **não existe** em lugar nenhum da branch. Remover ou marcar "a criar na C-3".
- `RISCOS_ASSUMIDOS.md` mudou 3 linhas; o relatório da C diz que RA-01 e RA-07 foram
  atualizados, mas o texto do RA-07 é o de antes. Falta um **RA-14 — Atalhos da frente
  C**, com cinco subitens, no mesmo formato do RA-13 da frente B:
  - RA-14.a idempotência em memória (até a C-3);
  - RA-14.b simulador determinístico sem credencial (Mercado Pago e Correios);
  - RA-14.c assinatura aceita sem segredo em desenvolvimento (só com
    `MP_WEBHOOK_ALLOW_UNSIGNED`);
  - RA-14.d cron sem agendamento (até a C-3);
  - RA-14.e processamento do webhook antes da resposta (se `after()` não entrar).
  E a linha do índice. O RA-07 ganha uma nota "estado em 03/09: chave em memória na
  branch C; pago só com `payment_events`".
- `.env.example` não conhece nenhuma variável nova. Acrescentar a seção da seção 5.
- `docs/diario/VERSION_COMPARISON_DAILY.md`: a entrada da C está numerada **003**, mas a
  B entra no `main` primeiro com a sua 003. Renumerar a da C para **004** já na branch
  (o conflito de rebase continua, mas a resolução vira "ficam as duas").

## 2.7 🟡 Telas não mudaram

**Onde:** `src/components/account/AccountModals.tsx` (`ModalDeposito`),
`src/components/custody/WizardSteps.tsx`, `src/app/(app)/envios/page.tsx`.

**O que falta (sessão C-3, depois de 2.2 e 2.5):**

- `ModalDeposito`: manter o depósito simulado (é o que funciona sem credencial) e
  acrescentar "Depositar via Mercado Pago (sandbox)" com duas saídas — **Pix** (mostra QR
  e copia-e-cola na própria modal) e **Cartão ou boleto** (abre o `initPoint` do Checkout
  Pro em nova aba). Texto obrigatório na modal: "ambiente de teste, nenhum valor real é
  cobrado". Ao voltar de `/conta?status=success`, a tela **não** credita nada; mostra
  "aguardando confirmação do pagamento" e o saldo muda quando o webhook processar (a tela
  já faz polling de 10 s).
- Wizard de envio: campo **modalidade** (PAC ou SEDEX, `<select>` com só duas opções) e
  campo CEP com botão "buscar endereço" (Server Action que chama `consultarCep` e devolve
  o endereço; nada é gravado além do que o usuário confirmar). Isso exige `modalidade` em
  `Envio` — mudança em `types.ts` e coluna em `envios`. **Decisão do Gabriel** antes de
  editar (superfície protegida).
- `/envios`: linha do tempo com o último evento de `aurea.rastreios`.

## 2.8 ⚪ Saque — não existe e não pode começar

Depende de quatro respostas que ninguém deu:

| Pergunta | Sem resposta, o que trava |
|---|---|
| Como o cliente saca: Pix para chave dele, transferência, os dois? | A API usada (Mercado Pago não faz Pix de saída pela mesma conta de cobrança; é outro produto) |
| Prazo de retenção antes do primeiro saque? | A regra em `src/domain/payments.ts` |
| Teto de depósito por período e de saldo? | O limite de repetição (RA-07 fala disso) |
| Custódia vira débito automático do saldo? | Se o saque precisa reservar a custódia do ano |

**Registrar as respostas em `docs/DECISOES_D1_D9_E_PLANO.md`** como D10 antes de abrir a
sessão C-4.

## 2.9 ⚪ Credenciais que só o Gabriel cria

| Credencial | Para quê | Onde nasce | Tempo |
|---|---|---|---|
| `MP_ACCESS_TOKEN_TEST` | Chamadas reais em sandbox | Mercado Pago → Suas integrações → aplicação → Credenciais de teste | 10 min |
| `MP_WEBHOOK_SECRET` | Verificar assinatura | Mesma aplicação → Webhooks → Configurar → "Assinatura secreta" | junto |
| Contas de teste comprador/vendedor | Pagar em sandbox | Aplicação → Contas de teste | 5 min |
| `CORREIOS_TOKEN`, `CORREIOS_CARTAO_POSTAGEM` | API CWS real | Contrato comercial Correios (empresa) → Meu Correios → API | dias |
| `CRON_SECRET` | Proteger o cron | `openssl rand -hex 32`, colar na Vercel | 1 min |
| `NEXT_PUBLIC_APP_URL` | `back_urls` do Checkout Pro | O domínio de Preview ou produção | 1 min |

**Nunca** `MP_ACCESS_TOKEN` de produção — RA-01.

---

# 3. As três sessões

| Sessão | Depende de | Prompt | Itens |
|---|---|---|---|
| **C-2 — Correções na branch** | nada | `docs/prompts/AGENTE_C2_CORRECOES.md` | 2.1 (etapa 1), 2.3, 2.4, 2.6 |
| **C-3 — Integração no `main`** | B mergeada; credenciais 2.9 (MP) | `docs/prompts/AGENTE_C3_INTEGRACAO.md` | 2.1 (etapa 2), 2.2, 2.5, 2.7 |
| **C-4 — Saque** | respostas de 2.8; parecer RA-01 para sair do sandbox | a escrever depois do D10 | 2.8 |

A C-2 pode começar **hoje**. A C-3 espera a Fase 1 do
`EXECUCAO_POS_FRENTES_PARALELAS.md`.

---

# 4. Desenho do que a C-3 cria

## 4.1 Migration `002_pagamentos_rastreio.sql`

Três tabelas, todas no schema `aurea`, todas com RLS, seguindo o `001`:

```sql
-- Eventos do gateway já vistos: a chave única É a idempotência (RA-07).
CREATE TABLE IF NOT EXISTS aurea.payment_events (
  gateway            text   NOT NULL,
  event_id           text   NOT NULL,
  payment_id         text,
  tipo               text   NOT NULL,
  status             text   NOT NULL,            -- em_processamento | processado | falha
  recebido_em        bigint NOT NULL,
  concluido_em       bigint,
  resultado          jsonb,
  PRIMARY KEY (gateway, event_id)
);

-- Quem pediu depósito, quanto e com qual referência. O webhook credita por aqui.
CREATE TABLE IF NOT EXISTS aurea.payment_intents (
  external_reference text   PRIMARY KEY,
  user_email         text   NOT NULL REFERENCES aurea.users (email),
  valor              bigint NOT NULL CHECK (valor > 0),
  metodo             text   NOT NULL,            -- pix | checkout_pro
  status             text   NOT NULL,            -- pendente | creditando | creditado | recusado
  payment_id         text,
  created_at         bigint NOT NULL,
  updated_at         bigint NOT NULL
);
CREATE INDEX IF NOT EXISTS payment_intents_user_idx ON aurea.payment_intents (user_email);

-- Último estado de rastreio por código, gravado pelo cron. A tela lê daqui.
CREATE TABLE IF NOT EXISTS aurea.rastreios (
  codigo_rastreio    text   PRIMARY KEY,
  protocolo          text   NOT NULL REFERENCES aurea.envios (protocolo),
  status_atual       text   NOT NULL,
  entregue           boolean NOT NULL DEFAULT false,
  atualizado_em      bigint NOT NULL,
  eventos            jsonb  NOT NULL DEFAULT '[]'::jsonb
);

ALTER TABLE aurea.payment_events  ENABLE ROW LEVEL SECURITY;
ALTER TABLE aurea.payment_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE aurea.rastreios       ENABLE ROW LEVEL SECURITY;
```

Nenhuma delas entra no `AppState`: são lidas e escritas direto com `executarNoBanco`,
por repositórios em `src/server/db/repositories/payments.ts` e `rastreios.ts`. Isso
evita tocar `types.ts` e a chave de estado.

## 4.2 Fluxo final do depósito

```
tela  →  iniciarDeposito(valor, 'pix')            Server Action
      →  INSERT payment_intents (pendente)         banco
      →  criarPixDeposito(...)                     Mercado Pago (sandbox)
      ←  QR + copia-e-cola                         tela mostra, NÃO credita

MP    →  POST /api/webhooks/mercadopago
      →  assinatura HMAC válida? não → 401 e log
      →  INSERT payment_events ON CONFLICT DO NOTHING → sem linha → 200 "already_processed"
      →  200 "received"                            resposta ANTES do processamento
      →  after(): consultarPagamento → approved?
      →  UPDATE payment_intents … WHERE status='pendente' RETURNING → sem linha → sai
      →  valor bate? não → status='recusado', log
      →  mutateState: balance += valor; deposits.push
      →  status='creditado'; payment_events.status='processado'
```

## 4.3 Fluxo final do rastreio

```
Vercel Cron (diário)  →  GET /api/cron/shipping  (Bearer CRON_SECRET)
                      →  getState().envios com codigoRastreio e não entregue
                      →  atualizarRastreiosEmLote(codigos)
                      →  UPSERT aurea.rastreios
tela /envios          →  lê aurea.rastreios no servidor; nunca chama os Correios
```

---

# 5. Variáveis de ambiente novas (`.env.example`)

```bash
# --- Mercado Pago (frente C) — SANDBOX APENAS até o parecer jurídico (RA-01) ---
# Token de TESTE da aplicação. Nunca o de produção.
# MP_ACCESS_TOKEN_TEST=""
# Assinatura secreta do webhook (Suas integrações → Webhooks → Configurar).
# MP_WEBHOOK_SECRET=""
# Deixe ausente. Só 'false' liga produção — e isso depende do RA-01.
# MP_SANDBOX="true"
# SÓ EM DESENVOLVIMENTO LOCAL: aceita webhook sem assinatura. Nunca na Vercel.
# MP_WEBHOOK_ALLOW_UNSIGNED="true"
# Origem pública usada nos back_urls do Checkout Pro.
# NEXT_PUBLIC_APP_URL="https://aurea-custodia.vercel.app"

# --- Correios (frente C) — sem contrato, o adaptador determinístico responde ---
# CORREIOS_TOKEN=""
# CORREIOS_CARTAO_POSTAGEM=""

# --- Cron da Vercel ---
# Gere com: openssl rand -hex 32  (ou node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
# A Vercel manda "Authorization: Bearer <valor>" sozinha quando a variável existe.
# CRON_SECRET=""
```

---

# 6. Tutoriais de execução automática

Tudo aqui roda sem intervenção depois de disparado. Os comandos são para o **Git Bash**
(o terminal do Claude Code neste projeto); onde o PowerShell difere, está indicado.

## 6.1 Abrir a sessão C-2 num worktree próprio

Um worktree por branch evita que dois agentes troquem de branch na mesma pasta (lição da
frente B, `HANDOFF_FRENTE_B_BANCO.md`).

```bash
git -C C:/dev/AureaCustodiaMVP worktree add C:/dev/AureaCustodiaMVP-pagamentos feat/pagamentos-correios
```

```bash
cd C:/dev/AureaCustodiaMVP-pagamentos && npm ci --no-audit --no-fund
```

Depois, no Claude Code aberto nessa pasta, cole o conteúdo de
`docs/prompts/AGENTE_C2_CORRECOES.md` como primeira mensagem. O agente faz o resto e
termina com `npm run typecheck && npm test && npm run build`.

## 6.2 Verificar a branch inteira (o que a auditoria rodou)

```bash
cd C:/dev/AureaCustodiaMVP-pagamentos && rm -rf .next && npm run typecheck && npm run lint && npm test && npm run build
```

O `rm -rf .next` importa: tipos gerados por um build de **outra** branch na mesma pasta
fazem o typecheck falhar com "Cannot find module '../../src/app/entrar/page.js'". Não é
erro de código.

## 6.3 Assinar e disparar um webhook local (prova da assinatura)

Salve como `mp-webhook.mjs` **fora** do repositório (por exemplo na pasta de trabalho do
Claude) e rode com o `npm run dev` ligado. Ele assina exatamente como o Mercado Pago e
envia **três vezes** o mesmo evento — o segundo e o terceiro devem voltar
`already_processed`.

```javascript
// mp-webhook.mjs — simula o Mercado Pago batendo no webhook, com assinatura real.
// Uso: MP_WEBHOOK_SECRET=segredo node mp-webhook.mjs http://localhost:3000 12345
import { createHmac } from 'node:crypto'

const [base = 'http://localhost:3000', paymentId = String(Date.now())] = process.argv.slice(2)
const secret = process.env.MP_WEBHOOK_SECRET
if (!secret) throw new Error('Defina MP_WEBHOOK_SECRET igual ao do .env.local')

const eventoId = `evt-${paymentId}`
const requestId = `req-${paymentId}`
const ts = String(Math.floor(Date.now() / 1000))
// Manifesto oficial: id em minúsculas quando alfanumérico.
const manifest = `id:${paymentId.toLowerCase()};request-id:${requestId};ts:${ts};`
const v1 = createHmac('sha256', secret).update(manifest).digest('hex')

for (let i = 1; i <= 3; i++) {
  const res = await fetch(`${base}/api/webhooks/mercadopago?data.id=${paymentId}&type=payment`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-request-id': requestId,
      'x-signature': `ts=${ts},v1=${v1}`,
    },
    body: JSON.stringify({ id: eventoId, type: 'payment', action: 'payment.updated', data: { id: paymentId } }),
  })
  console.log(`envio ${i}: HTTP ${res.status}`, await res.json())
}

// Assinatura adulterada: precisa voltar 401.
const ruim = await fetch(`${base}/api/webhooks/mercadopago?data.id=${paymentId}&type=payment`, {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'x-request-id': requestId, 'x-signature': `ts=${ts},v1=${'0'.repeat(64)}` },
  body: JSON.stringify({ id: `${eventoId}-x`, type: 'payment', data: { id: paymentId } }),
})
console.log(`assinatura inválida: HTTP ${ruim.status}`)
```

```bash
MP_WEBHOOK_SECRET=teste-local node mp-webhook.mjs http://localhost:3000 12345
```

Saída esperada depois da C-2: `200 received`, `200 already_processed`,
`200 already_processed`, `401`. No PowerShell: `$env:MP_WEBHOOK_SECRET="teste-local"; node mp-webhook.mjs …`.

## 6.4 Pix em sandbox de ponta a ponta (depois da C-3)

O Mercado Pago precisa alcançar o webhook pela internet; o **Preview da Vercel** da
branch serve para isso, sem túnel.

1. Na Vercel, ambiente **Preview**, definir `MP_ACCESS_TOKEN_TEST`, `MP_WEBHOOK_SECRET`,
   `NEXT_PUBLIC_APP_URL` (a URL do preview) e as da B (`POSTGRES_URL` com
   `AUREA_DB_SCHEMA=aurea_preview`). Pela CLI, cada uma:
   ```bash
   vercel env add MP_ACCESS_TOKEN_TEST preview
   ```
2. No painel do Mercado Pago, Webhooks → URL de **teste**:
   `https://<preview>.vercel.app/api/webhooks/mercadopago`, evento "Pagamentos".
3. Entrar no preview com uma conta do seed, `/conta` → Depositar → Mercado Pago → Pix.
4. Pagar o QR com a **conta de teste compradora** (aplicativo do MP logado nela) ou usar
   o botão **"Simular notificação"** do painel de Webhooks com o `payment_id` gerado.
5. Em até 10 s a tela atualiza o saldo. Reenviar a mesma notificação pelo painel duas
   vezes: o saldo **não** muda e o extrato tem um depósito.

## 6.5 Checkout Pro (cartão e boleto) em sandbox

Mesmo caminho de 6.4, escolhendo "Cartão ou boleto". Na página do Mercado Pago usar os
cartões de teste da documentação (aprovado: `5031 4332 1540 6351`, nome `APRO`, CVV
`123`, validade futura). Boleto em sandbox aprova pelo botão de simulação do painel.
**Nenhum número de cartão passa pela Áurea** — a página é do gateway.

## 6.6 Disparar o cron à mão

```bash
curl -s -H "Authorization: Bearer $CRON_SECRET" https://<preview>.vercel.app/api/cron/shipping
```

Resposta esperada depois da C-3: `ok: true`, `totalVerificados` igual ao número de
envios com código e não entregues, e a tabela `aurea.rastreios` com uma linha por
código. Sem o header: 401.

## 6.7 Rebase da C sobre o `main` depois da B, com o conflito resolvido

```bash
cd C:/dev/AureaCustodiaMVP-pagamentos && git fetch origin && git rebase origin/main
```

O único conflito esperado é `docs/diario/VERSION_COMPARISON_DAILY.md`. A regra do
arquivo é *append-only*: **ficam as duas entradas**, a da B como 003 e a da C como 004.
Abrir o arquivo, apagar os marcadores `<<<<<<<`, `=======`, `>>>>>>>` mantendo os dois
blocos nessa ordem, e:

```bash
git add docs/diario/VERSION_COMPARISON_DAILY.md && git rebase --continue
```

Depois, 6.2 inteiro. Só então `git push --force-with-lease origin feat/pagamentos-correios`.

## 6.8 Rodar os testes da C isolados, em modo contínuo

```bash
npx vitest src/lib/payments src/lib/shipping src/app/api
```

---

# 7. Critérios de aceite da frente C, revisitados

| Critério (M5/M6) | Hoje | Depois da C-2 | Depois da C-3 |
|---|---|---|---|
| Pix, crédito e boleto ponta a ponta em sandbox | ❌ | ❌ | ✅ (6.4, 6.5) |
| Webhook reenviado 3× credita 1× | ⚠️ um processo | ⚠️ interface pronta | ✅ chave única no banco |
| Assinatura inválida rejeitada e registrada | ⚠️ só em produção | ✅ sempre, testado | ✅ |
| Evento sem id | ❌ passa | ✅ 400 | ✅ |
| Nenhum dado de cartão no servidor | ✅ | ✅ | ✅ |
| Saque reflete no ledger | ❌ | ❌ | ❌ (C-4) |
| Carta comum não selecionável, nem forjada | ✅ | ✅ | ✅ + tela |
| Objeto declarado como moeda colecionável | ✅ | ✅ | ✅ |
| Rastreio por job agendado | ❌ | ❌ | ✅ (6.6) |
| Nenhum CEP guardado | ✅ | ✅ | ✅ (tela sem persistência) |
| Registro em `RISCOS_ASSUMIDOS.md` + `ATALHOS.md` | ❌ parcial | ✅ RA-14 | ✅ RA-14 atualizado |
