# Continuidade: onde cada tarefa em execução retoma

Um MD de continuidade diz **onde parou, o que foi feito, o que falta e o próximo ato** (bloco `## RETOMADA` no topo, padrão Sintetica). Neste repositório a continuidade de cada frente da manutenção (A a L) mora em `docs/diario/execucoes/2026-11-17--manut-<x>--CONTINUIDADE.md` (frentes A, B, C, D, E, H, I) ou, nas frentes F, G, J, K e L, **dentro do bloco RETOMADA do MD de execução** (por isso a Central gerou `--CONTINUIDADE__extraida_da_RETOMADA.md`, cópia literal do bloco). **Ordem de leitura para retomar qualquer coisa:** `geral/LEIA_PRIMEIRO_AGENTE.md` → `geral/ESTADO-GERAL-2026-11-09--MD_EXECUCAO.md` → `geral/INDICE_VEGA.md` → o arquivo da frente em `frentes/` → o registro vivo em `registro-vivo-das-frentes/` → `versoes-das-worktrees/` (versões **não commitadas** mais novas que moram só nas worktrees das frentes A, C, H e K) → a memória R11 da frente em `memorias-r11/`. As frentes G e L ainda têm chat ativo; as frentes A, B, D, E, H e I estão com os chats arquivados (os arquivos continuam valendo).

**77 arquivos.** Todos são **cópias**: o original continua no lugar e é o que vale (o bloco RETOMADA de cada chat aponta o caminho antigo; mover quebraria isso). Se a cópia e o original divergirem, vale o original.

### `frentes/` (12 arquivos)

| Arquivo | Caminho original (manda) | O que é | Tarefa |
|---|---|---|---|
| `2026-11-17--manut-a-seguranca-senha--CONTINUIDADE.md` | `docs/diario/execucoes/2026-11-17--manut-a-seguranca-senha--CONTINUIDADE.md` | 2026-11-17--manut-a-seguranca-senha--CONTINUIDADE.md | A · Segurança: confirmação por senha nas ações sensíveis |
| `2026-11-17--manut-b-primeiro-mes-no-envio--CONTINUIDADE.md` | `docs/diario/execucoes/2026-11-17--manut-b-primeiro-mes-no-envio--CONTINUIDADE.md` | CONTINUIDADE (auditoria) — frente B · primeiro-mes-no-envio | B · Cobrança: 1º mês de custódia no envio |
| `2026-11-17--manut-c-emails-de-movimentacao--CONTINUIDADE.md` | `docs/diario/execucoes/2026-11-17--manut-c-emails-de-movimentacao--CONTINUIDADE.md` | CONTINUIDADE — frente C (e-mails de movimentação) | C · E-mails de confirmação de compra e movimentação |
| `2026-11-17--manut-d-cadastro-google--CONTINUIDADE.md` | `docs/diario/execucoes/2026-11-17--manut-d-cadastro-google--CONTINUIDADE.md` | CONTINUIDADE — frente D (manut-cadastro-google) | D · Cadastro: Google primeiro e demonstração |
| `2026-11-17--manut-e-pwa-iphone--CONTINUIDADE.md` | `docs/diario/execucoes/2026-11-17--manut-e-pwa-iphone--CONTINUIDADE.md` | 2026-11-17--manut-e-pwa-iphone--CONTINUIDADE.md | E · App: PWA funcionando no iPhone |
| `2026-11-17--manut-f--CONTINUIDADE__extraida_da_RETOMADA.md` | `docs/diario/execucoes/2026-11-18--manut-f-extrato-igual-ao-saldo--MD_EXECUCAO.md (bloco RETOMADA)` | Cópia do bloco RETOMADA | F · Extrato igual ao saldo |
| `2026-11-17--manut-g--CONTINUIDADE__extraida_da_RETOMADA.md` | `docs/diario/execucoes/2026-11-17--manut-g-notas-do-cliente--MD_EXECUCAO.md (bloco RETOMADA)` | Cópia do bloco RETOMADA | G · Notas: NFS-e acessível ao cliente |
| `2026-11-17--manut-h-cancelar-envio-e-nota--CONTINUIDADE.md` | `docs/diario/execucoes/2026-11-17--manut-h-cancelar-envio-e-nota--CONTINUIDADE.md` | CONTINUIDADE (auditoria) — frente H · cancelar-envio-e-nota | H · Cancelamento: envio, validação e nota |
| `2026-11-17--manut-i-numero-da-moeda--CONTINUIDADE.md` | `docs/diario/execucoes/2026-11-17--manut-i-numero-da-moeda--CONTINUIDADE.md` | 2026-11-17--manut-i-numero-da-moeda--CONTINUIDADE.md | I · Recibo: número da moeda |
| `2026-11-17--manut-j--CONTINUIDADE__extraida_da_RETOMADA.md` | `docs/diario/execucoes/2026-11-18--manut-j-kpis-do-conselho--MD_EXECUCAO.md (bloco RETOMADA)` | Cópia do bloco RETOMADA | J · KPIs: painel do conselho no admin |
| `2026-11-17--manut-k--CONTINUIDADE__extraida_da_RETOMADA.md` | `docs/diario/execucoes/2026-11-17--manut-k-frete-mais-4-reais--MD_EXECUCAO.md (bloco RETOMADA)` | Cópia do bloco RETOMADA | K · Frete: acréscimo de R$ 4,00 |
| `2026-11-17--manut-l--CONTINUIDADE__extraida_da_RETOMADA.md` | `docs/diario/execucoes/2026-11-17--manut-l-armazenamento-videos--MD_EXECUCAO.md (bloco RETOMADA)` | Cópia do bloco RETOMADA | L · Vídeos: espaço e armazenamento barato |

