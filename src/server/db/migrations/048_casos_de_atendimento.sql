-- Migration 048: casos de atendimento ao cliente (31/10/2026)
--
-- POR QUE ISTO EXISTE
-- -------------------
-- O cliente logado manda dúvida, pedido, reclamação ou relato de erro por um botão em toda tela,
-- a equipe responde em /admin/casos e o cliente vê a resposta e o estado na própria área.
-- Pedido do Gabriel, comando A2A 933f56b6. Desenho em docs/atendimento/DESENHO.md.
--
-- POR QUE TABELAS PRÓPRIAS, E NÃO AS `cs_*` DA 022
-- A caixa do WhatsApp exige telefone e provedor (`cs_contatos.telefone_e164` é único e canônico).
-- O caso nasce de uma conta logada, sem telefone nenhum. Misturar os dois afrouxaria as
-- restrições que a 022 usa para não duplicar mensagem de webhook.
--
-- QUEM VÊ O QUÊ
-- RLS ligado e SEM política, como nas demais tabelas do schema `aurea`: a aplicação fala com o
-- Postgres pela conexão do servidor, e quem isola o cliente é a consulta, sempre com
-- `user_email` igual ao e-mail da sessão. O anexo é imagem em `bytea` servida por rota
-- autenticada, nunca por armazenamento público (LGPD: print de tela mostra dado pessoal).
--
-- ESTADOS: aberto -> em_andamento (a equipe respondeu) -> resolvido | nao_resolvido (só a
-- equipe marca). Mensagem do cliente devolve o caso a `aberto`.
-- Só tabelas e índices novos: o código no ar não os lê, então a migration pode entrar antes do push.

CREATE TABLE IF NOT EXISTS aurea.casos (
  id                 bigserial PRIMARY KEY,
  user_email         text   NOT NULL,
  tipo               text   NOT NULL,
  estado             text   NOT NULL DEFAULT 'aberto',
  -- Primeiras palavras do relato: é o que a lista mostra. O texto inteiro é a 1ª mensagem.
  titulo             text   NOT NULL,
  -- Rota de onde o cliente escreveu (só o caminho, sem consulta): preenchida sozinha.
  pagina_origem      text,
  criado_em          bigint NOT NULL,
  atualizado_em      bigint NOT NULL,
  ultima_do_cliente_em bigint NOT NULL,
  ultima_da_equipe_em  bigint,
  -- Até quando o cliente já viu as respostas da equipe (marca "resposta nova").
  cliente_viu_ate    bigint NOT NULL DEFAULT 0,
  fechado_por        text,
  fechado_em         bigint,
  CONSTRAINT casos_tipo_check CHECK (tipo IN ('duvida', 'pedido', 'reclamacao', 'erro')),
  CONSTRAINT casos_estado_check CHECK (estado IN ('aberto', 'em_andamento', 'resolvido', 'nao_resolvido'))
);

CREATE INDEX IF NOT EXISTS casos_user_idx ON aurea.casos (user_email, atualizado_em DESC);
CREATE INDEX IF NOT EXISTS casos_estado_idx ON aurea.casos (estado, atualizado_em DESC);

CREATE TABLE IF NOT EXISTS aurea.casos_mensagens (
  id         bigserial PRIMARY KEY,
  caso_id    bigint NOT NULL REFERENCES aurea.casos (id) ON DELETE CASCADE,
  -- 'cliente' ou 'equipe': decidido pelo servidor, nunca pelo corpo da requisição.
  autor      text   NOT NULL,
  autor_email text  NOT NULL,
  texto      text   NOT NULL,
  anexo_id   bigint,
  criado_em  bigint NOT NULL,
  CONSTRAINT casos_mensagens_autor_check CHECK (autor IN ('cliente', 'equipe'))
);

CREATE INDEX IF NOT EXISTS casos_mensagens_caso_idx ON aurea.casos_mensagens (caso_id, criado_em, id);

CREATE TABLE IF NOT EXISTS aurea.casos_anexos (
  id         bigserial PRIMARY KEY,
  caso_id    bigint NOT NULL REFERENCES aurea.casos (id) ON DELETE CASCADE,
  nome       text   NOT NULL,
  tipo_mime  text   NOT NULL,
  tamanho    integer NOT NULL,
  conteudo   bytea  NOT NULL,
  criado_em  bigint NOT NULL,
  CONSTRAINT casos_anexos_mime_check CHECK (tipo_mime IN ('image/png', 'image/jpeg', 'image/webp')),
  CONSTRAINT casos_anexos_tamanho_check CHECK (tamanho > 0 AND tamanho <= 2097152)
);

ALTER TABLE aurea.casos           ENABLE ROW LEVEL SECURITY;
ALTER TABLE aurea.casos_mensagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE aurea.casos_anexos    ENABLE ROW LEVEL SECURITY;
