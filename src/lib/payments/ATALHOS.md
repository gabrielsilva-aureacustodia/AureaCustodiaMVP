# Atalhos tomados em `src/lib/payments/`

```
Módulo:        src/lib/payments/
Responsável:   Agente C (feat/pagamentos-correios)
Data:          02/09/2026
```

## Atalhos e riscos registrados

### 1. RA-01 — Operação exclusiva em Sandbox
- **Situação:** A plataforma movimenta saldo interno que terá lastro em depósitos de terceiros.
- **Atalho:** A integração roda em modo Sandbox (`MP_SANDBOX=true` por padrão e fallback simulador quando sem token) até a emissão de parecer jurídico formal pelo Gabriel e sócios.

### 2. RA-07 — Idempotência em memória com suporte a repositório
- **Situação:** Idempotência obrigatória para webhooks e transações.
- **Implementação:** Desenvolvida estrutura com TTL em memória de 24h (`idempotencia.ts`), desacoplada e pronta para persistência em tabela de banco quando a Frente B concluir a migração do Supabase.

### 3. Fallback determinístico na ausência de credenciais
- **Situação:** Se `MP_ACCESS_TOKEN` ou `MP_ACCESS_TOKEN_TEST` não estiverem configurados no `.env.local` de quem roda o projeto, as funções de checkout e Pix geram payloads de simulação determinísticos em vez de estourar erros de rede, permitindo testes locais e suíte Vitest verde.