### `geral/` (20 arquivos)

| Arquivo | Caminho original (manda) | O que é | Tarefa |
|---|---|---|---|
| `2026-10-30--balcao-correios.md` | `docs/diario/execucoes/2026-10-30--balcao-correios.md` | Execução — moeda entregue pelos Correios não chegava ao balcão (30/10/2026) |  |
| `ARQUITETURA_O_QUE_FALTA.md` | `docs/ARQUITETURA_O_QUE_FALTA.md` | Arquitetura — o que ainda falta e o que pode melhorar | O que falta (ondas A/B/C de setembro) |
| `CRITICAL_DEBUGS.md` | `docs/diario/CRITICAL_DEBUGS.md` | Critical Debugs — Áurea Custódia |  |
| `ESTADO-GERAL-2026-11-09--MD_EXECUCAO.md` | `docs/diario/execucoes/ESTADO-GERAL-2026-11-09--MD_EXECUCAO.md` | ESTADO-GERAL — MD de execução do projeto (09/11/2026) | Projeto inteiro |
| `EXECUCAO.md` | `docs/atendimento/EXECUCAO.md` | Atendimento ao cliente — execução (31/10/2026) |  |
| `EXECUCAO_BRANCH_A_O_QUE_FALTA.md` | `docs/EXECUCAO_BRANCH_A_O_QUE_FALTA.md` | Branch A — o que falta (relatório simples para corrigir o agente) | O que falta (ondas A/B/C de setembro) |
| `EXECUCAO_BRANCH_B_O_QUE_FALTA.md` | `docs/EXECUCAO_BRANCH_B_O_QUE_FALTA.md` | Branch B — o backbone: o que confere, o que falta e como colocar em produção sem derrubar o site | O que falta (ondas A/B/C de setembro) |
| `EXECUCAO_BRANCH_C_O_QUE_FALTA.md` | `docs/EXECUCAO_BRANCH_C_O_QUE_FALTA.md` | Branch C — o que falta, como corrigir e o que dá para rodar sozinho | O que falta (ondas A/B/C de setembro) |
| `EXECUCOES_MANUAIS_PENDENTES.md` | `docs/EXECUCOES_MANUAIS_PENDENTES.md` | Execuções manuais pendentes — o que só o Gabriel (ou os sócios) pode fazer |  |
| `EXPLICACAO_DO_PROCESSO_DIARIO.md` | `docs/diario/EXPLICACAO_DO_PROCESSO_DIARIO.md` | O Processo Diário — o que é, por que existe e onde vai chegar |  |
| `FRENTES_DE_TRABALHO.md` | `docs/diario/FRENTES_DE_TRABALHO.md` | Frentes de Trabalho — Áurea Custódia |  |
| `INDICE_VEGA.md` | `docs/INDICE_VEGA.md` | INDICE_VEGA — mapa do repositório Áurea Custódia / Real Olímpico | Projeto inteiro |
| `INTEGRACOES_O_QUE_FALTA.md` | `docs/INTEGRACOES_O_QUE_FALTA.md` | Integrações — o que falta, e o que falta de código nos Correios | O que falta (ondas A/B/C de setembro) |
| `LEIA_PRIMEIRO_AGENTE.md` | `docs/diario/LEIA_PRIMEIRO_AGENTE.md` | LEIA_PRIMEIRO_AGENTE — abertura, execução e fechamento de sessão | Projeto inteiro |
| `MD_EXECUCAO.md` | `docs/pwa/MD_EXECUCAO.md` | PWA do Real Olímpico — MD de execução (04/11/2026) |  |
| `PADRAO_OPERACIONAL_DIARIO.md` | `docs/diario/PADRAO_OPERACIONAL_DIARIO.md` | Padrão Operacional Diário |  |
| `PENDENCIAS_ABERTAS.md` | `docs/PENDENCIAS_ABERTAS.md` | Pendências abertas — o índice único |  |
| `PRIMEIRAS_ACOES_DO_DIA.md` | `docs/diario/PRIMEIRAS_ACOES_DO_DIA.md` | Primeiras Ações do Dia — 10/09/2026 |  |
| `RITUAL_DE_SESSAO.md` | `docs/diario/RITUAL_DE_SESSAO.md` | Ritual de Sessão — Áurea Custódia / Real Olímpico |  |
| `RITUAL_DE_SESSAO_RESUMO.md` | `docs/diario/RITUAL_DE_SESSAO_RESUMO.md` | Ritual de Sessão — RESUMO |  |

