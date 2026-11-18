Estrutural hoje:
- Pasta nova src/server/emails/ · migration 053 (fila de e-mails, NÃO aplicada) · gancho em estado.ts/state.ts (mutarEstado devolve emailsPedidos) · Idempotency-Key em src/lib/email
Você precisa clicar / autorizar:
- Criar RESEND_API_KEY e EMAIL_REMETENTE na Vercel (+ domínio no Resend); autorizar a aplicação da 053 no commit
