# E1 · Portas de entrada da conta

```
Branch:               exec/e1-portas-de-entrada-da-conta
Base:                 origin/main que contém docs/execucao-pendencias/00_PLANO_MESTRE.md — o commit de base
                      (documentos desta pasta, bloco oxc (JSX) em vitest.config.mts, o teste
                      src/components/admin/entrada/EntradaDoPainel.test.ts e as seções sem trava do RA-01)
                      é feito pelo integrador ANTES de este prompt ser enviado
Base da suíte:        86 arquivos de teste, 741 testes passando e 1 pulado
Worktree sugerido:    C:\dev\AureaCustodiaMVP-e1
Porta local:          3101 (npm run dev -- -p 3101). Nunca a 3000, que é a da pasta principal do Gabriel
Pendências de origem: P-C2-04, P-C2-05, P-C2-09 (docs/finalizacoes/PENDENCIAS_AGENTE_C.md)
                      RA-43 (parte do link de redefinição) e RA-44 (RISCOS_ASSUMIDOS.md)
RA reservados:        RA-49 (conta desativada: o que ainda passa) · RA-50 (nova senha sem a atual)
Migration:            nenhuma. A 026 reservada NÃO é usada (a coluna users.settings já é jsonb): não criar
                      arquivo; `npm run db:check` continua terminando em 025; dizer no relatório que a 026 ficou livre.
Relatório de saída:   docs/execucao-pendencias/relatorios/E1.md
```

> Revisado em 15/09/2026 contra a crítica de sobreposição (docs/execucao-pendencias/00_PLANO_MESTRE.md).

> **Para o Rogério.** Hoje, quando a equipe desativa a conta de alguém pelo painel, a pessoa não
> consegue mais entrar pelo login comum, mas três portas continuam abertas: as contas de demonstração,
> quem já estava com o site aberto (o acesso dura até sete dias) e quem entra pelo Google ou por link de
> e-mail. Esta branch fecha as três: a conta desativada é recusada com a frase "Esta conta está
> desativada. Fale com o atendimento." e quem estava dentro é levado para fora em até dez segundos.
> Também passa a funcionar o botão "Enviar link de redefinição" da ficha do cliente: o link abre uma tela
> para escolher a senha nova, sem pedir a antiga que a pessoa esqueceu. E um terceiro conserto, invisível:
> o registro de que o cliente aceitou os Termos passa a ficar guardado no banco de verdade, em vez de
> sumir na primeira gravação. Ninguém da equipe é afetado: conta da equipe nunca é tratada como
> desativada, e se o banco falhar, a pessoa entra.

---

## Regras de eficiência ([docs/Regras_eficiencia_de_sessao_v1.md](../Regras_eficiencia_de_sessao_v1.md)) — prevalecem sobre o resto deste documento

- **Leia só:** este documento, `00_PLANO_MESTRE.md` e os arquivos citados em "O que o código faz hoje"
  e "Território". Não releia o repositório para confirmar o que o documento já diz.
- **Prioridade:** as Tarefas na ordem numérica (1 → 8). Feature funcionando e commitada primeiro;
  melhoria e acabamento só depois, se sobrar.
- **MD de execução:** crie `relatorios/E1_EXECUCAO.md` na primeira ação e acrescente uma linha a cada
  tarefa fechada (o que fez, arquivos, o que falta). Se a execução passar para outro agente, ele parte daí.
- **Verificação:** typecheck, lint, suíte e build só no fim da branch (ou no fim de um bloco grande de
  tarefas), nunca a cada escrita. A tarefa 0 não roda a suíte para "medir a base": a contagem está no
  plano mestre.
- **Commits:** em blocos funcionais, não a cada edição.

---

## Objetivo final — pronto quando

1. `npm run typecheck`, `npm run lint`, `npm test` e `npm run build` verdes no worktree da E1, com o
   servidor de desenvolvimento **deste** worktree parado. O resumo do `npm test` mostra **92 arquivos de
   teste** (os 86 da base mais os seis novos da E1) e pelo menos **777 testes passando** (741 da base mais
   os 36 casos listados em "Testes exigidos") e 1 pulado. Se faltar arquivo na contagem, é worker do Vitest
   que morreu (o `aceite-nas-preferencias.test.ts` sobe uma instância nova de PGlite): rodar o arquivo que
   sumiu sozinho com `npx vitest run <arquivo>` e registrar as duas saídas no relatório.
2. `login()` recusa conta desativada com `Esta conta está desativada. Fale com o atendimento.` nas duas
   portas (catálogo e Supabase), sem chamar `setSession` — provado em `src/server/actions/auth.test.ts`.
3. O callback manda conta desativada para `/entrar?status=conta-desativada` sem abrir sessão; manda o
   link de recuperação (`type=recovery`) para `/entrar/nova-senha`; e o login comum começado em
   `/painel` continua voltando para `/admin` — provado em `src/app/entrar/callback/route.test.ts`.
4. `GET /entrar/sair` apaga a sessão e, para conta desativada, leva ao aviso — provado em
   `src/app/entrar/sair/route.test.ts`. Com `npm run dev -- -p 3101` rodando, sem cookie nenhum:
   ```powershell
   curl.exe -s -o NUL -w "%{http_code} %{redirect_url}`n" http://localhost:3101/entrar/sair
   ```
   imprime `307 http://localhost:3101/entrar`.
5. `GET /api/state` responde **401** para sessão de conta desativada e não lê o estado — provado em
   `src/app/api/state/conta-desativada.test.ts`. O `AppProvider` trata o 401 com
   `window.location.assign('/entrar/sair')`, e esse endereço é o mesmo de `SAIDA_DA_CONTA_DESATIVADA` —
   provado em `src/server/auth/conta-desativada.test.ts`.
6. `/entrar/nova-senha` sem sessão manda para `/entrar`:
   ```powershell
   curl.exe -s -o NUL -w "%{http_code} %{redirect_url}`n" http://localhost:3101/entrar/nova-senha
   ```
   imprime `307 http://localhost:3101/entrar`.