### `logs-de-execucao/` (7 arquivos)

| Arquivo | Caminho original (manda) | O que é | Tarefa |
|---|---|---|---|
| `2026-11-17--manut-a-seguranca-senha--LOG_DE_EXECUCAO.md` | `docs/diario/execucoes/2026-11-17--manut-a-seguranca-senha--LOG_DE_EXECUCAO.md` | Log de execução (auditoria) — frente A · manut-seguranca-senha | A · Segurança: confirmação por senha nas ações sensíveis |
| `2026-11-17--manut-b-primeiro-mes-no-envio--LOG_DE_EXECUCAO.md` | `docs/diario/execucoes/2026-11-17--manut-b-primeiro-mes-no-envio--LOG_DE_EXECUCAO.md` | LOG DE EXECUÇÃO (auditoria) — frente B · primeiro-mes-no-envio | B · Cobrança: 1º mês de custódia no envio |
| `2026-11-17--manut-c-emails-de-movimentacao--LOG_DE_EXECUCAO.md` | `docs/diario/execucoes/2026-11-17--manut-c-emails-de-movimentacao--LOG_DE_EXECUCAO.md` | LOG DE EXECUÇÃO — frente C (e-mails de movimentação) — append-only, escrito pela AUDITORIA | C · E-mails de confirmação de compra e movimentação |
| `2026-11-17--manut-d-cadastro-google--LOG_DE_EXECUCAO.md` | `docs/diario/execucoes/2026-11-17--manut-d-cadastro-google--LOG_DE_EXECUCAO.md` | LOG DE EXECUÇÃO — frente D (manut-cadastro-google) — append-only | D · Cadastro: Google primeiro e demonstração |
| `2026-11-17--manut-e-pwa-iphone--LOG_DE_EXECUCAO.md` | `docs/diario/execucoes/2026-11-17--manut-e-pwa-iphone--LOG_DE_EXECUCAO.md` | LOG DE EXECUÇÃO (auditoria, append-only) — frente E · manut-pwa-iphone | E · App: PWA funcionando no iPhone |
| `2026-11-17--manut-h-cancelar-envio-e-nota--LOG_DE_EXECUCAO.md` | `docs/diario/execucoes/2026-11-17--manut-h-cancelar-envio-e-nota--LOG_DE_EXECUCAO.md` | LOG DE EXECUÇÃO (auditoria, append-only) — frente H · cancelar-envio-e-nota | H · Cancelamento: envio, validação e nota |
| `2026-11-17--manut-i-numero-da-moeda--LOG_DE_EXECUCAO.md` | `docs/diario/execucoes/2026-11-17--manut-i-numero-da-moeda--LOG_DE_EXECUCAO.md` | LOG de execução (Auditoria, append-only) — frente I · manut-numero-da-moeda | I · Recibo: número da moeda |

