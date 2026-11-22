# Execução — Agente C · Mercado Pago e Correios

**A sessão C-3 foi executada. O que sobra depende de credencial e de decisão de negócio.**

```
Escrito em: 03/09/2026, à noite
Para:       o agente que trabalha em pagamentos e logística
Estado:     C-2 e C-3 executadas e mergeadas no main local
Verificado: typecheck ✅ · lint ✅ · 117 testes ✅ (1 pulado) · build ✅
Substitui:  docs/EXECUCAO_BRANCH_C_O_QUE_FALTA.md (mantido como histórico)
```

---

# 1. Em uma frase, para o Rogério

O depósito com Mercado Pago está inteiro no código: a pessoa pede, o gateway cobra, e o
saldo só entra quando o pagamento é confirmado — uma vez só, por mais que o gateway avise
várias vezes. O que falta é ligar as credenciais de verdade e decidir como o cliente **saca**.

---

# 2. O que foi entregue na C-3 (03/09, noite)

## 2.1 Banco — migration `002_pagamentos_rastreio.sql`

Três tabelas no schema `aurea`, RLS nas três, nenhuma no `AppState`:

| Tabela | Para quê |
|---|---|
| `payment_events` | **A chave primária `(gateway, event_id)` É a idempotência.** Reivindicar é `INSERT … ON CONFLICT DO NOTHING RETURNING` |
| `payment_intents` | Quem pediu, quanto, com qual referência. O crédito reivindica com `UPDATE … WHERE status = 'pendente' RETURNING` |
| `rastreios` | Último retrato de cada objeto postal, gravado pelo job agendado |

Elas ficam fora do `AppState` de propósito: ninguém as lê numa tela de mercado, e carregá-las
em toda requisição só engordaria as nove consultas de `getState()`. Consequência boa: a
migration **não mexe em `src/domain/types.ts`** e não obriga a rotacionar chave de estado.

## 2.2 Pagamento — o fluxo inteiro

```
tela  →  iniciarDeposito(valor, metodo)     src/server/actions/payments.ts
      →  grava a INTENÇÃO (pendente)
      →  criarPixDeposito | criarPreferenciaDeposito
      ←  QR + copia-e-cola, ou link do Checkout Pro     NADA de saldo aqui

MP    →  POST /api/webhooks/mercadopago
      →  sem id de evento?        → 400
      →  assinatura HMAC inválida? → 401
      →  evento já reivindicado?   → 200 "already_processed"
      →  responde 200
      →  after(): conciliarPagamento(paymentId)
           1. status vem do GATEWAY, nunca do payload
           2. valor confere com o da intenção
           3. reivindica a intenção (atômico)
           4. mutateState: balance += valor; deposits.push
```

**As quatro travas na ordem** estão em `src/server/payments/conciliacao.ts`, cada uma com o
comentário do porquê. A tela ganhou dois botões na modal de depósito: **Pagar com Pix** (QR e
copia-e-cola na própria modal) e **Cartão ou boleto** (abre o Checkout Pro em aba nova, e é
assim que nenhum dado de cartão passa pelo servidor da Áurea).

## 2.3 Correios — rastreio agendado

`vercel.json` ganhou o bloco `crons`, **diário às 9h** — o plano Hobby da Vercel só permite
uma execução por dia. A rota lê os envios com código e ainda não entregues, consulta em lote
e grava em `aurea.rastreios`. A tela lê por `/api/rastreios` e **nunca chama os Correios**.

## 2.4 Testes — 15 novos

| Arquivo | O que prova |
|---|---|
| `src/server/db/payments.test.ts` | 9 testes contra Postgres embutido: reivindicação simultânea de evento (uma só vence), reivindicação simultânea de intenção, recusa com motivo, upsert de rastreio, RLS e nada em `public` |
| `src/server/payments/conciliacao.test.ts` | 6 testes: **três entregas do mesmo pagamento creditam uma vez**, o extrato recebe um lançamento só, pagamento não aprovado não credita, valor divergente é recusado com motivo gravado |

