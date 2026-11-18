-- Migration 056: cancelar envio — quem cancelou, quando e por quê (frente H, 17/11/2026)
--
-- POR QUE EXISTE. O Rogério pagou o 1º mês de custódia de 15 moedas (R$ 30,00, com NFS-e emitida) e as moedas
-- nunca foram postadas. Faltava um jeito de o cliente ou a equipe cancelar o envio, e de a bancada desistir de
-- uma validação cujo pacote nunca chegou, devolvendo frete, 1º mês e nota. O contador exige cancelar nota
-- fiscal DENTRO DO MÊS.
--
-- O QUE FAZ. Três colunas em `envios`, todas anuláveis. O cancelamento também grava `desconsiderado_em`
-- (coluna da 034), e é isso que faz as guardas que já existiam valerem para o envio cancelado; estas colunas
-- só dizem quem encerrou e por quê. A trilha da equipe vai para `audit_log` (`admin.logistica.cancelar_envio`),
-- e o dinheiro devolvido vai para o ledger pelos mesmos lançamentos de sempre (`estorno`). A corrente de hash
-- das análises NÃO muda: análise aberta não tem linha em `analises`.
--
-- Aditiva: o código no ar não lê as colunas, então entra antes do push sem quebrar nada.

ALTER TABLE aurea.envios ADD COLUMN IF NOT EXISTS cancelado_em bigint;
ALTER TABLE aurea.envios ADD COLUMN IF NOT EXISTS cancelado_por text;
ALTER TABLE aurea.envios ADD COLUMN IF NOT EXISTS motivo_cancelamento text;
