-- ============================================================================
-- 003_ledger_dre_auditoria — o livro-razão, a trilha de auditoria e a base
-- contábil da DRE (módulos M4 e M7).
--
-- POR QUE NADA DISTO ENTRA NO AppState
-- ------------------------------------
-- O AppState é o retrato que as telas leem e que o motor de casamento muta.
-- Lançamento de ledger, linha de auditoria e parâmetro de imposto não são
-- lidos por tela de mercado nenhuma, e carregá-los a cada `getState()` só
-- engordaria as nove consultas do polling. Eles são ESCRITOS pela camada de
-- banco, dentro da mesma transação que grava a mutação (src/server/db/estado.ts),
-- e LIDOS pelos relatórios (src/server/relatorios/). É o mesmo desenho da 002.
--
-- APPEND-ONLY, DE VERDADE. `ledger_entries`, `audit_log` e `exportacoes` não
-- têm UPDATE nem DELETE em repositório nenhum. Corrige-se com lançamento
-- inverso, nunca editando. O `hash` de cada lançamento incorpora o anterior
-- (src/domain/hash.ts): alterar uma linha antiga por fora quebra a cadeia, e
-- `verificarCadeia` acusa.
--
-- TUDO NO SCHEMA `aurea`, RLS EM TODAS. Mesmo motivo das anteriores: o
-- Supabase publica `public` como API REST na internet.
--
-- DINHEIRO É `bigint` EM CENTAVOS. Percentuais de imposto são inteiros em
-- pontos-base (32% = 3200). Nunca `numeric`, nunca `float`.
--
-- OS CATÁLOGOS (plano de contas e chaves de parâmetro) NÃO SÃO SEMEADOS AQUI.
-- Eles vivem em src/domain/dre.ts — a única fonte da verdade — e a aplicação
-- os upserta na primeira leitura (repositories/contabil.ts). Duplicar a lista
-- em SQL criaria duas verdades que divergem na primeira conta nova.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- O livro-razão: toda movimentação de saldo, com o saldo resultante e o hash.
--
-- `saldo_apos` é gravado, não derivado: é o que permite conferir uma linha
-- isolada ("depois desta venda o saldo era X") sem somar o livro inteiro. E
-- ele entra no hash — uma linha com saldo adulterado quebra a cadeia.
--
-- Sem ON DELETE na chave estrangeira, de propósito: apagar um usuário com
-- histórico financeiro é proibido pelo banco, não só pelo código.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS aurea.ledger_entries (
  id            bigserial PRIMARY KEY,
  created_at    bigint   NOT NULL,
  user_email    text     NOT NULL REFERENCES aurea.users (email),
  tipo          text     NOT NULL CHECK (tipo IN (
                  'saldo_inicial', 'deposito', 'compra', 'venda', 'comissao',
                  'custodia', 'estorno', 'ajuste')),
  valor         bigint   NOT NULL CHECK (valor >= 0),
  sinal         smallint NOT NULL CHECK (sinal IN (-1, 0, 1)),
  saldo_apos    bigint   NOT NULL,
  tipo_moeda    text,
  quantidade    integer,
  ref_interna   text,
  ref_externa   text,
  descricao     text     NOT NULL DEFAULT '',
  hash_anterior text     NOT NULL,
  hash          text     NOT NULL UNIQUE
);
CREATE INDEX IF NOT EXISTS ledger_entries_user_idx ON aurea.ledger_entries (user_email, id);
CREATE INDEX IF NOT EXISTS ledger_entries_created_idx ON aurea.ledger_entries (created_at);
CREATE INDEX IF NOT EXISTS ledger_entries_tipo_idx ON aurea.ledger_entries (tipo, created_at);

