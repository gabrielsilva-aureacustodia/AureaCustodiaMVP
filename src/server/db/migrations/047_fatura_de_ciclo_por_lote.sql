-- Migration 047: o índice de unicidade da fatura de ciclo no grão certo (26/10/2026)
--
-- O CRON DE FATURAMENTO PAROU DE COBRAR EM 21/10/2026 — POR CAUSA DESTE ÍNDICE.
-- A 039 deixou `faturas_ciclo_uniq` em (conta, competência, fim de cobertura). Dois
-- lados dele se chocaram com o resto do sistema:
--
--  1. ele contava as faturas CANCELADAS. As faturas do dia 1º de outubro, emitidas pela
--     regra antiga e canceladas na virada para o ciclo por moeda, ficaram com a
--     cobertura do ciclo seguinte gravada (21/11, 23/11, 24/11). Quando a moeda fez
--     aniversário e o cron foi emitir a fatura nova, de mesma conta, competência e
--     cobertura, o banco recusou — por causa de uma conta que já não vale nada;
--  2. ele não sabia do LOTE. Desde 05/10 cada lote (envio ou cadastro) é uma custódia
--     própria e ganha uma fatura própria (`emitirFaturasDosCiclos`), e dois lotes da
--     mesma conta aceitos no mesmo dia têm a mesma competência e a mesma cobertura.
--
-- O cron roda as contas todas numa transação só, então a recusa de UMA fatura desfez a
-- cobrança de TODAS: de 21/10 a 26/10 nenhuma fatura de ciclo foi emitida, a cobertura
-- das moedas acabou sem que ninguém fosse cobrado, e o expurgo tirou do livro as ofertas
-- dessas moedas e o aviso "Custódia a pagar" apareceu para quem nunca recebeu conta.
--
-- O índice continua existindo para a mesma coisa — o cron rodando dobrado não cobra a
-- mesma moeda duas vezes —, agora sem as canceladas e com as moedas da fatura na chave:
-- a mesma fatura duas vezes continua barrada; dois lotes do mesmo dia, não.
--
-- Só troca índice: o código no ar não muda de comportamento, então entra antes do push.

DROP INDEX IF EXISTS aurea.faturas_ciclo_uniq;

CREATE UNIQUE INDEX IF NOT EXISTS faturas_ciclo_uniq
  ON aurea.faturas_custodia (user_email, competencia, cobertura_ate, moeda_ids)
  WHERE origem = 'ciclo_mensal' AND status <> 'cancelada';
