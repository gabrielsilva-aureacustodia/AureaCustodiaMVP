-- ============================================================================
-- 025_caixas_fisicas — as caixas do cofre (frente C, sub-branch C3 ·
-- docs/PLANO_EXECUCAO_ADMIN.md, seção 3.7).
--
-- ATÉ AQUI A CAIXA ERA TEXTO SOLTO em `aurea.analises` (RA-22): `caixa` e `posicao`
-- digitados na bancada, sem conferência. Com esta tabela o painel sabe quais caixas
-- existem, mostra a ocupação real e a bancada web recusa a posição que já tem moeda.
--
-- NÃO HÁ CHAVE ESTRANGEIRA de `analises.caixa` para cá, de propósito: a análise é
-- append-only, entra no hash e já tem registros com o texto que o operador digitou —
-- inclusive de caixas que ainda não estão cadastradas. A ocupação é calculada cruzando
-- as duas (src/domain/admin/caixas.ts), e caixa não cadastrada aparece na tela em vez
-- de ser recusada.
--
-- Caixa é catálogo, não trilha: rótulo, local, capacidade e `ativa` são editáveis. Quem
-- mudou e quando fica em audit_log (`admin.bancada.caixa`). Caixa não se apaga —
-- desativa-se —, porque há análise gravada com o código dela.
-- ============================================================================

CREATE TABLE IF NOT EXISTS aurea.caixas (
  codigo     text    PRIMARY KEY,
  rotulo     text    NOT NULL DEFAULT '',
  local      text    NOT NULL DEFAULT '',
  capacidade integer,
  ativa      boolean NOT NULL DEFAULT true,
  created_at bigint  NOT NULL
);

ALTER TABLE aurea.caixas DROP CONSTRAINT IF EXISTS caixas_capacidade_check;
ALTER TABLE aurea.caixas ADD CONSTRAINT caixas_capacidade_check
  CHECK (capacidade IS NULL OR capacidade > 0);

ALTER TABLE aurea.caixas ENABLE ROW LEVEL SECURITY;
