# Execução — moeda entregue pelos Correios não chegava ao balcão (30/10/2026)

## RETOMADA
- Branch: `fix/balcao-recebimento-correios` (de `main` 32ff769). Commit do código: 4eb108d.
- Feito: causa achada, correção + 6 testes, suíte/lint/typecheck/build verdes.
- Feito também: PR #7 mergeado (98aba91), deploy de produção ok. Falta só disparar o rastreio em produção (precisa de admin; ver LISTA_SIDNEI).
- Segredo nunca neste arquivo.

## Tópicos
1. **Causa**: nada movia o envio de "Envio postado" para "Recebido pela custódia" (etapa manual sem tela desde `3f58ed4`); a bancada só lê essa etapa. Não foi a API nova nem `32ff769`/`10f107b`. — feito
2. **Correção**: `recebimentoDoEnvioPeloRastreio` (`src/domain/rastreio.ts`) + passo em `atualizarRastreiosPendentes`; idempotente; sem ledger/cobrança. — feito
3. **Testes**: `src/server/shipping/rastreios.test.ts` (payload SRO BDE/01 → fila; reprocesso; negativos). — feito
4. Push / PR / merge / deploy — feito
5. Regularização do Sidnei — bloqueada por acesso (admin da Áurea)

## Rotina diária de rastreio (30/10)
Cron `0 9 * * *` UTC (06:00 BRT) em `vercel.json` → `/api/cron/shipping`. Auth centralizada em `src/server/cron-auth.ts` (produção sem `CRON_SECRET` fecha com log claro). Testes: `route.test.ts`, `cron-auth.test.ts`. Feito na branch `fix/cron-rastreio-diario`.
