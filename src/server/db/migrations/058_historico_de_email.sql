-- Migration 058: histórico de troca de e-mail (Manutenção 22-11, T1, 22/11/2026)
--
-- POR QUE EXISTE. O e-mail da conta entra no hash de cada lançamento do livro-razão (`user_email` é um dos campos
-- de CAMPOS_DO_LANCAMENTO). Até hoje a troca de e-mail fazia `UPDATE ledger_entries SET user_email`, o que
-- reescrevia um livro que é append-only e QUEBRAVA a cadeia de hashes: foi assim que o painel passou a avisar
-- "a cadeia de hashes do livro-razão não confere" depois de corrigir `…@gamil.com` para `…@gmail.com`.
--
-- O QUE MUDA. O livro-razão deixa de ser tocado na troca. Esta tabela guarda de qual e-mail para qual a conta foi,
-- e a leitura por conta (ficha do admin, saldo pelo livro, data de criação) junta os e-mails antigos ao atual.
-- `email_atual` é sempre o e-mail vivo da conta: a cada troca, as linhas que apontavam para o e-mail anterior são
-- repontadas, então uma conta trocada três vezes continua achando as três gerações com uma consulta só.
--
-- A CHAVE ESTRANGEIRA SAI. `ledger_entries.user_email` apontava para `users(email)`; com o livro intocado, a linha do
-- e-mail antigo some de `users` na troca e a chave impediria isso. O livro é histórico imutável: guarda o e-mail
-- da época e não deve depender de uma linha mutável (era essa dependência que obrigava a reescrevê-lo). O saldo
-- continua conferido contra `users.balance` pela soma do livro (`saldosPeloLedger`).
--
-- O código no ar não lê a tabela nova, mas o código novo a ESCREVE na troca de e-mail — aplicar esta migration
-- ANTES de publicar o código que a usa. RLS ligado e sem política, como nas demais tabelas do schema `aurea`.

CREATE TABLE IF NOT EXISTS aurea.email_historico (
  email_antigo text   PRIMARY KEY,
  email_atual  text   NOT NULL,
  trocado_em   bigint NOT NULL
);

CREATE INDEX IF NOT EXISTS email_historico_atual_idx ON aurea.email_historico (email_atual);

ALTER TABLE aurea.email_historico ENABLE ROW LEVEL SECURITY;

ALTER TABLE aurea.ledger_entries DROP CONSTRAINT IF EXISTS ledger_entries_user_email_fkey;
