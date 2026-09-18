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

> **Para o Rogério.** Este é o painel único de tudo o que ainda falta fazer no sistema da Áurea. **As frentes de desenvolvimento automatizadas terminaram**: E1, E2, E3, E4 e E7 já estão no site, e E5 e E6 foram canceladas porque aquela revisão já tinha sido feita antes. Falta uma frente técnica, a E8, que corrige a cobrança da comissão de quem compra pagando direto por Pix ou cartão. O resto está sob responsabilidade direta dos sócios: configurações manuais e decisões de negócio — sendo a principal a ativação das credenciais de produção do Mercado Pago (item B-7), que liga o recebimento real de pagamentos.

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

**Fechada em 18/09/2026.** E1, E2, E3, E4 e E7 foram mescladas e estão no `origin/main`; `git branch
--no-merged main` volta vazio. As linhas que estavam aqui foram para a seção 4.

**E5 e E6 foram canceladas** (decisão do Gabriel, 18/09/2026): eram rodadas de revisão e teste do painel,
e essa revisão já tinha sido feita em outros momentos. Os planos saíram do repositório — o histórico do
Git guarda as duas versões, se algum dia forem necessárias. A conferência visual que sobrou virou tarefa
do Cowork em [`cowork/02_QA_PAINEL_LOGADO.md`](cowork/02_QA_PAINEL_LOGADO.md). Os riscos que elas tratariam
(RA-40, RA-41, RA-42, RA-45, RA-46, RA-48) continuam registrados em `RISCOS_ASSUMIDOS.md`, sem dono.

### A única branch de código ainda por executar: E8

| ID | O que falta | Plano | Riscos ligados |
|---|---|---|---|
| E8 | Quatro acertos que dependiam de E2 e E4 estarem no ar: **(1)** a compra direta pelo gateway cobra do comprador só o preço do lote, e não a comissão que a tela mostra em "Total a pagar"; **(2)** a pendência de custódia não é reconferida quando o pagamento chega; **(3)** o rastreio diário dos Correios acompanha só as moedas que chegam, nunca as retiradas que saem; **(4)** a marca de inadimplência posta pela equipe some sozinha na próxima fatura | [`execucao-pendencias/E8_SEGUNDA_ONDA_CONCILIACAO_E_RASTREIO.md`](execucao-pendencias/E8_SEGUNDA_ONDA_CONCILIACAO_E_RASTREIO.md) | RA-24, RA-52, RA-53 |

Conferido em 18/09: `feeComprador: 0` continua fixo em `src/server/payments/conciliacao.ts:125`, a
migration 030 não existe (a última é a 026) e RA-24, RA-52 e RA-53 seguem 🟡 em `RISCOS_ASSUMIDOS.md`.

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
| P-C2-04, P-C2-05, P-C2-09 | 18/09 | Merge da E1 (`98e0c2f`); `git branch --no-merged main` vazio | [`finalizacoes/PENDENCIAS_AGENTE_C.md`](finalizacoes/PENDENCIAS_AGENTE_C.md) |
| P-C3-03 | 18/09 | Merge da E2 (`60dfad8`) | [`finalizacoes/PENDENCIAS_AGENTE_C.md`](finalizacoes/PENDENCIAS_AGENTE_C.md) |
| P-C1-03 | 18/09 | Merge da E3 (`ee129ba`) | [`finalizacoes/PENDENCIAS_AGENTE_C.md`](finalizacoes/PENDENCIAS_AGENTE_C.md) |
| A-4, B-2 | 18/09 | Merge da E4 (`7368d21`) | [`publish_docs/PENDENCIAS_MANUAIS_AGENTE_A.md`](publish_docs/PENDENCIAS_MANUAIS_AGENTE_A.md), [`_B.md`](publish_docs/PENDENCIAS_MANUAIS_AGENTE_B.md) |
| P-M-02 (atualizar a pasta principal) | 18/09 | `git log --oneline -1` em `C:\dev\AureaCustodiaMVP` bate com `origin/main`; `git rev-list --count origin/main..main` = 0 | [`finalizacoes/PENDENCIAS_AGENTE_C.md`](finalizacoes/PENDENCIAS_AGENTE_C.md) (P-M-02) |
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

| RA | Resumo | Situação | Quem trata |
|---|---|---|---|
| RA-24 | Compra direta via gateway cobra comissão apenas do vendedor | registrado | **E8**, ainda por executar |
| RA-43 | Conta criada pelo painel com senha provisória, sem segundo fator e sem troca obrigatória; link de redefinição sem tela de nova senha | tratado na E1, mesclada em 18/09 | — |
| RA-44 | Desativar conta bloqueia o login pelo Supabase; a entrada pelo catálogo e a sessão já aberta dependem da checagem da frente A | tratado na E1, mesclada em 18/09 | — |
| RA-45 | Bancada web: sem gravação local nem retomada depois de recarregar a página; linha do painel fora da transação da análise; regra de peso copiada da rota | registrado, **sem dono** desde o cancelamento da E6 | ninguém |
| RA-46 | Taxa e prazo mudados no painel valem na hora, sem aviso prévio; a faixa pede aceite da versão nova sem bloquear operação; publicação do documento em transação separada | registrado, **sem dono** desde o cancelamento da E6 | ninguém |
| RA-47 | Leitura da configuração que falha cai no padrão do código, sem trava | tratado na E2, mesclada em 18/09 | — |
| RA-48 | O e-mail do Gabriel está no código como `dev` do painel em qualquer ambiente, e a entrada `/painel` diz com qual conta a pessoa está | registrado, **sem dono** desde o cancelamento da E5 | ninguém |
| RA-52 | Bloqueio por pendência de custódia calculado na hora, sem gravar no recibo | registrado | **E8** |
| RA-53 | O gateway não reconfere a pendência de custódia na confirmação do pagamento | registrado | **E8** |

Risco sem dono não é bloqueio: fica anotado em `RISCOS_ASSUMIDOS.md` e volta à mesa se virar problema.

## 7. Outras listas vivas (apontadas, não copiadas)

- [`diario/CRITICAL_DEBUGS.md`](diario/CRITICAL_DEBUGS.md): histórico de defeitos conhecidos e correções críticas (CD-08, CD-12, CD-13).
- [`finalizacoes/2026-09-13_minuta_pontos_para_os_socios.md`](finalizacoes/2026-09-13_minuta_pontos_para_os_socios.md): respostas e definições dos sócios aos pontos levantados pelo advogado na minuta dos Termos.
- [`PRE_LANCAMENTO_CLIENTES_REAIS.md`](PRE_LANCAMENTO_CLIENTES_REAIS.md): checklist de requisitos que se tornam mandatórios na fase de clientes reais (não aplicável ao MVP de teste).
- [`EXECUCOES_MANUAIS_PENDENTES.md`](EXECUCOES_MANUAIS_PENDENTES.md): registro histórico de pendências manuais de 03/09/2026.
