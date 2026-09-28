-- Migration 038: a intenção de pagamento da oferta de compra sem saldo (28/09/2026)
--
-- O QUE ESTAVA QUEBRADO
--
-- Em 22/09/2026, a oferta de compra sem saldo acrescentou dois tipos de
-- operação de pagamento — 'oferta_prepaga' e 'reserva_compra' — ao union
-- `TipoOperacaoPagamento` (src/server/db/repositories/payments.ts) e à tabela
-- de liquidadores da conciliação. O que NÃO aconteceu foi a migration: o CHECK
-- de `tipo_operacao`, escrito na 017, continuou aceitando só os seis tipos
-- antigos.
--
-- O resultado é que `repositorioIntencoes().criar()` estourava violação de
-- constraint antes mesmo de o gateway ser chamado. Na tela, isso apareceu como
-- "erro de comunicação com o gateway" nos botões de Pix e cartão da oferta
-- pré-paga — e o Gabriel notou o que importava: na página de Mercado os mesmos
-- botões funcionam. Funcionam porque 'compra_direta' está na lista de 017.
--
-- Não era o gateway, não era o pop-up e não era a rota: era esta linha de SQL
-- que nunca foi escrita. Mesma família de erro da queda de 22/09, quando as
-- migrations 034 e 035 não foram aplicadas.
--
-- 'reserva_compra' entra junto, embora o pós-pago esteja oculto na tela desde
-- 28/09: o caminho existe no código e estaria quebrado do mesmo jeito no dia
-- em que a opção voltar.

ALTER TABLE aurea.payment_intents DROP CONSTRAINT IF EXISTS payment_intents_tipo_operacao_check;
ALTER TABLE aurea.payment_intents ADD CONSTRAINT payment_intents_tipo_operacao_check CHECK (tipo_operacao IN (
  'deposito', 'compra_direta', 'plano_custodia', 'fatura_custodia', 'assinatura_custodia',
  'retirada', 'oferta_prepaga', 'reserva_compra'
));
