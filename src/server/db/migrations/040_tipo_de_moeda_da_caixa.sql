-- Migration 040: cada caixa do cofre guarda um tipo de moeda (05/10/2026)
--
-- A caixa tinha código, capacidade e local, mas nada dizia de QUE moeda ela era. Resultado, apontado
-- pelo Gabriel: moedas da Entrega da Bandeira foram cadastradas na caixa dos Direitos Humanos, e a
-- EB-001 passou das 100 posições sem que nada barrasse.
--
-- `tipo_moeda` é a chave do catálogo ('Entrega da Bandeira Olímpica', 'Direitos Humanos'…). Nulo
-- significa "aceita qualquer tipo" — é o valor de toda caixa já cadastrada até aqui, então nada
-- muda para quem não preencher. Quando preenchido, o cadastro de moeda (direto, sem envio e a
-- bancada) só aloca nessa caixa moeda desse tipo, e passa para a próxima caixa do tipo quando
-- esta enche (src/domain/admin/caixas.ts, `alocarNasCaixas`).
--
-- Aditiva: o código anterior ao deploy não lê a coluna.

ALTER TABLE aurea.caixas ADD COLUMN IF NOT EXISTS tipo_moeda text;
