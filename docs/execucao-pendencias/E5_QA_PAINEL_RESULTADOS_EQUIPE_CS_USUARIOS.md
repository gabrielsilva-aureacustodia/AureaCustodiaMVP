# E5 · QA do painel: entrada, resultados, equipe, CS e usuários

```
Branch:                exec/e5-qa-painel-resultados-equipe-cs-usuarios
Base:                  origin/main que contém docs/execucao-pendencias/00_PLANO_MESTRE.md, ou seja,
                       com o commit de base feito pelo integrador antes do envio dos prompts (os
                       documentos desta pasta, o bloco oxc em vitest.config.mts, o teste
                       src/components/admin/entrada/EntradaDoPainel.test.ts e as seções sem trava
                       do RA-01); tem src/app/painel/page.tsx
Worktree sugerido:     C:\dev\AureaCustodiaMVP-e5
Porta local:           3105 (npm run dev -- -p 3105); nunca a 3000
Pendências de origem:  QA das áreas C1 e C2 do painel (sem ID em PENDENCIAS_AGENTE_C.md);
                       riscos conferidos: RA-40, RA-41, RA-42, RA-48
RA reservados:         RA-54
Migration reservada:   028 (nenhuma tarefa pede migration; o esperado é não usar)
Relatório de saída:    docs/execucao-pendencias/relatorios/E5.md
```

> Revisado em 15/09/2026 contra a crítica de sobreposição (docs/execucao-pendencias/00_PLANO_MESTRE.md).

> **Para o Rogério.** O painel da equipe já funciona. Esta rodada é a revisão de qualidade da parte
> que os sócios mais usam: a entrada do painel, os resultados, a equipe, o atendimento por WhatsApp e
> a ficha de cada cliente. Quando ela terminar, cada tela terá um teste automático que prova que
> quem não tem permissão não vê o dado, nem pelo endereço digitado. Também somem cinco defeitos
> pequenos que confundem quem opera. A ficha mostrava a data do extrato um dia adiantada à noite. O
> atendimento podia mandar a mesma resposta duas vezes. Uma tela aberta sem permissão enchia o
> registro de auditoria. Um WhatsApp configurado pela metade perdia a mensagem do cliente. Alguns
> avisos diziam "disponível depois" de coisas que já existem. Nada muda no dinheiro, nas taxas nem
> na forma de entrar.

---

## Objetivo final — pronto quando

1. No worktree da branch, o ciclo passa inteiro:
   `npm run typecheck; if ($?) { npm run lint }; if ($?) { npm test }; if ($?) { npm run build }`.
   O `npm test` roda com o servidor de desenvolvimento deste worktree parado e conta **96 arquivos**
   (86 da base mais os 10 novos desta branch), com pelo menos 741 testes passando e 1 pulado.
2. `npx vitest run "src/app/(admin)/admin/guarda-das-paginas.test.ts" src/app/painel` passa. O teste
   cobre as dez páginas de C1/C2 (`/admin`, `/admin/resultados`, `financeiro`, `contabil`, `kpis`,
   `uso`, `/admin/equipe`, `/admin/cs`, `/admin/usuarios`, `/admin/usuarios/[email]`) e a entrada
   `/painel`.
3. `npx vitest run src/server/admin/leituras-do-painel.test.ts` passa. Entre os casos está "a ficha
   sem `usuarios.dados_bancarios` não carrega a chave `dadosBancarios`".
4. `npx vitest run src/app/api/webhooks/whatsapp` passa com o caso novo: Evolution configurada sem
   `WHATSAPP_WEBHOOK_SECRET` responde **503**, não 401.
5. `npx vitest run src/components/admin` passa. Isso inclui a varredura de textos: nenhuma
   ocorrência de "Disponível depois da" e nenhuma palavra proibida no território da E5, com a lista
   de exceções da tarefa 8.
6. `npx vitest run src/server/admin/acesso.test.ts src/server/auth/destino.test.ts` continua verde,
   sem alteração nos casos que já existem. É a prova de que a entrada `/painel` não quebrou.
7. `git diff --name-only origin/main...HEAD` lista só arquivos das tabelas "Pode editar" e
   "Compartilhado", e nunca `vitest.config.mts`.
8. `docs/execucao-pendencias/relatorios/E5.md` existe e termina com
   `E5 pronta para integração — <hash>`.

---

## O que o código faz hoje

Conferido no código em 40bb8c8. Os números de linha são dessa versão.

### O que já está resolvido (só confirmar e registrar no relatório)

- **Toda Server Action de C1/C2 confere a própria permissão antes de tudo.**
  `src/server/actions/admin/acoes.test.ts:186-230` cobre cada ação de `contabil.ts`, `equipe.ts`,
  `cs.ts` e `usuarios.ts`: recusa sem chamar o serviço, e dados bancários pedem as duas permissões.
  A escrita e a linha `admin.<area>.<verbo>` ficam na mesma transação. Isso vale para `rbac.ts`,
  `cs.ts`, `usuarios.ts` e `contabil.ts` de `src/server/admin/`, com testes no PGlite em
  `banco.test.ts:150-723`.
- **A guarda que manda para `/painel` está testada.** Sem sessão ou com conta fora da equipe, a
  página vai para `/painel`. O e-mail do Gabriel entra como dev. Os casos estão em
  `src/server/admin/acesso.test.ts:62-77`, e o código em `acesso.ts:126-132`.
- **As datas e horas do painel saem no fuso de Brasília.** `src/components/admin/formatos.ts:14-45`
  usa `timeZone: 'America/Sao_Paulo'`, e o horário de pico usa o mesmo fuso
  (`src/domain/admin/uso.ts:243-244`, com teste). A única exceção está na tarefa 6.
- **O webhook do WhatsApp segue a ordem certa.** Primeiro o provedor, depois a assinatura, o JSON e o
  banco, com testes em `route.test.ts:48-95`.
- **Tabela da C2 não migrada vira a instrução do `db:migrate`** (`acoes.test.ts:271-275`).
- **As migrations 020 a 023 estão aplicadas em produção** (P-C1-01 e P-C2-01 marcados ✅ em
  `docs/finalizacoes/PENDENCIAS_AGENTE_C.md`). As 015 a 019, das quais as abas da ficha dependem,
  também estão (P-M-03).
- **Palavras proibidas.** Nenhuma ocorrência de NFT, cripto, investimento, investidor, corretora ou
  rentabilidade no território. Sobram só três casos:
  - o parâmetro `token` e a variável `AUREA_RELATORIOS_TOKEN`, que são contrato da API de relatórios;
  - o identificador interno `tokenConfigurado`;
  - "URL de retorno" em `src/components/admin/entrada/README.md:16`.

### Lacunas de teste reais

- **Quase nenhum teste importa uma página ou um componente `.tsx`.** O `tsconfig.json` do Next usa
  `"jsx": "preserve"`, e o Vitest 4 (Vite 8, transformador oxc) respeita essa opção. O commit de base
  da integração já traz `oxc: { jsx: { runtime: 'automatic' } }` em `vitest.config.mts` (o arquivo é
  `.mts`; não existe `vitest.config.ts`), e `src/components/admin/entrada/EntradaDoPainel.test.ts`
  prova que JSX renderiza com `renderToStaticMarkup` de `react-dom/server`, no Node, sem DOM. O mesmo
  vale para componente de cliente com `ToastProvider` e `AdminProvider` e com `next/navigation`
  substituído por dublê. Linha de base da suíte: 86 arquivos, 741 testes passando e 1 pulado.
- **A guarda de cada página não tem teste.** As dez páginas conferem a permissão no servidor, por
  exemplo em `resultados/financeiro/page.tsx:24`, `equipe/page.tsx:42-44`, `cs/page.tsx:26`,
  `usuarios/page.tsx:27` e `usuarios/[email]/page.tsx:51`. Nenhum teste prova que o carregador de
  dados não roda sem a permissão, nem que a permissão pedida é a mesma do item de menu
  (`src/components/admin/navegacao.tsx:49-177`).
- **`/painel` não tem teste de página.** `src/app/painel/page.tsx:35-42` faz três coisas: membro vai
  para `/admin`, sem sessão abre o formulário e conta fora da equipe recebe a explicação.
- **A promessa de que dados bancários não saem sem permissão não tem teste.** O código está em
  `src/server/admin/ficha.ts:277`, e a regra é repetida no topo da página da ficha.
