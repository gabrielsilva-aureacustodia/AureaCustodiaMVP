# Branch A — o que falta (relatório simples para corrigir o agente)

```
Escrito em:  03/09/2026
Branch:      feat/auth-landing (commit 0e2f1f4, publicada no origin)
Verificado:  typecheck ✅ · lint ✅ · 38 testes ✅ · build ✅
Worktree:    %TEMP%\aurea-auth-report-codex (pasta temporária — ver item 3)
```

> Para o Gabriel passar ao agente da frente A. A seção 4 é a mensagem pronta para colar.

---

# 1. O que está pronto e confere

- Landing pública em `/`, login em `/entrar`, cadastro em `/cadastrar`.
- Redirects trocados no mesmo commit; sem laço (testado: `/inicio` sem sessão vai a `/entrar`).
- Login, cadastro por e-mail com confirmação e Google OAuth com PKCE, tudo no servidor.
- Aceite de Termos e Política gravado com versão e data no metadata do usuário.
- Cadastro fechado por padrão em duas camadas (tela e Server Action).
- README em cada pasta nova; nenhum Client Component importa `@/server/*`.
- Landing usa só o logo oficial, afirma seguro sem citar seguradora, tem CNPJ.

---

# 2. O que o agente precisa resolver

Em ordem de importância. **Código** é o que o agente faz sozinho; **decisão** é o que
ele deve perguntar antes.

| # | O que falta | Tipo | Onde |
|---|---|---|---|
| **1** | **Ninguém consegue entrar depois do merge.** O login vai só ao Supabase Auth. Sem `SUPABASE_URL` e chave, responde "autenticação não configurada"; com elas, não há nenhum usuário lá, e os e-mails do seed (`@testeaurea.com.br`) não recebem confirmação. Precisa de **um caminho de contingência**: enquanto `isAuthConfigured()` for falso, o login usa a regra antiga (`ACCOUNTS` / `user.pass`), registrado como atalho. Assim `npm run dev`, Preview e produção continuam funcionando até a configuração existir | Código | `src/server/actions/auth.ts` |
| **2** | **Registro dos atalhos não foi feito.** `RISCOS_ASSUMIDOS.md` não mudou; não existe `src/server/auth/ATALHOS.md`; `docs/CATALOGO_DE_FEATURES.md` não marca 4.2/4.3; sem entrada no `VERSION_COMPARISON_DAILY.md`. Criar **RA-15 — Atalhos da frente A**: (a) contingência do item 1, (b) troca de senha órfã (item 4), (c) contas de teste ainda com senha em texto puro até a recriação | Código | raiz e `src/server/auth/` |
| **3** | **Relatório expandido não commitado** (`docs/ENTREGA_AUTH_LANDING.md`, 298 linhas contra 150 no commit) está solto no worktree em pasta temporária do Windows, que pode ser apagada. Commitar essa versão ou descartar | Código | worktree temporário |
| **4** | **Troca de senha ficou órfã.** `changePassword` em `account.ts` ainda grava `user.pass`, que o login novo não lê. Trocar senha na tela não muda nada. Opções: apontar para `supabase.auth.updateUser({ password })` ou esconder o botão até a recriação das contas. `account.ts` é da frente B — pedir antes | Decisão | `src/server/actions/account.ts` |
| **5** | **`.env.example` não conhece as variáveis novas**: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `AUREA_SIGNUP_ENABLED`, `AUREA_TERMS_VERSION`, `AUREA_PRIVACY_VERSION`, `AUREA_TERMS_URL`, `AUREA_PRIVACY_URL`, `AUREA_SITE_URL`, `AUTH_LEGAL_SECRET`. Acrescentar com comentário do que cada uma faz | Código | `.env.example` |
| **6** | **Zero testes novos.** `getRegistrationStatus()` (config.ts) e `authCallbackUrl()` (origin.ts) são testáveis com `vi.mock('server-only')`, como a frente C fez. Cobrir: fechado sem variáveis, fechado sem versões legais, aberto com as cinco | Código | `src/server/auth/*.test.ts` |
| **7** | **Documentos de login desatualizados.** `docs/referencia/CONTAS_DE_TESTE.md` e o `README.md` da raiz ainda dizem "entre em `/` com senha 12345678". Atualizar para `/entrar` e explicar a contingência do item 1 | Código | `docs/referencia/`, `README.md` |
| **8** | **Seed com e-mails reais ou fictícios?** O agente registrou a decisão de recriar as contas com e-mails reais, mas `seed.ts` continua com os fictícios e é da frente B. Precisa de uma decisão sua e de um commit na B (ou depois do merge) | Decisão | `src/domain/seed.ts` |
| **9** | Links "Termos de Uso" e "Política de Privacidade" no rodapé da landing apontam para `/cadastrar#documentos-legais`, uma página fechada. Quando `AUREA_TERMS_URL`/`AUREA_PRIVACY_URL` existirem, apontar para elas; até lá, um texto "em elaboração" | Código, menor | `src/components/landing/LandingPage.tsx` |

