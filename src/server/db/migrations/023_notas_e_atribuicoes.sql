-- ============================================================================
-- 023_notas_e_atribuicoes — notas internas, etiquetas e a situação da conta
-- (frente C, sub-branch C2 · docs/PLANO_EXECUCAO_ADMIN.md, seção 2.2).
--
-- NOTA INTERNA É APPEND-ONLY, como todo registro do projeto: corrige-se com nota
-- nova. `cs_notas`, `admin_notas_usuario` e `admin_situacao_contas` só recebem
-- INSERT no repositório (src/server/db/repositories/cs.ts e admin-usuarios.ts).
--
-- `cs_etiquetas.cor` é um nome da paleta do painel, não um código de cor: a tela
-- pinta com as variáveis de tokens.css, e uma cor livre digitada no painel
-- quebraria o tema escuro.
--
-- `cs_conversa_etiquetas` é associação, não trilha: tirar a etiqueta apaga a linha.
-- Quem tirou e quando fica em audit_log (`admin.cs.etiquetar`).
--
-- `admin_situacao_contas` NÃO estava no desenho original da seção 2.2: é o que a ação
-- "ativar e desativar" da seção 2.6 precisa para ter onde morar. A situação vigente
-- de uma conta é a linha mais recente dela; sem linha, a conta está ativa. Fica numa
-- tabela própria, e não em `users.settings`, porque o planejador de diff do AppState
-- (src/server/db/diff.ts) só persiste as quatro preferências conhecidas — um campo a
-- mais ali sumiria na primeira gravação.
-- ============================================================================

CREATE TABLE IF NOT EXISTS aurea.cs_notas (
  id          bigserial PRIMARY KEY,
  conversa_id bigint NOT NULL REFERENCES aurea.cs_conversas (id),
  autor       text   NOT NULL,
  corpo       text   NOT NULL,
  created_at  bigint NOT NULL
);

CREATE INDEX IF NOT EXISTS cs_notas_conversa_idx ON aurea.cs_notas (conversa_id, id);

CREATE TABLE IF NOT EXISTS aurea.cs_etiquetas (
  slug   text PRIMARY KEY,
  rotulo text NOT NULL,
  cor    text NOT NULL DEFAULT 'cinza'
);

ALTER TABLE aurea.cs_etiquetas DROP CONSTRAINT IF EXISTS cs_etiquetas_cor_check;
ALTER TABLE aurea.cs_etiquetas ADD CONSTRAINT cs_etiquetas_cor_check
  CHECK (cor IN ('ouro', 'verde', 'vermelho', 'cinza'));

CREATE TABLE IF NOT EXISTS aurea.cs_conversa_etiquetas (
  conversa_id   bigint NOT NULL REFERENCES aurea.cs_conversas (id) ON DELETE CASCADE,
  etiqueta_slug text   NOT NULL REFERENCES aurea.cs_etiquetas (slug) ON DELETE CASCADE,
  PRIMARY KEY (conversa_id, etiqueta_slug)
);

CREATE TABLE IF NOT EXISTS aurea.admin_notas_usuario (
  id         bigserial PRIMARY KEY,
  user_email text   NOT NULL,
  autor      text   NOT NULL,
  corpo      text   NOT NULL,
  created_at bigint NOT NULL
);

CREATE INDEX IF NOT EXISTS admin_notas_usuario_idx ON aurea.admin_notas_usuario (user_email, id);

CREATE TABLE IF NOT EXISTS aurea.admin_situacao_contas (
  id         bigserial PRIMARY KEY,
  user_email text    NOT NULL,
  ativa      boolean NOT NULL,
  motivo     text    NOT NULL DEFAULT '',
  autor      text    NOT NULL,
  created_at bigint  NOT NULL
);

CREATE INDEX IF NOT EXISTS admin_situacao_contas_idx ON aurea.admin_situacao_contas (user_email, id);

ALTER TABLE aurea.cs_notas              ENABLE ROW LEVEL SECURITY;
ALTER TABLE aurea.cs_etiquetas          ENABLE ROW LEVEL SECURITY;
ALTER TABLE aurea.cs_conversa_etiquetas ENABLE ROW LEVEL SECURITY;
ALTER TABLE aurea.admin_notas_usuario   ENABLE ROW LEVEL SECURITY;
ALTER TABLE aurea.admin_situacao_contas ENABLE ROW LEVEL SECURITY;