- **Sem teste também:**
  - `equipeParaAtribuir` (`src/server/admin/atendimento.ts:82-96`): inativo fica fora, ambiente
    desativado na tabela fica fora, falha do banco cai no ambiente;
  - `carregarPainelInicial` (`src/server/admin/resultados.ts:165-226`): uma parte que falha vira
    `null` e a leitura segue a permissão;
  - `formatos.ts`, `itemDaRota` e `permiteItem` (`navegacao.tsx:186-197`).

### Defeitos prováveis

1. **Uma tela de CS aberta sem permissão enche a trilha.** `CaixaDeAtendimento.tsx:92-97` chama
   `atualizarAtendimentoNoPainel` a cada 5 segundos e ignora a recusa (`:79`,
   `if (... !r.ok ...) return`). Cada chamada passa por `permissaoParaAcao('cs.ver')`, e cada recusa
   grava `admin.acesso.recusado` em `audit_log` (`src/server/admin/acesso.ts:201-207`). Um membro que
   perde `cs.ver`, ou é desativado, com a aba aberta grava 12 linhas por minuto, sem fim.
2. **Resposta em dobro com Ctrl+Enter.** `Conversa.tsx:209-217`: `enviar()` não confere `ocupado`, e
   o atalho de `:253-257` não passa pelo `disabled` do botão. Dois Ctrl+Enter seguidos mandam duas
   mensagens ao cliente.
3. **A caixa arrasta a página no celular.** `Conversa.tsx:64-66` usa `scrollIntoView` no fim da
   lista a cada mensagem nova. Com as colunas empilhadas em 375 px, a volta de 5 s rola a página
   inteira e tira o atendente do cartão do cliente. E tocar numa conversa não leva até ela
   (`.adm-cs-itens` tem `max-height:70vh`, em `src/styles/admin.css:118`).
4. **O cartão do cliente fica em "Carregando…" para sempre** quando o contato está ligado a um
   e-mail que não existe no estado. `resumirConta` devolve `null` (`src/domain/admin/usuarios.ts:353-354`),
   a caixa repassa `null` (`CaixaDeAtendimento.tsx:168`) e o cartão não distingue "ainda não chegou"
   de "não existe" (`CartaoDoCliente.tsx:49-50`). O impacto é baixo: só acontece com conta removida.
5. **O webhook perde mensagem com a Evolution configurada pela metade.** Com `EVOLUTION_API_URL`,
   `EVOLUTION_API_KEY` e `EVOLUTION_INSTANCE` presentes e sem `WHATSAPP_WEBHOOK_SECRET` (ou com ele
   curto), o provedor diz que entrega de verdade (`src/lib/mensageria/evolution.ts:261-264`), mas
   `conferirAssinatura` sempre responde `false` (`:286-287`). A rota responde 401
   (`src/app/api/webhooks/whatsapp/route.ts:45-48`). O próprio comentário da rota (`:15-17`) usa 503
   quando quer que a Evolution reenvie. Com 401, a mensagem do cliente não volta.
6. **A data do extrato na ficha sai no fuso do servidor.** `AbaFinanceiro.tsx:72` mostra `l.dateBR`,
   que `userStatement` monta com `fdate`. Essa função chama `toLocaleDateString` sem fuso
   (`src/domain/dates.ts:18-20`) e roda no servidor da Vercel, em UTC. Um depósito às 22h de
   Brasília aparece com a data do dia seguinte. As outras colunas da ficha já usam `data()` e
   `dataHora()`.
7. **"Quitar com o saldo" pode dizer "Falha ao salvar dados" com a fatura já quitada.**
   `src/server/actions/admin/usuarios.ts:147-161` quita pela função da frente B e só depois grava a
   trilha. Se a trilha falhar, a exceção cai em `comPermissoes` (`:57-63`), que responde falha. O
   atendente tenta de novo e recebe "fatura já paga".
8. **Os avisos "Disponível depois da X" ficaram velhos.** A2, A3, B1, B2 e B3 já estão na `main`, com
   as tabelas em produção. Hoje o aviso só aparece quando a tabela falta ou a leitura falha, e aí o
   texto engana. As ocorrências:
   - `AbaCadastro.tsx:141` (A3, tabela `aceites_documentos`, migration 016);
   - `AbaMercado.tsx:181` (A2, `ofertas_historico`, 015);
   - `AbaFinanceiro.tsx:257` (B2, `planosCustodia` já é campo de `AppState`, `src/domain/types.ts:690`,
     e o Postgres sempre o preenche);
   - `AbaFinanceiro.tsx:277` (B1, `recebimentos_gateway`, 017);
   - `Indicadores.tsx:140` (A2) e `Indicadores.tsx:248` (B2);
   - `Financeiro.tsx:110` (B3: o relatório `recebimentos-gateway` já está em `NOMES_RELATORIOS`,
     `src/server/relatorios/dados.ts:91`).

   Os comentários e conversões velhos estão em `resultados.ts:58-63,137-138` e `ficha.ts:160,287`.

### Melhorias pequenas

- **Acessibilidade.**
  - `AdminTopbar.tsx:69`: o interruptor de tema é um `div` com `onClick`, sem papel nem teclado.
  - `AdminTopbar.tsx:75-77`: "Sair" é um `span` com `onClick`.
  - `AdminTopbar.tsx:44`: o `svg` do botão de menu não tem `aria-hidden`.
  - `AdminSidebar.tsx:85,95`: os itens "Modo escuro" e "Sair" aceitam Enter, mas não Espaço.
  - `Contabil.tsx:85-97`: usa `role="tablist"` e `role="tab"` sem `tabpanel` nem `aria-controls`.
  - `FiltroTrilha.tsx:64`: é um `div` com `aria-label`, sem `role`, e os atalhos não têm
    `aria-pressed`.
- **Botões sem estado de espera.** `AcoesDaConta.tsx:107-121` (inadimplência), `:146-160` (situação),
  `:181` (link de senha) e `:185-199` (senha provisória). Dois cliques mandam dois e-mails de
  redefinição.
- **Papel sem nenhuma permissão.** `PainelInicial.tsx:125-135` mostra só "Olá", sem dizer o que
  fazer.
- **Atalhos da trilha incompletos.** Faltam os prefixos que `src/server/db/derivar.ts:299-318` grava:
  `bid.`, `deposito`, `saque.` e `custodia.` (`FiltroTrilha.tsx:18-26`).
- **Limite fixo no texto.** `Uso.tsx:270` escreve "300" à mão. O valor vem de
  `LIMITE_TRILHA_NA_TELA` (`src/server/admin/uso.ts:22`).
- **Terminologia.** O identificador interno `tokenConfigurado` aparece em `resultados.ts:97,102,104,116`
  e `Contabil.tsx:59,401,422`. E `entrada/README.md:16` diz "URL de retorno".

### Achados que ficam como decisão, sem código nesta branch

- **O mês da Central de Resultados fecha pelo relógio do servidor.** `periodoMensal` usa
  `new Date(ano, mes - 1, 1)` (`src/domain/dre.ts:170-193`), e `carregarPainelInicial` usa
  `getMonth()` (`resultados.ts:169-170`). Na Vercel o relógio é UTC: uma negociação às 22h de
  Brasília do dia 31 entra no mês seguinte na DRE e nos indicadores. É coerente com o RA-32
  (competência em UTC), mas diverge das horas exibidas, que estão em Brasília. Mudar isso mexe em
  `dre.ts`, nos relatórios e na competência, fora do território. Vai ao relatório como decisão para o
  Gabriel.
- **A tabela de membros vale sobre a lista fixa.** A regra está em `src/domain/admin/permissoes.ts:179-185`
  ("inclusive para rebaixar"). Quem tem `admin.membros` consegue desativar a linha do Gabriel se
  houver outro dev. É decisão registrada no RA-48; só registrar no relatório.

---

## Tarefas

### 0. Preparar o worktree

```powershell
git -C C:\dev\AureaCustodiaMVP fetch origin
```

```powershell
git -C C:\dev\AureaCustodiaMVP worktree add C:\dev\AureaCustodiaMVP-e5 -b exec/e5-qa-painel-resultados-equipe-cs-usuarios origin/main
```

```powershell
Set-Location C:\dev\AureaCustodiaMVP-e5; npm install; Test-Path .\src\app\painel\page.tsx
```

A última linha precisa responder `True`. Depois confira que o worktree está sobre o commit de base
(o plano mestre e o bloco `oxc` precisam existir):

```powershell
Test-Path .\docs\execucao-pendencias\00_PLANO_MESTRE.md; Select-String -Path .\vitest.config.mts -Pattern 'oxc'
```

