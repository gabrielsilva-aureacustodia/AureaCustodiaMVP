# Pendências abertas — o índice único

```
Conferido em:  18/09/2026, na main 7368d21 (antes: 15/09, na 116ecf7)
Fontes:        publish_docs/PENDENCIAS_MANUAIS_AGENTE_A.md · _B.md · _C.md
               finalizacoes/PENDENCIAS_AGENTE_B.md · finalizacoes/PENDENCIAS_AGENTE_C.md
               ../RISCOS_ASSUMIDOS.md (RA-24, RA-43 a RA-53)
Provas:        npm run db:check · vercel env ls production · git log · curl na produção
Regra:         quem fecha um item marca ✅ no arquivo de origem E move a linha para
               "Resolvidas" aqui, no mesmo commit. ID nunca é reaproveitado.
Execução:      o que é de navegador virou roteiro para o Claude Cowork em docs/cowork/
```

> **Para o Rogério.** Este é o painel único de tudo o que ainda falta fazer no sistema da Áurea. A maior parte das tarefas técnicas está sendo concluída de forma automatizada pelas frentes de desenvolvimento paralelas (E1 a E6). O que resta sob responsabilidade direta dos sócios são configurações manuais e decisões de negócio — sendo a principal delas a ativação definitiva das chaves de produção do Mercado Pago na Vercel (item B-7), que ligará o recebimento real de pagamentos.

## 1. Com o Gabriel e os sócios

| ID | O que falta | Quem | O que fica esperando | Como conferir | Fonte |
|---|---|---|---|---|---|
| B-7 | Cadastrar na Vercel (Production) `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET` e `MP_SANDBOX`; webhook de produção; Redeploy. **Roteiro detalhado para o Cowork:** [`cowork/01_MERCADO_PAGO_PRODUCAO.md`](cowork/01_MERCADO_PAGO_PRODUCAO.md) (valores copiados do painel do Mercado Pago, fora do repositório). `NEXT_PUBLIC_APP_URL` **já foi cadastrada em 18/09** | Cowork, com pausas do Gabriel | Cobrança real por Pix e cartão; hoje cai no simulador | Aba Integrações diz `Modo: produção (MP_SANDBOX=false).`; depósito de R$ 1,00 abre o QR do Mercado Pago (sem credencial, abre o simulador); `vercel env ls production` lista as três | [`publish_docs/PENDENCIAS_MANUAIS_AGENTE_B.md`](publish_docs/PENDENCIAS_MANUAIS_AGENTE_B.md) (B-7) |
| B-8 | Decidir se a Áurea absorve os juros do parcelamento | Gabriel e Rogério | Texto do checkout ("sem acréscimo" ou com acréscimo) | Decisão escrita; se absorver, opção ligada no painel do Mercado Pago (Tarefa A de [`cowork/03_TAREFAS_CURTAS.md`](cowork/03_TAREFAS_CURTAS.md)) | [`publish_docs/PENDENCIAS_MANUAIS_AGENTE_B.md`](publish_docs/PENDENCIAS_MANUAIS_AGENTE_B.md) (B-8) e [`finalizacoes/PENDENCIAS_AGENTE_B.md`](finalizacoes/PENDENCIAS_AGENTE_B.md) seção 3 |
| N-01 | Criar `CRON_SECRET` na Vercel (Production) e fazer Redeploy. **O valor já foi gerado em 18/09 e o comando está pronto para colar** — a sessão do Claude Code não pode gravar segredo na Vercel (permissão do modo automático). **Aviso:** com a variável, o faturamento mensal passa a gerar e debitar faturas de custódia (inclusive nas contas de teste dos sócios); a E4 isenta as contas da equipe do bloqueio por pendência | Gabriel (um comando) | Rastreio diário e faturamento de custódia do dia 1 respondem 401 em produção (`src/app/api/cron/faturamento/route.ts:18-22`, `shipping/route.ts:26-30`) | `vercel env ls production` lista `CRON_SECRET`; aba Integrações mostra "Tarefas agendadas" ligada; `/api/cron/shipping` com o Bearer certo responde 200 | achado da E7 em 15/09 (sem arquivo de origem) |
| N-02 | Cadastrar `AUREA_RELATORIOS_TOKEN` na Vercel (Production). Valor gerado em 18/09, comando pronto para colar | Gabriel (um comando) | Leitura dos relatórios por chave (Excel, Google Sheets). Hoje os relatórios só abrem pela sessão de quem está no painel | Aba Integrações mostra "Relatórios por API e Google Sheets" ligada | conferido em 18/09 por `vercel env ls production` |
| P-C2-02 | Escolher o provedor de WhatsApp e ligar o atendimento (Evolution: servidor, instância `aurea-cs`, webhook, quatro variáveis) | Gabriel decide; Cowork executa | Mensagens de verdade em `/admin/cs` e o número em `/suporte` (P-C2-06) | [`cowork/04_WHATSAPP_EVOLUTION.md`](cowork/04_WHATSAPP_EVOLUTION.md) | [`finalizacoes/PENDENCIAS_AGENTE_C.md`](finalizacoes/PENDENCIAS_AGENTE_C.md) (P-C2-02) |
| P-C1-02 | Conferir logado as quatro telas da Central de Resultados | Cowork | Nada trava; é a prova visual | Seção 2 de [`cowork/02_QA_PAINEL_LOGADO.md`](cowork/02_QA_PAINEL_LOGADO.md) | [`finalizacoes/PENDENCIAS_AGENTE_C.md`](finalizacoes/PENDENCIAS_AGENTE_C.md) (P-C1-02) |
| P-C3-02 | Conferir logado bancada, moedas, logística e configuração | Cowork | Nada trava | Seção 3 de [`cowork/02_QA_PAINEL_LOGADO.md`](cowork/02_QA_PAINEL_LOGADO.md) | [`finalizacoes/PENDENCIAS_AGENTE_C.md`](finalizacoes/PENDENCIAS_AGENTE_C.md) (P-C3-02) |
| P-M-01 | Conferir logado `/inicio`, `/mercado`, `/admin/resultados/financeiro`, `/admin/usuarios` | Cowork | Nada trava | Seção 1 de [`cowork/02_QA_PAINEL_LOGADO.md`](cowork/02_QA_PAINEL_LOGADO.md) | [`finalizacoes/PENDENCIAS_AGENTE_C.md`](finalizacoes/PENDENCIAS_AGENTE_C.md) (P-M-01) |

