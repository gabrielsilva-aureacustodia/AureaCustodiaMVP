-- ============================================================================
-- 001_inicial — o estado sai do blob JSON e vira tabelas (módulo M1).
--
-- TUDO NO SCHEMA `aurea`, NUNCA EM `public`. O Supabase publica automaticamente
-- uma API REST na internet para o schema `public`, acessível com a chave `anon`
-- — que é pública por design e está num repositório aberto. Uma tabela em
-- `public` seria o estado inteiro (saldos, ofertas) legível e alterável por
-- qualquer pessoa, sem passar pela plataforma. Duas defesas, as duas ficam:
--   1. o schema `aurea` não está na lista de schemas expostos pela API;
--   2. RLS ligada sem política nenhuma nega tudo aos papéis `anon` e
--      `authenticated`. O dono (o usuário `postgres`, por conexão direta) não é
--      afetado — RLS não vale para o dono.
--
-- DINHEIRO É `bigint` EM CENTAVOS. Nunca `numeric`, nunca `float`. R$ 285,00 é
-- 28500. É a mesma convenção de `Cents` em src/domain/types.ts.
--
-- DATAS SEGUEM O MODELO DO DOMÍNIO, não o do banco: `Timestamp` (ms desde a
-- época, `bigint`) para o que precisa de ordenação — negociações, janelas de
-- 24h — e `DateBR` (`text` 'dd/mm/aaaa') para o que a regra de negócio congela,
-- como a data de emissão do recibo. Converter para `timestamptz` aqui obrigaria
-- a converter de volta a cada leitura, e um fuso errado mudaria o dia impresso
-- no certificado.
--
-- `ord bigserial` é a ORDEM DE INSERÇÃO. O AppState carrega arrays, e a ordem
-- deles importa: o motor de casamento desempata ofertas do mesmo preço e do
-- mesmo milissegundo pela posição no array (a ordenação do JavaScript é
-- estável). A coluna reproduz essa ordem na leitura sem expor nada à aplicação.
--
-- Este arquivo é idempotente (IF NOT EXISTS / ON CONFLICT) de propósito: rodar
-- duas vezes não dói. É aplicado por `npm run db:migrate` (scripts/db-migrate.mjs)
-- e, nos testes, por um Postgres embutido — a mesma SQL nos dois lugares.
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS aurea;

-- ---------------------------------------------------------------------------
-- Usuários. `email` é a chave enquanto o modelo do domínio for `UserEmail`;
-- migra para UUID no M2 (Supabase Auth), quando a frente A entregar a tabela
-- de identidade.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS aurea.users (
  email       text PRIMARY KEY,
  ord         bigserial,
  name        text NOT NULL,
  balance     bigint NOT NULL DEFAULT 0 CHECK (balance >= 0),
  -- Texto puro, como no seed (RA-02). Some no M2 com o Supabase Auth.
  pass        text,
  last_access bigint,
  prev_access bigint,
  -- Preferências (2FA, notificações). Documento pequeno e opcional; não vale
  -- uma tabela própria enquanto não houver consulta por preferência.
  settings    jsonb
);

