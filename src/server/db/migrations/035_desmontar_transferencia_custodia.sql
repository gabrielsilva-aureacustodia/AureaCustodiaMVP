-- Migration 035: Desmontar a transferência proporcional de custódia (Decisão 21/09/2026)
--
-- A custódia passa a ter modalidade única (mensal a R$ 2,00 por moeda por mês).
-- A transferência proporcional foi desmontada: o comprador paga o ciclo seguinte
-- normalmente e o vendedor é desvinculado no ato da venda.
--
-- Remove colunas criadas pela migration 032 em aurea.planos_custodia
-- e remove 'transferencia' do CHECK em aurea.faturas_custodia.

DROP INDEX IF EXISTS aurea.planos_origem_idx;

ALTER TABLE aurea.planos_custodia
  DROP CONSTRAINT IF EXISTS planos_custodia_origem_check;

ALTER TABLE aurea.planos_custodia
  DROP COLUMN IF EXISTS meses_contratados,
  DROP COLUMN IF EXISTS origem,
  DROP COLUMN IF EXISTS plano_origem_id;

ALTER TABLE aurea.faturas_custodia
  DROP CONSTRAINT IF EXISTS faturas_origem_check;

ALTER TABLE aurea.faturas_custodia
  ADD CONSTRAINT faturas_origem_check
  CHECK (origem IN ('ciclo_mensal', 'contratacao', 'renovacao_anual'));
