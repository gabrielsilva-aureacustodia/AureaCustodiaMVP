# Execução — moeda entregue pelos Correios não chegava ao balcão (30/10/2026)

## RETOMADA
- Branch: `fix/balcao-recebimento-correios` (de `main` 32ff769). Commit do código: 4eb108d.
- Feito: causa achada, correção + 6 testes, suíte/lint/typecheck/build verdes.
- Falta (nesta ordem): re-rodar verificações, push, PR, merge, conferir deploy Vercel, regularizar RO-ENV-0019 (Sidnei) pelo botão "Atualizar rastreio agora", memória em `docs/memorias/`.
- Segredo nunca neste arquivo.

## Tópicos
1. **Causa**: nada movia o envio de "Envio postado" para "Recebido pela custódia" (etapa manual sem tela desde `3f58ed4`); a bancada só lê essa etapa. Não foi a API nova nem `32ff769`/`10f107b`. — feito
2. **Correção**: `recebimentoDoEnvioPeloRastreio` (`src/domain/rastreio.ts`) + passo em `atualizarRastreiosPendentes`; idempotente; sem ledger/cobrança. — feito
3. **Testes**: `src/server/shipping/rastreios.test.ts` (payload SRO BDE/01 → fila; reprocesso; negativos). — feito
4. Push / PR / merge / deploy — pendente
5. Regularização do Sidnei — pendente