## 2. Em execução nas branches de 15/09

Estado anterior aos merges de E1 a E6. A integração passa cada linha para a seção 4 no mesmo commit do merge da E7, que é mesclada por último.

| ID | O que falta | Branch | Riscos ligados | Fonte |
|---|---|---|---|---|
| P-C2-04 | Conta desativada recusada no login do catálogo, no login Supabase, no callback e na sessão já aberta | em execução na E1 (`exec/e1-portas-de-entrada-da-conta`) | RA-44 | [`finalizacoes/PENDENCIAS_AGENTE_C.md`](finalizacoes/PENDENCIAS_AGENTE_C.md) |
| P-C2-05 | Tela de nova senha no link de recuperação | em execução na E1 | RA-43 | [`finalizacoes/PENDENCIAS_AGENTE_C.md`](finalizacoes/PENDENCIAS_AGENTE_C.md) |
| P-C2-09 | `settings.legalAcceptance` apagado na gravação do Postgres (`src/server/db/diff.ts`) | em execução na E1 | — | [`finalizacoes/PENDENCIAS_AGENTE_C.md`](finalizacoes/PENDENCIAS_AGENTE_C.md) |
| P-C3-03 | Compra direta pelo gateway e valor de entrada da análise com a tabela e o catálogo vigentes | em execução na E2 (`exec/e2-cobranca-com-configuracao-vigente`) | RA-24, RA-47 | [`finalizacoes/PENDENCIAS_AGENTE_C.md`](finalizacoes/PENDENCIAS_AGENTE_C.md) |
| P-C1-03 | Remover o painel antigo de relatórios | em execução na E3 (`exec/e3-limpeza-relatorios-antigos`) | — | [`finalizacoes/PENDENCIAS_AGENTE_C.md`](finalizacoes/PENDENCIAS_AGENTE_C.md) |
| A-4 | Preço de custódia informado ao cliente | em execução na E4 (`exec/e4-custodia-preco-e-inadimplencia`) | — | [`publish_docs/PENDENCIAS_MANUAIS_AGENTE_A.md`](publish_docs/PENDENCIAS_MANUAIS_AGENTE_A.md) |
| B-2 | Recibo bloqueado por inadimplência na retirada e na venda | em execução na E4 | — | [`publish_docs/PENDENCIAS_MANUAIS_AGENTE_B.md`](publish_docs/PENDENCIAS_MANUAIS_AGENTE_B.md) |
| QA-C1C2 | Análise, testes e melhorias de `/painel`, `/admin`, resultados, equipe, CS, usuários | E5 `exec/e5-qa-painel-resultados-equipe-cs-usuarios` | RA-40, RA-41, RA-42, RA-48 | plano da E5 |
| QA-C3 | Análise, testes e melhorias de bancada, moedas, logística, configuração | E6 `exec/e6-qa-painel-bancada-moedas-logistica-configuracao` | RA-45, RA-46 | plano da E6 |

