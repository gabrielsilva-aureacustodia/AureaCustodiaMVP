# Central de Organização: MD de entrada para outra sessão (Áurea Custódia / Real Olímpico)

Escrito em 22/11/2026. Cole este arquivo inteiro no primeiro prompt de uma sessão nova (outra conta ou outro chat de controle). Repositório: `C:\dev\AureaCustodiaMVP`. Ele diz o que é cada arquivo da pasta `Central de Organização/` e **o que você é obrigado a fazer antes de qualquer outra coisa**.

## 0. Ordem obrigatória (sem exceção)

1. **Use a skill `metodo-eficiente-v2-2`** (Skill tool, nome exato) e siga o passo a passo dela. Se ela não existir na sua conta, **avise o Gabriel antes de seguir**; nunca afirme leitura que não fez. Nota: neste repositório a árvore de chats foi montada no processo **2.0**, sem Garantias de Execução (ver `04_chats/…`, seção 2); a skill orienta como evoluir para o v2.2.
2. **Leia TODOS os arquivos, sem exceção e sem pular**, nesta ordem: `README.md` da Central → `01_continuidade/README.md` → `02_planos_de_execucao/README.md` → `03_relatorios/README.md` → `04_chats/CHATS_DESTE_REPOSITORIO_E_COMO_RECRIAR.md` → `05_memorias_da_conta/README.md`. Depois de cada índice, abra **cada arquivo que ele lista** (o caminho original está na coluna "Caminho original"; o original manda). Só então diga ao Gabriel exatamente o que leu e o que não leu.
3. Leia as regras do repositório: `CLAUDE.md`, `docs/diario/LEIA_PRIMEIRO_AGENTE.md`, `docs/INDICE_VEGA.md` e `C:\dev\Sintetica\processo\00_INDICE.md` + `06_REGRAS_DO_GABRIEL_NA_INTEGRA.md`. Se não achar a pasta da Sintetica, avise.
4. Antes de agir: plano hiperdetalhado salvo na mesma pasta, cruzado com os planos de execução (`02_planos_de_execucao/`). Só afirme "feito" depois de cruzar de novo.

## 1. O que é a Central

Uma pasta de **cópias e índices**. Nada foi movido nem apagado: o original é quem vale e é onde o bloco `## RETOMADA` de cada chat aponta.

## 2. Cada pasta e arquivo

| Item | O que é | Leia quando |
|---|---|---|
| `README.md` | Índice mestre e limites conhecidos | sempre, primeiro |
| `01_continuidade/` (77) | Onde cada tarefa retoma: `geral/` (LEIA_PRIMEIRO, ESTADO-GERAL, INDICE_VEGA, rituais, pendências), `frentes/` (CONTINUIDADE das frentes A–L da manutenção; F, G, J, K, L extraídas do bloco RETOMADA), `registro-vivo-das-frentes/`, `logs-de-execucao/`, `memorias-r11/`, `versoes-das-worktrees/` (versões **não commitadas** mais novas das frentes A, C, H, K) | para retomar qualquer frente |
| `02_planos_de_execucao/` (133) | O que faz as vezes de Garantia aqui: `manutencao-2026-11/` (executivo dos 16 itens do Rogério, controle, modelo de branch, fichas A–M), `md-de-execucao-por-frente/`, `metodo-e-processo/` (Processo 2.0, Regras de eficiência v1.1), `prompts-originais-dos-agentes/`, `planos-gerais/`, `ondas-de-agentes-*`, `polimento/`, `desenhos-e-propostas/` | para saber plano e aceite |
| `03_relatorios/` (72) | Relatórios por frente (execuções, features, modificações), análises e estudos, ondas de setembro, auditorias; o README liga cada relatório à tarefa e ao código | para saber o que foi entregue |
| `04_chats/CHATS_DESTE_REPOSITORIO_E_COMO_RECRIAR.md` | Os **69 chats deste repositório**, um a um, hierarquia (Controle → branch A–L → Execução/Auditoria/Específico), cruzamento com o Método v2.2 e o roteiro exato de recriação | para recriar a árvore de chats |
| `04_chats/chats_do_repositorio.csv` | id, título, nome, pai, worktree, arquivado, última atividade | para conferir ids |
| `05_memorias_da_conta/` (47) | Memórias do Gabriel para este repositório (regras de trabalho, decisões), cópia literal | para restaurar as regras na conta nova |

## 3. A hierarquia a recriar (resumo; detalhe em `04_chats/…`, seção 3)

Controle `Manutenção Real Olímpico -- Pendências | Controle` (nível superior, "ignorar permissões") → 12 chats de branch, um por frente, com worktree própria (`claude/manut-<slug>`): A Segurança, B 1º mês no envio, C E-mails, D Cadastro com Google, E PWA no iPhone, F Extrato = saldo, G Notas do cliente, H Cancelar envio e nota, I Número da moeda, J KPIs do conselho, K Frete + R$ 4,00, L Vídeos → dentro das branches A–E, H, I: Execução e Auditoria, e Específico em C, E, H. A frente M (auditoria de marketing) não tem chat.

## 4. Regras que não se negociam

- Planejar antes de editar; uma tarefa por sessão; não refatorar o que não foi pedido; superfície protegida (`constants.ts`, `fees.ts`, `market.ts`, `types.ts`, contrato de `store/types.ts`, Server Actions) só com decisão dos sócios.
- Decisão de negócio, fiscal ou de cobrança **não se toma sem o Gabriel**; dúvida que muda o resultado: pergunte.
- Nunca commitar `.env.local`, segredo ou token. Antes de commitar bloco funcional: `npm run build`, `typecheck`, `npm test`; commit só de MD vai direto.
- Sem subagentes nem sessões paralelas fora do pedido expresso do processo de branches; push sempre depois de `gh auth switch --user gabrielsilva-aureacustodia`.
- Mover arquivo quebra o RETOMADA de outro chat. Responder em português direto, começando pelo estado do Git.

## 5. Lacunas que você deve levar ao Gabriel

Este repositório não tem Garantia de Execução; não existem chats de Polimento, Merge/Deploy, Relatórios, Processo Padrão, Tester e Higienização (o Controle faz); frentes G tem dois chats duplicados; as frentes ainda abertas dependem de ações dele (variável `RESEND_API_KEY` na Vercel, teste no iPhone, pergunta nº 21 ao contador, decisão sobre armazenamento de vídeos).
