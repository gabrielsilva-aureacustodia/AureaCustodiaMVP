# Auditoria QA Davi 22-11 (só leitura)

Cron 56c50dc8 a cada 3 min. Git: main @282e55d, nenhum commit novo da QA.

## Ciclo 1 (20:28)
- MDs de execução qa-r1..r4 AINDA NÃO EXISTEM em docs/diario/execucoes/ (só manut2-t1..t6).
- Diff da pasta (23 arquivos) é de OUTROS temas (T3 balcão: market/sell/reserva/trades/diff/conciliacao/types; T5 KPIs: kpis*, Conselho; T6 PWA/login: LoginForm, callback, login.css, AvisoDoGoogleNoApp). Linha de base: não atribuir às R1–R4.
- B01: não verificado ainda (nenhuma Execução gravou).
- Gravidade: nenhuma.

## Ciclo 2 (R1 / B01, parcial — MD qa-r1 ainda não existe)
Git: main @019947c (commit do T6, de outro chat; nenhum commit da QA). Nenhum MD qa-r1..r4 em docs/diario/execucoes/.
Arquivos novos/alterados de R1–R4 (sem MD): dias-uteis, plural, validacao-cadastro, validacao-dinheiro, estado-do-usuario (domain+server), Modal.tsx, tutorial, Academy, Sidebar, account.ts, etc.

- B01 PARCIAL OK: `src/app/(app)/layout.tsx:80` e `src/app/api/state/route.ts:62` já passam por `visaoDoUsuario`; `src/domain/estado-do-usuario.ts` filtra users (sem `pass`), listas pessoais, pseudônimo HMAC para terceiros. Nenhum componente cliente lê `state.users` de terceiros (grep em src/components e src/app/(app): só `state.users[session]`). `recibos/auditoria/page.tsx:60` soma `state.users` no servidor (ok, não vai ao cliente).
- **GRAVE — teste de payload AUSENTE**: não há `estado-do-usuario.test.ts` (domínio nem servidor). O relatório exige prova de que o payload não carrega CPF/Pix/banco/e-mail de terceiros. Cobrar de R1.
- MÉDIO: `publico.estoque` (estado-do-usuario.ts:~125) entrega `reciboCodigo` de TODAS as moedas a qualquer cliente; confirmar que código de recibo não é segredo (autentica recibo). 
- MÉDIO (A08): `publico.auditoria` mantém saldo/taxas/comissões da empresa no payload de todos — correto NÃO decidir sozinho, mas precisa ir como pergunta ao Gabriel (A08) e constar no MD.
- Pendência: avaliar com jurídico comunicação ANPD (LGPD art. 48) e checar logs de acesso — não é código; deve estar como pergunta ao Gabriel no MD de R1.
- Não conferido ainda: typecheck/testes (proibido build; vitest dos novos arquivos serão checados quando houver MD).

## Ciclo 3 (20:35)
Git: main @019947c, sem commit/build da QA. MDs: só qa-r3 existe; qa-r1, qa-r2, qa-r4 AINDA sem MD (mas já há código deles — cobrar MD).
- B01: teste de payload agora EXISTE (`src/domain/estado-do-usuario.test.ts`, 9 casos incl. simetria e conta inexistente) → achado grave do ciclo 2 RESOLVIDO. vitest dos 5 testes novos (estado-do-usuario, dias-uteis, plural, validacao-cadastro, validacao-dinheiro): 59 verdes.
- R3 conferido no código: B06 `dates.ts:65` usa `somarDiasUteis` (dias-uteis.ts); B07 `AccountModals.tsx` + `validacao-dinheiro.ts`; S04 `compras/page.tsx:82` `motivoOfertaDeCompraInvalida`; B09 `envios/page.tsx:333,628` ano travado em `anoPadrao`; S02 `vender/page.tsx` link para termos; A06 texto do Sacar trocado. OK.
- R3 perguntas ao Gabriel registradas no MD (depósito mínimo, feriado só nacional/A01, termos de publicação, ano no servidor). OK.
- BAIXO R3: B09 só trava na tela; `createProtocol` aceita qualquer ano (R3 já perguntou). B06 feriado só nacional (perguntado).
- R2: `normalizarNome` já importado em `account.ts:30` (o erro de saque.test citado por R3 sumiu). Sem MD ainda.
- Pendentes de decisão do Gabriel ainda NÃO listados em MD de R1/R2/R4: A01–A03, A05, A08, A09, A10, B02 política, 13 perguntas.