### `memorias-r11/` (18 arquivos)

| Arquivo | Caminho original (manda) | O que é | Tarefa |
|---|---|---|---|
| `2026-10-30--aurea-custodia-balcao-correios--balcao-correios.md` | `docs/memorias/2026-10-30--aurea-custodia-balcao-correios--balcao-correios.md` | 2026-10-30 · aurea-custodia-balcao-correios · Balcão de moedas recebidas (Correios) |  |
| `2026-10-30--claude-code--balcao-correios.md` | `docs/memorias/2026-10-30--claude-code--balcao-correios.md` | Memória — balcão dos Correios (30/10/2026) |  |
| `2026-10-30--claude-code--checkup-2.md` | `docs/memorias/2026-10-30--claude-code--checkup-2.md` | 2026-10-30--claude-code--checkup-2.md |  |
| `2026-10-30--claude-code--polimento-tutorial-admin-checkup.md` | `docs/memorias/2026-10-30--claude-code--polimento-tutorial-admin-checkup.md` | 2026-10-30--claude-code--polimento-tutorial-admin-checkup.md |  |
| `2026-11-09--claude-code--organizacao-e-estado-do-projeto.md` | `docs/memorias/2026-11-09--claude-code--organizacao-e-estado-do-projeto.md` | Organização de continuidade e estado do projeto — memória do agente |  |
| `2026-11-17--claude-code--manut-armazenamento-videos.md` | `docs/memorias/2026-11-17--claude-code--manut-armazenamento-videos.md` | Armazenamento de vídeos de autenticidade — memória do agente |  |
| `2026-11-17--claude-code--manut-cadastro-google.md` | `docs/memorias/2026-11-17--claude-code--manut-cadastro-google.md` | Cadastro: Google primeiro e demonstração — memória do agente |  |
| `2026-11-17--claude-code--manut-cancelar-envio-e-nota.md` | `docs/memorias/2026-11-17--claude-code--manut-cancelar-envio-e-nota.md` | Cancelar envio e nota (frente H) — memória do agente |  |
| `2026-11-17--claude-code--manut-emails-de-movimentacao.md` | `docs/memorias/2026-11-17--claude-code--manut-emails-de-movimentacao.md` | E-mails de movimentação (frente C) — memória do agente |  |
| `2026-11-17--claude-code--manut-frete-mais-4-reais.md` | `docs/memorias/2026-11-17--claude-code--manut-frete-mais-4-reais.md` | Frete: acréscimo de R$ 4,00 (frente K) — memória do agente |  |
| `2026-11-17--claude-code--manut-notas-do-cliente.md` | `docs/memorias/2026-11-17--claude-code--manut-notas-do-cliente.md` | Notas fiscais acessíveis ao cliente — memória do agente |  |
| `2026-11-17--claude-code--manut-numero-da-moeda.md` | `docs/memorias/2026-11-17--claude-code--manut-numero-da-moeda.md` | Número da moeda no recibo — memória do agente |  |
| `2026-11-17--claude-code--manut-primeiro-mes-no-envio.md` | `docs/memorias/2026-11-17--claude-code--manut-primeiro-mes-no-envio.md` | Frente B: 1º mês de custódia no envio — memória do agente |  |
| `2026-11-17--claude-code--manut-pwa-iphone.md` | `docs/memorias/2026-11-17--claude-code--manut-pwa-iphone.md` | 2026-11-17--claude-code--manut-pwa-iphone.md |  |
| `2026-11-17--claude-code--manut-seguranca-senha.md` | `docs/memorias/2026-11-17--claude-code--manut-seguranca-senha.md` | Segurança: senha nas ações sensíveis — memória do agente |  |
| `2026-11-18--claude-code--manut-extrato-igual-ao-saldo.md` | `docs/memorias/2026-11-18--claude-code--manut-extrato-igual-ao-saldo.md` | Extrato igual ao saldo (frente F) — memória do agente |  |
| `2026-11-18--claude-code--manut-kpis-do-conselho.md` | `docs/memorias/2026-11-18--claude-code--manut-kpis-do-conselho.md` | KPIs do conselho no painel — memória do agente |  |
| `README.md` | `docs/memorias/README.md` | Memórias de sessão |  |

