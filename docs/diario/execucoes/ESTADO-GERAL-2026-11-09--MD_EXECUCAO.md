# ESTADO-GERAL — MD de execução do projeto (09/11/2026)

> Consolida, no padrão Sintetica (bloco RETOMADA no topo), tudo que foi feito, o que está fechando e o que falta no Real Olímpico. Atualizar a cada fechamento de sessão. Mapa do repositório: `docs/INDICE_VEGA.md`.

## RETOMADA
- **MANUTENÇÃO DE 17/11/2026 (pedido do Rogério, 16 itens, prazo 30/11; pacote e quadro em `docs/manutencao-2026-11/`):** mescladas na `main` as frentes **I** (número da moeda no recibo, já no ar), **D** (cadastro/entrada com Google primeiro; vídeo da demonstração e conferência visual só depois do deploy), **C** (e-mails de movimentação: fila `aurea.emails_pendentes`, migration 053; **falta `RESEND_API_KEY` e `EMAIL_REMETENTE` na Vercel, sem elas nada é enviado**), **B** (frete + 1º mês de custódia numa cobrança só; decisão fiscal aberta: a recusa de moeda devolve o mês mas não cancela a NFS-e do mês), **E** (PWA no iPhone: causa mais provável é de uso; teste em iPhone/Android reais depois do deploy, roteiro em `docs/pwa/ROTEIRO_IPHONE_REAL.md`) e **H** (cancelar envio não postado: cliente, equipe e bancada; frete, 1º mês, nota e etiqueta voltam juntos; migration 056; corte D-H5 em `src/domain/envios.ts`; mapa em `docs/MAPA_DO_CANCELAMENTO.md`) e **A** (confirmação por senha nas ações sensíveis, 14 Server Actions; RA-50 fechado em `definirNovaSenha` com interruptor `EXIGIR_LINK_RECENTE_NA_NOVA_SENHA`; **testar o "esqueci minha senha" com link real logo depois do deploy**; modelo "Magic Link" do Supabase precisa de `{{ .Token }}`). **K** (frete cobrado soma R$ 4,00 ao contrato dos Correios; parâmetro editável em `/admin/configuracao`; D5 confirmado pelo Gabriel (por objeto, só no envio; segundo a K), o texto da tela aguarda a aprovação dele; pergunta nº 21 ao contador). **F** (extrato fecha com o saldo; teste de invariante `statement-invariante.test.ts` 17/17; conferir `/conta/extrato` em produção: última linha "Saldo depois" = saldo do topo, em 320–430 px e no desktop). Em andamento em 18/11: G, J, L; M bloqueada.
- **Estado:** produção em operação com clientes e dinheiro reais. Último código na `main`: `2b48b04` (PWA, 05/11/2026), antes dele `b6f253e` (custódia numa regra só, 03/11). Nenhuma branch por mesclar; um worktree só.
- **Git (09/11/2026):** `main` = `origin/main`. Sem commit: `.claude/launch.json`, `.agents/`, vários arquivos de `docs/polimento/**` e os MDs desta organização (índice, ritual, estado, memória).
- **Quase finalizando:** (1) **PWA**, falta o teste em aparelho real Android e iPhone (roteiro em `docs/pwa/MD_EXECUCAO.md`); (2) **Atendimento ao cliente**, falta `RESEND_API_KEY` na Vercel para o e-mail ao cliente e teste logado em produção; (3) **polimento estético**, landing, plataforma e admin já publicados, restam as propostas P2–P4 do admin e o atalho `/` da busca.
- **Próximo ato (proposto; confirmar com o Gabriel antes):**
  1. Gabriel decide se commita este pacote de MDs (commit só de MD vai direto, sem build) e o que fazer dos arquivos de `docs/polimento/**` ainda não versionados (INDICE_VEGA seção 9).
  2. Teste do PWA em aparelho real depois do deploy.
  3. Reconferir `docs/PENDENCIAS_ABERTAS.md` (de 18/09) e fechar ou mover cada linha: B-7, B-8, N-01, N-02, P-C2-02.
  4. Rodar a suíte inteira e registrar a contagem de hoje (última registrada: 159 arquivos, 1.496 testes, em 31/10).
- **Não verificado nesta organização:** estado atual da produção (deploy, variáveis, banco), a suíte, o saque do Sidnei, o aceite do contador sobre NFS-e. Tudo isso vem dos MDs citados com a data deles.

## O que foi feito (por frente; detalhe nos MDs citados)

