-- ============================================================================
-- 022_cs_mensageria — o atendimento: canais, contatos, conversas e mensagens
-- (frente C, sub-branch C2 · docs/PLANO_EXECUCAO_ADMIN.md, seção 2.1).
--
-- POR QUE ISTO EXISTE
-- -------------------
-- Até a C2 o atendimento acontecia no celular de alguém, fora da plataforma: a
-- conversa não tinha dono, não tinha histórico compartilhado e não sabia de qual
-- conta era. Estas quatro tabelas guardam o WhatsApp do CS DENTRO do painel, ao
-- lado da ficha do cliente.
--
-- AS RESTRIÇÕES QUE CARREGAM REGRA
-- --------------------------------
--  * `cs_mensagens.id_no_provedor` é ÚNICO: provedor de WhatsApp reentrega webhook,
--    e sem a restrição a mesma mensagem apareceria duas vezes na conversa. NULL é
--    permitido (e repetível) para a mensagem que falhou antes de ganhar um id.
--  * `cs_contatos.telefone_e164` é ÚNICO e canônico (src/domain/admin/telefone.ts):
--    '+5511999998888', com o nono dígito do celular brasileiro sempre presente —
--    o WhatsApp entrega números antigos sem ele, e sem a forma canônica a mesma
--    pessoa viraria dois contatos.
--  * `cs_conversas` é ÚNICA por canal e contato: a conversa com uma pessoa é uma só
--    e reabre quando ela escreve de novo. É o que faz a caixa funcionar como CRM —
--    o histórico inteiro fica num lugar.
--
-- `cs_contatos.user_email` casa a conversa com a conta pelo telefone do cadastro.
-- SEM CHAVE ESTRANGEIRA para users, de propósito: um contato pode existir antes da
-- conta (quem pergunta antes de se cadastrar), e receber mensagem nunca pode falhar
-- por causa do estado de outra tabela.
--
-- O STATUS 'registrada' não está no desenho original do plano: é o da mensagem
-- gravada pelo adaptador de registro local (src/lib/mensageria/registro-local.ts),
-- quando nenhum provedor de WhatsApp está conectado. Ela NÃO saiu da plataforma, e
-- chamá-la de 'enviada' seria mentir para o atendente.
-- ============================================================================

CREATE TABLE IF NOT EXISTS aurea.cs_canais (
  id            bigserial PRIMARY KEY,
  tipo          text   NOT NULL,
  -- 'evolution', 'registro-local'… — o `nome` do adaptador que recebe e envia.
  provedor      text   NOT NULL,
  -- A instância no provedor (EVOLUTION_INSTANCE) ou 'local'.
  identificador text   NOT NULL,
  status        text   NOT NULL DEFAULT 'ativo',
  config        jsonb  NOT NULL DEFAULT '{}'::jsonb,
  created_at    bigint NOT NULL,
  UNIQUE (provedor, identificador)
);

ALTER TABLE aurea.cs_canais DROP CONSTRAINT IF EXISTS cs_canais_tipo_check;
ALTER TABLE aurea.cs_canais ADD CONSTRAINT cs_canais_tipo_check
  CHECK (tipo IN ('whatsapp', 'email'));
ALTER TABLE aurea.cs_canais DROP CONSTRAINT IF EXISTS cs_canais_status_check;
ALTER TABLE aurea.cs_canais ADD CONSTRAINT cs_canais_status_check
  CHECK (status IN ('ativo', 'inativo'));

CREATE TABLE IF NOT EXISTS aurea.cs_contatos (
  id            bigserial PRIMARY KEY,
  telefone_e164 text   NOT NULL UNIQUE,
  -- O nome que a pessoa usa no WhatsApp, ou o que o atendente digitou.
  nome          text,
  user_email    text,
  created_at    bigint NOT NULL
);

CREATE INDEX IF NOT EXISTS cs_contatos_usuario_idx ON aurea.cs_contatos (user_email);

CREATE TABLE IF NOT EXISTS aurea.cs_conversas (
  id                 bigserial PRIMARY KEY,
  canal_id           bigint  NOT NULL REFERENCES aurea.cs_canais (id),
  contato_id         bigint  NOT NULL REFERENCES aurea.cs_contatos (id),
  status             text    NOT NULL DEFAULT 'aberta',
  -- E-mail do membro da equipe que cuida da conversa. NULL = ninguém.
  responsavel        text,
  assunto            text,
  ultima_mensagem_em bigint,
  nao_lidas          integer NOT NULL DEFAULT 0,
  created_at         bigint  NOT NULL,
  UNIQUE (canal_id, contato_id)
);

ALTER TABLE aurea.cs_conversas DROP CONSTRAINT IF EXISTS cs_conversas_status_check;
ALTER TABLE aurea.cs_conversas ADD CONSTRAINT cs_conversas_status_check
  CHECK (status IN ('aberta', 'pendente', 'resolvida'));
ALTER TABLE aurea.cs_conversas DROP CONSTRAINT IF EXISTS cs_conversas_nao_lidas_check;
ALTER TABLE aurea.cs_conversas ADD CONSTRAINT cs_conversas_nao_lidas_check
  CHECK (nao_lidas >= 0);

CREATE INDEX IF NOT EXISTS cs_conversas_ultima_idx ON aurea.cs_conversas (ultima_mensagem_em DESC);

CREATE TABLE IF NOT EXISTS aurea.cs_mensagens (
  id             bigserial PRIMARY KEY,
  conversa_id    bigint NOT NULL REFERENCES aurea.cs_conversas (id),
  direcao        text   NOT NULL,
  corpo          text   NOT NULL DEFAULT '',
  midia_url      text,
  midia_tipo     text,
  id_no_provedor text   UNIQUE,
  status         text   NOT NULL,
  -- E-mail do atendente na saída pelo painel; 'whatsapp-celular' na saída feita no
  -- aparelho; NULL na entrada (quem escreveu é o contato).
  autor          text,
  created_at     bigint NOT NULL
);

ALTER TABLE aurea.cs_mensagens DROP CONSTRAINT IF EXISTS cs_mensagens_direcao_check;
ALTER TABLE aurea.cs_mensagens ADD CONSTRAINT cs_mensagens_direcao_check
  CHECK (direcao IN ('entrada', 'saida'));
ALTER TABLE aurea.cs_mensagens DROP CONSTRAINT IF EXISTS cs_mensagens_status_check;
ALTER TABLE aurea.cs_mensagens ADD CONSTRAINT cs_mensagens_status_check
  CHECK (status IN ('enviando', 'enviada', 'entregue', 'lida', 'falhou', 'registrada'));

CREATE INDEX IF NOT EXISTS cs_mensagens_conversa_idx ON aurea.cs_mensagens (conversa_id, id);

ALTER TABLE aurea.cs_canais    ENABLE ROW LEVEL SECURITY;
ALTER TABLE aurea.cs_contatos  ENABLE ROW LEVEL SECURITY;
ALTER TABLE aurea.cs_conversas ENABLE ROW LEVEL SECURITY;
ALTER TABLE aurea.cs_mensagens ENABLE ROW LEVEL SECURITY;
