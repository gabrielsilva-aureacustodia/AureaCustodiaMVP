# Relatório de Auditoria e Correções — Frente C (Mercado Pago e Correios)

```
Documento:     Auditoria Completa, Correções da Sessão C-2 e Mapa de Conclusão da Frente C
Branch:        feat/pagamentos-correios
Commits:       98a79da, 49f0c24, 8c35bab e subsequentes
Data:          03/09/2026
Autor:         Agente C (Antigravity / Áurea Custódia)
Revisores:     Gabriel Silva e Rogério (sócios)
Base:          main em dd38a74
```

---

## 1. Visão Geral e Estado Atual

A **Frente C (Mercado Pago e Correios)** passou por uma auditoria completa com base no documento [`docs/EXECUCAO_BRANCH_C_O_QUE_FALTA.md`](EXECUCAO_BRANCH_C_O_QUE_FALTA.md). 

Todas as pendências independentes de banco e de infraestrutura externa foram **100% corrigidas na Sessão C-2**.

### Métricas de Qualidade Atual da Branch:
- **Testes Automatizados (Vitest)**: **71 testes passando (100% verde)** em 12 suítes de teste.
- **Typecheck (TypeScript)**: `tsc --noEmit` executado com **0 erros**.
- **Linter (ESLint)**: `eslint .` executado com **0 erros e 0 avisos**.
- **Build de Produção (Next.js 15)**: Compilação concluída com sucesso gerando todas as 18 rotas do App Router.

---

## 2. Detalhamento de Tudo que Foi Corrigido (Sessão C-2)

| Item da Auditoria | Arquivos Modificados | O que estava acontecendo | Como foi corrigido |
|---|---|---|---|
| **2.1 Idempotência Desacoplada** | `src/lib/payments/idempotencia.ts` | O `Map` em memória não compartilhava estado entre instâncias serverless na Vercel e o acoplamento dificultava a troca por banco. | Criada a interface `RepositorioIdempotencia` com métodos `reivindicar`, `concluir`, `falhar` e `verificar`. Criado o adaptador `RepositorioIdempotenciaMemoria` (TTL 24h) e o seletor `repositorioIdempotencia()` pronto para plugar a tabela `aurea.payment_events` na C-3. |
| **2.3 Eventos sem ID** | `src/lib/payments/webhook.ts`<br>`src/app/api/webhooks/mercadopago/route.ts` | Payloads sem ID recebiam um identificador aleatório (`EVT-<agora>`), permitindo que retentativas duplicadas furassem a idempotência. | `processarPayloadWebhook` retorna `eventoId: null` para payloads sem identificador. A rota `/api/webhooks/mercadopago` rejeita imediatamente com **HTTP 400 (`Identificador do evento ausente`)**. |
| **2.4 Assinatura HMAC Universal** | `src/lib/payments/webhook.ts`<br>`src/app/api/webhooks/mercadopago/route.ts`<br>`src/app/api/webhooks/mercadopago/route.test.ts` | Assinatura só era exigida em `NODE_ENV === 'production'`; testes usavam mocks sem calcular HMAC real. | Validação ativada para **todos os ambientes**; rejeição com **HTTP 401** para qualquer assinatura ausente ou adulterada (em dev só aceita sem segredo se `MP_WEBHOOK_ALLOW_UNSIGNED="true"`). Manifesto normalizado com `dataId.toLowerCase()`. Testes com HMAC real e caso de rejeição 401. |
| **2.5 Segurança no Cron de Rastreio** | `src/app/api/cron/shipping/route.ts`<br>`src/app/api/cron/shipping/route.test.ts` | A rota `/api/cron/shipping` não possuía suíte de teste própria e precisava de validação estrita do `CRON_SECRET`. | Endpoint ajustado para rejeitar sem `Bearer ${CRON_SECRET}` (401). Criada suíte de teste unitário dedicada com 100% de cobertura. |
| **2.6 Registro e Dívidas de Risco** | `RISCOS_ASSUMIDOS.md`<br>`.env.example`<br>`src/lib/payments/ATALHOS.md`<br>`src/lib/shipping/ATALHOS.md` | Faltavam as variáveis no `.env.example`, o RA-07 não tinha nota de estado e o RA-14 não estava registrado. | Criada a seção **RA-14 — Atalhos da frente C** (subitens RA-14.a a RA-14.e) em `RISCOS_ASSUMIDOS.md`, atualizados os `ATALHOS.md` locais e adicionadas todas as variáveis no `.env.example`. |
| **2.6b Rastreabilidade no Diário** | `docs/diario/VERSION_COMPARISON_DAILY.md` | A entrada da C estava numerada como 003, o que geraria conflito com a entrada 003 da Frente B. | Entrada renumerada para **Entrada 004** e adicionada a seção "Correções de 03/09 (Sessão C-2)" em formato *append-only*. |
| **2.6c Catálogo de Features** | `docs/CATALOGO_DE_FEATURES.md` | Status das features 4.4 e 4.5 marcado como totalmente concluído quando ainda aguardavam ligação no banco. | Status ajustado para `🟡 bibliotecas prontas; ligação na sessão C-3`. |

---

## 3. O que Falta e Como Será Executado (Sessões C-3 e C-4)

