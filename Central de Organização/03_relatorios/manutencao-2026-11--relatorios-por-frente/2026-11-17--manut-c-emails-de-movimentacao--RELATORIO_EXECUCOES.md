# Relatório de Execuções — frente C (e-mails de movimentação)

**Projeto:** Áurea Custódia / Real Olímpico · **Branch:** claude/manut-emails-de-movimentacao-c46333 · **ref_commit:** 9e21fe1 · **Packet:** docs/manutencao-2026-11/frentes/C-emails-de-movimentacao.md · **Data:** 2026-11-17 · **Git ao fechar:** 0 commits (B1), 6 arquivos rastreados alterados + novos (src/server/emails/, migration 053, docs).

## Tópicos na ordem real
1. **T2 (desenho)** — a Execução confirmou o rascunho do chat de branch contra o código; cinco correções (mutarEstado devolve só a contagem; retirada fora do diff; envio postado/recebido o diff vê; Trade/Deposit sem id, chave por posição; fatura paga com dois silêncios). Está no MD de execução, "DESENHO".
2. **T1 (custo)** — feito pelo Específico: `PESQUISA_CUSTO_EMAIL.md` (R$ 0,00 hoje, ~130 e-mails/mês, pico 37/dia; ficar no Resend grátis, Pro só acima de 100/dia ou 3.000/mês; Titan só reserva).
3. **T3 (módulo)** — `src/server/emails/` (tipos, catalogo, mascara, eventos, modelos, fila, despachar, gancho, agendar, despacho, avisos, index) e migration 053.
4. **T4 (gancho)** — `mutarEstado` grava a fila na mesma transação; `state.ts` agenda o envio depois da resposta (espelho do NFS-e); ramo sem banco envia direto.
5. **T5 (suíte)** — 111 testes de emails + 1 linha em db.test.ts.

## Arquivos tocados (porquê)
- `src/server/emails/**` (novo) — a central de e-mails.
- `src/server/db/migrations/053_emails_pendentes.sql` (novo, NÃO aplicada) — fila com chave única.
- `src/server/db/estado.ts`, `src/server/state.ts` — o gancho único (dentro do Touch).
- `src/lib/email/index.ts`, `tipos.ts` — `idempotencyKey` e cabeçalho `Idempotency-Key`.
- **Fora do Touch, aprovados pelo Controle:** `src/server/db/sql-injecao.baseline.json` (+1 entrada para fila.ts) e `src/server/db/db.test.ts` (+1 tabela esperada). Ambos mínimos.
- Nada editado: Server Actions, `saques/avisos.ts`, `account.ts`, `src/domain/**`.

## Testes
- Execução relata: typecheck e lint verdes; 111 testes de emails (`npx vitest run src/server/emails --no-file-parallelism`) e suíte vizinha (53 arquivos) verdes. `npm run build` rodou uma vez, verde, como RELATO (o build oficial é do Controle pós-merge). Teste de banco usa PGlite, não lê POSTGRES_URL.
- **Ponto de atenção:** esses testes foram rodados durante o alerta de memória do Controle (sem typecheck/teste pesado até liberar). Testes rodados pela Execução; liberação do Controle: não confirmada (nem o chat de branch recebeu uma). Horário exato não visível. Rodaram em bloco (E3 ok), sem servidor local nem container.

## Bloqueios para o humano
- `RESEND_API_KEY` e `EMAIL_REMETENTE` **não existem na Vercel**: sem eles nenhum e-mail sai em produção (modo registro local). Só o Gabriel cria; roteiro na seção 6 de `PESQUISA_CUSTO_EMAIL.md`.
- Migration 053: o Controle aplica no commit.
- Linhas de encaixe E1–E4 (retirada postada em `rastreios.ts` e `logistica.ts`; cron opcional; segurança da frente A) — tabela no MD de execução; o Controle aplica no merge.

## Cobertura do MD de execução
Desenho completo, catálogo, idempotência, linhas de encaixe: em `2026-11-17--manut-c-emails-de-movimentacao--MD_EXECUCAO.md` (não recopiado).

## Decisões de produto abertas (uma linha no catálogo cada)
Depósito = sempre (dinheiro entrando); análise de moeda = 1 e-mail por moeda fechada (pode passar da estimativa de 1 por envio).

## Auditoria
Zero commits, nenhum segredo, nenhuma palavra proibida em texto, saque não duplicado, nada tocou o banco real (a pesquisa leu com BEGIN READ ONLY/ROLLBACK, sem SET). Detalhe: `--LOG_DE_EXECUCAO.md`.

## Próximo ato (um)
Gabriel cria a chave do Resend na Vercel; o Controle aplica a 053 e as linhas E1–E4 no merge.

- Controle (17/11): sem liberação formal; testes da Execução ficam como RELATO, conferidos no merge, sem desvio. Limite: build/dev/suíte inteira são do Controle pós-merge; na branch só vitest de um arquivo (--maxWorkers=1) e eslint dos arquivos da C.
