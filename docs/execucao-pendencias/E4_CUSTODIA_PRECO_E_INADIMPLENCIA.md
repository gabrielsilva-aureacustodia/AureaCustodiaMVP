# E4 · Preço da custódia na tela e recibo bloqueado por pendência

```
Branch:               exec/e4-custodia-preco-e-inadimplencia
Base:                 origin/main que contém docs/execucao-pendencias/00_PLANO_MESTRE.md (commit de base do integrador; confira também src/app/painel/page.tsx)
Worktree sugerido:    C:\dev\AureaCustodiaMVP-e4
Pendências de origem: A-4 (docs/publish_docs/PENDENCIAS_MANUAIS_AGENTE_A.md)
                      B-2 (docs/publish_docs/PENDENCIAS_MANUAIS_AGENTE_B.md)
                      CD-11 (já retirado de docs/diario/CRITICAL_DEBUGS.md como resolvido)
RA reservados:        RA-52, RA-53
Migration reservada:  027 (esta tarefa NÃO precisa de migration; o relatório diz "027 não usada")
Relatório de saída:   docs/execucao-pendencias/relatorios/E4.md
Servidor local:       npm run dev -- -p 3104   (http://localhost:3104; nunca a 3000)
```

> Revisado em 15/09/2026 contra a crítica de sobreposição (docs/execucao-pendencias/00_PLANO_MESTRE.md).

> **Para o Rogério.** Quando esta branch terminar, o cliente passa a ler o preço certo da guarda
> em todas as telas: quem contratou o plano anual vê "plano anual" e o valor do ano, e quem tem
> 15 moedas vê R$ 30,00 por mês, e não R$ 2,00. E a regra dos Termos sobre dívida de custódia
> passa a valer de verdade: conta com fatura de custódia vencida não consegue vender nem retirar
> moeda até pagar, e os anúncios dela ficam pausados — somem da vitrine e não fecham negócio —
> sem ser apagados. Pagou a fatura, tudo volta na hora, sem ninguém da equipe precisar mexer.
> As contas da equipe (as dos sócios, a do Gabriel e quem o painel reconhece como membro) ficam
> de fora dessa regra enquanto o ambiente é de teste: nada tranca a equipe para fora.
> Hoje a tela de faturas já avisa o cliente que "retiradas e transferências estão bloqueadas",
> mas o sistema não bloqueia nada: a promessa escrita não é cumprida.

---

## Regras de eficiência ([docs/Regras_eficiencia_de_sessao_v1.md](../Regras_eficiencia_de_sessao_v1.md)) — prevalecem sobre o resto deste documento

- **Leia só:** este documento, `00_PLANO_MESTRE.md` e os arquivos citados em "O que o código faz hoje"
  e "Território". Não releia o repositório para confirmar o que o documento já diz.
- **Prioridade:** as Tarefas na ordem numérica. Feature funcionando e commitada primeiro; melhoria e
  acabamento só depois, se sobrar.
- **MD de execução:** crie `relatorios/E4_EXECUCAO.md` na primeira ação e acrescente uma linha a cada
  tarefa fechada (o que fez, arquivos, o que falta). Se a execução passar para outro agente, ele parte daí.
- **Verificação:** typecheck, lint, suíte e build só no fim da branch (ou no fim de um bloco grande de
  tarefas), nunca a cada escrita. Não rode a suíte para "medir a base": a contagem está no plano mestre.
- **Commits:** em blocos funcionais, não a cada edição.

---

## Objetivo final — pronto quando

1. `npm test` passa, com os arquivos novos `src/domain/custodia-texto.test.ts`,
   `src/domain/bloqueio-por-debito.test.ts`, `src/domain/statement-custodia.test.ts` e
   `src/server/actions/bloqueio-por-debito.test.ts` e `src/components/custody/useBloqueioPorPendencia.test.ts`, e com `src/server/actions/retirada.test.ts`,
   `retirada-ciclo-completo.test.ts`, `ordens.test.ts`, `compra-direta.test.ts` e
   `src/domain/statement.test.ts` passando **sem alteração de asserção**. Base: 86 arquivos, 741 testes
   passando e 1 pulado; esperado ao fim: 91 arquivos (86 + os 5 novos), nenhum a menos.
2. `userStatement()` descreve a fatura de contratação de plano anual como "Plano anual de custódia"
   e a de renovação como "Renovação anual da custódia" — nunca "Custódia mensal" (teste).
3. O passo 5 de `/envios` calcula a custódia pela quantidade do protocolo e pela modalidade do plano
   contratado, e não pelo campo de quantidade do formulário (teste de `custodiaDoEnvio` + a linha
   `custodiaMensalPorMoeda(quantidade, taxas)` some de `src/app/(app)/envios/page.tsx`).
4. As duas notas de rodapé de `/conta/extrato` deixam de afirmar que a comissão é só do vendedor e que
   a custódia "não é debitada" e "não tem histórico".
5. Com fatura de custódia vencida (ou marca manual de inadimplência), as Server Actions recusam:
   `solicitarRetirada`, `pagarRetiradaComSaldo`, `iniciarPixRetirada`, `iniciarCartaoRetirada`,
   `publishOffer`, `sellToBid`, aumento de quantidade em `editLot`; `buyLot` e `iniciarCompraDireta`
   recusam lote de vendedor nessa situação; e `publishBid`/`editBid`/`publishOffer`/`editLot` não casam
   a oferta dele (teste). Pagar fatura, depositar, comprar, cancelar anúncio e cancelar retirada
   continuam liberados (teste). **Conta da equipe fica isenta**: conta que `carregarMembro` reconhece
   (membro, bootstrap do ambiente, `EMAILS_FIXOS_DA_EQUIPE`) vende e retira mesmo com fatura vencida, e
   checagem de equipe que falha responde "liberado" (teste com sócio do seed).
6. `bloquearReciboPorDebito` e `desbloquearRecibo` recusam conta fora da equipe (teste), e
   `sellToBid` deixa de mostrar o nome do comprador: usa `apelidoComprador` (teste).
7. `git diff --name-only origin/main...HEAD` **não** lista: `vitest.config.mts`, `src/domain/market.ts`, `fees.ts`,
   `constants.ts`, `types.ts`, `src/domain/custody.ts` (o `src/server/actions/custody.ts` é editado e
   aparece), `hash.ts`, `ledger.ts`, `analise.ts`,
   `src/server/db/**`, `src/server/payments/**`, `src/server/admin/**`, `src/app/painel/**`,
   `src/server/auth/**`, `src/app/entrar/**` — e, por não tocar `constants.ts`, `STORE_KEY` não muda.
8. `npm run typecheck`, `npm run lint`, `npm test` e `npm run build` verdes; branch publicada; relatório
   com a linha `E4 pronta para integração — <hash>`.

---

## O que o código faz hoje

Conferido em 15/09/2026 no commit `40bb8c8` (a base de execução é a origin/main que já contém o commit de
base do integrador, com `docs/execucao-pendencias/00_PLANO_MESTRE.md`).

### A-4 — o grosso já foi resolvido; sobram quatro textos e um cálculo errado

**Já resolvido (só confirmar e registrar):**

- O `custodyCharges` legado saiu no commit `2cc7194` (11/09/2026): a migration
  `src/server/db/migrations/013_remove_custody_charges.sql` derruba `aurea.custody_charges`, o campo saiu
  de `AppState` (`STORE_KEY` foi para v8, comentário em `src/domain/constants.ts:31-35`) e
  `git log -S custodyCharges` só mostra comentários depois disso. As migrations 007–025 estão aplicadas
  em produção (conferido por `db:check` em 14/09).
- O extrato lê as faturas mensais (`src/domain/statement.ts:162-191`), uma linha por fatura, com
  quantidade e valor da fatura.
- O passo 5 de `/envios` já não diz "Taxa de custódia anual (nova faixa)"
  (`src/app/(app)/envios/page.tsx:942-952`).
- A palavra "faixa" não aparece em texto exibido nas telas do cliente: em `src/app/(app)` e
  `src/components` (fora de `admin/`) ela sobra só em comentário.
