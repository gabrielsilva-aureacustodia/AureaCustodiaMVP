-- Migration 016: Documentos Legais Oficiais e Registro Formal de Aceite (A3)
-- Cria tabelas aurea.documentos_legais e aurea.aceites_documentos com RLS ativado.

CREATE TABLE IF NOT EXISTS aurea.documentos_legais (
  id            bigserial PRIMARY KEY,
  chave         text   NOT NULL CHECK (chave IN ('termos_de_uso', 'politica_privacidade', 'tabela_de_taxas', 'clausula_arbitragem')),
  versao        text   NOT NULL,
  vigente_desde bigint NOT NULL,
  hash_conteudo text   NOT NULL,
  conteudo      text   NOT NULL,
  publicado_por text   NOT NULL,
  created_at    bigint NOT NULL,
  UNIQUE (chave, versao)
);

CREATE TABLE IF NOT EXISTS aurea.aceites_documentos (
  id               bigserial PRIMARY KEY,
  created_at       bigint NOT NULL,
  user_email       text   NOT NULL,
  documento_chave  text   NOT NULL,
  documento_versao text   NOT NULL,
  hash_conteudo    text   NOT NULL,
  canal            text   NOT NULL CHECK (canal IN ('cadastro_email', 'cadastro_google', 'entrada', 'banner_atualizacao', 'conta_documentos', 'admin')),
  metodo           text   NOT NULL CHECK (metodo IN ('clique_no_botao', 'caixa_e_nome_digitado', 'certificado_digital')),
  texto_exibido    text   NOT NULL,
  nome_digitado    text,
  ip               text,
  user_agent       text,
  hash_anterior    text   NOT NULL,
  hash             text   NOT NULL UNIQUE
);

CREATE INDEX IF NOT EXISTS aceites_usuario_idx ON aurea.aceites_documentos (user_email, documento_chave, created_at);

ALTER TABLE aurea.documentos_legais  ENABLE ROW LEVEL SECURITY;
ALTER TABLE aurea.aceites_documentos ENABLE ROW LEVEL SECURITY;

