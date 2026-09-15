# E2 · Cobrança e valor de entrada com a configuração vigente

```
Branch:                exec/e2-cobranca-com-configuracao-vigente
Base:                  origin/main com o commit de base desta rodada (os oito documentos de
                       docs/execucao-pendencias/, o bloco oxc em vitest.config.mts e o RA-01
                       de src/server/actions/ATALHOS.md encerrado), sobre 40bb8c8
Worktree sugerido:     C:\dev\AureaCustodiaMVP-e2
Porta local:           3102 (npm run dev -- -p 3102); nunca a 3000
Pendências de origem:  P-C3-03 (docs/finalizacoes/PENDENCIAS_AGENTE_C.md:353) · atualiza RA-24 e RA-47
RA reservados:         RA-51 (só se surgir atalho novo; o esperado é não usar)
Migration:             nenhuma. A E2 não usa migration; 026–029 ficam sem uso nesta rodada e
                       `npm run db:check` continua terminando em 025
Relatório de saída:    docs/execucao-pendencias/relatorios/E2.md
```

> Revisado em 15/09/2026 contra a crítica de sobreposição (docs/execucao-pendencias/00_PLANO_MESTRE.md).

> **Para o Rogério.** Desde a C3 a equipe muda comissões e o catálogo de moedas pela tela
> `/admin/configuracao`, e quase todo o site já obedece. Dois cantos ainda seguiam os números antigos
> do código. O primeiro é a compra de moeda paga direto por Pix ou cartão: o vendedor recebia com
> a comissão antiga, mesmo com outra salva no painel. O segundo é a bancada: quando uma moeda nova
> é aprovada, o valor estimado do recibo depende de o tipo estar ou não no mercado, e essa resposta
> vinha do código, não do painel. Quando esta branch terminar, os dois cantos leem a mesma
> configuração que o resto do site. O extrato do vendedor e o livro-razão passam a mostrar a
> comissão que foi cobrada de fato. Se o banco falhar na leitura, a operação não para: vale a tabela
> padrão, como no resto do site. Uma coisa fica como está, e está registrada no RA-24: quem compra
> pelo Pix ou cartão continua sem pagar a comissão de compra. Essa outra metade fica para a E8, na
> segunda onda.

---

## Objetivo final — pronto quando

1. `src/server/payments/conciliacao.ts` não importa mais `tradeFee`. A compra direta desconta do
   vendedor `comissaoPorMoeda(price, taxas).vendedor`, e `taxas` vem de `carregarTabelaDeTaxas()`.
   Conferir com: `Select-String -Path src\server\payments\conciliacao.ts -Pattern 'tradeFee'` → nenhuma linha.
2. O `Trade` que a compra direta grava traz `feeVendedor`, `feeComprador: 0` e `fee`. O teste
   `o livro-razão da compra direta fecha sem ajuste com a comissão vigente` passa, com
   `derivarLancamentos(...).ajustes` igual a `[]`.
3. `valorDeEntrada` em `src/server/estacao/analise.ts` recebe o catálogo e chama
   `isNegociavel(tipoMoeda, catalogo)`. `fecharAnalise` lê o catálogo com `carregarCatalogo()` antes
   do `mutateState`.
4. Os testes novos passam: `npx vitest run src/server/payments/compra-direta-taxa-vigente.test.ts src/server/estacao/valor-de-entrada.test.ts`.
   Os testes antigos passam **sem nenhuma alteração**: `src/server/payments/conciliacao.test.ts` e
   `src/server/estacao/analise.test.ts`.
5. A fórmula do hash não mudou. `git diff origin/main --stat -- src/domain estacao src/server/db`
   não mostra nada.
6. RA-24 e RA-47 estão atualizados em `RISCOS_ASSUMIDOS.md` (linha do índice e bloco) e nos
   `ATALHOS.md` das pastas, no mesmo commit.
7. `npm run typecheck`, `npm run lint`, `npm test` e `npm run build` passam no worktree. A branch
   está no GitHub e **não** foi mesclada na main.

---

## O que o código faz hoje

Conferido em `40bb8c8`. **Nada da P-C3-03 está resolvido.** Já existe tudo o que a correção usa.

### Compra direta pelo gateway — `src/server/payments/conciliacao.ts`

- `:12` importa `tradeFee` de `@/domain/fees`.
- `:32-36` é o tipo `Liquidador = (s, intencao, detalhes) => ResultadoLiquidacao`. É síncrono e roda
  dentro do `mutateState`, então não pode ler o banco. A tabela precisa chegar pronta.
- `:94-100` é o laço de `liquidarCompraDireta`. Em `:96`, `const fee = tradeFee(price)` é a comissão
  **padrão** do vendedor (`TAXAS_PADRAO`, `src/domain/fees.ts:82-84`). Em `:98`,
  `seller.balance += price - fee`.
- `:105-112`: o `s.trades.push` **não grava** `fee`, `feeComprador` nem `feeVendedor`.
- `:430-439` é o `mutateState` que chama o liquidador, dentro de um `try` que devolve a intenção para
  `pendente` se algo falhar.
- `:382` é o comentário do despachante: "credita vendedor líquido de taxa".