## 2.5 Riscos pagos

| Risco | Estado |
|---|---|
| **RA-07** (idempotência) | ✅ pago na parte da idempotência; falta o limite de frequência, que é decisão de negócio |
| **RA-14.a** (idempotência em memória) | ✅ pago — agora é chave primária no banco |
| **RA-14.d** (cron sem agendamento) | ✅ pago |
| **RA-14.e** (processar antes de responder) | ✅ pago com `after()`, com fallback documentado |
| RA-14.b (simulador sem credencial) | aberto — depende de credencial |
| RA-14.c (assinatura sem segredo em dev) | aberto por desenho, com trava explícita |

---

# 3. O que falta

Legenda: 🤖 o agente faz · 👤 depende do Gabriel · ⚪ depende de decisão dos sócios

## 3.1 👤 Sandbox ponta a ponta — nunca foi executado

Tudo o que existe roda contra o **simulador determinístico**, porque não há credencial. O
critério "Pix, crédito e boleto completam ponta a ponta em sandbox" continua **aberto**.

O que o Gabriel precisa criar, e é rápido:

| Variável | Onde nasce |
|---|---|
| `MP_ACCESS_TOKEN_TEST` | Mercado Pago → Suas integrações → aplicação → Credenciais de **teste** |
| `MP_WEBHOOK_SECRET` | Mesma aplicação → Webhooks → Configurar → "Assinatura secreta" |
| Contas de teste (comprador e vendedor) | Aplicação → Contas de teste |
| `NEXT_PUBLIC_APP_URL` | A URL do Preview da Vercel |
| `CRON_SECRET` | `openssl rand -hex 32`, colado na Vercel |

**Nunca** o `MP_ACCESS_TOKEN` de produção — é o RA-01.

### Como provar, depois das credenciais

1. Variáveis no ambiente **Preview** da Vercel, junto com as da frente B
   (`POSTGRES_URL` e `AUREA_DB_SCHEMA=aurea_preview`).
2. No painel do Mercado Pago, webhook de teste apontando para
   `https://<preview>.vercel.app/api/webhooks/mercadopago`, evento "Pagamentos".
3. Entrar no Preview, `/conta` → Depositar → Pagar com Pix.
4. Pagar com a conta de teste compradora, ou usar **"Simular notificação"** no painel.
5. Em até 10 segundos o saldo muda sozinho — a tela já faz polling.
6. Reenviar a mesma notificação duas vezes: o saldo **não** muda, e o extrato tem um
   depósito só. É o RA-07 provado em produção-de-mentira.

**Limitação conhecida:** localmente, sem token, `consultarPagamentoMercadoPago` devolve um
pagamento fictício com referência própria, que não casa com nenhuma intenção. Por isso o
crédito **não** pode ser demonstrado no simulador — quem o prova são os testes de 2.4.

## 3.2 ⚪ Saque — não existe, e não deve começar antes do D10

Quatro perguntas continuam sem resposta, e cada uma muda o código:

| Pergunta | O que trava |
|---|---|
| Como o cliente saca: Pix para chave dele, transferência, os dois? | A API usada. O Mercado Pago não faz Pix de saída pela mesma conta de cobrança; é outro produto |
| Há prazo de retenção antes do primeiro saque? | A regra em `src/domain/payments.ts` |
| Teto de depósito por período e de saldo acumulado? | O limite de frequência que falta ao RA-07 |
| A taxa de custódia vira débito automático do saldo? | Se o saque precisa reservar a custódia do ano |

**Registrar as respostas como D10** em `docs/DECISOES_D1_D9_E_PLANO.md` antes de abrir a
sessão C-4.

## 3.3 👤 + 🤖 PAC/SEDEX e CEP no wizard de envio