### 📌 Sessão C-3 — Integração com Banco de Dados e Telas (Após Merge da Frente B)
A Sessão C-3 depende exclusivamente de a **Frente B (`feat/banco-supabase`)** ser mergeada na branch `main`.

1. **Migration `002_pagamentos_rastreio.sql`**:
   - Criação das tabelas `aurea.payment_events` (idempotência persistente), `aurea.payment_intents` (intenção de depósito com `external_reference`) e `aurea.rastreios` (último estado de SRO).
2. **Adaptador Postgres de Idempotência**:
   - Conectar `RepositorioIdempotencia` com `INSERT ... ON CONFLICT (gateway, event_id) DO NOTHING` no Postgres.
3. **Crédito de Saldo no Webhook**:
   - Criar Server Action `iniciarDeposito()` em `src/server/actions/payments.ts`.
   - Ligar a notificação do webhook à chamada de crédito em `mutateState()` após conferir aprovação e valor exato.
4. **Agendamento do Cron**:
   - Inserir `crons` no `vercel.json` (`"schedule": "0 9 * * *"`, diário às 9h para plano Hobby da Vercel).
5. **Atualização das Telas de UI**:
   - **`ModalDeposito`**: Opções de Pix (exibe QR Code na modal) e Checkout Pro (link para gateway), mantendo o depósito simulado para testes rápidos.
   - **Wizard de Envio**: Seleção explícita de modalidade (`PAC` ou `SEDEX`) e busca de CEP sem histórico.
   - **Tela `/envios`**: Leitura dos eventos gravados em `aurea.rastreios` sem consultar a API dos Correios a cada visita.

### 📌 Sessão C-4 — Saques (Depende de Decisões de Negócio D10)
A funcionalidade de saque está travada aguardando definições societárias registradas em `docs/DECISOES_D1_D9_E_PLANO.md`:
1. Método de saída (Pix via chave do cliente, TED/DOC ou ambos)?
2. Prazo de retenção de segurança antes do primeiro saque?
3. Limite diário/mensal de saque?
4. Débito da taxa anual de custódia sobre o saldo restante?

---

## 4. O que o Gabriel Precisa Fazer

1. **Credenciais no Painel do Mercado Pago (para testes em Sandbox)**:
   - Obter `MP_ACCESS_TOKEN_TEST` e `MP_WEBHOOK_SECRET` em *Suas integrações → Aplicação*.
   - Configurar a URL de Webhook no painel do MP: `https://<url-preview>.vercel.app/api/webhooks/mercadopago`.
2. **Parecer Jurídico ([RA-01](file:///c:/dev/AureaCustodiaMVP/RISCOS_ASSUMIDOS.md#ra-01))**:
   - Manter a operação em Sandbox (`MP_SANDBOX=true`) até a obtenção de parecer jurídico sobre arranjo de pagamento / conta de pagamento junto ao Banco Central.
3. **Sequência de Merges**:
   - 1º: Merge da **Frente B** no `main`.
   - 2º: Rebase da **Frente C** (`git rebase origin/main`) e execução da Sessão C-3 com o prompt [`docs/prompts/AGENTE_C3_INTEGRACAO.md`](prompts/AGENTE_C3_INTEGRACAO.md).

---

## 5. Tabela de Critérios de Aceite Revisitada

| Critério de Aceite (M5 / M6) | Estado Inicial | Estado Atual (Sessão C-2) | Estado Final (Sessão C-3 / C-4) |
|---|---|---|---|
| Pix, Checkout Pro e boleto em Sandbox | ⚠️ Simulação sem token | ✅ Bibliotecas e testes prontos | ✅ Ponta a ponta na UI (C-3) |
| Webhook reenviado 3x credita 1x (RA-07) | ⚠️ Em memória num processo | ✅ Interface `RepositorioIdempotencia` | ✅ Chave única `payment_events` (C-3) |
| Assinatura inválida rejeitada (401) | ⚠️ Apenas em produção | ✅ **Sempre rejeitada (testado com HMAC)** | ✅ Em produção |
| Evento sem ID | ❌ Aceitava com chave randômica | ✅ **Rejeitado com HTTP 400** | ✅ Em produção |
| Zero dados de cartão trafegando no servidor | ✅ Garantido | ✅ Garantido (Checkout Pro) | ✅ Garantido |
| Carta comum bloqueada (Correios) | ✅ Bloqueada no tipo e runtime | ✅ Bloqueada | ✅ Bloqueada + UI (C-3) |
| Declaração "Moeda colecionável" fixa | ✅ Garantida | ✅ Garantida | ✅ Garantida |
| Rastreio por Cron agendado (não na página) | ⚠️ Endpoint criado | ✅ **Endpoint testado com 401 e 200** | ✅ Agendado no `vercel.json` (C-3) |
| Consulta de CEP sem persistência (LGPD) | ✅ Garantida | ✅ Garantida | ✅ Garantida |
| Saque no extrato | ❌ Não existe | ❌ Não existe (aguarda D10) | ✅ Implementado na C-4 |
| Registro em `RISCOS_ASSUMIDOS.md` | ❌ Incompleto | ✅ **RA-14.a até RA-14.e registrados** | ✅ Atualizado na C-3 |
