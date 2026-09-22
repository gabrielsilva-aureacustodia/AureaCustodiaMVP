-- Migration 036: oferta de compra sem saldo — pré-pago e pós-pago
--
-- Decisão do Gabriel, 22/09/2026. Publicar oferta de compra exigia saldo em
-- conta, e a quantidade era cortada ao que o caixa aguentava. A regra era
-- coerente com o casamento automático — o débito acontece sozinho, então o
-- dinheiro precisa existir —, mas trancava quem não quer deixar dinheiro
-- parado na plataforma esperando uma venda aparecer.
--
--  1. `buy_orders.modalidade` diz como a oferta é bancada. O DEFAULT 'saldo'
--     não é enfeite: é o que toda ordem publicada antes de hoje era, e é por
--     ele que o livro antigo continua se comportando igual.
--
--  2. `buy_orders.pago_antecipado` é o dinheiro que entrou preso a UMA oferta
--     pré-paga. Não vai para o saldo do usuário de propósito: no caixa geral
--     ele poderia ser gasto em outra compra, e a oferta ficaria anunciada sem
--     lastro — que é exatamente o que a modalidade existe para evitar.
--
--  3. `reservas_compra` é a janela de dez minutos do pós-pago. Quando um bid
--     pós-pago casa, a moeda NÃO troca de dono: sai do livro e fica reservada.
--     Quem continua dono é o vendedor, senão o comprador poderia revender uma
--     moeda que nunca pagou, dentro do próprio prazo.
--
-- A oferta de venda é guardada inteira em `oferta_json` porque, se a reserva
-- expirar, ela precisa voltar ao livro EXATAMENTE como era — inclusive `obs` e
-- `lot_id`, que é o que reagrupa a moeda no anúncio original da vitrine.
-- Remontá-la campo a campo já perdeu esses dois numa primeira tentativa.
--
-- SEM CHAVE ESTRANGEIRA NENHUMA, e por duas razões que se somam:
--
--  1. A reserva é RASTRO do que aconteceu, não integridade referencial. Moeda e
--     conta podem ser apagadas numa limpeza de acervo — foram, três vezes nesta
--     semana — e a reserva precisa sobreviver para explicar uma cobrança.
--
--  2. FK para `aurea.users` impede `TRUNCATE users` sem CASCADE, e é assim que
--     a suíte limpa o banco entre casos. Uma tabela de histórico não pode
--     ditar como as tabelas vivas são zeradas.

ALTER TABLE aurea.buy_orders
  ADD COLUMN IF NOT EXISTS modalidade text NOT NULL DEFAULT 'saldo',
  ADD COLUMN IF NOT EXISTS pago_antecipado bigint NOT NULL DEFAULT 0;

ALTER TABLE aurea.buy_orders DROP CONSTRAINT IF EXISTS buy_orders_modalidade_check;
ALTER TABLE aurea.buy_orders ADD CONSTRAINT buy_orders_modalidade_check
  CHECK (modalidade IN ('saldo', 'prepago', 'pospago'));

CREATE TABLE IF NOT EXISTS aurea.reservas_compra (
  id                     text    PRIMARY KEY,
  bid_id                 text    NOT NULL,
  comprador              text    NOT NULL,
  vendedor               text    NOT NULL,
  coin_id                text    NOT NULL,
  tipo_moeda             text    NOT NULL,
  preco                  bigint  NOT NULL CHECK (preco >= 0),
  comissao_comprador     bigint  NOT NULL CHECK (comissao_comprador >= 0),
  total                  bigint  NOT NULL CHECK (total >= 0),
  oferta_json            jsonb   NOT NULL,
  criada_em              bigint  NOT NULL,
  expira_em              bigint  NOT NULL,
  status                 text    NOT NULL
                                 CHECK (status IN ('aguardando_pagamento', 'paga', 'expirada', 'cancelada')),
  payment_intent_ref     text,
  avisado_em             bigint
);

-- O índice que importa: achar rapidamente o que está correndo. Reserva fechada
-- fica para histórico e não é consultada em caminho quente.
CREATE INDEX IF NOT EXISTS reservas_abertas_idx
  ON aurea.reservas_compra (comprador, expira_em)
  WHERE status = 'aguardando_pagamento';

ALTER TABLE aurea.reservas_compra ENABLE ROW LEVEL SECURITY;

-- Idempotente para o banco onde a 036 já rodou com as chaves estrangeiras:
-- elas foram removidas no mesmo dia, pelos motivos acima.
ALTER TABLE aurea.reservas_compra DROP CONSTRAINT IF EXISTS reservas_compra_comprador_fkey;
ALTER TABLE aurea.reservas_compra DROP CONSTRAINT IF EXISTS reservas_compra_vendedor_fkey;