## 3. Para a integração atualizar nos arquivos de origem

| Onde | O que mudou | Prova |
|---|---|---|
| P-C1-02, passo 4 | `/admin` sem acesso manda para `/painel`, não para `/inicio` | `src/server/admin/acesso.ts:113,128,130` (commit `40bb8c8`) |
| P-C1-02, "Se quiser usar o e-mail real" | O e-mail do Gabriel já é `dev` pelo código | `EMAILS_FIXOS_DA_EQUIPE`, `src/domain/admin/permissoes.ts:185` (RA-48) |
| P-C2-03 | `SUPABASE_SERVICE_ROLE_KEY` e `SUPABASE_URL` existem em Production; falta só olhar a aba Cadastro (passo 4 de [`execucao-pendencias/TUTORIAL_MANUAL_GABRIEL.md`](execucao-pendencias/TUTORIAL_MANUAL_GABRIEL.md)) | `vercel env ls production` em 15/09 |
| P-C3-01 | 024 e 025 aplicadas | `npm run db:check` em 15/09 |

## 4. Resolvidas — com a prova

| ID | Resolvida em | Prova | Fonte |
|---|---|---|---|
| P-M-02 (atualizar a pasta principal) | 18/09 | `git log --oneline -1` em `C:\dev\AureaCustodiaMVP` dá `7368d21`, o mesmo de `origin/main`; `git rev-list --count origin/main..main` = 0 | [`finalizacoes/PENDENCIAS_AGENTE_C.md`](finalizacoes/PENDENCIAS_AGENTE_C.md) (P-M-02) |
| `NEXT_PUBLIC_APP_URL` ausente (parte do B-7) | 18/09 | `vercel env ls production` lista a variável; sem ela o Checkout Pro devolvia o cliente para `http://localhost:3000` (`src/lib/payments/cobranca.ts:140`) | conferido nesta sessão |
| B-1, B-3, B-4, B-5 | 11/09 | 007, 008, 009, 010 no `db:check` de 15/09; `CHECKUP_11_09_2026.md` seção 1 | [`publish_docs/PENDENCIAS_MANUAIS_AGENTE_B.md`](publish_docs/PENDENCIAS_MANUAIS_AGENTE_B.md) |
| B-6 e seção 1 de `finalizacoes/PENDENCIAS_AGENTE_B.md` | 14/09 | 017, 018, 019 no `db:check`; `RELATORIO_AGENTE_C.md` "Banco de produção e publicação" | [`publish_docs/PENDENCIAS_MANUAIS_AGENTE_B.md`](publish_docs/PENDENCIAS_MANUAIS_AGENTE_B.md) e [`finalizacoes/PENDENCIAS_AGENTE_B.md`](finalizacoes/PENDENCIAS_AGENTE_B.md) |
| C-1, C-2 | 11/09 | 011, 012 no `db:check` | [`publish_docs/PENDENCIAS_MANUAIS_AGENTE_C.md`](publish_docs/PENDENCIAS_MANUAIS_AGENTE_C.md) |
| D-2 | 11/09 (decisão) | `PLANO_EXECUTIVO_PUBLICACAO.md` seção 5; commit `2cc7194` | [`publish_docs/PENDENCIAS_MANUAIS_AGENTE_C.md`](publish_docs/PENDENCIAS_MANUAIS_AGENTE_C.md) |
| D-6 | 10/09 | `src/lib/shipping/correios.ts` (`ENDERECO_CENTRAL_AUREA`), commit `c0ad95f` | [`publish_docs/PENDENCIAS_MANUAIS_AGENTE_A.md`](publish_docs/PENDENCIAS_MANUAIS_AGENTE_A.md) e [`publish_docs/PENDENCIAS_MANUAIS_AGENTE_C.md`](publish_docs/PENDENCIAS_MANUAIS_AGENTE_C.md) |
| A-1, A-2, A-3 | 10/09 | já marcadas no arquivo | [`publish_docs/PENDENCIAS_MANUAIS_AGENTE_A.md`](publish_docs/PENDENCIAS_MANUAIS_AGENTE_A.md) |
| P-C1-01, P-C2-01 | 14/09 | já marcadas no arquivo; `db:check` | [`finalizacoes/PENDENCIAS_AGENTE_C.md`](finalizacoes/PENDENCIAS_AGENTE_C.md) |
| P-C2-06, P-C2-07 | 14/09 | já marcadas no arquivo (falta só o número, que depende do P-C2-02) | [`finalizacoes/PENDENCIAS_AGENTE_C.md`](finalizacoes/PENDENCIAS_AGENTE_C.md) |
| P-C3-01 | 14/09 | `db:check` (a marcar no arquivo pela integração) | [`finalizacoes/PENDENCIAS_AGENTE_C.md`](finalizacoes/PENDENCIAS_AGENTE_C.md) |