7. `/entrar?status=conta-desativada` mostra a frase de conta desativada. A conferência usa um trecho
   **sem acento** e junta as linhas antes do `-match` (no PowerShell 5.1, `curl.exe` devolve um array de
   linhas e o acento chega corrompido pela codificação do console, o que faria o teste falhar à toa):
   ```powershell
   ((curl.exe -s "http://localhost:3101/entrar?status=conta-desativada") -join "`n") -match 'Fale com o atendimento'
   ```
   imprime `True`.
8. `settings.legalAcceptance` sobrevive à ida e volta no Postgres e **não** gera atualização falsa a cada
   gravação — provado em `src/server/db/aceite-nas-preferencias.test.ts` (PGlite).
9. `RISCOS_ASSUMIDOS.md` tem RA-44 marcado como pago (✅), RA-43 com a tela de nova senha paga, e as
   entradas novas RA-49 e RA-50, no índice e em seção própria; os `ATALHOS.md` citados na tarefa 7 têm as
   mesmas notas.
10. `docs/execucao-pendencias/relatorios/E1.md` existe e termina com a linha
    `E1 pronta para integração — <hash do último commit>`.

---

## O que o código faz hoje

Conferido em `40bb8c8`, em 15/09/2026. A branch parte de `origin/main` que contém
`docs/execucao-pendencias/00_PLANO_MESTRE.md` (commit de base do integrador, mais novo que `40bb8c8`).

### P-C2-04 — conta desativada nas portas de entrada

**A pergunta já existe.** `contaDesativada(email)` em `src/server/admin/situacao.ts:30-41` lê a linha mais
recente de `aurea.admin_situacao_contas` (índice `admin_situacao_contas_idx (user_email, id)`, migration
023). Responde `false` sem e-mail, sem banco (`:31`), com o banco falhando (`:37-40`) e para quem abre o
painel (`:36`, via `podeAbrirPainelAdmin`). Testada em `src/server/admin/situacao.test.ts`. **Ninguém a
chama fora do painel** (`git grep -n contaDesativada -- src` só acha o próprio arquivo e o teste).

**Porta 1 — login pelo catálogo** (`src/server/actions/auth.ts:56-85`). `loginDoCatalogoLocal` confere a
senha (`:62-63`), grava `lastAccess` com `mutateState` (`:65-81`) e chama `setSession(email)` (`:83`). Não
pergunta a situação da conta.

> Observação que muda a conferência, não o código: as contas de `ACCOUNTS` são equipe pelo bootstrap
> quando `AUREA_ADMIN_EMAILS` não está definida (`src/domain/admin/permissoes.ts:195-207`), e o painel
> recusa desativar conta da equipe (`src/server/admin/usuarios.ts:362`). Nesse ambiente a checagem do
> catálogo nunca dispara — continua certa, mas o teste automatizado é quem a prova.

**Porta 2 — login pelo Supabase** (`auth.ts:101-128`). `signInWithPassword` (`:103`); qualquer erro vira
`CREDENCIAIS_INVALIDAS` (`:108`), inclusive o da identidade bloqueada pelo painel (`ban_duration`,
`src/server/admin/identidade.ts:113-116`), cujo `error.code` é `user_banned`. Depois provisiona (`:113-119`)
e chama `setSession` (`:121`). Sem `SUPABASE_SERVICE_ROLE_KEY` o painel não bloqueia a identidade — só
registra a situação — e a pessoa entra normalmente.

**Porta 3 — callback** (`src/app/entrar/callback/route.ts`). Troca `code`, `token_hash`/`token` ou a
sessão no fragmento por uma identidade (`:92-115`), registra aceite do Google (`:121-145`), provisiona
(`:147-150`), chama `setSession` (`:152`) e redireciona para `consumirDestinoDoLogin()` (`:154`) — `/admin`
quando o login começou em `/painel`, senão `/inicio` (`src/server/auth/destino.ts:46-51`). Erro vindo do
Supabase na query (`?error_description=User is banned`) cai em `falha()` (`:87-88`, `:40-45`) com o texto
em inglês. As falhas **não** consomem o cookie de destino.

**Porta 4 — sessão já aberta.** O cookie `aurea_session` vale 7 dias (`src/server/session.ts:35`).
- O casco `src/app/(app)/layout.tsx:49-57` confere só se há sessão e se o usuário existe no estado.
  Server Component **não pode apagar cookie** (`session.ts:128-129`).
- `/entrar` (`src/app/entrar/page.tsx:51-55`) e `/` (`src/app/page.tsx`) mandam quem tem sessão para
  `/inicio`. Um `redirect('/entrar')` do casco para conta desativada viraria laço `/inicio` ↔ `/entrar`.
- **Navegação dentro do app não reexecuta o layout** (App Router mantém o layout montado — o próprio
  comentário do layout, `:12-17`, diz isso). Quem alcança a aba aberta é o ciclo de 10 s:
  `GET /api/state` (`src/app/api/state/route.ts:40-46`) responde 401 só sem sessão, e o `AppProvider`
  reage ao 401 com `router.replace('/')` (`src/components/providers/AppProvider.tsx:213-215`).
- Não há `middleware.ts`.

### P-C2-05 — tela de nova senha no link de recuperação

- "Enviar link de redefinição" chama `resetPasswordForEmail(email, { redirectTo })`
  (`src/server/admin/identidade.ts:118-122`) com `redirectTo = authCallbackUrl()`
  (`src/server/actions/admin/usuarios.ts:129`, `src/server/auth/origin.ts:13-25`) — endereço que já está
  na lista de redirecionamento do Supabase, porque o cadastro usa o mesmo.
- O cliente de lá é `createClient` do supabase-js (`identidade.ts:75`), cujo fluxo padrão é **implícito**
  (`node_modules/@supabase/auth-js/dist/module/GoTrueClient.js:21`, `flowType: 'implicit'`). O link do
  e-mail, portanto, volta ao callback com a sessão no **fragmento**, que inclui `type=recovery`
  (o próprio auth-js lê esse campo para emitir `PASSWORD_RECOVERY`, `GoTrueClient.js:416`). A página de
  `route.ts:57-74` copia o fragmento para a query; o callback cai no ramo de `setSession` (`:96-102`).
- O callback **ignora** `type=recovery`: autentica e manda para `/inicio` (ou `/admin`). A troca em Minha
  conta (`src/server/actions/account.ts:113-131`) exige a senha atual via `signInWithPassword`.
- Não existe "Esqueci minha senha" em `/entrar` — fora do escopo; não criar.
- Conta do catálogo não recebe link: o painel recusa (`src/server/admin/usuarios.ts:429-431`).

### P-C2-09 — `settings.legalAcceptance` some na gravação do Postgres

- `normalizarUser` (`src/server/db/diff.ts:81-125`) monta `settings` só com `twoFA`, `notifEnvios`,
  `notifNegociacoes`, `notifNovidades` (`:88-95`). O diff compara pelo JSON normalizado (`:390`), então
  gravar `legalAcceptance` numa conta que já tinha preferências **não gera operação nenhuma**; numa conta
  sem preferências, grava as quatro e perde o aceite.
- A escrita e a leitura do repositório não são o problema: `users.settings` é `jsonb`
  (`src/server/db/repositories/users.ts:99`, `:122`, `:140`) e a carga devolve o objeto inteiro
  (`src/server/db/repositories/state.ts:88`). **Não precisa de migration.**
- O tipo já aceita o campo: `UserSettings` é declarado duas vezes em `src/domain/types.ts` (`:102-107` e
  `:646-648`, com `legalAcceptance?: LegalBlockAcceptance`). **Não mexer em `types.ts`.**
- Quem grava: `registrarAceiteLegal` (`src/server/auth/legal.ts:200-219`) e `registrarAceitesFormais`
  (`src/server/documentos/aceites.ts:137-150`). Quem lê hoje: a ficha do usuário
  (`src/server/admin/ficha.ts:279`, "aceite antigo"), `obterStatusAceiteLegal` (`legal.ts:146-166`) e a
  faixa da topbar **só sem banco** (`src/components/shell/Topbar.tsx:176`). Impacto atual pequeno, mas o
  dado some — e a ficha mostra "Sem aceite registrado" para quem aceitou.
- Cuidado: o Postgres reordena chaves de `jsonb`. A normalização precisa **reconstruir** o objeto em
  ordem fixa (nada de espalhar `...u.settings`), senão toda gravação vira `user.atualizar` e enche
  `audit_log` de `conta.atualizar`.
- O comentário da migration `023_notas_e_atribuicoes.sql:16-21` descreve a limitação antiga. Migration
  aplicada não se edita; a correção fica registrada no README de `src/server/db/`.

---

## Tarefas

### 0. Preparar o worktree e medir a base

```powershell
git -C C:\dev\AureaCustodiaMVP fetch origin
git -C C:\dev\AureaCustodiaMVP worktree add C:\dev\AureaCustodiaMVP-e1 -b exec/e1-portas-de-entrada-da-conta origin/main
Set-Location C:\dev\AureaCustodiaMVP-e1
npm install
Test-Path src\app\painel\page.tsx
Test-Path docs\execucao-pendencias\00_PLANO_MESTRE.md
Test-Path src\components\admin\entrada\EntradaDoPainel.test.ts
Select-String -Path vitest.config.mts -Pattern "runtime: 'automatic'" -Quiet
npm test
```

Os quatro comandos antes do `npm test` precisam imprimir `True` (se algum imprimir `False`, a `origin/main`
ainda não recebeu o commit de base do integrador, que deveria ter vindo antes deste prompt: parar e
registrar no relatório). Anote do resumo do `npm test` o número de
arquivos e de testes, com o servidor de desenvolvimento deste worktree parado
(`src/server/db/README.md`, seção "Rode a suíte com o npm run dev PARADO"). O esperado é a base: 86
arquivos, 741 testes passando e 1 pulado. Se der diferente, anotar o número medido no relatório e usá-lo
como base.

### 1. P-C2-09 — o aceite legal persiste nas preferências

**Arquivo:** `src/server/db/diff.ts`, só o bloco `settings:` de `normalizarUser`.

Trocar o bloco por uma forma que acrescenta `legalAcceptance` **só quando existe**, com chaves em ordem
fixa e o array copiado:

```ts
settings: u.settings
  ? {
      twoFA: u.settings.twoFA,
      notifEnvios: u.settings.notifEnvios,
      notifNegociacoes: u.settings.notifNegociacoes,
      notifNovidades: u.settings.notifNovidades,
      // Aceite dos Termos por blocos (A3). Ausente fica AUSENTE — não `null` —, para a linha de
      // quem nunca aceitou continuar idêntica à gravada e o diff não inventar atualização.
      ...(u.settings.legalAcceptance
        ? {
            legalAcceptance: {
              termsVersion: u.settings.legalAcceptance.termsVersion,
              privacyVersion: u.settings.legalAcceptance.privacyVersion,
              acceptedAt: u.settings.legalAcceptance.acceptedAt,
              blocks: [...u.settings.legalAcceptance.blocks],
            },
          }
        : {}),
    }
  : null,
