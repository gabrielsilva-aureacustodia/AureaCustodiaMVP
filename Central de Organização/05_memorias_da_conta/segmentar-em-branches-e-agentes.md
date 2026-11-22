---
name: segmentar-em-branches-e-agentes
description: "Gabriel quer todo trabalho dividido em branches e subtópicos, com tarefa pesada quebrada em passos para agentes separados, rodando ao mesmo tempo quando possível."
metadata: 
  node_type: memory
  pinned: false
  originSessionId: e2f0fc14-8a9e-435c-bbc0-70c9ad505b9a
  modified: 2026-09-15T17:46:08.902Z
---

# Segmentar em branches, subtópicos e agentes

Em 15/09/2026, ao ampliar as regras de eficiência de sessão para a v1.1
(`docs/Regras_eficiencia_de_sessao_v1.1.md`, escrita para servir a qualquer projeto), Gabriel
acrescentou três regras de segmentação:

1. **Todo trabalho se divide em branches e subtópicos de execução**, rodando ao mesmo tempo sempre
   que possível.
2. **Quando uma tarefa fica pesada de analisar**, ela vira mais passos, cada um delegado a um agente
   separado (também em paralelo quando possível).
3. **Segmentar ao máximo**, para que cada agente cuide de uma subentrega só.

O porquê é o mesmo das outras regras de eficiência (ver `pergunta-direta-resposta-direta.md`): um
agente com escopo largo lê demais, se dispersa e gasta o limite sem entregar. Isso não autoriza
colocar branch de revisão e melhoria em paralelo: ela continua sendo a última etapa, depois do merge.
