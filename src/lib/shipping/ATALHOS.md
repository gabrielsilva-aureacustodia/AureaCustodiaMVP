# Atalhos tomados em `src/lib/shipping/`

```
Módulo:        src/lib/shipping/
Responsável:   Agente C (feat/pagamentos-correios)
Data:          02/09/2026
```

## Atalhos e riscos registrados

### 1. Ausência de contrato comercial dos Correios ativo no ambiente — ✅ PAGO em 22/10/2026
> Contrato Platinum 1 assinado e API CWS ligada (`./cws/`). Sem as variáveis `CORREIOS_*` o adaptador local
> continua respondendo, agora marcado `origem: 'tabela'` e dito na tela. O texto abaixo fica como histórico.

- **Situação:** O contrato comercial formal de API CWS dos Correios pode demandar dias para credenciamento.
- **Implementação:** O módulo foi construído contra a especificação oficial da API dos Correios, incluindo um adaptador e gerador determinístico de cálculo de frete e rastreamento para operação em ambiente de desenvolvimento/testes, trocando apenas de credencial em produção sem alterar código de aplicação.

### 2. Geração e download de etiquetas de envio
- **Situação:** A rota de download e impressão de etiquetas em PDF (`/api/envios/etiqueta/[protocolo]`) está planejada para a sessão C-3 (ligação com o banco de envios). Na fase atual (C-2), a pré-postagem gera o payload estruturado com todos os dados da Central de Custódia e do remetente.

## Atalhos da integração com o contrato (22/10/2026, RA-59)

### 3. Valor declarado fixo de R$ 150,00 por moeda no envio
- **Situação:** o seguro do envio usa R$ 150 × quantidade, o mesmo número da etiqueta antiga — não a mediana
  de mercado do tipo. A retirada já usa a mediana de 24 h (`medianSellPrice`), com R$ 150 de reserva.
- **Risco:** moeda que vale mais que isso viaja com seguro menor que o valor dela.
- **Como se paga:** usar a mediana do tipo também no envio, com teto pelo limite do serviço (R$ 10.000 SEDEX).

### 4. Peso estimado (300 g + 30 g por moeda além da primeira)
- **Situação:** a cotação e a pré-postagem usam `dimensoesParaMoedas()`. Os Correios aferem na postagem e,
  se o pacote pesar mais, a diferença vem na fatura do contrato — paga pela Áurea, sem repasse ao cliente.
- **Como se paga:** medir os pacotes reais e ajustar a constante, ou cobrar a diferença aferida.

### 5. Token da API guardado na memória de cada instância
- **Situação:** cada instância serverless fria pede o seu token de 24 h (`./cws/cliente.ts`). A API Token
  aceita 3 pedidos por segundo; com tráfego baixo isso não chega perto do limite.
- **Como se paga:** se o limite aparecer nos logs, guardar o token no banco ou em cache compartilhado.