-- ---------------------------------------------------------------------------
-- Trilha de auditoria: UMA linha por mutação de estado (e por exportação),
-- dizendo quem fez, o quê, e quais contas foram tocadas. `detalhes` guarda o
-- resumo das operações gravadas (quantos inserts/updates por tabela e as
-- chaves envolvidas) — o suficiente para reconstruir "o que essa ação fez"
-- sem guardar o estado inteiro.
--
-- `ator` é o e-mail da sessão quando há uma, ou 'sistema', 'webhook:…',
-- 'cron:…'. Não há chave estrangeira porque o ator nem sempre é um usuário.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS aurea.audit_log (
  id                 bigserial PRIMARY KEY,
  created_at         bigint NOT NULL,
  ator               text   NOT NULL,
  acao               text   NOT NULL,
  entidade           text,
  entidade_id        text,
  usuarios_afetados  text[] NOT NULL DEFAULT '{}',
  detalhes           jsonb  NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS audit_log_created_idx ON aurea.audit_log (created_at);
CREATE INDEX IF NOT EXISTS audit_log_ator_idx ON aurea.audit_log (ator, created_at);

-- ---------------------------------------------------------------------------
-- Parâmetros contábeis: as alíquotas que a DRE aplica. NASCEM NULAS e são
-- preenchidas pelo contador — nunca pelo código (ver src/domain/dre.ts).
-- `unidade` diz como ler `valor`: 'bp' (pontos-base) ou 'centavos'.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS aurea.parametros_contabeis (
  chave          text   PRIMARY KEY,
  valor          bigint,
  unidade        text   NOT NULL CHECK (unidade IN ('bp', 'centavos')),
  rotulo         text   NOT NULL,
  descricao      text   NOT NULL DEFAULT '',
  atualizado_em  bigint,
  atualizado_por text
);

-- Plano de contas mínimo. `automatica` = alimentada pelo ledger, não aceita
-- lançamento manual.
CREATE TABLE IF NOT EXISTS aurea.contas_contabeis (
  codigo     text    PRIMARY KEY,
  nome       text    NOT NULL,
  natureza   text    NOT NULL CHECK (natureza IN ('receita', 'deducao', 'despesa', 'imposto')),
  automatica boolean NOT NULL DEFAULT false,
  ord        integer NOT NULL
);

-- ---------------------------------------------------------------------------
-- Lançamentos manuais: despesas e receitas que não passam pela plataforma
-- (aluguel, pessoal, seguro do acervo). Append-only; a correção é um
-- lançamento com `estorna_id` apontando para o errado — a DRE ignora os dois.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS aurea.lancamentos_manuais (
  id           bigserial PRIMARY KEY,
  data         bigint NOT NULL,
  conta_codigo text   NOT NULL REFERENCES aurea.contas_contabeis (codigo),
  descricao    text   NOT NULL,
  valor        bigint NOT NULL CHECK (valor > 0),
  criado_por   text   NOT NULL,
  created_at   bigint NOT NULL,
  estorna_id   bigint REFERENCES aurea.lancamentos_manuais (id)
);
CREATE INDEX IF NOT EXISTS lancamentos_manuais_data_idx ON aurea.lancamentos_manuais (data);

-- ---------------------------------------------------------------------------
-- Registro de toda exportação e sincronização (download, API, Google Sheets):
-- quem tirou o quê, quando, e se deu certo. Relatório financeiro que sai da
-- plataforma precisa deixar rastro.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS aurea.exportacoes (
  id         bigserial PRIMARY KEY,
  created_at bigint  NOT NULL,
  relatorio  text    NOT NULL,
  formato    text    NOT NULL,
  destino    text    NOT NULL,
  ator       text    NOT NULL,
  linhas     integer NOT NULL DEFAULT 0,
  ok         boolean NOT NULL,
  detalhe    text
);
CREATE INDEX IF NOT EXISTS exportacoes_created_idx ON aurea.exportacoes (created_at);

ALTER TABLE aurea.ledger_entries       ENABLE ROW LEVEL SECURITY;
ALTER TABLE aurea.audit_log            ENABLE ROW LEVEL SECURITY;
ALTER TABLE aurea.parametros_contabeis ENABLE ROW LEVEL SECURITY;
ALTER TABLE aurea.contas_contabeis     ENABLE ROW LEVEL SECURITY;
ALTER TABLE aurea.lancamentos_manuais  ENABLE ROW LEVEL SECURITY;
ALTER TABLE aurea.exportacoes          ENABLE ROW LEVEL SECURITY;
