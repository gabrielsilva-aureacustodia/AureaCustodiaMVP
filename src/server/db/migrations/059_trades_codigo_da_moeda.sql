-- Migration 059: o código da moeda em cada negociação (T5, 22/11/2026)
--
-- POR QUE EXISTE. O KPI "margem por moeda captada" do conselho precisa ligar a comissão de uma negociação à moeda
-- que foi vendida. Até aqui `trades` guardava preço, quantidade, partes e comissão, mas não QUAL moeda trocou de
-- mãos, então a comissão só podia ser calculada "por moeda negociada", sem saber de quem era a moeda.
--
-- O QUE GUARDA. `coin_ids`: lista (jsonb) dos códigos 'RO-000042' das moedas da negociação — uma negociação com
-- qty = N leva N códigos. Autorizado pelo Gabriel em 22/11/2026.
--
-- HISTÓRICO ANTIGO FICA NULL. Não se reconstrói por palpite: negociação anterior a esta migration segue com
-- `coin_ids` nulo, e o KPI mostra "sem dado" para ela. A tabela continua append-only; nenhuma linha é alterada.
--
-- Idempotente (IF NOT EXISTS), como as demais. Aplicada pelo Controle junto com o commit.

ALTER TABLE aurea.trades ADD COLUMN IF NOT EXISTS coin_ids jsonb;
