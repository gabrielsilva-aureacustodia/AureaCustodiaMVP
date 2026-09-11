-- ---------------------------------------------------------------------------
-- 009 — Saque de recursos (sessão B-4, bloco 7b)
--
-- Tabela para registro e acompanhamento de solicitações de saque (D+3),
-- com taxa fixa debitada, dados bancários/Pix capturados e estados:
-- solicitado -> em_processamento -> pago / falhou.
--
-- Atualiza a restrição de tipos de lançamentos do ledger para permitir
-- 'saque', 'taxa_saque' e 'taxa_retirada'.
-- ---------------------------------------------------------------------------

ALTER TABLE aurea.ledger_entries DROP CONSTRAINT IF EXISTS ledger_entries_tipo_check;
ALTER TABLE aurea.ledger_entries ADD CONSTRAINT ledger_entries_tipo_check CHECK (tipo IN (
  'saldo_inicial', 'deposito', 'compra', 'venda', 'comissao',
  'custodia', 'estorno', 'ajuste', 'saque', 'taxa_saque', 'taxa_retirada'
));

CREATE TABLE IF NOT EXISTS aurea.saques (
  id                    text PRIMARY KEY,
  user_email            text NOT NULL REFERENCES aurea.users (email),
  valor_total           bigint NOT NULL CHECK (valor_total > 0),
  taxa                  bigint NOT NULL CHECK (taxa >= 0),
  valor_liquido         bigint NOT NULL CHECK (valor_liquido > 0),
  dados_bancarios       jsonb NOT NULL,
  status                text NOT NULL CHECK (status IN ('solicitado', 'em_processamento', 'pago', 'falhou')),
  motivo_falha          text,
  criado_em             bigint NOT NULL,
  previsao_pagamento_em bigint NOT NULL,
  pago_em               bigint,
  comprovante_ref       text,
  atualizado_em         bigint NOT NULL
);

CREATE INDEX IF NOT EXISTS saques_user_idx ON aurea.saques (user_email, criado_em);
CREATE INDEX IF NOT EXISTS saques_status_idx ON aurea.saques (status, previsao_pagamento_em);
ALTER TABLE aurea.saques ENABLE ROW LEVEL SECURITY;
