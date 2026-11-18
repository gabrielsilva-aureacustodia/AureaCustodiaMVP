# MD DE EXECUÇÃO — Frente D · Cadastro: Google primeiro e demonstração

```
Projeto:    Real Olímpico (AUREA CUSTODIA LTDA)
Frente:     D · manut-cadastro-google          Onda de merge: 1          Migration: nenhuma
Itens do Rogério: 4 e 8            Prazo: 30/11/2026
Worktree:   C:\dev\AureaCustodiaMVP\.claude\worktrees\manut-cadastro-google-8d269f
Branch:     claude/manut-cadastro-google-8d269f        Base: 9e21fe1
Ficha:      C:\dev\AureaCustodiaMVP\docs\manutencao-2026-11\frentes\D-cadastro-google.md (fora do Git: ler por caminho absoluto)
Estado:     arquivo de trabalho LOCAL, sem commit até o fim (B1/B2)
```

## RETOMADA (quem abrir este arquivo começa aqui)

- **Estado (17/11, Execução):** CÓDIGO DA FRENTE FECHADO (T1 a T5 dentro do que a ordem do Controle permite). `/cadastrar` e `/entrar` com o Google primeiro e e-mail recolhido; bloco "Veja como se cadastrar" com os passos em texto e o vídeo plugável (constante `null`); 3 arquivos de teste novos verdes. **Não rodam nesta branch, por ordem do Controle (22:35 e 22:36): servidor local, preview, build, typecheck e suíte completa.** A conferência visual e o vídeo ficam em "AÇÕES PÓS-DEPLOY" (abaixo). A conferência 320/375/430 px e claro/escuro JÁ foi feita no servidor local, antes da ordem — ver o Log.
- **Próximo ato:** nenhum de código. Quem faz o merge e o deploy executa as AÇÕES PÓS-DEPLOY: conferir as telas em produção, gravar a demonstração em produção (sem conta, parando antes do consentimento do Google), publicar `public/demonstracao/cadastro.webm` e ligar `VIDEO_DA_DEMONSTRACAO` (segunda mudança pequena do Controle).
- **Git:** branch `claude/manut-cadastro-google-8d269f` sobre `9e21fe1`, 0 commits. Novos: `src/components/login/GoogleButton.tsx`, `EmailAlternativo.tsx`, `DemonstracaoDoCadastro.tsx`, `FormulariosDeAcesso.test.ts`, `src/app/cadastrar/pagina.test.ts`, `src/app/entrar/pagina.test.ts`, este MD. Editados: `RegisterForm.tsx`, `LoginForm.tsx`, `src/styles/login.css`, `src/app/cadastrar/README.md`, `src/app/entrar/README.md`. Nenhuma migration; nenhuma superfície protegida; `landing.css`, landing, `layout.tsx`, `domain/**` e `auth.ts` intactos.
- **Registro vivo:** `C:\dev\AureaCustodiaMVP\docs\manutencao-2026-11\registro\D.md` (se o hook barrar a escrita, vale `registro-D.md` na pasta de notas do Controle: `C:\Users\Gabriel\AppData\Local\Claude-Data\claude_pzs8sxrjxfjjc\side-session-notes\local_e259126b-4373-4132-9e89-79edb7fa94ec\`).

## Aceite (em uma frase)

Quem chega para se cadastrar vê **"Continuar com o Google"** como o caminho principal, o e-mail fica como alternativa recolhida, e existe uma demonstração do cadastro.

- [x] `/cadastrar` e `/entrar` mostram **"Continuar com o Google"** como ação principal (grande, no topo). E-mail e senha ficam atrás de **"Prefiro usar e-mail e senha"** (recolhido), **sem perder nenhum passo do fluxo atual** (nome, e-mail, senha, confirmação, arbitragem opcional, recuperação de senha, mensagem de confirmação, Pixel).
- [x] Botões de cadastro da landing apontam para `/cadastrar` → **CONFERIDO pelo chat de branch (17/11): sim** (`PublicHeader.tsx:61`, `PublicFooter.tsx:28`, `LandingPage.tsx:241/385/403/574`). D não edita a landing. Nada a anotar ao Controle.
- [x] Aceite de termos e dados legais **continuam obrigatórios** no caminho do Google (`registerWithGoogle` grava o aceite pendente; o callback o consome).
- [x] **Contrato D↔E:** OAuth fecha o ciclo **na mesma janela** (sem popup); registrar no registro o que o iPhone instalado exige.
- [~] **CÓDIGO PRONTO; o vídeo é pós-deploy.** **Demonstração (D6):** vídeo/GIF curto, gravado local, sem conta real em produção e sem dado de ninguém + bloco **"Veja como se cadastrar"** em `/cadastrar` (WebM/GIF até ~1,5 MB em `public/demonstracao/`, `<video>` mudo, sem autoplay com som, com legenda de texto).
- [x] Texto em português, marca Real Olímpico, **sem** token/NFT/cripto/ativo digital/investimento/rentabilidade. 320–430 px sem estouro, alvos de 44 px, claro e escuro.
- [~] Testes dos formulários e do redirect — **testes escritos e verdes** (vitest, 5 arquivos, 42 testes); **`npm run build` não roda aqui por ordem do Controle** (roda no deploy da Vercel).

## Ler (e só isto — E7/E11)

`src/app/cadastrar/` · `src/app/entrar/` (inclui `callback/route.ts`) · `src/components/login/*` (`AuthShell`, `LoginForm`, `RegisterForm`, `NovaSenhaForm`) · `src/server/actions/auth.ts` · `src/server/auth/` (`README.md`, `destino.ts`, `origin.ts`, `provisioning.ts`, `legal.ts`) · `docs/ENTREGA_AUTH_LANDING.md`, `docs/RELATORIO_FINAL_BRANCH_A_LOGIN_LANDING.md` · `src/components/tutorial/README.md`, `docs/EXECUCAO_TUTORIAL_ONBOARDING.md` (para a demonstração) · CSS de login (`src/styles/login.css`; as classes `.register-card`, `.auth-divider`, `.auth-google`, `.auth-gate` hoje moram em `src/styles/landing.css`, linhas ~867–889).

## Touch

`src/components/login/**` · `src/app/entrar/**`, `src/app/cadastrar/**` · **CSS novo de login** (em `src/styles/login.css` ou arquivo novo `src/styles/auth-google.css`; ver decisão D-T2 abaixo) · `public/demonstracao/**` (novo) · testes novos dos formulários.

## Do not touch

`src/components/landing/**` e `src/app/page.tsx` (frente M) · `src/app/layout.tsx` e PWA (frente E) · lógica de servidor de `src/server/actions/auth.ts` além do mínimo para o fluxo novo · `src/styles/landing.css` (não é de D; se a classe antiga atrapalhar, sobrescrever no CSS novo, nunca editar lá) · `src/domain/**` · superfície protegida (nenhuma esperada).

## Fora de escopo

Novo provedor (Apple, Facebook), mudar regra de termos, tutorial do app logado, qualquer lógica de cobrança.

## T1 — O que existe hoje (verificado em 17/11/2026) e o desenho

**Fluxo atual:**

| Tela | Hoje | Onde |
|---|---|---|
| `/cadastrar` | Formulário completo (nome, e-mail, senha, confirmação, caixa opcional de arbitragem, texto "Ao criar sua conta, você declara ter lido…") → botão dourado "Criar conta por e-mail" → divisor "ou" → botão **secundário** (`btn-outline auth-google`) "Continuar com Google". Cadastro fechado (`registration.enabled=false`) mostra o bloco `.auth-gate` e desabilita tudo. | `RegisterForm.tsx` |
| `/entrar` | Campo e-mail + senha (com olho) → "Entrar" dourado → "ou" → "Entrar com Google" secundário. Rodapé "Ainda não tem conta? Criar conta". Recuperação de senha tem tela própria (`/entrar/nova-senha`; o pedido do link mora na ação `auth.ts`). | `LoginForm.tsx` |
| Google | `registerWithGoogle()` (grava aceite pendente via `setPendingLegalAcceptance`, `prompt: 'consent'`) e `loginWithGoogle(destino)`; ambos devolvem a URL e o cliente faz `window.location.assign(url)` → **mesma janela, sem popup**. Volta por `/entrar/callback`, que registra o aceite (`consumePendingLegalAcceptance` → `registrarAceitesFormais('cadastro_google')`), provisiona e manda para `/inicio` (ou `/admin`). | `src/server/actions/auth.ts`, `entrar/callback/route.ts` |
| Meta (Pixel) | e-mail: `rastrearPadrao('CompleteRegistration', …)` no cliente + CAPI no servidor com o mesmo ID; Google: evento sai do callback (servidor). **Não mexer.** | `RegisterForm.tsx`, `server/meta/cadastro.ts` |
| Landing | Todos os CTAs já apontam para `/cadastrar` | `components/landing/*` |

**Desenho (rascunho em texto):**

```
/cadastrar                                   /entrar
┌───────────────────────────────┐            ┌───────────────────────────────┐
│ Criar conta                    │            │ Acessar plataforma            │
│ Leva menos de um minuto.       │            │                               │
│                                │            │ [G  Entrar com o Google]  ← principal (grande, 52px, topo)
│ [G  Continuar com o Google]    │ ← principal│                               │
│  Ao continuar, você declara ter│            │ ▸ Prefiro usar e-mail e senha │ ← <details> recolhido
│  lido os Termos, a Política e  │            │    (e-mail, senha, olho,      │
│  a Tabela de Taxas.            │            │     "Entrar", esqueci a senha)│
│                                │            │                               │
│ ▸ Prefiro usar e-mail e senha  │ ← recolhido│ Ainda não tem conta? Criar conta
│    (formulário atual inteiro,  │            └───────────────────────────────┘
│     com arbitragem opcional e  │
│     o mesmo texto legal)       │
│                                │
│ ▶ Veja como se cadastrar       │ ← bloco da demonstração (T4), recolhido ou logo abaixo
│ Já tem conta? Entrar           │
└───────────────────────────────┘
```

Regras do desenho:
1. **O Google é o primeiro foco** (autoFocus não; só ordem e peso visual). Botão `btn btn-gold` grande, com o "G" em SVG inline (sem imagem externa), ícone `aria-hidden`, texto "Continuar com o Google" no cadastro e "Entrar com o Google" na entrada.
2. **O e-mail e senha ficam num `<details>`** ("Prefiro usar e-mail e senha"). Aberto por padrão **só quando houver erro vindo do servidor** (`initialError`) ou quando o cadastro por e-mail falhar, para a mensagem não ficar escondida. Nenhum campo, validação, `minLength`, `autoComplete`, ID de teste ou chamada de ação some.
3. **Aceite legal:** a declaração "Ao criar sua conta/continuar, você declara ter lido e concordado com os Termos de Uso, a Política de Privacidade e a Tabela de Taxas" fica **visível junto do botão do Google** (hoje só aparece dentro do formulário de e-mail, e o botão do Google ficava logo abaixo dela). A caixa opcional de arbitragem continua só no caminho de e-mail (hoje o Google também não a oferece: **não mudar essa regra**, anotar como observação).
4. **Cadastro fechado** (`registration.enabled=false`): mantém o `.auth-gate` e desabilita os botões, inclusive o do Google, exatamente como hoje.
5. **`/entrar`:** recolhe e-mail/senha atrás do mesmo `<details>`; o link "Esqueci minha senha" (se existir hoje na tela) fica **dentro** do bloco recolhido. Mensagens de erro/aviso (`conta desativada`, `callback`, `conta-pendente`) continuam fora do `<details>`, sempre visíveis.
6. **Teclado/leitor de tela:** `<details>`/`<summary>` nativo (sem JS), `summary` com alvo mínimo de 44 px, foco visível, `aria-live` do feedback preservado fora do `<details>`.

**Decisão D-T2 (CSS):** as classes `.auth-google`, `.auth-divider`, `.register-card` estão em `landing.css` (fora do Touch). A Execução **não edita `landing.css`**: acrescenta as regras novas (`.auth-primary`, `.auth-alt`, `.auth-alt summary`, ícone do Google, bloco `.auth-demo`) em `src/styles/login.css` (CSS de login, dentro do Touch) com seletor mais específico quando precisar vencer a regra antiga. Conferir no navegador que `responsive.css` continua sendo o último import de `globals.css`.

## Contrato D↔E — o que o iPhone instalado exige (T3, para registrar)

Fato do código: os dois botões chamam `window.location.assign(redirectTo)`; não há `window.open`, popup nem `skipBrowserRedirect: false` — o ciclo é de **uma janela só**, e o retorno é por `/entrar/callback` (rota do servidor, que troca `code` por sessão com PKCE e grava o cookie de sessão). O que a D **não consegue provar sem aparelho**: se o navegador interno do app instalado no iPhone preserva (a) o cookie do verificador PKCE e do aceite legal pendente entre a ida ao Google e a volta e (b) o cookie de sessão. A **E** testa no iPhone real e devolve o que quebrar; a D só mexe no que for tela/botão. Anotar também: `AUREA_SITE_URL`/origem do callback precisa ser a mesma origem do app instalado (`origin.ts`); o escopo do PWA (`manifest`) precisa cobrir `/entrar/callback`, senão o retorno abre fora do app (item da E).

### Contrato D↔E recebido da frente E (17/11/2026)

Fonte: `C:\dev\AureaCustodiaMVP\.claude\worktrees\manut-pwa-iphone-eb49d6\docs\pwa\DIAGNOSTICO_PWA.md`, seção "Contrato D↔E". A E só leu o código; o que o iOS faz só um aparelho real prova. Regras que valem para a D:

1. **A forma do fluxo do Google não muda:** redirecionamento na MESMA janela (`window.location.assign`); verificador do PKCE, destino pós-login e aceite pendente em **cookies**. Nada de popup, `signInWithPopup`, `localStorage` ou `sessionStorage` (o iOS só copia cookies ao instalar). O código da D respeita isso, e o teste `FormulariosDeAcesso.test.ts` trava a ausência de `window.open`.
2. **O Google não é o único caminho:** e-mail e senha continua no `<details>` "Prefiro usar e-mail e senha". Quem criou a conta só pelo Google não tem senha, e **`/entrar` não tem "esqueci minha senha"** (já era assim; só o painel da equipe envia o link, `src/server/admin/usuarios.ts`). Fora do escopo da D: o chat de branch leva ao Controle e ao Gabriel.
3. O que o iPhone instalado faz ao sair do escopo para `accounts.google.com` (folha do Safari com cookie próprio ou compartilhado) só o aparelho diz; a E testa depois do deploy. Risco secundário: o callback pode receber dois pedidos com o mesmo código e mostrar `erro=callback` mesmo com a sessão aberta.
4. **DECISÃO PENDENTE DEPOIS DO TESTE NO APARELHO (do Gabriel; a D NÃO faz nada agora):** se aparecer o erro `exchangeCode` no callback, o conserto é (a) esconder o botão do Google em modo app (`lerStandalone()` em `src/lib/pwa/navegador.ts`) e explicar "entre com e-mail e senha", ou (b) guardar o verificador no servidor, e não em cookie. Se o erro for só o do risco secundário, o ajuste é pequeno no callback (sessão válida existente → seguir para o destino).

## AÇÕES PÓS-DEPLOY (quem faz o merge e o deploy; nada disto roda na branch)

Ordem do Controle (17/11, 22:35 e 22:36; o Gabriel proibiu servidor local e container): sem `next dev`, `next build`, preview, Playwright, typecheck nem suíte completa nesta frente.

1. **Conferência visual em produção**, em `/cadastrar` e `/entrar`, a 320, 375 e 430 px e no desktop, tema claro e escuro (o tema vem de `localStorage` `aurea-theme`). O que olhar: botão do Google numa linha só e com 56 px de alto em 320 px; `<details>` fechado por padrão; `/entrar?erro=callback&motivo=teste` abre o bloco e mostra o erro sob o Google; `/cadastrar` mostra os 4 passos antes do "Já tem conta?"; nenhum estouro horizontal. **Não enviar o formulário e não ir além da escolha de conta do Google.**
2. **Gravar a demonstração em produção** (opção a do Controle): página pública `/cadastrar`, sem conta, nome e e-mail fictícios só nos campos recolhidos, sem enviar, parando ANTES da tela de consentimento do Google. O roteiro são os 4 passos do bloco. Entregar WebM (mudo, até ~1,5 MB) e o MP4 para o WhatsApp em `C:\dev\AureaCustodiaMVP\docs\manutencao-2026-11\entregas\` (fora do Git).
3. **Publicar o arquivo** em `public/demonstracao/cadastro.webm` e **ligar a constante** `VIDEO_DA_DEMONSTRACAO` em `src/components/login/DemonstracaoDoCadastro.tsx` (`{ src: '/demonstracao/cadastro.webm', tipo: 'video/webm' }`). O teste da frente falha se o arquivo não existir ou passar de ~1,6 MB. É a segunda mudança pequena do Controle.
4. **Build e testes completos** (`npm run build`, `npm test`): rodam no pipeline do deploy / pelo Controle, não aqui.
5. **iPhone instalado** (frente E, roteiro passos 5 e 7): confirmar que o ciclo do Google fecha no app; se der `exchangeCode`, ver a decisão pendente do item 4 do contrato acima.

## Tópicos

| T | O quê | Aceite do tópico | Estado |
|---|---|---|---|
| T1 | Ler o fluxo atual e desenhar a tela | desenho no MD | **FEITO** (chat de branch, 17/11) |
| T2 | Tela de cadastro e de entrada com Google primeiro | navegador local, 320–430 px e desktop, claro e escuro | **FEITO** (Execução, 17/11). Feito: botão do Google grande no topo (`GoogleButton.tsx`), declaração legal sob ele em `/cadastrar`, e-mail e senha recolhidos (`EmailAlternativo.tsx`, `<details>` aberto só com `initialError`), avisos em duas regiões `aria-live`, CSS em `login.css`. Não feito: nada. Observação: o botão "Criar conta por e-mail"/"Entrar" virou `btn-outline` (uma ação dourada por tela, Brandbook §9.1). |
| T3 | Ciclo OAuth na mesma janela + registro do que o iPhone exige | anotado no registro para a E | **FEITO** (Execução, 17/11); contrato da E recebido (ver "Contrato D↔E recebido da frente E" acima): sem `window.open`/popup/`skipBrowserRedirect` em `components/login`, `auth.ts`, `entrar`, `cadastrar`; clique real no Google em `/entrar` levou a MESMA aba (única) a `accounts.google.com`; parei ali. O que o iPhone instalado exige continua sendo o texto "Contrato D↔E" acima — a E testa no aparelho. |
| T4 | Demonstração + bloco "Veja como se cadastrar" | bloco sem `<video>` quebrado; vídeo plugável | **FECHADO no lado da Execução, com a constante em `null` (só a legenda)** (Execução, 17/11). Vídeo, conferência visual 320/375/430 px (claro/escuro) e troca da constante estão em "AÇÕES PÓS-DEPLOY". `DemonstracaoDoCadastro.tsx` (4 passos numerados em texto; `<video muted playsInline controls preload="metadata">` sem autoplay, só quando `VIDEO_DA_DEMONSTRACAO` não é `null`), encaixado em `RegisterForm.tsx` antes do "Já tem conta?", CSS `.auth-demo*` em `login.css`. A constante vai em `null`: o arquivo `public/demonstracao/cadastro.webm` NÃO é criado nem esperado (decisão do Controle, opção a); gravar, publicar e ligar é pós-deploy. |
| T5 | Testes e build | testes dos formulários e do redirect | **FECHADO — testes da frente verdes (5 arquivos, 42 testes); suíte inteira e build no merge, pelo Controle** (Execução, 17/11). Verde: `npx vitest run src/components/login src/app/cadastrar src/app/entrar` (5 arquivos, 42 testes: 3 novos + `callback/route.test.ts` e `sair/route.test.ts`), rodado ANTES da ordem de não subir nada pesado; `npx eslint` dos arquivos da frente (0 achados) e `npx tsc --noEmit` (0 erros), também antes da ordem, uma vez cada. **Não rodados aqui, por ordem do Controle (alerta de memória):** `npm test` (suíte inteira) e `npm run build`, que o Controle roda no merge; também nada de `tsc`/`eslint` completos daqui em diante, só `vitest` de um arquivo se for preciso. O clique no Google (ação + `location.assign`) não tem teste automático: a suíte roda sem DOM e adicionar jsdom seria decisão de dependência; ficou conferido no navegador local e travado por leitura do código. |

### Detalhe por tópico

**T2 — arquivos:** `src/components/login/RegisterForm.tsx`, `LoginForm.tsx`, (novo) `src/components/login/GoogleButton.tsx` e `EmailAlternativo.tsx` se ajudar a não duplicar o `<details>`; `src/styles/login.css`. Não altera `src/server/actions/auth.ts`. Testar tela logada não se aplica; as telas são públicas (o servidor só exige que não haja sessão). Conferir em 320, 375, 430 px e desktop, claro e escuro.

**T3 — arquivos:** nenhum de código (só conferência). Saída: bloco "Contrato D↔E" do registro preenchido com o resultado.

**T4 — arquivos:** `public/demonstracao/*` (WebM ou GIF ≤ ~1,5 MB + poster), componente novo `src/components/login/DemonstracaoDoCadastro.tsx` (`<video muted playsInline controls preload="metadata" poster>` **sem autoplay com som**; legenda de texto numerada ao lado, para quem não puder ver o vídeo), encaixe em `RegisterForm.tsx`. **Quem grava é o ESPECÍFICO**, no navegador local, parando **antes** da tela de consentimento do Google, **sem criar conta real** e sem dado de ninguém (usar nome/e-mail fictícios só no formulário recolhido, sem enviar); entrega também o MP4 para WhatsApp em `C:\dev\AureaCustodiaMVP\docs\manutencao-2026-11\entregas\` (fora do Git). Se o vídeo ainda não existir, o bloco entra com a legenda em texto e o vídeo plugável por constante.

**T5 — testes:** testes de componente dos dois formulários (Google primeiro no DOM; `<details>` recolhido por padrão e aberto com erro; clique no Google chama `registerWithGoogle`/`loginWithGoogle` e faz `location.assign`; cadastro fechado desabilita o Google; o formulário de e-mail ainda chama `registerWithEmail`/`login` com os mesmos argumentos). Redirect: `/cadastrar` e `/entrar` mandam para `/inicio` com sessão (já cobre `destino.test.ts`/páginas? conferir; se não, teste novo). Seguir o padrão dos testes que já existem em `src/components`/`src/app` (a Execução acha o padrão com uma busca).

## Regras de convivência

- Nenhum commit, nenhum `.env.local` ou segredo em staged (B1/E-regras). Nada de lint/typecheck/suíte por arquivo; testes da branch só ao fim (T5) ou de um tópico grande.
- Dado de produção: só leitura, `BEGIN READ ONLY`. Esta frente não precisa ler produção.
- Nunca criar conta real em produção para gravar a demonstração.
- Decisão de segurança (limites de tentativa, captcha, TOTP) **não é desta frente**.
- Palavras proibidas pelo jurídico em texto novo: token, NFT, cripto, ativo digital, investimento, rentabilidade.

## Decisão pendente do Gabriel

**D6:** vídeo curto **e** bloco no site (padrão adotado). Se ele quiser só um, remove-se o outro numa linha.

## Superfície protegida tocada

Nenhuma até agora.

## Sessões

| Papel | Nome | Sessão |
|---|---|---|
| Chat de branch | manut-d | (esta sessão) |
| Execução | manut-d-exec | local_77b11067-821d-4e9e-bdc0-1d159d8b8a24 (aberta 17/11) |
| Auditoria | manut-d-audit | local_a4fe964d-808b-4eac-bcc2-03cf834e3fbe (aberta 17/11; rotina de 3 min) |
| Específico | manut-d-esp | a abrir pelo chat de branch quando o T2 fechar (grava a demonstração em T4; precisa da tela nova no ar) |

## Log

- 2026-11-17 — chat de branch: passo 0 feito, ficha e arquivos "Ler" lidos, T1 desenhado, MD escrito. Landing conferida: todos os CTAs já apontam para `/cadastrar`.
- 2026-11-17 — Execução, T2: criados `GoogleButton.tsx` e `EmailAlternativo.tsx`; `RegisterForm.tsx` e `LoginForm.tsx` reorganizados (Google no topo, e-mail recolhido; IDs, `required`, `minLength`, `autoComplete`, validações, arbitragem, Pixel e mensagens intactos); CSS novo no fim de `login.css` com prefixo `.pub-auth` (login.css é importado ANTES de landing.css; landing.css não foi tocado). `.pub-auth .register-card` passou de 720 para 520 px (botão esticado em 720 ficava desproporcional) — decisão visual minha, fácil de reverter numa linha. Medidas: 320 px = botão de 56 px de alto, rótulo em uma linha (foi preciso reduzir o enchimento do cartão a 16 px abaixo de 400 px); 375 e 430 px sem estouro horizontal; sem alvo menor que 44 px (o olho de senha mede 40 px, com área de toque de 44 px por `::before`, regra que já existia). `/entrar?erro=callback` abre o bloco de e-mail e mostra o erro sob o Google. Claro e escuro conferidos (tema vem de `localStorage` `aurea-theme`).
- 2026-11-17 — Execução, ambiente: a máquina chegou a 1,3 GB livres e o `next dev` caiu duas vezes com `ERR_MEMORY_ALLOCATION_FAILED` na primeira compilação; subi de novo, um servidor só, e o encerro ao fim de cada verificação.
- 2026-11-17 — Execução, T3: clique no Google em `/entrar` com espião em `window.open`: a aba única foi para `accounts.google.com` ("Fazer login nas Contas do Google"), sem aba nova. Parei antes de qualquer escolha de conta. Voltei a aba para o localhost.
- 2026-11-17 — Execução, T4: aviso ao chat de branch para abrir o ESPECÍFICO (roteiro: Google visível, abrir e-mail e senha, nome/e-mail fictícios sem enviar, parar antes do consentimento do Google). Nome do arquivo combinado: `public/demonstracao/cadastro.webm`.
- 2026-11-17 — Execução, T4 (código): `DemonstracaoDoCadastro.tsx` criado e encaixado; bloco conferido em desktop e 320 px (4 passos, sem estouro). Vídeo ainda não existe: constante em `null`, bloco mostra só os passos.
- 2026-11-17 — Execução, T5 (parcial): testes novos em `src/components/login/FormulariosDeAcesso.test.ts` (ordem Google → declaração → e-mail recolhido, `<details>` fechado/aberto com erro, campos e IDs de sempre, cadastro fechado desabilita tudo, sem `window.open`, bloco da demonstração, sem palavra proibida no texto novo), `src/app/cadastrar/pagina.test.ts` e `src/app/entrar/pagina.test.ts` (redirect para `/inicio` com sessão e os avisos da URL). Vitest roda com `environment: 'node'` e `include: src/**/*.test.ts` — por isso `.test.ts` e `renderToStaticMarkup`, no padrão de `EntradaDoPainel.test.ts`. READMEs de `/cadastrar` e `/entrar` atualizados.
- 2026-11-17 — Execução: aviso ao chat de branch de que o código do T4 está pronto e de que a Execução fecha quando o `cadastro.webm` chegar.
- 2026-11-17 22:3x–22:4x — Execução, ORDEM DO CONTROLE: li as mensagens do chat de branch (Específico suspenso; sem servidor/preview/build/typecheck/suíte completa; vídeo em produção depois do deploy; contrato D↔E da frente E) e a do Controle (encerrou o meu `next dev` de 22:35 e o de 22:36). Fato para a Auditoria e o Gabriel: a conferência 320/375/430 px e desktop, claro e escuro, de `/cadastrar` e `/entrar` (inclusive o clique no Google até `accounts.google.com`, sem popup) foi feita no servidor local ANTES de eu ler a ordem — as mensagens só chegaram na minha fila depois; quando chegaram, não subi mais nada. Também ANTES da ordem rodei uma vez `eslint` dos arquivos da frente (0 achados), `tsc --noEmit` (0 erros) e o vitest dos 5 arquivos (42 verdes). Verifiquei depois: nenhum processo node/npm da worktree em execução e a porta 3000 livre.
- 2026-11-17 — Execução: constante do vídeo documentada no código (caminho `/demonstracao/cadastro.webm`, quem liga e quando); seção "AÇÕES PÓS-DEPLOY" criada; contrato D↔E da E transcrito; o aceite do vídeo saiu da lista da Execução e foi para o pós-deploy.