A primeira linha precisa responder `True` e o `Select-String` precisa mostrar a linha com `oxc`. Se
qualquer um faltar, **pare**: a `origin/main` ainda não recebeu o commit de base do integrador. Não
edite `vitest.config.mts` para contornar; avise no relatório e espere. Com nenhum servidor de desenvolvimento deste worktree
rodando, rode `npm test` uma vez e anote o número de arquivos e de testes: é a linha de base do
relatório, e o esperado é **86 arquivos, 741 testes passando e 1 pulado**.

Se precisar do servidor de desenvolvimento em algum momento, use só a porta desta branch, e toda URL
local é `http://localhost:3105/...`:

```powershell
npm run dev -- -p 3105
```

Nunca a 3000, que é a da pasta principal do Gabriel. Pare o servidor antes de cada `npm test`.

### 1. JSX nos testes: já está na base (nenhuma edição)

- **Nada a fazer em configuração.** O commit de base da integração já trouxe
  `oxc: { jsx: { runtime: 'automatic' } }` em `vitest.config.mts`. O arquivo é `.mts`: **não crie
  `vitest.config.ts`**, que o Vitest leria antes e faria a suíte perder o alias `@` e o `include`.
  Nenhuma branch edita `vitest.config.mts`.
- **Como os testes novos usam:** o `include` continua `src/**/*.test.ts`, então os testes que
  desenham tela têm nome `*.test.ts`, montam elementos com `createElement` e desenham com
  `renderToStaticMarkup` de `react-dom/server`, como `src/components/admin/entrada/EntradaDoPainel.test.ts`.
- **Prova:** `git diff --name-only origin/main...HEAD` não lista `vitest.config.mts` nem
  `vitest.config.ts`.

### 2. Guarda de todas as páginas e da entrada `/painel`

Os testes descrevem o comportamento atual e passam sem mudar código de tela. Se algum falhar, é
defeito: corrija na página e descreva no relatório.

**`src/app/(admin)/admin/guarda-das-paginas.test.ts` (novo).**

- **Dublês:**
  - `vi.mock('server-only', () => ({}))`;
  - `@/server/admin/acesso`, com `membroDaPagina` e `ambienteAtual`;
  - os carregadores: `carregarPainelInicial`, `carregarFinanceiro`, `carregarContabil`, `carregarKpis`
    e `carregarUso` de `@/server/admin/resultados`; `carregarEquipe` de `@/server/admin/rbac`;
    `bancoConfigurado` e `executarNoBanco` de `@/server/db/client`; `carregarAtendimento` e
    `equipeParaAtribuir` de `@/server/admin/atendimento`;
  - `carregarListaDeUsuarios`, `carregarFicha`, `lerAba` e `ABAS_FICHA` de `@/server/admin/ficha`
    (copie as sete abas no dublê);
  - `next/navigation`, com `redirect` lançando `REDIRECT <destino>`, como em `acesso.test.ts:13-21`;
  - os componentes de tela, como funções que devolvem `null`, para que o teste compare `elemento.type`
    sem importar Server Actions: `Financeiro`, `Contabil`, `Indicadores`, `Uso`, `PainelEquipe`,
    `CaixaDeAtendimento`, `CriarUsuario`, `FiltroDeUsuarios`, `TabelaDeUsuarios`, `CabecalhoDaFicha`,
    `AcoesDaConta` e as sete `Aba*`. `SemPermissao` e `AvisoSemBanco` (`Blocos.tsx`) ficam reais.
- **Fábrica de membro:** `membro(permissoes: ChavePermissao[], variante = 'gestao')`, com `email`,
  `nome`, `papel` e `origem: 'tabela'`.
- **Casos** (nomes sugeridos):
  1. `sem a permissão, cada página devolve SemPermissao com as permissões do item de menu e não chama o carregador`.
     Tabela com `financeiro`, `contabil`, `kpis`, `uso`, `equipe`, `cs`, `usuarios` e ficha. Para cada
     uma, `membro([])`. Espere `elemento.type === SemPermissao`, `elemento.props.permissoes` igual a
     `permissoes` do item de `TODOS_ITENS` com o mesmo `href` (a ficha usa o item de `/admin/usuarios`)
     e o carregador com `not.toHaveBeenCalled()`.
  2. `com a permissão, a página chama o carregador uma vez e desenha a tela`. Mesma tabela, com o
     componente esperado em `elemento.type`, ou dentro do fragmento no caso de `usuarios` e da ficha.
  3. `uso: só admin.auditoria carrega a trilha sem o registro de uso, e o contrário`. Confira o
     terceiro argumento de `carregarUso`: `{ uso: false, trilha: true }` e `{ uso: true, trilha: false }`.
  4. `equipe: admin.papeis sozinho entra; sem banco não chama carregarEquipe`.
  5. `usuarios: CriarUsuario só com usuarios.criar; ficha: AcoesDaConta só com usuarios.editar`.
     Procure o tipo nos `props.children` do fragmento.
  6. `ficha de conta inexistente responde "Conta não encontrada" sem quebrar`. `carregarFicha`
     devolve `null`. Desenhe com `renderToStaticMarkup` e procure o texto e o e-mail decodificado de
     `alex%40testeaurea.com.br`.
  7. `/admin chama carregarPainelInicial com as flags das permissões`. Com `['bancada.ver']`, espere
     `{ resultados: false, operacao: true, sistema: false, auditoria: false }`; com a variante
     `desenvolvimento`, `sistema: true`.
  8. `/admin/resultados redireciona para o Financeiro`. Espere o erro `REDIRECT /admin/resultados/financeiro`.
  9. `sem sessão, a guarda interrompe antes de qualquer carregador`. `membroDaPagina` rejeita com
     `REDIRECT /painel`; a página rejeita com a mesma mensagem e nenhum carregador é chamado.

**`src/app/painel/entrada.test.ts` (novo).**

- **Dublês:** `server-only`; `@/server/session` com `getSessionEmail`; `@/server/admin/acesso` com
  `carregarMembro`; `next/navigation` com `redirect` lançando, e `useRouter` devolvendo
  `{ push, refresh }`; `@/server/actions/auth` com `login`, `loginWithGoogle` e `logout`.
- **Casos:**
  1. `membro da equipe logado vai direto para /admin`.
  2. `sem sessão, o formulário: "Entrar no painel" e "Entrar com Google", sem conta citada`.
     `getSessionEmail` devolve `null`; desenhe o elemento e procure os dois textos.
  3. `conta fora da equipe: diz qual é a conta e oferece sair`. Procure o e-mail e "Sair e entrar com
     outra conta".
  4. `sessão que falha ao ler conta como sem sessão`. `getSessionEmail` rejeita e a página desenha o
     formulário.

### 3. Leituras do servidor que decidem o que sai

**`src/server/admin/leituras-do-painel.test.ts` (novo).** Só dublês, **sem PGlite**. Os casos não
precisam de banco, cada instância nova do Postgres embutido pesa na suíte compartilhada
(`src/server/admin/testing/pglite.ts:9-12`), e `banco.test.ts` é compartilhado.

1. `ficha sem usuarios.dados_bancarios não carrega a chave dadosBancarios; com ela, carrega`.
   - Dublês: `@/server/state` (`getState` com uma conta que tem `cadastro.dadosBancarios.chavePix`),
     `@/server/db/client` (`bancoConfigurado: () => false`), `@/server/admin/acesso`
     (`podeAbrirPainelAdmin`), `@/server/shipping/retiradas`, `@/server/shipping/rastreios` e
     `./identidade` (`portaDeIdentidadeDoAmbiente` com `configurada: false`, `faltando: ['SUPABASE_SERVICE_ROLE_KEY']`).
   - Espere `'dadosBancarios' in conteudo === false` e `JSON.stringify(ficha)` sem o valor da chave
     Pix. Com a permissão, espere o objeto.
2. `leitura opcional que falha vira null e a ficha abre`. `bancoConfigurado: true` e `executarNoBanco`
   rejeitando; `carregarFicha(email, 'notas', membro)` resolve com `notas: null` e `conversas: null`.
   Silencie `console.error` com `vi.spyOn`.
3. `painel inicial: sem resultados.ver não lê a DRE; DRE que falha vira resultados null e o resto segue`.
   Dublês de `dreCompleta` (`@/server/relatorios/dados`), `getState`, `repositorioRetiradas`,
   `@/server/db/client` e `contarEventosDesde` / `listarTrilhaDoPainel`. Não edite nada de
   `src/server/relatorios/`, só use dublê.
