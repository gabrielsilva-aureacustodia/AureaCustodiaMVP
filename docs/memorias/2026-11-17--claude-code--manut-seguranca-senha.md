# Segurança: senha nas ações sensíveis — memória do agente

- **Data:** 2026-11-17 · **Agente:** claude-code (Auditoria da frente A) · **Projeto/branch:** manut-seguranca-senha (claude/manut-seguranca-senha-606459, base 9e21fe1)

## 1. Estado em uma tela
Feito e verde arquivo a arquivo (vitest): módulo `src/server/auth/reautenticacao*.ts`, guarda em 14 Server Actions, modal único `src/components/seguranca/`, rede central em `AppProvider.run()`, evento `seguranca.*` em `audit_log`, guarda de `definirNovaSenha` (RA-50). Sem commit, sem migration. Não rodados: typecheck, eslint src, build, suíte inteira (RAM; do Controle no merge). Tela e link real de recuperação: só depois do deploy.

## 2. Decisões e o porquê
- D3: senha sempre em saque e troca de Pix/senha/e-mail/dados; compra e venda com janela de 5 min (constante em `reautenticacao-config.ts`, único arquivo). D8: retirada também pede. (Padrões da ficha até o Gabriel mudar.)
- Conta só Google: código de 6 dígitos por e-mail (Supabase OTP).
- Sem limite de tentativas, captcha ou TOTP (R10): o Supabase já limita login e envio de e-mail; registrado como fato.
- `definirNovaSenha` só vale para sessão aberta por link de e-mail recente (amr recovery/otp/magiclink, ≤30 min); na dúvida bloqueia. Alternativa mais forte (código depois do link) toca a frente D: decisão do Gabriel.
- Regra permanente do Gabriel (17/11, via Controle): nada de servidor local, preview ou container; tudo direto para produção, conferência depois do deploy.

## 3. O que aprendi (armadilhas, comandos, caminhos)
- Com pouca RAM (0,2 GB livres), `git diff` global falha com "malloc"; usar `git status --porcelain` e `diff --numstat` por pasta.
- Teste só por arquivo: `npx vitest run --maxWorkers=1 <arquivo>`.
- A guarda real chama `cookies()`, que fora de requisição lança erro: testes de regra de negócio de ação ganham `vi.mock('@/server/auth/reautenticacao', ...)`.
- PowerShell: `Get-Content`/`Set-Content` sem `-Encoding utf8` estraga acentos; escrever MD com a ferramenta Write.
- Contas e variáveis: só `SESSION_SECRET` (assina a prova) e a chave publicável do Supabase; valores fora do Git.

## 4. Como continuar (próximos passos exatos)
1. Controle: merge das frentes (onda 2), `npm run typecheck`, `eslint src`, `npm test`, `npm run build`.
2. Gabriel: modelo "Magic Link" do Supabase com `{{ .Token }}` (só para conta Google).
3. Controle, depois do deploy: com conta de teste, conferir o modal (foco, Esc, 44 px, claro/escuro), saque, troca de Pix, compra, venda, retirada e **"esqueci minha senha" com link real**; o `console.warn` mostra o `amr` recebido; se falhar, ajustar a lista em `sessao-de-recuperacao.ts` ou reverter só essa guarda.
4. Frente C: encaixar `avisarSeguranca` na mesma linha de `registrarEventoDeSeguranca` em `account.ts` (aviso ao e-mail ANTIGO na troca de e-mail; nunca derrubar a troca).
5. Atualizar RA-50 em `RISCOS_ASSUMIDOS.md` e nos `ATALHOS.md` (raiz, fora da branch).

## 5. Pendências e riscos
- RA-50: a doc do Supabase não diz qual `amr` o link de recuperação grava; risco de bloquear cliente legítimo (falha fechada).
- `changePasswordContingencia` ficou inalcançável; conta Google em "Alterar senha" confirma por código e a ação recusa a senha atual (limitação anterior).
- Evento de segurança não sai no caminho `definirNovaSenha`; decisão da D/Controle.
- Falha ao gravar o evento não desfaz a troca (risco aceito: sem aviso por e-mail nesse caso).

## 6. Ligações
`2026-11-17--manut-a-seguranca-senha--MD_EXECUCAO.md`, `--LOG_DE_EXECUCAO.md`, `--CONTINUIDADE.md`, `ESTUDO_REAUTENTICACAO.md`, ficha `docs/manutencao-2026-11/frentes/A-seguranca.md`. `[[processo-eficiente-de-branches-2-0]]`
