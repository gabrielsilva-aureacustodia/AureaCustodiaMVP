# QA Davi 22-11 | R2 Cadastro e conta — MD de execução

## RETOMADA
- Tema R2 do `docs/manutencao-2026-11/garantias/PLANO_HIPERDETALHADO__Relatorio_QA_Davi_22-11.md`. Pasta completa, sem build local, **sem commit/push** (Merge/Deploy faz). Só toquei no meu tema.
- **Estado: código feito e testado por vitest/tsc; nada no ar.** Falta o Merge/Deploy e uma ação do Gabriel no Supabase (abaixo).
- Achado que muda tudo no B02: `GET /auth/v1/settings` do projeto Supabase de produção responde **`mailer_autoconfirm: true`** (leitura pública, 22/11/2026). Por isso `a@a.co` nasceu "confirmado": o Supabase confirma sozinho e não manda e-mail. O código não consegue desligar essa chave.
- Migration: **nenhuma**. A marca vive em `app_metadata` do Supabase Auth.

## Feito
| Item | O que ficou | Onde |
|---|---|---|
| B02 | Conta pelo e-mail nasce com `app_metadata.email_pendente=true` (só a chave de serviço escreve). Cadastro manda link (o do Supabase, ou `signInWithOtp` quando o Supabase autoconfirma). O clique passa no callback, que tira a marca e entra direto no Início. Selo de Segurança agora vem do servidor (era texto fixo "Verificado"); "Pendente" + botão "Reenviar link". Sem a marca (sócios, Google, painel) = verificada, sem migração. Bloqueio: `salvarCadastro` recusa enquanto pendente, e depósito/compra/venda/saque já exigem `temCadastroCompleto` — um ponto só. Login com erro `email_not_confirmed` diz o motivo. | `src/server/auth/email-pendente.ts` (+test), `src/server/actions/auth.ts`, `src/server/actions/conta-acesso.ts`, `src/app/entrar/callback/route.ts`, `src/server/actions/account.ts`, `src/app/(app)/conta/configuracoes/page.tsx` |
| S01 | NÃO existia. Criado "Esqueci minha senha" + "Reenviar link de confirmação" na entrada (usa o e-mail digitado; resposta neutra, não revela quem tem conta; fluxo `implicit`, mesmo formato dos links do painel, cai em `/entrar/nova-senha`). Texto do aviso do Google no app (T6) ajustado, e o teste dele (que proibia "esqueci"). | `conta-acesso.ts`, `LoginForm.tsx`, `AvisoDoGoogleNoApp.tsx/.test.ts`, `login.css` |
| B03 + A16 | Regras puras (nome pelas 7 regras, nascimento real/não futura/18+ no dia de Brasília, telefone com DDD real e sem repetição, Pix por tipo: CPF com dígito, e-mail com @ e domínio, telefone, UUID). Aplicadas **no servidor** (`salvarCadastro`, `updatePersonal`, `registerWithEmail`) e **no navegador** (ModalCadastro, Dados pessoais, RegisterForm). "Nome de exibição" em Dados pessoais. Obrigatórios com `*`. Datavalid/Consulta CPF **não** integrados. | `src/domain/validacao-cadastro.ts` (+30 testes), `account.ts`, `ModalCadastro.tsx`, `AccountModals.tsx`, `RegisterForm.tsx` |
| A04 | Investigado em produção (leitura, `BEGIN READ ONLY`): o aceite de `a@a.co` **estava gravado** (3 documentos, canal `cadastro_email`; 334 aceites por e-mail no total). Quem falhava era a tela, que engolia o erro de leitura e mostrava "nenhum registro". Agora mostra o erro com "Tentar de novo". Causa exata da falha de leitura do QA não reproduzida (hipótese: leitura somente-leitura/pooler naquele momento). | `configuracoes/page.tsx` |
| A11 | Já estava trocado por outro chat ("Entre com o e-mail e a senha da sua conta.") — conferido, não mexi. | `LoginForm.tsx` |
| Mostrar senha | Olho nos dois campos do cadastro, mesmo padrão do login. | `RegisterForm.tsx` |

## Verificação (sem build)
- `npx tsc --noEmit`: 0 erros.
- vitest: `validacao-cadastro` (30), `email-pendente`, `account.test` (18, 4 mensagens atualizadas + 1 teste B03 novo), `FormulariosDeAcesso`/`AvisoDoGoogleNoApp` (24, +2 testes), `src/server/auth`, `src/app/entrar`, `src/app/cadastrar`: verdes.
- Fora do meu escopo e vermelho: `src/server/actions/frete-envio.test.ts` (4 testes, estorno do frete 10000 × 9600) — é de outro chat (frete/estorno), não toquei em nada ligado a isso.
- **NÃO testado:** o fluxo real de e-mail (link de confirmação, de redefinição, `signInWithOtp` com autoconfirm). Exige Supabase real; não criei conta em produção. O Tester deve conferir no ar com conta de teste do repositório.