### `registro-vivo-das-frentes/` (13 arquivos)

| Arquivo | Caminho original (manda) | O que é | Tarefa |
|---|---|---|---|
| `A.md` | `docs/manutencao-2026-11/registro/A.md` | Registro — frente A (seguranca) | A · Segurança: confirmação por senha nas ações sensíveis |
| `B.md` | `docs/manutencao-2026-11/registro/B.md` | Registro — frente B (primeiro-mes-no-envio) | B · Cobrança: 1º mês de custódia no envio |
| `C.md` | `docs/manutencao-2026-11/registro/C.md` | Registro — frente C (emails-de-movimentacao) | C · E-mails de confirmação de compra e movimentação |
| `DNS_RESEND_avisos.md` | `docs/manutencao-2026-11/registro/DNS_RESEND_avisos.md` | Registros de DNS do Resend para `avisos.realolimpico.com.br` (18/11/2026) |  |
| `F.md` | `docs/manutencao-2026-11/registro/F.md` | F.md | F · Extrato igual ao saldo |
| `G.md` | `docs/manutencao-2026-11/registro/G.md` | G.md | G · Notas: NFS-e acessível ao cliente |
| `H.md` | `docs/manutencao-2026-11/registro/H.md` | H.md | H · Cancelamento: envio, validação e nota |
| `I.md` | `docs/manutencao-2026-11/registro/I.md` | Registro — frente I (numero-da-moeda-no-recibo) | I · Recibo: número da moeda |
| `J.md` | `docs/manutencao-2026-11/registro/J.md` | J.md | J · KPIs: painel do conselho no admin |
| `K.md` | `docs/manutencao-2026-11/registro/K.md` | K.md | K · Frete: acréscimo de R$ 4,00 |
| `L.md` | `docs/manutencao-2026-11/registro/L.md` | L.md | L · Vídeos: espaço e armazenamento barato |
| `_CONTROLE.md` | `docs/manutencao-2026-11/registro/_CONTROLE.md` | Registro do Controle — Manutenção Real Olímpico |  |
| `_QUADRO.md` | `docs/manutencao-2026-11/registro/_QUADRO.md` | Quadro do Controle |  |

### `versoes-das-worktrees/` (7 arquivos)

