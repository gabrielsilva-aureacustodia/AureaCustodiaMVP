# `docs/execucao-pendencias/` — as pendências divididas em branches de execução

Criada em 15/09/2026 para levar ao fim tudo o que ficou aberto depois do painel administrativo, com
vários agentes trabalhando ao mesmo tempo sem pisar no trabalho um do outro.

| Arquivo | O que é |
|---|---|
| [`00_PLANO_MESTRE.md`](00_PLANO_MESTRE.md) | As branches, os arquivos compartilhados e a regra de cada um, as reservas de RA, migration e porta, e as regras que valem para todas |
| `E1_…md` a `E4_…md`, `E7_…md`, `E8_…md` | A ordem de serviço de cada branch: objetivo final verificável, diagnóstico do código, tarefas, território, testes e entrega. **E5 e E6 foram canceladas em 18/09/2026** e saíram da pasta; o histórico do Git as guarda |
| [`INTEGRACAO.md`](INTEGRACAO.md) | Como as branches E1–E7 entram na `main`: ordem, conflitos esperados, conferências e roteiro manual consolidado |
| [`PROMPTS.md`](PROMPTS.md) | O texto para colar em cada agente |
| [`TUTORIAL_MANUAL_GABRIEL.md`](TUTORIAL_MANUAL_GABRIEL.md) | Só o que depende de uma pessoa: painéis externos, variáveis de ambiente e decisões com passo técnico |
| `relatorios/` | O relatório de saída de cada branch e da integração |

## Situação

| Branch | Situação |
|---|---|
| E1, E2, E3, E4, E7 | **mescladas e publicadas** em 18/09/2026 (`git branch --no-merged main` vazio) |
| E5, E6 | **canceladas** em 18/09/2026 — eram revisão do painel, já feita em outros momentos |
| Integração | **concluída**: 845 testes verdes, typecheck limpo, `main` igual ao `origin/main` |
| E8 | **por executar** — é a única branch de código que resta. O prompt está em [`PROMPTS.md`](PROMPTS.md) |

Quem fechar a E8 atualiza esta tabela no commit do merge.
