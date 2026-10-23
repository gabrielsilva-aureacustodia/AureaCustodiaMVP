-- ---------------------------------------------------------------------------
-- 044 — emissão automática de NFS-e pela API nacional (23/10/2026)
--
-- O que muda no banco:
--
--   1. `nfse_emissoes`: uma linha por nota que a plataforma deve emitir — uma por fato, por tomador,
--      por serviço (`chave` única). Nasce `pendente` na MESMA transação que grava a negociação ou a
--      fatura paga (src/server/db/estado.ts), e o envio à Sefin acontece depois, fora dela: a falha
--      do governo nunca desfaz uma negociação, e nenhuma receita fica sem pedido de nota.
--   2. `nfse_numeracao`: o último número de DPS usado, por ambiente e série. A Sefin não aceita o
--      mesmo número duas vezes (E0014); o próximo é reservado com a linha travada.
--
-- Tempos em milissegundos (bigint), como o resto do schema. Dinheiro em centavos.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS aurea.nfse_emissoes (
  id              bigserial PRIMARY KEY,
  -- `servico:refFato`, ex.: 'custodia:FAT-…', 'intermediacao_compra:TRADE-12'.
  chave           text NOT NULL UNIQUE,
  servico         text NOT NULL CHECK (servico IN ('custodia', 'intermediacao_compra', 'intermediacao_venda')),
  ref_fato        text NOT NULL,
  tomador_email   text NOT NULL,
  valor           bigint NOT NULL CHECK (valor > 0),
  -- O instante do fato (casamento da negociação ou pagamento da fatura) e a competência da nota.
  ocorrido_em     bigint NOT NULL,
  competencia     text NOT NULL,
  descricao       text NOT NULL,
  quantidade_moedas integer NOT NULL DEFAULT 1,

  status          text NOT NULL DEFAULT 'pendente'
                  CHECK (status IN ('pendente', 'processando', 'autorizada', 'rejeitada', 'erro', 'cancelada')),
  -- Preenchidos no envio. `ambiente` diz onde a nota existe: 'restrita' é teste, sem validade jurídica.
  ambiente        text CHECK (ambiente IN ('producao', 'restrita')),
  serie           integer,
  n_dps           bigint,
  id_dps          text,
  xml_dps         text,
  chave_acesso    text,
  numero_nfse     text,
  xml_nfse        text,
  -- Rejeição da Sefin ou impedimento local (cadastro incompleto): [{codigo, descricao, complemento}].
  erros           jsonb,
  tentativas      integer NOT NULL DEFAULT 0,
  criado_em       bigint NOT NULL,
  atualizado_em   bigint NOT NULL,
  autorizada_em   bigint
);

CREATE INDEX IF NOT EXISTS nfse_emissoes_status_idx ON aurea.nfse_emissoes (status);
CREATE INDEX IF NOT EXISTS nfse_emissoes_tomador_idx ON aurea.nfse_emissoes (tomador_email);
CREATE INDEX IF NOT EXISTS nfse_emissoes_ref_idx ON aurea.nfse_emissoes (ref_fato);

CREATE TABLE IF NOT EXISTS aurea.nfse_numeracao (
  ambiente  text NOT NULL CHECK (ambiente IN ('producao', 'restrita')),
  serie     integer NOT NULL,
  ultimo    bigint NOT NULL DEFAULT 0,
  PRIMARY KEY (ambiente, serie)
);

-- Como todas as tabelas do schema: sem política, nenhum acesso pela API pública do Supabase — só o
-- servidor, pela conexão direta. Os XMLs têm CPF e endereço do cliente.
ALTER TABLE aurea.nfse_emissoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE aurea.nfse_numeracao ENABLE ROW LEVEL SECURITY;

-- Na produção restrita, as DPS 1 a 6 da série 1 já foram usadas nos testes de integração de 23/10/2026
-- (notas de teste nº 1 a 6). Começar do 7 evita a recusa por número repetido logo no primeiro envio —
-- e, se ainda assim acontecer (E0014), o envio reserva o número seguinte sozinho.
INSERT INTO aurea.nfse_numeracao (ambiente, serie, ultimo) VALUES ('restrita', 1, 6)
  ON CONFLICT (ambiente, serie) DO NOTHING;
