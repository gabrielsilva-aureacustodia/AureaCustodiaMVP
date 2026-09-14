-- ---------------------------------------------------------------------------
-- 017 — Cobranças Gateway e Recebimentos (Finalizações · Frente B · Sub-branch B1)
--
-- Registra a separação contábil de pagamentos pelo gateway (decisão F-5, 13/09/2026):
-- separa valor bruto, valor pago pelo cliente, tarifa do gateway e valor líquido,
-- além de parcelas, data de liberação e competência.
--
-- Adiciona suporte a parcelas e amplia os tipos de operação em `aurea.payment_intents`.
-- ---------------------------------------------------------------------------

ALTER TABLE aurea.payment_intents ADD COLUMN IF NOT EXISTS parcelas_max integer NOT NULL DEFAULT 1;

ALTER TABLE aurea.payment_intents DROP CONSTRAINT IF EXISTS payment_intents_tipo_operacao_check;
ALTER TABLE aurea.payment_intents ADD CONSTRAINT payment_intents_tipo_operacao_check CHECK (tipo_operacao IN (
  'deposito', 'compra_direta', 'plano_custodia', 'fatura_custodia', 'assinatura_custodia', 'retirada'
));

-- Um pagamento aprovado = uma linha. Separa bruto, tarifa e líquido (decisão F-5).
CREATE TABLE IF NOT EXISTS aurea.recebimentos_gateway (
  id                 bigserial PRIMARY KEY,
  created_at         bigint  NOT NULL,
  payment_id         text    NOT NULL UNIQUE,
  external_reference text    NOT NULL,
  tipo_operacao      text    NOT NULL,
  user_email         text    NOT NULL,
  metodo             text    NOT NULL,
  parcelas           integer NOT NULL DEFAULT 1,
  valor_bruto        bigint  NOT NULL CHECK (valor_bruto > 0),
  valor_pago_cliente bigint  NOT NULL,
  tarifa_gateway     bigint  NOT NULL CHECK (tarifa_gateway >= 0),
  valor_liquido      bigint  NOT NULL,
  aprovado_em        bigint  NOT NULL,
  liberacao_prevista bigint,
  competencia        text    NOT NULL
);
CREATE INDEX IF NOT EXISTS recebimentos_competencia_idx ON aurea.recebimentos_gateway (competencia, tipo_operacao);
CREATE INDEX IF NOT EXISTS recebimentos_liberacao_idx   ON aurea.recebimentos_gateway (liberacao_prevista);
ALTER TABLE aurea.recebimentos_gateway ENABLE ROW LEVEL SECURITY;