4. `equipeParaAtribuir: membro inativo fica fora, e-mail do ambiente desativado na tabela fica fora, banco que falha devolve o ambiente`.
5. `carregarAtendimento: sem banco, semBanco; tabela cs_conversas ausente, semTabelas; incluirCliente false não lê o estado`.

### 4. Formatos e navegação

- **`src/components/admin/formatos.test.ts` (novo):**
  1. `dataHora e data no dia de Brasília mesmo com o instante já no dia seguinte em UTC`.
     `Date.UTC(2026, 8, 1, 2, 30)` dá `31/08/2026 23:30` e `31/08/2026`.
  2. `horaOuData: hoje mostra a hora, ontem mostra dd/mm, com a virada à meia-noite de Brasília`.
  3. `dinheiro(-0)` é igual a `brl(0)`; `dinheiro(null)` é `—`.
  4. `percentual(1250)` é `12,5%` e `percentual(null)` é `—`; `duracao` e `nomeDoMes('2026-09')` dão
     `setembro de 2026`; uma chave inválida volta igual.
- **`src/components/admin/navegacao.test.ts` (novo):**
  1. `itemDaRota`: `/admin` dá Painel; `/admin/resultados/kpis` dá Indicadores;
     `/admin/usuarios/alex%40x.com` dá Usuários; `/admin/resultadosx` não casa com Resultados.
  2. `permiteItem`: item sem permissão aparece para qualquer membro; item com duas permissões aparece
     com uma delas.
  3. `todo href do menu é único`.

### 5. Atendimento: recusa, envio único, rolagem e cartão

**Arquivos:** `src/components/admin/cs/CaixaDeAtendimento.tsx`, `Conversa.tsx` e `CartaoDoCliente.tsx`.

1. **Pausa depois de falhas seguidas.** Exporte de `CaixaDeAtendimento.tsx` a constante
   `FALHAS_PARA_PAUSAR = 3` e a função pura `deveContinuarAtualizando(falhasSeguidas: number): boolean`.
   - Em `atualizar`, conte as respostas `ok: false` e as exceções seguidas, e zere a contagem num
     `ok: true`.
   - Na terceira, pare o `setInterval` e mostre acima das colunas uma `note` com a última mensagem de
     erro e o botão **Tentar de novo**. O botão zera a contagem, religa a volta e chama `atualizar(true)`.
   - **Por quê:** a recusa continua indo para a trilha, e isso é desejado (`acesso.ts:174-194`). O que
     some é a repetição sem fim. Não é trava: a tela e as ações continuam, só a atualização automática
     espera um clique.
   - **Não mude** `permissaoParaAcao` nem `atualizarAtendimentoNoPainel`.
2. **Envio único.** Em `Responder.enviar()`, primeira linha: `if (ocupado) return`. Não há teste
   automático (é interação); o passo fica no roteiro manual.
3. **A caixa rola por dentro.** Troque `fim.current?.scrollIntoView(...)` (`Conversa.tsx:64-66`) por
   uma `ref` no `div.adm-cs-mensagens` com `el.scrollTop = el.scrollHeight`. A página não se move.
4. **Abrir conversa leva até ela.** Com as colunas empilhadas, ao trocar `conversaId`,
   `CaixaDeAtendimento` rola `div.adm-cs-thread` até o topo **só se**
   `getBoundingClientRect().top > window.innerHeight / 2`. Sem media query e sem teste de largura: a
   conferência fica no roteiro.
5. **Cartão com conta que não existe.** `CaixaDeAtendimento` passa `clienteCarregado={cliente.de === aberta?.conversa.id}`.
   Com `clienteCarregado && !cliente`, `CartaoDoCliente` mostra "Não há conta com o e-mail X nesta
   base." e o botão **Desvincular conta** (com `cs.responder`).

**Teste `src/components/admin/cs/caixa.test.ts` (novo)**, com `renderToStaticMarkup`, `ToastProvider`
e `AdminProvider`. Dublês de `next/navigation` (`useRouter`, `usePathname`) e de
`@/server/actions/admin/cs`.

1. `deveContinuarAtualizando: continua até duas falhas seguidas e para na terceira`.
2. `cartão: ficha carregada e nula diz que a conta não existe; ainda não carregada diz carregando`.
3. `sem cs.responder não há caixa de resposta, nota, nova conversa nem seletor de situação`.
   Desenhe `Conversa` e `ListaDeConversas` e confira que não há `id="cs-resposta"`, `id="cs-nota"`,
   "Nova conversa" nem `id="cs-situacao"`.
4. `sem WhatsApp conectado, a conversa avisa que a resposta fica só no painel`.

### 6. Data do extrato na ficha em Brasília

- **Arquivo:** `src/components/admin/usuarios/AbaFinanceiro.tsx:72`. Troque `{l.dateBR}` por
  `{data(l.date)}`. **Não edite** `src/domain/statement.ts` nem `src/domain/dates.ts`: o extrato do
  cliente roda no navegador, e o arquivo exportado é contrato.
- **Teste** em `src/components/admin/estados-vazios.test.ts` (tarefa 9):
  `extrato da ficha mostra o dia de Brasília`. Monte `AbaFinanceiro` com `podeEditar: false` (sem
  provedor), uma linha de extrato com `date: Date.UTC(2026, 8, 1, 1, 0)` e `dateBR: '01/09/2026'`.
  O HTML contém `31/08/2026` e não contém `01/09/2026`. Dublê de `@/server/actions/admin/usuarios`.

### 7. Webhook com Evolution sem segredo: 503

- **Arquivo:** `src/app/api/webhooks/whatsapp/route.ts`. No passo 1, responda 503 também quando
  `provedor.pendencias.length > 0`, com a mesma frase "Falta: …". Atualize o comentário do topo: sem
  segredo, ninguém autentica, e o 503 guarda a mensagem para o reenvio.
- **Por quê:** o 401 fica para credencial errada, que é ataque ou configuração trocada. Falta de
  variável é o caso "ainda não configurado", o mesmo do passo 1.
- **Teste** em `src/app/api/webhooks/whatsapp/route.test.ts` (acrescentar caso):
  `Evolution sem WHATSAPP_WEBHOOK_SECRET: 503 dizendo o que falta, sem conferir assinatura`.
  Provedor dublê com `entregaDeVerdade: true` e `pendencias: ['WHATSAPP_WEBHOOK_SECRET']`.
- **README:** atualizar `src/app/api/webhooks/whatsapp/README.md` com a tabela de respostas.

### 8. Textos de indisponível e terminologia

1. **Troque cada "Disponível depois da X"** (lista no item 8 dos defeitos) por um texto que diga o
   estado real:
   - sem banco: `Existe só com banco configurado.`;
   - com banco: `Indisponível agora: a tabela <nome> (migration <0NN>) não respondeu. Se continuar, rode npm run db:check.`

   Os pares são `aceites_documentos`/016, `ofertas_historico`/015 e `recebimentos_gateway`/017. Em
   `Financeiro.tsx:110`, use `Indisponível agora: o relatório de recebimentos do gateway não respondeu.`.
   `Indicadores.tsx` já recebe `semBanco`; `AbaMercado` e `AbaCadastro` também.
2. **Planos de custódia:** em `ficha.ts:287` e `resultados.ts:137-138`, leia `state.planosCustodia ?? []`
   sem a conversão de tipo. O campo existe em `AppState`. Apague os comentários "entra com a B2" e
   "disponível depois da B3" (`resultados.ts:58-63`).
3. **Identificador:** renomeie `tokenConfigurado` para `chaveDeLeituraConfigurada` em
   `src/server/admin/resultados.ts` e `src/components/admin/resultados/Contabil.tsx`. **Mantenha** o
   parâmetro `token=` da URL de exemplo e o nome `AUREA_RELATORIOS_TOKEN`: são o contrato de
   `docs/API_RELATORIOS.md`, e as fórmulas `IMPORTDATA` do contador dependem deles.
4. `src/components/admin/entrada/README.md:16` e `src/server/auth/destino.ts:6`: **já corrigidos no commit de
   base** ("endereço de volta"). Só confira que a varredura da tarefa 8.6 não os acusa.
5. **Limite da trilha:** em `DadosUso` (`resultados.ts`), acrescente `limiteTrilha: number`
   (`LIMITE_TRILHA_NA_TELA`) e use em `Uso.tsx:270` com `numero(...)`.
