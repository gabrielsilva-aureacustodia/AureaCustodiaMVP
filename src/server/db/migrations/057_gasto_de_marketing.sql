-- Migration 057: gasto de marketing informado pela equipe (frente J, 18/11/2026)
--
-- POR QUE EXISTE. O conselho pediu o CAC (custo para conquistar um cliente) acompanhado todo dia e toda semana.
-- O numerador, o que se gasta em anúncio, evento e material, nasce FORA do sistema (gerenciador de anúncios, nota
-- da gráfica): o site não tem como saber. Então a equipe digita o gasto numa tela de /admin, e o painel de KPIs
-- divide pelos clientes que fizeram a 1ª transação. Nenhum número é inventado: sem entrada, o CAC fica vazio.
--
-- O QUE GUARDA. Uma linha por entrada: canal, intervalo de dias (de/até, 'AAAA-MM-DD' de Brasília, extremos
-- incluídos), valor em centavos inteiros e, opcional, as visitas ao site no intervalo (lidas pela equipe do
-- gerenciador de anúncios — o Pixel só envia à Meta, o site não lê de volta). Um dia, uma semana ou um mês: o
-- painel reparte o valor pelos dias do intervalo e avisa quando o número é uma estimativa.
--
-- NADA SE APAGA NEM SE EDITA. Para corrigir, cancela-se a entrada (cancelado_em/por/motivo) e lança-se outra; a
-- linha cancelada continua aqui e na trilha (`admin.marketing.registrar` e `admin.marketing.cancelar` em
-- `audit_log`, gravadas na mesma transação). Não passa pelo ledger nem pela DRE: é indicador de gestão, não
-- lançamento contábil. Quem lança a despesa na DRE continua sendo o controle financeiro.
--
-- O `canal` NÃO tem CHECK de propósito: a lista mora em src/domain/kpis.ts (CANAIS_DE_MARKETING) e o código a
-- valida; um canal novo não deveria exigir migration.
-- RLS ligado e sem política, como nas demais tabelas do schema `aurea`.
--
-- Só tabela e índice novos: o código no ar não os lê, então a migration pode entrar antes do push. (A tela do
-- painel trata a tabela ausente — erro 42P01 — como "migration pendente", sem cair.)

CREATE TABLE IF NOT EXISTS aurea.marketing_gastos (
  id                  bigserial PRIMARY KEY,
  canal               text   NOT NULL,
  periodo_de          text   NOT NULL,
  periodo_ate         text   NOT NULL,
  valor_cents         bigint NOT NULL,
  visitas             bigint,
  observacao          text   NOT NULL DEFAULT '',
  criado_por          text   NOT NULL,
  criado_em           bigint NOT NULL,
  cancelado_em        bigint,
  cancelado_por       text,
  motivo_cancelamento text,
  CONSTRAINT marketing_gastos_valor_check CHECK (valor_cents > 0),
  CONSTRAINT marketing_gastos_visitas_check CHECK (visitas IS NULL OR visitas >= 0),
  CONSTRAINT marketing_gastos_dias_check CHECK (
    periodo_de ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' AND periodo_ate ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' AND periodo_ate >= periodo_de
  )
);

CREATE INDEX IF NOT EXISTS marketing_gastos_vigentes_idx ON aurea.marketing_gastos (periodo_de, periodo_ate) WHERE cancelado_em IS NULL;

ALTER TABLE aurea.marketing_gastos ENABLE ROW LEVEL SECURITY;
