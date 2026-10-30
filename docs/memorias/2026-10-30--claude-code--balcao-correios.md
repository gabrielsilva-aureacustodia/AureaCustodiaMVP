# Memória — balcão dos Correios (30/10/2026)

- **Sintoma:** envio RO-ENV-0019 (Sidnei) entregue e fora do balcão.
- **Causa:** nada movia o envio para "Recebido pela custódia" (marcação manual sem tela desde `3f58ed4`); a bancada só lê essa etapa. Não foi a API nova dos Correios nem `32ff769`/`10f107b`.
- **Correção:** `recebimentoDoEnvioPeloRastreio` (`src/domain/rastreio.ts`) + passo em `atualizarRastreiosPendentes` (`src/server/shipping/rastreios.ts`). PR #7, merge `98aba91`, deploy de produção ok.
- **Regra nova:** "entregue" dos Correios = "Recebido pela custódia" (com a hora do evento). Idempotente; sem ledger/cobrança.
- **Pendente:** disparar "Atualizar rastreio agora" em `/admin/logistica` para o RO-ENV-0019 (precisa de admin da Áurea).
- **Lição:** etapa "manual" só vale se existir tela que a execute; checar o consumidor da etapa (bancada) ao decidir.
- Execução: `docs/diario/execucoes/2026-10-30--balcao-correios.md`.