- O CD-11 já foi retirado de `docs/diario/CRITICAL_DEBUGS.md` (cabeçalho, linha 12: "CD-11 e CD-09
  RESOLVIDOS").

**O que continua errado para o cliente:**

1. **Período errado no extrato para quem tem plano.** `src/domain/statement.ts:185` escreve
   `Custódia mensal ${f.competencia} · N moeda(s)` para **toda** fatura. Mas a contratação de plano anual
   gera fatura com `origem: 'contratacao'` e o valor do ano inteiro
   (`src/server/actions/plano-custodia.ts`, bloco de `contratarPlanoCustodia`, `origem: 'contratacao'`,
   `valorCents: total`), e o ciclo gera `origem: 'renovacao_anual'` com o valor anual
   (`src/server/custodia/faturamento.ts:91-110`). Resultado: "Custódia mensal 2026-09 · 3 moeda(s)"
   com R$ 72,00 — o mesmo tipo de erro que o A-4 descreveu.
2. **Valor errado no passo 5 de `/envios`.** `src/app/(app)/envios/page.tsx:950` calcula
   `custodiaMensalPorMoeda(quantidade, taxas)`, e `quantidade` (`:203`) vem do **campo do formulário do
   passo 1** (`qtdTexto`, `:193`, começa em `'1'` e volta a `'1'` em `:298`). Quem recarrega a página
   durante a análise cai direto no passo 5 pela `retomada()` (`:148-168`) e vê R$ 2,00 / mês para um
   envio de 15 moedas. E o texto é sempre "/ mês", mesmo quando o envio tem plano anual
   (`state.planosCustodia`, `protocoloEnvio === envio.protocolo`).
3. **Nota falsa sobre a custódia no extrato.** `src/app/(app)/conta/extrato/page.tsx:253-255`: "a taxa
   de custódia é registrada mas não é debitada do saldo, e a plataforma guarda apenas a cobrança vigente
   — não há histórico de cobranças anteriores". Hoje o ciclo debita do saldo
   (`faturamento.ts:141-146`) e cada mês é uma fatura guardada.
4. **Nota falsa sobre a comissão no extrato.** `src/app/(app)/conta/extrato/page.tsx:241-243`: "A
   comissão de 0,5% + R$ 1,00 por moeda é retida do vendedor, por isso só aparece nas linhas de venda".
   Desde a A1 a comissão é dos dois lados (`statement.ts:106-121` preenche a taxa da compra) e o valor
   é o da Tabela de Taxas vigente, editável no painel.
5. Resíduos de comentário e documento que um agente leria como verdade:
   `src/domain/statement.ts:156-157` ("no MVP essa cobrança nunca chega a ser debitada");
   `src/domain/statement.ts:236-238` usa, em maiúsculas, uma das palavras proibidas para "moedas
   compradas"; `src/domain/statement.test.ts:122-123` ("no MVP nenhuma ação debita a custódia do
   saldo"); `src/server/actions/custody.ts:241-244` (diz que a emissão "recalcula a taxa pela faixa" e
   "a cobrança nasce Pendente" — o próprio código em `:321-324` diz o contrário);
   `src/domain/README.md:22` ("faixas de custódia anual").

### B-2 — o bloqueio existe como etiqueta, mas nada liga a dívida a ele

**Já resolvido pelo merge `cc3c95c` ("bloqueio por débito"):**

- O status de recibo `'Bloqueado'` existe (`src/domain/types.ts:51-57`).
- `solicitarRetirada` recusa recibo `'Bloqueado'` (`src/server/actions/custody.ts:480-485`).
- `availableCoinsForSell` e `publishOffer` só aceitam recibo `'Ativo'` (`src/domain/market.ts:105`,
  `src/server/actions/sell.ts:125`).
- `bloquearReciboPorDebito` marca o recibo e tira a oferta do livro (`custody.ts:944-994`);
  `desbloquearRecibo` desfaz (`custody.ts:999-1042`).
- A tela do recibo desabilita retirada e venda de recibo `'Bloqueado'`
  (`src/components/recibo/Certificate.tsx:69`, `:237-245`, `:253`, `:277-285`).
- O ciclo mensal marca a conta (`src/server/custodia/faturamento.ts:156-166`) e `isInadimplente` /
  `verificarStatusFatura` têm teste (`src/domain/custody.test.ts:193-254`).

**O que falta — e é o que a pendência pede:**

1. **Nada põe um recibo em `'Bloqueado'` por dívida.** `bloquearReciboPorDebito` não tem chamador fora
   de teste (`grep` em `src/`), e o ciclo que marca `user.inadimplente` não mexe em recibo nem em
   anúncio. Conta com fatura vencida continua solicitando retirada (`custody.ts:430-541` não olha
   fatura nem `inadimplente`), pagando a taxa com saldo — o que **extingue o recibo**
   (`custody.ts:546-627`, `:590`) —, publicando anúncio (`sell.ts:89-203`), vendendo para oferta de
   compra (`sell.ts:371-451`) e tendo o anúncio antigo casado pelo motor (`src/domain/market.ts:248-250`
   não olha dívida) ou comprado direto (`src/server/actions/market.ts:163-248`,
   `src/server/actions/payments.ts:164-200`).
2. **A marca da conta fica velha.** `user.inadimplente` só é recalculado quando o ciclo mensal roda ou
   quando uma fatura é paga. A fatura vence 10 dias depois da emissão
   (`src/domain/custody.ts:14`, `:29-34`) e nada recalcula nesse dia. A verdade é derivar na hora:
   `Boolean(user.inadimplente) || isInadimplente(user, faturasDaConta, agora)` — exatamente a conta que
   o painel e os indicadores já fazem (`src/domain/admin/usuarios.ts:131` e `:378`,
   `src/domain/kpis.ts:382`).
3. **`isInadimplente` ignora a marca manual quando recebe faturas** (`src/domain/custody.ts:103-118`),
   apesar do comentário dizer o contrário. **Não mudar a função:** os pontos que gravam
   `u.inadimplente = isInadimplente(u, faturas, agora)` (`faturamento.ts:163` e `:248`,
   `src/server/actions/plano-custodia.ts:264`, `src/server/payments/conciliacao.ts:226` e `:281`)
   passariam a nunca mais desligar a marca. A função nova (tarefa 2) faz o "ou" por fora.
