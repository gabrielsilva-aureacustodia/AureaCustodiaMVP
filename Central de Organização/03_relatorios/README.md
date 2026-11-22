# Relatórios: o que foi feito, e a que tarefa e a que arquivo do repositório se ligam

Três famílias. **(a) Manutenção 17–18/11:** para cada frente há cinco relatórios (`RELATORIO_EXECUCOES` e o resumo = ordem real, arquivos, testes, bloqueios; `RELATORIO_FEATURES` = linguagem de negócio "agora o usuário consegue"; `RELATORIO_MODIFICACOES` e o resumo = mudanças estruturais no código), todos em `manutencao-2026-11--relatorios-por-frente/`, mais as análises e estudos (caso Rogério, extrato × saldo, custo de e-mail, armazenamento de vídeos, reautenticação). **(b) Ondas de setembro** (agentes A/B/C de login/landing, banco/pagamentos, admin/Correios; E1–E8; publicação): subpastas `ondas-*`. **(c) Auditorias e check-ups** de 03/09 e 30/10. Relação com o código por frente (de `docs/INDICE_VEGA.md`, seção 6): A → `src/server/auth/reautenticacao*.ts`, `src/components/seguranca/`; B → `PlanoCustodia.protocoloEnvio`, `faturasDoEnvio`; C → `src/server/emails/`, migration 053; D → cadastro/Google; E → `docs/pwa/`; F → `src/domain/statement.ts`; G → `src/app/(app)/conta/notas/`, `src/server/nfse/consulta.ts`; H → `src/domain/cancelar-envio.ts`, `domain/envios.ts`, migration 056; I → recibo (`src/components/recibo/`); J → `src/domain/kpis.ts`, `src/server/admin/marketing.ts`, migration 057; K → `src/lib/shipping/acrescimo*.ts`; L → `scripts/medir-armazenamento.mjs`.

**72 arquivos.** Todos são **cópias**: o original continua no lugar e é o que vale (o bloco RETOMADA de cada chat aponta o caminho antigo; mover quebraria isso). Se a cópia e o original divergirem, vale o original.

### `auditorias-e-checkups/` (6 arquivos)

| Arquivo | Caminho original (manda) | O que é | Tarefa |
|---|---|---|---|
| `2026-10-30--auditoria-final-sistema.md` | `docs/auditorias/2026-10-30--auditoria-final-sistema.md` | Auditoria final do sistema (30/10/2026) |  |
| `2026-10-30--checkup-2.md` | `docs/auditorias/2026-10-30--checkup-2.md` | Check-up 2 — 30/10/2026 (ordem 7) |  |
| `2026-10-30--conferencia-usuarios.md` | `docs/auditorias/2026-10-30--conferencia-usuarios.md` | Conferência por usuário (30/10/2026) — NÃO EXECUTADA |  |
| `2026-10-30--integracoes-gov-correios.md` | `docs/auditorias/2026-10-30--integracoes-gov-correios.md` | Auditoria das integrações Gov e Correios (30/10/2026) |  |
| `RELATORIO-Guilherme.md` | `docs/alteracoes/RELATORIO-Guilherme.md` | Relatório de alterações — Guilherme |  |
| `RELATORIO_CHECKUP.md` | `docs/checkup/RELATORIO_CHECKUP.md` | Relatório do check-up final — Real Olímpico (30/10/2026) |  |

### `manutencao-2026-11--analises-e-estudos/` (5 arquivos)