6. **Teste `src/components/admin/textos-do-painel.test.ts` (novo).** Lê com `node:fs` os arquivos
   `.ts`, `.tsx` e `.md` do território, exceto `*.test.ts`:
   - `src/app/(admin)/admin/{page.tsx,error.tsx}` e `src/app/(admin)/admin/{resultados,equipe,cs,usuarios}/`;
   - `src/app/painel/`;
   - `src/components/admin/{resultados,equipe,inicio,cs,usuarios,entrada}/`;
   - os nove arquivos soltos de `src/components/admin/` (lista conferida no disco em 15/09/2026),
     exatamente estes: `AdminProvider.tsx`, `AdminSidebar.tsx`, `AdminTopbar.tsx`, `Blocos.tsx`,
     `BotaoAcao.tsx`, `SeletorPeriodo.tsx`, `formatos.ts`, `navegacao.tsx` e `README.md`;
   - os onze de `src/server/admin/` desta branch, exatamente estes: `acesso.ts`, `atendimento.ts`,
     `auditar.ts`, `contabil.ts`, `cs.ts`, `ficha.ts`, `identidade.ts`, `rbac.ts`, `resultados.ts`,
     `uso.ts` e `usuarios.ts`. Ficam **fora** da varredura: `situacao.ts`, `README.md`,
     `ATALHOS.md`, `testing/` e os arquivos da E6 (`bancada.ts`, `configuracao.ts`, `logistica.ts`,
     `moedas.ts`, `portas.ts`, `video.ts`);
   - `src/server/actions/admin/{contabil,equipe,cs,usuarios}.ts`;
   - `src/lib/mensageria/` e `src/app/api/webhooks/whatsapp/`.

   Casos:
   1. `nenhum texto diz "Disponível depois da"`.
   2. `nenhuma palavra proibida`. Regex sem diferenciar maiúsculas:
      `\b(nft|cripto\w*|investiment\w*|investidor\w*|corretora\w*|rentabilidade|retorno)\b`,
      `ativos? digita(l|is)` e `token`. Para `token`, as exceções são as linhas que contêm
      `AUREA_RELATORIOS_TOKEN`, `&token=`, `autoRefreshToken` ou `API_RELATORIOS.md` (o comentário de
      `Contabil.tsx` que explica o contrato).
      O teste imprime arquivo e linha de cada ocorrência. **Não** inclua "ativo" solto: é a situação
      `'ativo'` de membro e de recibo.

### 9. Estados vazios, erro e acessibilidade

1. **Painel inicial sem permissão nenhuma.** Em `PainelInicial.tsx`, quando nenhuma seção existe e
   `atalhos` está vazio, mostre uma `div.empty`: "Seu papel ainda não tem nenhuma permissão. Quem
   administra a equipe pode incluir as áreas em Equipe e papéis."
2. **Botões ocupados.** Em `AcoesDaConta.tsx`, os blocos Inadimplência, Situação e Senha ganham
   `ocupado`, com `disabled` enquanto a ação roda, como `AjustarSaldo` já faz.
3. **Barra superior** (`AdminTopbar.tsx`):
   - interruptor de tema com `role="switch"`, `aria-checked={dark}`, `aria-label="Modo escuro"`,
     `tabIndex={0}` e teclado (Enter e Espaço);
   - "Sair" com `role="button"`, `tabIndex={0}` e o mesmo teclado. Mantenha as classes `.switch` e
     `.logout`: `responsive.css:64,71` depende delas;
   - `aria-hidden="true"` no `svg` do botão de menu.
4. **Menu lateral** (`AdminSidebar.tsx:85,95`): Espaço também aciona. Use `preventDefault` para a
   página não rolar.
5. **Abas do Contábil** (`Contabil.tsx:85-97`): troque `role="tablist"`, `role="tab"` e `aria-selected`
   por `role="group"` com `aria-label` e `aria-pressed` em cada botão, o mesmo padrão de
   `ListaDeConversas.tsx:59-71`.
6. **Filtro da trilha** (`FiltroTrilha.tsx`): `role="group"` e `aria-pressed` nos atalhos, e acrescente
   `Ofertas de compra` (`bid.`), `Depósitos` (`deposito`), `Saques` (`saque.`) e `Custódia`
   (`custodia.`).

**Testes.**

- **`src/components/admin/estados-vazios.test.ts` (novo):**
  1. `painel inicial de papel sem permissão explica o que fazer`;
  2. `lista de usuários vazia diz "Nenhuma conta com este filtro."`;
  3. `Uso sem banco mostra o aviso e o seletor de período` (dublê de `next/navigation`);
  4. `ErroDoPainel mostra o código do log quando há digest`;
  5. o caso de data da tarefa 6.
- **`src/components/admin/acessibilidade.test.ts` (novo):**
  1. `topbar: tema é switch com aria-checked e Sair é botão focável`. Envolva com `ThemeProvider`,
     `SidebarProvider`, `ToastProvider` e `AdminProvider`, com dublê de `next/navigation` e de
     `@/server/actions/auth`. Confira se `ThemeProvider` exige algo no Node e mocke o que for preciso.
  2. `abas do Contábil são botões com aria-pressed, sem role tab`.
  3. `atalhos da trilha trazem Ofertas de compra, Depósitos, Saques e Custódia`.

### 10. Quitar fatura: trilha que falha não vira falha da quitação

- **Arquivo:** `src/server/actions/admin/usuarios.ts`, só `quitarFaturaComSaldoNoPainel` (`:142-165`).
  Envolva o `registrarAcaoAdmin` em `try/catch`, com `console.error('[admin] quitação feita, trilha não gravada:', err)`,
  e responda `ok: true` com "Fatura X quitada com o saldo da conta. A linha da trilha não foi gravada;
  veja o log.".
- **Teste `src/server/actions/admin/acoes-c1-c2.test.ts` (novo).** Copie o bloco de dublês de
  `acoes.test.ts:11-136`, só os módulos que `usuarios.ts` importa.
  1. `quitação feita e trilha que falha: responde ok e avisa da trilha`.
  2. `quitação recusada pela frente B não grava trilha` (repete o contrato atual).
- **RA-54** (tarefa 11) registra a trilha fora da transação, como no RA-45.

### 11. Documentação e registro

- **READMEs:** `src/components/admin/cs/README.md` (pausa da atualização, rolagem, cartão sem conta),
  `src/components/admin/usuarios/README.md` (data do extrato), `src/components/admin/resultados/README.md`
  (textos de indisponível, identificador), `src/app/api/webhooks/whatsapp/README.md` (503) e
  `src/app/(admin)/README.md`, só na seção de testes ou nas linhas das rotas C1/C2: diga onde está a
  guarda testada. Em `src/components/admin/README.md`, se houver linha sobre os testes novos, ela
  entra **na tabela "Conexões"**, nunca no fim do arquivo nem na seção "O painel antigo" (a E3
  reescreve essa seção).
- **`RISCOS_ASSUMIDOS.md`** (só as linhas do RA-54):
  - linha do índice
    `| **RA-54** | Telas do painel (C1 e C2) testadas por renderização no servidor, sem navegador; quitação de fatura com a trilha em transação separada | 🟡 | \`src/app/(admin)/\`, \`src/components/admin/\`, \`src/server/actions/admin/\` |`,
    em ordem numérica, logo depois da linha do maior número que já existe na base (RA-48);
  - seção `# RA-54 …` no corpo, também logo depois da seção do RA-48, com o bloco padrão:
    `Decidido em: dd/09/2026 · Dono: Gabriel · Pasta: …`;
  - conteúdo:
    - os testes desenham o HTML no Node (`renderToStaticMarkup`), sem DOM. Clique, teclado, rolagem e
      a largura de 375 px ficam no roteiro manual do relatório E5;
    - a linha `admin.usuarios.quitar_fatura` é gravada depois da liquidação da frente B, noutra
      transação; se falhar, o erro vai para o log e a tela avisa;
  - **como se paga:** teste de navegador para o painel antes de cliente real; liquidação parametrizada
    pelo `Executor`, para a trilha entrar na mesma transação.
  - Outras branches também inserem RA novo no mesmo ponto. O conflito nesse arquivo é esperado e a
    **integração** resolve pela união, em ordem numérica; não tente prever nem reordenar.
- **`src/server/admin/ATALHOS.md`:** seção `## RA-54 🟡 — …` com a mesma nota curta, logo depois da
  seção RA-48 (que termina com o `---` da linha 41 na base) e **antes de `## RA-41`**. Esse trecho
  ninguém mais toca. Não insira perto de "O que NÃO é atalho nesta pasta", que fica logo depois do
  RA-46 editado pela E6.

### 12. Ciclo, território e relatório

- **Antes de cada push:**

```powershell
npm run typecheck; if ($?) { npm run lint }; if ($?) { npm test }; if ($?) { npm run build }
```

