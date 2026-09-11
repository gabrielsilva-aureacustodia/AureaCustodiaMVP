-- ============================================================================
-- 010_retiradas_ledger — habilita tipo 'taxa_retirada' no ledger_entries (frente C).
--
-- Bloco 10 e Bloco 13 da Publicação Oficial (Agente C · C-2).
-- ============================================================================

ALTER TABLE aurea.ledger_entries DROP CONSTRAINT IF EXISTS ledger_entries_tipo_check;
ALTER TABLE aurea.ledger_entries ADD CONSTRAINT ledger_entries_tipo_check CHECK (tipo IN (
  'saldo_inicial', 'deposito', 'compra', 'venda', 'comissao',
  'custodia', 'estorno', 'ajuste', 'taxa_retirada'
));
