-- Migration 050: "primeiro mês de custódia já pago" no cadastro sem envio (14/11/2026)
--
-- POR QUE EXISTE. No evento de lançamento (07 a 09/11/2026) o Rogério vendeu moedas em mãos, com o primeiro
-- mês de custódia embutido no preço. O cadastro sem envio não tinha como dizer isso: ele deu "ajuste de
-- saldo" a cada cliente e quitou a fatura na mão, o que lançou entrada sem origem no ledger.
--
-- O QUE FAZ. Uma coluna booleana em `envios`. Ligada, a análise da bancada cria a fatura de entrada das
-- moedas APROVADAS já paga, com a entrada de dinheiro rotulada `custodia_recebida_fora` em `deposits.origem`
-- (coluna de texto livre desde a 049, sem CHECK — não há constraint a ampliar).
--
-- Aditiva: o código no ar não lê a coluna, então entra antes do push sem quebrar nada.

ALTER TABLE aurea.envios ADD COLUMN IF NOT EXISTS primeiro_mes_pago boolean NOT NULL DEFAULT false;