**A armadilha que decide a tarefa.** Trocar só a linha `:96` quebra o livro-razão. Quando o `Trade`
não traz comissão, três lugares recalculam a comissão **padrão**:
- `src/server/db/derivar.ts:75`, que monta os lançamentos do ledger;
- `src/server/db/diff.ts:185` (`normalizarTrade`), que grava `aurea.trades`;
- `src/domain/statement.ts:127`, que monta o extrato do cliente.

Se o vendedor receber pela tabela do painel e o `Trade` não disser quanto foi cobrado, a diferença
vira um lançamento `ajuste` (`derivar.ts:197-212`), e o extrato mostra uma comissão que não
aconteceu. `buyLot` já faz certo: lê as taxas antes da transação (`src/server/actions/market.ts:121`),
calcula por `comissaoPorMoeda(price, taxas)` (`:208`) e grava as três comissões no `Trade` (`:231-241`).

**O que continua de fora (RA-24).** `iniciarCompraDireta` (`src/server/actions/payments.ts:202-203`)
cobra só `price * qty` no gateway, sem comissão do comprador. O modal de `/mercado`
(`src/app/(app)/mercado/page.tsx:533-534` e `:607-615`) mostra "Comissão de compra da Áurea" e "Total
a pagar (debitado da conta)" num resumo que vale para as duas opções de pagamento, mas o Pix e o
cartão cobram só o subtotal. Mudar isso altera o valor da cobrança e a tela, e **não faz parte da
E2**: vai para a **E8, na segunda onda** (ver Dúvidas).

### Valor de entrada da análise — `src/server/estacao/analise.ts`

- `:11` importa `faixaValor` e `isNegociavel` de `@/domain/constants`.
- `:162-167` é `valorDeEntrada(state, tipoMoeda)`. Em `:163`, `isNegociavel(tipoMoeda)` roda **sem
  catálogo** e cai em `COIN_TYPES` (`src/domain/constants.ts:277-280`). Por isso um tipo ligado ao
  mercado no painel nasce no meio da faixa, e um tipo desligado continua usando a mediana.
- `:215` chama a função dentro do `mutateState` (`:196`).
- Quem chama `fecharAnalise` hoje: a estação, em `src/app/api/estacao/analise/fechar/route.ts:136`,
  e a bancada web, em `src/server/admin/portas.ts:73`. As duas recebem a correção sem precisar de
  edição.
- **O hash não está em risco.** `valorEstimado` é campo da `Coin` (`analise.ts:237`) e não faz parte
  dos quinze campos de `CAMPOS_DA_ANALISE` (`src/domain/analise.ts:55-71`).
- `advanceAnalysis` (`src/server/actions/custody.ts:249` e `:280`) já faz o mesmo com o catálogo
  vigente. É o modelo a seguir.

### O que já existe e só se usa

- `carregarTabelaDeTaxas()` (`src/server/taxas/carregar.ts:19-21`) repassa para
  `carregarTabelaDeTaxasVigente()`.
- `carregarCatalogo()` está em `src/server/config/carregar.ts:112-114`.
- `carregarConfiguracaoDoSite()` (`src/server/config/carregar.ts:75-90`) devolve o padrão do código
  quando não há banco, quando não há tabela ou quando a leitura falha (RA-47). Ela não lança erro;
  mesmo assim, as tarefas abaixo põem um `.catch` explícito (ver o motivo na tarefa 2).
- Nos testes sem `POSTGRES_URL`, `bancoConfigurado()` (`src/server/db/client.ts:42`) responde
  `false` e as duas funções devolvem o padrão. Por isso os testes antigos continuam verdes sem mock.

---

## Tarefas

### 0. Preparar o worktree

```powershell
git -C C:\dev\AureaCustodiaMVP fetch origin
git -C C:\dev\AureaCustodiaMVP worktree add C:\dev\AureaCustodiaMVP-e2 -b exec/e2-cobranca-com-configuracao-vigente origin/main
Set-Location C:\dev\AureaCustodiaMVP-e2
npm install
Test-Path src\app\painel\page.tsx
```

Confira também que o commit de base desta rodada está no worktree:

```powershell
Test-Path docs\execucao-pendencias\E2_COBRANCA_COM_CONFIGURACAO_VIGENTE.md
```

Os dois `Test-Path` precisam responder `True`. Se algum responder `False`, a base está velha: pare e
refaça a partir de `origin/main` depois do `git fetch`.

Antes de mexer em código, rode `npm test` uma vez com nenhum servidor de desenvolvimento deste
worktree ligado. A base desta rodada é **86 arquivos de teste, 741 testes passando e 1 pulado**.
Anote o que sair; é a contagem "antes" do relatório.

### 1. Liquidador recebe as regras lidas antes da transação

**Arquivo:** `src/server/payments/conciliacao.ts`.

- Acrescentar ao lado de `Liquidador`:

  ```ts
  /** O que a liquidação lê da configuração vigente ANTES da transação (C3 / P-C3-03). */
  export interface RegrasDaLiquidacao {
    taxas: TabelaDeTaxas
  }

  export type Liquidador = (
    s: AppState,
    intencao: IntencaoDeposito,
    detalhes: DetalhesPagamento,
    regras: RegrasDaLiquidacao,
  ) => ResultadoLiquidacao
  ```

  Os outros liquidadores continuam com três parâmetros. O TypeScript aceita função com menos
  parâmetros no lugar de uma com mais, então `LIQUIDADORES` (`:354`) compila sem mexer neles.