- **Território:**

```powershell
git diff --name-only origin/main...HEAD
```

  Cada linha precisa estar na tabela "Pode editar" ou "Compartilhado".
- **Contagem da suíte:** com o servidor de desenvolvimento deste worktree parado, o `npm test` final
  precisa contar 96 arquivos (86 da base mais os 10 novos). Se contar menos, um arquivo "sumiu": é
  worker morto, não teste verde. Rode esse arquivo sozinho e registre no relatório qual foi e o
  resultado:

```powershell
npx vitest run <arquivo>
```

- Escreva o relatório (seção "Entrega").

---

## Território

| Pode editar | Observação |
|---|---|
| `src/app/(admin)/admin/page.tsx`, `src/app/(admin)/admin/error.tsx` | |
| `src/app/(admin)/admin/resultados/**`, `equipe/**`, `cs/**`, `usuarios/**` | inclui os README das rotas |
| `src/app/(admin)/admin/guarda-das-paginas.test.ts` | novo |
| `src/app/painel/**` | `entrada.test.ts` novo; o comportamento da página não muda |
| `src/components/admin/{resultados,equipe,inicio,cs,usuarios,entrada}/**` | inclui os README e `cs/caixa.test.ts` novo |
| `src/components/admin/AdminSidebar.tsx`, `AdminTopbar.tsx` | acessibilidade; classes mantidas |
| `src/components/admin/formatos.test.ts`, `navegacao.test.ts`, `estados-vazios.test.ts`, `textos-do-painel.test.ts`, `acessibilidade.test.ts` | novos |
| `src/server/admin/{rbac,auditar,contabil,uso,resultados,cs,ficha,atendimento}.ts` | |
| `src/server/admin/identidade.ts` | nenhuma tarefa pede edição. Se um teste exigir, manter intactos `portaDeIdentidadeDoAmbiente`, a interface `PortaDeIdentidade` e o bloqueio por `ban_duration` em `bloquear` (é ele que faz o Supabase recusar o login com `user_banned`, que a E1 trata): a E1 depende dos dois |
| `src/server/admin/leituras-do-painel.test.ts` | novo; sem PGlite |
| `src/server/actions/admin/{contabil,equipe,cs}.ts` | |
| `src/server/actions/admin/acoes-c1-c2.test.ts` | novo |
| `src/app/api/webhooks/whatsapp/**` | `route.test.ts`: só acrescentar caso |
| `src/lib/mensageria/**` | nenhuma tarefa exige; só se um teste revelar defeito |
| `docs/execucao-pendencias/relatorios/E5.md` | novo; `docs/execucao-pendencias/README.md` e `relatorios/README.md` já existem na base; a branch só cria o próprio `relatorios/E5.md` |

| Compartilhado | Regra de convivência |
|---|---|
| `src/components/admin/Blocos.tsx`, `BotaoAcao.tsx`, `AdminProvider.tsx`, `SeletorPeriodo.tsx`, `formatos.ts`, `navegacao.tsx` | as telas C3 da E6 usam. Só acréscimo: nada de mudar assinatura nem comportamento de `Cartao`, `SemPermissao`, `Indisponivel`, `AvisoSemBanco`, `BotaoAcao`, `SeletorPeriodo`, `useAdmin`, `run` ou das funções de `formatos.ts`. Em `navegacao.tsx`, não tocar os itens Bancada, Moedas, Logística e Configuração |
| `src/server/admin/acesso.ts` | `membroDaPagina`, `ENTRADA_DO_PAINEL`, `carregarMembro`, `podeAbrirPainelAdmin` e `permissaoParaAcao` com a mesma assinatura e o mesmo comportamento: a E1 e a entrada `/painel` dependem deles. Nenhuma tarefa pede edição |
| `src/server/admin/acesso.test.ts` | só acrescentar caso no fim; nenhum existente muda |
| `src/server/admin/usuarios.ts`, `src/server/actions/admin/usuarios.ts` | na action, só `quitarFaturaComSaldoNoPainel`. Não tocar `redefinirSenha*` nem `mudarSituacaoDaConta*`: a E1 fecha RA-43 e RA-44 com base neles |
| `src/server/admin/situacao.ts` | só leitura: a E1 importa `contaDesativada` e depende do contrato |
| `src/styles/admin.css` | só dentro dos blocos existentes Casco (`:17-23`), CS (`:110-144`) e Ficha (`:145-154`, até `.adm-topo-ficha h2`). Nada novo entre o fim da Ficha e o marcador `/* === C3 ·` (`:157`), nem depois dele: dali em diante é da E6, cujo teste lê a partir do marcador. Nunca no fim do arquivo. Sem media query, como diz o topo do arquivo |
| `src/app/(admin)/README.md` | só as linhas das rotas C1/C2 e de `/painel`, e uma linha sobre `guarda-das-paginas.test.ts` |
| `src/components/admin/README.md` | a E3 reescreve a seção "O painel antigo", a última do arquivo; a E5 só acrescenta, se houver, uma linha sobre os testes novos **na tabela "Conexões"**, nunca no fim do arquivo |
| `RISCOS_ASSUMIDOS.md` | só a linha do índice e a seção do RA-54, em ordem numérica logo depois do RA-48 (o maior da base). Não reordenar nem reformatar. Conflito com outras branches é esperado e a integração resolve pela união |
| `src/server/admin/ATALHOS.md` | só a seção RA-54, logo depois da seção RA-48 e antes de `## RA-41`. A E1 edita RA-43 e RA-44, a E6 edita RA-45 e RA-46 e pode acrescentar RA-55 |

| Não pode editar | De quem é / por quê |
|---|---|
| `src/app/(admin)/admin/{bancada,moedas,logistica,configuracao}/**`, `src/components/admin/{bancada,moedas,logistica,configuracao}/**`, `src/server/admin/{bancada,moedas,logistica,configuracao,video,portas}.ts`, `src/server/actions/admin/{bancada,config}.ts`, `src/server/config/**`, `src/domain/admin/{bancada,caixas,catalogo,configuracao,documentos,integracoes,logistica,moedas}.ts` | E6 |
| `src/app/(admin)/admin/layout.tsx` | casco de todas as telas; nenhuma tarefa precisa |
| `vitest.config.mts` (e não criar `vitest.config.ts`) | o bloco `oxc` já está na base pelo commit da integração; nenhuma branch edita |
| `src/server/actions/auth.ts`, `src/app/entrar/**`, `src/server/auth/**` (inclusive `destino.ts`), `src/server/session.ts`, `src/app/(app)/layout.tsx`, `src/app/api/state/**`, `src/server/db/diff.ts` | E1 |
| `src/server/payments/**`, `src/server/estacao/**`, `src/server/taxas/**` | E2 |
| `src/components/relatorios/**`, `src/server/actions/contabil.ts`, `src/server/relatorios/**` (inclusive `acesso-painel.test.ts`), `src/app/api/relatorios/**` | E3. Nos testes da E5, `dreCompleta` só entra como dublê |
| `src/server/custodia/**`, `src/server/actions/plano-custodia.ts`, `src/domain/custody.ts`, telas `/conta/extrato` e `/envios` | E4 |
| `src/server/actions/admin/acoes.test.ts`, `src/server/admin/banco.test.ts`, `src/server/db/db.test.ts` | compartilhados; testes novos vão em arquivo novo |
| `src/domain/admin/permissoes.ts` e o resto de `src/domain/admin/**` | regra pura compartilhada com E6; nada aqui precisa mudar |
| `src/domain/{constants,fees,market,types,dre,dates,statement,kpis,hash,ledger,analise}.ts`, `src/server/store/types.ts`, `estacao/CONTRATO.md` | superfície protegida, fórmula de hash e contrato do extrato |
| `src/server/db/migrations/**`, `src/server/db/repositories/**` | nenhuma migration; 028 fica reservada sem uso |
| `docs/finalizacoes/**`, `docs/publish_docs/**` | E7 e integração |

---

## Testes exigidos

