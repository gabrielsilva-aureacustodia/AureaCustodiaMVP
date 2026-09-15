# E1 · Execução

Uma linha por tarefa fechada.

- **T1 (P-C2-09)** — `legalAcceptance` em ordem fixa em `normalizarUser`; `src/server/db/diff.ts`, `aceite-nas-preferencias.test.ts`, `src/server/db/README.md`. Commit 0ecdf7a. Falta: nada.
- **T2** — `src/server/auth/conta-desativada.ts` e teste. Commit 437b85b. Falta: nada.
- **T3 (portas 1 e 2)** — `login()` recusa conta desativada; `src/server/actions/auth.ts` e teste. Commit 437b85b. Falta: nada.
- **T4 (callback)** — conta desativada, `type=recovery` e destino; `src/app/entrar/callback/route.ts`, teste e README. Commit 437b85b. Falta: nada.
- **T5 (sessão aberta)** — `/entrar/sair`, casco, `/api/state`, 401 do `AppProvider`, aviso em `/entrar`. Commit 437b85b. Falta: nada.
- **T6 (P-C2-05)** — `definirNovaSenha`, `src/app/entrar/nova-senha/`, `src/components/login/NovaSenhaForm.tsx`, casos em `auth.test.ts`. Falta: nada.
- **T7** — RA-43/44/49/50 em `RISCOS_ASSUMIDOS.md` e nos `ATALHOS.md` de `auth/`, `actions/`, `admin/`; READMEs. Falta: nada.
- **T8** — ciclo completo e relatório `E1.md`. Conferência por `curl.exe` com servidor local não rodada (ver relatório).