## O que fica com o Gabriel (não é do agente)

- Supabase Auth: URL e chave publicável na Vercel (Development, Preview, Production) e no
  `.env.local`; autorizar `https://<domínio>/entrar/callback`.
- Google OAuth: credencial no Google Cloud e provedor no Supabase.
- Resend: SMTP no Supabase, template "Confirm signup" com `token_hash`, tracking desligado.
- Termos de Uso e Política de Privacidade (RA-03) — só para **abrir** o cadastro; o merge
  não depende disso.
- Criar as sete contas no Supabase Auth e confirmar cada e-mail.

---

# 3. Ordem sugerida

1. Itens 1, 2, 5, 6, 7, 9 — uma sessão, um commit por item, `npm run typecheck && npm test
   && npm run build` entre cada.
2. Item 3 — antes de tudo, na verdade: `git -C %TEMP%\aurea-auth-report-codex status` e
   decidir o destino do arquivo.
3. Itens 4 e 8 — o agente descreve a mudança e espera o seu "sim".
4. Depois do merge da B no `main`: rebase (sem conflito previsto), verificação, merge da A.
5. Configuração externa e as sete contas — antes ou depois do merge, porque a
   contingência do item 1 mantém o login funcionando.

---

# 4. Mensagem pronta para o agente da frente A

> Copie daqui para baixo.

A auditoria de 03/09 (`docs/EXECUCAO_BRANCH_A_O_QUE_FALTA.md`, leia inteiro) confirmou
que a branch `feat/auth-landing` compila, passa nos testes e faz o que o prompt pediu.
Faltam nove itens. Faça, nesta ordem, um commit por item, com `npm run typecheck`,
`npm test` e `npm run build` verdes entre cada:

1. **Contingência de login.** Enquanto `isAuthConfigured()` for falso, `login()` usa a
   regra antiga (`ACCOUNTS` e `user.pass`, a mesma que existia no `main`), com um
   comentário dizendo que é atalho e por quê. Assim ninguém fica trancado para fora
   antes da configuração do Supabase Auth.
2. **Registro.** `RISCOS_ASSUMIDOS.md`: seção RA-15 — Atalhos da frente A, com os
   subitens a, b e c da tabela, no formato do RA-13; linha no índice.
   `src/server/auth/ATALHOS.md` com os mesmos subitens. `docs/CATALOGO_DE_FEATURES.md`
   4.2 e 4.3 marcados como entregues na branch, com o que falta. Entrada nova no
   `docs/diario/VERSION_COMPARISON_DAILY.md` (append-only; número seguinte ao último).
3. **Relatório.** Commitar a versão expandida de `docs/ENTREGA_AUTH_LANDING.md` que está
   modificada no seu worktree, ou descartá-la — não deixe solta.
4. **`.env.example`** com as nove variáveis da frente A, comentadas.
5. **Testes** para `getRegistrationStatus()` e `authCallbackUrl()`, usando
   `vi.mock('server-only', () => ({}))`.
6. **Documentos de login**: `docs/referencia/CONTAS_DE_TESTE.md` e `README.md` passam a
   dizer `/entrar` e a explicar a contingência.
7. **Rodapé da landing**: links legais deixam de apontar para `/cadastrar`; usam
   `AUREA_TERMS_URL`/`AUREA_PRIVACY_URL` quando existirem, senão texto "em elaboração".
8. **Pare e me pergunte** antes de: mexer em `account.ts` (troca de senha órfã) e em
   `seed.ts` (e-mails reais). Descreva a mudança em poucas linhas e espere.
9. `git push origin feat/auth-landing` ao fim.

Não rediscuta Supabase como banco e autenticação (D2 e D4). Não abra o cadastro
(RA-03). Nenhuma credencial em commit. Comentários em português explicando o porquê.
