-- Migration 049: de que pagamento veio cada entrada de dinheiro (03/11/2026)
--
-- POR QUE EXISTE. `aurea.deposits` registra todo dinheiro que entrou pelo Mercado Pago — não só o
-- depósito em conta, mas o Pix ou cartão que pagou custódia, compra, retirada e frete. A linha não dizia
-- qual, e o extrato chamava todas de "Depósito simulado em conta", resto do MVP sem gateway. O Gabriel
-- via o rótulo em pagamentos reais. Nada no sistema é simulado (Gabriel, 25/10/2026).
--
-- O QUE FAZ.
--  1. Três colunas, todas opcionais: `origem` (o tipo da intenção de pagamento), `metodo` (pix ou
--     cartao) e `ref_externa` (a `external_reference` da intenção). Daqui em diante a conciliação as
--     preenche (src/server/payments/conciliacao.ts).
--  2. As entradas antigas ganham a origem casadas com a intenção CREDITADA da mesma conta e do mesmo
--     valor, a mais próxima no tempo dentro de uma hora. Em 03/11/2026 as 11 entradas de produção casaram,
--     todas a menos de um segundo do crédito. A que não casar fica sem origem e aparece como "Entrada por
--     Pix ou cartão".
--
-- Aditiva: o código no ar não lê as colunas novas, então entra antes do push sem quebrar nada.

ALTER TABLE aurea.deposits ADD COLUMN IF NOT EXISTS origem text;
ALTER TABLE aurea.deposits ADD COLUMN IF NOT EXISTS metodo text;
ALTER TABLE aurea.deposits ADD COLUMN IF NOT EXISTS ref_externa text;

WITH par AS (
  SELECT d.id AS deposit_id, i.tipo_operacao, i.metodo, i.external_reference
  FROM aurea.deposits d
  CROSS JOIN LATERAL (
    SELECT pi.tipo_operacao, pi.metodo, pi.external_reference
    FROM aurea.payment_intents pi
    WHERE pi.user_email = d.user_email
      AND pi.valor = d.valor
      AND pi.status = 'creditado'
      AND abs(pi.updated_at - d.date) <= 3600000
    ORDER BY abs(pi.updated_at - d.date)
    LIMIT 1
  ) i
  WHERE d.origem IS NULL
)
UPDATE aurea.deposits d
SET origem = COALESCE(par.tipo_operacao, 'deposito'),
    metodo = CASE WHEN par.metodo = 'pix' THEN 'pix' ELSE 'cartao' END,
    ref_externa = par.external_reference
FROM par
WHERE d.id = par.deposit_id;
