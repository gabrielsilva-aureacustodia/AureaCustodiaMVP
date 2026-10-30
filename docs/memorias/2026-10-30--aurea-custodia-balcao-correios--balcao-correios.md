# 2026-10-30 · aurea-custodia-balcao-correios · Balcão de moedas recebidas (Correios)

Bot da frota: `aurea-custodia-balcao-correios` (pai `grok-task-giver`). Agente: Claude Code "Balcão: recebimento Correios" (tmux `aurea-balcao-correios`). Detalhe técnico do agente em `2026-10-30--claude-code--balcao-correios.md` e `docs/diario/execucoes/2026-10-30--balcao-correios.md`.

## Problema
O envio RO-ENV-0019 (Sidnei), postado em 27/10/2026 e entregue pelos Correios, nunca apareceu no balcão (`/admin/bancada`).

## Causa raiz
- A bancada (`filaDeAnalise`, `src/server/estacao/analise.ts`) só lista envios em "Recebido pela custódia" / "Em análise física".
- Com a integração da API de contrato dos Correios (commit `abc42cd`, 22/10/2026), o job `atualizarRastreiosPendentes` (`src/server/shipping/rastreios.ts`) passou a avançar o envio sozinho só até "Envio postado"; "Recebido pela custódia" ficou como passo manual da equipe ("acordo 3", `docs/EXECUCAO_CORREIOS_CWS.md`), e um teste garantia que o "entregue" não avançava nada.
- Não existe tela no painel que faça essa marcação manual (a única função que chega lá, `advanceAnalysis` em `src/server/actions/custody.ts`, não é chamada por nenhuma tela). Resultado: envio entregue fica parado em "Envio postado".
- Não foi regressão de leitura da API nova: o evento SRO `BDE` tipo `01` é lido como entregue (`src/lib/shipping/cws/rastro.ts`). Os commits `10f107b` e `32ff769` não descartam o envio.

## Correção (PR #7, merge 98aba91)
- `recebimentoDoEnvioPeloRastreio` (`src/domain/rastreio.ts`) + passo novo em `atualizarRastreiosPendentes`: entrega registrada pelos Correios leva o envio de "Protocolo gerado"/"Envio postado" a "Recebido pela custódia", com `dataRecebimento` = hora do evento. Conferido de novo dentro da mutação: reprocessar não duplica. Não toca ledger, fatura nem cobrança. Sem migration.
- Botão "Atualizar rastreio agora" e cron `/api/cron/shipping` passam a informar `enviosRecebidos`.
- Testes novos em `src/server/shipping/rastreios.test.ts` (payload SRO BDE/01 → fila da bancada; reprocesso idempotente; em trânsito, devolvido, desconsiderado e em análise não avançam). Suíte 1445 verde, lint, typecheck e build verdes; CI `verificar` success.

## Regularização do Sidnei
Pendente de acesso: a máquina da frota não tem login admin da Áurea, `CRON_SECRET`, nem credencial do Supabase de produção da Áurea. Caminho: `/admin/logistica` → "Atualizar rastreio agora" (ou o cron diário 09:00 UTC = 06:00 BRT, que roda o mesmo código). O código das moedas nasce na análise da bancada (recibo), não no recebimento.

## Para a próxima sessão
- Pedir ao Grok Machine credenciais da Áurea (Supabase prod só leitura, Vercel time `aurea-custodia`) antes de tarefas que exigem conferir produção.
- O cron também levará à bancada qualquer outro envio entregue que estivesse parado em "Envio postado".

## Rotina diária de rastreio (30/10)
- Cron em `vercel.json`: `/api/cron/shipping`, `0 9 * * *` UTC = **06:00 em Brasília** (UTC-3, sem horário de verão); no plano Hobby a Vercel pode rodar em qualquer minuto da hora (06:00–06:59). A rota chama `atualizarRastreiosPendentes` (inclui o passo `enviosRecebidos` → bancada) e depois `desconsiderarEnviosVencidos`.
- Achado: sem `CRON_SECRET` em produção a rota comparava com `"Bearer undefined"` — 401 mudo, e quem mandasse esse texto passava. Corrigido em `src/server/cron-auth.ts` (rastreio e faturamento): fecha, loga "CRON_SECRET ausente em produção" e compara em tempo constante.
- Testes travam o agendamento, a autenticação e o reprocesso idempotente. `CRON_SECRET` na Vercel: não conferível daqui; indício de que existe: o cron de faturamento (mesmo segredo) rodou em produção até 26/10 (commit 7479867).
