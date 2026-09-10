-- ---------------------------------------------------------------------------
-- 005 — `aurea.nfts` vira `aurea.recibos`
--
-- Decisão D-4 dos sócios, 10/09/2026. O jurídico proibiu a palavra "NFT" em
-- 09/09/2026 porque ela enquadra a operação na regulação de ativos virtuais
-- (Res. BCB 519-521/2026, IN RFB 1888/2019) — e a Áurea guarda moeda física e
-- emite comprovante de guarda, não emite ativo virtual. O nome da tabela conta
-- porque este repositório é público e porque toda consulta de auditoria e todo
-- relatório para o contador passa por ele.
--
-- POR QUE ISSO É BARATO AGORA E CARO DEPOIS
-- -----------------------------------------
-- Junto com esta migration, `STORE_KEY` sobe para `aurea-market-v7` e o banco
-- recomeça do seed. Enquanto existem só as sete contas de sócios, isso não
-- custa nada. Depois do primeiro cliente real, a mesma troca viraria migração
-- de dado com risco de perder inventário.
--
-- O RENAME preserva dados, chaves, índices e a foreign key para `aurea.coins`
-- — o Postgres reescreve as referências sozinho. Nenhuma coluna muda de nome:
-- `codigo`, `hash`, `data_emissao` e `status` continuam iguais.
--
-- O VALOR de `codigo` NÃO é tocado aqui, e a primeira versão deste comentário
-- errava ao dizer que o seed o regravaria: com Postgres o estado vive em
-- tabelas, e subir `STORE_KEY` não as apaga. Quem troca 'NFT-000042' por
-- 'REC-000042' nas linhas já gravadas é a migration **006**.
-- ---------------------------------------------------------------------------

-- Idempotente pela checagem de existência: `ALTER TABLE ... RENAME` não aceita
-- `IF NOT EXISTS`, e rodar duas vezes num banco já renomeado precisa ser
-- inofensivo (o aplicador de testes recria o schema do zero).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'aurea' AND table_name = 'nfts'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'aurea' AND table_name = 'recibos'
  ) THEN
    ALTER TABLE aurea.nfts RENAME TO recibos;
  END IF;
END
$$;

-- Rede de proteção para o ambiente que nunca teve a tabela antiga (banco novo
-- criado direto na 005, ou schema de teste recriado). Mesma definição da 001,
-- com o nome novo.
CREATE TABLE IF NOT EXISTS aurea.recibos (
  coin_id      text PRIMARY KEY REFERENCES aurea.coins (id) ON DELETE CASCADE,
  codigo       text NOT NULL UNIQUE,
  -- SIMULADO (RA-05): não há blockchain. Vira SHA-256 encadeado no M4.
  hash         text NOT NULL,
  data_emissao text NOT NULL,
  status       text NOT NULL
);

-- O RENAME carrega o RLS junto, mas a tabela recém-criada pelo bloco acima não
-- teria — e a regra da casa é que toda tabela nasce com RLS ligado, sem
-- política, negando tudo a `anon` e `authenticated`.
ALTER TABLE aurea.recibos ENABLE ROW LEVEL SECURITY;