| Arquivo | Caminho original (manda) | O que é | Tarefa |
|---|---|---|---|
| `2026-11-17--manut-h-cancelar-envio-e-nota--CASO_ROGERIO.md` | `docs/diario/execucoes/2026-11-17--manut-h-cancelar-envio-e-nota--CASO_ROGERIO.md` | Caso do Rogério — nota de R$ 30 do envio que não foi postado (frente H, 17/11/2026) | H · Cancelamento: envio, validação e nota |
| `2026-11-18--manut-f-extrato-igual-ao-saldo--ANALISE_EXTRATO_X_SALDO.md` | `docs/diario/execucoes/2026-11-18--manut-f-extrato-igual-ao-saldo--ANALISE_EXTRATO_X_SALDO.md` | Análise — o extrato do cliente × o saldo da conta (frente F, item 15 do Rogério) | F · Extrato igual ao saldo |
| `ESTUDO_REAUTENTICACAO.md` | `docs/diario/execucoes/ESTUDO_REAUTENTICACAO.md` | Estudo — pedir a senha de novo nas ações que mexem em dinheiro e em dados |  |
| `PESQUISA_CUSTO_EMAIL.md` | `docs/diario/execucoes/PESQUISA_CUSTO_EMAIL.md` | Custo de e-mail — Real Olímpico (frente C, tópico T1) |  |
| `RELATORIO_ARMAZENAMENTO_VIDEOS.md` | `docs/RELATORIO_ARMAZENAMENTO_VIDEOS.md` | Relatório — espaço e custo do armazenamento dos vídeos de autenticidade |  |

### `manutencao-2026-11--relatorios-por-frente/` (35 arquivos)

