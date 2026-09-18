-- ---------------------------------------------------------------------------
-- 030 — Rastreio da retirada física (E8)
--
-- O job de rastreio só gravava objeto de envio: a coluna protocolo é NOT NULL e
-- aponta para aurea.envios, e o id de uma retirada não existe lá. Em vez de uma
-- tabela nova, a mesma tabela ganha o segundo dono possível: cada linha pertence a
-- UM envio (protocolo) ou a UMA retirada (retirada_id), nunca aos dois.
--
-- Aditiva: o código anterior continua gravando envio com protocolo e retirada_id
-- nulo, que passa na restrição. Por isso pode ser aplicada antes do deploy.
-- ---------------------------------------------------------------------------

ALTER TABLE aurea.rastreios
  ADD COLUMN IF NOT EXISTS retirada_id text REFERENCES aurea.retiradas (id) ON DELETE CASCADE;

ALTER TABLE aurea.rastreios ALTER COLUMN protocolo DROP NOT NULL;

ALTER TABLE aurea.rastreios DROP CONSTRAINT IF EXISTS rastreios_um_dono_check;
ALTER TABLE aurea.rastreios
  ADD CONSTRAINT rastreios_um_dono_check CHECK (num_nonnulls(protocolo, retirada_id) = 1);

CREATE INDEX IF NOT EXISTS rastreios_retirada_id_idx ON aurea.rastreios (retirada_id);
