-- ---------------------------------------------------------------------------
-- 046 — Controle financeiro: custos e receitas recorrentes, por setor (25/10/2026)
--
-- Pedido do Gabriel: registrar no painel os custos da empresa (HostGator, Claude, Fly.io,
-- marketing…) e receitas fora da plataforma, com periodicidade e setor, e ver tudo junto com
-- taxas e impostos. Decisão de 25/10/2026: cada ocorrência vencida vira SOZINHA um lançamento
-- manual comum (o job diário de /api/cron/faturamento), e por isso entra na DRE como qualquer
-- despesa 4.1.xx ou receita 3.1.99. Regra pura em src/domain/financeiro/controle.ts.
--
-- O que muda no banco (tudo ADITIVO: o código anterior não lê nem grava o que é novo):
--   1. `setores_financeiros`: a lista editável de setores, semeada com a sugestão inicial.
--   2. `lancamentos_recorrentes`: o cadastro (tipo, conta, setor, valor, periodicidade, início, fim).
--   3. `lancamentos_manuais` ganha `recorrente_id`, `competencia` (o dia da ocorrência,
--      'AAAA-MM-DD') e `setor_id`, todos opcionais. O índice único parcial impede que a mesma
--      ocorrência seja lançada duas vezes — o job pode rodar de novo, ou junto com o botão do painel,
--      sem duplicar. Um estorno não carrega `recorrente_id`, então estornar não faz a ocorrência
--      voltar a ser lançada.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS aurea.setores_financeiros (
  id            bigserial PRIMARY KEY,
  nome          text    NOT NULL,
  ativo         boolean NOT NULL DEFAULT true,
  ord           integer NOT NULL DEFAULT 0,
  criado_por    text    NOT NULL,
  created_at    bigint  NOT NULL,
  atualizado_por text,
  atualizado_em  bigint
);
CREATE UNIQUE INDEX IF NOT EXISTS setores_financeiros_nome_idx ON aurea.setores_financeiros (lower(nome));

INSERT INTO aurea.setores_financeiros (nome, ord, criado_por, created_at) VALUES
  ('Tecnologia', 1, 'migration 046', 0),
  ('Marketing', 2, 'migration 046', 0),
  ('Operação e logística', 3, 'migration 046', 0),
  ('Jurídico e contábil', 4, 'migration 046', 0),
  ('Financeiro', 5, 'migration 046', 0),
  ('Pessoal', 6, 'migration 046', 0),
  ('Administrativo', 7, 'migration 046', 0)
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS aurea.lancamentos_recorrentes (
  id             bigserial PRIMARY KEY,
  tipo           text    NOT NULL CHECK (tipo IN ('custo', 'receita')),
  descricao      text    NOT NULL,
  fornecedor     text,
  conta_codigo   text    NOT NULL REFERENCES aurea.contas_contabeis (codigo),
  setor_id       bigint  REFERENCES aurea.setores_financeiros (id),
  valor          bigint  NOT NULL CHECK (valor > 0),
  periodicidade  text    NOT NULL CHECK (periodicidade IN ('mensal', 'bimestral', 'trimestral', 'semestral', 'anual', 'unica')),
  inicio         text    NOT NULL CHECK (inicio ~ '^\d{4}-\d{2}-\d{2}$'),
  fim            text    CHECK (fim IS NULL OR fim ~ '^\d{4}-\d{2}-\d{2}$'),
  ativo          boolean NOT NULL DEFAULT true,
  observacao     text,
  criado_por     text    NOT NULL,
  created_at     bigint  NOT NULL,
  atualizado_por text,
  atualizado_em  bigint
);
CREATE INDEX IF NOT EXISTS lancamentos_recorrentes_ativo_idx ON aurea.lancamentos_recorrentes (ativo);

ALTER TABLE aurea.lancamentos_manuais ADD COLUMN IF NOT EXISTS recorrente_id bigint REFERENCES aurea.lancamentos_recorrentes (id);
ALTER TABLE aurea.lancamentos_manuais ADD COLUMN IF NOT EXISTS competencia text;
ALTER TABLE aurea.lancamentos_manuais ADD COLUMN IF NOT EXISTS setor_id bigint REFERENCES aurea.setores_financeiros (id);
CREATE UNIQUE INDEX IF NOT EXISTS lancamentos_manuais_ocorrencia_idx
  ON aurea.lancamentos_manuais (recorrente_id, competencia)
  WHERE recorrente_id IS NOT NULL;

ALTER TABLE aurea.setores_financeiros     ENABLE ROW LEVEL SECURITY;
ALTER TABLE aurea.lancamentos_recorrentes ENABLE ROW LEVEL SECURITY;
