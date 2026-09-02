# Atalhos tomados em `src/lib/shipping/`

```
Módulo:        src/lib/shipping/
Responsável:   Agente C (feat/pagamentos-correios)
Data:          02/09/2026
```

## Atalhos e riscos registrados

### 1. Ausência de contrato comercial dos Correios ativo no ambiente
- **Situação:** O contrato comercial formal de API CWS dos Correios pode demandar dias para credenciamento.
- **Implementação:** O módulo foi construído contra a especificação oficial da API dos Correios, incluindo um adaptador e gerador determinístico de cálculo de frete e rastreamento para operação em ambiente de desenvolvimento/testes, trocando apenas de credencial em produção sem alterar código de aplicação.

### 2. Formato de etiqueta PDF
- **Situação:** A rota `/api/envios/etiqueta/[protocolo]` fornece o modelo de etiqueta para impressão pelo cliente com os dados da Central de Recebimento da Áurea e remetente.
