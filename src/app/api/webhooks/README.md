# `src/app/api/webhooks/` — Endpoints Receptores de Notificações

Endpoints HTTP de entrada para webhooks de serviços de pagamento e logística.

## Endpoints

| Rota | Método | Gateway | Finalidade |
|---|---|---|---|
| `/api/webhooks/mercadopago` | `POST` | Mercado Pago | Notificação de pagamentos Pix, cartão e boleto com idempotência e verificação de assinatura HMAC |
| `/api/webhooks/whatsapp` | `POST` | Evolution API (WhatsApp) | Mensagens e estados de entrega do WhatsApp do atendimento (`/admin/cs`), autenticadas por JWT ou segredo no cabeçalho; reentrega não duplica. Ver [README](whatsapp/README.md) |

## Regras de Segurança

1. **Validação de Assinatura**: Todo request valida o cabeçalho `x-signature` com HMAC-SHA256.
2. **Resposta 200 Imediata**: O endpoint grava o evento e responde HTTP 200 para evitar retentativas agressivas do gateway.
3. **Idempotência (RA-07)**: Eventos reenviados são identificados por `eventoId` e ignorados sem reprocessamento de saldo.