| Frente | Período | Entrega | Prova / MD |
|---|---|---|---|
| Port do monolito | 08/2026 | Next.js 15, domínio puro, Server Actions | `README.md` |
| Fundação (A/B/C) | 09/2026 | Supabase Auth+Google, banco, ledger/DRE, Mercado Pago, `/admin` RBAC, relatórios | `docs/finalizacoes/` |
| Pendências E1–E8 | 09/2026 | Portas da conta, cobrança com config vigente, limpeza, custódia e inadimplência | `docs/execucao-pendencias/` |
| Domínio e marca | 20/09 | realolimpico.com.br, marca Real Olímpico | `docs/tutoriais/TUTORIAL_DOMINIO_OFICIAL.md` |
| Custódia | 21/09–03/11 | Mensal R$ 2,00, ciclo por moeda, trava por débito, custódia na compra, **regra única** | `docs/ALTERACOES_*`, CLAUDE.md |
| Saques | 14/10 | Fila da equipe, Payouts MP desligado | `docs/ALTERACOES_2026-10-14_SAQUES_E_PERMISSOES.md`, `docs/SAQUE_PIX_MERCADO_PAGO.md` |
| NFS-e e contábil | 22–23/10 | Pedidos de nota na transação (migrations 044/045), controle financeiro (046) | `docs/fiscal-contabil/` |
| Correios CWS | 22–30/10 | Frete por contrato, etiqueta, rastreio diário, balcão (entrega leva o envio à bancada) | `docs/EXECUCAO_CORREIOS_CWS.md`, `docs/diario/execucoes/2026-10-30--balcao-correios.md` |
| Polimento estético | 24–25/10 | Brandbook e tokens, ativos visuais, landing, plataforma, admin | `docs/polimento/*/MD_EXECUCAO.md` |
| Polimento 2, tutorial do admin, check-up | 30/10 | PRs #13–#17, tutorial v3 | `docs/memorias/2026-10-30--claude-code--polimento-tutorial-admin-checkup.md` |
| Auditorias | 30/10 | Integrações Gov/Correios, auditoria final, "ver como o cliente vê" | PRs #10–#12, `docs/memorias/2026-10-30--claude-code--checkup-2.md` |
| Atendimento ao cliente | 31/10 | Botão flutuante, `/atendimento`, `/admin/casos`, migration 048 | `docs/atendimento/EXECUCAO.md` |
| Custódia numa regra só | 03/11 | `custodia-da-moeda.ts`, `quitar-fatura.ts`; sai plano por mês e cobrança do dia 1º | `docs/ALTERACOES_2026-11-03_CUSTODIA_REGRA_UNICA.md` |
| Origem do depósito | 03/11 | Migration 049; extrato diz de onde veio cada entrada | CLAUDE.md |
| PWA | 04–05/11 | App instalável, atualização automática, botão por sistema | `docs/pwa/MD_EXECUCAO.md` |

## Decisões vigentes que mais confundem quem chega (resumo; texto no CLAUDE.md)
- Fatura só vira paga por `quitarFatura`; cobrança indevida já paga se devolve por `estornarFaturaPaga`.
- Frete é despesa do cliente: sem NFS-e e fora da DRE.
- Pós-paga está oculta na tela desde 28/09 (código inteiro continua).
- Repositório público de propósito (RA-11); decisão reversível.
- Contas de semente (`12345678`) não valem desde 20/09/2026; não há contas de demonstração.

## Pendências (cada uma com dono provável)

| # | Pendência | Dono | Origem |
|---|---|---|---|
| 1 | Teste do PWA em Android e iPhone | Gabriel | `docs/pwa/MD_EXECUCAO.md` |
| 2 | `RESEND_API_KEY` na Vercel (e-mail do atendimento) | Gabriel | `docs/atendimento/EXECUCAO.md` |
| 3 | Testar logado em produção: `/admin`, atendimento, papéis sócio e operação | Gabriel + agente | memória 30/10 |
| 4 | Reconferir `PENDENCIAS_ABERTAS.md` (18/09) | agente | índice |
| 5 | Perguntas ao contador (regime, ISS por tipo de serviço) | Gabriel | `docs/fiscal-contabil/LACUNAS_E_PERGUNTAS.md` |
| 6 | Política de retenção LGPD (foto/vídeo/etiqueta) antes de cliente novo | Gabriel + jurídico | CLAUDE.md |
| 7 | Propostas P2–P4 e atalho `/` do admin | agente, se o Gabriel pedir | `docs/polimento/admin/BENCHMARK.md` §6 |
| 8 | Decidir o destino dos arquivos de polimento não versionados e dos 3 stashes | Gabriel | INDICE_VEGA §9 |
| 9 | Teste instável da suíte (2 falhas sem causa) | agente | memória 30/10 |

## Sessões
- **09/11/2026 (Claude Code):** organização de continuidade pedida pelo Gabriel: lido o Sintetica (`processo/`, `docs/memorias/_MODELO.md`, ficha do projeto), criados `docs/INDICE_VEGA.md`, `docs/diario/LEIA_PRIMEIRO_AGENTE.md`, este MD, `execucoes/README.md` e a memória R11; ficha da Áurea no Sintetica atualizada. Nenhum código tocado, nada commitado.
