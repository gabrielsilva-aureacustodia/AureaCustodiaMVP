# Relatório de Execuções (detalhado) — frente A · segurança: senha nas ações sensíveis

Projeto: Áurea Custódia / Real Olímpico — manutenção de novembro/2026 (pedido do Rogério, item 1)
Branch: claude/manut-seguranca-senha-606459 · Ref_commit: 9e21fe1 · Packet: docs/manutencao-2026-11/frentes/A-seguranca.md (fora do Git)
Datas: 2026-11-17 (22:24 a 23:10) · Escrito pela Auditoria, a partir do LOG e do MD de execução.

## 1. Tópicos na ordem real
1. **T1** — estudo `ESTUDO_REAUTENTICACAO.md` e pesquisa (`pesquisa/a-reautenticacao-step-up.md`). Feito pela Execução (o Específico não foi aberto).
2. **T2** — módulo `reautenticacao.ts` (+ config, actions), prova em cookie assinado, código de 6 dígitos para conta só Google. 41 testes.
3. **T3** — guardas em 14 ações sensíveis, teste de varredura "nenhuma sem guarda", teste das ações com guarda real. 12 testes de ação existentes adaptados (+2 linhas cada: mock da guarda).
4. **T4** — modal único, hook `useConfirmarSenha`, CSS, 8 telas ligadas e rede central em `AppProvider.run()`.
5. **T5** — evento `seguranca.<tipo>` em `audit_log` (senha, e-mail e Pix), sem migration.
6. **RA-50** (ampliação autorizada) — guarda de `definirNovaSenha` em `auth.ts` + `sessao-de-recuperacao.ts`.

## 2. Arquivos tocados (um porquê cada)
- Novos: `src/server/auth/reautenticacao{,-actions,-config,-eventos}.ts`, `sessao-de-recuperacao.ts` — o módulo único que confere senha/código e registra o evento.
- Novos: `src/components/seguranca/{ModalConfirmarSenha.tsx,useConfirmarSenha.tsx,confirmacao.ts}`, `src/styles/seguranca.css` — o modal único.
- Novos testes: `reautenticacao*.test.ts`, `sessao-de-recuperacao.test.ts`, `reautenticacao-acoes.test.ts`, `confirmacao.test.ts`, `telas-confirmam.test.ts`.
- Alterados (guarda de uma linha): `src/server/actions/{account,market,sell,payments,reserva,custody}.ts`; `auth.ts` (só `definirNovaSenha`).
- Alterados (ligação do modal): `AccountModals.tsx`, `ModalCadastro.tsx`, `AppProvider.tsx`, páginas `(app)/compras|mercado|vender`, `ModalOfertaPrePaga.tsx`, `ReservasEmAberto.tsx`, `ModalSolicitarRetirada.tsx` (área da frente I; diff mínimo), `globals.css` (+4, @import).
- 12 testes de ação existentes e `auth.test.ts`: só mock da guarda e testes novos do RA-50.
Total no Git (aprox.): 30 arquivos alterados, +475/-46, mais os novos não rastreados. 0 commits.

## 3. Testes rodados
Só arquivo por arquivo, `vitest --maxWorkers=1`, com liberação do Controle às 22:52: módulo 48, varredura 77, ações com guarda real 53, 12 testes adaptados, confirmação 11, telas 3, eventos 16, RA-50 10 + auth 16 — todos verdes (números no MD, T3/T4/T5/RA-50). Eslint só dos arquivos da A: 0 erros. **Não rodados** (ordem do Controle, por RAM): typecheck, `eslint src`, build, suíte inteira.

## 4. Bloqueios deixados para o humano
- Gabriel: modelo "Magic Link" do Supabase com `{{ .Token }}` (conta Google).
- Controle, depois do deploy: conferir tela (foco, Esc, 44 px, claro/escuro) e o **link real de "esqueci minha senha"** (RA-50: a doc do Supabase não diz qual `amr` o link grava; se falhar, reverter só essa guarda).
- Decisão do Gabriel: alternativa do RA-50 (código por e-mail depois do link; mexe na frente D).

## 5. Desvios apontados pela Auditoria (todos resolvidos ou anotados)
Ver LOG. Resumo: aceite do T4 com "navegador local" (corrigido); testes e telas fora do Touch literal (anotados no MD, E7); ampliações `AppProvider.tsx` e `auth.ts` (autorizadas); nenhum commit, segredo, migration, `src/domain`, captcha/TOTP ou palavra proibida.

## 6. O que o MD já cobre
Todos os detalhes de desenho, níveis (`sempre`/`janela` 5 min), contrato A→C e onde encaixar `avisarSeguranca`: `2026-11-17--manut-a-seguranca-senha--MD_EXECUCAO.md`.

## 7. Próximo ato
Controle: merge, `typecheck` + suíte + build, deploy, conferência em produção (tela e link de recuperação).
