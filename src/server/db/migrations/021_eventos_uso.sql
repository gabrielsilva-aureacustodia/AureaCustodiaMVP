-- ============================================================================
-- 021_eventos_uso — o registro de uso da plataforma
-- (frente C, sub-branch C1 · docs/PLANO_EXECUCAO_ADMIN.md, seção 1.5).
--
-- POR QUE ISTO EXISTE
-- -------------------
-- `audit_log` grava MUTAÇÃO de estado: quem comprou, quem publicou, quem pediu
-- retirada. Ele não sabe que alguém abriu o mercado três vezes antes de vender, nem
-- em que horário a plataforma é usada. Esta tabela responde "comportamento de
-- usuário", e é o único dado da Central de Resultados que ainda não era gravado.
--
-- O QUE NÃO ENTRA, POR DECISÃO
-- ----------------------------
-- IP, user agent completo e o endereço com query string. `plataforma` é o resumo
-- que o servidor deduz do user agent ('android', 'ios', 'windows'…) e o user agent
-- é descartado. `rota` chega normalizada: identificadores e e-mails no caminho
-- viram `[id]` antes de gravar.
--
-- APPEND-ONLY. Só INSERT no repositório (src/server/db/repositories/eventos-uso.ts).
--
-- SEM CHAVE ESTRANGEIRA PARA users, de propósito: o registro de uso nunca pode
-- falhar por causa de uma conta em estado intermediário, e falha de registro nunca
-- interrompe a navegação de ninguém.
-- ============================================================================

CREATE TABLE IF NOT EXISTS aurea.eventos_uso (
  id         bigserial PRIMARY KEY,
  created_at bigint NOT NULL,
  user_email text,
  -- Identificador aleatório da aba, gerado no navegador. Agrupa uma jornada; não
  -- tem relação com a sessão de login.
  sessao     text,
  tipo       text   NOT NULL,
  rota       text,
  alvo       text,
  detalhes   jsonb  NOT NULL DEFAULT '{}'::jsonb,
  plataforma text
);

ALTER TABLE aurea.eventos_uso DROP CONSTRAINT IF EXISTS eventos_uso_tipo_check;
ALTER TABLE aurea.eventos_uso ADD CONSTRAINT eventos_uso_tipo_check
  CHECK (tipo IN ('pagina', 'acao'));

CREATE INDEX IF NOT EXISTS eventos_uso_created_idx ON aurea.eventos_uso (created_at);
CREATE INDEX IF NOT EXISTS eventos_uso_usuario_idx ON aurea.eventos_uso (user_email, created_at);

ALTER TABLE aurea.eventos_uso ENABLE ROW LEVEL SECURITY;
