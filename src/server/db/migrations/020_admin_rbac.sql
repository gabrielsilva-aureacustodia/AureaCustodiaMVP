-- ============================================================================
-- 020_admin_rbac — papéis, permissões e membros do painel administrativo
-- (frente C, sub-branch C1 · docs/PLANO_EXECUCAO_ADMIN.md, seção 1.1).
--
-- POR QUE ISTO EXISTE
-- -------------------
-- Até aqui "quem administra?" era sim ou não: `ehAdmin()` lia AUREA_ADMIN_EMAILS
-- ou as contas do seed. O painel precisa de granularidade — o contador vê a DRE e
-- não mexe na equipe; o operador de bancada vê a análise e não vê o financeiro — e
-- os papéis são criados pelo próprio painel, sem deploy.
--
-- O QUE NÃO É SEMEADO AQUI, E POR QUÊ
-- -----------------------------------
-- Nem o catálogo de permissões, nem os três papéis de sistema (dev, socio,
-- operacao), nem as concessões iniciais. A lista vive em
-- src/domain/admin/permissoes.ts e a aplicação a upserta na primeira leitura
-- (src/server/admin/rbac.ts) — o mesmo desenho do plano de contas da migration
-- 003. Semear em SQL criaria duas verdades que divergem na primeira permissão nova.
--
-- O BOOTSTRAP NÃO DEPENDE DESTAS TABELAS. Quem está em AUREA_ADMIN_EMAILS (ou, sem
-- ela, nas contas do seed) e não aparece em `admin_membros` entra como `dev`. Uma
-- tabela vazia — ou ainda não migrada — não tranca ninguém para fora.
--
-- `rank` ORDENA A TELA, NÃO BLOQUEIA OPERAÇÃO.
--
-- TUDO NO SCHEMA `aurea`, RLS EM TODAS, horário em `bigint` de milissegundos UTC.
-- ============================================================================

CREATE TABLE IF NOT EXISTS aurea.admin_permissoes (
  chave     text PRIMARY KEY,
  modulo    text NOT NULL,
  rotulo    text NOT NULL,
  descricao text NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS aurea.admin_papeis (
  id              bigserial PRIMARY KEY,
  slug            text    NOT NULL UNIQUE,
  nome            text    NOT NULL,
  rank            integer NOT NULL DEFAULT 0,
  variante_painel text    NOT NULL DEFAULT 'gestao',
  -- Papel de sistema: nasce da aplicação e não pode ser excluído pela tela.
  sistema         boolean NOT NULL DEFAULT false,
  created_at      bigint  NOT NULL
);

ALTER TABLE aurea.admin_papeis DROP CONSTRAINT IF EXISTS admin_papeis_variante_check;
ALTER TABLE aurea.admin_papeis ADD CONSTRAINT admin_papeis_variante_check
  CHECK (variante_painel IN ('desenvolvimento', 'gestao', 'operacional'));

-- Concessões. Excluir um papel leva as concessões dele junto; excluir uma
-- permissão do catálogo não acontece (a chave antiga só deixa de valer no código).
CREATE TABLE IF NOT EXISTS aurea.admin_papel_permissoes (
  papel_id        bigint NOT NULL REFERENCES aurea.admin_papeis (id) ON DELETE CASCADE,
  permissao_chave text   NOT NULL REFERENCES aurea.admin_permissoes (chave),
  PRIMARY KEY (papel_id, permissao_chave)
);

-- Membros. Sem ON DELETE no papel, de propósito: papel com membro não some por
-- baixo de ninguém. O e-mail é gravado em minúsculas pela aplicação.
CREATE TABLE IF NOT EXISTS aurea.admin_membros (
  id             bigserial PRIMARY KEY,
  email          text   NOT NULL UNIQUE,
  nome_exibicao  text   NOT NULL DEFAULT '',
  papel_id       bigint NOT NULL REFERENCES aurea.admin_papeis (id),
  status         text   NOT NULL DEFAULT 'ativo',
  criado_por     text   NOT NULL,
  created_at     bigint NOT NULL,
  atualizado_por text,
  atualizado_em  bigint
);

ALTER TABLE aurea.admin_membros DROP CONSTRAINT IF EXISTS admin_membros_status_check;
ALTER TABLE aurea.admin_membros ADD CONSTRAINT admin_membros_status_check
  CHECK (status IN ('ativo', 'inativo'));

CREATE INDEX IF NOT EXISTS admin_membros_papel_idx ON aurea.admin_membros (papel_id);

ALTER TABLE aurea.admin_permissoes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE aurea.admin_papeis           ENABLE ROW LEVEL SECURITY;
ALTER TABLE aurea.admin_papel_permissoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE aurea.admin_membros          ENABLE ROW LEVEL SECURITY;
