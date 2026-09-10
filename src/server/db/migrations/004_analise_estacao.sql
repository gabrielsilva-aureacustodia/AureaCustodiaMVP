-- ---------------------------------------------------------------------------
-- 004 — A estação de validação física (frente E)
--
-- Duas mudanças, ambas ADITIVAS: nenhuma coluna existente muda de tipo e
-- nenhuma linha gravada precisa ser reescrita. É por isso que a STORE_KEY
-- continua em `aurea-market-v6` — o formato antigo continua legível, só passa
-- a ter uma lista a mais, vazia. (A regra de subir a versão existe para
-- mudança que deixa registro velho preso, como a v6 fez com `tipoMoeda`.
-- Acrescentar lista opcional não é esse caso, e apagar o banco de teste sem
-- necessidade custaria o acervo de demonstração dos sócios.)
--
--   1. `aurea.seq` ganha o contador de RO-ANL-0001;
--   2. `aurea.analises` guarda cada procedimento da bancada.
--
-- POR QUE `analises` É TABELA PRÓPRIA E NÃO COLUNAS EM `coins`
-- ------------------------------------------------------------
-- Porque moeda recusada nunca vira linha em `coins` — e mesmo assim precisa de
-- registro: é ele que explica ao cliente por que o pacote está voltando, e é
-- ele que entra na corrente de hashes. Uma análise sem moeda é um estado que
-- `coins` não sabe representar.
-- ---------------------------------------------------------------------------

ALTER TABLE aurea.seq ADD COLUMN IF NOT EXISTS analise integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS aurea.analises (
  protocolo       text PRIMARY KEY,
  posicao         integer NOT NULL,
  protocolo_envio text NOT NULL,
  -- Sem FK para `coins`: a moeda pode ser apagada de um ambiente de teste, e a
  -- análise é append-only — ela não some junto. O vínculo é pelo código.
  codigo_moeda    text,
  codigo_recibo   text,
  tipo_moeda      text NOT NULL,
  ano             integer NOT NULL,
  -- Miligramas inteiros. `numeric` com casas decimais permitiria 27.0 e 27
  -- gravarem diferente e hashearem diferente — ver domain/analise.ts.
  peso_mg         integer NOT NULL,
  veredito        text NOT NULL CHECK (veredito IN ('aprovada', 'recusada')),
  motivo_recusa   text,
  operador        text NOT NULL,
  aprovador       text NOT NULL,
  caixa           text,
  posicao_caixa   integer,
  validado_em     bigint NOT NULL,
  caminho_video   text,
  hash_anterior   text NOT NULL,
  hash            text NOT NULL
);

-- `posicao` é o índice no array append-only; é por ela que a corrente é lida
-- na ordem em que foi escrita.
CREATE UNIQUE INDEX IF NOT EXISTS analises_posicao_idx ON aurea.analises (posicao);
CREATE INDEX IF NOT EXISTS analises_envio_idx ON aurea.analises (protocolo_envio);
CREATE INDEX IF NOT EXISTS analises_moeda_idx ON aurea.analises (codigo_moeda);

-- Mesma regra das demais: RLS ligado sem política nenhuma, negando tudo a
-- `anon` e `authenticated`. Só a conexão de serviço enxerga.
ALTER TABLE aurea.analises ENABLE ROW LEVEL SECURITY;
