# `src/server/payments/` — onde o pagamento externo vira saldo

Esta pasta liga as bibliotecas puras de `src/lib/payments/` (que falam com o Mercado Pago) ao
estado da plataforma. **É o único lugar em que um pagamento de fora vira crédito dentro.**

## Arquivos

| Arquivo | O que faz | `server-only` |
|---|---|---|
| `repositorios.ts` | Escolhe onde a idempotência e as intenções de depósito vivem: banco (com `POSTGRES_URL`) ou memória (sem) | ✅ |
| `conciliacao.ts` | `conciliarPagamento(paymentId)` — confere no gateway e credita, uma vez só | ✅ |
| `tipos.ts` | `DepositoIniciado` e `MetodoDeposito`, compartilhados com a tela | — |

`tipos.ts` não tem a barreira de propósito: um arquivo `'use server'` só deve exportar funções
assíncronas, então o tipo mora fora — e como tipo some na compilação, o Client Component pode
fazer `import type` sem arrastar servidor nenhum para o bundle.

## O fluxo inteiro do depósito

```
tela  →  iniciarDeposito(valor, metodo)        src/server/actions/payments.ts
      →  grava a INTENÇÃO (pendente)           repositorios.ts
      →  criarPixDeposito / criarPreferencia   src/lib/payments/ (sandbox)
      ←  QR ou link                            a tela mostra. NADA de saldo aqui.

MP    →  POST /api/webhooks/mercadopago
      →  assinatura HMAC inválida?  → 401
      →  evento sem id?             → 400
      →  reivindica o evento        → repetido? 200 "already_processed"
      →  responde 200
      →  after(): conciliarPagamento(paymentId)
           1. status vem do GATEWAY, nunca do payload
           2. valor confere com o da intenção
           3. reivindica a intenção (UPDATE … WHERE status='pendente')
           4. mutateState: balance += valor; deposits.push
```

## As regras que não se negociam aqui

- **Saldo só se move no passo 4.** Nunca no retorno da tela: o cliente pode fechar o
  navegador, e a URL de retorno qualquer um abre.
- **O status vem da consulta autenticada ao gateway**, não do corpo do webhook. O webhook diz
  apenas "algo aconteceu com o pagamento X".
- **O valor é conferido contra a intenção.** Sem isso, pagar R$ 1,00 numa cobrança de
  R$ 1.000,00 creditaria mil.
- **Quem credita é reivindicação atômica**, duas vezes: o evento (chave primária) e a intenção
  (`UPDATE … WHERE status = 'pendente'`). É o banco que arbitra, não a memória.
- **Sandbox enquanto o RA-01 não estiver pago.** Ver `RISCOS_ASSUMIDOS.md`.

## Conexões com as outras pastas

| Pasta | Relação |
|---|---|
| `src/lib/payments/` | Cliente do Mercado Pago, verificação de assinatura, contrato de idempotência |
| `src/server/db/repositories/payments.ts` | A SQL das duas tabelas (`payment_events`, `payment_intents`) |
| `src/server/state.ts` | `mutateState` — o crédito acontece dentro dele |
| `src/server/actions/payments.ts` | A Server Action que a tela chama |
| `src/app/api/webhooks/mercadopago/` | Quem recebe a notificação e chama a conciliação |

## Testes

`conciliacao.test.ts` prova o critério do M5 em uma frase: **três entregas do mesmo pagamento
creditam uma vez.** Também cobre pagamento não aprovado, valor divergente e pagamento sem
intenção conhecida. A prova da concorrência real está em `src/server/db/payments.test.ts`,
contra um Postgres embutido.