| Arquivo | Caminho original (manda) | O que é | Tarefa |
|---|---|---|---|
| `2026-11-17--claude-code--manut-frete-mais-4-reais__WORKTREE_frete.md` | `.claude/worktrees/manut-frete-mais-4-c9a96a/docs/memorias/2026-11-17--claude-code--manut-frete-mais-4-reais.md` | Frete: acréscimo de R$ 4,00 (frente K) — memória do agente |  |
| `2026-11-17--manut-a-seguranca-senha--CONTINUIDADE__WORKTREE_seguranca.md` | `.claude/worktrees/manut-seguranca-senha-606459/docs/diario/execucoes/2026-11-17--manut-a-seguranca-senha--CONTINUIDADE.md` | 2026-11-17--manut-a-seguranca-senha--CONTINUIDADE.md | A · Segurança: confirmação por senha nas ações sensíveis |
| `2026-11-17--manut-a-seguranca-senha--LOG_DE_EXECUCAO__WORKTREE_seguranca.md` | `.claude/worktrees/manut-seguranca-senha-606459/docs/diario/execucoes/2026-11-17--manut-a-seguranca-senha--LOG_DE_EXECUCAO.md` | Log de execução (auditoria) — frente A · manut-seguranca-senha | A · Segurança: confirmação por senha nas ações sensíveis |
| `2026-11-17--manut-c-emails-de-movimentacao--LOG_DE_EXECUCAO__WORKTREE_emails.md` | `.claude/worktrees/manut-emails-de-movimentacao-c46333/docs/diario/execucoes/2026-11-17--manut-c-emails-de-movimentacao--LOG_DE_EXECUCAO.md` | LOG DE EXECUÇÃO — frente C (e-mails de movimentação) — append-only, escrito pela AUDITORIA | C · E-mails de confirmação de compra e movimentação |
| `2026-11-17--manut-h-cancelar-envio-e-nota--LOG_DE_EXECUCAO__WORKTREE_cancelar.md` | `.claude/worktrees/manut-cancelar-envio-e-nota-9f78d5/docs/diario/execucoes/2026-11-17--manut-h-cancelar-envio-e-nota--LOG_DE_EXECUCAO.md` | LOG DE EXECUÇÃO (auditoria, append-only) — frente H · cancelar-envio-e-nota | H · Cancelamento: envio, validação e nota |
| `2026-11-17--manut-k-frete-mais-4-reais--MD_EXECUCAO__WORKTREE_frete.md` | `.claude/worktrees/manut-frete-mais-4-c9a96a/docs/diario/execucoes/2026-11-17--manut-k-frete-mais-4-reais--MD_EXECUCAO.md` | MD de execução — frente K (frete-mais-4-reais) — Real Olímpico | K · Frete: acréscimo de R$ 4,00 |
| `2026-11-18--manut-c-emails--TAREFAS_QUE_DEPENDEM_DO_ENVIO--PLANO__WORKTREE_emails.md` | `.claude/worktrees/manut-emails-de-movimentacao-c46333/docs/diario/execucoes/2026-11-18--manut-c-emails--TAREFAS_QUE_DEPENDEM_DO_ENVIO--PLANO.md` | Tarefas e features que dependem do envio automático de e-mail | C · E-mails de confirmação de compra e movimentação |

<!-- m22:ini -->
## Manutenção 22-11 e QA Davi (22/11/2026) [central-22/11]

MD de execução de cada chat de hoje; o original em `docs/diario/execucoes/` é o que vale (cada RETOMADA aponta para ele). Cópia em `manutencao-22-11/`.

