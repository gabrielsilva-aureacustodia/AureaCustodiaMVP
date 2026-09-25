-- Migration 037: a fatura de entrada no acervo (25/09/2026)
--
-- Moeda registrada pelo painel — cadastro direto ou cadastro sem envio — nascia
-- guardada sem plano e sem fatura, e ficava assim até o ciclo mensal passar no
-- dia 1º. Eram 28 moedas nessa situação quando o Gabriel apontou o problema:
-- guarda ativa, dono sem aviso nenhum, e desde a trava de 23/09 a moeda presa
-- (sem prova de pagamento não se anuncia, e sem fatura não havia o que pagar).
--
-- A cobrança passa a sair no instante da entrada, com origem própria. Origem
-- própria, e não 'ciclo_mensal', por causa do índice único `faturas_ciclo_uniq`
-- de 018: ele admite UMA fatura de ciclo por conta por competência, e duas
-- entradas de moeda no mesmo mês são legítimas.
--
-- Sem índice de unicidade aqui, pelo mesmo motivo: quem registra dois lotes no
-- mesmo mês recebe duas faturas. Quem impede a cobrança repetida da mesma moeda
-- é `custodiaResolvidaNaCompetencia`, em src/domain/cobranca-de-entrada.ts.

ALTER TABLE aurea.faturas_custodia DROP CONSTRAINT IF EXISTS faturas_origem_check;
ALTER TABLE aurea.faturas_custodia ADD CONSTRAINT faturas_origem_check
  CHECK (origem IN ('ciclo_mensal', 'contratacao', 'renovacao_anual', 'entrada_no_acervo'));
