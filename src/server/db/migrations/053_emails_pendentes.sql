-- ---------------------------------------------------------------------------
-- 053 — fila de e-mails de movimentação (frente C, manutenção de novembro/2026)
--
-- POR QUE EXISTE. O cliente passa a receber um e-mail curto a cada movimentação importante (compra, venda,
-- depósito, envio, análise, fatura, retirada, segurança). Dois problemas pedem uma tabela, e são os mesmos da
-- NFS-e (044):
--
--   1. O e-mail nasce na MESMA transação que grava o dinheiro (src/server/db/estado.ts) — se a mutação desfaz,
--      o aviso some junto: nunca sai e-mail de uma compra que não aconteceu. O ENVIO é depois, fora da
--      transação: provedor fora do ar não desfaz uma negociação.
--   2. Reprocessar o mesmo evento (webhook entregue duas vezes, retry) não pode mandar o e-mail duas vezes. A
--      `chave` é a identidade do EVENTO e é UNIQUE: `INSERT … ON CONFLICT (chave) DO NOTHING` é a garantia.
--
-- O QUE A LINHA GUARDA. `dados` são FATOS já prontos (valores, primeiro nome, códigos, datas, e-mail e chave Pix
-- JÁ MASCARADOS — nada sensível entra aqui); o texto é montado só na hora de enviar.
--
-- CICLO. `pendente` -> `enviado` (provedor aceitou) | `simulado` (sem RESEND_API_KEY: o texto foi só para o
-- log do servidor, e NÃO se reenvia depois — senão a chave entrando na Vercel dispararia uma enxurrada de
-- avisos velhos) | `expirado` (pendente há mais de 24 h: aviso atrasado confunde mais do que ajuda) |
-- `desistido` (5 tentativas com erro). `reservado_ate` é a reserva atômica do envio (FOR UPDATE SKIP LOCKED):
-- dois disparos simultâneos nunca pegam a mesma linha.
--
-- Tempos em milissegundos (bigint), como o resto do schema.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS aurea.emails_pendentes (
  id              bigserial PRIMARY KEY,
  -- A identidade do evento, ex.: 'compra:maria@x.com:42', 'retirada-postada:RET-000007'.
  chave           text NOT NULL UNIQUE,
  tipo            text NOT NULL,
  para            text NOT NULL,
  dados           jsonb NOT NULL,
  status          text NOT NULL DEFAULT 'pendente'
                  CHECK (status IN ('pendente', 'enviado', 'simulado', 'expirado', 'desistido')),
  tentativas      integer NOT NULL DEFAULT 0,
  ultimo_erro     text,
  reservado_ate   bigint,
  -- O id que o provedor devolveu, para conferir no painel dele.
  id_provedor     text,
  criado_em       bigint NOT NULL,
  enviado_em      bigint
);

CREATE INDEX IF NOT EXISTS emails_pendentes_status_idx ON aurea.emails_pendentes (status) WHERE status = 'pendente';
CREATE INDEX IF NOT EXISTS emails_pendentes_para_idx ON aurea.emails_pendentes (para);

-- Como todas as tabelas do schema: sem política, nenhum acesso pela API pública do Supabase — só o servidor,
-- pela conexão direta.
ALTER TABLE aurea.emails_pendentes ENABLE ROW LEVEL SECURITY;
