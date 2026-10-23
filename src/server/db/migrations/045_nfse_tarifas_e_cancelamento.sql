-- ---------------------------------------------------------------------------
-- 045 — NFS-e da tarifa de saque e da retirada, e o cancelamento (23/10/2026)
--
-- Respostas do contador de 23/10/2026: a tarifa de saque e a taxa de retirada da moeda são
-- movimentações do armazenamento e saem com o código da custódia (11.04.01). A tarifa é cobrada — e a
-- nota sai — no pedido de saque, o dia em que o dinheiro se move; se a equipe recusa o saque, a nota
-- é cancelada (evento 101101, serviço não prestado).
--
-- O que muda no banco:
--   1. `nfse_emissoes.servico` aceita 'tarifa_saque' e 'taxa_retirada'. A lista inteira é repetida,
--      como manda a 012: reescrever só os valores novos apagaria os antigos.
--   2. `nfse_emissoes.status` ganha 'cancelando' (nota autorizada esperando o evento na Sefin).
--   3. `motivo_cancelamento`, `cancelada_em` e `xml_cancelamento`, o registro do evento.
-- Aditiva: o código anterior não lê as colunas novas e não grava os valores novos.
-- ---------------------------------------------------------------------------

ALTER TABLE aurea.nfse_emissoes DROP CONSTRAINT IF EXISTS nfse_emissoes_servico_check;
ALTER TABLE aurea.nfse_emissoes ADD CONSTRAINT nfse_emissoes_servico_check CHECK (servico IN (
  -- migration 044
  'custodia', 'intermediacao_compra', 'intermediacao_venda',
  -- esta migration
  'tarifa_saque', 'taxa_retirada'
));

ALTER TABLE aurea.nfse_emissoes DROP CONSTRAINT IF EXISTS nfse_emissoes_status_check;
ALTER TABLE aurea.nfse_emissoes ADD CONSTRAINT nfse_emissoes_status_check CHECK (status IN (
  -- migration 044
  'pendente', 'processando', 'autorizada', 'rejeitada', 'erro', 'cancelada',
  -- esta migration
  'cancelando'
));

ALTER TABLE aurea.nfse_emissoes
  ADD COLUMN IF NOT EXISTS motivo_cancelamento text,
  ADD COLUMN IF NOT EXISTS cancelada_em bigint,
  ADD COLUMN IF NOT EXISTS xml_cancelamento text;