## 5. Informativos, sem ação

| ID | O que registra | Fonte |
|---|---|---|
| P-C1-04 | Gaveta `aurea_local_admin`: apagar é opcional (resíduo local sem impacto em produção) | [`finalizacoes/PENDENCIAS_AGENTE_C.md`](finalizacoes/PENDENCIAS_AGENTE_C.md) |
| P-C2-08 | Resíduo de teste de login e perfis | [`finalizacoes/PENDENCIAS_AGENTE_C.md`](finalizacoes/PENDENCIAS_AGENTE_C.md) |
| P-C3-04 | Vídeo da bancada: as variáveis `SUPABASE_*` já estão configuradas em Production | [`finalizacoes/PENDENCIAS_AGENTE_C.md`](finalizacoes/PENDENCIAS_AGENTE_C.md) |
| P-M-03 | Migrations da frente B aplicadas em 14/09 antes do merge | [`finalizacoes/PENDENCIAS_AGENTE_C.md`](finalizacoes/PENDENCIAS_AGENTE_C.md) |
| B-Sec4 | Coordenação com demais frentes sobre `src/domain/fees.ts`, `retirada.ts` e `alimentarPlanoNaAnalise` | [`finalizacoes/PENDENCIAS_AGENTE_B.md`](finalizacoes/PENDENCIAS_AGENTE_B.md) |

## 6. Riscos registrados ligados a pendências

Risco registrado é anotação, não portão: nenhum RA abaixo é pré-requisito de publicação.

| RA | Resumo | Situação | Branch |
|---|---|---|---|
| RA-24 | Compra direta via gateway cobra comissão apenas do vendedor — temporário até B1.4 unificar | registrado | E2 (`exec/e2-cobranca-com-configuracao-vigente`) |
| RA-43 | Conta criada pelo painel com senha provisória, sem segundo fator e sem troca obrigatória; link de redefinição sem tela de nova senha | registrado | E1 (`exec/e1-portas-de-entrada-da-conta`) |
| RA-44 | Desativar conta bloqueia o login pelo Supabase; a entrada pelo catálogo e a sessão já aberta dependem da checagem da frente A | registrado | E1 (`exec/e1-portas-de-entrada-da-conta`) |
| RA-45 | Bancada web: sem gravação local nem retomada depois de recarregar a página; linha do painel fora da transação da análise; regra de peso copiada da rota | registrado | E6 (`exec/e6-qa-painel-bancada-moedas-logistica-configuracao`) |
| RA-46 | Taxa e prazo mudados no painel valem na hora, sem aviso prévio; a faixa pede aceite da versão nova sem bloquear operação; publicação do documento em transação separada | registrado | E6 (`exec/e6-qa-painel-bancada-moedas-logistica-configuracao`) |
| RA-47 | Leitura da configuração que falha cai no padrão do código, sem trava; a compra direta pelo gateway e a análise da estação ainda usam a tabela e o catálogo do código | registrado | E2 (`exec/e2-cobranca-com-configuracao-vigente`) |
| RA-48 | O e-mail do Gabriel está no código como `dev` do painel em qualquer ambiente, e a entrada `/painel` diz com qual conta a pessoa está | registrado | E5 (`exec/e5-qa-painel-resultados-equipe-cs-usuarios`) |

## 7. Outras listas vivas (apontadas, não copiadas)

- [`diario/CRITICAL_DEBUGS.md`](diario/CRITICAL_DEBUGS.md): histórico de defeitos conhecidos e correções críticas (CD-08, CD-12, CD-13).
- [`finalizacoes/2026-09-13_minuta_pontos_para_os_socios.md`](finalizacoes/2026-09-13_minuta_pontos_para_os_socios.md): respostas e definições dos sócios aos pontos levantados pelo advogado na minuta dos Termos.
- [`PRE_LANCAMENTO_CLIENTES_REAIS.md`](PRE_LANCAMENTO_CLIENTES_REAIS.md): checklist de requisitos que se tornam mandatórios na fase de clientes reais (não aplicável ao MVP de teste).
- [`EXECUCOES_MANUAIS_PENDENTES.md`](EXECUCOES_MANUAIS_PENDENTES.md): registro histórico de pendências manuais de 03/09/2026.