4. **Qualquer sessão desbloqueia qualquer recibo.** `bloquearReciboPorDebito` e `desbloquearRecibo` são
   Server Actions exportadas (`'use server'` em `custody.ts:1`) que só conferem se existe sessão
   (`:947-948`, `:1002-1003`). Um cliente com recibo bloqueado chama `desbloquearRecibo('RO-…')` pelo
   console e o bloqueio acaba. É a regressão que o `CLAUDE.md` proíbe ("qualquer pessoa com o console
   aberto comprava de graça").
5. **`pagarRetiradaComSaldo` extingue recibo bloqueado.** Se o recibo foi bloqueado depois da
   solicitação, `custody.ts:581-590` extingue sem olhar o status.
6. **A tela de faturas promete o que não existe.** `src/components/custody/FaturasCustodia.tsx:68-80`
   diz "Suas retiradas físicas e transferências estão temporariamente bloqueadas até a quitação", e só
   aparece com `me?.inadimplente` — a marca velha do item 2.

O texto que o cliente aceita no cadastro (bloco 4, `src/domain/legal.ts:56-59`) é "Débitos pendentes
de custódia podem bloquear a emissão e transferência de recibos e a realização de novas operações". A
B-2 fecha **venda e retirada**; emissão e outras operações ficam fora (ver Dúvidas no relatório).

---

## Tarefas

Ordem de execução. Um commit por tarefa (ou por par de tarefas pequenas), sempre com teste verde.

### 0. Preparar o worktree

```powershell
git -C C:\dev\AureaCustodiaMVP fetch origin
git -C C:\dev\AureaCustodiaMVP worktree add C:\dev\AureaCustodiaMVP-e4 -b exec/e4-custodia-preco-e-inadimplencia origin/main
Set-Location C:\dev\AureaCustodiaMVP-e4
npm install
Test-Path src\app\painel\page.tsx
Test-Path docs\execucao-pendencias\00_PLANO_MESTRE.md
npm test
```

Os dois `Test-Path` precisam responder `True` (o commit de base — documentos desta pasta, bloco `oxc` em
`vitest.config.mts`, `src/components/admin/entrada/EntradaDoPainel.test.ts` e as seções sem trava do RA-01 —
é feito pelo integrador antes de este prompt ser enviado), e o `npm test` da base precisa passar antes de qualquer edição,
com o servidor de desenvolvimento deste worktree parado. A contagem esperada é **86 arquivos, 741 testes
passando e 1 pulado**; anote o que saiu para o relatório. Se o arquivo `vitest.config.mts` da base não
tiver o bloco `oxc: { jsx: { runtime: 'automatic' } }`, a base ainda não recebeu o commit da integração:
pare e avise, não edite o arquivo.

### 1. Textos da custódia como função pura — `src/domain/custodia-texto.ts` (novo)

**O quê.** Duas funções puras, sem React:

- `descricaoDaFaturaDeCustodia(fatura: FaturaCustodia, plano: PlanoCustodia | undefined): string`
  - `origem` ausente ou `'ciclo_mensal'` → `Custódia mensal ${competencia} · ${n} moeda(s) — ${status}`
    (o texto de hoje, sem mudança — `statement.test.ts` depende dele);
  - `'contratacao'` com plano anual → `Plano anual de custódia a partir de ${competencia} · ${n} moeda(s) — ${status}`;
  - `'contratacao'` com plano mensal → `Plano mensal de custódia ${competencia} · ${n} moeda(s) — ${status}`;
  - `'contratacao'` sem plano encontrado → `Contratação de plano de custódia ${competencia} · ${n} moeda(s) — ${status}`;
  - `'renovacao_anual'` → `Renovação anual da custódia a partir de ${competencia} · ${n} moeda(s) — ${status}`.
- `custodiaDoEnvio(envio: Envio, plano: PlanoCustodia | undefined, taxas: TabelaDeTaxas): { rotulo: string; valorCents: Cents; periodo: 'mês' | 'ano' }`
  - quantidade = `envio.quantidade` (congelada no protocolo; nunca o campo do formulário);
  - plano anual → rótulo `Plano anual destas moedas`, valor `plano.valorTotalCents` (congelado na
    contratação), período `'ano'`;
  - plano mensal → rótulo `Custódia mensal destas moedas`, valor `quantidade * plano.valorPorMoedaCents`,
    período `'mês'`;
  - sem plano → rótulo `Custódia mensal destas moedas`, valor `custodiaMensalPorMoeda(quantidade, taxas)`
    (de `src/domain/fees.ts`, só uso), período `'mês'`.

**Por quê.** Os dois erros do A-4 que sobraram são de texto e de conta. O `vitest` roda em `node`, sem
DOM (tela só se testa por `renderToStaticMarkup` de `react-dom/server`, e a conta não depende da tela).
Pôr a decisão numa função pura é o que deixa provar.
Comentário de bloco no topo dizendo qual erro cada função evita (o "Custódia mensal" com valor anual e o
R$ 2,00 da retomada).

**Teste que prova.** `src/domain/custodia-texto.test.ts` (tarefa de testes abaixo).

### 2. A regra do bloqueio como função pura — `src/domain/bloqueio-por-debito.ts` (novo)

**O quê.**

```ts
export const MENSAGEM_RECIBO_BLOQUEADO_POR_PENDENCIA =
  'Esta conta tem fatura de custódia vencida. Enquanto ela estiver em aberto, os recibos ficam bloqueados para venda e retirada. Pague em Minha conta › Faturas de custódia para liberar na hora.'
export const MENSAGEM_ANUNCIO_PAUSADO = 'Este anúncio está pausado no momento e não pode ser comprado.'

export function contaComPendenciaDeCustodia(user: User, faturasDaConta: readonly FaturaCustodia[], agora: Timestamp): boolean
export function contaComPendenciaNoEstado(state: AppState, email: UserEmail, agora: Timestamp): boolean
export function vendedoresComPendencia(state: AppState, agora: Timestamp): Set<UserEmail>
export function casarOrdensRespeitandoPendencia(state: AppState, taxas: TabelaDeTaxas, agora: Timestamp, bloqueaveis: ReadonlySet<UserEmail>): MatchResult
```

- `contaComPendenciaDeCustodia` = `Boolean(user.inadimplente) || isInadimplente(user, [...faturasDaConta], agora)`.
  Comentário explicando por que não se mexe em `isInadimplente` (item 3 do diagnóstico).
- `contaComPendenciaNoEstado` filtra `state.faturasCustodia ?? []` pelo e-mail; conta que não existe no
  estado responde `false`.
- `vendedoresComPendencia` olha só os vendedores com oferta aberta em `state.sellOffers`. É a lista de
  **candidatos**: ainda não sabe quem é da equipe (isso é pergunta ao servidor, tarefa 2b).
- `casarOrdensRespeitandoPendencia`: separa as ofertas dos vendedores que estão em `bloqueaveis` **e** têm
  pendência no estado recebido, chama `matchOrders(state, taxas)`
  de `src/domain/market.ts` **sem alterá-lo**, e devolve as ofertas separadas ao fim de
  `state.sellOffers`, com os mesmos objetos (preço, `prioridadeEm` e `createdAt` intactos). O motor
  reordena o livro a cada volta, então a posição no array não mexe na fila. Sem vendedor com pendência,
  ou com `bloqueaveis` vazio, o resultado é idêntico ao de `matchOrders`. Vendedor com pendência fora de
  `bloqueaveis` (equipe, ou checagem que falhou) casa normalmente.

**Por quê.** O bloqueio é **calculado na hora** a partir das faturas, e não gravado no recibo: a fatura
vence por passagem de tempo, sem evento que dispare gravação, e pagar tem de liberar no mesmo instante.
Isso deixa o formato de `AppState` igual (sem migration, sem `STORE_KEY`), deixa `market.ts` intacto e
não apaga anúncio de ninguém — ele fica pausado. O `diff.ts` compara ofertas por `id`
(`src/server/db/diff.ts:446-448`), então tirar e devolver a mesma oferta na mesma transação não gera
escrita no banco. É um arquivo de `src/domain/`: pode ser importado pelas telas (tarefa 7) sem trazer
nada de `@/server/*`.

**Teste que prova.** `src/domain/bloqueio-por-debito.test.ts`.

### 2b. Conta da equipe isenta — `src/server/custodia/isencao-da-equipe.ts` (novo) e a pergunta das telas

**Decisão tomada (integração, 15/09/2026):** o bloqueio de venda, transferência e retirada por pendência
de custódia **não se aplica a conta da equipe do painel**. É a mesma regra de `contaDesativada` em
`src/server/admin/situacao.ts`: conta que `carregarMembro` reconhece (membro da tabela, bootstrap do
ambiente — `AUREA_ADMIN_EMAILS` ou, sem ela, as contas do seed — e `EMAILS_FIXOS_DA_EQUIPE`) fica isenta,
e **checagem que falha responde "liberado"**. Motivo: MVP de teste com as contas dos sócios, e "nada tranca
a equipe para fora". Não é dúvida para o relatório; é tarefa.

**`src/server/custodia/isencao-da-equipe.ts`** (novo, `import 'server-only'`; `faturamento.ts` da mesma
pasta continua intocado):

```ts
/** Das contas recebidas, as que PODEM ser bloqueadas: carregarMembro respondeu null. */
export async function contasBloqueaveis(emails: Iterable<UserEmail>): Promise<Set<UserEmail>>
export async function contaBloqueavel(email: UserEmail): Promise<boolean>
/** Lê o estado, pega vendedoresComPendencia e devolve os bloqueáveis; qualquer falha → Set vazio. */
export async function vendedoresBloqueaveis(): Promise<Set<UserEmail>>
```

- Cada e-mail passa por `carregarMembro` (de `@/server/admin/acesso`, só uso) num `try/catch` próprio:
  membro não nulo → isenta; `null` → bloqueável; exceção → **isenta** (liberado).
- A pergunta é feita **antes** do `mutateState`, nunca dentro da transação (não abrir segunda conexão com
  `FOR UPDATE` aberto). Só consulta quem já tem pendência, então no caso comum não consulta ninguém.
- Comentário de bloco no topo citando a regra de `contaDesativada` e o motivo.

**`src/server/actions/bloqueio-por-debito.ts`** (novo, `'use server'`): uma Server Action só leitura
`situacaoDoBloqueioPorPendencia(): Promise<{ minhaContaBloqueada: boolean; vendedoresPausados: UserEmail[] }>`.
Sem sessão, ou com qualquer falha, devolve `{ minhaContaBloqueada: false, vendedoresPausados: [] }`. É
assim que a tela sabe da isenção sem importar `@/server/*` em Client Component (chamar Server Action pelo
cliente é o padrão do repositório, como `vender/page.tsx` já faz com `@/server/actions/sell`). Uma linha
nova para o arquivo em `src/server/actions/README.md`, na tabela "Quem chama estas ações", **antes** da
linha de `auth.ts` (a E3 apaga a última linha da tabela, a de `contabil.ts`; entrar antes de `auth.ts`
evita conflito com ela).

**`src/components/custody/useBloqueioPorPendencia.ts`** (novo, Client): **não** chama a action ao montar
nem a cada mudança de `state` do `useApp()` — isso faria uma ida ao servidor por negociação ou depósito de
qualquer conta. Chama só quando o cliente abre a ação que precisa da resposta (modal ou tela de venda, de
retirada, de transferência), por uma função `consultar()` que o componente dispara ao abrir, e guarda o
resultado enquanto o modal estiver aberto (fechou, descarta; abriu de novo, consulta de novo). Valor
inicial e valor durante a consulta: "liberado", para a tela nunca mostrar trava que o servidor não
aplica — quem recusa de verdade é a Server Action.

**Teste que prova.** `src/server/actions/bloqueio-por-debito.test.ts` (casos de equipe isenta e de
checagem que falha).

### 3. Extrato: descrição certa e notas verdadeiras

**`src/domain/statement.ts`**
- Bloco das faturas (`:162-191`): trocar o template literal de `:185` por
  `descricaoDaFaturaDeCustodia(f, (state.planosCustodia ?? []).find((p) => p.id === f.planoId))`.
  Atualizar o comentário do bloco dizendo que plano anual e renovação têm descrição própria.
- `:156-157`: o envio não move saldo porque a custódia vem na fatura — tirar "no MVP essa cobrança nunca
  chega a ser debitada".
- `:236-238`: trocar a palavra proibida por "moedas compradas".
- Não mudar assinatura de `userStatement` nem de `statementTotals`; não mexer em compra, venda, depósito
  ou saque.

**`src/domain/statement.test.ts`** — só o comentário de `:122-123`, para dizer que fatura **pendente**
não move saldo. Nenhuma asserção muda.

**`src/app/(app)/conta/extrato/page.tsx`** — só as duas `.note` de `:236-256`:
- Nota 1: "O arquivo exportado traz sempre o extrato completo, independentemente do filtro selecionado
  acima. A comissão de negociação é cobrada de quem compra e de quem vende, pelos valores da
  `<Link href="/taxas">Tabela de Taxas</Link>` vigente, e aparece na coluna Taxa das linhas de compra e
  de venda." Sem número escrito: a taxa é editável no painel e número fixo na tela volta a mentir. Esta
  nota **vale sobre qualquer sugestão da E6** (inclusive a de trocar o texto por `rotuloDaComissao`):
  a linha fica sem número.
- Nota 2: "Cada fatura de custódia é uma linha, com o mês de referência, a quantidade de moedas e o
  valor. A fatura paga com o saldo da conta aparece como saída; a fatura em aberto, ou paga por Pix ou
  cartão, não mexe no saldo. Faturas e planos ficam em `<Link href="/conta/faturas">Minha conta › Faturas
  de custódia</Link>`. O saldo inicial da conta de demonstração não aparece como depósito."
- Atualizar o comentário `:246-247` ("Duas limitações reais do MVP") para o que as notas dizem agora.

**Teste que prova.** `src/domain/statement-custodia.test.ts` + `statement.test.ts` verde sem mudar
asserção.

### 4. `/envios` passo 5: quantidade do protocolo e período do plano

**`src/app/(app)/envios/page.tsx`**, só o `summary-box` do passo 5 (`:936-953`):
- Achar o plano: `(state.planosCustodia ?? []).find((p) => p.protocoloEnvio === envio.protocolo && p.status !== 'cancelado')`.
- `const custodia = custodiaDoEnvio(envio, plano, taxas)`; exibir `custodia.rotulo` e
  `{brl(custodia.valorCents)} / {custodia.periodo}`.
- Reescrever o comentário `:944-948`: além do texto antigo, dizer que o valor usava o campo do
  formulário e mostrava R$ 2,00 a quem recarregava a página.
- Se `custodiaMensalPorMoeda` deixar de ser usado no arquivo, tirar do import.

**Teste que prova.** `custodiaDoEnvio` em `src/domain/custodia-texto.test.ts`; e
`Select-String -Path 'src\app\(app)\envios\page.tsx' -Pattern 'custodiaMensalPorMoeda\(quantidade'`
não encontra nada.

### 5. Comentários velhos da custódia

- `src/server/actions/custody.ts:239-245` (cabeçalho de `advanceAnalysis`): trocar os itens 2 e 3 por "a
  emissão alimenta o plano de custódia (`alimentarPlanoNaAnalise`); a cobrança mensal é do ciclo, ver o
  fim desta função". Só comentário.
- `src/domain/README.md:22`: linha de `fees.ts` passa a "Comissão de negociação dos dois lados e custódia
  mensal e anual por moeda". Acrescentar, logo abaixo da linha de `statement.ts` (`:28`), as linhas de
  `custodia-texto.ts` e `bloqueio-por-debito.ts`.

### 6. O bloqueio nas Server Actions

As Server Actions tocadas aqui são superfície protegida no CLAUDE.md, mas A-4 e B-2 são pedido do
Gabriel já decidido — não pare para pedir aprovação.

Em todas: `const agora = Date.now()` dentro da transação; a checagem de pendência usa o estado que a
própria ação já leu. A isenção da equipe (tarefa 2b) é perguntada **antes** do `mutateState`:
`const bloqueavel = await contaBloqueavel(session)` nas ações da própria conta, e
`const bloqueaveis = await vendedoresBloqueaveis()` nas que olham vendedor de terceiro ou casam o livro.
Recusa só quando `bloqueavel` (ou `bloqueaveis.has(email)`) **e** há pendência. Onde a ação precisa de
uma leitura a mais (`getState()`), ela vai num `try/catch` e **falha de leitura libera** — o `catch` segue
o caminho de hoje. Import novo sempre em linha própria.

**`src/server/actions/custody.ts`**
- `solicitarRetirada` (`:455-491`): depois de achar a moeda e antes da checagem de oferta, se
  `bloqueavel && contaComPendenciaDeCustodia(u, faturasDaConta, agora)` → `{ ok: false, error: MENSAGEM_RECIBO_BLOQUEADO_POR_PENDENCIA }`.
- `pagarRetiradaComSaldo` (`:553-590`): antes de debitar, recusar com a mesma mensagem se a conta é
  bloqueável e tem pendência, e recusar com o texto de `:480-485` se `coin.recibo.status === 'Bloqueado'`
  (esta vale para qualquer conta: é o status gravado pela equipe). Nada de saldo nem de recibo muda na recusa.
- `iniciarPixRetirada` (`:632-644`) e `iniciarCartaoRetirada` (`:703-716`): depois de conferir dono e
  status, `if (await contaBloqueavel(session)) { try { const s = await getState(); if (contaComPendenciaNoEstado(s, session, Date.now())) return { ok: false, error: MENSAGEM_RECIBO_BLOQUEADO_POR_PENDENCIA } } catch { /* leitura falhou: libera */ } }`
  — **antes** de criar a intenção de pagamento. Importar `getState` de `@/server/state`.
- **`desbloquearRecibo` e `bloquearReciboPorDebito` passam a conferir permissão (tarefa explícita, com
  teste).** Hoje `desbloquearRecibo` só confere se existe sessão (`custody.ts:1002-1003`) e aceita qualquer
  uma; o mesmo em `bloquearReciboPorDebito` (`:947-948`). Em `bloquearReciboPorDebito` (`:944-948`) e
  `desbloquearRecibo` (`:999-1003`): logo depois da sessão,
  `if (!temPermissao(await carregarMembro(session), 'usuarios.editar')) return { ok: false, error: 'Ação restrita à equipe da Áurea.' }`
  (`carregarMembro` de `@/server/admin/acesso`, `temPermissao` de `@/domain/admin/permissoes` — o mesmo
  par que `src/app/api/retiradas/etiqueta/[id]/route.ts:39` usa). **Não** usar `ehAdmin` de
  `src/server/relatorios/acesso.ts`, que a E3 está editando. `carregarMembro` já cai no bootstrap do
  ambiente quando o banco falha, então a equipe nunca fica de fora. Comentário explicando o furo que a
  checagem fecha (item 4 do diagnóstico). Ser dono do recibo **não** basta para desbloquear: o dono
  desbloqueando pelo console é exatamente o furo.
- `cancelarSolicitacaoRetirada`, `pagarFaturaCustodia`, `obterMinhasRetiradas`, `obterRetiradaPorCoin`,
  `avancarStatusRetirada`, `createProtocol`, `markPosted`, `advanceAnalysis`: **sem checagem nova**.

**`src/server/actions/sell.ts`**
- `publishOffer` (`:113-114`): logo depois de achar `u`, se `bloqueavel` e a conta tem pendência, recusar com
  `{ ok: false, error: MENSAGEM_RECIBO_BLOQUEADO_POR_PENDENCIA, data: { limparSelecao: false } }`.
  Trocar `matchOrders(s, taxas)` (`:186`) por `casarOrdensRespeitandoPendencia(s, taxas, Date.now(), bloqueaveis)`.
- `editLot` (`:280-313`): no ramo de aumento de quantidade, recusar com a mesma mensagem se a conta é
  bloqueável e tem pendência. Reduzir e mudar preço continuam aceitos. Trocar `matchOrders` (`:341`) pelo
  casamento novo.
- `sellToBid` (`:387-389`): depois de achar `seller`, recusar com a mesma mensagem se a conta é bloqueável
  e tem pendência.
- `sellToBid`, mensagem de sucesso (`:444`): trocar `${buyer.name}` por `${apelidoComprador(bo.id)}`, de
  `@/domain/contraparte` (decisão D-5 de anonimato; a tela de `/vender` já usa o mesmo apelido). Uma
  linha e o import; teste no arquivo novo das actions.
- `cancelLot`: sem checagem.
- Se `matchOrders` deixar de ser usado no arquivo, tirar do import.

**`src/server/actions/market.ts`**
- `buyLot` (`:179-183`): `const bloqueaveis = await vendedoresBloqueaveis()` antes do `executar(...)`;
  depois de achar `seller`, se `bloqueaveis.has(sellerId) && contaComPendenciaNoEstado(state, sellerId, Date.now())`
  → `{ ok: false, error: MENSAGEM_ANUNCIO_PAUSADO }`. O comprador não é bloqueado.
- `publishBid` (`:296`) e `editBid` (`:376`): trocar `matchOrders(state, taxas)` por
  `casarOrdensRespeitandoPendencia(state, taxas, Date.now(), bloqueaveis)`, com `bloqueaveis` lido antes do
  `executar(...)`.
- `cancelBid`: sem mudança.

**`src/server/actions/payments.ts`**
- `iniciarCompraDireta` (`:193-194`): depois de achar `seller`, se
  `(await contaBloqueavel(sellerId)) && contaComPendenciaNoEstado(state, sellerId, Date.now())` →
  `{ ok: false, error: MENSAGEM_ANUNCIO_PAUSADO }`, antes de criar a intenção. Nenhuma outra linha do arquivo.

**Por quê.** É o que a B-2 pede ("recibo bloqueado por débito na retirada e na venda") e o que o bloco 4
do aceite e a faixa da tela de faturas já dizem ao cliente. Pagar a fatura fica sempre aberto, porque é
a saída do bloqueio.

**Teste que prova.** `src/server/actions/bloqueio-por-debito.test.ts`.

### 7. As telas dizem o que o servidor decide

Tudo com o hook `useBloqueioPorPendencia()` (tarefa 2b), que já traz a isenção da equipe decidida pelo
servidor, e com o estado que `useApp()` já entrega — nada de `@/server/*` novo em Client Component além da
Server Action. Conta da equipe com fatura vencida **não** vê aviso de bloqueio nem botão apagado, porque o
servidor não a bloqueia.

**Quando a tela consulta.** O hook nunca consulta a cada mudança de `state`. Em cada ponto abaixo, o
`consultar()` roda uma vez quando o cliente abre a ação que precisa da resposta — o modal ou a tela de
venda (`vender/page.tsx`, botão de vender do `Certificate.tsx`), de retirada e de transferência — e o
resultado fica guardado enquanto aquele modal ou tela estiver aberto. `FaturasCustodia.tsx`,
`mercado/page.tsx` e `MinhasOfertas.tsx` consultam uma vez ao abrir a tela, não a cada atualização do
estado. Enquanto a resposta não chega, vale "liberado".

- **`src/components/recibo/Certificate.tsx`** — só as linhas do bloqueio: logo abaixo de `:55`,
  `const { minhaContaBloqueada: pendencia } = useBloqueioPorPendencia()`; em `:69`,
  `const bloqueado = coin?.recibo.status === 'Bloqueado' || pendencia`; em `:106`, texto `pendencia ? 'Bloqueado — pendência de custódia' : 'Bloqueado — restrição financeira'`;
  em `:160`, subtítulo do carimbo `pendencia ? 'PENDÊNCIA DE CUSTÓDIA' : 'RESTRIÇÃO ADMINISTRATIVA'`; na
  nota de `:277-285`, acrescentar link para `/conta/faturas` quando `pendencia`. Não tocar na nota de
  `!sellable` (`:286-296`).
- **`src/components/custody/FaturasCustodia.tsx:68-80`** — a faixa aparece quando
  `useBloqueioPorPendencia().minhaContaBloqueada` é verdadeiro (a lista `faturas` que o componente já carrega
  continua mostrando a fatura vencida para qualquer conta), e o texto passa a "Você tem fatura de custódia com prazo vencido. Até a quitação, a venda e a
  retirada dos seus recibos ficam bloqueadas e seus anúncios ficam pausados. Pagar libera na hora."
- **`src/app/(app)/mercado/page.tsx:126`** — só esta linha: filtrar lotes de vendedor pausado
  (`const { vendedoresPausados } = useBloqueioPorPendencia()` logo acima, e
  `.filter((l) => passa(l.price) && !vendedoresPausados.includes(l.seller))`). Nenhuma outra linha do arquivo.
- **`src/app/(app)/vender/page.tsx`** — logo depois do `return (` de `:277`, uma `warn-box` com o texto de
  `MENSAGEM_RECIBO_BLOQUEADO_POR_PENDENCIA` e link para `/conta/faturas` quando
  `useBloqueioPorPendencia().minhaContaBloqueada`; e o botão de publicar anúncio e os de vender
  para oferta de compra ficam `disabled` nessa condição. **Não** mexer nas linhas da comissão
  (`:376`, `:585`), que são da E6. Os imports novos deste arquivo podem conflitar com os da E6 na
  integração (as duas acrescentam `@/domain/...` e `@/components/...` no bloco `:40-53`): **cada import em
  linha própria, em ordem alfabética**, sem juntar com import existente, para a união resolver o conflito.
- **`src/components/market/MinhasOfertas.tsx`** — acima da lista de lotes, uma `.note` "Seus anúncios estão
  pausados enquanto houver fatura de custódia vencida." quando `minhaContaBloqueada`.

Alvo de toque de 44px em todo botão ou link novo. **Teste que prova:** as funções usadas estão cobertas
em `src/domain/bloqueio-por-debito.test.ts` e `situacaoDoBloqueioPorPendencia` em
`src/server/actions/bloqueio-por-debito.test.ts`, e o hook tem teste próprio em
`src/components/custody/useBloqueioPorPendencia.test.ts` (Server Action mockada com `vi.fn()`): montar o
hook e mudar o `state` do `useApp()` **não** chama a action; `consultar()` chama uma vez; nova mudança de
`state` com o modal aberto não chama de novo e o resultado guardado se mantém; fechar e abrir chama de
novo; antes da resposta e com a action rejeitando, o valor é "liberado". A conferência visual fica no
roteiro opcional do fim.

### 8. Registro dos atalhos

- `RISCOS_ASSUMIDOS.md`: só as linhas dos RA desta branch. Duas linhas no índice logo depois da linha do
  RA-48 (`:70`, ou onde ela estiver na base) e dois blocos novos logo depois da seção do RA-48 (hoje a
  última do arquivo), em ordem numérica. Outras branches inserem RA no mesmo ponto; o conflito é esperado
  e a **integração** resolve pela união, em ordem numérica — não tente prever nem reservar espaço:
  - **RA-52 🟡 — Bloqueio por pendência de custódia calculado na hora, sem gravar no recibo, e conta da
    equipe isenta.** Conta que `carregarMembro` reconhece (membro, bootstrap do ambiente,
    `EMAILS_FIXOS_DA_EQUIPE`) não é bloqueada, e checagem de equipe que falha libera — decisão de MVP de
    teste com as contas dos sócios ("nada tranca a equipe para fora"), a mesma regra de `contaDesativada`.
    Quando houver cliente real, rever se a equipe continua isenta. O recibo
    continua `'Ativo'` no banco; a auditoria pública, o PDF baixado, a grade de `/recibos`, o status em
    `/conta` e a contagem `recibosBloqueados` da ficha do painel não mostram o bloqueio por pendência. O
    anúncio pausado continua gravado e volta a casar quando a fatura é paga. A marca manual de
    inadimplência é apagada quando o cliente paga qualquer fatura ou quando o ciclo roda
    (`faturamento.ts:163`, `:248`; `plano-custodia.ts:264`; `conciliacao.ts:226`, `:281`), porque a
    coluna `inadimplente` guarda as duas coisas. **Como se paga:** separar marca manual de marca por
    fatura (coluna nova) e decidir se o bloqueio aparece no recibo impresso.
  - **RA-53 🟡 — O gateway não reconfere a pendência na confirmação.** A compra direta paga por
    Pix/cartão (`conciliacao.ts`, `liquidarCompraDireta`) e a taxa de retirada paga por Pix/cartão
    (`conciliacao.ts:338-341`, que extingue o recibo) seguem mesmo que a conta tenha passado a ter
    fatura vencida entre gerar a cobrança e o pagamento cair. A checagem está na porta de entrada
    (`iniciarCompraDireta`, `iniciarPixRetirada`, `iniciarCartaoRetirada`). O arquivo é da E2 e o
    dinheiro já entrou. **Como se paga:** na conciliação, com pendência, creditar o valor no saldo em
    vez de transferir a moeda ou extinguir o recibo. **Dono:** E8, na segunda onda, depois dos merges da
    E2 e da E4. A E4 **só registra; não implementa**.
- `src/server/actions/ATALHOS.md`: seção nova `## RA-52 🟡` e `## RA-53 🟡` **no fim do arquivo**, curta,
  apontando para o RISCOS. A seção RA-01 desse arquivo já chega corrigida na base; não mexer nela.
- `src/domain/ATALHOS.md`: seção nova `## RA-52 🟡` no fim do arquivo, sobre `bloqueio-por-debito.ts`.

### 9. Ciclo final, publicação e relatório

Ver **Entrega**.

---

## Território

### Pode editar

| Caminho | Limite |
|---|---|
| `src/domain/custodia-texto.ts` | Arquivo novo |
| `src/domain/custodia-texto.test.ts` | Arquivo novo |
| `src/domain/bloqueio-por-debito.ts` | Arquivo novo |
| `src/domain/bloqueio-por-debito.test.ts` | Arquivo novo |
| `src/domain/statement-custodia.test.ts` | Arquivo novo |
| `src/domain/statement.ts` | Bloco das faturas (`:162-191`), comentários `:156-157` e `:236-238`, import |
| `src/domain/statement.test.ts` | Só o comentário `:122-123` |
| `src/domain/README.md` | Linha `:22` e duas linhas novas depois de `:28` |
| `src/domain/ATALHOS.md` | Seção RA-52 no fim |
| `src/server/custodia/isencao-da-equipe.ts` | Arquivo novo (isenção da equipe, só servidor) |
| `src/server/actions/bloqueio-por-debito.ts` | Arquivo novo (`situacaoDoBloqueioPorPendencia`) |
| `src/components/custody/useBloqueioPorPendencia.ts` | Arquivo novo (hook das telas) |
| `src/components/custody/useBloqueioPorPendencia.test.ts` | Arquivo novo (consulta só ao abrir a ação) |
| `src/server/actions/README.md` | Uma linha nova para `bloqueio-por-debito.ts`, na tabela "Quem chama estas ações", antes da linha de `auth.ts` |
| `src/server/actions/custody.ts` | `solicitarRetirada`, `pagarRetiradaComSaldo`, `iniciarPixRetirada`, `iniciarCartaoRetirada`, `bloquearReciboPorDebito`, `desbloquearRecibo`, comentário `:239-245`, imports |
| `src/server/actions/sell.ts` | `publishOffer`, `editLot`, `sellToBid` (checagem e a mensagem de `:444` com `apelidoComprador`), imports |
| `src/server/actions/market.ts` | `buyLot`, as chamadas de casamento em `publishBid` e `editBid`, imports |
| `src/server/actions/payments.ts` | Só a checagem nova em `iniciarCompraDireta` e o import |
| `src/server/actions/bloqueio-por-debito.test.ts` | Arquivo novo |
| `src/server/actions/ATALHOS.md` | Seções RA-52 e RA-53 no fim |
| `src/app/(app)/conta/extrato/page.tsx` | As duas `.note` e o comentário `:236-256`, import de `Link` já existe |
| `src/app/(app)/envios/page.tsx` | O `summary-box` do passo 5 (`:936-953`) e imports |
| `src/components/recibo/Certificate.tsx` | Linhas do bloqueio: `:55`, `:69`, `:106`, `:160`, nota `:277-285`, imports |
| `src/components/custody/FaturasCustodia.tsx` | Faixa `:67-80` e imports |
| `src/components/market/MinhasOfertas.tsx` | A nota de anúncios pausados e imports |
| `src/app/(app)/mercado/page.tsx` | Só a linha `:126` e a constante logo acima dela, import |
| `src/app/(app)/vender/page.tsx` | A `warn-box` depois de `:277`, o `disabled` dos botões de publicar e de vender para oferta, imports (cada um em linha própria, ordem alfabética) |
| `RISCOS_ASSUMIDOS.md` | Linhas do índice e blocos do RA-52 e RA-53 |
| `docs/execucao-pendencias/relatorios/E4.md` | Arquivo novo (`docs/execucao-pendencias/README.md` e `relatorios/README.md` já existem na base; a branch só cria o próprio `relatorios/E4.md`) |

### Não pode editar

| Caminho | De quem é, ou por quê |
|---|---|
| `src/domain/market.ts`, `fees.ts`, `constants.ts`, `types.ts`, `custody.ts`, `plano-custodia.ts` | Motor, padrões e modelo; a regra nova mora num arquivo novo que só **usa** estes |
| `src/domain/hash.ts`, `ledger.ts`, `analise.ts`, `analise.test.ts`, `estacao/CONTRATO.md` | Fórmulas congeladas |
| `src/server/payments/**` (inclusive `conciliacao.ts`) | E2 |
| `src/server/estacao/**` | E2 |
| `vitest.config.mts` | Chega pronto na base (bloco `oxc` do JSX); nenhuma branch edita |
| `src/server/custodia/faturamento.ts`, `src/server/actions/plano-custodia.ts` | A escrita de `inadimplente` fica como está (RA-52) |
| `src/server/db/**`, `src/server/db/migrations/**` | Sem migration; `diff.ts` é da E1 |
| `src/server/admin/**`, `src/app/(admin)/**`, `src/components/admin/**`, `src/domain/admin/**`, `src/server/actions/admin/**` | E5 e E6 (só **uso** de `carregarMembro` e `temPermissao`) |
| `src/app/painel/**`, `src/server/auth/**`, `src/app/entrar/**`, `src/server/session.ts` | E1 e a entrada do painel |
| `src/server/relatorios/**`, `src/components/relatorios/**`, `src/server/actions/contabil.ts` | E3 |
| `src/server/config/**`, `src/app/taxas/**`, `src/components/shell/Topbar.tsx`, `src/components/providers/AppProvider.tsx` | E6 e C3 |
| `src/server/actions/retirada.test.ts`, `retirada-ciclo-completo.test.ts`, `ordens.test.ts`, `compra-direta.test.ts`, `src/domain/custody.test.ts` | Precisam passar como estão |
| `docs/publish_docs/PENDENCIAS_MANUAIS_AGENTE_A.md`, `_B.md`, `docs/finalizacoes/**`, `docs/diario/**` | E7 e a integração marcam A-4 e B-2; a E4 só escreve no relatório |
| `CLAUDE.md`, `AGENTS.md`, `.claude/**` | Fora do escopo |

### Arquivos compartilhados (outra branch pode tocar)

| Caminho | Quem mais pode tocar | Regra de convivência |
|---|---|---|
| `RISCOS_ASSUMIDOS.md` | E1 (RA-43, 44, 49, 50), E2 (RA-24, 47, 51), E3 (RA-16), E5 (RA-54), E6 (RA-55) | Só as linhas e os blocos do RA-52 e RA-53, em ordem numérica logo depois do RA-48; não reordenar nem reformatar a tabela. O conflito é esperado e a integração resolve pela união, em ordem numérica; o agente não tenta prever |
| `src/server/actions/ATALHOS.md` | E1 (`auth.ts`), E3 (RA-16.c) | Só acrescentar no fim; não tocar em RA-16.c nem na seção RA-01 |
| `src/domain/README.md`, `src/domain/ATALHOS.md` | E1, E6 | Só a linha `:22`, as duas linhas novas e a seção no fim |
| `src/app/(app)/vender/page.tsx` | E6 (comissão em `:376` e `:585`) | Só o aviso depois de `:277` e o `disabled` dos botões; imports em linha própria, ordem alfabética (conflito provável no bloco `:40-53`, resolvido pela união) |
| `src/server/actions/payments.ts` | E2 (lê, não edita) | Só o bloco novo em `iniciarCompraDireta` |

`src/components/recibo/Certificate.tsx`, `src/app/(app)/envios/page.tsx`, `src/app/(app)/mercado/page.tsx` e
`src/app/(app)/conta/extrato/page.tsx` não são editados por outra branch desta rodada (a E6 não os toca). A
E4 continua limitada aos trechos listados em "Pode editar".

---

## Testes exigidos

**`src/domain/custodia-texto.test.ts`** (novo)
- `descricaoDaFaturaDeCustodia`: fatura sem `origem` e com `'ciclo_mensal'` → texto idêntico ao de hoje
  (`Custódia mensal 2026-09 · 15 moeda(s) — paga`); `'contratacao'` com plano anual → contém "Plano anual" e
  não contém "mensal"; `'contratacao'` com plano mensal → "Plano mensal"; `'contratacao'` sem plano →
  "Contratação de plano"; `'renovacao_anual'` → "Renovação anual". Nenhum texto contém "faixa".
- `custodiaDoEnvio`: envio de 15 moedas sem plano → `valorCents: 3000`, `periodo: 'mês'` (com
  `TAXAS_PADRAO`); com tabela de taxas diferente (`custodiaMensalPorMoeda: 250`) → `3750`; plano anual com
  `valorTotalCents: 36000` → `36000`, `periodo: 'ano'`, rótulo "Plano anual"; plano mensal com
  `valorPorMoedaCents: 200` e 3 moedas → `600`, `'mês'`. Todos os valores inteiros.

**`src/domain/bloqueio-por-debito.test.ts`** (novo)
- `contaComPendenciaDeCustodia`: sem faturas → `false`; fatura pendente dentro do prazo → `false`; pendente
  com `dataVencimento < agora` → `true`; status `'atrasada'` → `true`; paga ou cancelada vencida → `false`;
  `user.inadimplente = true` sem fatura → `true`.
- `contaComPendenciaNoEstado`: fatura vencida de **outra** conta não bloqueia; conta inexistente → `false`.
- `vendedoresComPendencia`: devolve só quem tem oferta aberta e pendência.
- `casarOrdensRespeitandoPendencia`: bid compatível **não** casa com oferta de vendedor com pendência que
  está em `bloqueaveis`, e a oferta continua em `state.sellOffers` com o mesmo `prioridadeEm`; casa com a de
  vendedor sem pendência; **casa com a de vendedor com pendência fora de `bloqueaveis`** (equipe); sem
  nenhuma pendência, ou com `bloqueaveis` vazio, estado e resultado são iguais (`toEqual`) aos de
  `matchOrders` rodado numa cópia (`structuredClone`) do mesmo estado; depois de a fatura virar `'paga'`,
  a mesma oferta casa.

**`src/domain/statement-custodia.test.ts`** (novo)
- `userStatement` com plano anual e fatura `'contratacao'` → a linha "Taxa de custódia" traz "Plano anual" e
  `taxa` igual ao `valorCents` da fatura; com `'renovacao_anual'` → "Renovação anual"; fatura de ciclo →
  "Custódia mensal"; fatura paga com saldo → `impacto` negativo, pendente → `0` (confirma que a nota
  nova da tela diz a verdade).

**`src/server/actions/bloqueio-por-debito.test.ts`** (novo) — padrão de `src/server/actions/ordens.test.ts`
(mock só de `server-only` e `@/server/session`; estado real em memória por `getState`/`mutateState`; mock
de `@/lib/payments/cobranca` e de `@/lib/payments` para as cobranças). Sem banco, `carregarMembro` cai no
bootstrap do ambiente, e **toda conta do seed é da equipe e fica isenta**; por isso os casos de bloqueio
usam uma conta de cliente fora da equipe, `cliente.novo@exemplo.com.br`, criada no estado dentro do
`mutateState` do `beforeEach` com moedas passadas de uma conta do seed (nunca duplicar código de moeda), e
`vi.stubEnv('AUREA_ADMIN_EMAILS', '')` para o bootstrap ser o do seed. Monte a pendência empurrando em
`s.faturasCustodia` uma fatura `status: 'pendente'` com `dataVencimento: Date.now() - 86_400_000` para a
conta da sessão. Casos (conta da sessão = o cliente fora da equipe, salvo onde indicado):
- `solicitarRetirada` recusa com a mensagem de pendência e não cria retirada; com `user.inadimplente = true`
  e sem fatura também recusa; com a fatura trocada para `'paga'`, aceita.
- `pagarRetiradaComSaldo` (retirada criada antes da pendência) recusa: saldo igual, recibo `'Ativo'`.
- `pagarRetiradaComSaldo` recusa recibo `'Bloqueado'` depois da solicitação; recibo não vira `'Extinto'`.
- `iniciarPixRetirada` recusa com pendência e **não** cria intenção (`repositorioIntencoes()` vazio);
  com `getState` falhando, segue e gera a cobrança. Para simular a falha, mocke `@/server/state` com
  `vi.mock(..., async (importOriginal) => ...)` devolvendo o módulo real e um `getState` embrulhado em
  `vi.fn()` que delega ao original; nesse caso use `mockRejectedValueOnce(new Error('banco fora'))`
  (`vi.spyOn` em export de módulo ESM não funciona no Vitest). Sem credencial do gateway, a cobrança sai
  pelo simulador; mocke `@/lib/payments/cobranca` só se o simulador atrapalhar a asserção.
- `publishOffer` recusa e `sellOffers` não muda; `sellToBid` recusa e `trades` não muda; `editLot` recusa
  aumento e aceita redução de quantidade.
- `publishBid` de outra conta, sem pendência, com preço que cruzaria a oferta do vendedor com pendência:
  nenhuma negociação, oferta continua no livro; paga a fatura, `publishBid` de novo casa.
- `buyLot` e `iniciarCompraDireta` recusam lote de vendedor com pendência com "pausado".
- Continuam liberados para a conta com pendência: `pagarFaturaCustodia` (paga e a conta sai da pendência),
  `cancelLot`, `cancelarSolicitacaoRetirada`, `publishBid` como compradora.
- **Equipe isenta:** sessão de um sócio do seed (por exemplo `ROGERIO` de `ordens.test.ts`) com fatura em
  atraso **continua vendendo**: `publishOffer` aceita, `sellToBid` aceita e `solicitarRetirada` aceita; e
  `publishBid` de outra conta casa com a oferta dele. `situacaoDoBloqueioPorPendencia` para esse sócio
  devolve `minhaContaBloqueada: false` e não lista o e-mail dele em `vendedoresPausados`; para o cliente
  fora da equipe, `true` e listado.
- **Checagem que falha libera:** mocke `@/server/admin/acesso` com `importOriginal` e `carregarMembro`
  embrulhado em `vi.fn()`; com `mockRejectedValue(new Error('banco fora'))`, o cliente fora da equipe com
  pendência consegue `publishOffer` e `solicitarRetirada`.
- `sellToBid` que conclui a venda: a `message` contém `apelidoComprador(bid.id)` e **não** contém o `name`
  da conta compradora.
- `bloquearReciboPorDebito` e `desbloquearRecibo` com sessão `cliente.novo@exemplo.com.br` (fora do seed,
  da lista fixa e de `AUREA_ADMIN_EMAILS`), **inclusive sendo o dono do recibo**: recusa com "Ação restrita
  à equipe da Áurea." e o status do recibo não muda; com `gabrielsilva@testeaurea.com.br` (seed, equipe pelo
  bootstrap): funciona como hoje.

