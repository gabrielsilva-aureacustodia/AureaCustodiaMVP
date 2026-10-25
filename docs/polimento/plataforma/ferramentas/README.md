# Ferramentas da Frente 4

| Arquivo | Para quê |
|---|---|
| `auditoria-botoes-campos-ro.py` | Adaptação de `aprendizado_frontend/ferramentas/auditoria-botoes-campos.py` às classes do Real Olímpico (`btn-gold`, `btn-outline`, `<input>`). `python -I auditoria-botoes-campos-ro.py <raiz>` |
| `auditoria-tabelas-largas-ro.py` | Adaptação de `auditoria-tabelas-largas.py` para `<table>` crua: colunas, ações por célula, `th scope="row"`, 1.ª coluna fixa (`.tabela-fixa`). |
| `semear-store-local.cjs` + `gerar-semente.test.ts` | Teste de tela logada sem banco: store em memória com as 7 contas do seed. |

## Teste local de tela logada, sem tocar em produção (25/10/2026)

1. `.env.test.local` (ignorado pelo Git) com `SESSION_SECRET=<qualquer valor local>` e as variáveis de banco,
   Supabase, Mercado Pago, Correios e NFS-e **vazias**. Com `NODE_ENV=test` o Next lê só esse arquivo.
2. Gere a semente e suba o servidor com os comandos do topo de `semear-store-local.cjs`.
3. Sessão de teste: cookie `aurea_session` = `base64url(email) + "." + HMAC-SHA256(SESSION_SECRET local, base64url(email))`
   (formato de `src/server/session-core.ts`). Só vale neste servidor local.
4. **Abra pelo IP de rede** (`http://172.26.224.1:3104`), não por `localhost`: cookie de `localhost` é o mesmo em
   todas as portas, e outra frente rodando o app apaga a sua sessão (PROPOSTAS_BACKEND.md P9).
5. Faturas do ciclo: `curl http://<host>:3104/api/cron/faturamento` (sem `CRON_SECRET` local; a NFS-e não sai sem banco).