| Arquivo | Novo/alterado | O que prova |
|---|---|---|
| `src/app/(admin)/admin/guarda-das-paginas.test.ts` | novo | as dez páginas C1/C2 recusam sem permissão **antes** de carregar dado; a permissão pedida é a do item de menu; `uso` e `equipe` aceitam uma de duas; `CriarUsuario` e `AcoesDaConta` dependem da permissão; conta inexistente; `/admin` passa as flags certas; redirecionamentos |
| `src/app/painel/entrada.test.ts` | novo | membro vai para `/admin`; sem sessão, formulário; conta fora da equipe, explicação com o e-mail; falha de sessão conta como sem sessão |
| `src/server/admin/leituras-do-painel.test.ts` | novo | dados bancários não carregam sem permissão; leitura opcional que falha não derruba a ficha; painel inicial lê só o que o papel alcança e sobrevive à DRE falhando; `equipeParaAtribuir`; `carregarAtendimento` sem banco e sem tabela |
| `src/components/admin/formatos.test.ts` | novo | data e hora no dia de Brasília; `horaOuData` na virada; `-0`; percentual, duração e mês |
| `src/components/admin/navegacao.test.ts` | novo | rota mais longa vence; prefixo sem barra não casa; `permiteItem`; `href` únicos |
| `src/components/admin/cs/caixa.test.ts` | novo | pausa na terceira falha; cartão "conta não existe" × "carregando"; leitura sem `cs.responder`; aviso sem WhatsApp |
| `src/app/api/webhooks/whatsapp/route.test.ts` | alterado (caso novo) | Evolution sem segredo responde 503 com o nome da variável e não confere assinatura |
| `src/components/admin/estados-vazios.test.ts` | novo | papel sem permissão; lista vazia; Uso sem banco; tela de erro com código; extrato em Brasília |
| `src/components/admin/textos-do-painel.test.ts` | novo | nenhum "Disponível depois da"; nenhuma palavra proibida, com as exceções de contrato |
| `src/components/admin/acessibilidade.test.ts` | novo | tema como `switch` e Sair como botão focável; abas do Contábil com `aria-pressed`; atalhos novos da trilha |
| `src/server/actions/admin/acoes-c1-c2.test.ts` | novo | quitação feita com trilha que falha responde ok e avisa; recusa da B não grava trilha |
| `src/server/admin/acesso.test.ts`, `src/server/auth/destino.test.ts` | sem alteração | a entrada `/painel` e a volta do login para `/admin` continuam |

---

## Regras que valem nesta branch

- **Palavras proibidas** em texto de tela, código lido por terceiros, commit e documento: token, NFT,
  cripto, ativo digital, ativo, investimento, investidor, corretora, rentabilidade, retorno. O termo
  é "recibo"; o objeto é "moeda" ou "item".
  - Exceções que ficam: o nome `AUREA_RELATORIOS_TOKEN` e o parâmetro `token` da API de relatórios
    (contrato), e a situação `'ativo'` gravada no banco para membro e recibo.
  - O sujeito da frase decide: nunca a Áurea ou o recibo.
- **Nenhuma trava que o Gabriel não pediu.** Nada de feature flag, gate de ambiente, confirmação
  obrigatória ou modo fechado. Falha de leitura cai no comportamento padrão: a ficha abre sem o bloco
  e a caixa de CS mostra o que tem. A pausa da tarefa 5 não bloqueia nada, só espera um clique para
  voltar a atualizar sozinha.
- **Nada tranca o Gabriel nem a equipe para fora.** Nenhuma checagem nova em `src/server/admin/`
  recusa membro. Checagem que falha responde "liberado". `membroDaPagina`, `carregarMembro`,
  `EMAILS_FIXOS_DA_EQUIPE` e a entrada `/painel` ficam como estão.
- **Dinheiro sempre em centavos inteiros.** `dinheiro()` e `brl()` são a única conversão para texto.
- **A fórmula do hash não muda:** a da análise (os quinze campos de `estacao/CONTRATO.md` e o vetor de
  `src/domain/analise.test.ts`) e a do ledger (`src/domain/hash.ts`, `ledger.ts`).
- **Nada de `@/server/*` em Client Component.** Arquivo com `'use client'` só importa de `@/server/`
  Server Action (`@/server/actions/**`, arquivos `'use server'`) e `import type`. Nunca valor de
  `@/server/admin/*`, `@/server/db/*` ou `@/lib/mensageria`. Arquivo `'use server'` só exporta função
  assíncrona: constante compartilhada entre action e tela mora no componente ou em `src/domain/`.
- **Toda Server Action de `src/server/actions/admin/` confere a permissão por conta própria** e grava
  `audit_log` como `admin.<area>.<verbo>`. A tarefa 10 não remove a gravação: só impede que a falha
  dela desminta a quitação.
- **Tabelas de trilha só recebem INSERT:** `audit_log`, `config_historico`, `eventos_uso`, `cs_notas`
  e `admin_notas_usuario`.
- **Comentários em português explicando o porquê.** Pasta nova ganha README.md (nenhuma tarefa cria
  pasta de código). Atalho tomado entra em `RISCOS_ASSUMIDOS.md` **e** no `ATALHOS.md` da pasta, no
  mesmo commit (RA-54).
- **CSS global por área, sem media query em `admin.css`,** alvo de toque de 44 px, e `responsive.css`
  continua o último import.
- **Não mexer em DNS, e-mail ou domínio. Não criar conta em serviço externo nem gerar credencial.**
  Nenhuma variável nova é necessária nesta branch.
- **A branch não faz merge na `main`.** Antes de cada push: `npm run typecheck`, `npm run lint`,
  `npm test`, `npm run build`.
- **Ambiente:** Windows, PowerShell 5.1 (sem `&&`: use `;` e `if ($?)`). Repositório público de
  propósito.
- **Porta e suíte.** Servidor de desenvolvimento só com `npm run dev -- -p 3105`, e toda URL local é
  `http://localhost:3105`; nunca a 3000. A suíte completa roda com esse servidor parado, e a contagem
  de arquivos se compara com a base (86) mais os 10 novos desta branch.
- **Conferência de tela logada** é por teste automatizado (página desenhada com sessão simulada por
  dublê) ou fica no roteiro do Gabriel. O agente não digita senha em tela de login e nunca cria rota,
  script ou cookie que pule autenticação.

---

## O que NÃO fazer

- Não mudar o que `/admin` faz com quem não é membro, nem o destino `/painel`, nem o cookie de destino
  do login.
- Não mexer em `src/domain/dre.ts` para fechar o mês em Brasília. É decisão (ver "Achados"), e o
  arquivo alimenta os relatórios e a competência.
- Não reescrever `acoes.test.ts` nem `banco.test.ts`, e não abrir PGlite novo.
- Não trocar `permissaoParaAcao` para deixar de gravar a recusa: a trilha da recusa é desejada. O
  conserto é na tela que repete.
- Não renomear o parâmetro `token` de `/api/relatorios` nem a variável `AUREA_RELATORIOS_TOKEN`.
- Não transformar as classes do painel em CSS Modules, nem pôr media query em `admin.css`.
- Não acrescentar confirmação ("tem certeza?") em ação da ficha ou da equipe. O painel foi desenhado
  sem ela (`PainelEquipe.tsx:15-17`, `AcoesDaConta.tsx:8-10`).
- Não criar `docs/execucao-pendencias/README.md` nem `relatorios/README.md` (já existem na base; a
  branch só cria o próprio `relatorios/E5.md`), e não
  editar `docs/finalizacoes/PENDENCIAS_AGENTE_C.md`.
- Não "aproveitar" para refatorar telas C3, relatórios ou autenticação.
- Não usar a migration 028 sem necessidade real. Se usar, o relatório explica.

---

## Entrega

- **Commits** (mensagem sem acento é aceitável; sem palavra proibida; termine com a linha
  `Co-Authored-By` do agente, se houver). Sugestão de sequência:
  1. `Testes do painel: guarda de todas as paginas C1/C2 e da entrada /painel`
  2. `Testes do painel: ficha sem dados bancarios sem permissao, painel inicial, equipe, formatos e navegacao`
  3. `CS: atualizacao pausa apos falhas seguidas, envio unico, rolagem na caixa e cartao sem conta`
  4. `Webhook do WhatsApp: Evolution sem segredo responde 503 para o reenvio`
  5. `Ficha e resultados: extrato no dia de Brasilia, avisos de indisponivel corretos, chaveDeLeituraConfigurada`
  6. `Painel: acessibilidade da barra, abas e filtro; papel sem permissao; botoes ocupados`
  7. `Quitar fatura: trilha que falha nao desmente a quitacao; RA-54`
  8. `Relatorio da E5`
- **Push da branch**, sem merge:

```powershell
git push -u origin exec/e5-qa-painel-resultados-equipe-cs-usuarios
```

