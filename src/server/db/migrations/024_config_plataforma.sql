-- ============================================================================
-- 024_config_plataforma — taxas, parâmetros e catálogo de moedas editáveis pelo painel
-- (frente C, sub-branch C3 · docs/PLANO_EXECUCAO_ADMIN.md, seção 3.1, com a tabela 6.1 de
-- docs/finalizacoes/PLANO_FINALIZACOES_3_BRANCHES.md).
--
-- O CÓDIGO DEIXA DE SER A VERDADE E PASSA A SER O PADRÃO. Uma chave que não tem linha em
-- `config_plataforma` vale o que o código diz (`TAXAS_PADRAO` em src/domain/fees.ts e os
-- padrões de src/domain/admin/configuracao.ts). A linha só nasce quando alguém muda o valor
-- pelo painel — por isso a tabela começa vazia e nenhuma taxa muda com esta migration.
--
-- `valor` é jsonb para caber número e texto na mesma coluna; dinheiro continua inteiro em
-- centavos e percentual em pontos-base, e quem confere o formato é o domínio antes do INSERT.
--
-- `config_historico` É APPEND-ONLY. Responde "quem baixou a comissão em março, e para quanto":
-- taxa de plataforma que muda sem rastro é discussão insolúvel depois. O repositório só faz
-- INSERT e SELECT nela. Mudança no catálogo de moedas também entra aqui, com a chave
-- `catalogo:<tipo>`, para o histórico da tela ser um só.
--
-- `tipos_moeda` nasce semeada a partir de `COIN_TYPES` (src/domain/constants.ts) na primeira
-- leitura — o mesmo desenho do `garantirCatalogos()` do plano de contas. Tipo não se apaga:
-- desativa-se (`ativo = false`), porque há moeda, envio e negociação gravados com a chave.
-- ============================================================================

CREATE TABLE IF NOT EXISTS aurea.config_plataforma (
  chave          text   PRIMARY KEY,
  valor          jsonb  NOT NULL,
  tipo           text   NOT NULL,
  rotulo         text   NOT NULL DEFAULT '',
  descricao      text   NOT NULL DEFAULT '',
  atualizado_em  bigint NOT NULL,
  atualizado_por text   NOT NULL
);

ALTER TABLE aurea.config_plataforma DROP CONSTRAINT IF EXISTS config_plataforma_tipo_check;
ALTER TABLE aurea.config_plataforma ADD CONSTRAINT config_plataforma_tipo_check
  CHECK (tipo IN ('bp', 'centavos', 'inteiro', 'texto'));

CREATE TABLE IF NOT EXISTS aurea.config_historico (
  id           bigserial PRIMARY KEY,
  chave        text   NOT NULL,
  valor_antigo jsonb,
  valor_novo   jsonb  NOT NULL,
  ator         text   NOT NULL,
  created_at   bigint NOT NULL
);

CREATE INDEX IF NOT EXISTS config_historico_chave_idx ON aurea.config_historico (chave, id);
CREATE INDEX IF NOT EXISTS config_historico_recente_idx ON aurea.config_historico (id DESC);

CREATE TABLE IF NOT EXISTS aurea.tipos_moeda (
  chave      text    PRIMARY KEY,
  ano_padrao integer NOT NULL,
  tiragem    text    NOT NULL DEFAULT '',
  categoria  text    NOT NULL,
  negociavel boolean NOT NULL DEFAULT false,
  detail     text    NOT NULL DEFAULT '',
  ord        integer NOT NULL DEFAULT 0,
  ativo      boolean NOT NULL DEFAULT true,
  criado_por text    NOT NULL,
  created_at bigint  NOT NULL
);

ALTER TABLE aurea.tipos_moeda DROP CONSTRAINT IF EXISTS tipos_moeda_ano_check;
ALTER TABLE aurea.tipos_moeda ADD CONSTRAINT tipos_moeda_ano_check
  CHECK (ano_padrao BETWEEN 1900 AND 2100);

ALTER TABLE aurea.config_plataforma ENABLE ROW LEVEL SECURITY;
ALTER TABLE aurea.config_historico  ENABLE ROW LEVEL SECURITY;
ALTER TABLE aurea.tipos_moeda       ENABLE ROW LEVEL SECURITY;
