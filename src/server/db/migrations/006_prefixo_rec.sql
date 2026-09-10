-- ---------------------------------------------------------------------------
-- 006 — o código do recibo troca o prefixo 'NFT-' por 'REC-'
--
-- Complemento da 005, e a correção de uma suposição errada dela. A 005 dizia
-- que o seed regravaria os códigos sozinho quando `STORE_KEY` subisse para
-- `aurea-market-v7`. **Isso só vale para o store em memória e para o blob.**
-- Com Postgres o estado vive em TABELAS, e `STORE_KEY` não as apaga: depois da
-- 005 as 149 linhas continuaram com 'NFT-000001'… — a palavra proibida mais
-- visível do produto, impressa no certificado, no PDF, na tabela de auditoria
-- e nos relatórios do contador.
--
-- POR QUE UM `UPDATE` DIRETO É SEGURO AQUI
-- ---------------------------------------
-- O código do recibo vive num lugar só. Foi conferido linha a linha antes de
-- escrever esta migration: `aurea.ledger_entries` (descrição, ref_interna e
-- ref_externa), `aurea.audit_log` e todas as demais colunas de texto do schema
-- não têm nenhum valor começando com 'NFT-'. `aurea.analises.codigo_recibo`
-- guardaria uma cópia, mas a tabela está vazia — e, se não estivesse, ela NÃO
-- poderia ser reescrita: `codigo_recibo` entra na fórmula do hash encadeado da
-- análise, e mexer nela quebraria a corrente inteira. Por isso esta migration
-- não toca em `analises`.
--
-- A troca preserva o `UNIQUE` de `codigo` porque o mapa é um-para-um: só o
-- prefixo muda, o número sequencial continua o mesmo.
-- ---------------------------------------------------------------------------

-- Idempotente pelo `WHERE`: rodar de novo não encontra mais nenhuma linha.
-- A guarda do `NOT EXISTS` evita o caso patológico em que já existisse um
-- 'REC-000042' de outra origem — aí o UNIQUE recusaria e a transação inteira
-- voltaria atrás, que é o comportamento certo, mas com erro obscuro.
UPDATE aurea.recibos r
   SET codigo = 'REC-' || substring(r.codigo from 5)
 WHERE r.codigo LIKE 'NFT-%'
   AND NOT EXISTS (
     SELECT 1 FROM aurea.recibos x
      WHERE x.codigo = 'REC-' || substring(r.codigo from 5)
   );
