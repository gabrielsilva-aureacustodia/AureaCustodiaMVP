# `src/lib/payments/` — Integração com Mercado Pago

Módulo responsável pela geração de preferências de pagamento, cobranças Pix diretas, verificação criptográfica de webhooks e controle de idempotência.

## Arquitetura e Segurança

```
src/lib/payments/
├── types.ts          Contrato de tipos, enums de status e DTOs de webhook
├── mercadopago.ts    Cliente da API REST (server-only)
├── webhook.ts        Verificação de assinatura HMAC-SHA256 e parsing
├── idempotencia.ts   Controle de idempotência de eventos (RA-07)
├── index.ts          Exportações públicas do módulo
├── README.md         Esta documentação
└── ATALHOS.md        Registro de atalhos e decisões de risco
```

## Regras Invioláveis

1. **`import 'server-only'` em todos os módulos de execução**: Segredos de API (`MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`) nunca vazam para o bundle do cliente.
2. **Sem dados de cartão (PCI-DSS)**: A plataforma nunca recebe, manipula ou armazena números de cartão (PAN). Utiliza exclusivamente Checkout Pro hospedado ou Pix nativo.
3. **Dinheiro estritamente em `Cents` (inteiro)**: Nenhuma operação monetária utiliza ponto flutuante internamente. A conversão para decimal ocorre estritamente na borda de comunicação com a API do gateway.
4. **Idempotência Obrigatória (RA-07)**: Todo webhook processado é registrado por ID único. Webhooks reenviados pelo gateway são descartados com resposta 200 imediata, garantindo que o saldo seja creditado exatamente uma única vez.
5. **Sandbox por padrão (RA-01)**: Opera em ambiente de teste até que o parecer jurídico sobre arranjo de pagamento seja formalizado.