| Arquivo (cópia aqui) | Caminho original (manda) | O que é | Tarefa |
|---|---|---|---|
| `2026-11-22--manut2-t1-financeiro--MD_EXECUCAO.md` | `docs/diario/execucoes/2026-11-22--manut2-t1-financeiro--MD_EXECUCAO.md` | Manutenção 22-11 · T1 Financeiro e saldos — MD de execução | Manutenção 22-11 (T1–T6) e QA Davi (R1–R4) |
| `2026-11-22--manut2-t2-isencao--MD_EXECUCAO.md` | `docs/diario/execucoes/2026-11-22--manut2-t2-isencao--MD_EXECUCAO.md` | MD de execução — Manutenção 22-11 / T2 Isenção Áurea e PJ | Manutenção 22-11 (T1–T6) e QA Davi (R1–R4) |
| `2026-11-22--manut2-t3-balcao--MD_EXECUCAO.md` | `docs/diario/execucoes/2026-11-22--manut2-t3-balcao--MD_EXECUCAO.md` | MD de execução / Manutenção 22-11 · T3 Balcão: vídeos, peso, caixas e hashes | Manutenção 22-11 (T1–T6) e QA Davi (R1–R4) |
| `2026-11-22--manut2-t3-reverso-posicoes.cjs.txt` | `docs/diario/execucoes/2026-11-22--manut2-t3-reverso-posicoes.cjs.txt` | 2026-11-22--manut2-t3-reverso-posicoes.cjs.txt | Manutenção 22-11 (T1–T6) e QA Davi (R1–R4) |
| `2026-11-22--manut2-t4-docx--MD_EXECUCAO.md` | `docs/diario/execucoes/2026-11-22--manut2-t4-docx--MD_EXECUCAO.md` | MD de execução / Manutenção 22-11 · T4 Pendências do docx (N1) | Manutenção 22-11 (T1–T6) e QA Davi (R1–R4) |
| `2026-11-22--manut2-t5-kpis--MD_EXECUCAO.md` | `docs/diario/execucoes/2026-11-22--manut2-t5-kpis--MD_EXECUCAO.md` | MD de execução — Manutenção 22-11 / T5 KPIs do conselho | Manutenção 22-11 (T1–T6) e QA Davi (R1–R4) |
| `2026-11-22--manut2-t6-pwa--MD_EXECUCAO.md` | `docs/diario/execucoes/2026-11-22--manut2-t6-pwa--MD_EXECUCAO.md` | Manutenção 22-11 / T6 PWA iPhone e login Google no app — MD de execução | Manutenção 22-11 (T1–T6) e QA Davi (R1–R4) |
| `2026-11-22--qa-r1-seguranca--MD_EXECUCAO.md` | `docs/diario/execucoes/2026-11-22--qa-r1-seguranca--MD_EXECUCAO.md` | MD de execução — QA Davi 22-11 / R1 Segurança e dados | Manutenção 22-11 (T1–T6) e QA Davi (R1–R4) |
| `2026-11-22--qa-r2-cadastro--MD_EXECUCAO.md` | `docs/diario/execucoes/2026-11-22--qa-r2-cadastro--MD_EXECUCAO.md` | QA Davi 22-11 / R2 Cadastro e conta — MD de execução | Manutenção 22-11 (T1–T6) e QA Davi (R1–R4) |
| `2026-11-22--qa-r3-dinheiro--MD_EXECUCAO.md` | `docs/diario/execucoes/2026-11-22--qa-r3-dinheiro--MD_EXECUCAO.md` | QA Davi 22-11 / R3 Dinheiro e formulários / Execução — 22/11/2026 | Manutenção 22-11 (T1–T6) e QA Davi (R1–R4) |
| `2026-11-22--qa-r4-textos--MD_EXECUCAO.md` | `docs/diario/execucoes/2026-11-22--qa-r4-textos--MD_EXECUCAO.md` | MD de execução — QA Davi 22-11 · R4 Texto legal e usabilidade (22/11/2026) | Manutenção 22-11 (T1–T6) e QA Davi (R1–R4) |
<!-- m22:fim -->

## Atualização 22/11/2026 (21:55)
Novo: `PENDENCIAS_DO_SISTEMA.md` (validação de CPF por API — não aprovada; pergunta nº 21 ao contador). `manutencao-22-11/2026-11-22--qa-r2-cadastro--MD_EXECUCAO.md` ganhou a decisão final do B02 (conta nasce confirmada, revertido em 91cccf2).

## Atualização 22/11/2026 (22:20)
Commits do dia depois do B02: 3219429 (cookies/Termos 2.3), 0a9deae (tutorial), 3734866 (plural), 978bc60 (Google/aceite), e86252d (achados do Tester).