| Arquivo | Caminho original (manda) | O que é | Tarefa |
|---|---|---|---|
| `2026-11-17--manut-a-seguranca-senha--RELATORIO_EXECUCOES.md` | `docs/diario/execucoes/2026-11-17--manut-a-seguranca-senha--RELATORIO_EXECUCOES.md` | Relatório de Execuções (detalhado) — frente A · segurança: senha nas ações sensíveis | A · Segurança: confirmação por senha nas ações sensíveis |
| `2026-11-17--manut-a-seguranca-senha--RELATORIO_EXECUCOES_RESUMO.md` | `docs/diario/execucoes/2026-11-17--manut-a-seguranca-senha--RELATORIO_EXECUCOES_RESUMO.md` | Relatório de Execuções — resumo · frente A (segurança) | A · Segurança: confirmação por senha nas ações sensíveis |
| `2026-11-17--manut-a-seguranca-senha--RELATORIO_FEATURES.md` | `docs/diario/execucoes/2026-11-17--manut-a-seguranca-senha--RELATORIO_FEATURES.md` | Relatório de Features / Correções — frente A (segurança) | A · Segurança: confirmação por senha nas ações sensíveis |
| `2026-11-17--manut-a-seguranca-senha--RELATORIO_MODIFICACOES.md` | `docs/diario/execucoes/2026-11-17--manut-a-seguranca-senha--RELATORIO_MODIFICACOES.md` | Relatório de Modificações (detalhado) — frente A (segurança) | A · Segurança: confirmação por senha nas ações sensíveis |
| `2026-11-17--manut-a-seguranca-senha--RELATORIO_MODIFICACOES_RESUMO.md` | `docs/diario/execucoes/2026-11-17--manut-a-seguranca-senha--RELATORIO_MODIFICACOES_RESUMO.md` | Relatório de Modificações — resumo · frente A (segurança) | A · Segurança: confirmação por senha nas ações sensíveis |
| `2026-11-17--manut-b-primeiro-mes-no-envio--RELATORIO_EXECUCOES.md` | `docs/diario/execucoes/2026-11-17--manut-b-primeiro-mes-no-envio--RELATORIO_EXECUCOES.md` | Relatório de Execuções (detalhado) — frente B · primeiro-mes-no-envio | B · Cobrança: 1º mês de custódia no envio |
| `2026-11-17--manut-b-primeiro-mes-no-envio--RELATORIO_EXECUCOES_RESUMO.md` | `docs/diario/execucoes/2026-11-17--manut-b-primeiro-mes-no-envio--RELATORIO_EXECUCOES_RESUMO.md` | Relatório de Execuções (resumo) — frente B | B · Cobrança: 1º mês de custódia no envio |
| `2026-11-17--manut-b-primeiro-mes-no-envio--RELATORIO_FEATURES.md` | `docs/diario/execucoes/2026-11-17--manut-b-primeiro-mes-no-envio--RELATORIO_FEATURES.md` | Relatório de Features / Correções — frente B (para o negócio) | B · Cobrança: 1º mês de custódia no envio |
| `2026-11-17--manut-b-primeiro-mes-no-envio--RELATORIO_MODIFICACOES.md` | `docs/diario/execucoes/2026-11-17--manut-b-primeiro-mes-no-envio--RELATORIO_MODIFICACOES.md` | Relatório de Modificações (detalhado) — frente B | B · Cobrança: 1º mês de custódia no envio |
| `2026-11-17--manut-b-primeiro-mes-no-envio--RELATORIO_MODIFICACOES_RESUMO.md` | `docs/diario/execucoes/2026-11-17--manut-b-primeiro-mes-no-envio--RELATORIO_MODIFICACOES_RESUMO.md` | Relatório de Modificações (resumo) — frente B | B · Cobrança: 1º mês de custódia no envio |
| `2026-11-17--manut-c-emails-de-movimentacao--RELATORIO_EXECUCOES.md` | `docs/diario/execucoes/2026-11-17--manut-c-emails-de-movimentacao--RELATORIO_EXECUCOES.md` | Relatório de Execuções — frente C (e-mails de movimentação) | C · E-mails de confirmação de compra e movimentação |
| `2026-11-17--manut-c-emails-de-movimentacao--RELATORIO_EXECUCOES_RESUMO.md` | `docs/diario/execucoes/2026-11-17--manut-c-emails-de-movimentacao--RELATORIO_EXECUCOES_RESUMO.md` | 2026-11-17--manut-c-emails-de-movimentacao--RELATORIO_EXECUCOES_RESUMO.md | C · E-mails de confirmação de compra e movimentação |
| `2026-11-17--manut-c-emails-de-movimentacao--RELATORIO_FEATURES.md` | `docs/diario/execucoes/2026-11-17--manut-c-emails-de-movimentacao--RELATORIO_FEATURES.md` | 2026-11-17--manut-c-emails-de-movimentacao--RELATORIO_FEATURES.md | C · E-mails de confirmação de compra e movimentação |
| `2026-11-17--manut-c-emails-de-movimentacao--RELATORIO_MODIFICACOES.md` | `docs/diario/execucoes/2026-11-17--manut-c-emails-de-movimentacao--RELATORIO_MODIFICACOES.md` | Relatório de Modificações — frente C · base 9e21fe1 | C · E-mails de confirmação de compra e movimentação |
| `2026-11-17--manut-c-emails-de-movimentacao--RELATORIO_MODIFICACOES_RESUMO.md` | `docs/diario/execucoes/2026-11-17--manut-c-emails-de-movimentacao--RELATORIO_MODIFICACOES_RESUMO.md` | 2026-11-17--manut-c-emails-de-movimentacao--RELATORIO_MODIFICACOES_RESUMO.md | C · E-mails de confirmação de compra e movimentação |
| `2026-11-17--manut-d-cadastro-google--RELATORIO_EXECUCOES.md` | `docs/diario/execucoes/2026-11-17--manut-d-cadastro-google--RELATORIO_EXECUCOES.md` | Relatório de Execuções (detalhado) — frente D · Cadastro: Google primeiro e demonstração | D · Cadastro: Google primeiro e demonstração |
| `2026-11-17--manut-d-cadastro-google--RELATORIO_EXECUCOES_RESUMO.md` | `docs/diario/execucoes/2026-11-17--manut-d-cadastro-google--RELATORIO_EXECUCOES_RESUMO.md` | Relatório de Execuções (resumo) — frente D | D · Cadastro: Google primeiro e demonstração |
| `2026-11-17--manut-d-cadastro-google--RELATORIO_FEATURES.md` | `docs/diario/execucoes/2026-11-17--manut-d-cadastro-google--RELATORIO_FEATURES.md` | Relatório de Features / Correções — frente D | D · Cadastro: Google primeiro e demonstração |
| `2026-11-17--manut-d-cadastro-google--RELATORIO_MODIFICACOES.md` | `docs/diario/execucoes/2026-11-17--manut-d-cadastro-google--RELATORIO_MODIFICACOES.md` | Relatório de Modificações (detalhado) — frente D | D · Cadastro: Google primeiro e demonstração |
| `2026-11-17--manut-d-cadastro-google--RELATORIO_MODIFICACOES_RESUMO.md` | `docs/diario/execucoes/2026-11-17--manut-d-cadastro-google--RELATORIO_MODIFICACOES_RESUMO.md` | Relatório de Modificações (resumo) — frente D | D · Cadastro: Google primeiro e demonstração |
| `2026-11-17--manut-e-pwa-iphone--RELATORIO_EXECUCOES.md` | `docs/diario/execucoes/2026-11-17--manut-e-pwa-iphone--RELATORIO_EXECUCOES.md` | 2026-11-17--manut-e-pwa-iphone--RELATORIO_EXECUCOES.md | E · App: PWA funcionando no iPhone |
| `2026-11-17--manut-e-pwa-iphone--RELATORIO_EXECUCOES_RESUMO.md` | `docs/diario/execucoes/2026-11-17--manut-e-pwa-iphone--RELATORIO_EXECUCOES_RESUMO.md` | 2026-11-17--manut-e-pwa-iphone--RELATORIO_EXECUCOES_RESUMO.md | E · App: PWA funcionando no iPhone |
| `2026-11-17--manut-e-pwa-iphone--RELATORIO_FEATURES.md` | `docs/diario/execucoes/2026-11-17--manut-e-pwa-iphone--RELATORIO_FEATURES.md` | 2026-11-17--manut-e-pwa-iphone--RELATORIO_FEATURES.md | E · App: PWA funcionando no iPhone |
| `2026-11-17--manut-e-pwa-iphone--RELATORIO_MODIFICACOES.md` | `docs/diario/execucoes/2026-11-17--manut-e-pwa-iphone--RELATORIO_MODIFICACOES.md` | 2026-11-17--manut-e-pwa-iphone--RELATORIO_MODIFICACOES.md | E · App: PWA funcionando no iPhone |
| `2026-11-17--manut-e-pwa-iphone--RELATORIO_MODIFICACOES_RESUMO.md` | `docs/diario/execucoes/2026-11-17--manut-e-pwa-iphone--RELATORIO_MODIFICACOES_RESUMO.md` | 2026-11-17--manut-e-pwa-iphone--RELATORIO_MODIFICACOES_RESUMO.md | E · App: PWA funcionando no iPhone |
| `2026-11-17--manut-h-cancelar-envio-e-nota--RELATORIO_EXECUCOES.md` | `docs/diario/execucoes/2026-11-17--manut-h-cancelar-envio-e-nota--RELATORIO_EXECUCOES.md` | Relatório de Execuções (detalhado) — frente H · cancelar-envio-e-nota | H · Cancelamento: envio, validação e nota |
| `2026-11-17--manut-h-cancelar-envio-e-nota--RELATORIO_EXECUCOES_RESUMO.md` | `docs/diario/execucoes/2026-11-17--manut-h-cancelar-envio-e-nota--RELATORIO_EXECUCOES_RESUMO.md` | Resumo de Execuções — frente H · cancelar-envio-e-nota | H · Cancelamento: envio, validação e nota |
| `2026-11-17--manut-h-cancelar-envio-e-nota--RELATORIO_FEATURES.md` | `docs/diario/execucoes/2026-11-17--manut-h-cancelar-envio-e-nota--RELATORIO_FEATURES.md` | Features / Correções — frente H · cancelar envio e nota | H · Cancelamento: envio, validação e nota |
| `2026-11-17--manut-h-cancelar-envio-e-nota--RELATORIO_MODIFICACOES.md` | `docs/diario/execucoes/2026-11-17--manut-h-cancelar-envio-e-nota--RELATORIO_MODIFICACOES.md` | Relatório de Modificações — frente H · cancelar-envio-e-nota | H · Cancelamento: envio, validação e nota |
| `2026-11-17--manut-h-cancelar-envio-e-nota--RELATORIO_MODIFICACOES_RESUMO.md` | `docs/diario/execucoes/2026-11-17--manut-h-cancelar-envio-e-nota--RELATORIO_MODIFICACOES_RESUMO.md` | Resumo de Modificações — frente H | H · Cancelamento: envio, validação e nota |
| `2026-11-17--manut-i-numero-da-moeda--RELATORIO_EXECUCOES.md` | `docs/diario/execucoes/2026-11-17--manut-i-numero-da-moeda--RELATORIO_EXECUCOES.md` | Relatório de Execuções (detalhado) — frente I · manut-numero-da-moeda | I · Recibo: número da moeda |
| `2026-11-17--manut-i-numero-da-moeda--RELATORIO_EXECUCOES_RESUMO.md` | `docs/diario/execucoes/2026-11-17--manut-i-numero-da-moeda--RELATORIO_EXECUCOES_RESUMO.md` | Relatório de Execuções (resumo) — frente I | I · Recibo: número da moeda |
| `2026-11-17--manut-i-numero-da-moeda--RELATORIO_FEATURES.md` | `docs/diario/execucoes/2026-11-17--manut-i-numero-da-moeda--RELATORIO_FEATURES.md` | Relatório de Features / Correções — frente I (pedido do Rogério, item 12) | I · Recibo: número da moeda |
| `2026-11-17--manut-i-numero-da-moeda--RELATORIO_MODIFICACOES.md` | `docs/diario/execucoes/2026-11-17--manut-i-numero-da-moeda--RELATORIO_MODIFICACOES.md` | Relatório de Modificações (detalhado) — frente I | I · Recibo: número da moeda |
| `2026-11-17--manut-i-numero-da-moeda--RELATORIO_MODIFICACOES_RESUMO.md` | `docs/diario/execucoes/2026-11-17--manut-i-numero-da-moeda--RELATORIO_MODIFICACOES_RESUMO.md` | Relatório de Modificações (resumo) — frente I | I · Recibo: número da moeda |

