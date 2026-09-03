# Atalhos tomados em `src/lib/payments/`

```
Módulo:        src/lib/payments/
Responsável:   Agente C (feat/pagamentos-correios)
Data:          03/09/2026 (atualizado na sessão C-2)
```

## Atalhos e riscos registrados (RA-14)

### 1. RA-14.a — Idempotência em memória — PAGO em 03/09/2026
- **Situação:** A Vercel executa cada requisição em funções serverless isoladas.
- **Implementação:** A interface nasceu na C-2 com adaptador em memória; na C-3 entrou o adaptador Postgres sobre `aurea.payment_events`, escolhido por `bancoConfigurado()` em `src/server/payments/repositorios.ts`. A memória continua servindo `npm run dev` sem banco. **Quem arbitra agora é a chave primária do banco**, não a memória de um processo.

### 2. RA-14.b — Simulador determinístico sem credenciais
- **Situação:** Ausência de `MP_ACCESS_TOKEN_TEST` no ambiente local/CI.
- **Implementação:** As funções de Checkout Pro e Pix geram payloads determinísticos em vez de estourar erros de rede, permitindo desenvolvimento offline e testes verdes.

### 3. RA-14.c — Assinatura de webhook em desenvolvimento local
- **Situação:** Testes locais sem segredo do Mercado Pago.
- **Implementação:** Assinatura HMAC é estritamente obrigatória por padrão; apenas aceita sem segredo se `MP_WEBHOOK_ALLOW_UNSIGNED="true"` estiver explicitamente configurado no ambiente local.

### 4. RA-14.d — Cron sem agendamento ativo (até a sessão C-3)
- **Situação:** Agendamento no `vercel.json` e leitura de envios pendentes.
- **Implementação:** A rota `/api/cron/shipping` foi entregue com proteção por `CRON_SECRET`, aguardando a tabela `aurea.rastreios` na sessão C-3.

### 5. RA-14.e — Processamento de webhook síncrono antes do retorno
- **Situação:** Resposta imediata antes da conciliação.
- **Implementação:** O webhook valida e responde de imediato, aguardando `after()` ou fila na sessão C-3 para mover saldo em definitivo.