-- ---------------------------------------------------------------------------
-- Moedas em custódia. `posicao` é o índice no array `user.coins` — preservado
-- porque `sellToBid` vende as PRIMEIRAS N moedas disponíveis do vendedor, e a
-- ordem decide quais moedas trocam de dono.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS aurea.coins (
  id             text PRIMARY KEY,
  owner_email    text NOT NULL REFERENCES aurea.users (email) ON DELETE CASCADE,
  posicao        integer NOT NULL,
  tipo_moeda     text NOT NULL,
  ano            integer NOT NULL,
  entrada        text NOT NULL,
  status_fisico  text NOT NULL,
  status_digital text NOT NULL,
  valor_estimado bigint NOT NULL CHECK (valor_estimado >= 0),
  protocolo      text NOT NULL,
  transferido    boolean NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS coins_owner_posicao_idx ON aurea.coins (owner_email, posicao);

-- Recibo NFT, 1:1 com a moeda. Tabela própria (e não colunas em `coins`)
-- porque o recibo tem ciclo de vida próprio: 'Extinto' na retirada física.
CREATE TABLE IF NOT EXISTS aurea.nfts (
  coin_id      text PRIMARY KEY REFERENCES aurea.coins (id) ON DELETE CASCADE,
  codigo       text NOT NULL UNIQUE,
  -- SIMULADO (RA-05): não há blockchain. Vira SHA-256 encadeado no M4.
  hash         text NOT NULL,
  data_emissao text NOT NULL,
  status       text NOT NULL
);

-- ---------------------------------------------------------------------------
-- Livro de ordens. Uma oferta de venda POR MOEDA (compra parcial de lote);
-- `lot_id` agrupa as do mesmo anúncio. `tipo_moeda` é desnormalizado de
-- propósito — o motor separa os livros por ele sem varrer inventários.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS aurea.sell_offers (
  id         text PRIMARY KEY,
  ord        bigserial,
  -- UNIQUE: uma moeda nunca está em duas ofertas ao mesmo tempo. A regra já
  -- vive em availableCoinsForSell; aqui ela vira impossível, não só improvável.
  coin_id    text NOT NULL UNIQUE REFERENCES aurea.coins (id),
  seller     text NOT NULL REFERENCES aurea.users (email),
  price      bigint NOT NULL CHECK (price > 0),
  obs        text NOT NULL DEFAULT '',
  lot_id     text NOT NULL,
  created_at bigint NOT NULL,
  tipo_moeda text NOT NULL
);
CREATE INDEX IF NOT EXISTS sell_offers_tipo_idx ON aurea.sell_offers (tipo_moeda, price, created_at);
CREATE INDEX IF NOT EXISTS sell_offers_lot_idx ON aurea.sell_offers (lot_id);

CREATE TABLE IF NOT EXISTS aurea.buy_orders (
  id         text PRIMARY KEY,
  ord        bigserial,
  buyer      text NOT NULL REFERENCES aurea.users (email),
  price      bigint NOT NULL CHECK (price > 0),
  qty        integer NOT NULL CHECK (qty > 0),
  created_at bigint NOT NULL,
  tipo_moeda text NOT NULL
);
CREATE INDEX IF NOT EXISTS buy_orders_tipo_idx ON aurea.buy_orders (tipo_moeda, price, created_at);

-- ---------------------------------------------------------------------------
-- Negociações concluídas. APPEND-ONLY: nunca se altera nem se apaga linha.
--
-- `fee` é a comissão TOTAL cobrada nesta negociação (por moeda × qty),
-- congelada no momento da gravação. Paga a metade do RA-06 que cabe ao banco:
-- hoje o extrato recalcula a comissão a partir das constantes atuais, e uma
-- mudança de taxa reescreveria o passado. Com a coluna, o valor cobrado é o
-- valor gravado — falta o extrato passar a lê-lo.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS aurea.trades (
  id         bigserial PRIMARY KEY,
  price      bigint NOT NULL CHECK (price > 0),
  qty        integer NOT NULL CHECK (qty > 0),
  date       bigint NOT NULL,
  buyer      text NOT NULL REFERENCES aurea.users (email),
  seller     text NOT NULL REFERENCES aurea.users (email),
  tipo_moeda text NOT NULL,
  fee        bigint NOT NULL CHECK (fee >= 0)
);
CREATE INDEX IF NOT EXISTS trades_tipo_date_idx ON aurea.trades (tipo_moeda, date);

-- ---------------------------------------------------------------------------
-- Envios para custódia (wizard de 5 etapas). `codigos_ativos_gerados` é a
-- lista de moedas criadas quando a etapa chega a 'Recibo emitido'.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS aurea.envios (
  protocolo              text PRIMARY KEY,
  ord                    bigserial,
  user_email             text NOT NULL REFERENCES aurea.users (email),
  tipo_moeda             text NOT NULL,
  ano                    integer NOT NULL,
  quantidade             integer NOT NULL CHECK (quantidade > 0),
  codigo_rastreio        text,
  data_postagem          bigint,
  data_recebimento       bigint,
  etapa_atual            text NOT NULL,
  created_at             bigint NOT NULL,
  codigos_ativos_gerados jsonb NOT NULL DEFAULT '[]'::jsonb
);
CREATE INDEX IF NOT EXISTS envios_user_idx ON aurea.envios (user_email);

-- ---------------------------------------------------------------------------
-- Depósitos SIMULADOS em conta (sem Pix, cartão nem conciliação). Append-only:
-- o extrato precisa explicar de onde veio cada centavo do saldo.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS aurea.deposits (
  id         bigserial PRIMARY KEY,
  user_email text NOT NULL REFERENCES aurea.users (email),
  valor      bigint NOT NULL CHECK (valor > 0),
  date       bigint NOT NULL
);

-- Cobrança de custódia vigente: uma por usuário.
CREATE TABLE IF NOT EXISTS aurea.custody_charges (
  user_email       text PRIMARY KEY REFERENCES aurea.users (email) ON DELETE CASCADE,
  total_moedas     integer NOT NULL CHECK (total_moedas >= 0),
  valor_cobrado    bigint NOT NULL CHECK (valor_cobrado >= 0),
  data_cobranca    text NOT NULL,
  status_pagamento text NOT NULL
);

-- ---------------------------------------------------------------------------
-- Contadores dos códigos RO-000001 e RO-ENV-0001. UMA linha, sempre id = 1.
--
-- Esta linha é também A FILA DE ESCRITA da plataforma: toda mutação começa
-- com `SELECT … FROM aurea.seq WHERE id = 1 FOR UPDATE`. Quem chega segundo
-- espera o commit de quem chegou primeiro e enxerga o estado já gravado — é o
-- que garante que duas compras simultâneas da mesma oferta não paguem duas
-- vezes e que dois envios simultâneos não recebam o mesmo protocolo.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS aurea.seq (
  id    integer PRIMARY KEY CHECK (id = 1),
  coin  integer NOT NULL DEFAULT 0,
  envio integer NOT NULL DEFAULT 0
);
INSERT INTO aurea.seq (id, coin, envio) VALUES (1, 0, 0) ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- RLS em TODAS as tabelas, sem política: nega tudo a `anon` e `authenticated`.
-- ---------------------------------------------------------------------------
ALTER TABLE aurea.users           ENABLE ROW LEVEL SECURITY;
ALTER TABLE aurea.coins           ENABLE ROW LEVEL SECURITY;
ALTER TABLE aurea.nfts            ENABLE ROW LEVEL SECURITY;
ALTER TABLE aurea.sell_offers     ENABLE ROW LEVEL SECURITY;
ALTER TABLE aurea.buy_orders      ENABLE ROW LEVEL SECURITY;
ALTER TABLE aurea.trades          ENABLE ROW LEVEL SECURITY;
ALTER TABLE aurea.envios          ENABLE ROW LEVEL SECURITY;
ALTER TABLE aurea.deposits        ENABLE ROW LEVEL SECURITY;
ALTER TABLE aurea.custody_charges ENABLE ROW LEVEL SECURITY;
ALTER TABLE aurea.seq             ENABLE ROW LEVEL SECURITY;