### `ondas-E1-E8/` (12 arquivos)

| Arquivo | Caminho original (manda) | O que é | Tarefa |
|---|---|---|---|
| `AG1_EXECUCAO.md` | `docs/execucao-pendencias/relatorios/AG1_EXECUCAO.md` | AG1 — Execução da bancada: cadastro sem envio |  |
| `AG2_EXECUCAO.md` | `docs/execucao-pendencias/relatorios/AG2_EXECUCAO.md` | AG2 — Compras e Vendas: nomes, ordem dos blocos e o bloco explicativo |  |
| `AG3_EXECUCAO.md` | `docs/execucao-pendencias/relatorios/AG3_EXECUCAO.md` | AG3 — A página Mercado nova, e o fim da página Gráficos |  |
| `E1.md` | `docs/execucao-pendencias/relatorios/E1.md` | E1 · Relatório |  |
| `E1_EXECUCAO.md` | `docs/execucao-pendencias/relatorios/E1_EXECUCAO.md` | E1 · Execução |  |
| `E2.md` | `docs/execucao-pendencias/relatorios/E2.md` | Relatório de Execução — E2: Cobrança e valor de entrada com a configuração vigente |  |
| `E3.md` | `docs/execucao-pendencias/relatorios/E3.md` | Relatório de Execução — E3 · Limpeza do painel antigo de relatórios |  |
| `E4.md` | `docs/execucao-pendencias/relatorios/E4.md` | E4 · Relatório — preço da custódia na tela e recibo bloqueado por pendência |  |
| `E4_EXECUCAO.md` | `docs/execucao-pendencias/relatorios/E4_EXECUCAO.md` | E4 · Execução |  |
| `E7.md` | `docs/execucao-pendencias/relatorios/E7.md` | Relatório de Execução · E7 — Documentação das Pendências |  |
| `E8.md` | `docs/execucao-pendencias/relatorios/E8.md` | Relatório da E8 — segunda onda: conciliação e rastreio |  |
| `README.md` | `docs/execucao-pendencias/relatorios/README.md` | `docs/execucao-pendencias/relatorios/` — relatórios de saída |  |