## Ciclo 4 (20:36)
Git: main @66c0dd2 (commit T5 de outro chat); nenhum commit/build da QA. MDs: qa-r1, qa-r3, qa-r4 existem; **qa-r2 ainda NÃO existe** (R2 já alterou account.ts, LoginForm, validacao-cadastro).
- R1 verificado: cookie Secure `src/server/auth/client.ts:29`; CSP só Report-Only `next.config.mjs:44` (sem endpoint de relatório — "ler violações no console" é viável mas frágil; aceitável); fuso fixo `dates.ts:23` (causa do 418 não confirmada no navegador — Tester). Teste B01 11 casos. tsc/vitest R1 verdes (reexecutei estado-do-usuario, api/state, dates: 13 verdes). Perguntas A08/A09/ANPD/logs registradas.
- R3 OK (ciclo 3). R4: B04/S05/S06/B10/B05/A11–A15/A07/A17/S07/S08/B08 com arquivo:linha no MD; testes middleware/plural/documentos-legais/home/landing verdes (reexecutei login+documentos-legais+middleware: 52 verdes).
- **GRAVE (R4): reescreveu o texto dos Termos (v2.1→2.2) por conta própria**, incluindo erros "materiais", e isso força todo cliente a re-aceitar. O relatório diz "revisar com o jurídico, é o contrato". Correção só de forma (a)), numeração) é segura; mudar texto do contrato exige OK do Gabriel/jurídico antes de publicar. Garantir que 2.2 NÃO seja publicada até aprovação; MD já diz "quem publica: Merge/Deploy ou Gabriel" — reforçar.
- **GRAVE (R2/T6): teste vermelho** `src/components/login/AvisoDoGoogleNoApp.test.ts:37` (`not.toMatch(/esqueci…/)`): o texto do aviso agora cita "Esqueci minha senha" (S01 implementado), o teste do T6 proíbe. Atualizar o teste (suíte vermelha não é pendência). R4 cita ainda `FormulariosDeAcesso.test.ts` (server-only importado em componente) — não reproduzi vermelho neste ciclo.
- A14: R4 não confirmou o e-mail gravado no banco (default suporte@) — baixo.
- R4 pergunta A01–A03,A05,A08,A09,A10 + 13 perguntas: OK, completo.

## Ciclo 5 (20:37)
Git: main @66c0dd2, sem commit/build da QA. qa-r2 ainda SEM MD.
- R4 grave RESOLVIDO: MD agora diz "NÃO publicar Termos 2.2"; Termos voltaram a 2.1 (hash original), só forma corrigida; patch em garantias/TERMOS_v2.2_PATCH_AGUARDANDO_APROVACAO.diff. (Linhas antigas do MD ainda citam v2.2 como feito — R4 já avisou que descrevem o patch.)
- R2/T6 grave RESOLVIDO: AvisoDoGoogleNoApp.test e login passam (54 verdes com validacao-cadastro).
- Aberto: MD do R2 (cobrado 2x).

## Ciclo 6 (20:38) — FECHAMENTO: as 4 Execuções têm MD e declaram fim; cron deletado
Git: main @66c0dd2 (último commit é de outro chat); nenhum commit/build local das R1–R4; tudo só no working tree.
- R2 conferido: B02 marca `auth.ts:202`, bloqueio `account.ts:521` (depósito/compra/venda/saque dependem de `temCadastroCompleto`: market, payments, reserva, sell, account); S01 `conta-acesso.ts`; B03/A16 `validacao-cadastro.ts` aplicado no servidor; A04 era erro de leitura engolido (corrigido na tela). `tsc --noEmit` limpo; vitest de server/auth, account.test, login, validacao-cadastro: 249 verdes.
- Riscos/pendências que NÃO são das Execuções (Gabriel/Tester/Deploy): (a) Supabase `mailer_autoconfirm: true` em produção — B02 só fecha de fato se desligar ou se o fallback `signInWithOtp` funcionar; fluxo de e-mail NÃO testado; (b) contas já existentes (inclui `a@a.co`) valem como verificadas; (c) `SUPABASE_SERVICE_ROLE_KEY` na Vercel (sem ela a conta nova não recebe a marca); (d) CSP só Report-Only; 418 a confirmar no navegador; (e) Termos 2.2 em patch aguardando jurídico; (f) `frete-envio.test.ts` vermelho (4 testes, estorno 10000×9600), citado pelo R2 como de outro chat — suíte vermelha não é pendência, alguém precisa assumir; (g) B09 ano sem validação no servidor; (h) arquivos compartilhados entre chats (types.ts, dates.ts, AccountModals, LoginForm, callback/route) — `git add` por caminho.
- Decisões do Gabriel acumuladas: A01–A03, A05, A08, A09, A10, B02 política, depósito mínimo (DEPOSITO_MINIMO_CENTS=0), feriado só nacional, "termos de publicação", ano no servidor, Receita (Datavalid), autoconfirm, contas de teste, ANPD/art. 48 + logs, 13 perguntas de negócio.
