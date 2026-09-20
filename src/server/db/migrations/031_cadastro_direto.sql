-- 031 — origem da análise e observação do cadastro direto.
--
-- Até aqui toda moeda nascia da bancada, depois de envio postal e pesagem.
-- A partir de 20/09/2026 existe o CADASTRO DIRETO: moeda que já está no armazém
-- e já foi conferida fora do sistema entra no acervo do cliente sem passar pelo
-- envio nem pela fila — acervo anterior à plataforma, entrega em mãos, acervo
-- próprio da empresa.
--
-- A moeda nasce idêntica à da bancada: código da mesma série, recibo derivado do
-- código e hash vindo de um registro de análise encadeado na MESMA corrente
-- SHA-256. Estas duas colunas NÃO entram na fórmula do hash (ver a nota no topo
-- de src/domain/analise.ts): quem denuncia a origem de dentro do hash é
-- protocolo_envio, que vale 'RO-DIR-nnnn' no cadastro direto contra 'RO-ENV-nnnn'
-- na bancada. Estas aqui são o rótulo legível e o motivo registrado.
--
-- Linha antiga fica com 'bancada', que é a verdade do que havia antes.

ALTER TABLE aurea.analises
  ADD COLUMN IF NOT EXISTS origem text NOT NULL DEFAULT 'bancada',
  ADD COLUMN IF NOT EXISTS observacao text;

ALTER TABLE aurea.analises
  DROP CONSTRAINT IF EXISTS analises_origem_check;

ALTER TABLE aurea.analises
  ADD CONSTRAINT analises_origem_check CHECK (origem IN ('bancada', 'cadastro_direto'));

-- A auditoria filtra por origem com frequência ("o que entrou sem bancada?").
CREATE INDEX IF NOT EXISTS analises_origem_idx ON aurea.analises (origem);
