# `src/components/pagamento/` — Painel de Pagamento Reutilizável

Módulo de interface para processamento de pagamentos com três modalidades:
- **Saldo em conta**: débito imediato no saldo disponível.
- **Pix**: geração de QR Code e código Copia e Cola via Mercado Pago com polling automático.
- **Cartão de Crédito**: redirecionamento seguro via Checkout Pro do Mercado Pago com suporte a parcelas (`parcelasMax`).

## Arquitetura

```
src/components/pagamento/
├── PainelPagamento.tsx   Componente visual com abas, polling e tratamento de simulador
├── index.ts              Ponto de exportação do módulo
└── README.md             Esta documentação
```

## Regras e Conexões

1. **Client Component seguro**: Não importa `@/server/*`. Toda comunicação com o backend ocorre através de Server Actions passadas como props ou importadas de `@/server/actions/payments`.
2. **Acessibilidade**: Alvo mínimo de toque de 44px em botões, abas e campos de texto.
3. **Polling Ativo**: Quando uma cobrança Pix ou Cartão é iniciada, consulta `consultarStatusCobranca(ref)` a cada 5 segundos até confirmação ou recusa.
4. **Sem travas desnecessárias**: Saldo insuficiente não esconde as abas de Pix e Cartão; informa claramente quanto falta para a operação.
5. **Simulador**: Caso o gateway opere em modo simulado (`simulado: true`), exibe alerta explicativo no próprio painel e não abre abas externas.
