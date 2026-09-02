# `src/lib/shipping/` — Integração com Correios e Logística

Módulo responsável pela cotação de frete, geração de pré-postagem/etiquetas e rastreamento de encomendas de custódia física de moedas comemorativas.

## Arquitetura e Restrições de Negócio

```
src/lib/shipping/
├── types.ts       Contrato de tipos e enums de modalidade ('PAC' | 'SEDEX')
├── correios.ts    Cálculo de frete e pré-postagem (server-only)
├── tracking.ts    Rastreamento SRO em lote (cron / background)
├── cep.ts         Consulta de CEP com conformidade LGPD (server-only)
├── index.ts       Exportações públicas do módulo
├── README.md      Esta documentação
└── ATALHOS.md     Registro de atalhos e decisões
```

## Regras Invioláveis

1. **Nunca Carta Comum**: A tipagem `ModalidadeEnvio = 'PAC' | 'SEDEX'` proíbe expressamente carta comum em tempo de compilação e execução. O regimento interno dos Correios autoriza o confisco de moeda circulante enviada via carta comum.
2. **Declaração de Conteúdo Obrigatória**: Todo pacote enviado à custódia possui declaração explícita de `Moeda comemorativa / colecionável` e valor declarado para cobertura de seguro ad valorem.
3. **Rastreio por Agendamento**: As consultas à API de rastreamento (SRO) são executadas por jobs em lote (Vercel Cron), com cache local, evitando chamadas síncronas a cada render de tela.
4. **LGPD no CEP**: A consulta de CEP é efetuada para preenchimento de endereço e jamais grava histórico de busca em banco de dados.