- **Por quê:** o liquidador roda dentro do `mutateState` e não pode ser assíncrono. Ler a tabela lá
  dentro seguraria a trava da linha (`SELECT … FOR UPDATE`) enquanto consulta o banco.
- **Teste que prova:** typecheck, mais os testes da tarefa 2.

### 2. `conciliarPagamento` lê a tabela vigente e cai no padrão se a leitura falhar

**Arquivo:** `src/server/payments/conciliacao.ts`, no bloco `:430-439`.

```ts
try {
  // A tabela é lida antes da transação, como em buyLot (executar, src/server/actions/market.ts).
  // Leitura que falha não pode deixar o pagamento sem liquidar: o cliente já pagou. Vale a
  // tabela padrão, a mesma regra de carregarConfiguracaoDoSite (RA-47).
  const taxas = await carregarTabelaDeTaxas().catch((err: unknown) => {
    console.error('[conciliarPagamento] tabela de taxas não leu; valendo o padrão do código:', err)
    return TAXAS_PADRAO
  })
  await mutateState((s) => {
    resLiquidacao = liquidador(s, reivindicada, detalhes, { taxas })
  })
} catch (erro) {
  await intencoes.devolverParaPendente(ref)
  throw erro
}
```

- Imports: `carregarTabelaDeTaxas` de `@/server/taxas/carregar`; `TAXAS_PADRAO`, `comissaoPorMoeda`
  e `type TabelaDeTaxas` de `@/domain/fees`. Remover `tradeFee` do import.
- **Por que dentro do `try`:** se algo lançar erro, a intenção volta para `pendente` e não fica presa
  em `creditando`.
- **Por que o `.catch`, se a função já cai no padrão:** ele deixa a garantia escrita no único ponto
  em que um pagamento vira crédito, e deixa o caso de falha testável com um mock que rejeita.
- **Qual tabela vale:** a vigente **na aprovação do pagamento**, que é o momento em que a negociação
  acontece. É a mesma regra do RA-46, em que a mudança vale a partir da próxima operação. O
  comprador pagou só o preço, então o momento da leitura não muda o que ele pagou.
- **Teste que prova:** `leitura da tabela que falha cai na tabela padrão e a compra conclui` e
  `depósito comum não muda com a tabela vigente`.

### 3. `liquidarCompraDireta` cobra pela tabela vigente e grava a comissão no `Trade`

**Arquivo:** `src/server/payments/conciliacao.ts`, em `liquidarCompraDireta` (`:68-154`).

- Assinatura: `function liquidarCompraDireta(s, reivindicada, _detalhes: DetalhesPagamento, regras: RegrasDaLiquidacao)`.
  O parâmetro `detalhes` fica só para manter a posição de `regras`. O preset `next/typescript`
  acusa parâmetro sem uso como aviso, não como erro, e o prefixo `_` deixa a intenção clara.
- Antes do laço: `const feeVendedorUnit = comissaoPorMoeda(price, 'vendedor', regras.taxas)`.
- No laço: `seller.balance += price - feeVendedorUnit`. Apagar `const fee = tradeFee(price)`.
- No `s.trades.push`, acrescentar `feeComprador: 0`, `feeVendedor: feeVendedorUnit * compradas` e
  `fee: feeVendedorUnit * compradas`.
- Comentário em português, junto ao push, explicando **por que** as três comissões são gravadas: sem
  elas, `derivar.ts:75`, `diff.ts:185` e `statement.ts:127` recalculam a comissão padrão, e o ledger
  ganha um `ajuste`. E por que `feeComprador` é zero: o gateway cobra só o preço (RA-24).
- Atualizar o comentário do despachante (`:382`) para "credita o vendedor líquido da comissão da
  tabela vigente".
- **Não** mexer em `podeComprar`, no troco nem nos ramos de lote indisponível. Não fazem parte da
  P-C3-03.
- **Teste que prova:** os casos 1, 2, 3 e 5 de `compra-direta-taxa-vigente.test.ts`.

### 4. Testes da compra direta, em arquivo novo

**Arquivo novo:** `src/server/payments/compra-direta-taxa-vigente.test.ts`. O setup é o mesmo de
`conciliacao.test.ts`, mais o mock da tabela:

```ts
vi.mock('server-only', () => ({}))
const { consultarPagamentoMercadoPago, carregarTabelaDeTaxas } = vi.hoisted(() => ({
  consultarPagamentoMercadoPago: vi.fn(),
  carregarTabelaDeTaxas: vi.fn(),
}))
vi.mock('@/lib/payments', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/payments')>()),
  consultarPagamentoMercadoPago,
}))
vi.mock('@/server/taxas/carregar', () => ({ carregarTabelaDeTaxas }))

const TAXAS_DO_PAINEL: TabelaDeTaxas = {
  ...TAXAS_PADRAO,
  comissaoVendedorBp: 100, comissaoVendedorFixa: 250,   // vendedor: 1% + R$ 2,50
  comissaoCompradorBp: 80, comissaoCompradorFixa: 150,  // comprador: não pode aparecer no gateway
}
```

