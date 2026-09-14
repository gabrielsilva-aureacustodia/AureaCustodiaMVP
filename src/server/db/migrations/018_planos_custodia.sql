-- Migration 018: Planos de custódia (mensal e anual) e origens de faturamento
--
-- Por que esta migration existe (Passo B2.2 e Decisão F-5):
--  1. aurea.planos_custodia: armazena os planos contratados no fluxo de envio ou avulso.
--  2. aurea.seq.plano_custodia: gerador sequencial de IDs 'PLC-000001'.
--  3. aurea.faturas_custodia: ganha plano_id e origem ('ciclo_mensal', 'contratacao', 'renovacao_anual').
--  4. faturas_ciclo_uniq e faturas_plano_uniq: substituem a unicidade antiga por conta/mês,
--     permitindo que um usuário contrate um novo plano e receba ciclo no mesmo mês sem colisão.
--  5. aurea.envios.modalidade_envio: armazena a escolha PAC ou SEDEX feita no wizard.

ALTER TABLE aurea.seq ADD COLUMN IF NOT EXISTS plano_custodia integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS aurea.planos_custodia (
  id                    text    PRIMARY KEY,
  user_email            text    NOT NULL REFERENCES aurea.users (email),
  protocolo_envio       text    NOT NULL,
  modalidade            text    NOT NULL CHECK (modalidade IN ('mensal', 'anual')),
  quantidade_contratada integer NOT NULL CHECK (quantidade_contratada > 0),
  moeda_ids             text[]  NOT NULL DEFAULT '{}',
  valor_por_moeda       bigint  NOT NULL CHECK (valor_por_moeda >= 0),
  valor_total           bigint  NOT NULL CHECK (valor_total >= 0),
  parcelas_max          integer NOT NULL DEFAULT 1,
  inicio_competencia    text    NOT NULL,
  pago_ate_competencia  text,
  status                text    NOT NULL CHECK (status IN ('aguardando_pagamento', 'vigente', 'encerrado', 'cancelado')),
  forma_pagamento       text    CHECK (forma_pagamento IS NULL OR forma_pagamento IN ('saldo', 'pix', 'cartao')),
  payment_intent_ref    text,
  assinatura_id         text,
  estornado             bigint  NOT NULL DEFAULT 0 CHECK (estornado >= 0),
  criado_em             bigint  NOT NULL,
  atualizado_em         bigint  NOT NULL
);

CREATE INDEX IF NOT EXISTS planos_usuario_idx ON aurea.planos_custodia (user_email);
CREATE INDEX IF NOT EXISTS planos_envio_idx   ON aurea.planos_custodia (protocolo_envio);
ALTER TABLE aurea.planos_custodia ENABLE ROW LEVEL SECURITY;

ALTER TABLE aurea.faturas_custodia ADD COLUMN IF NOT EXISTS plano_id text REFERENCES aurea.planos_custodia (id);
ALTER TABLE aurea.faturas_custodia ADD COLUMN IF NOT EXISTS origem   text NOT NULL DEFAULT 'ciclo_mensal';

ALTER TABLE aurea.faturas_custodia DROP CONSTRAINT IF EXISTS faturas_origem_check;
ALTER TABLE aurea.faturas_custodia ADD CONSTRAINT faturas_origem_check
  CHECK (origem IN ('ciclo_mensal', 'contratacao', 'renovacao_anual'));

-- A unicidade antiga (uma fatura por conta por mês) impediria a contratação no mesmo mês do ciclo.
ALTER TABLE aurea.faturas_custodia DROP CONSTRAINT IF EXISTS faturas_usuario_competencia_uniq;

CREATE UNIQUE INDEX IF NOT EXISTS faturas_ciclo_uniq ON aurea.faturas_custodia (user_email, competencia)
  WHERE origem = 'ciclo_mensal';

CREATE UNIQUE INDEX IF NOT EXISTS faturas_plano_uniq ON aurea.faturas_custodia (plano_id, competencia, origem)
  WHERE plano_id IS NOT NULL;

ALTER TABLE aurea.envios ADD COLUMN IF NOT EXISTS modalidade_envio text;
