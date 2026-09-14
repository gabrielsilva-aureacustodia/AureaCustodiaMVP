-- Migration 015 — Fila por ordem de cadastro (prioridade_em) e histórico de ofertas
--
-- Decisão F-3 (13/09/2026):
-- 1. `sell_offers` e `buy_orders` ganham `prioridade_em` (milissegundos desde epoch).
--    Nasce igual a `created_at` e é atualizado quando preço muda ou quantidade aumenta.
-- 2. Tabela `ofertas_historico`: auditoria append-only de eventos do livro de ordens
--    ('publicada', 'editada', 'cancelada', 'executada'), permitindo auditar a fila
--    e comprovar se houve perda de prioridade.

ALTER TABLE aurea.sell_offers ADD COLUMN IF NOT EXISTS prioridade_em bigint;
UPDATE aurea.sell_offers SET prioridade_em = created_at WHERE prioridade_em IS NULL;
ALTER TABLE aurea.sell_offers ALTER COLUMN prioridade_em SET NOT NULL;

ALTER TABLE aurea.buy_orders ADD COLUMN IF NOT EXISTS prioridade_em bigint;
UPDATE aurea.buy_orders SET prioridade_em = created_at WHERE prioridade_em IS NULL;
ALTER TABLE aurea.buy_orders ALTER COLUMN prioridade_em SET NOT NULL;

CREATE INDEX IF NOT EXISTS sell_offers_fila_idx ON aurea.sell_offers (tipo_moeda, price, prioridade_em);
CREATE INDEX IF NOT EXISTS buy_orders_fila_idx  ON aurea.buy_orders  (tipo_moeda, price DESC, prioridade_em);

CREATE TABLE IF NOT EXISTS aurea.ofertas_historico (
  id                bigserial PRIMARY KEY,
  created_at        bigint  NOT NULL,
  lado              text    NOT NULL CHECK (lado IN ('venda', 'compra')),
  oferta_id         text    NOT NULL,
  lot_id            text,
  conta             text    NOT NULL,
  tipo_moeda        text    NOT NULL,
  evento            text    NOT NULL CHECK (evento IN ('publicada', 'editada', 'cancelada', 'executada')),
  preco_antes       bigint,
  preco_depois      bigint,
  qtd_antes         integer,
  qtd_depois        integer,
  prioridade_antes  bigint,
  prioridade_depois bigint,
  perdeu_a_vez      boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS ofertas_historico_oferta_idx ON aurea.ofertas_historico (oferta_id, created_at);
CREATE INDEX IF NOT EXISTS ofertas_historico_conta_idx  ON aurea.ofertas_historico (conta, created_at);

ALTER TABLE aurea.ofertas_historico ENABLE ROW LEVEL SECURITY;