Rode o arquivo isolado enquanto escreve: `npx vitest run src/server/actions/bloqueio-por-debito.test.ts`.
Os cinco arquivos de teste novos terminam em `.test.ts` (o `include` é `src/**/*.test.ts`).

---

## Regras que valem nesta branch

- **Superfície protegida já decidida.** As Server Actions tocadas aqui são superfície protegida no
  CLAUDE.md, mas A-4 e B-2 são pedido do Gabriel já decidido — não pare para pedir aprovação.
- **Porta 3104.** Servidor de desenvolvimento deste worktree só com `npm run dev -- -p 3104`
  (http://localhost:3104). Nunca a 3000, que é a da pasta principal do Gabriel. Pare esse servidor antes de
  rodar a suíte completa.
- **Palavras proibidas** em texto de tela, comentário, nome de função, teste, commit e relatório:
  token, NFT, cripto, ativo digital, ativo, investimento, investidor, corretora, rentabilidade, retorno.
  O termo é **recibo**; o objeto é **moeda** ou **item**. O literal `'Ativo'` do status do recibo é código
  existente e fica; não crie nome novo com a palavra. Varra antes de cada commit:
  `git diff origin/main | Select-String -Pattern 'token|NFT|cripto|ativo|investi|corretora|rentabilidade|retorno' -CaseSensitive:$false`.
  O resultado se julga pelo sentido: o literal `'Ativo'` já existente e palavras como "administrativa"
  aparecem e ficam; palavra proibida escrita por esta branch sai.
- **Nenhuma trava que o Gabriel não pediu.** O bloqueio de venda e retirada é o pedido (B-2, bloco 4 do
  aceite). Nada além: não bloquear depósito, compra, envio, saque, login, cadastro nem pagamento de fatura;
  nada de feature flag, variável de ambiente ou confirmação extra. Falha de leitura libera.
- **Nada tranca o Gabriel nem a equipe para fora.** A checagem nova só existe em operação de marketplace e
  retirada; nunca em login, sessão, `/painel`, `/admin` ou ações do painel. **Conta da equipe é isenta do
  bloqueio por pendência** (tarefa 2b: conta que `carregarMembro` reconhece, com a mesma regra de
  `contaDesativada`), e checagem de equipe que falha responde "liberado". A permissão de
  `bloquearReciboPorDebito`/`desbloquearRecibo` usa `carregarMembro`, que cai no bootstrap do ambiente
  quando o banco falha.
- **Dinheiro sempre em centavos inteiros** — `Cents`, sem divisão que gere fração.
- **Fórmulas do hash e do ledger não mudam** — nenhum arquivo de `src/domain/hash.ts`, `ledger.ts`,
  `analise.ts`, `src/server/db/derivar.ts`.
- **Motor e padrões não mudam** — `src/domain/market.ts`, `fees.ts`, `constants.ts`, `types.ts` só são
  importados. `AppState` não muda de formato, portanto `STORE_KEY` não sobe.
- **Nada de `@/server/*` em Client Component.** As telas importam `src/domain/bloqueio-por-debito.ts`,
  `src/domain/custodia-texto.ts` e o hook `useBloqueioPorPendencia` (tarefa 2b), que chama a Server Action
  `@/server/actions/bloqueio-por-debito` — chamar Server Action pelo cliente é permitido; o que não entra
  em Client Component é `@/server/custodia/*`, `@/server/admin/*` ou `@/server/state`.
- **Comentários em português explicando o porquê**, com bloco no topo dos dois arquivos novos dizendo qual
  erro evitam. Atalho tomado entra no `RISCOS_ASSUMIDOS.md` **e** no `ATALHOS.md` da pasta, no mesmo commit.
- **Não mexer em DNS, e-mail, domínio**, não criar conta em serviço externo, não gerar credencial.
- **Um agente não digita senha em tela de login** e não cria rota, script ou cookie que pule
  autenticação. Conferência de tela logada é por teste ou fica no roteiro do Gabriel.
- **A branch não faz merge na main.** Antes de cada push: `npm run typecheck`; `npm run lint`;
  `npm test`; `npm run build`.
- **Windows, PowerShell 5.1**: sem `&&`; use `;` e `if ($?) { ... }`. Repositório público de propósito.

---

## O que NÃO fazer

- Não alterar `isInadimplente` nem `verificarStatusFatura` (`src/domain/custody.ts`): mudar o "ou" lá
  dentro trava a marca para sempre nos cinco pontos que a regravam.
- Não gravar `'Bloqueado'` no recibo por pendência, não apagar anúncio de conta com pendência e não criar
  migration — o bloqueio é calculado (RA-52).
- Não editar `src/domain/market.ts` para filtrar ofertas; o filtro vive em `casarOrdensRespeitandoPendencia`.
- Não tocar `src/server/payments/conciliacao.ts` (E2), mesmo para a pendência na confirmação (RA-53, que é
  da E8 na segunda onda).
- Não separar a marca manual da marca por fatura nem mexer em `src/server/admin/usuarios.ts` ou na ficha do
  painel (registrar no relatório como achado).
- Não bloquear conta da equipe: a isenção da tarefa 2b é decisão tomada, não dúvida para o relatório. Não
  pôr a checagem de equipe dentro da transação nem transformar falha dela em recusa.
- Não escrever número de taxa fixo em texto de tela (a Tabela de Taxas é editável).
- Não editar `vitest.config.mts`.
- Não marcar A-4 ou B-2 como feitas nos arquivos de pendência (E7 e integração).
- Não fazer merge, rebase interativo, `git stash` sem etiqueta nem `push --force`.

---

## Entrega

1. **Commits** (mensagem sem acento é aceitável), por exemplo:
   - `Textos da custodia no extrato e no envio pelo plano e pela quantidade do protocolo` (tarefas 1, 3, 4, 5)
   - `Recibo bloqueado por fatura de custodia vencida na venda e na retirada` (tarefas 2, 2b, 6, 8)
   - `Telas mostram o bloqueio por pendencia e os anuncios pausados` (tarefa 7)
   - `Relatorio da E4`
   Cada mensagem termina com a linha de coautoria do agente, se houver
   (`Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>` para o Claude).
2. **Ciclo antes do push**, no worktree:

   ```powershell
   Set-Location C:\dev\AureaCustodiaMVP-e4
   npm run typecheck; if ($?) { npm run lint }; if ($?) { npm test }; if ($?) { npm run build }
   git diff --name-only origin/main...HEAD
   git push -u origin exec/e4-custodia-preco-e-inadimplencia
   ```

   Rode o `npm test` com o servidor de desenvolvimento da porta 3104 **parado**. Compare com a base: 86
   arquivos + os 5 novos desta branch = **91 arquivos**, com 741 testes da base passando e 1 pulado, mais os
   novos. Arquivo que "sumiu" da contagem é worker morto: rode de novo só ele com
   `npx vitest run <arquivo>` e registre no relatório. Confira na lista do `git diff --name-only` que nenhum
   caminho do "Não pode editar" aparece.
3. **Relatório** em `docs/execucao-pendencias/relatorios/E4.md` com:
   - **O que foi feito**, por pendência (A-4 e B-2), com caminho:linha;
   - **O que já estava resolvido** e como foi conferido (migration 013, commit `2cc7194`, merge `cc3c95c`,
     `git log -S custodyCharges`, varredura de "faixa");
   - **Testes**: contagem antes e depois, arquivos novos e o que cada um prova;
   - **O que foi conferido e como** (comandos rodados, saída resumida);
   - **Riscos**: RA-52 e RA-53, e "migration 027 não usada";
   - **Achados para a integração** (fora do escopo): marca manual de inadimplência apagada ao pagar fatura
     ou no ciclo, e a ficha do painel mostrando a marca por fatura como "marca manual"
     (`src/domain/admin/usuarios.ts:379`); a conciliação sem reconferência (RA-53, dona: E8, segunda
     onda); a sugestão de marcar A-4 e B-2 como `✅ FEITO` nos arquivos de pendências manuais (tarefa da
     integração);
   - **Passos manuais** (nenhum obrigatório; copiar o roteiro opcional abaixo);
   - a última linha: `E4 pronta para integração — <hash do último commit>`.

---

## Passos manuais que sobram para o Gabriel

Nenhum obrigatório: não há migration, variável de ambiente nem configuração de painel externo.

**Roteiro opcional de conferência, depois da integração e do deploy**, feito pelo Gabriel com a conta
dele (o agente não entra em conta):

1. Entrar no site com `gabriel.silva@aureacustodia.com.br`, abrir `/conta/extrato` e ler as duas notas do
   rodapé: nenhuma fala em "0,5% + R$ 1,00 retida do vendedor" nem em "não é debitada".
2. Em `/conta/faturas`, se houver fatura de contratação de plano anual, conferir que a linha
   correspondente em `/conta/extrato` diz "Plano anual de custódia".
3. **Criar a condição com uma conta de TESTE fora da equipe.** Conta da equipe é isenta e não mostra
   bloqueio nenhum: não use a sua, nem conta do seed, nem e-mail de `AUREA_ADMIN_EMAILS`, nem membro de
   Equipe e papéis. Use uma conta de cliente de teste criada pelo cadastro do site, de preferência com ao
   menos um recibo.
   - Com a sua conta, abrir a ficha dela em `/admin/usuarios/<e-mail da conta de teste>`, seção
     **Inadimplência**, e clicar **Marcar como inadimplente** (a função `contaComPendenciaDeCustodia` já
     considera essa marca).
   - Entrar com a conta de teste (outra janela anônima) e abrir um recibo em `/recibos/<código>`: o carimbo
     diz "PENDÊNCIA DE CUSTÓDIA" e os botões "Solicitar retirada" e "Colocar à venda" ficam apagados; em
     `/vender` aparece o aviso. Sem recibo na conta, confira só o aviso de `/vender` e a faixa de
     `/conta/faturas`.
   - Voltar à ficha e clicar **Retirar a marca manual**; os botões voltam no ciclo seguinte de atualização
     da tela (até 10 segundos). Se preferir testar com fatura vencida de verdade, pagar a fatura em
     `/conta/faturas` libera do mesmo jeito: sem `MP_ACCESS_TOKEN` em produção o Pix e o cartão respondem
     pelo simulador, e com a credencial cadastrada passam pelo gateway.
