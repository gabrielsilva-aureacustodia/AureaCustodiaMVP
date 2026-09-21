-- Migration 032: a custódia acompanha a moeda vendida, e o plano mensal volta
--
-- Por que esta migration existe (decisão do Gabriel, 21/09/2026):
--
--  1. Quando uma moeda em custódia é vendida, a obrigação de guarda passa para
--     o comprador, que herda só os MESES QUE FALTAM. Um anual vendido no 2º mês
--     vira um plano de 11 meses por R$ 22,00 no nome do comprador, e o plano do
--     vendedor é encerrado. Para isso o plano precisa guardar o próprio prazo
--     (`meses_contratados`) em vez de deduzi-lo da modalidade: a modalidade
--     continua sendo 'anual', mas a cobertura não é de 12 meses.
--
--  2. `origem` distingue o plano que o cliente contratou na tela do plano que o
--     sistema criou sozinho na venda — é o que a tela usa para oferecer ao
--     comprador as três opções (meses restantes, 12 meses cheios, ou mensal), e
--     é o que impede que essa troca seja oferecida num plano comum.
--
--  3. `plano_origem_id` guarda de qual plano a moeda veio. Sem ele não há como
--     reconstruir, meses depois, por que o comprador foi cobrado por 11 meses.
--
--  4. A fatura ganha a origem 'transferencia'. O CHECK de 018 só aceitava
--     ('ciclo_mensal', 'contratacao', 'renovacao_anual') e recusaria a primeira
--     venda de moeda em custódia — com erro de constraint no meio da compra,
--     que é o pior lugar possível para descobrir isso.
--
-- O plano MENSAL volta a ser contratável (R$ 3,00 por moeda por mês) ao lado do
-- anual. Não é preciso mexer no CHECK de modalidade: a migration 026 já aceita
-- 'mensal', que nunca chegou a sair do banco. 'bienal' continua aceito pelo
-- mesmo motivo de lá — recusá-lo não apagaria plano nenhum, só travaria UPDATE
-- nas linhas antigas.

ALTER TABLE aurea.planos_custodia
  ADD COLUMN IF NOT EXISTS meses_contratados integer;

ALTER TABLE aurea.planos_custodia
  ADD COLUMN IF NOT EXISTS origem text NOT NULL DEFAULT 'contratacao';

ALTER TABLE aurea.planos_custodia
  ADD COLUMN IF NOT EXISTS plano_origem_id text;

ALTER TABLE aurea.planos_custodia DROP CONSTRAINT IF EXISTS planos_custodia_origem_check;
ALTER TABLE aurea.planos_custodia ADD CONSTRAINT planos_custodia_origem_check
  CHECK (origem IN ('contratacao', 'transferencia'));

-- Sem FK para a própria tabela de propósito: o plano de origem pode ser apagado
-- numa limpeza de acervo sem que isso invalide a cobrança já emitida ao
-- comprador. O campo é rastro de auditoria, não integridade referencial.
CREATE INDEX IF NOT EXISTS planos_origem_idx ON aurea.planos_custodia (plano_origem_id)
  WHERE plano_origem_id IS NOT NULL;

ALTER TABLE aurea.faturas_custodia DROP CONSTRAINT IF EXISTS faturas_origem_check;
ALTER TABLE aurea.faturas_custodia ADD CONSTRAINT faturas_origem_check
  CHECK (origem IN ('ciclo_mensal', 'contratacao', 'renovacao_anual', 'transferencia'));
