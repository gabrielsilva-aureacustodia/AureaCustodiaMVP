-- ---------------------------------------------------------------------------
-- 010 — Faturamento mensal de custódia e inadimplência (sessão B-5 / B-6, bloco 8)
--
-- Regras de negócio protegidas (Decisão D-3, 10/09/2026):
--   - R$ 2,00 por moeda por mês (CUSTODIA_MENSAL_POR_MOEDA_CENTS = 200).
--   - Tabela `aurea.faturas_custodia` com restrição de unicidade (user_email, competencia).
--   - Coluna `inadimplente` em `aurea.users`.
--   - RLS ativado em `aurea.faturas_custodia`.
-- ---------------------------------------------------------------------------

ALTER TABLE aurea.users ADD COLUMN IF NOT EXISTS inadimplente boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS aurea.faturas_custodia (
  id                    text PRIMARY KEY,
  user_email            text NOT NULL REFERENCES aurea.users (email),
  competencia           text NOT NULL,
  quantidade_moedas     integer NOT NULL CHECK (quantidade_moedas > 0),
  moeda_ids             text[] NOT NULL,
  valor_cents           bigint NOT NULL CHECK (valor_cents >= 0),
  status                text NOT NULL CHECK (status IN ('paga', 'pendente', 'atrasada', 'cancelada')),
  data_emissao          bigint NOT NULL,
  data_vencimento       bigint NOT NULL,
  data_pagamento        bigint,
  forma_pagamento       text CHECK (forma_pagamento IS NULL OR forma_pagamento IN ('saldo', 'pix', 'cartao')),
  payment_intent_id     text,
  CONSTRAINT faturas_usuario_competencia_uniq UNIQUE (user_email, competencia)
);

CREATE INDEX IF NOT EXISTS faturas_user_idx ON aurea.faturas_custodia (user_email, data_emissao);
CREATE INDEX IF NOT EXISTS faturas_status_idx ON aurea.faturas_custodia (status, data_vencimento);

ALTER TABLE aurea.faturas_custodia ENABLE ROW LEVEL SECURITY;
