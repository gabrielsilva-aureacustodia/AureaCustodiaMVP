# Atalhos tomados em `src/lib/payments/`

```
Módulo:        src/lib/payments/
Responsável:   Agente C (feat/pagamentos-correios / main)
Data:          03/09/2026 (atualizado na conclusão da Frente C)
```

## Atalhos e riscos registrados (RA-01 e RA-14)

### 1. RA-01 — Operação exclusiva em Sandbox até parecer jurídico
- **Situação:** A plataforma movimenta saldo interno lastreado em depósitos de terceiros. Guardar dinheiro de terceiros pode configurar arranjo de pagamento sob supervisão do Banco Central (Res. BCB 519–521/2026).
- **Implementação:** Toda a integração de pagamentos opera em modo **Sandbox (`MP_SANDBOX=true` por padrão e fallback determinístico sem token)**. A ativação em produção com dinheiro real fica formalmente condicionada à obtenção de parecer jurídico pelos sócios.

### 2. RA-14.a — Idempotência em memória — PAGO em 03/09/2026
- **Situação:** A Vercel executa cada requisição em funções serverless isoladas.
- **Implementação:** A interface nasceu na C-2 com adaptador em memória; na C-3 entrou o adaptador Postgres sobre `aurea.payment_events`, escolhido por `bancoConfigurado()` em `src/server/payments/repositorios.ts`. A memória continua servindo `npm run dev` sem banco. **Quem arbitra agora é a chave primária do banco**, não a memória de um processo.

### 3. RA-14.b — Simulador determinístico sem credenciais
- **Situação:** Ausência de `MP_ACCESS_TOKEN_TEST` no ambiente local/CI.
- **Implementação:** As funções de Checkout Pro e Pix geram payloads determinísticos em vez de estourar erros de rede, permitindo desenvolvimento offline e testes verdes.

### 4. RA-14.c — Assinatura de webhook em desenvolvimento local
- **Situação:** Testes locais sem segredo do Mercado Pago.
- **Implementação:** Assinatura HMAC é estritamente obrigatória por padrão; apenas aceita sem segredo se `MP_WEBHOOK_ALLOW_UNSIGNED="true"` estiver explicitamente configurado no ambiente local.

### 5. RA-14.d — Cron com agendamento ativo — PAGO em 03/09/2026
- **Situação:** Agendamento no `vercel.json` e leitura de envios pendentes.
- **Implementação:** Configurado `crons` no `vercel.json` com agendamento diário às 9h para o endpoint `/api/cron/shipping`, gravando em `aurea.rastreios`.

### 6. RA-14.e — Processamento de webhook em segundo plano com `after()` — PAGO em 03/09/2026
- **Situação:** Resposta imediata antes da conciliação.
- **Implementação:** O webhook valida a assinatura, confere a idempotência do evento, responde HTTP 200 ao gateway imediatamente e processa a conciliação via `after()`.
