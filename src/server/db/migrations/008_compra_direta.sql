-- ---------------------------------------------------------------------------
-- 008 — Suporte a compra direta pelo gateway (sessão B-3, bloco 7a)
--
-- Adiciona colunas `tipo_operacao` e `metadata` na tabela `aurea.payment_intents`.
--
-- Permite à conciliação distinguir depósitos simples em conta de compras
-- diretas de lotes do marketplace, liquidando as moedas e gerando os
-- lançamentos contábeis correspondentes.
-- ---------------------------------------------------------------------------

ALTER TABLE aurea.payment_intents ADD COLUMN IF NOT EXISTS tipo_operacao text NOT NULL DEFAULT 'deposito';
ALTER TABLE aurea.payment_intents ADD COLUMN IF NOT EXISTS metadata jsonb;
