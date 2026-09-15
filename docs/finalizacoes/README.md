# `docs/finalizacoes/` — a rodada de finalizações de 13/09/2026

Sete pedidos do Gabriel, três frentes em paralelo, nove sub-branches.

## O que mora aqui

| Arquivo | O que é | Quem escreve |
|---|---|---|
| `PLANO_FINALIZACOES_3_BRANCHES.md` | O plano: decisões, territórios, migrations, passos de cada sub-branch e como conferir | Escrito em 13/09; muda só por decisão do Gabriel |
| `RELATORIO_AGENTE_A.md` · `_B.md` · `_C.md` | O que cada frente fez, sub-branch por sub-branch, com o hash do merge e a linha "pronta para main" | O agente da frente |
| `PENDENCIAS_AGENTE_B.md` · `_C.md` | Pedidos a outra frente (arquivo fora do território) e ações manuais do Gabriel, com o valor literal e completo (a frente A não abriu arquivo nesta rodada; o que ficou dela está em `../publish_docs/PENDENCIAS_MANUAIS_AGENTE_A.md`) | O agente da frente |
| `2026-09-13_minuta_termos_de_uso_v1.docx` | A minuta dos Termos de Uso enviada pelo advogado, com os 34 comentários dele. **É a fonte da numeração das cláusulas** | Advogado |
| `2026-09-13_minuta_termos_de_uso_v1.md` | O texto da minuta convertido para leitura. A numeração automática do Word se perde na conversão — conferir contra o `.docx` | Extraído em 13/09 |
| `2026-09-13_minuta_comentarios_do_advogado.md` | Os 34 comentários, com o trecho que cada um marca. A conversão para markdown não os mostra | Extraído em 13/09 |
| `2026-09-13_minuta_pontos_para_os_socios.md` | O que a minuta pede de resposta dos sócios (valores em branco, perguntas) e os pontos de texto que voltam para o advogado | Escrito em 13/09 |

Os relatórios e as pendências nascem na primeira sessão de cada agente.

## Conexões com o resto do repositório

| Aponta para | Por quê |
|---|---|
| [`../PENDENCIAS_ABERTAS.md`](../PENDENCIAS_ABERTAS.md) | O índice único do que continua pendente em todo o repositório |
| [`../PLANO_EXECUCAO_ADMIN.md`](../PLANO_EXECUCAO_ADMIN.md) | O desenho do painel Admin, que a frente C executa. A seção 6 dele (numeração de migrations) foi substituída pela seção 3.3 do plano desta pasta |
| [`../prompts/FINALIZACAO_AGENTE_A.md`](../prompts/FINALIZACAO_AGENTE_A.md) e os de B e C | As mensagens de abertura de cada agente |
| [`../publish_docs/PROTOCOLO_DO_AGENTE.md`](../publish_docs/PROTOCOLO_DO_AGENTE.md) | As regras de sessão, que valem para esta rodada |
| [`../../RISCOS_ASSUMIDOS.md`](../../RISCOS_ASSUMIDOS.md) | Faixas desta rodada: A = RA-24 a RA-29 · B = RA-30 a RA-39 · C = RA-40 a RA-49 |
| `src/server/db/migrations/` | Migrations 014 a 025, reservadas por sub-branch |
