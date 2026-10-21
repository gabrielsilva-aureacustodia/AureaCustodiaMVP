-- Migration 042: o primeiro mês de custódia embutido na compra da moeda (21/10/2026)
--
-- O "Gerais" (geraisseguros@gmail.com) comprou moeda cuja custódia do mês tinha sido paga pelo VENDEDOR e a
-- anunciou sem pagar nada: o sistema tratava a cobertura como da moeda, não do dono. A regra do Gabriel
-- é que TODA moeda precisa ter a custódia do dono atual paga — inclusive a comprada, mesmo que outra
-- pessoa já tenha pago. Para isso não depender de o comprador lembrar de pagar uma fatura depois, o primeiro
-- mês entra na própria compra: preço + comissão + R$ 2,00, e a moeda nasce com os 30 dias seguintes pagos.
--
-- Essa cobrança nasce como uma fatura JÁ PAGA com origem própria (`compra`), na mesma transação da
-- negociação, para o livro-razão lançar a saída (`custodia`) e a DRE contar a receita. A única mudança de
-- schema é aceitar o valor novo na restrição de origem.
--
-- Aditiva: o código anterior ao deploy não grava a origem nova.

ALTER TABLE aurea.faturas_custodia DROP CONSTRAINT IF EXISTS faturas_origem_check;
ALTER TABLE aurea.faturas_custodia ADD CONSTRAINT faturas_origem_check
  CHECK (origem IN ('ciclo_mensal', 'contratacao', 'renovacao_anual', 'entrada_no_acervo', 'compra'));
