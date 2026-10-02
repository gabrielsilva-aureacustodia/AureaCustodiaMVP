-- Migration 039: o ciclo de custódia passa a ser de cada moeda (02/10/2026)
--
-- A custódia era cobrada por mês-calendário: um cron no dia 1º emitia uma fatura
-- de ciclo por conta por competência ('AAAA-MM'), e o índice único
-- `faturas_ciclo_uniq` (018) garantia exatamente isso. O extrato do Rogério
-- mostrou o defeito: pagou em 25/09 e foi cobrado de novo em 01/10.
--
-- A regra do Gabriel é por moeda: a guarda corre a partir do dia em que a moeda
-- foi aceita e se renova todo mês no mesmo dia (src/domain/ciclo-custodia.ts).
-- Duas moedas da mesma conta, aceitas em dias diferentes, renovam em dias
-- diferentes — e podem cair no mesmo mês-calendário. O índice antigo recusaria a
-- segunda fatura de ciclo do mês, então ele sai.
--
-- 1. `cobertura_ate`: o último instante da guarda que a fatura cobre (o fim do
--    ciclo da moeda). É a COBERTURA, e não o prazo de pagamento
--    (`data_vencimento`). Nulo nas faturas anteriores a esta regra, que cobriam
--    o mês-calendário da competência — quem lê cai em `fimDaCompetencia`.
-- 2. A unicidade continua existindo, no grão certo: uma fatura de ciclo por
--    conta, por competência e por fim de ciclo. É a rede de proteção contra o
--    cron rodar duas vezes no mesmo dia. Linhas antigas (cobertura nula) não
--    conflitam entre si: nulos são distintos para o índice.
--
-- Aditiva: o código que está no ar antes do deploy não lê a coluna nova.

ALTER TABLE aurea.faturas_custodia ADD COLUMN IF NOT EXISTS cobertura_ate bigint;

DROP INDEX IF EXISTS aurea.faturas_ciclo_uniq;

CREATE UNIQUE INDEX IF NOT EXISTS faturas_ciclo_uniq
  ON aurea.faturas_custodia (user_email, competencia, cobertura_ate)
  WHERE origem = 'ciclo_mensal';