```

Comentário em português no bloco explicando o porquê (o `jsonb` reordena chaves; sem ordem fixa, toda
gravação viraria `conta.atualizar`). Atualizar a tabela de arquivos de `src/server/db/README.md` com a linha
do teste novo e uma frase: "desde a E1, `settings.legalAcceptance` é persistido; o comentário da migration
023 descreve a limitação antiga".

**Teste que prova:** `src/server/db/aceite-nas-preferencias.test.ts` (tarefa de testes, abaixo).

### 2. O módulo que as portas chamam

**Arquivo novo:** `src/server/auth/conta-desativada.ts` (com `import 'server-only'` e o bloco de aviso de
módulo exclusivo de servidor no topo, como em `situacao.ts`).

Exporta:

```ts
export const MENSAGEM_CONTA_DESATIVADA = 'Esta conta está desativada. Fale com o atendimento.'
export const STATUS_CONTA_DESATIVADA = 'conta-desativada'
/** Route Handler que apaga a sessão — o casco do app não pode apagar cookie. */
export const SAIDA_DA_CONTA_DESATIVADA = '/entrar/sair'

/** A pergunta das portas de entrada. Qualquer exceção responde "liberada". */
export async function barrarContaDesativada(email: string | null | undefined): Promise<boolean>
//  → try { return await contaDesativada(email) } catch { return false }

/** Erro do Supabase de identidade bloqueada pelo painel (ban_duration). */
export function ehIdentidadeBloqueada(erro: { code?: string; message?: string } | null | undefined): boolean
//  → erro?.code === 'user_banned' || /\bbanned\b/i.test(erro?.message ?? '')
```

Por quê: um lugar só para a frase, o endereço e a regra "falhou, libera" — as quatro portas e os testes
mockam um módulo, e `contaDesativada` (território do painel) é só importada, nunca editada.

**Teste:** `src/server/auth/conta-desativada.test.ts`.

### 3. Portas 1 e 2 — `login()`

**Arquivo:** `src/server/actions/auth.ts`.

- Em `loginDoCatalogoLocal`, **depois** da conferência de senha (`:63`) e **antes** do `mutateState`
  (`:65`): `if (await barrarContaDesativada(email)) return { ok: false, error: MENSAGEM_CONTA_DESATIVADA }`.
  A ordem importa: senha errada continua respondendo `CREDENCIAIS_INVALIDAS`, e conta desativada não
  ganha `lastAccess` novo.
- No caminho do Supabase:
  - quando `signInWithPassword` devolver erro com `ehIdentidadeBloqueada(error)`, responder
    `MENSAGEM_CONTA_DESATIVADA` (é a frase que a pessoa precisa ler; o custo — dizer a quem digita o
    e-mail que a conta está desativada — entra no RA-49);
  - depois do sucesso e **antes** de provisionar (`:113`):
    `if (await barrarContaDesativada(data.user.email)) { await client.auth.signOut({ scope: 'local' }).catch(() => undefined); return { ok: false, error: MENSAGEM_CONTA_DESATIVADA } }`.
    Cobre a conta desativada sem chave de serviço, que o Supabase não bloqueou.
- `'use server'` só exporta funções assíncronas: as constantes ficam no módulo da tarefa 2, nunca em
  `auth.ts`.
- `EntradaDoPainel` (`/painel`) já mostra `r.error`: não precisa mudar.

**Teste:** `src/server/actions/auth.test.ts`.

### 4. Porta 3 — callback, com recuperação de senha e o cookie de destino

**Arquivo:** `src/app/entrar/callback/route.ts`.

1. Guardar `const recuperacao = params.get('type') === 'recovery'` junto dos outros parâmetros (vale para
   o ramo do fragmento e para `token_hash`/`token` com `type=recovery`). O ramo `?code=` não traz o tipo —
   nenhum fluxo de hoje manda recuperação por esse caminho; registrar no README do callback.
2. Função local `contaDesativadaNaEntrada(request)`: consome e descarta o destino
   (`await consumirDestinoDoLogin()`) e redireciona para `/entrar?status=conta-desativada`.
3. Em `falha()`: se `ehIdentidadeBloqueada({ message: motivo })`, devolver `contaDesativadaNaEntrada`.
   Isso cobre `?error_description=User is banned` e os erros de `setSession`/`exchangeCode`/`verifyOtp` da
   identidade bloqueada. `falha` passa a ser `async` (ou recebe a checagem antes de chamá-la) — ajustar
   as chamadas.
4. Logo depois de `if (!user?.email)` (`:117`) e **antes** do aceite legal e do provisionamento:
   `if (await barrarContaDesativada(user.email)) { await client.auth.signOut({ scope: 'local' }).catch(() => undefined); return contaDesativadaNaEntrada(request) }`.
5. No fim, depois do `setSession` (`:152`):
   ```ts
   const destino = await consumirDestinoDoLogin()
   if (recuperacao) {
     const url = destination(request, '/entrar/nova-senha')
     // Quem pediu o link a partir da entrada do painel volta ao painel depois de trocar a senha.
     if (destino === '/admin') url.searchParams.set('destino', '/admin')
     return NextResponse.redirect(url)
   }
   return NextResponse.redirect(destination(request, destino))
   ```
6. Atualizar o comentário de topo (a lista de formatos ganha "`type=recovery` → tela de nova senha" e a
   checagem da conta desativada) e `src/app/entrar/callback/README.md`.

A sessão de recuperação precisa continuar nos cookies do Supabase (`sb-…`) gravados pelo `setSession` do
cliente SSR (`src/server/auth/client.ts`): é ela que autoriza o `updateUser` da tarefa 6. **Não** chamar
`signOut` no caminho de recuperação.

**Teste:** `src/app/entrar/callback/route.test.ts`.

### 5. Porta 4 — a sessão já aberta

**5a. Route Handler de saída — arquivo novo `src/app/entrar/sair/route.ts`** (+ `README.md` da pasta).

```ts
export const dynamic = 'force-dynamic'

