-- Migration 041: saque aprovado pelo painel, com envio de Pix pelo Mercado Pago (14/10/2026)
--
-- Até aqui o saque era só uma linha `solicitado` e o saldo do cliente descia na hora: não havia fila,
-- botão nem integração, e o saque do Sidnei (R$ 196,00) ficou parado. Agora a equipe aprova ou recusa
-- pelo painel, e a aprovação pode mandar o Pix pela API de Payouts do Mercado Pago.
--
-- As colunas guardam QUEM aprovou, por qual canal, e os ids do payout no Mercado Pago — é o que permite
-- conferir o resultado depois e impede o mesmo saque de ser enviado duas vezes.
--
-- Aditiva: o código anterior ao deploy não lê as colunas. O status `em_processamento` já existia na
-- restrição da migration 009 e passa a ser usado (aprovado, esperando o Mercado Pago confirmar).

ALTER TABLE aurea.saques
  ADD COLUMN IF NOT EXISTS canal               text,
  ADD COLUMN IF NOT EXISTS aprovado_por        text,
  ADD COLUMN IF NOT EXISTS aprovado_em         bigint,
  ADD COLUMN IF NOT EXISTS payout_id           text,
  ADD COLUMN IF NOT EXISTS payout_transacao_id text,
  ADD COLUMN IF NOT EXISTS tentativas          integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS detalhe_gateway     text;

ALTER TABLE aurea.saques DROP CONSTRAINT IF EXISTS saques_canal_check;
ALTER TABLE aurea.saques ADD CONSTRAINT saques_canal_check
  CHECK (canal IS NULL OR canal IN ('mercadopago', 'manual'));

-- Permissões novas do painel. O catálogo vive no código e é upsertado na primeira leitura, mas as
-- concessões iniciais valem uma vez só — sem este bloco o papel Sócio, já criado, não enxergaria a
-- fila. O desenvolvimento recebe o catálogo inteiro pelo próprio código.
INSERT INTO aurea.admin_permissoes (chave, modulo, rotulo, descricao) VALUES
  ('saques.ver', 'saques', 'Ver saques', 'Fila de saques, chave Pix de destino e situação de cada pedido.'),
  ('saques.pagar', 'saques', 'Aprovar e recusar saques', 'Aprovar o saque (envia o Pix pelo Mercado Pago ou registra o pagamento feito por fora) e recusar com estorno ao saldo.'),
  ('logistica.expedir', 'logistica', 'Avançar retiradas', 'Separar, postar e entregar retiradas físicas; informar o código de rastreio.')
ON CONFLICT (chave) DO NOTHING;

-- Sócio recebe saques e a expedição; Operação (que já tinha tudo de `logistica.`) recebe a expedição.
INSERT INTO aurea.admin_papel_permissoes (papel_id, permissao_chave)
SELECT p.id, c.chave
  FROM aurea.admin_papeis p
 CROSS JOIN (VALUES ('saques.ver'), ('saques.pagar'), ('logistica.expedir')) AS c (chave)
 WHERE p.slug = 'socio'
ON CONFLICT DO NOTHING;

INSERT INTO aurea.admin_papel_permissoes (papel_id, permissao_chave)
SELECT p.id, 'logistica.expedir'
  FROM aurea.admin_papeis p
 WHERE p.slug = 'operacao'
ON CONFLICT DO NOTHING;