## Para o Gabriel decidir / fazer
1. **Supabase: ligar a confirmação de e-mail do cadastro** (desligar o "autoconfirm"). Com ele ligado o próprio Supabase manda o link e não deixa logar sem clicar; sem isso, o link sai pelo `signInWithOtp` do código (também funciona, mas é o caminho de reserva). Não descrevo o caminho do menu: não verifiquei. Cuidado: o envio embutido do Supabase tem limite baixo de e-mails por hora; o ideal é SMTP próprio (Resend pendente).
2. **Política de bloqueio (provisória):** conta com e-mail não confirmado entra e olha, mas não completa o cadastro formal — logo, sem depósito, compra, venda e saque. Alternativa: bloquear o login inteiro até confirmar.
3. **Contas já criadas no QA** (ex.: `a@a.co`): sem a marca, valem como verificadas. Quem criou conta por e-mail antes do deploy não precisa clicar. Dizer se querem marcá-las como pendentes (precisa de um script em produção — não rodei).
4. **A05** (Política × cadastro progressivo): só levantado, decisão do Gabriel/jurídico. Nada codificado.
5. Lacuna: se `SUPABASE_SERVICE_ROLE_KEY` faltar na Vercel, a conta nova NÃO recebe a marca (fica sem proteção) e o servidor registra `[auth] cadastro sem a marca de e-mail pendente`. A chave existe no `.env.local`; conferir na Vercel.

## Arquivos tocados (para o Merge/Deploy, `git add` por caminho)
Novos: `src/domain/validacao-cadastro.ts`, `src/domain/validacao-cadastro.test.ts`, `src/server/auth/email-pendente.ts`, `src/server/auth/email-pendente.test.ts`, `src/server/actions/conta-acesso.ts`, este MD.
Editados: `src/server/actions/auth.ts`, `src/server/actions/account.ts`, `src/server/actions/account.test.ts`, `src/app/entrar/callback/route.ts`, `src/components/login/{LoginForm,RegisterForm,AvisoDoGoogleNoApp}.tsx`, `src/components/login/{FormulariosDeAcesso,AvisoDoGoogleNoApp}.test.ts`, `src/components/account/{ModalCadastro,AccountModals}.tsx`, `src/app/(app)/conta/configuracoes/page.tsx`, `src/styles/login.css`.
**Arquivos compartilhados com outros chats** (já estavam modificados antes de mim: `LoginForm.tsx`, `callback/route.ts`, `login.css`, `AvisoDoGoogleNoApp.*` do T6; `AccountModals.tsx` com mudanças de outro chat): meu diff convive com o deles, conferir o `git diff` antes de commitar.

## Ajuste pedido pelo Polimento (22/11)
- Pix aleatória: mensagem agora diz 36 caracteres, com hífens. Pix CPF: "CPF inválido: confira os 11 números." Reenvio: "Aguarde 1 minuto para pedir outro link." (`validacao-cadastro.ts`, `conta-acesso.ts`).

## Item a item com arquivo:linha (pedido da Auditoria, 22/11)
- **B02** — marca na criação `src/server/actions/auth.ts:202`; erro `email_not_confirmed` `auth.ts:85`; tira a marca no clique `src/app/entrar/callback/route.ts:193`; bloqueio do cadastro formal `src/server/actions/account.ts:521`; módulo `src/server/auth/email-pendente.ts`; selo real `src/app/(app)/conta/configuracoes/page.tsx` (`situacaoDoEmailDaConta`).
- **S01** — `src/server/actions/conta-acesso.ts:37` (senha) e `:60` (reenviar link); botões `src/components/login/LoginForm.tsx:99` (`pedirLink`) e `:203`.
- **B03** — `src/domain/validacao-cadastro.ts:70` (nascimento), `:94` (telefone), `:112` (Pix); no servidor `account.ts:538` e `:567`.
- **A16** — nome `validacao-cadastro.ts:30`, exibição `:49`; cadastro por e-mail `auth.ts:136`; rótulo "Nome de exibição" em `AccountModals.tsx`.
- **A04** — `configuracoes/page.tsx:56` (`erroAceites`) e `:376` (linha de erro com "Tentar de novo"); aceite estava gravado no banco.
- **A11** — `LoginForm.tsx:154`, já trocado por outro chat.
- **A05** — só levantado, nada codificado.

## Perguntas ao Gabriel
1. **B02:** bloquear a conta inteira até confirmar o e-mail, ou só depósito/compra/saque? (Aplicado, provisório: só depósito/compra/venda/saque.)
2. **A05:** alinhar a Política de Privacidade com o cadastro formal (endereço e Pix antes da 1ª compra) ou pedir menos na compra?
3. **Receita:** validar CPF e nome pela Receita (Datavalid/Consulta CPF) é serviço pago. Contratar? Hoje só há conferência dos dígitos.
4. Desligar o autoconfirm do Supabase (ver acima) e o destino das contas de teste do QA.

## Conferências pedidas
- `AvisoDoGoogleNoApp.test.ts`: já atualizado (o aviso cita "Esqueci minha senha", o teste deixou de proibir a palavra); vitest de `src/components/login` verde.
- `FormulariosDeAcesso.test.ts`: o erro "server-only em componente cliente" vinha de `LoginForm` importar `conta-acesso`; corrigido com `vi.mock('@/server/actions/conta-acesso')` nos dois testes; verde.
