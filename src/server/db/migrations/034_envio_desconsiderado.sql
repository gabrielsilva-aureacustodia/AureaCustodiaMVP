-- 034 — envio desconsiderado: envio postal não postado em até 3 dias.
--
-- O registro é preservado no banco para histórico e auditoria, mas o protocolo
-- não pode mais ser postado nem reativado, e some da lista ativa.

ALTER TABLE aurea.envios
  ADD COLUMN IF NOT EXISTS desconsiderado_em bigint,
  ADD COLUMN IF NOT EXISTS motivo_desconsideracao text;
