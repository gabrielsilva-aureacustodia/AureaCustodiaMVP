-- ---------------------------------------------------------------------------
-- 007 — Cadastro formal progressivo do usuário (sessão B-1, bloco 6)
--
-- Adiciona colunas para CPF, nome completo, data de nascimento, telefone,
-- endereço completo e dados bancários/Pix na tabela `aurea.users`.
--
-- Todas as colunas são ANULÁVEIS (NULL): o cadastro completo é progressivo
-- e só é exigido no primeiro movimento de dinheiro (depósito, compra direta ou
-- saque). Usuários antigos do seed e novos cadastros entram e navegam sem
-- preenchimento obrigatório prévio.
--
-- LGPD e Segurança:
--   - Documento com foto, selfie e biometria: NÃO implementados (dispensados pelo jurídico).
--   - Colunas protegidas pelo RLS existente de `aurea.users`.
-- ---------------------------------------------------------------------------

ALTER TABLE aurea.users ADD COLUMN IF NOT EXISTS cpf text;
ALTER TABLE aurea.users ADD COLUMN IF NOT EXISTS nome_completo text;
ALTER TABLE aurea.users ADD COLUMN IF NOT EXISTS data_nascimento text;
ALTER TABLE aurea.users ADD COLUMN IF NOT EXISTS telefone text;
ALTER TABLE aurea.users ADD COLUMN IF NOT EXISTS endereco jsonb;
ALTER TABLE aurea.users ADD COLUMN IF NOT EXISTS dados_bancarios jsonb;
ALTER TABLE aurea.users ADD COLUMN IF NOT EXISTS cadastro_completado_em bigint;
ALTER TABLE aurea.users ADD COLUMN IF NOT EXISTS cadastro_confirmado_em bigint;

-- Índice para busca rápida por CPF (quando preenchido)
CREATE INDEX IF NOT EXISTS users_cpf_idx ON aurea.users (cpf) WHERE cpf IS NOT NULL;
