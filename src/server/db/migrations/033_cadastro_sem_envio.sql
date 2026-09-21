-- 033 — cadastro sem envio: a moeda já está no armazém, mas ainda vai à bancada.
--
-- A origem explica por que um envio válido não tem rastreio postal. Peso, caixa
-- e observação preservam os mesmos dados do cadastro direto e apenas iniciam o
-- formulário da bancada; moeda, recibo e hash continuam nascendo na análise.

ALTER TABLE aurea.envios
  ADD COLUMN IF NOT EXISTS origem text NOT NULL DEFAULT 'envio_postal',
  ADD COLUMN IF NOT EXISTS peso_inicial_mg integer,
  ADD COLUMN IF NOT EXISTS caixa_inicial text,
  ADD COLUMN IF NOT EXISTS observacao text;

ALTER TABLE aurea.envios
  DROP CONSTRAINT IF EXISTS envios_origem_check;

ALTER TABLE aurea.envios
  ADD CONSTRAINT envios_origem_check
  CHECK (origem IN ('envio_postal', 'cadastro_sem_envio'));

ALTER TABLE aurea.envios
  DROP CONSTRAINT IF EXISTS envios_peso_inicial_check;

ALTER TABLE aurea.envios
  ADD CONSTRAINT envios_peso_inicial_check
  CHECK (peso_inicial_mg IS NULL OR peso_inicial_mg > 0);