- **Relatório `docs/execucao-pendencias/relatorios/E5.md`**, com:
  - **O que foi feito:** cada tarefa, com os arquivos e o motivo em uma frase. Diga "RA-54 usado" e
    "migration 028 não usada".
  - **Testes:** linha de base (arquivos e testes antes; o esperado é 86 arquivos, 741 testes e 1
    pulado) e resultado final com o servidor de desenvolvimento parado (96 arquivos esperados); a
    lista de arquivos novos com os nomes dos casos; e, se algum arquivo sumiu da contagem, qual foi e
    o resultado dele rodado sozinho.
  - **O que foi conferido e como:** a saída do ciclo; `git diff --name-only origin/main...HEAD`; os
    casos de `acesso.test.ts` e `destino.test.ts` intactos; a varredura de textos.
  - **Riscos e decisões:**
    - RA-54;
    - o mês que fecha em UTC (achado, com `dre.ts:170-193`);
    - a tabela de membros acima da lista fixa (RA-48);
    - "anotar usuário" exige `usuarios.editar`, então o atendimento sem essa permissão não anota na
      ficha;
    - RA-40, RA-41, RA-42 e RA-48 conferidos, sem mudança;
    - aviso à integração: `PENDENCIAS_AGENTE_C.md`, P-C1-02, passo 4, ainda diz que `/admin` manda
      para `/inicio`, e o certo agora é `/painel`.
  - **Passos manuais:** o roteiro abaixo, copiado.
  - **Última linha:** `E5 pronta para integração — <hash do último commit de código>`.

---

## Passos manuais que sobram para o Gabriel

Nenhum DNS ou conta em serviço novo. A única variável envolvida é a `SUPABASE_SERVICE_ROLE_KEY`, que
o roteiro C usa (veja o pré-requisito lá). Sobra a **conferência logada**, depois que a
integração publicar a `main` com a E5. O endereço é o de produção usado em
`docs/finalizacoes/PENDENCIAS_AGENTE_C.md`; o domínio próprio não está publicado, use só o endereço da Vercel. As senhas são
digitadas por você.

**A. Entrada do painel**

1. Numa janela anônima do Chrome, abra:

```
https://aurea-custodia-mvp.vercel.app/painel
```

2. Clique **Entrar com Google** e use `gabriel.silva@aureacustodia.com.br`. Esperado: abre `/admin`
   com "Olá, Gabriel" (ou o nome cadastrado) e o seu papel.

**B. Telas, no computador**

3. Abra cada endereço e confira que carrega sem a caixa "Não foi possível carregar esta tela agora":

```
https://aurea-custodia-mvp.vercel.app/admin/resultados/financeiro?ano=2026&mes=9
```

```
https://aurea-custodia-mvp.vercel.app/admin/resultados/contabil?aba=aliquotas
```

```
https://aurea-custodia-mvp.vercel.app/admin/resultados/kpis
```

```
https://aurea-custodia-mvp.vercel.app/admin/resultados/uso
```

```
https://aurea-custodia-mvp.vercel.app/admin/equipe
```

```
https://aurea-custodia-mvp.vercel.app/admin/cs
```

```
https://aurea-custodia-mvp.vercel.app/admin/usuarios
```

```
https://aurea-custodia-mvp.vercel.app/admin/usuarios/alex%40testeaurea.com.br?aba=financeiro
```

4. Na última, nenhum bloco diz "Disponível depois da". Se um bloco disser "Indisponível agora", anote
   qual.
5. Na aba **Uso**, a fila de atalhos da trilha mostra também **Ofertas de compra**, **Depósitos**,
   **Saques** e **Custódia**.

**C. Papel restrito e a atualização do CS que pausa**

Este roteiro usa **uma conta de teste criada só para ele, fora da equipe**. Nenhuma conta do seed, do
bootstrap (as que aparecem como "só pelo ambiente") ou da equipe entra aqui: desativar ou trocar o
papel de uma delas pode trancá-la fora do painel, e não existe ação para remover membro. Se algum
passo acabar mexendo num membro que já existia, anote antes o papel e a situação dele e devolva os
dois ao fim.

**Pré-requisito: `SUPABASE_SERVICE_ROLE_KEY` na produção.** Criar a conta com senha provisória pelo
painel e entrar com essa senha só funciona com a chave de serviço do Supabase configurada na Vercel.
Sem ela, a conta é criada só na plataforma, sem login no Supabase, e a entrada do passo 9 falha. A
configuração está no passo 4 do tutorial manual,
`docs/execucao-pendencias/TUTORIAL_MANUAL_GABRIEL.md` ("Chave de serviço do Supabase na Vercel").

**Sem a chave:** faça o passo 6 igual (a senha provisória é ignorada) e, antes do passo 9, numa
janela anônima abra `https://aurea-custodia-mvp.vercel.app/cadastrar` e crie a senha
`TestePainelE5-2026` com o mesmo e-mail `teste.painel+e5@exemplo.com.br`. Daí em diante o roteiro
segue igual.

6. Em `https://aurea-custodia-mvp.vercel.app/admin/usuarios`, abra **Criar conta** e preencha:
   E-mail `teste.painel+e5@exemplo.com.br`, Nome `Teste Painel E5`, Senha provisória
   `TestePainelE5-2026`. Desmarque **Carregar saldo e moedas de demonstração, como no cadastro pelo
   site** e clique **Criar conta**. Esperado: abre a ficha da conta nova.
7. Em `/admin/equipe`, **Criar papel**: Nome `Teste E5`, Identificador `teste-e5`, Ordem `5`, Painel
   inicial **Operacional — execução do dia**, marque só **Ver atendimento**, e clique **Criar**.
8. Em **Membros do painel**: E-mail `teste.painel+e5@exemplo.com.br`, Nome `Teste Painel E5`, Papel
   `Teste E5`, e clique **Dar acesso**.
9. Numa **segunda** janela anônima, abra `https://aurea-custodia-mvp.vercel.app/painel` e entre com
   `teste.painel+e5@exemplo.com.br` e a senha `TestePainelE5-2026`. Esperado: o menu mostra só
   **Painel** e **CS**. Abra `https://aurea-custodia-mvp.vercel.app/admin/usuarios` nessa janela.
   Esperado: "Seu papel no painel não inclui esta área".
10. Nessa janela, deixe `https://aurea-custodia-mvp.vercel.app/admin/cs` aberta e visível.
11. Na sua janela, em `/admin/equipe`, no cartão **Teste E5**, desmarque **Ver atendimento** e clique
    **Salvar alterações**.
12. Em até 20 segundos, a janela da conta de teste mostra o aviso de atualização pausada com
    **Tentar de novo**.
13. Na sua janela, abra `/admin/resultados/uso` e clique **Acessos recusados**. Esperado: no máximo 3
    linhas `admin.acesso.recusado` de `teste.painel+e5@exemplo.com.br` nesse minuto.
14. **Limpeza (só a conta de teste e o papel de teste).** Em `/admin/equipe`, na lista de membros:
    - na linha `teste.painel+e5@exemplo.com.br`, clique **Desativar**;
    - na mesma linha, troque o papel para **Operação**. A linha continua `inativo`, sem acesso a
      nada; a troca só existe porque o painel não exclui papel que ainda tem membro, mesmo inativo;
    - no cartão **Teste E5**, clique **Excluir papel**.

    A conta de teste fica na lista de usuários e na de membros como `inativo`. Nenhuma outra linha da
    lista de membros muda.

**D. Celular (375 px), no Chrome do computador**

15. Com o painel aberto, aperte `F12`, depois `Ctrl+Shift+M`, e escolha **iPhone SE** na lista de
    aparelhos, no topo da página.
16. Em `/admin`, `/admin/resultados/financeiro`, `/admin/equipe`, `/admin/usuarios` e na ficha:
    - a página não rola para o lado (tabelas rolam dentro da própria caixa);
    - o botão ☰ abre o menu;
    - os botões são fáceis de tocar.
17. Em `/admin/cs`: toque numa conversa. Esperado: a tela desce até a conversa. Espere 10 segundos
    rolando o cartão do cliente. Esperado: a página não pula sozinha.

**E. Envio único e teclado**

18. De volta ao tamanho normal (`Ctrl+Shift+M` de novo), em `/admin/cs`, abra uma conversa de teste.
    Se não houver nenhuma, use **Nova conversa** com o seu próprio número. Escreva `teste E5` e
    aperte `Ctrl+Enter` duas vezes seguidas. Esperado: **uma** mensagem nova.
19. Na barra superior, use `Tab` até **Modo escuro** e aperte `Espaço`: o tema troca. Deixe **Sair**
    por último: `Tab` até ele e `Enter` encerra a sessão.

Se algum passo não der o esperado, mande o número do passo e o texto que apareceu na tela, ou o erro
do log do deploy na Vercel.