### `ondas-de-finalizacao-A-B-C/` (3 arquivos)

| Arquivo | Caminho original (manda) | O que é | Tarefa |
|---|---|---|---|
| `RELATORIO_AGENTE_A.md` | `docs/finalizacoes/RELATORIO_AGENTE_A.md` | Diário de Bordo — Agente A (Mercado e Termos) |  |
| `RELATORIO_AGENTE_B.md` | `docs/finalizacoes/RELATORIO_AGENTE_B.md` | Relatório de Execução — Agente B · Finalizações |  |
| `RELATORIO_AGENTE_C.md` | `docs/finalizacoes/RELATORIO_AGENTE_C.md` | Relatório da frente C — painel administrativo |  |

### `ondas-de-publicacao-A-B-C/` (4 arquivos)

| Arquivo | Caminho original (manda) | O que é | Tarefa |
|---|---|---|---|
| `RELATORIO_AGENTE_A.md` | `docs/publish_docs/RELATORIO_AGENTE_A.md` | Relatório do Agente A |  |
| `RELATORIO_AGENTE_B.md` | `docs/publish_docs/RELATORIO_AGENTE_B.md` | Relatório de Execução — Agente B |  |
| `RELATORIO_AGENTE_C.md` | `docs/publish_docs/RELATORIO_AGENTE_C.md` | Relatório do Agente C |  |
| `RELATORIO_EXECUCAO_PUBLICACAO.md` | `docs/publish_docs/RELATORIO_EXECUCAO_PUBLICACAO.md` | Relatório de Execução da Publicação — as três frentes na `main` |  |

