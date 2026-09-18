-- Migration 026: o plano de custódia de 24 meses, e o fim do plano mensal
--
-- Por que esta migration existe (decisão do Gabriel, 18/09/2026):
--  1. Os planos passaram a ser dois: anual (R$ 24,00 por moeda pelos 12 meses) e
--     de 24 meses (R$ 36,00 por moeda, ou R$ 1,50 por mês). O plano mensal saiu da
--     tela — quem guarda moeda contrata um prazo.
--  2. O CHECK de 018 só aceitava ('mensal', 'anual') e recusaria a primeira
--     contratação de 24 meses com erro de constraint, no meio do fluxo de envio.
--
-- 'mensal' continua aceito de propósito: é o que está gravado nos planos já
-- contratados antes de hoje. Tirar o valor do CHECK não apagaria esses planos —
-- só impediria qualquer UPDATE neles, inclusive o do estorno de moeda recusada.
-- O código não cria mais nenhum plano 'mensal' (src/domain/types.ts).

ALTER TABLE aurea.planos_custodia DROP CONSTRAINT IF EXISTS planos_custodia_modalidade_check;
ALTER TABLE aurea.planos_custodia ADD CONSTRAINT planos_custodia_modalidade_check
  CHECK (modalidade IN ('mensal', 'anual', 'bienal'));
