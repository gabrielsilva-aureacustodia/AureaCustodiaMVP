-- ============================================================================
-- 011_retiradas — tabela de retiradas físicas de moedas da custódia (frente C).
--
-- Bloco 10 da Publicação Oficial (Agente C · C-1 / C-2).
--
-- Nasceu como 009 na frente C. Renumerada no merge de 11/09/2026: as frentes B
-- e C escolheram 009 e 010 ao mesmo tempo, cada uma sem ver a outra. B entrou
-- antes na `main` e ficou com os números; os da C viraram 011 e 012.
--
-- Regras inegociáveis:
--  - Tabela própria no schema aurea com RLS habilitada (bloco 13).
--  - Valores monetários em centavos (bigint NOT NULL CHECK (valor_taxa_cents >= 0)).
--  - Modalidades excludentes conforme D-1: 'comum' (R$ 50,00) ou 'segura' (R$ 180,00).
--  - Ciclo de vida: solicitada -> paga -> separacao -> postada -> entregue (ou cancelada).
--  - Endereço congelado no momento do pedido (jsonb NOT NULL).
--  - Histórico de eventos e auditoria de transições (jsonb NOT NULL DEFAULT '[]').
-- ============================================================================

CREATE TABLE IF NOT EXISTS aurea.retiradas (
  id               text   PRIMARY KEY,
  coin_id          text   NOT NULL REFERENCES aurea.coins (id),
  recibo_codigo    text   NOT NULL,
  user_email       text   NOT NULL REFERENCES aurea.users (email),
  modalidade       text   NOT NULL CHECK (modalidade IN ('comum', 'segura')),
  status           text   NOT NULL CHECK (status IN ('solicitada', 'paga', 'separacao', 'postada', 'entregue', 'cancelada')),
  valor_taxa_cents bigint NOT NULL CHECK (valor_taxa_cents >= 0),
  endereco         jsonb  NOT NULL,
  solicitado_em    bigint NOT NULL,
  pago_em          bigint,
  data_limite_d30  bigint NOT NULL,
  codigo_rastreio  text,
  historico        jsonb  NOT NULL DEFAULT '[]'::jsonb,
  created_at       bigint NOT NULL,
  updated_at       bigint NOT NULL
);

CREATE INDEX IF NOT EXISTS retiradas_user_email_idx ON aurea.retiradas (user_email);
CREATE INDEX IF NOT EXISTS retiradas_coin_id_idx    ON aurea.retiradas (coin_id);
CREATE INDEX IF NOT EXISTS retiradas_status_idx     ON aurea.retiradas (status);
CREATE INDEX IF NOT EXISTS retiradas_created_at_idx ON aurea.retiradas (created_at);

ALTER TABLE aurea.retiradas ENABLE ROW LEVEL SECURITY;