### `relatorios-gerais/` (7 arquivos)

| Arquivo | Caminho original (manda) | O que é | Tarefa |
|---|---|---|---|
| `API_RELATORIOS.md` | `docs/API_RELATORIOS.md` | API de relatórios — o contrato |  |
| `CHECKUP_GERAL_03_09.md` | `docs/CHECKUP_GERAL_03_09.md` | Check-up geral do repositório — 03/09/2026 |  |
| `META_PIXEL_RELATORIO_2026-11-14.md` | `docs/META_PIXEL_RELATORIO_2026-11-14.md` | Pixel da Meta no Real Olímpico — o que foi criado, o que foi integrado e por quê |  |
| `RELATORIO_AUDITORIA_E_CORRECOES_BRANCH_C.md` | `docs/RELATORIO_AUDITORIA_E_CORRECOES_BRANCH_C.md` | Relatório de Auditoria e Correções — Frente C (Mercado Pago e Correios) |  |
| `RELATORIO_EXECUCAO_BRANCH_C_PAGAMENTOS_CORREIOS.md` | `docs/RELATORIO_EXECUCAO_BRANCH_C_PAGAMENTOS_CORREIOS.md` | Relatório de Execução — Branch C · Mercado Pago e Correios |  |
| `RELATORIO_FINAL_BRANCH_A_LOGIN_LANDING.md` | `docs/RELATORIO_FINAL_BRANCH_A_LOGIN_LANDING.md` | Relatório final — Branch A `feat/auth-landing` |  |
| `RELATORIO_FINAL_FRENTE_C_PAGAMENTOS_CORREIOS_AUDITORIA.md` | `docs/RELATORIO_FINAL_FRENTE_C_PAGAMENTOS_CORREIOS_AUDITORIA.md` | Relatório de Execução Final — Frente C: Gateway de Pagamentos, Correios & Auditoria Financeira |  |