Cenário: lote do `alex@testeaurea.com.br` com **2 moedas** a R$ 200,00 (`20_000`). Comprador:
`gabrielsilva@testeaurea.com.br`. Intenção `compra_direta` de `40_000`. Use moedas do vendedor sem
oferta aberta, e `lotId` e `externalReference` diferentes em cada caso.

Contas de referência, em centavos:
- tabela do painel: comissão do vendedor por moeda = `200 + 250 = 450`; o vendedor recebe
  `2 × 19_550 = 39_100`;
- tabela padrão: comissão por moeda = `100 + 100 = 200`; o vendedor recebe `2 × 19_800 = 39_600`.

Casos e o que cada um prova estão em [Testes exigidos](#testes-exigidos).

### 5. Valor de entrada decide o mercado pelo catálogo vigente

**Arquivo:** `src/server/estacao/analise.ts`.

- `valorDeEntrada(state: AppState, tipoMoeda: string, catalogo: readonly CoinType[]): Cents`, com
  `isNegociavel(tipoMoeda, catalogo)`. O parâmetro é **obrigatório**: há um chamador só, e um padrão
  silencioso recriaria o defeito.
- Em `fecharAnalise`, dentro do `try` (`:195`) e **antes** do `mutateState`:

  ```ts
  // O catálogo editado no painel decide se o tipo tem mercado (C3 / P-C3-03). É lido antes da
  // transação, como em advanceAnalysis. Moeda que já está na bancada não pode deixar de nascer
  // porque a configuração não respondeu: na falha, vale o catálogo do código (RA-47).
  const catalogo = await carregarCatalogo().catch((err: unknown) => {
    console.error('[fecharAnalise] catálogo não leu; valendo o do código:', err)
    return COIN_TYPES
  })
  ```

  E em `:215`: `const valor = valorDeEntrada(state, envio.tipoMoeda, catalogo)`.
- Imports: `carregarCatalogo` de `@/server/config/carregar`; `COIN_TYPES` de `@/domain/constants`;
  `CoinType` no import de tipos já existente.
- Atualizar o comentário de `valorDeEntrada` (`:153-161`) para dizer que "negociável" é o do
  catálogo vigente.
- **Não tocar** em `encadearAnalise`, `AnalisePendente`, `textoOuNulo`, `validadoEm` nem em nada
  entre `:222-281`.
- `faixaValor` continua sem catálogo: o catálogo do painel não tem faixa (`src/domain/admin/catalogo.ts:111-116`).
  Ver Dúvidas.
- **Teste que prova:** `valor-de-entrada.test.ts`.

### 6. Testes do valor de entrada, em arquivo novo

**Arquivo novo:** `src/server/estacao/valor-de-entrada.test.ts`. Os mocks de `server-only` e de
`@/server/state` são os mesmos de `analise.test.ts` (`:3-9` e `:40-49`), mais:

```ts
const { carregarCatalogo } = vi.hoisted(() => ({ carregarCatalogo: vi.fn() }))
vi.mock('@/server/config/carregar', () => ({ carregarCatalogo }))
```

Envio `RO-ENV-0001` do `rogeriopena@testeaurea.com.br`, com uma moeda e veredito `aprovada`. Ofertas
de outro vendedor em `state.sellOffers`, com `createdAt: Date.now()`. Monte o catálogo de teste a
partir de `COIN_TYPES`, mudando só `negociavel`.

Contas de referência:
- `Atletismo` ligado ao mercado, com ofertas de `50_000` e `60_000`: mediana `55_000`, que já é
  múltiplo de R$ 5,00. Com o catálogo do código seria o meio da faixa padrão, `25_000`.
- `Entrega da Bandeira Olímpica` desligada do mercado, com uma oferta de `40_000`: meio da faixa
  `(23_500 + 30_000) / 2 = 26_750`, arredondado para `27_000`.

### 7. Atualizar os registros de risco

- **`RISCOS_ASSUMIDOS.md`**
  - Índice, linha do **RA-24** (`:57`): trocar o texto por
    `Compra direta via gateway não cobra a comissão do comprador; a do vendedor segue a tabela vigente desde a E2`.
    Manter 🟡 e `src/server/payments/`.
  - Bloco **RA-24** (`:722-738`): dizer que a comissão do **vendedor** passou a vir de
    `carregarTabelaDeTaxas()` e fica gravada no `Trade` (E2, 15/09/2026). Dizer que falta a do
    **comprador** (a compra direta pelo gateway não cobra a comissão de compra, e o modal de
    `/mercado` mostra o total com comissão), que depende de `iniciarCompraDireta` e do modal, e que
    essa parte fica para a **E8, na segunda onda**. "Nota em" passa a apontar para
    `src/server/payments/ATALHOS.md`.
  - Índice, linha do **RA-47** (`:69`): trocar o texto por
    `Leitura da configuração que falha cai no padrão do código, sem trava`.
  - Bloco **RA-47** (`:1046-1055`): trocar o parágrafo "E dois pontos ainda leem…" por um registro de
    que a compra direta pelo gateway e o valor de entrada da análise passaram a ler a configuração
    vigente na E2, e que, se a leitura falhar, também caem no padrão.
- **`src/server/config/ATALHOS.md`**, só o bloco RA-47 (`:22-36`): apagar o terceiro item
  (`:31-33`) e a primeira metade do "Como se paga" (`:35`); fica só o cache curto, se a leitura por
  operação pesar.
- **`src/server/payments/ATALHOS.md`** (arquivo novo na pasta existente): cabeçalho no padrão de
  `src/server/config/ATALHOS.md` e um bloco `## RA-24 🟡`, com arquivos, o que falta e como se paga.
- **`src/server/payments/README.md`**: uma linha na tabela "Arquivos" para `ATALHOS.md`.
- **RA-51:** use só se aparecer um atalho **novo** que não caiba no RA-24, no RA-46 ou no RA-47. Se
  usar, ele entra no índice e no corpo logo depois do RA-48, o maior número da base. Outras branches
  também inserem ali; o conflito é esperado e a integração resolve pela união, em ordem numérica.
  Não tente prever a posição dos RA das outras branches. Se não usar, o relatório diz "RA-51 não
  usado".

### 8. Ciclo, commits, push e relatório

Ver [Entrega](#entrega).

---

## Território

### Pode editar

| Caminho | Limite |
|---|---|
| `src/server/payments/conciliacao.ts` | Tipo `Liquidador` e `RegrasDaLiquidacao`, imports, a leitura em `conciliarPagamento`, as linhas de comissão e o `trades.push` de `liquidarCompraDireta`, e o comentário `:382` |
| `src/server/payments/compra-direta-taxa-vigente.test.ts` | Arquivo novo |
| `src/server/payments/ATALHOS.md` | Arquivo novo, só o bloco RA-24 |
| `src/server/payments/README.md` | Uma linha na tabela "Arquivos" |
| `src/server/estacao/analise.ts` | Imports, `valorDeEntrada` e seu comentário, a leitura do catálogo e a chamada em `fecharAnalise` |
| `src/server/estacao/valor-de-entrada.test.ts` | Arquivo novo |
| `RISCOS_ASSUMIDOS.md` | Só as linhas do índice e os blocos do RA-24 e do RA-47; RA-51 só se usado |
| `src/server/config/ATALHOS.md` | Só o bloco RA-47 |
| `docs/execucao-pendencias/relatorios/E2.md` | Arquivo novo (sem README na pasta; a integração cria) |

### Não pode editar

| Caminho | De quem é, ou por quê |
|---|---|
| `src/server/payments/conciliacao.test.ts`, `src/server/estacao/analise.test.ts` | Precisam passar **como estão**; é a prova de que nada antigo mudou |
| `src/domain/fees.ts`, `constants.ts`, `market.ts`, `types.ts`, `analise.ts`, `analise.test.ts`, `hash.ts`, `ledger.ts`, `estacao/CONTRATO.md` | Fórmula do hash, ledger e padrões do código |
| `src/server/config/carregar.ts`, `src/server/taxas/carregar.ts`, `src/domain/admin/**` | Só uso; o território da configuração é da E6 |
| `src/server/db/diff.ts`, `src/server/db/derivar.ts`, `src/server/db/db.test.ts` | `diff.ts` é da E1 (P-C2-09); derivação do ledger não muda |
| `src/server/actions/payments.ts` (`iniciarCompraDireta`), `src/app/(app)/mercado/page.tsx` | Comissão do comprador e modal de `/mercado`: E8, segunda onda (Dúvidas). Nesta rodada, `mercado/page.tsx` é da E4 |
| `vitest.config.mts` | Já vem pronto no commit de base; nenhuma branch edita |
| `src/server/actions/custody.ts`, `sell.ts`, `market.ts`, `/conta/extrato`, `/envios` | E4 (custódia e inadimplência) |
| `src/server/admin/**`, `src/app/(admin)/**`, `src/components/admin/**`, `src/app/painel/**`, `src/server/auth/**`, `src/app/entrar/**` | E1, E5 e E6; a entrada `/painel` não pode quebrar |
| `src/components/relatorios/`, `src/server/actions/contabil.ts`, `src/server/relatorios/acesso.ts` | E3 |
| `docs/finalizacoes/**`, `docs/publish_docs/**` | E7 e integração (a P-C3-03 é marcada pela integração) |
| `src/server/db/migrations/**` | E2 não usa migration |

### Arquivos compartilhados e regra de convivência

- **`src/server/payments/conciliacao.ts`**: nesta rodada, só a E2 edita. A E2 não reformata, não
  move nem renomeia funções e não mexe em `podeComprar`, no troco nem nos ramos de lote
  indisponível, para que a branch de seguimento que vier depois dos merges encontre o arquivo
  reconhecível.
- **`src/server/estacao/analise.ts`**: a E6 faz QA da bancada, que chama este serviço. A E2 muda só
  `valorDeEntrada` e a leitura antes do `mutateState`.
- **`RISCOS_ASSUMIDOS.md`**: cada branch edita só as linhas dos seus RA. A E2 não renumera, não
  reordena e não reformata a tabela.
- **`src/server/config/ATALHOS.md`**: a E2 edita só o bloco RA-47. A E6 pode acrescentar RA-55 no fim.
- **`src/server/payments/ATALHOS.md`** e **`README.md`**: se outra branch também criar o ATALHOS, a
  integração junta os blocos por número de RA.

---

## Testes exigidos

### `src/server/payments/compra-direta-taxa-vigente.test.ts` (novo)

| Caso (`it`) | O que prova |
|---|---|
| `desconta do vendedor a comissão da tabela vigente, não a padrão` | Com `TAXAS_DO_PAINEL`, o saldo do vendedor sobe `39_100` (e não `39_600`); `res.compraConcluida === true`; as duas moedas estão com o comprador |
| `grava no histórico a comissão cobrada: feeVendedor da tabela vigente e feeComprador zero` | O último `Trade` tem `{ qty: 2, feeVendedor: 900, feeComprador: 0, fee: 900 }` |
| `a comissão do comprador da tabela vigente não entra na compra pelo gateway (RA-24)` | Saldo do comprador igual ao de antes; o `deposits` novo do comprador é `40_000` |
| `leitura da tabela que falha cai na tabela padrão e a compra conclui` | Com `carregarTabelaDeTaxas.mockRejectedValue(new Error('banco fora'))`: vendedor `+39_600`, `res.creditado === true`, intenção `creditado` |
| `o livro-razão da compra direta fecha sem ajuste com a comissão vigente` | Teste puro. `antes = structuredClone(estado com as ofertas)`, `depois = structuredClone(antes)`, `LIQUIDADORES.compra_direta(depois, intencao, detalhes, { taxas: TAXAS_DO_PAINEL })`, depois `derivarLancamentos({ antes, depois, ops: [], semeadura: false, agora: Date.now(), hashAnterior: GENESIS })`. Espera `ajustes` igual a `[]` e um lançamento `comissao` do vendedor com `valor: 900`. **É o teste que falha se o `Trade` não gravar a comissão** |
| `depósito comum não muda com a tabela vigente` | Intenção `deposito` de `25_000` com `TAXAS_DO_PAINEL`: o saldo sobe exatamente `25_000` |

### `src/server/estacao/valor-de-entrada.test.ts` (novo)

| Caso (`it`) | O que prova |
|---|---|
| `tipo ligado ao mercado no painel nasce com a mediana das ofertas dele` | Catálogo com `Atletismo` `negociavel: true` e ofertas de `50_000` e `60_000`: `coin.valorEstimado === 55_000` |
| `tipo desligado do mercado no painel nasce com o meio da faixa, mesmo com oferta aberta` | Catálogo com a Bandeira `negociavel: false` e oferta de `40_000`: `valorEstimado === 27_000` |
| `catálogo que não lê cai no catálogo do código e a análise fecha` | Com `carregarCatalogo.mockRejectedValue(new Error('banco fora'))`: `r.ok === true`, e a Bandeira com oferta de `40_000` nasce com `40_000` |
| `o catálogo não entra no hash: a mesma análise com catálogos diferentes dá o mesmo hash` | `vi.useFakeTimers({ toFake: ['Date'] })` e `vi.setSystemTime(1_757_900_000_000)`. Rodar com `state = seedState()` e o catálogo A, guardar `state.analises[0].hash` e `valorEstimado`. Recriar `state = seedState()`, rodar com o catálogo B. **Hash igual**, `valorEstimado` diferente. `vi.useRealTimers()` no fim |

### Testes existentes que precisam continuar verdes sem edição

- `src/server/payments/conciliacao.test.ts`, principalmente
  `compra direta via webhook: transfere moeda, credita vendedor menos taxa…` (`:192`), que continua
  esperando a comissão padrão porque não há banco no teste.
- `src/server/estacao/analise.test.ts` inteiro.
- `src/domain/analise.test.ts`, com o vetor congelado do hash.
- `src/server/db/derivar.test.ts`, `src/server/db/diff.test.ts` e `src/server/admin/banco.test.ts`
  (bancada web).

Rodada focada:

```powershell
npx vitest run src/server/payments src/server/estacao src/domain/analise.test.ts src/server/db/derivar.test.ts
```

---

## Regras que valem nesta branch

- **Palavras proibidas** em código novo, comentário, nome de teste, commit, relatório e RA: token,
  NFT, cripto, ativo digital, ativo (no sentido de bem negociável), investimento, investidor,
  corretora, rentabilidade, retorno. Use "recibo" para o comprovante e "moeda" ou "item" para o
  objeto. O campo `CoinType.ativo` e o status `'Ativo'` do recibo já existem com o sentido de "em
  atividade" e ficam. Nos comentários novos, escreva "o que a função devolve", não "retorno".
- **Nenhuma trava nova.** Nada de feature flag, variável de ambiente que liga ou desliga,
  confirmação obrigatória ou modo fechado. Se a leitura da configuração falhar, vale o padrão e a
  operação segue.
- **Dinheiro sempre em centavos inteiros.** A comissão sai de `comissaoPorMoeda` (`Math.round` em
  pontos-base); nada de `* 0.005` no código de produção.
- **A fórmula do hash da análise não muda.** Isso inclui os quinze campos de `estacao/CONTRATO.md`,
  `CAMPOS_DA_ANALISE` e o vetor de `src/domain/analise.test.ts`. A fórmula do ledger também não muda
  (`src/domain/hash.ts`, `ledger.ts`).
- **Nada de `@/server/*` em Client Component.** Esta branch não toca em componente.
- **Toda mutação passa por `mutateState`.** A leitura assíncrona fica antes da transação, nunca
  dentro dela.
- **Comentários em português explicando o porquê.** Atalho novo ou atualizado entra em
  `RISCOS_ASSUMIDOS.md` e no `ATALHOS.md` da pasta, **no mesmo commit**.
- **Não mexer em DNS, e-mail, domínio, Vercel ou Supabase.** Não criar conta nem credencial. Não é
  esperada variável de ambiente nova; se aparecer, peça no relatório com nome e valor literal completo.
- **Sem senha em tela de login e sem rota, script ou cookie que pule autenticação.** O que se
  confere logado fica no roteiro para o Gabriel.
- **Ambiente:** Windows, PowerShell 5.1. Sem `&&`: use `;` e `if ($?) { … }`. O repositório é público
  de propósito.
- **Porta 3102.** A E2 não tem tela e não precisa de servidor de desenvolvimento. Se subir um, é só
  `npm run dev -- -p 3102`, em `http://localhost:3102`. Nunca a 3000, que é a da pasta principal do
  Gabriel. Pare esse servidor antes de rodar `npm test`.
- **Sem merge na main.** Antes de cada push, rode o ciclo completo.

## O que NÃO fazer

- Não trocar só a linha `:96` e deixar o `Trade` sem comissão. Isso gera `ajuste` no ledger e um
  extrato errado.
- Não cobrar a comissão do comprador no gateway, não mudar o valor da intenção em
  `iniciarCompraDireta` e não mexer no modal de `/mercado`, que mostra o total com comissão enquanto
  o Pix e o cartão cobram só o subtotal. Isso é a outra metade do RA-24 e **vai para a E8, na
  segunda onda**, não para esta branch.
- Não ler a configuração dentro do `mutateState` e não tornar o `Liquidador` assíncrono.
- Não mudar `faixaValor`, `FAIXA_VALOR`, `COIN_TYPES`, `TAXAS_PADRAO` nem `isNegociavel`.
- Não criar cache da configuração em memória (RA-47 explica por quê).
- Não editar `conciliacao.test.ts` nem `analise.test.ts` para "acomodar" a mudança. Se um deles
  quebrar, o defeito está no código novo.
- Não mexer em `advanceAnalysis`, na rota da estação, em `portas.ts` nem na bancada web.
- Não marcar a P-C3-03 como feita em `docs/finalizacoes/PENDENCIAS_AGENTE_C.md`; quem faz isso é a
  integração.
- Não criar migration e não subir `STORE_KEY`: o formato do `AppState` não muda, porque os campos de
  comissão do `Trade` já existem.
- Não editar `vitest.config.mts`. Os testes novos não renderizam tela e rodam com a configuração da
  base.
- Não mudar comissão em produção nem pôr essa mudança no roteiro manual: a conferência pela tela
  fica no roteiro consolidado da integração (docs/execucao-pendencias/INTEGRACAO.md).

---

## Entrega

1. **Ciclo, na raiz do worktree, antes de cada push:**

   ```powershell
   npm run typecheck; if ($?) { npm run lint }; if ($?) { npm test }; if ($?) { npm run build }
   ```

   Rode com o servidor de desenvolvimento deste worktree (porta 3102) parado. A contagem esperada
   de `npm test` é a base mais os dois arquivos novos: **88 arquivos de teste**, 741 testes antigos
   passando mais os dez novos, e 1 pulado. Se aparecerem menos de 88 arquivos, algum "sumiu" da
   contagem: é worker morto (um teste com PGlite próprio de outra pasta, por exemplo). Rode esse
   arquivo sozinho com `npx vitest run <arquivo>` e registre no relatório qual foi e o que deu.

2. **Conferências que vão para o relatório:**

   ```powershell
   git diff origin/main --stat
   git diff origin/main --stat -- src/domain estacao src/server/db
   Select-String -Path src\server\payments\conciliacao.ts -Pattern 'tradeFee'
   git diff origin/main -U0 | Select-String -Pattern '^\+' | Select-String -Pattern 'token|NFT|cripto|ativo digital|investiment|investidor|corretora|rentabilidade|retorno'
   ```

   O primeiro lista só arquivos do território. O segundo e o terceiro não mostram nada. O quarto só
   pode mostrar linha em que o sujeito não é a Áurea, o recibo ou a moeda; explique cada ocorrência.

3. **Commits** (mensagem sem acento é aceitável), nesta ordem:
   - `Compra direta pelo gateway desconta do vendedor a comissao da tabela vigente` —
     `conciliacao.ts` e `compra-direta-taxa-vigente.test.ts`.
   - `Valor de entrada da analise decide mercado pelo catalogo vigente` — `analise.ts` e
     `valor-de-entrada.test.ts`.
   - `Atualiza RA-24 e RA-47: compra direta e analise leem a configuracao vigente` —
     `RISCOS_ASSUMIDOS.md`, `src/server/config/ATALHOS.md`, `src/server/payments/ATALHOS.md` e
     `src/server/payments/README.md`.

     Pode ir junto do primeiro commit, se preferir cumprir "no mesmo commit" ao pé da letra; o
     importante é que o registro de risco não fique para trás.
   - `Relatorio da E2` — `docs/execucao-pendencias/relatorios/E2.md`.

   Cada mensagem termina com a linha `Co-Authored-By` do agente que executou, se houver.

4. **Push da branch, sem merge:**

   ```powershell
   git push -u origin exec/e2-cobranca-com-configuracao-vigente
   ```

5. **Relatório** `docs/execucao-pendencias/relatorios/E2.md`, com:
   - o que foi feito, por arquivo e com linhas;
   - testes: nomes, contagem antes (base: 86 arquivos, 741 passando, 1 pulado) e depois de
     `npm test`, a saída da rodada focada e, se houve, o arquivo que sumiu e a rodada dele sozinho;
   - o que foi conferido e como: as quatro conferências do passo 2, com a saída;
   - riscos: RA-24 (o que foi pago e o que fica para a E8), RA-47 (o que foi pago) e RA-51 (usado
     ou não);
   - migration: "nenhuma usada";
   - passos manuais, com valor literal completo (a seção abaixo);
   - a última linha: `E2 pronta para integração — <hash do último commit de código>`.

## Passos manuais que sobram para o Gabriel

Nenhum passo é pré-requisito. Os testes provam a regra. Este roteiro é a conferência opcional
**depois da integração**. Nenhum passo daqui muda comissão em produção: cada **Salvar** na aba de
taxas publica versão nova da Tabela de Taxas e reabre a faixa de aceite para todas as contas. A
conferência com uma comissão diferente da padrão, feita pela tela, **fica no roteiro consolidado da
integração (docs/execucao-pendencias/INTEGRACAO.md)**, numa mudança só com uma volta.

**Sem credencial do Mercado Pago (o caso de hoje em produção).** Sem `MP_ACCESS_TOKEN` (nem
`MP_ACCESS_TOKEN_TEST`), `src/server/actions/payments.ts` responde pelo simulador de
`src/lib/payments/`. Na tela, o modal de `/mercado` para em "O
gateway de pagamento ainda não está configurado neste ambiente. Nenhuma cobrança foi aberta." e
nenhuma compra direta conclui, então não há extrato para abrir. A conferência da comissão da compra
direta é o teste, que faz o papel do gateway aprovando o pagamento. Na raiz de uma pasta com a main
já integrada, rode:

```powershell
npx vitest run src/server/payments/compra-direta-taxa-vigente.test.ts
```

O esperado é **6 testes passando**. O primeiro prova que, com a comissão do vendedor em 1% + R$ 2,50
na tabela, o vendedor de duas moedas de R$ 200,00 recebe R$ 391,00, e não os R$ 396,00 da tabela
padrão.

**Com credencial do Mercado Pago.** Se `MP_SANDBOX` for `false`, o Pix é dinheiro de verdade entre
contas de sócios: escolha o lote mais barato e uma unidade. A comissão fica como está.

1. Abra `https://aurea-custodia-mvp.vercel.app/admin/configuracao`, aba **Taxas e comissões**, e só
   leia a comissão de venda vigente (percentual e fixa por moeda). Não clique em **Salvar**.
2. Com outra conta de sócio, abra `https://aurea-custodia-mvp.vercel.app/mercado`, escolha um lote de
   outro sócio, uma unidade, e clique em **Pagar com Pix**. Pague.
3. Com a conta do vendedor, abra `https://aurea-custodia-mvp.vercel.app/conta/extrato`. A comissão da
   venda deve bater com o que você leu no passo 1 (com a tabela padrão, 0,5% + R$ 1,00, numa moeda
   de R$ 200,00: **R$ 2,00**). O comprador paga só os R$ 200,00 no Pix; a comissão de compra é a
   parte do RA-24 que fica para a E8.

Para a análise, os testes cobrem tudo. Se quiser ver na tela: marque um tipo como negociável na aba
**Catálogo de moedas**, feche uma análise desse tipo em `/admin/bancada` e abra a moeda em
`https://aurea-custodia-mvp.vercel.app/admin/moedas`. O valor estimado sai da mediana das ofertas
abertas desse tipo. Sem ofertas, sai do meio da faixa.

---

## Dúvidas que este plano não resolve

1. **A comissão do comprador na compra direta pelo gateway** (o que sobra do RA-24). Cobrar exige
   somar a comissão ao valor da cobrança em `iniciarCompraDireta`, gravar essa comissão no `Trade` e
   ajustar o modal. Fica fora da E2 e **vai para a E8, na segunda onda**.
2. **O texto do modal de `/mercado` não bate com o que o gateway cobra.** O resumo comum às duas
   opções mostra "Comissão de compra da Áurea" e "Total a pagar (debitado da conta)", mas a opção
   Pix/cartão cobra só o subtotal. É texto de tela do cliente, fora do território da E2, e vai junto
   com o item 1 para a **E8, na segunda onda**.
3. **Tipo novo cadastrado no painel não tem faixa de valor própria.** Sem mercado, ele nasce no meio
   de `FAIXA_VALOR_PADRAO`, R$ 250,00. Uma faixa por tipo seria um campo novo em `aurea.tipos_moeda`,
   com migration e tela. Não coberto.
