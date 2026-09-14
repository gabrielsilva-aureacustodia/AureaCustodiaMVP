-- ---------------------------------------------------------------------------
-- 014 — Comissão de compra e de venda congeladas em trades (A1 / RA-06)
--
-- A comissão agora é cobrada dos dois lados (comprador e vendedor).
-- Cada lado tem sua comissão registrada separadamente em centavos.
-- Em negociações legadas, fee_comprador = 0 e fee_vendedor = fee.
-- ---------------------------------------------------------------------------

ALTER TABLE aurea.trades
  ADD COLUMN IF NOT EXISTS fee_comprador bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fee_vendedor bigint;

UPDATE aurea.trades SET fee_vendedor = fee WHERE fee_vendedor IS NULL;

ALTER TABLE aurea.trades ALTER COLUMN fee_vendedor SET NOT NULL;

ALTER TABLE aurea.trades DROP CONSTRAINT IF EXISTS trades_fee_soma_check;
ALTER TABLE aurea.trades
  ADD CONSTRAINT trades_fee_soma_check
  CHECK (fee_comprador >= 0 AND fee_vendedor >= 0 AND fee = fee_comprador + fee_vendedor);
