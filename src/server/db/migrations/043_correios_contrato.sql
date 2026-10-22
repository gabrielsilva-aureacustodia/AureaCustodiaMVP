-- ---------------------------------------------------------------------------
-- 043 — contrato com os Correios (API CWS, 22/10/2026)
--
-- O que muda no banco:
--
--   1. `envios.frete` e `envios.pre_postagem` (jsonb). O cliente passa a pagar o frete do envio no
--      site, pelo preço do contrato, e o servidor gera a pré-postagem de logística reversa — é
--      ela que traz o código de rastreio e a etiqueta oficial. Os dois são objetos pequenos e
--      mudam juntos, por isso jsonb e não seis colunas.
--   2. `retiradas.pre_postagem` (jsonb): a pré-postagem de saída, emitida pelo painel.
--   3. Ledger: o tipo `frete` (o frete pago pelo cliente). A lista é a UNIÃO completa, como a 012
--      manda — repetir só o tipo novo apagaria os outros.
--   4. Intenções de pagamento: o tipo `frete_envio`. Mesma regra da 038: a lista inteira.
-- ---------------------------------------------------------------------------

ALTER TABLE aurea.envios
  ADD COLUMN IF NOT EXISTS frete jsonb,
  ADD COLUMN IF NOT EXISTS pre_postagem jsonb;

ALTER TABLE aurea.retiradas
  ADD COLUMN IF NOT EXISTS pre_postagem jsonb;

ALTER TABLE aurea.ledger_entries DROP CONSTRAINT IF EXISTS ledger_entries_tipo_check;
ALTER TABLE aurea.ledger_entries ADD CONSTRAINT ledger_entries_tipo_check CHECK (tipo IN (
  -- migration 003, o núcleo contábil
  'saldo_inicial', 'deposito', 'compra', 'venda', 'comissao',
  'custodia', 'estorno', 'ajuste',
  -- migration 009, frente B — saque de recursos
  'saque', 'taxa_saque',
  -- migration 012, frente C — retirada física da moeda
  'taxa_retirada',
  -- esta migration — frete do envio pago no site
  'frete'
));

ALTER TABLE aurea.payment_intents DROP CONSTRAINT IF EXISTS payment_intents_tipo_operacao_check;
ALTER TABLE aurea.payment_intents ADD CONSTRAINT payment_intents_tipo_operacao_check CHECK (tipo_operacao IN (
  'deposito', 'compra_direta', 'plano_custodia', 'fatura_custodia', 'assinatura_custodia',
  'retirada', 'oferta_prepaga', 'reserva_compra',
  -- esta migration
  'frete_envio'
));