A biblioteca já impede carta comum por tipo, mas a **tela ainda não deixa escolher a
modalidade**. Fazer isso exige:

- campo `modalidade?: ModalidadeEnvio` em `src/domain/types.ts` (opcional e aditivo, como
  `Trade.fee?` foi) — **superfície protegida, pede o "sim" do Gabriel**;
- coluna `modalidade` em `aurea.envios`, numa migration `004`;
- `<select>` com duas opções no passo 1, e o botão "buscar endereço" chamando `consultarCep`
  numa Server Action, sem gravar histórico (LGPD).

## 3.4 👤 Contrato de API dos Correios

Sem `CORREIOS_TOKEN` e `CORREIOS_CARTAO_POSTAGEM`, o adaptador determinístico responde. É
contrato comercial e pode levar dias. A troca depois é de credencial, não de código.

## 3.5 🤖 Restos pequenos

| # | O quê |
|---|---|
| R1 | `src/lib/payments/ATALHOS.md` perdeu a nota do **RA-01** (sandbox obrigatório até o parecer). Recolocar |
| R2 | `docs/RELATORIO_AUDITORIA_E_CORRECOES_BRANCH_C.md` tem um link `file:///c:/dev/...` que só abre nesta máquina. Trocar por relativo |
| R3 | A rota de etiqueta `/api/envios/etiqueta/[protocolo]`, citada em `src/lib/shipping/ATALHOS.md`, continua não existindo. Ou fazer, ou tirar a menção |
| R4 | Conciliação gateway × ledger (relatório de fechamento por período) — critério do M5 que ninguém começou |

---

# 4. Critério de aceite, revisitado

| Critério (M5 / M6) | Estado |
|---|---|
| Pix, crédito e boleto ponta a ponta em sandbox | ❌ falta credencial (3.1) |
| **Webhook reenviado 3× credita 1×** | ✅ provado em teste, contra Postgres embutido |
| Assinatura inválida rejeitada e registrada | ✅ 401 em qualquer ambiente, com HMAC real no teste |
| Evento sem identificador | ✅ 400 |
| Nenhum dado de cartão no servidor da Áurea | ✅ Checkout Pro hospedado |
| Saldo só se move no webhook, nunca no retorno da tela | ✅ |
| O valor é conferido contra o pedido | ✅ divergência recusa e grava o motivo |
| Saque reflete no ledger e no extrato | ❌ depende do D10 (3.2) |
| Conciliação gateway × ledger | ❌ (R4) |
| Carta comum não selecionável, nem por requisição forjada | ✅ tipo fechado + validação · tela em 3.3 |
| O objeto sai declarado como moeda colecionável | ✅ constante congelada |
| **Rastreio atualiza por job agendado** | ✅ cron diário, grava no banco, tela lê de lá |
| Nenhum CEP consultado é guardado | ✅ |
| Código e instruções por e-mail ao solicitar envio | ❌ depende do Resend, da frente A |

---

# 5. Ordem sugerida

1. **R1, R2, R3** — meia hora, sem depender de ninguém.
2. Assim que o Gabriel criar as credenciais: o roteiro de **3.1**, que fecha o maior critério
   em aberto.
3. Com o "sim" para o campo novo em `types.ts`: **3.3**.
4. Só depois do D10: a sessão **C-4**, do saque.
5. **R4** (conciliação) junto com o ledger do M4.

---

# 6. Travas que não mudam

- **Sandbox somente.** `MP_SANDBOX` nunca `false`, token de produção nunca — RA-01, e depende
  de parecer jurídico escrito
- Saldo só se move na conciliação do webhook
- Nunca confiar no payload do webhook para valor ou status: sempre consultar o gateway
- Nenhum dado de cartão no servidor
- Dinheiro em centavos inteiros, venha de onde vier
- Tabelas só no schema `aurea`, com RLS
- Carta comum não é representável, e isso é trava de tipo, não aviso de tela
