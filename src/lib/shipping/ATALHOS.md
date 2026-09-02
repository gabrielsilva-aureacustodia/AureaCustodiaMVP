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

### 2. Geração e download de etiquetas de envio
- **Situação:** A rota de download e impressão de etiquetas em PDF (`/api/envios/etiqueta/[protocolo]`) está planejada para a sessão C-3 (ligação com o banco de envios). Na fase atual (C-2), a pré-postagem gera o payload estruturado com todos os dados da Central de Custódia e do remetente.