<!-- m22:ini -->
## Relatórios de 22/11/2026 (QA do Davi, tester, auditoria, polimento, KPIs) [central-22/11]

Relatórios dos chats de hoje, ligados ao código e às decisões. Original manda.

| Arquivo (cópia aqui) | Caminho original (manda) | O que é | Tarefa |
|---|---|---|---|
| `RELATORIO_QA_DAVI_BEGO_texto.md` | `docs/manutencao-2026-11/relatorio-qa-davi/RELATORIO_QA_DAVI_BEGO_texto.md` | RELATORIO_QA_DAVI_BEGO_texto.md | Manutenção 22-11 / QA Davi / KPIs |
| `RELATORIO_STATUS_QA_DAVI_22-11.md` | `docs/manutencao-2026-11/garantias/RELATORIO_STATUS_QA_DAVI_22-11.md` | Relatório de status / QA do Davi Bego (22/11/2026) | Manutenção 22-11 / QA Davi / KPIs |
| `AUDITORIA_QA_DAVI_22-11.md` | `docs/manutencao-2026-11/garantias/AUDITORIA_QA_DAVI_22-11.md` | Auditoria QA Davi 22-11 (só leitura) | Manutenção 22-11 / QA Davi / KPIs |
| `TESTER_22-11.md` | `docs/manutencao-2026-11/garantias/TESTER_22-11.md` | TESTER — validação no ar, 22/11/2026 | Manutenção 22-11 / QA Davi / KPIs |
| `POLIMENTO_QA_DAVI_22-11.md` | `docs/manutencao-2026-11/garantias/POLIMENTO_QA_DAVI_22-11.md` | Polimento (Distilla) / QA Davi 22-11 | Manutenção 22-11 / QA Davi / KPIs |
| `INCIDENTE_B01_22-11.md` | `docs/manutencao-2026-11/garantias/INCIDENTE_B01_22-11.md` | Incidente B01 — dados de todos os clientes no código das páginas logadas | Manutenção 22-11 / QA Davi / KPIs |
| `A09_PROPOSTA_BANNER_COOKIES.md` | `docs/manutencao-2026-11/garantias/A09_PROPOSTA_BANNER_COOKIES.md` | A09 — proposta de texto do banner de cookies (NÃO LIGADA) | Manutenção 22-11 / QA Davi / KPIs |
| `TERMOS_CLAUSULAS_PARA_O_JURIDICO.md` | `docs/manutencao-2026-11/garantias/TERMOS_CLAUSULAS_PARA_O_JURIDICO.md` | Termos e Política — pontos para o jurídico decidir (QA Davi, B08/A13) | Manutenção 22-11 / QA Davi / KPIs |
| `TERMOS_v2.2_PATCH_AGUARDANDO_APROVACAO.diff` | `docs/manutencao-2026-11/garantias/TERMOS_v2.2_PATCH_AGUARDANDO_APROVACAO.diff` | TERMOS_v2.2_PATCH_AGUARDANDO_APROVACAO.diff | Manutenção 22-11 / QA Davi / KPIs |
| `PENDENCIAS_DE_DADOS_E_AUTOMACOES.md` | `docs/kpis/PENDENCIAS_DE_DADOS_E_AUTOMACOES.md` | KPIs do conselho — respostas, o que ficou sem cálculo e o que falta | Manutenção 22-11 / QA Davi / KPIs |
<!-- m22:fim -->
