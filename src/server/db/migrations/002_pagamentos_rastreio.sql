-- ============================================================================
-- 002_pagamentos_rastreio — as três tabelas que a frente C precisa para sair
-- da memória (módulos M5 e M6).
--
-- POR QUE ELAS NÃO ENTRAM NO AppState
-- -----------------------------------
-- `AppState` é o retrato que as telas leem e que o motor de casamento muta.
-- Evento de gateway, intenção de depósito e último estado de rastreio não são
-- nada disso: ninguém os lê numa tela de mercado, e carregá-los em toda
-- requisição só engordaria as nove consultas de `getState()`. Elas são lidas e
-- escritas direto, por repositório próprio, dentro da mesma transação quando
-- precisa — e é por isso que esta migration NÃO mexe em `src/domain/types.ts`
-- nem obriga a rotacionar chave de estado.
--
-- TUDO NO SCHEMA `aurea`, RLS EM TODAS. Mesmo motivo da 001: o Supabase publica
-- `public` como API REST na internet, com a chave `anon`, que é pública por
-- design e está num repositório aberto.
--
-- DINHEIRO É `bigint` EM CENTAVOS, como em toda a plataforma. O Mercado Pago
-- devolve decimal; a conversão acontece na borda, em src/lib/payments/.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Eventos já recebidos do gateway. A CHAVE PRIMÁRIA É A IDEMPOTÊNCIA (RA-07).
--
-- Todo gateway reenvia webhook — por timeout, por retentativa, por falha de
-- rede. A reivindicação é um `INSERT … ON CONFLICT DO NOTHING RETURNING`: quem
-- recebe linha de volta ganhou o direito de processar; quem não recebe sabe que
-- outro processo (ou outra instância serverless) chegou antes. É o banco que
-- decide, não a memória de um processo — que em serverless nasce vazia a cada
-- cold start e não é compartilhada entre instâncias.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS aurea.payment_events (
  gateway      text   NOT NULL,
  event_id     text   NOT NULL,
  payment_id   text,
  tipo         text   NOT NULL,
  -- em_processamento | processado | falha
  status       text   NOT NULL,
  recebido_em  bigint NOT NULL,
  concluido_em bigint,
  resultado    jsonb,
  PRIMARY KEY (gateway, event_id)
);
CREATE INDEX IF NOT EXISTS payment_events_payment_idx ON aurea.payment_events (payment_id);

-- ---------------------------------------------------------------------------
-- Intenção de depósito: quem pediu, quanto, e com qual referência externa.
--
-- É o que responde "a que conta creditar?" quando o webhook chega. O e-mail do
-- pagador que o Mercado Pago devolve NÃO serve para isso: a pessoa pode pagar
-- com outra conta, ou um terceiro pode pagar por ela. A referência que a
-- plataforma gerou é o único vínculo confiável.
--
-- `status` percorre pendente -> creditando -> creditado. O passo intermediário
-- existe para a reivindicação atômica: `UPDATE … WHERE status = 'pendente'
-- RETURNING` só devolve linha para o primeiro, e é isso que impede dois
-- webhooks simultâneos de creditarem o mesmo depósito duas vezes.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS aurea.payment_intents (
  external_reference text   PRIMARY KEY,
  user_email         text   NOT NULL REFERENCES aurea.users (email),
  valor              bigint NOT NULL CHECK (valor > 0),
  -- pix | checkout_pro
  metodo             text   NOT NULL,
  -- pendente | creditando | creditado | recusado
  status             text   NOT NULL,
  payment_id         text,
  motivo_recusa      text,
  created_at         bigint NOT NULL,
  updated_at         bigint NOT NULL
);
CREATE INDEX IF NOT EXISTS payment_intents_user_idx ON aurea.payment_intents (user_email);
CREATE INDEX IF NOT EXISTS payment_intents_status_idx ON aurea.payment_intents (status);

-- ---------------------------------------------------------------------------
-- Último estado de rastreio de cada objeto postal, gravado pelo job agendado.
--
-- A tela lê daqui, nunca dos Correios: consultar a API a cada visita gera
-- custo, esbarra em limite de requisição e deixa a página lenta. O job roda
-- pelo cron da Vercel e grava; a tela mostra o que estiver gravado, com a hora
-- da última atualização.
--
-- `eventos` guarda a linha do tempo inteira como jsonb porque ela é lida sempre
-- junta, por objeto, e nunca consultada por evento. Tabela filha aqui seria
-- normalização sem uso.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS aurea.rastreios (
  codigo_rastreio text    PRIMARY KEY,
  protocolo       text    NOT NULL REFERENCES aurea.envios (protocolo) ON DELETE CASCADE,
  status_atual    text    NOT NULL,
  etapa_descricao text    NOT NULL DEFAULT '',
  entregue        boolean NOT NULL DEFAULT false,
  atualizado_em   bigint  NOT NULL,
  eventos         jsonb   NOT NULL DEFAULT '[]'::jsonb
);
CREATE INDEX IF NOT EXISTS rastreios_protocolo_idx ON aurea.rastreios (protocolo);

ALTER TABLE aurea.payment_events  ENABLE ROW LEVEL SECURITY;
ALTER TABLE aurea.payment_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE aurea.rastreios       ENABLE ROW LEVEL SECURITY;