export async function GET(request: Request): Promise<NextResponse> {
  const email = await getSessionEmail()
  const desativada = email ? await barrarContaDesativada(email) : false
  await clearSession()
  try {
    const client = await createAuthClient()
    await client.auth.signOut({ scope: 'local' })
  } catch {
    // Sem Supabase configurado, a sessão da plataforma já saiu — não prende ninguém aqui.
  }
  const url = new URL('/entrar', request.url)
  if (desativada) url.searchParams.set('status', STATUS_CONTA_DESATIVADA)
  return NextResponse.redirect(url, { headers: { 'Cache-Control': 'no-store' } })
}
```

Por que **sempre** apaga, e não só para conta desativada: se o casco achar "desativada" e esta rota,
um instante depois, não achar (banco oscilando), uma rota que só apagasse na certeza devolveria para
`/inicio` e o casco mandaria de volta — laço de redirecionamento. Apagar sempre fecha o ciclo; a checagem
só escolhe a frase. O custo (um link externo para `/entrar/sair` desloga quem clicar) vai no RA-49.
Não é rota que pula autenticação: ela só tira acesso.

**5b. O casco — `src/app/(app)/layout.tsx`.** Um import e uma linha, logo depois de
`if (!state.users[session]) redirect('/entrar')` (`:57`):

```ts
// Conta desativada pelo painel sai pela rota que apaga a sessão: Server Component não apaga cookie,
// e mandar direto para /entrar faria laço com o redirecionamento de /entrar para /inicio.
if (await barrarContaDesativada(session)) redirect(SAIDA_DA_CONTA_DESATIVADA)
```

**5c. A aba já aberta — `src/app/api/state/route.ts`.** Logo depois de `if (!session) { … }` (`:42-46`):

```ts
// Conta desativada com a aba aberta: o layout não roda de novo na navegação interna, então quem a
// alcança é este ciclo de 10 s. O 401 leva o AppProvider, com carga completa, a /entrar/sair, que
// apaga a sessão e mostra o aviso.
if (await barrarContaDesativada(session)) {
  return NextResponse.json({ error: 'Sessão expirada.' }, { status: 401, headers: SEM_CACHE })
}
```

**5d. O 401 do `AppProvider` — `src/components/providers/AppProvider.tsx`, só o tratamento do 401.** A E1
é dona deste plano B e já o aplica, em vez de esperar o roteiro mostrar defeito: a cadeia antiga
`401 → / → /inicio → /entrar/sair` dependia de o roteador do cliente seguir um `redirect()` de Server
Component até um Route Handler, o que só se confere logado. A carga completa não depende disso. Trocar
o bloco de `refresh` (`:211-216`):

```ts
if (r.status === 401) {
  router.replace('/')
  return
}
```

por:

```ts
// Sessão caiu (cookie expirou, segredo rotacionado) ou a conta foi desativada pelo painel: carga
// completa na rota que apaga a sessão. Não depende de o roteador do cliente seguir redirect até
// Route Handler; sem sessão, a rota só manda para /entrar, que é onde o '/' antigo terminava.
if (r.status === 401) {
  window.location.assign('/entrar/sair')
  return
}
```

- O endereço vai **literal**: o `AppProvider` é Client Component e não pode importar
  `@/server/auth/conta-desativada` (`server-only`). O teste da tarefa 2 amarra o literal à constante.
- `router` não tem outro uso no arquivo. Tirar só as três linhas que existiam para ele, para o lint não
  acusar variável sem uso: o import de `useRouter` (`:39`), `const router = useRouter()` (`:161`) e
  `router` na lista de dependências do `useCallback` (`:236`, que fica `[aplicar]`).
- Nada mais no arquivo: nem props, nem o ciclo de `config.syncMs`, nem `aceitesPendentes`. A E6 lê o
  `AppProvider` e não toca o bloco do 401.

**5e. O aviso — `src/app/entrar/page.tsx`.** Em `feedback()`, antes do caso de `erro === 'callback'`:
`if (params.status === STATUS_CONTA_DESATIVADA) return { error: MENSAGEM_CONTA_DESATIVADA }`.

**Testes:** `src/app/entrar/sair/route.test.ts`, `src/app/api/state/conta-desativada.test.ts` e o caso do
401 em `src/server/auth/conta-desativada.test.ts`. O bloco `oxc: { jsx: { runtime: 'automatic' } }` já está
na base em `vitest.config.mts` (não existe `vitest.config.ts`): **não editar esse arquivo**. Mesmo com JSX no
Vitest, o layout não ganha teste de tela — é Server Component assíncrono com `redirect()`, e a decisão dele
está inteira em `barrarContaDesativada` (testada); a linha é conferida por `npm run build` e pelo roteiro.

### 6. P-C2-05 — a tela de nova senha

**6a. Server Action — `src/server/actions/auth.ts`, função nova `definirNovaSenha(nova, confirmacao)`.**

1. `const email = await getSessionEmail()`; sem sessão →
   `{ ok: false, error: 'O link de redefinição expirou ou já foi usado. Peça um novo ao atendimento.' }`.
2. `nova !== confirmacao` → `'A confirmação da nova senha não confere.'`. **Sem** checagem local de
   tamanho: quem valida é o Supabase (mesma regra de `registerWithEmail`, RA-18).
3. `barrarContaDesativada(email)` → `MENSAGEM_CONTA_DESATIVADA`.
4. `createAuthClient()`; `client.auth.getUser()`; se der erro ou o e-mail do Supabase (minúsculo, sem
   espaços) for diferente do da sessão → a mensagem do item 1. Isso impede trocar a senha de uma
   identidade que não é a da sessão da plataforma.
5. `client.auth.updateUser({ password: nova })`. Erro com `code === 'same_password'` →
   `'A senha nova precisa ser diferente da anterior.'`; `code === 'weak_password'` →
   `` `Senha fraca: ${error.message}` ``; outro erro → `error.message || FALHA_AUTENTICACAO`.
6. Sucesso → `{ ok: true, message: 'Senha nova salva. Use-a no próximo login.' }`.
7. `AuthConfigurationError` → `'O login pelo Supabase não está configurado neste ambiente.'`; outra
   exceção → `authError()`.

**6b. Página — arquivo novo `src/app/entrar/nova-senha/page.tsx`** (+ `README.md` da pasta). Server
Component, `export const dynamic = 'force-dynamic'`, `metadata` com título `Nova senha | Áurea Custódia` e
`robots: { index: false, follow: false }`.

```ts
const email = await getSessionEmail().catch(() => null)
if (!email) redirect('/entrar')
const { destino } = await searchParams
return <NovaSenhaForm email={email} destino={destinoPermitido(destino)} />
```

Fica fora de `src/app/(app)/` de propósito (não carrega o `AppState` nem o casco), e `/entrar` não tem
`layout.tsx`, então o redirecionamento de `/entrar/page.tsx` para `/inicio` não vale aqui.

**6c. Formulário — arquivo novo `src/components/login/NovaSenhaForm.tsx`** (`'use client'`). Mesmo esqueleto
visual de `LoginForm.tsx` (`login-wrap auth-page`, `login-card`, logo `LOGO_AUREA`, `login-title`,
`login-sub`, `.field`, `.btn btn-gold`, `auth-feedback` com `login-error` e `auth-success`). Conteúdo:
título "Defina sua nova senha", linha "Conta: <e-mail>", campos "Nova senha" e "Confirme a nova senha"
(`autoComplete="new-password"`), botão "Salvar nova senha". Com `ok`, mostra a mensagem e faz
`router.push(destino)` e `router.refresh()`. Link discreto "Continuar sem trocar" para o destino — nada
obriga a trocar. Importa só `definirNovaSenha` de `@/server/actions/auth` (módulo `'use server'`, o mesmo
caminho que `LoginForm` já usa). **Sem CSS novo.**

**Teste:** casos de `definirNovaSenha` em `src/server/actions/auth.test.ts`.

### 7. Riscos e notas de pasta

**`RISCOS_ASSUMIDOS.md`** — só as linhas da E1:

- Índice: RA-43 passa a "Conta criada pelo painel com senha provisória, sem segundo fator e sem troca
  obrigatória; **tela de nova senha no link de redefinição paga na E1**". RA-44 vira ✅ "… **pago na E1
  (15/09/2026)**; o que ainda passa está no RA-49". Duas linhas novas logo depois da do RA-48, nesta
  ordem, exatamente assim (a base termina no RA-48; outras branches inserem RA novos no mesmo ponto, e o
  conflito que isso gera é esperado — a integração resolve pela união, em ordem numérica; não tentar
  prever nem renumerar):

  ```markdown
  | **RA-49** | Conta desativada: Server Action e rota de API de aba aberta aceitam a sessão até o próximo ciclo de 10 s; checagem que falha libera; `/entrar/sair` desloga por link; a frase de conta desativada aparece com senha errada | 🟡 | `src/server/auth/`, `src/app/entrar/` |
  | **RA-50** | Tela de nova senha sem a senha atual para quem tem sessão aberta do Supabase; link de recuperação por `?code=` não é reconhecido; tamanho da senha validado só pelo Supabase | 🟡 | `src/server/auth/`, `src/server/actions/` |
  ```
- Seção RA-43: o terceiro item ("o link de redefinição … ainda não tem a tela") passa a dizer que a tela
  existe desde a E1 (`/entrar/nova-senha`); "Deixa de valer" perde "tela de nova senha no fluxo de
  recuperação".
- Seção RA-44: título com ✅; o texto passa a dizer quais portas chamam `barrarContaDesativada` (login do
  catálogo, login do Supabase, callback, casco do app, `/api/state`) e aponta o RA-49. O parágrafo "Para o
  Rogério" troca "Quem estiver com o site aberto continua dentro até sair" por "quem estiver com o site
  aberto é levado para fora em até dez segundos".
- Seções novas **RA-49** e **RA-50** logo depois da seção RA-48, no formato das vizinhas (bloco
  `Decidido em / Dono / Pastas`, o que assume, "Como se paga", "Para o Rogério"). Conteúdo mínimo:
  - RA-49: Server Actions e rotas de `/api/*` leem `getSessionEmail()` sem perguntar a situação — uma aba
    aberta ainda consegue agir até o próximo `GET /api/state` (até 10 s) ou uma chamada feita à mão; banco
    fora do ar = conta tratada como ativa; `GET /entrar/sair` desloga qualquer um que abra o link; a
    resposta `user_banned` do Supabase vem antes da conferência da senha, então a frase de conta
    desativada aparece para quem digita o e-mail certo com a senha errada. Como se paga: checagem da
    situação dentro de `getSessionEmail` (ou num `middleware.ts`) com cache curto, antes de cliente real.
  - RA-50: `/entrar/nova-senha` troca a senha sem pedir a atual para qualquer sessão da plataforma que
    também tenha sessão do Supabase com o mesmo e-mail — não só a aberta pelo link (o próprio Supabase dá
    esse poder à sessão, no padrão dele); recuperação por `?code=` (PKCE) cai no login comum; sem regra
    local de tamanho. Como se paga: exigir sessão de recuperação (claim `amr` do Supabase) e troca
    obrigatória no primeiro acesso, antes de cliente real.

**`src/server/auth/ATALHOS.md`** — acrescentar no fim as seções `## RA-49 🟡` e `## RA-50 🟡`, com arquivos,
o que assume e como se paga (mesmo formato das seções RA-17/18/19).

**`src/server/actions/ATALHOS.md`** — acrescentar no fim `## RA-50 🟡 — definirNovaSenha sem a senha atual`,
curta, apontando para `src/server/auth/ATALHOS.md`.

**`src/server/admin/ATALHOS.md`** — só as seções RA-43 e RA-44: RA-43 perde o item do link sem tela; RA-44
ganha ✅ e "Como se paga: pago na E1; o que resta é o RA-49 (`src/server/auth/ATALHOS.md`)". Não tocar o
`---` e a linha em branco depois da seção RA-44 (hoje `:87-89`): são eles que separam essa edição da seção
RA-45, que a E6 edita.

**READMEs:** `src/server/auth/README.md` (fluxos: conta desativada nas portas; recuperação de senha),
`src/app/entrar/README.md` (lista `callback/`, `sair/`, `nova-senha/`), `src/app/entrar/callback/README.md`,
e os dois novos (`sair/README.md`, `nova-senha/README.md`).

### 8. Conferência sem login e relatório

Com `npm run dev -- -p 3101` rodando no worktree (só a porta 3101), rodar os comandos dos itens 4, 6 e 7
do "Objetivo final" (o do item 7 exatamente como está lá: trecho sem acento, `Fale com o atendimento`, e
saída juntada com `-join` antes do `-match` — nunca `-match` direto sobre o array nem sobre texto com
acento) e mais este, que simula o Supabase devolvendo a identidade bloqueada:

```powershell
curl.exe -s -o NUL -w "%{http_code} %{redirect_url}`n" "http://localhost:3101/entrar/callback?error=access_denied&error_description=User%20is%20banned"
```

Esperado: `307 http://localhost:3101/entrar?status=conta-desativada`. Parar o servidor de desenvolvimento
deste worktree, rodar o ciclo completo (conferindo a contagem do item 1 do "Objetivo final"), commitar,
publicar a branch e escrever o relatório (seção "Entrega").

---

## Território

| Pode editar | Observação |
|---|---|
| `src/server/actions/auth.ts` | `login`, função nova `definirNovaSenha`. Nada mais nas outras funções |
| `src/server/actions/auth.test.ts` | novo |
| `src/server/auth/conta-desativada.ts`, `src/server/auth/conta-desativada.test.ts` | novos |
| `src/server/auth/README.md`, `src/server/auth/ATALHOS.md` | ATALHOS: só acrescentar RA-49 e RA-50 no fim |
| `src/app/entrar/page.tsx`, `src/app/entrar/README.md` | |
| `src/app/entrar/callback/route.ts`, `src/app/entrar/callback/README.md` | |
| `src/app/entrar/callback/route.test.ts` | novo |
| `src/app/entrar/sair/route.ts`, `route.test.ts`, `README.md` | novos |
| `src/app/entrar/nova-senha/page.tsx`, `README.md` | novos |
| `src/components/login/NovaSenhaForm.tsx` | novo |
| `src/app/api/state/conta-desativada.test.ts` | novo (nome próprio para não colidir com outra branch) |
| `src/server/db/aceite-nas-preferencias.test.ts` | novo |
| `docs/execucao-pendencias/relatorios/E1.md` | novo; `docs/execucao-pendencias/README.md` e `relatorios/README.md` já existem na base; a branch só cria o próprio `relatorios/E1.md` |

| Compartilhado | Regra de convivência |
|---|---|
| `src/server/db/diff.ts` | só o bloco `settings:` de `normalizarUser`. Outra branch pode mexer em outros campos da mesma função |
| `src/server/db/README.md` | só acrescentar a linha do teste novo e a frase sobre `legalAcceptance` |
| `src/app/(app)/layout.tsx` | só um import e a linha depois de `if (!state.users[session])`. Nada nas props do `AppProvider` |
| `src/app/api/state/route.ts` | só o bloco logo depois de `if (!session)`; nada na leitura de configuração |
| `src/components/providers/AppProvider.tsx` | a E1 é dona do plano B da sessão aberta: só o bloco do 401 em `refresh` (`:211-216`) e as três linhas que existiam só para `router` (`:39`, `:161`, `:236`). A E6 não toca o bloco do 401 |
| `RISCOS_ASSUMIDOS.md` | só as linhas de RA-43, RA-44, RA-49 e RA-50 (índice e seções). RA-49/50 entram logo depois do RA-48, o maior da base; outras branches inserem RA novos no mesmo ponto. O conflito é esperado e a integração resolve pela união, em ordem numérica — o agente da E1 não tenta prever |
| `src/server/admin/ATALHOS.md` | só as seções RA-43 e RA-44, sem tocar o `---` que as separa da RA-45 (E6) |
| `src/server/actions/ATALHOS.md` | só acrescentar a seção RA-50 no fim (a E3 mexe na seção RA-16.c) |

| Não pode editar | De quem é / por quê |
|---|---|
| `src/server/admin/**` (inclusive `situacao.ts`, `acesso.ts`, `usuarios.ts`, `identidade.ts`, `testing/`) | E5 (C1/C2 do painel). `situacao.ts` e `identidade.ts` são **só lidos**: a E1 depende da assinatura de `contaDesativada` e do `error.code` `user_banned` do bloqueio por `ban_duration`. Nada se importa de `src/server/admin/testing/` (nem em teste). `destinoPermitido` vem de `src/server/auth/destino.ts` |
| `src/app/painel/**`, `src/components/admin/**`, `src/app/(admin)/**` | E5/E6 |
| `src/server/auth/destino.ts`, `src/server/session.ts`, `src/server/auth/legal.ts`, `src/server/auth/client.ts` | usar como estão; mudar contrato quebra `/painel` e as Server Actions |
| `src/components/shell/**`, `src/components/login/LoginForm.tsx` | fora do pedido (o `AppProvider.tsx` está em "Compartilhado", só o bloco do 401) |
| `src/server/payments/**`, `src/server/estacao/**` | E2 |
| `src/components/relatorios/**`, `src/server/actions/contabil.ts`, `src/server/relatorios/**` | E3 |
| `src/server/db/migrations/**`, `src/domain/custody*`, telas de extrato e envios | E4 (e nenhuma migration nesta branch) |
| `src/server/config/**` | E6 |
| `docs/finalizacoes/**`, `docs/publish_docs/**` | E7 e integração |
| `src/domain/types.ts`, `constants.ts`, `fees.ts`, `market.ts`, `src/server/store/types.ts` | superfície protegida; nada aqui precisa deles |
| `src/server/db/db.test.ts`, `src/server/db/diff.test.ts`, `src/server/admin/banco.test.ts`, `acoes.test.ts` | testes novos vão em arquivo novo |
| `vitest.config.mts` (o bloco JSX já está na base; não existe `vitest.config.ts`), `tsconfig.json`, `package.json`, `package-lock.json`, `src/styles/**` | compartilhados por todas |

---

## Testes exigidos

Todos em `.test.ts`, `vi.mock('server-only', () => ({}))` no topo quando o módulo importado tiver a barreira.
Cookies simulados como em `src/server/auth/destino.test.ts` (um `Map` atrás de `get`/`set`/`delete`,
`vi.mock('next/headers', () => ({ cookies: async () => jar }))`).

**`src/server/auth/conta-desativada.test.ts`** (mock de `@/server/admin/situacao`)
- `barrarContaDesativada responde o que contaDesativada responde` — `true` e `false`.
- `exceção de contaDesativada libera a conta` — mock rejeita → `false`.
- `ehIdentidadeBloqueada reconhece user_banned pelo código e pela mensagem` — `{ code: 'user_banned' }`,
  `{ message: 'User is banned' }` → `true`; `{ code: 'invalid_credentials' }`, `null` → `false`.
- `o 401 do AppProvider leva ao endereço de saída` — lê `src/components/providers/AppProvider.tsx` com
  `readFileSync` (texto, sem importar o `.tsx`) e confere que o arquivo contém
  `` window.location.assign('${SAIDA_DA_CONTA_DESATIVADA}') `` e não contém mais `router.replace('/')`.

**`src/server/actions/auth.test.ts`** (mocks de `@/server/state`, `@/server/session`, `@/server/auth/client`,
`@/server/auth/conta-desativada` — mantendo as constantes reais com `vi.importActual` —,
`@/server/auth/authorization`, `@/server/auth/provisioning`, `@/server/documentos/aceites`,
`@/server/auth/destino`, `next/headers`)
- `catálogo: conta desativada com a senha certa é recusada sem sessão e sem gravar acesso` — erro é
  `MENSAGEM_CONTA_DESATIVADA`; `setSession` e `mutateState` não chamados.
- `catálogo: senha errada responde credenciais inválidas sem perguntar a situação` — `barrarContaDesativada`
  não chamado.
- `catálogo: conta ativa entra como antes` — `setSession('rogerio@aureacustodia.com.br')` (ou outro e-mail de
  `ACCOUNTS`).
- `Supabase: identidade bloqueada pelo painel recebe a frase de conta desativada` — `signInWithPassword`
  devolve `{ error: { code: 'user_banned', message: 'User is banned' } }`.
- `Supabase: conta desativada sem bloqueio no Supabase sai sem sessão e sem provisionar` — `signOut`
  chamado com `{ scope: 'local' }`; `setSession` e `provisionAuthenticatedUser` não.
- `Supabase: conta ativa entra como antes`.
- `definirNovaSenha: sem sessão pede link novo`.
- `definirNovaSenha: confirmação diferente não chama o Supabase`.
- `definirNovaSenha: sessão do Supabase de outro e-mail é recusada` — `updateUser` não chamado.
- `definirNovaSenha: conta desativada é recusada`.
- `definirNovaSenha: senha repetida e senha fraca viram frase em português` — `same_password`, `weak_password`.
- `definirNovaSenha: troca a senha sem pedir a atual` — `updateUser({ password })` chamado uma vez;
  `signInWithPassword` nunca.

**`src/app/entrar/callback/route.test.ts`** (mocks de `@/server/auth/client`, `@/server/session`,
`@/server/auth/conta-desativada` com constantes reais, `@/server/auth/authorization`,
`@/server/auth/provisioning`, `@/server/auth/legal`, `@/server/documentos/aceites`; `@/server/auth/destino`
**real**, sobre o jar simulado — é assim que se prova a convivência com `/painel`)
- `login pelo Google começado no painel volta para /admin` — jar com `aurea_destino_login=/admin`,
  `?code=abc` → `location` termina em `/admin`; cookie apagado.
- `confirmação de e-mail sem destino vai para /inicio` — `?token_hash=h&type=email`.
- `link de recuperação vai para a tela de nova senha, com sessão aberta` — `?access_token=a&refresh_token=b&type=recovery`
  → `/entrar/nova-senha`; `setSession` chamado; `signOut` não.
- `recuperação por token_hash também vai para a tela de nova senha` — `?token_hash=h&type=recovery`.
- `recuperação começada com destino do painel leva o destino adiante` — `/entrar/nova-senha?destino=%2Fadmin`.
- `conta desativada não abre sessão e descarta o destino` — `?code=abc`, `barrarContaDesativada` → `true`:
  `location` com `/entrar?status=conta-desativada`; `setSession` e `provisionAuthenticatedUser` não chamados;
  `signOut` chamado; cookie de destino apagado.
- `conta desativada vence o link de recuperação` — `type=recovery` + desativada → aviso de conta desativada.
- `identidade bloqueada devolvida pelo Supabase vira o aviso de conta desativada` —
  `?error=access_denied&error_description=User%20is%20banned` e `setSession` do cliente com erro
  `User is banned`.
- `outros erros continuam com o motivo real` — `?error_description=Link%20expirado` → `/entrar?erro=callback&motivo=…`.

**`src/app/entrar/sair/route.test.ts`** (mocks de `@/server/session`, `@/server/auth/client`,
`@/server/auth/conta-desativada` com constantes reais)
- `conta desativada: apaga a sessão e mostra o aviso` — `clearSession` chamado; `location` com
  `/entrar?status=conta-desativada`; `Cache-Control` `no-store`.
- `conta ativa: apaga a sessão e vai para /entrar sem aviso`.
- `sem sessão: vai para /entrar sem perguntar a situação`.
- `Supabase não configurado não impede a saída` — `createAuthClient` rejeita com `AuthConfigurationError`
  → mesmo redirecionamento, `clearSession` chamado.

**`src/app/api/state/conta-desativada.test.ts`** (mocks de `@/server/session`, `@/server/state`,
`@/server/config/carregar`, `@/server/config/documentos`, `@/server/auth/conta-desativada`)
- `sessão de conta desativada recebe 401 sem ler o estado` — `getState` não chamado; `Cache-Control` com `no-store`.
- `sessão de conta ativa continua recebendo o estado` — 200 com `state`.

**`src/server/db/aceite-nas-preferencias.test.ts`** (puro + uma instância de PGlite; copiar o
`executorPGlite` de `src/server/db/livro-de-ordens.test.ts`, com `AUREA_DB_SCHEMA=aurea` e timeout de
60 s no `beforeAll`; **não** importar de `src/server/admin/testing/`, que é só do painel)
- `normalizarUser guarda o aceite em ordem fixa de chaves` — entrada com as chaves embaralhadas →
  `JSON.stringify` igual ao da ordem canônica.
- `conta sem aceite não ganha a chave legalAcceptance` — `'legalAcceptance' in settings === false`.
- `gravar o aceite vira uma única atualização do usuário` — `planejarDiff` sobre `seedState()` →
  `['user.atualizar']` com `settings.legalAcceptance`.
- `o aceite sobrevive à ida e volta no Postgres` — `mutarEstado` grava `legalAcceptance` numa conta sem
  preferências e noutra com preferências; `lerEstado` devolve os dois iguais (`toEqual`).
- `gravação sem mudança depois do aceite não gera atualização nem linha de auditoria` — conta
  `SELECT count(*) FROM aurea.audit_log` antes e depois de `mutarEstado(executar, () => undefined)`: igual.

---

## Regras que valem nesta branch

- **Palavras proibidas** em texto de tela, mensagem de erro, comentário, nome de arquivo, commit e
  relatório: token, NFT, cripto, ativo digital, ativo, investimento, investidor, corretora, rentabilidade,
  retorno. "Conta ativa/desativada" como situação da conta é permitido; "ativo" como nome de coisa, não.
  Escreva "volta" e "endereço de volta", nunca "retorno". Os nomes de parâmetro do Supabase que já estão no
  callback (`access_token`, `refresh_token`, `token_hash`, `token`) são contrato do provedor e ficam como
  estão; não crie identificador novo com essas palavras.
- **Nenhuma trava que o Gabriel não pediu.** Nada de feature flag, variável que liga a checagem, confirmação
  obrigatória, regra local de tamanho de senha ou "Continuar sem trocar" escondido. Falha de leitura cai no
  comportamento padrão.
- **Nada tranca o Gabriel nem a equipe para fora.** Conta da equipe nunca é "desativada" (`contaDesativada`
  já garante; não contornar). Checagem que falha responde "liberada". A entrada `/painel` e a volta para
  `/admin` pelo cookie de destino continuam funcionando — há teste para isso.
- **As fórmulas de hash não mudam.** O ledger (`src/domain/hash.ts`, `ledger.ts`) e a derivação
  (`src/server/db/derivar.ts`) não são tocados; a mudança em `diff.ts` só acrescenta um campo de preferência,
  sem efeito em saldo.
- **Nada de `@/server/*` em Client Component**, com a única exceção que o repositório já usa: importar Server
  Action de módulo `'use server'` (`@/server/actions/auth`). `NovaSenhaForm` não importa `conta-desativada.ts`,
  `destino.ts` nem `session.ts`, e o `AppProvider` escreve `'/entrar/sair'` literal em vez de importar a
  constante.
- **Trilhas só recebem INSERT.** Esta branch não escreve em `audit_log`, `config_historico`, `eventos_uso`
  nem notas.
- **Comentários em português explicando o porquê.** Pasta nova (`sair/`, `nova-senha/`) ganha `README.md`.
  Atalho tomado entra em `RISCOS_ASSUMIDOS.md` **e** no `ATALHOS.md` da pasta, no mesmo commit.
- **Não mexer em DNS, e-mail, domínio nem no painel do Supabase** — nem na lista de URLs de redirecionamento,
  nem no modelo de e-mail de recuperação. O desenho acima funciona com a configuração padrão. Não criar
  conta, chave nem credencial. Esta branch não pede variável de ambiente nova.
- **Um agente não digita senha em tela de login** nem cria rota, script ou cookie que abra sessão. A
  conferência logada é por teste automatizado ou fica no roteiro do Gabriel.
- **`auth.ts` é Server Action** (superfície protegida do `CLAUDE.md`): a mudança é a pedida em P-C2-04 e
  P-C2-05, já decidida; não mexer em `registerWithEmail`, `registerWithGoogle`, `loginWithGoogle` nem
  `logout`.
- **A branch não faz merge na `main`.** Antes de cada push, no worktree:
  ```powershell
  npm run typecheck; if ($?) { npm run lint }; if ($?) { npm test }; if ($?) { npm run build }
  ```
  PowerShell 5.1 não tem `&&`. Suíte com o servidor de desenvolvimento deste worktree parado; confira o
  número de arquivos de teste contra o item 1 do "Objetivo final" (arquivo que sumiu é worker morto: rodar
  sozinho com `npx vitest run <arquivo>` e registrar). O servidor de desenvolvimento desta branch roda só na
  porta 3101.

---

## O que NÃO fazer

- Não chamar `redirect('/entrar')` do casco para conta desativada (laço com `/entrar` → `/inicio`); a saída
  é `/entrar/sair`.
- Não tentar apagar cookie em Server Component (`page.tsx`, `layout.tsx`) — lança erro no Next 15.
- Não pôr a checagem dentro de `getSessionEmail`, `mutateState` ou em cada Server Action, nem criar
  `middleware.ts`: é o "como se paga" do RA-49, não esta branch.
- Não editar `contaDesativada`, `podeAbrirPainelAdmin`, `destino.ts` nem `session.ts`.
- Não espalhar `...u.settings` em `normalizarUser`, não gravar `legalAcceptance: null` e não criar migration.
- Não editar a migration 023 (já aplicada em produção) para corrigir o comentário.
- Não criar "Esqueci minha senha" em `/entrar`, troca obrigatória no primeiro acesso nem segundo fator —
  não foram pedidos nesta rodada.
- Não editar `vitest.config.mts`: o bloco JSX já está na base. Não criar `vitest.config.ts`.
- Não mexer no `AppProvider.tsx` além do bloco do 401 e das três linhas de `router` (tarefa 5d).
- Não importar de `src/server/admin/testing/` nem editar `situacao.ts` ou `identidade.ts`.
- Não usar a porta 3000 nem criar migration (a 026 fica livre).
- Não chamar `signOut` do Supabase no caminho de recuperação (a tela de nova senha precisa dessa sessão).
- Não editar `docs/finalizacoes/PENDENCIAS_AGENTE_C.md` — quem marca P-C2-04/05/09 como feitos é a integração.
- Não criar `README.md` em `docs/execucao-pendencias/` nem em `relatorios/`.

---

## Entrega

**Commits** (mensagem sem acento é aceitável; última linha com o `Co-Authored-By` do agente, se houver):

1. `Persiste o aceite legal nas preferencias da conta com Postgres (P-C2-09)` — `diff.ts`,
   `aceite-nas-preferencias.test.ts`, `src/server/db/README.md`.
2. `Recusa conta desativada no login, no callback e na sessao aberta (P-C2-04, RA-44, RA-49)` —
   `conta-desativada.ts` e teste, `auth.ts` (login) e teste, callback, `sair/`, layout, `/api/state` e teste,
   bloco do 401 do `AppProvider.tsx`, `/entrar/page.tsx`, RA-44 e RA-49 em `RISCOS_ASSUMIDOS.md` e nos `ATALHOS.md`, READMEs.
3. `Tela de nova senha no link de redefinicao (P-C2-05, RA-43, RA-50)` — `definirNovaSenha`, `nova-senha/`,
   `NovaSenhaForm.tsx`, casos novos nos testes, RA-43 e RA-50, READMEs.
4. `Relatorio da E1` — `docs/execucao-pendencias/relatorios/E1.md`.

**Publicar a branch** (sem merge):

```powershell
git push -u origin exec/e1-portas-de-entrada-da-conta
```

**Relatório `docs/execucao-pendencias/relatorios/E1.md`**, com:

- **O que foi feito** — por pendência (P-C2-04, P-C2-05, P-C2-09), com os arquivos.
- **Testes** — arquivos novos, número de casos, e o resumo do `npm test` antes (tarefa 0) e depois
  (arquivos e testes, contra 86 → 92 arquivos e 741 → pelo menos 777 testes); se algum arquivo sumiu da
  contagem, a saída dele rodado sozinho.
- **O que foi conferido e como** — a saída literal dos quatro `curl.exe` da tarefa 8 e dos quatro comandos do
  ciclo.
- **Riscos** — RA-49 e RA-50 em uma frase cada; RA-44 pago; RA-43 com a parte do link paga. Dizer que a
  migration 026 ficou livre.
- **Dúvidas para a integração** — se houver. A saída da aba aberta já não depende do roteador do cliente
  (tarefa 5d); o roteiro B confirma logado.
- **Passos manuais** — o roteiro abaixo, com os endereços completos.
- Última linha: `E1 pronta para integração — <hash>` (hash de `git rev-parse --short HEAD` depois do último commit).

---

## Passos manuais que sobram para o Gabriel

Nenhuma variável de ambiente nova e nenhuma mudança no Supabase. Sobra **conferir logado**, depois que a
integração publicar. Pré-requisito: `SUPABASE_SERVICE_ROLE_KEY` na Vercel (P-C2-03; o passo a passo
conferido está no tutorial manual entregue ao Gabriel) e uma conta de teste
**fora da equipe** com e-mail que você consiga abrir (por exemplo, um endereço pessoal do Gmail). Os
endereços abaixo são os da produção; troque o domínio se estiver conferindo em outro.

**A. Link de redefinição com tela de nova senha**

1. Abra `https://aurea-custodia-mvp.vercel.app/admin/usuarios`, entre na ficha da conta de teste, aba
   Cadastro, e use **Enviar link de redefinição**.
2. No e-mail que chegar, clique no link. A página que abre deve ser
   `https://aurea-custodia-mvp.vercel.app/entrar/nova-senha`, com o e-mail da conta escrito nela.
3. Digite a senha nova duas vezes e clique em **Salvar nova senha**. Deve aparecer "Senha nova salva. Use-a
   no próximo login." e o site abrir em `/inicio`.
4. Saia pelo menu e entre de novo em `https://aurea-custodia-mvp.vercel.app/entrar` com a senha nova: deve entrar.

**B. Conta desativada com o site aberto**

1. Numa janela anônima, entre em `https://aurea-custodia-mvp.vercel.app/entrar` com a conta de teste e deixe
   o site aberto em `/inicio`.
2. Na sua janela normal, na ficha da conta de teste, use **Desativar conta** com um motivo.
3. Volte à janela anônima e **não clique em nada** por 15 segundos. Ela deve ir sozinha para
   `https://aurea-custodia-mvp.vercel.app/entrar?status=conta-desativada`, com a frase "Esta conta está
   desativada. Fale com o atendimento."
4. Tente entrar de novo com a mesma senha: a mesma frase aparece.
5. Reative a conta pela ficha e entre de novo: deve entrar.

**C. A entrada do painel continua igual**

1. Saia, abra `https://aurea-custodia-mvp.vercel.app/painel` e use **Entrar com Google** com
   `gabriel.silva@aureacustodia.com.br`. Deve abrir `https://aurea-custodia-mvp.vercel.app/admin`.

Se o passo B.3 parar numa tela em branco ou der "redirecionamentos demais", avise: a aba aberta já sai por
carga completa em `/entrar/sair` (tarefa 5d), então o que sobra investigar é essa rota ou o casco do app.
