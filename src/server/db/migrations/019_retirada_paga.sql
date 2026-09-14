-- ============================================================================
-- 019_retirada_paga — forma de pagamento e parcelamento da taxa de retirada.
--
-- Agente B · B3 · 14/09/2026.
-- Permite que a taxa de retirada física seja paga via Saldo, Pix ou Cartão
-- (em até 2x na modalidade segura), desvinculando a solicitação do saldo prévio.
-- ============================================================================

ALTER TABLE aurea.retiradas ADD COLUMN IF NOT EXISTS forma_pagamento    text;
ALTER TABLE aurea.retiradas DROP CONSTRAINT IF EXISTS retiradas_forma_pagamento_check;
ALTER TABLE aurea.retiradas ADD CONSTRAINT retiradas_forma_pagamento_check
  CHECK (forma_pagamento IS NULL OR forma_pagamento IN ('saldo', 'pix', 'cartao'));
ALTER TABLE aurea.retiradas ADD COLUMN IF NOT EXISTS payment_intent_ref text;
ALTER TABLE aurea.retiradas ADD COLUMN IF NOT EXISTS parcelas           integer NOT NULL DEFAULT 1;
