-- ---------------------------------------------------------------------------
-- 012 — a lista de tipos do ledger passa a ser a UNIÃO das três frentes
--
-- Nasceu como `010_retiradas_ledger.sql` na frente C, para habilitar o tipo
-- `taxa_retirada`. Foi renumerada e reescrita no merge de 11/09/2026, e o
-- motivo é o defeito que ela tinha — um defeito silencioso, do tipo que só
-- aparece em produção.
--
-- O QUE ESTAVA ERRADO
-- -------------------
-- As frentes B e C trabalharam em paralelo e as duas precisaram alargar a mesma
-- restrição `ledger_entries_tipo_check`. Cada uma escreveu um DROP seguido de um
-- ADD com a SUA lista. A frente B já tinha antecipado `taxa_retirada` na lista
-- dela; a frente C não antecipou `saque` nem `taxa_saque`.
--
-- Como o aplicador ordena por nome de arquivo, a migration da frente C rodaria
-- por último e substituiria a restrição pela lista curta. O efeito: o banco
-- passaria a RECUSAR todo lançamento de saque, e a funcionalidade inteira da
-- frente B morreria no `INSERT` — sem erro de compilação, sem teste vermelho,
-- só uma violação de CHECK no primeiro saque de um cliente real.
--
-- A CORREÇÃO
-- ----------
-- Esta migration declara a união completa e é a ÚLTIMA a tocar a restrição.
-- Rodar depois da 009 é o que garante o resultado certo, e é por isso que ela é
-- a 012 e não a 010. Qualquer frente futura que precise de um tipo novo deve
-- repetir a lista inteira aqui, nunca só o tipo que lhe interessa.
-- ---------------------------------------------------------------------------

ALTER TABLE aurea.ledger_entries DROP CONSTRAINT IF EXISTS ledger_entries_tipo_check;
ALTER TABLE aurea.ledger_entries ADD CONSTRAINT ledger_entries_tipo_check CHECK (tipo IN (
  -- migration 003, o núcleo contábil
  'saldo_inicial', 'deposito', 'compra', 'venda', 'comissao',
  'custodia', 'estorno', 'ajuste',
  -- migration 009, frente B — saque de recursos
  'saque', 'taxa_saque',
  -- esta migration, frente C — retirada física da moeda
  'taxa_retirada'
));
