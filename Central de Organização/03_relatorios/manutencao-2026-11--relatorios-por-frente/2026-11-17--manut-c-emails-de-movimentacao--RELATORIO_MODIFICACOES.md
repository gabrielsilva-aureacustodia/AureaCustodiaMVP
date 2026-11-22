# Relatório de Modificações — frente C · base 9e21fe1

| Item | Tipo | Path | Consequência |
|---|---|---|---|
| Fila de e-mails | crítico (banco) | `src/server/db/migrations/053_emails_pendentes.sql` | tabela `aurea.emails_pendentes`, chave única; **escrita, NÃO aplicada** (Controle aplica no commit) |
| Central de e-mails | pasta nova | `src/server/emails/` | deriva eventos do diff, monta texto, despacha; saque fica de fora |
| Gancho central | contrato | `src/server/db/estado.ts`, `src/server/state.ts` | `mutarEstado` passa a devolver `emailsPedidos`; conferir no merge se há outro chamador |
| Provedor | integração | `src/lib/email/index.ts`, `tipos.ts` | cabeçalho `Idempotency-Key` (24 h no Resend) |
| Guarda de SQL | crítico | `src/server/db/sql-injecao.baseline.json` | +1 entrada (fila.ts: nome do schema validado) |
| Lista de tabelas | teste | `src/server/db/db.test.ts` | +`emails_pendentes` |

**Env:** `RESEND_API_KEY` e `EMAIL_REMETENTE` ausentes na Vercel (nenhuma criada). **Não mudou:** Server Actions, `saques/avisos.ts`, `src/domain/**`, cron. **MD de pasta/ENVIRONMENT_TABLE:** não atualizados (B5); o Controle encaixa no merge.
