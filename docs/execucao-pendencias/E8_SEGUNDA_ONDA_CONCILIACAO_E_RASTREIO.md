# E8 · Segunda onda: comissão do comprador, pendência na conciliação, rastreio da retirada e marca de inadimplência

```
Branch:               exec/e8-segunda-onda-conciliacao-e-rastreio
Base:                 origin/main DEPOIS da integração de E1–E7 (docs/execucao-pendencias/INTEGRACAO.md).
                      Não roda junto com E1–E7: depende do código da E2 (conciliacao.ts) e da E4
                      (bloqueio por pendência e isenção da equipe)
Worktree sugerido:    C:\dev\AureaCustodiaMVP-e8
Servidor local:       npm run dev -- -p 3108   (http://localhost:3108; nunca a 3000)
Pendências de origem: RA-24 (parte do comprador) · RA-53 · RA-52 (a marca manual apagada) ·
                      achado da E6 (retirada sem rastreio gravado)
RA reservados:        RA-56 (usado: pagamento aprovado que não liquida vira saldo, sem aviso próprio)
Migration reservada:  030 (usada: 030_rastreio_da_retirada.sql)
Relatório de saída:   docs/execucao-pendencias/relatorios/E8.md
```

> Revisado em 15/09/2026 contra a crítica de sobreposição (docs/execucao-pendencias/00_PLANO_MESTRE.md).

> **Para o Rogério.** Esta é a segunda onda: quatro acertos que só podiam ser feitos depois de a
> primeira rodada entrar no site.
> **1.** Quem compra moeda pagando direto por Pix ou cartão via na tela "Total a pagar" com a comissão
> de compra, mas o Pix cobrava só o preço das moedas. Agora cobra exatamente o total da tela, e o
> livro-razão registra a comissão de quem compra e a de quem vende.
> **2.** A primeira rodada bloqueou venda e retirada de quem tem fatura de custódia vencida, mas só na
> hora de gerar a cobrança. Se a fatura vencer entre gerar o Pix e o Pix cair, o pagamento ainda
> concluía. Agora a conferência também acontece quando o pagamento chega. Nesse caso o dinheiro não
> se perde: entra inteiro no saldo da conta de quem pagou, e o recibo e o anúncio ficam como estavam.
> As contas da equipe continuam fora dessa regra.
> **3.** O código de rastreio de uma retirada era guardado, mas a rotina diária dos Correios só
> acompanhava as moedas que chegam, nunca as que saem. Agora acompanha as duas.
> **4.** Quando a equipe marcava uma conta como inadimplente no painel, essa marca sumia sozinha na
> próxima fatura paga ou no fechamento do mês. E o painel chamava de "marca manual" uma inadimplência
> que tinha vindo de fatura. Agora a marca da equipe só sai quando a equipe tira. A inadimplência por
> fatura some quando a fatura é paga. E a ficha mostra de onde veio cada uma.

---

## Objetivo final — pronto quando

1. **Comissão do comprador (RA-24).** `iniciarCompraDireta` cobra `custoDeCompraPorMoeda(price, taxas) × qty`
   com a `TabelaDeTaxas` vigente, e grava na intenção `comissaoCompradorPorMoeda` e `unitPrice`.
   `liquidarCompraDireta` grava no `Trade` `feeComprador` (o valor congelado na intenção),
   `feeVendedor` (a tabela vigente na aprovação, regra da E2) e `fee` igual à soma. O teste do livro-razão
   termina com `ajustes` igual a `[]` e com um lançamento `comissao` para cada lado.
2. **O modal de `/mercado` diz o que o gateway cobra.** O resumo mostra "Total a pagar" sem "(debitado da
   conta)", a Opção 2 diz o mesmo total, e a nota do Pix mostra o valor que o servidor devolveu.
   Conferir com:
   `Select-String -Path 'src\app\(app)\mercado\page.tsx' -Pattern 'Total a pagar \(debitado da conta\)'`, que
   não encontra nada.
3. **Pendência na confirmação (RA-53).** Com a conta bloqueável (fora da equipe) e com pendência de custódia
   no estado da transação: a compra direta de lote desse vendedor não transfere moeda, e o valor pago entra
   no saldo do comprador; a taxa de retirada paga por Pix/cartão não extingue o recibo, e o valor entra no
   saldo do titular. A retirada continua `solicitada`, com um evento no histórico que explica o motivo.
   Conta da equipe, e checagem de equipe que falha, liquidam como hoje. Recibo `'Bloqueado'` também não é
   extinto pela conciliação. Tudo com teste.
4. **Rastreio da retirada.** `atualizarRastreiosPendentes()` também consulta as retiradas `postada` com
   `codigoRastreio` e grava o retrato em `aurea.rastreios` com `retirada_id` (migration 030).
   `rastreiosPorProtocolo()` devolve esse retrato na chave do id da retirada, que é a chave que
   `/admin/logistica` já usa. Falha nas retiradas não derruba a gravação dos envios. Tudo com teste.
5. **Marca de inadimplência.** Nenhum processo automático grava mais `user.inadimplente`: os dois pontos
   de `src/server/custodia/faturamento.ts`, o de `src/server/actions/plano-custodia.ts` e os dois de
   `src/server/payments/conciliacao.ts`. Conferir com
   `Select-String -Path src\server\custodia\faturamento.ts,src\server\actions\plano-custodia.ts,src\server\payments\conciliacao.ts -Pattern '\.inadimplente\s*=[^=]'`,
   que não encontra nada. A única escrita que sobra é `marcarInadimplencia` do painel. A inadimplência por
   fatura continua sendo calculada na hora por quem lê: lista, ficha, indicadores e bloqueio da E4.
   `resumirConta` devolve `marcaManual: false` para a conta que só tem fatura vencida (teste).
6. Testes antigos que passam **sem edição**: `src/server/payments/conciliacao.test.ts`,
   `src/server/payments/compra-direta-taxa-vigente.test.ts` (E2), `src/server/actions/bloqueio-por-debito.test.ts`
   (E4), `src/server/actions/retirada.test.ts`, `retirada-ciclo-completo.test.ts`, `src/server/db/db.test.ts`,
   `src/server/db/derivar.test.ts`, `src/server/admin/banco.test.ts`, `src/domain/admin/usuarios.test.ts`.
   Os únicos testes antigos editados são os listados no Território, cada um com o motivo.
7. A fórmula do hash não muda. `git diff origin/main --stat -- src/domain/hash.ts src/domain/ledger.ts src/domain/analise.ts src/server/db/derivar.ts src/server/db/diff.ts`
   não mostra nada. `STORE_KEY` não muda (o formato do `AppState` é o mesmo).
8. `RISCOS_ASSUMIDOS.md`: RA-24 e RA-53 marcados como pagos; RA-52 sem a parte da marca manual; RA-56
   novo. Os `ATALHOS.md` das pastas vão no mesmo commit.
9. `npm run typecheck`, `npm run lint`, `npm test` e `npm run build` passam no worktree, com o servidor
   local parado. A contagem de arquivos de teste é a da main integrada (anotada na tarefa 0) **mais 5**.
   A branch está no GitHub e **não** foi mesclada na main.

---

## O que o código faz hoje

Conferido em `40bb8c8`, **antes** da integração. E2 e E4 mudam os arquivos abaixo. Por isso, as linhas
citadas servem para localizar o trecho: procure sempre pelo nome da função. O que a E2 e a E4 acrescentam
está descrito nos documentos delas e nos relatórios `docs/execucao-pendencias/relatorios/E2.md` e `E4.md`.

### 1. Compra direta pelo gateway sem a comissão do comprador (RA-24)

- `src/server/actions/payments.ts`, `iniciarCompraDireta` (`:164-282`). O valor da cobrança é
  `valorTotal = price * qty` (`:202-203`). Esse valor vai para a intenção (`:219`), para o Pix (`:240`) e
  para o cartão (`:262`). O teto por operação usa `carregarRegrasDoMercado()` (`:207`), que **já devolve
  `taxas`**, mas a tabela não é usada. A metadata grava `lotId`, `qty`, `tipoMoeda`, `sellerEmail` e
  `unitPrice` (`:223-229`).
- `src/app/(app)/mercado/page.tsx`, `ConfirmarCompraModal` (`:516-727`). `comissaoComprador =
  comissaoPorMoeda(lot.price, 'comprador', taxas) * qty` (`:533`) e `total = subtotal + comissaoComprador`
  (`:534`). O resumo comum às duas opções mostra "Comissão de compra da Áurea" (`:608-609`) e "Total a pagar
  (debitado da conta)" (`:612`). A Opção 2 não diz valor (`:665-666`), e a nota do Pix mostra
  `brl(pix.valorCents)` (`:713`). `taxas` vem de `useApp()`, que é a mesma configuração do servidor.
- `src/server/payments/conciliacao.ts`, `liquidarCompraDireta` (`:68-154`). Depois da E2, desconta do
  vendedor a comissão da tabela vigente e grava `feeComprador: 0`. O depósito que explica a compra é
  `price * compradas` (`:115-119`), e o troco é `reivindicada.valor - price * compradas` (`:122`). O
  preço usado é o do lote **na hora da aprovação** (`offers[0].price`, `:90`), e não o `unitPrice` da
  intenção. Se o vendedor subir o preço entre a cobrança e o pagamento, o comprador leva a moeda pagando
  menos, e o depósito registrado passa do que o gateway cobrou.
- **A conta do livro-razão.** `lancamentosDeTrade` (`src/domain/ledger.ts:113-178`) debita do comprador
  `price × qty` (`compra`) e `feeComprador` (`comissao`). O comprador da compra direta não usa saldo, então
  o depósito precisa cobrir as duas coisas: `(price + comissão do comprador) × compradas`. Se não cobrir,
  `derivarLancamentos` (`src/server/db/derivar.ts:197-212`) gera um `ajuste`.
- **Função pronta que as duas pontas podem usar:** `custoDeCompraPorMoeda(price, taxas)`
  (`src/domain/fees.ts:69-71`), que devolve o preço mais a comissão do comprador. O `buyLot` com saldo já
  usa essa função (`src/server/actions/market.ts:187`).
- Teste antigo que muda de propósito: `src/server/actions/compra-direta.test.ts:170` espera
  `valorCents` igual a `30_000`. Com a tabela padrão, a comissão do comprador sobre R$ 300,00 é
  `150 + 100 = 250`, e o valor passa a `30_250`.

### 2. A conciliação não reconfere a pendência (RA-53)

- A E4 barra na porta de entrada: `iniciarCompraDireta` (vendedor), `iniciarPixRetirada` e
  `iniciarCartaoRetirada` (titular). Usa `contaComPendenciaNoEstado` (`src/domain/bloqueio-por-debito.ts`),
  com a isenção da equipe decidida por `contaBloqueavel` (`src/server/custodia/isencao-da-equipe.ts`,
  assíncrona, com falha que responde "liberado").
- `liquidarCompraDireta` transfere as moedas sem olhar pendência do vendedor.
- `liquidarRetirada` (`conciliacao.ts:291-352`) marca a retirada como `paga` e extingue o recibo
  (`:338-341`) sem olhar pendência do titular nem `coin.recibo.status === 'Bloqueado'`. Depois do
  `mutateState`, `conciliarPagamento` grava `paga` também no repositório de retiradas (`:466-492`).
- O caminho "o dinheiro não se perde" já existe e é o modelo: lote indisponível credita o valor no saldo
  do comprador e registra em `deposits` (`:143-153`). O livro-razão fecha com o lançamento `deposito`.
- `PainelPagamento` (`src/components/pagamento/PainelPagamento.tsx:205-208`) mostra "Pagamento confirmado
  com sucesso!" para qualquer intenção `creditado`, inclusive quando o valor virou saldo. Fica registrado
  no RA-56 (fora do território).

### 3. A retirada nunca ganha rastreio gravado

- `avancarStatusRetirada` (`src/server/actions/custody.ts:892-938`) leva a retirada a `postada` e **grava o
  código**. `transicionarRetirada` (`src/domain/retirada.ts:196-217`) exige o código e o guarda, e o
  repositório grava em `aurea.retiradas.codigo_rastreio` (`src/server/db/repositories/retiradas.ts:110`).
  Nenhuma tela chama essa action hoje; ela só é chamada nos testes (`retirada.test.ts:350`,
  `retirada-ciclo-completo.test.ts:209`). Ver Dúvidas.
- `atualizarRastreiosPendentes` (`src/server/shipping/rastreios.ts:46-82`) só lê `state.envios`
  (`:48`) e só grava com `protocolo: envio.protocolo` (`:70-75`).
- **O que impede gravar a retirada sem migration:** `aurea.rastreios.protocolo` é `NOT NULL
  REFERENCES aurea.envios (protocolo)` (`src/server/db/migrations/002_pagamentos_rastreio.sql:88-96`). O id
  da retirada (`RET-<moeda>-<hora>`, `custody.ts:506`) não existe em `envios`.
- `/admin/logistica` já procura o rastreio da retirada pela chave do id: `dados.rastreios[r.id]`
  (`src/components/admin/logistica/PainelLogistica.tsx:217`). A E6 trocou o texto de retirada sem rastreio
  para "rastreio automático só acompanha envios", e esse texto deixa de ser verdade com esta branch.
- Quem lê `rastreiosPorProtocolo()` filtra pelo dono: `/api/rastreios` só devolve protocolo de envio da
  própria conta (`src/app/api/rastreios/route.ts:25-33`), e a ficha só devolve os envios da conta
  (`src/server/admin/ficha.ts:334`). O retrato da retirada não vaza para outra conta.
- `TRUNCATE` que envolve `retiradas` nos testes de banco já inclui `rastreios` na mesma instrução
  (`src/server/db/db.test.ts:163`, `src/server/db/livro-de-ordens.test.ts:61`). Por isso uma chave
  estrangeira de `rastreios` para `retiradas` não quebra esses testes. A lista exata de tabelas em
  `db.test.ts:194-259` não muda, porque a 030 só altera uma tabela que já existe.

### 4. A marca manual de inadimplência apagada

- O painel trata `user.inadimplente` como **a marca manual**: `marcarInadimplencia`
  (`src/server/admin/usuarios.ts:313-333`) liga e desliga, e grava `admin.usuarios.marcar_inadimplente` na
  trilha. A ficha lê `marcaManual: Boolean(u.inadimplente)` (`src/domain/admin/usuarios.ts:379`), e
  `AcoesDaConta` e `CabecalhoDaFicha` rotulam com isso.
- Quem lê a inadimplência já soma as duas origens: `Boolean(u.inadimplente) || isInadimplente(u, faturas,
  agora)`. Isso vale para a lista (`usuarios.ts:131`), a ficha (`:378`), os indicadores
  (`src/domain/kpis.ts:382`) e o bloqueio da E4 (`contaComPendenciaDeCustodia`).
- `isInadimplente(user, faturas, agora)` (`src/domain/custody.ts:103-118`) **ignora a marca** quando recebe
  faturas. Cinco pontos gravam o que ela devolve por cima da marca: `faturamento.ts:162-163` (ciclo),
  `faturamento.ts:247-248` (`pagarFaturaCustodiaComSaldo`), `plano-custodia.ts:263-264`
  (`pagarFaturaComSaldo`), `conciliacao.ts:224-226` (`liquidarFaturaCustodia`) e `conciliacao.ts:279-281`
  (`liquidarAssinaturaCustodia`). Resultado: o ciclo ou o pagamento de qualquer fatura **apaga a marca
  manual**. E o ciclo **grava `true`** em quem tem fatura vencida, que a ficha passa a chamar de "marca
  manual".
- **Por que não precisa de coluna nova:** a marca manual já tem dona, a coluna `users.inadimplente`, e a
  inadimplência por fatura já é calculada por todos que leem. O defeito são só as cinco escritas
  automáticas. Tirá-las resolve as três regras sem migration, sem `types.ts` e sem `STORE_KEY`.
- Testes antigos que afirmam a escrita automática e mudam de propósito: `src/server/custodia/faturamento.test.ts:98`,
  `:109`, `:143` e `:175`.
- **Dado antigo:** em produção, alguma conta pode ter `inadimplente = true` gravado por um desses pontos
  (o ciclo mensal não roda em produção sem `CRON_SECRET`, N-01; os pagamentos de fatura, sim). Depois da
  E8, a ficha chama essa marca de "marca manual", e só uma ação no painel a tira. A conferência está nos
  passos manuais.

---

## Tarefas

As Server Actions e `conciliacao.ts` são superfície protegida no `CLAUDE.md`, mas o que está escrito
aqui é pedido do Gabriel já decidido. Não pare para pedir aprovação de passo que está neste documento.

### 0. Preparar o worktree e conferir a base

```powershell
cd C:\dev\AureaCustodiaMVP
git fetch origin
git worktree add C:\dev\AureaCustodiaMVP-e8 -b exec/e8-segunda-onda-conciliacao-e-rastreio origin/main
cd C:\dev\AureaCustodiaMVP-e8
npm install
Select-String -Path src\server\payments\conciliacao.ts -Pattern 'RegrasDaLiquidacao'
Test-Path src\domain\bloqueio-por-debito.ts
Test-Path src\server\custodia\isencao-da-equipe.ts
Select-String -Path src\server\custodia\isencao-da-equipe.ts -Pattern 'export async function contaBloqueavel'
Test-Path src\server\payments\compra-direta-taxa-vigente.test.ts
npm test
```

- As três conferências de E2 e E4 precisam encontrar o que procuram. Se `RegrasDaLiquidacao` ou
  `contaBloqueavel` não existirem, a integração ainda não chegou: **pare** e diga isso no relatório.
- Se a E4 tiver usado outro nome para a mesma função, use o nome que está no código e registre no relatório.
- Anote a contagem de `npm test` (arquivos, testes passando, pulados). Ela é a base desta branch. O
  esperado ao fim é essa contagem **mais 5 arquivos**, sem nenhum arquivo a menos.
- Leia `docs/execucao-pendencias/relatorios/E2.md`, `E4.md` e `INTEGRACAO.md` antes de editar.

### 1. `iniciarCompraDireta` cobra o total da tela

**Arquivo:** `src/server/actions/payments.ts`, só `iniciarCompraDireta` e os imports.

- Trazer para antes do cálculo do valor a leitura que já existe: `const { depositoMaxCents, taxas } = await carregarRegrasDoMercado()`.
  É uma leitura só, e não uma segunda. `carregarConfiguracaoDoSite` não lança erro: sem banco, ou com
  falha, vale o padrão (RA-47).
- ```ts
  // O Pix e o cartão cobram o mesmo total que o modal de /mercado mostra: preço mais a comissão de
  // compra da Tabela de Taxas vigente (RA-24). A comissão fica congelada na intenção, porque o valor
  // cobrado não muda depois de a cobrança abrir; a conciliação lê de lá, e não da tabela da aprovação.
  const comissaoCompradorPorMoeda = custoDeCompraPorMoeda(price, taxas) - price
  const valorTotal = custoDeCompraPorMoeda(price, taxas) * qty
  ```
- Na metadata da intenção, acrescentar `comissaoCompradorPorMoeda`. `unitPrice` já está lá.
- O teto (`valorTotal > depositoMaxCents`) passa a comparar o total com comissão. A mensagem não muda.
- A checagem de vendedor pausado que a E4 pôs nesta função **não muda**. Não mexer em
  `iniciarDeposito` nem em `consultarStatusCobranca`.
- Atualizar o comentário do cabeçalho da função com uma frase sobre o total cobrado.
- **Teste que prova:** `src/server/actions/compra-direta-comissao-comprador.test.ts` (tarefa 7).

### 2. `liquidarCompraDireta` com as duas comissões, o valor que cabe e o vendedor pausado

**Arquivo:** `src/server/payments/conciliacao.ts`.

**2a. Regras lidas antes da transação.** Na interface `RegrasDaLiquidacao` da E2, acrescentar:

```ts
/**
 * A conta que a pendência de custódia pode travar nesta liquidação (o vendedor na compra direta, o
 * titular na retirada) está FORA da equipe. Perguntado antes do mutateState, porque carregarMembro é
 * assíncrono e não pode rodar com a linha do estado presa. Ausente ou false: liberado (E4, 2b).
 */
contaBloqueavel?: boolean
```

O campo é **opcional** de propósito: o teste da E2 chama `LIQUIDADORES.compra_direta(..., { taxas })` e
precisa continuar compilando sem edição.

Em `conciliarPagamento`, junto da leitura da tabela que a E2 pôs antes do `mutateState`:

```ts
// Quem a pendência pode travar, e se essa conta é da equipe (RA-53). Checagem que falha libera:
// o dinheiro já entrou, e a regra da E4 é "nada tranca a equipe para fora".
const emailQuePodeTravar =
  tipo === 'compra_direta' ? String(reivindicada.metadata?.sellerEmail ?? '')
  : tipo === 'retirada' ? reivindicada.userEmail
  : ''
const contaBloqueavelNaLiquidacao = emailQuePodeTravar
  ? await contaBloqueavel(emailQuePodeTravar).catch(() => false)
  : false
```

e passar `{ taxas, contaBloqueavel: contaBloqueavelNaLiquidacao }` ao liquidador. Tudo dentro do mesmo
`try` que devolve a intenção para `pendente`. Se importar `@/server/custodia/isencao-da-equipe` fizer
`conciliacao.test.ts` ou `compra-direta-taxa-vigente.test.ts` pedirem mock novo, troque por
`await import('@/server/custodia/isencao-da-equipe')` dentro de um `try`, com falha → `false`, e registre no
relatório. Esses dois testes não são editados.

**2b. O liquidador.** Em `liquidarCompraDireta`:

- Ler a comissão congelada:
  ```ts
  // Comissão do comprador congelada na cobrança (tarefa 1). Intenção aberta antes da E8 não tem o
  // campo: vale zero, que é exatamente o que o gateway cobrou dela.
  const bruta = Number(reivindicada.metadata?.comissaoCompradorPorMoeda)
  const feeCompradorUnit = Number.isInteger(bruta) && bruta > 0 ? bruta : 0
  ```
- Conta do vendedor pausado (depois de achar `sellerId`):
  ```ts
  const vendedorPausado =
    Boolean(regras.contaBloqueavel) &&
    sellerId === reivindicada.metadata?.sellerEmail &&
    contaComPendenciaNoEstado(s, sellerId, Date.now())
  ```
  Se `sellerId` for outro e-mail, a isenção perguntada não vale para ele. A checagem não se aplica e
  libera.
- O valor pago precisa cobrir o lote pelo preço de agora:
  `const cabeNoValorPago = (price + feeCompradorUnit) * qtyPedida <= reivindicada.valor`, com `price =
  offers[0]?.price ?? 0`.
- `podeComprar` ganha `&& !vendedorPausado && cabeNoValorPago`.
- No laço, nada muda além do que a E2 fez para o vendedor. O comprador não tem saldo mexido.
- No `s.trades.push`: `feeComprador: feeCompradorUnit * compradas`,
  `feeVendedor: feeVendedorUnit * compradas` e `fee: feeComprador + feeVendedor`. Atualizar o comentário
  da E2, que dizia que `feeComprador` é zero porque o gateway cobrava só o preço.
- Depósito que explica a compra: `valor: (price + feeCompradorUnit) * compradas`. Troco:
  `reivindicada.valor - (price + feeCompradorUnit) * compradas`.
- **Ramos que viram saldo.** O ramo `else` de hoje (lote indisponível) passa a atender três casos, com o
  mesmo crédito do valor inteiro, e só o `motivo` muda:
  - `vendedorPausado` → `motivo: 'vendedor_com_pendencia_creditado_em_saldo'`;
  - `!cabeNoValorPago` (o preço subiu depois da cobrança) → `motivo: 'valor_pago_nao_cobre_o_anuncio_creditado_em_saldo'`;
  - o resto → `'lote_indisponivel_creditado_em_saldo'`, como hoje.
  Nenhuma oferta sai do livro nesses ramos: anúncio pausado fica gravado (RA-52), e o que subiu de preço
  continua à venda.
- Comentário em português explicando por que o valor inteiro vira saldo, e não devolução pelo gateway
  (RA-56).

**Imports:** `contaComPendenciaNoEstado` de `@/domain/bloqueio-por-debito` e `contaBloqueavel` de
`@/server/custodia/isencao-da-equipe`, cada um em linha própria.

**Teste que prova:** `src/server/payments/compra-direta-comissao-comprador.test.ts` e
`src/server/payments/conciliacao-pendencia.test.ts` (tarefa 7).

### 3. `liquidarRetirada` não extingue recibo de conta com pendência nem recibo bloqueado

**Arquivo:** `src/server/payments/conciliacao.ts`, em `liquidarRetirada` e no bloco do repositório de
retiradas de `conciliarPagamento`. Assinatura `(s, reivindicada, detalhes, regras: RegrasDaLiquidacao)`.

- Depois de achar `ret` e antes de "1. Atualiza status da retirada":
  ```ts
  const coin = buyer.coins.find((c) => c.id === ret.coinId)
  const comPendencia = Boolean(regras.contaBloqueavel) && contaComPendenciaNoEstado(s, reivindicada.userEmail, agora)
  const reciboBloqueado = coin?.recibo.status === 'Bloqueado'
  if (comPendencia || reciboBloqueado) {
    // RA-53: o recibo só se extingue se a conta pudesse retirar AGORA. O dinheiro não se perde: vira
    // saldo, e a retirada continua esperando pagamento. Pagar com saldo depois que a fatura for paga
    // (ou o recibo, liberado) é o caminho de volta, já coberto por pagarRetiradaComSaldo.
    buyer.balance += reivindicada.valor
    s.deposits.push({ userEmail: reivindicada.userEmail, valor: reivindicada.valor, date: agora })
    ret.historico.push({ de: ret.status, para: ret.status, data: agora, motivo: MOTIVO, autor: 'gateway' })
    ret.updatedAt = agora
    return { sucesso: true, motivo: comPendencia ? 'retirada_com_pendencia_creditada_em_saldo' : 'recibo_bloqueado_creditado_em_saldo' }
  }
  ```
  com `MOTIVO`:
  - pendência: `Pagamento via ${Pix|Cartão de Crédito} aprovado com fatura de custódia vencida: o valor entrou no saldo em conta e a retirada continua aguardando pagamento.`
  - recibo bloqueado: `Pagamento via ${Pix|Cartão de Crédito} aprovado com o recibo bloqueado: o valor entrou no saldo em conta e a retirada continua aguardando pagamento.`
- A extinção de "2." reaproveita o `coin` achado acima. O resto de `liquidarRetirada` não muda.
- Em `conciliarPagamento`, o bloco `if (tipo === 'retirada')`:
  - quando `resLiquidacao.motivo === 'retirada_liquidada'`, faz o que faz hoje;
  - quando o motivo for um dos dois novos, busca a retirada no repositório, acrescenta **o mesmo evento**
    ao histórico (sem mudar `status`), grava `updatedAt` e chama `repo.atualizar`. É o repositório que a
    tela `/retirada` e o painel leem.
  - Continua fora da transação e com o `try/catch` que só registra no log.
- **Não** mudar o ramo de retirada não localizada, o de `retirada_ja_paga`, o cálculo do D+30 nem o
  depósito da taxa no caminho normal.
- **Teste que prova:** `src/server/payments/conciliacao-pendencia.test.ts`.

### 4. Nenhuma escrita automática de `user.inadimplente`

- **`src/server/custodia/faturamento.ts`**
  - Ciclo (`:161-166`): trocar
    `const inadimplente = isInadimplente(user, faturasDoUsuario, agora); user.inadimplente = inadimplente`
    por `const inadimplente = Boolean(user.inadimplente) || isInadimplente(user, faturasDoUsuario, agora)`,
    **sem** gravar em `user`. O contador `usuariosInadimplentes` continua contando as duas origens.
  - `pagarFaturaCustodiaComSaldo` (`:246-248`): apagar o bloco "Reavalia status de inadimplência". A fatura
    paga já tira a conta da inadimplência por fatura, porque ela é calculada a partir das faturas.
  - Cabeçalho (`:11-12`): trocar "Faturas vencidas ativam o status de inadimplência do usuário
    (`inadimplente = true`)" por uma frase dizendo que a inadimplência por fatura é calculada a partir
    das faturas por quem lê, e que `user.inadimplente` é só a marca manual do painel, que nenhum
    processo automático grava (E8).
  - Tirar `isInadimplente` do import só se deixar de ser usado.
- **`src/server/actions/plano-custodia.ts`**, só `pagarFaturaComSaldo` (`:262-264`): apagar o bloco
  "Reavalia status de inadimplência" e ajustar o import, se sobrar sem uso.
- **`src/server/payments/conciliacao.ts`**: apagar os blocos "Reavalia status de inadimplência" de
  `liquidarFaturaCustodia` (`:224-226`) e de `liquidarAssinaturaCustodia` (`:279-281`). Atualizar o
  comentário de `liquidarFaturaCustodia` (`:156-161`), que diz "reavalia a inadimplência do usuário".
  Tirar `isInadimplente` do import.
- Comentário curto, em cada ponto apagado, com o porquê: `// Não grava user.inadimplente: essa coluna é a
  marca manual do painel (marcarInadimplencia). A inadimplência por fatura é calculada por quem lê (E8).`
  Um comentário por arquivo basta.
- **Não** tocar em `isInadimplente` nem em `verificarStatusFatura` (`src/domain/custody.ts`), nem em
  `marcarInadimplencia` (`src/server/admin/usuarios.ts`).
- **Teste que prova:** `src/server/custodia/marca-de-inadimplencia.test.ts` e as quatro asserções de
  `faturamento.test.ts` (tarefa 7).

### 5. A ficha nomeia a origem certa

**Arquivo:** `src/domain/admin/usuarios.ts`, só os comentários dos campos de `ResumoConta` (`:342-344`).

- `inadimplente`: `/** Marca manual do painel OU fatura vencida (calculada na hora a partir das faturas). */`
- `marcaManual`: `/** Só a marca posta pela equipe em marcarInadimplencia. Desde a E8 nenhum processo automático grava user.inadimplente, então fatura vencida nunca aparece aqui. */`
- `:379` já está certa com a tarefa 4 e **não muda**. O teste da tarefa 7 prova o rótulo.

### 6. Rastreio da retirada

**6a. Migration** — arquivo novo `src/server/db/migrations/030_rastreio_da_retirada.sql`, com este texto:

```sql
-- ---------------------------------------------------------------------------
-- 030 — Rastreio da retirada física (E8)
--
-- O job de rastreio só gravava objeto de envio: a coluna protocolo é NOT NULL e
-- aponta para aurea.envios, e o id de uma retirada não existe lá. Em vez de uma
-- tabela nova, a mesma tabela ganha o segundo dono possível: cada linha pertence a
-- UM envio (protocolo) ou a UMA retirada (retirada_id), nunca aos dois.
--
-- Aditiva: o código anterior continua gravando envio com protocolo e retirada_id
-- nulo, que passa na restrição. Por isso pode ser aplicada antes do deploy.
-- ---------------------------------------------------------------------------

ALTER TABLE aurea.rastreios
  ADD COLUMN IF NOT EXISTS retirada_id text REFERENCES aurea.retiradas (id) ON DELETE CASCADE;

ALTER TABLE aurea.rastreios ALTER COLUMN protocolo DROP NOT NULL;

ALTER TABLE aurea.rastreios DROP CONSTRAINT IF EXISTS rastreios_um_dono_check;
ALTER TABLE aurea.rastreios
  ADD CONSTRAINT rastreios_um_dono_check CHECK (num_nonnulls(protocolo, retirada_id) = 1);

CREATE INDEX IF NOT EXISTS rastreios_retirada_id_idx ON aurea.rastreios (retirada_id);
```

`src/server/db/migrations/README.md`: acrescentar a linha da `030_rastreio_da_retirada.sql` no fim da
tabela de arquivos. Trocar "A próxima é a **017**" por "A próxima é a **031**. 026 a 029 foram reservadas
na rodada de 15/09/2026 e não usadas; o aplicador ordena por nome e não exige sequência."

**6b. Repositório** — `src/server/db/repositories/rastreios.ts`:

- `RastreioGravado` ganha `retiradaId?: string | null`. O comentário do tipo diz que `protocolo` é **a
  chave do dono**: o protocolo do envio, ou o id da retirada quando `retiradaId` vem preenchido. É a chave
  que `/admin/logistica` já usa (`dados.rastreios[r.id]`).
- `LinhaRastreio`: `protocolo: string | null` e `retirada_id: string | null`. `carregarRastreios` passa a
  selecionar `retirada_id`, e `paraRastreio` devolve `protocolo: r.protocolo ?? r.retirada_id ?? ''` e
  `retiradaId: r.retirada_id`.
- Função nova, e **`salvarRastreio` não muda**:
  ```ts
  /** Grava o retrato de uma retirada. Upsert pelo código, como o de envio (migration 030). */
  export async function salvarRastreioDeRetirada(tx: Consulta, r: RastreioObjetoResult & { retiradaId: string }): Promise<void>
  ```
  Com `INSERT … (codigo_rastreio, protocolo, retirada_id, status_atual, etapa_descricao, entregue,
  atualizado_em, eventos) VALUES ($1, NULL, $2, $3, $4, $5, $6, $7::jsonb) ON CONFLICT (codigo_rastreio) DO
  UPDATE SET protocolo = NULL, retirada_id = EXCLUDED.retirada_id, status_atual = EXCLUDED.status_atual,
  etapa_descricao = EXCLUDED.etapa_descricao, entregue = EXCLUDED.entregue, atualizado_em =
  EXCLUDED.atualizado_em, eventos = EXCLUDED.eventos`.

**6c. O job** — `src/server/shipping/rastreios.ts`:

- `ResumoAtualizacao` ganha `retiradasVerificadas: number` e `retiradasGravadas: number`. A rota
  `/api/cron/shipping` espalha o resumo e não precisa de edição.
- Em `atualizarRastreiosPendentes`:
  - ler `repositorioRetiradas().listarTodas()` num `try/catch`; na falha, registrar
    `console.error('[rastreio] retiradas indisponíveis; seguindo só com os envios:', err)` e seguir com lista
    vazia;
  - retiradas que valem consulta: `status === 'postada'` e `codigoRastreio` não vazio. Entregue e cancelada
    ficam de fora, pelo mesmo motivo do comentário de `pendentes`;
  - uma chamada só a `atualizarRastreiosEmLote([...códigos dos envios, ...códigos das retiradas])`;
  - sem banco: devolver sem gravar, com as contagens de verificação;
  - com banco: a transação dos envios fica **exatamente como está**. Depois dela, uma transação
    separada para as retiradas, com `salvarRastreioDeRetirada`, dentro de `try/catch`. Na falha, registrar
    no log e devolver `retiradasGravadas: 0`. Comentário: gravação de retirada que falha (por exemplo, a
    migration 030 ainda não aplicada) não pode desfazer a dos envios.
- Comentário de bloco no topo: acrescentar que o job também acompanha a retirada postada (E8).
- `rastreiosPorProtocolo` não muda: o mapeamento de 6b já põe a retirada na chave do id.

**6d. O texto do painel** — `src/components/admin/logistica/PainelLogistica.tsx`, só o texto que a E6 deu à
retirada sem rastreio gravado ("rastreio automático só acompanha envios"). Volta a ser "rastreio ainda não
consultado", o mesmo do envio. Se a E6 tiver um teste de tela que afirma o texto antigo (procure com
`Select-String -Path src -Recurse -Include *.test.ts -Pattern 'só acompanha envios'`), troque **só essa
asserção** pelo texto novo. Não mexa em mais nada da tela.

**6e. README** — `src/server/shipping/README.md`: a tabela e o diagrama do fluxo passam a dizer que o job
lê envios **e retiradas postadas**, e que o retrato da retirada fica em `aurea.rastreios` com
`retirada_id` (migration 030).

**Teste que prova:** `src/server/shipping/rastreios.test.ts` e os dois casos novos em
`src/server/db/payments.test.ts` (tarefa 7).

### 7. Testes

Ver [Testes exigidos](#testes-exigidos). Cinco arquivos novos. Casos novos só em `payments.test.ts`, e
asserções trocadas só em `compra-direta.test.ts` e `faturamento.test.ts`. Nenhum arquivo novo sobe
PGlite: os casos de banco da migration 030 usam a instância que `payments.test.ts` já tem.

### 8. O modal de `/mercado`

**Arquivo:** `src/app/(app)/mercado/page.tsx`, só dentro de `ConfirmarCompraModal`. A linha de filtro de
lotes pausados que a E4 pôs perto de `:126` fica como está.

- `:612`: "Total a pagar (debitado da conta)" → "Total a pagar". O resumo vale para as duas opções.
- `:665-666` (Opção 2): "Pague {brl(total)} direto por Pix ou cartão — as moedas e a comissão de compra —,
  sem usar o saldo em conta. A moeda entra no seu acervo assim que o pagamento for aprovado. Se, nessa
  hora, o anúncio já tiver sido vendido, tiver subido de preço ou estiver pausado, o valor pago entra
  inteiro no seu saldo em conta."
- Nota do Pix (`:712-715`): "Referência {pix.externalReference} · {brl(pix.valorCents)}, com a comissão de
  compra. Assim que o pagamento for confirmado pelo gateway, o lote é liquidado e as moedas entram na sua
  conta."
- `total` continua sendo `subtotal + comissaoComprador`, que é igual a `custoDeCompraPorMoeda(lot.price,
  taxas) * qty`. O teste da tarefa 7 prova a igualdade com o valor do servidor.
- Comentário curto acima do resumo: o total é o mesmo nas duas opções, porque o servidor cobra
  `custoDeCompraPorMoeda × qty` no Pix e no cartão (E8, RA-24).
- Sem número de taxa escrito na tela. Alvo de toque de 44px continua nos botões existentes.

### 9. Registro dos riscos

- **`RISCOS_ASSUMIDOS.md`**
  - **RA-24**, linha do índice e bloco: título com "— **pago em <data> (E8)**" e grau ✅. Uma frase no
    bloco: a compra direta cobra preço mais comissão do comprador da tabela vigente, congelada na
    intenção. A comissão do vendedor segue a tabela da aprovação (E2), e o `Trade` grava as duas.
  - **RA-53**, linha do índice e bloco: "— **pago em <data> (E8)**" e ✅. O bloco diz o que a conciliação faz
    agora (tarefas 2 e 3) e aponta o RA-56.
  - **RA-52**, linha do índice e bloco: tirar a frase da marca manual apagada e o "separar marca manual de
    marca por fatura (coluna nova)" do "Como se paga". Registrar que a E8 pagou essa parte sem coluna
    nova. Fica só o que continua valendo: o bloqueio calculado não aparece no recibo impresso nem na
    contagem de recibos bloqueados.
  - **RA-56 🟡 (novo)** — "Pagamento aprovado que não pode liquidar vira saldo em conta, sem devolução pelo
    gateway e sem aviso próprio na tela de pagamento". Pasta: `src/server/payments/`. O bloco cobre os
    quatro motivos (lote indisponível, preço subiu, vendedor com pendência, retirada com pendência ou
    recibo bloqueado). Diz que `PainelPagamento` mostra "Pagamento confirmado" também nesses casos, e que
    o motivo fica no histórico da retirada e no `motivo` devolvido pela conciliação. **Como se paga:**
    guardar o motivo na intenção e mostrar na tela de pagamento; devolução pelo gateway, se o Gabriel
    quiser. Índice: linha logo depois da linha do **maior RA que existir na main integrada** (RA-55, se a
    E6 usou; senão RA-54). Bloco: no fim do arquivo, depois da última seção.
- **`src/server/payments/ATALHOS.md`** (criado pela E2): bloco RA-24 marcado como pago, e seção
  `## RA-56 🟡` no fim.
- **`src/server/actions/ATALHOS.md`**: nas seções RA-52 e RA-53 que a E4 acrescentou, as mesmas
  mudanças do `RISCOS_ASSUMIDOS.md`.
- **`src/domain/ATALHOS.md`**: na seção RA-52 da E4, só se ela citar a marca manual apagada; tirar essa frase.
- Não reordenar nem reformatar a tabela, e não tocar em nenhum outro RA.

### 10. Ciclo, commits, push e relatório

Ver [Entrega](#entrega).

---

## Território

A E8 roda sozinha, depois da integração. Mesmo assim, o território vale: ele é o que a integração
confere no `git diff --name-only`.

### Pode editar

| Caminho | Limite |
|---|---|
| `src/server/actions/payments.ts` | Só `iniciarCompraDireta`, seu comentário e os imports |
| `src/server/payments/conciliacao.ts` | `RegrasDaLiquidacao`, a leitura antes do `mutateState`, `liquidarCompraDireta`, `liquidarRetirada`, os blocos de inadimplência de `liquidarFaturaCustodia` e `liquidarAssinaturaCustodia`, o bloco do repositório de retiradas em `conciliarPagamento`, comentários e imports |
| `src/server/payments/ATALHOS.md` | Bloco RA-24 e seção RA-56 |
| `src/server/payments/README.md` | Seção "Testes": uma frase sobre os dois arquivos novos |
| `src/server/shipping/rastreios.ts` | `ResumoAtualizacao`, `atualizarRastreiosPendentes`, comentário do topo |
| `src/server/shipping/README.md` | Tabela e fluxo do rastreio |
| `src/server/db/repositories/rastreios.ts` | `RastreioGravado`, `LinhaRastreio`, `paraRastreio`, o SELECT de `carregarRastreios` e a função nova `salvarRastreioDeRetirada` |
| `src/server/db/migrations/030_rastreio_da_retirada.sql` | Arquivo novo, com o texto da tarefa 6a |
| `src/server/db/migrations/README.md` | Linha da 030 e a frase "A próxima é" |
| `src/server/custodia/faturamento.ts` | Os dois pontos de inadimplência, o contador e o cabeçalho |
| `src/server/actions/plano-custodia.ts` | Só o bloco de inadimplência de `pagarFaturaComSaldo` e o import |
| `src/domain/admin/usuarios.ts` | Só os comentários de `inadimplente` e `marcaManual` em `ResumoConta` |
| `src/app/(app)/mercado/page.tsx` | Só `ConfirmarCompraModal`: rótulo do total, texto da Opção 2, nota do Pix e um comentário |
| `src/components/admin/logistica/PainelLogistica.tsx` | Só o texto de retirada sem rastreio gravado |
| Teste de tela da E6 que afirme "só acompanha envios" | Só essa asserção, se existir |
| `src/server/actions/compra-direta.test.ts` | Só a asserção de `valorCents` (`:170`, `30_000` → `30_250`), com um comentário do porquê |
| `src/server/custodia/faturamento.test.ts` | Só as asserções `:98`, `:109`, `:143`, `:175` e o nome do teste de `:150` (ver Testes exigidos) |
| `src/server/db/payments.test.ts` | Dois `it` novos no fim do `describe`; nada do que existe muda |
| `src/server/actions/compra-direta-comissao-comprador.test.ts` | Arquivo novo |
| `src/server/payments/compra-direta-comissao-comprador.test.ts` | Arquivo novo |
| `src/server/payments/conciliacao-pendencia.test.ts` | Arquivo novo |
| `src/server/shipping/rastreios.test.ts` | Arquivo novo |
| `src/server/custodia/marca-de-inadimplencia.test.ts` | Arquivo novo |
| `RISCOS_ASSUMIDOS.md` | Índice e blocos de RA-24, RA-52, RA-53 e RA-56 |
| `src/server/actions/ATALHOS.md`, `src/domain/ATALHOS.md` | Só as seções RA-52 e RA-53 |
| `docs/execucao-pendencias/relatorios/E8.md` | Arquivo novo |

### Não pode editar

| Caminho | Por quê |
|---|---|
| `src/domain/fees.ts`, `constants.ts`, `market.ts`, `types.ts`, `custody.ts`, `retirada.ts`, `ledger.ts`, `hash.ts`, `analise.ts` | Padrões, motor, modelo e fórmulas; a E8 só usa (`custoDeCompraPorMoeda`, `comissaoPorMoeda`, `isInadimplente`) |
| `src/domain/bloqueio-por-debito.ts`, `src/server/custodia/isencao-da-equipe.ts`, `src/components/custody/useBloqueioPorPendencia.ts` | Regra da E4; só uso |
| `src/server/db/derivar.ts`, `diff.ts`, `db.test.ts`, `livro-de-ordens.test.ts`, migrations 001–025 | Livro-razão e schema aplicado não mudam; a 030 é aditiva |
| `src/server/payments/conciliacao.test.ts`, `compra-direta-taxa-vigente.test.ts`, `src/server/actions/bloqueio-por-debito.test.ts`, `retirada.test.ts`, `retirada-ciclo-completo.test.ts`, `src/server/admin/banco.test.ts`, `src/domain/admin/usuarios.test.ts` | Passam sem edição: são a prova de que o que já existia não mudou |
| `src/server/admin/usuarios.ts`, `src/components/admin/usuarios/**`, `src/server/admin/logistica.ts`, `src/server/admin/ficha.ts` | `marcarInadimplencia` segue sendo a única escrita da marca; as telas da ficha já leem certo |
| `src/server/actions/custody.ts`, `sell.ts`, `market.ts` | Porta de entrada do bloqueio (E4) e `avancarStatusRetirada` não mudam |
| `src/components/pagamento/**` | O aviso na tela de pagamento fica registrado no RA-56 |
| `src/lib/payments/**`, `src/lib/shipping/**`, `src/app/api/**`, `vercel.json` | Clientes externos, rotas e agendamento não mudam |
| `src/server/config/**`, `src/server/taxas/**` | Só uso |
| `vitest.config.mts` | Veio pronto na base; ninguém edita |
| `docs/finalizacoes/**`, `docs/publish_docs/**`, `docs/PENDENCIAS_ABERTAS.md`, `docs/execucao-pendencias/README.md` | Marcar como feito é tarefa da integração da E8 (seção "Integração da E8" de `docs/execucao-pendencias/INTEGRACAO.md`) |
| `CLAUDE.md`, `AGENTS.md`, `.claude/**` | Fora do escopo |

---

## Testes exigidos

Contas em centavos. `TAXAS_DO_PAINEL` é a mesma da E2:
`{ ...TAXAS_PADRAO, comissaoVendedorBp: 100, comissaoVendedorFixa: 250, comissaoCompradorBp: 80, comissaoCompradorFixa: 150 }`.
Lote de **2 moedas a R$ 200,00** (`20_000`):

- comissão do comprador por moeda: `round(20_000 × 80 / 10_000) + 150 = 160 + 150 = 310`; total cobrado
  `2 × 20_310 = 40_620`;
- comissão do vendedor por moeda: `200 + 250 = 450`; o vendedor recebe `2 × 19_550 = 39_100`;
- `Trade`: `feeComprador: 620`, `feeVendedor: 900`, `fee: 1_520`.

### `src/server/actions/compra-direta-comissao-comprador.test.ts` (novo)

Setup de `src/server/actions/compra-direta.test.ts` (mock de `server-only`, `@/server/session`,
`@/lib/payments` com `criarPixDeposito` e `criarPreferenciaDeposito`, cadastro completo), mais
`vi.mock('@/server/config/carregar', async (importOriginal) => ({ ...(await importOriginal()), carregarRegrasDoMercado }))`
com `carregarRegrasDoMercado` devolvendo `{ taxas: TAXAS_DO_PAINEL, catalogo: COIN_TYPES, depositoMaxCents: 10_000_000 }`.
Vendedor do seed com duas moedas sem oferta aberta (conta da equipe, então a checagem de pausado da E4 não
interfere).

| Caso (`it`) | O que prova |
|---|---|
| `cobra no Pix o preço mais a comissão do comprador da tabela vigente` | `res.data.valorCents === 40_620`; `criarPixDeposito` chamado com `valorCents: 40_620`; a intenção tem `valor: 40_620` e metadata com `unitPrice: 20_000`, `comissaoCompradorPorMoeda: 310`, `qty: 2` |
| `o cartão cobra o mesmo total que o Pix` | `criarPreferenciaDeposito` chamado com `valorCents: 40_620` |
| `o valor cobrado é o mesmo que o modal de /mercado calcula` | `res.data.valorCents === 20_000 * 2 + comissaoPorMoeda(20_000, 'comprador', TAXAS_DO_PAINEL) * 2` e `=== custoDeCompraPorMoeda(20_000, TAXAS_DO_PAINEL) * 2` |
| `o teto por operação compara o total com comissão` | Com `depositoMaxCents: 40_619`: `ok: false`, `error` contém `406,19`, nenhuma intenção criada. Com `40_620`: `ok: true` |

### `src/server/payments/compra-direta-comissao-comprador.test.ts` (novo)

Setup de `compra-direta-taxa-vigente.test.ts` da E2 (mock de `@/lib/payments` e de
`@/server/taxas/carregar` com `TAXAS_DO_PAINEL`). Vendedor `alex@testeaurea.com.br`, comprador
`gabrielsilva@testeaurea.com.br`. Intenção `compra_direta` com metadata
`{ lotId, qty: 2, tipoMoeda, sellerEmail: 'alex@testeaurea.com.br', unitPrice: 20_000, comissaoCompradorPorMoeda: 310 }`,
e `lotId` e `externalReference` diferentes em cada caso.

| Caso (`it`) | O que prova |
|---|---|
| `grava as duas comissões no histórico e o comprador não mexe no saldo` | Intenção de `40_620`: vendedor `+39_100`; comprador com o mesmo saldo; último `Trade` com `{ qty: 2, feeComprador: 620, feeVendedor: 900, fee: 1_520 }`; `deposits` novo do comprador de `40_620` |
| `o livro-razão fecha sem ajuste com as duas comissões` | Teste puro, como o da E2: `LIQUIDADORES.compra_direta(depois, intencao, detalhes, { taxas: TAXAS_DO_PAINEL })` e `derivarLancamentos`. `ajustes` igual a `[]`; um lançamento `comissao` do comprador com `valor: 620` e um do vendedor com `valor: 900` |
| `moeda que não transfere devolve como troco o preço e a comissão dela` | Uma das duas ofertas aponta para moeda que o vendedor não tem: `Trade` com `qty: 1`, `feeComprador: 310`; vendedor `+19_550`; comprador `+20_310` de saldo; livro-razão sem ajuste |
| `preço que subiu depois da cobrança vira saldo e o anúncio continua à venda` | Ofertas a `21_000` e intenção de `40_620`: `res.compraConcluida === false`; comprador `+40_620`; as duas ofertas continuam em `sellOffers`; nenhum `Trade` novo |
| `preço que baixou compra pelo preço novo e devolve a diferença` | Ofertas a `19_000`: vendedor `+2 × (19_000 − 440) = 37_120`; `feeComprador: 620`, `feeVendedor: 880`; comprador `+2_000` de troco; livro-razão sem ajuste |
| `intenção aberta antes da E8, sem comissão congelada, liquida como na E2` | Intenção de `40_000` sem `comissaoCompradorPorMoeda`: `feeComprador: 0`, vendedor `+39_100`, `deposits` de `40_000` |

### `src/server/payments/conciliacao-pendencia.test.ts` (novo)

Setup de `conciliacao.test.ts` (estado real em memória, gateway substituído), mais
`vi.mock('@/server/custodia/isencao-da-equipe', () => ({ contaBloqueavel }))` com `contaBloqueavel` em
`vi.hoisted`. Pendência: fatura `status: 'pendente'` com `dataVencimento: Date.now() - 86_400_000` em
`s.faturasCustodia`, na conta do vendedor (compra direta) ou do titular (retirada). Retirada `solicitada`
de uma moeda do titular, criada no estado **e** em `repositorioRetiradas()`, com `valorTaxaCents: 5_000` e
intenção `retirada` de `5_000` com `metadata.retiradaId`.

| Caso (`it`) | O que prova |
|---|---|
| `compra direta de vendedor com pendência vira saldo do comprador e o anúncio fica pausado` | `contaBloqueavel` → `true`: `res.motivo === 'vendedor_com_pendencia_creditado_em_saldo'`, `compraConcluida: false`, comprador `+valor`, vendedor sem mudança, ofertas continuam em `sellOffers`, nenhum `Trade` novo |
| `vendedor da equipe com pendência vende normalmente` | `contaBloqueavel` → `false`: `compraConcluida: true` |
| `checagem de equipe que falha libera a compra` | `contaBloqueavel.mockRejectedValue(new Error('banco fora'))`: `compraConcluida: true` |
| `retirada de conta com pendência não extingue o recibo e vira saldo` | `contaBloqueavel` → `true`: recibo `'Ativo'`; retirada no estado e no repositório com `status: 'solicitada'` e último evento com `motivo` contendo `fatura de custódia vencida`; titular `+5_000`; `deposits` `+5_000`; `derivarLancamentos` sem ajuste |
| `retirada de conta da equipe com pendência liquida como hoje` | `contaBloqueavel` → `false`: recibo `'Extinto'`, retirada `paga` |
| `retirada de recibo bloqueado vira saldo mesmo para a equipe` | `contaBloqueavel` → `false` e recibo `'Bloqueado'`: recibo continua `'Bloqueado'`, retirada `solicitada`, `motivo === 'recibo_bloqueado_creditado_em_saldo'` |
| `pagar fatura pelo gateway continua liberado para conta com pendência` | Intenção `fatura_custodia` da fatura vencida: fatura `paga`, `res.creditado === true` |

### `src/server/shipping/rastreios.test.ts` (novo)

Mocks: `server-only`; `@/server/state` (`getState` com dois envios, um postado com código e um entregue);
`@/server/shipping/retiradas` (`repositorioRetiradas` → `{ listarTodas: vi.fn() }`); `@/lib/shipping`
(`atualizarRastreiosEmLote` devolvendo um resultado por código recebido); `@/server/db/client`
(`bancoConfigurado` → `true`, `executarNoBanco: vi.fn(async (fn) => fn({}))`); e
`@/server/db/repositories/rastreios` (`salvarRastreio`, `salvarRastreioDeRetirada`, `carregarRastreios` como
`vi.fn`).

| Caso (`it`) | O que prova |
|---|---|
| `retirada postada com código entra na consulta e é gravada com o id da retirada` | `atualizarRastreiosEmLote` recebe o código do envio e o da retirada; `salvarRastreioDeRetirada` chamado com `{ codigoRastreio, retiradaId: 'RET-…' }`; `retiradasGravadas: 1` |
| `retirada que não está postada, ou sem código, fica de fora` | Retiradas `paga`, `separacao`, `entregue`, `cancelada` e `postada` com `codigoRastreio` vazio: nenhum código delas na consulta |
| `retiradas que não leem não derrubam os envios` | `listarTodas` rejeita: `salvarRastreio` do envio chamado; `retiradasVerificadas: 0` |
| `gravação da retirada que falha não desfaz a dos envios` | `salvarRastreioDeRetirada` rejeita: `gravados: 1` (envio), `retiradasGravadas: 0`, a função não lança |
| `sem banco consulta e não grava nada` | `bancoConfigurado` → `false`: `persistido: false`, nenhuma chamada de gravação |

### `src/server/custodia/marca-de-inadimplencia.test.ts` (novo)

Setup de `faturamento.test.ts` (o mesmo estado simulado e o mock de `@/server/state`), mais
`vi.mock('@/server/session', …)` para `pagarFaturaComSaldo`. As liquidações do gateway são chamadas puras:
`LIQUIDADORES.fatura_custodia(s, intencao, detalhes, { taxas: TAXAS_PADRAO })` e `LIQUIDADORES.assinatura_custodia(...)`.

| Caso (`it`) | O que prova |
|---|---|
| `o ciclo não apaga a marca manual de conta sem fatura vencida` | `sem_moeda@teste.com` com `inadimplente = true`; depois do ciclo, continua `true` |
| `o ciclo não grava marca em quem só tem fatura vencida, e a conta conta como inadimplente` | Ciclo em t=1000 e de novo depois do vencimento: `inadimplente` continua `undefined`; `isInadimplente(u, faturas, agora) === true`; `rel.usuariosInadimplentes === 1` |
| `pagar fatura com saldo não apaga a marca manual` | `pagarFaturaCustodiaComSaldo` com a marca ligada: fatura `paga`, marca `true` |
| `pagar fatura pela action de planos não apaga a marca manual` | `pagarFaturaComSaldo` (sessão da conta): marca `true` |
| `fatura e assinatura pagas pelo gateway não apagam a marca manual` | Os dois liquidadores: marca `true` |
| `pagar a fatura vencida tira a conta da inadimplência por fatura na hora` | Sem marca manual: antes, `contaComPendenciaDeCustodia(...) === true`; depois de pagar, `false` |
| `a ficha só chama de marca manual a marca do painel` | `resumirConta` depois do ciclo com fatura vencida e sem marca: `{ inadimplente: true, marcaManual: false }`. Com `u.inadimplente = true`: `marcaManual: true` |

### Testes antigos editados de propósito

- **`src/server/actions/compra-direta.test.ts:170`**: `toBe(30_000)` → `toBe(30_250)`, com o comentário
  `// preço + comissão do comprador da tabela padrão (0,5% de R$ 300,00 + R$ 1,00), RA-24 pago na E8`.
- **`src/server/custodia/faturamento.test.ts`**:
  - `:98` e `:109`: `toBe(false)` → `toBeFalsy()`. A conta não tem marca, e o ciclo não grava mais `false`;
  - `:143`: `expect(u.inadimplente).toBe(true)` → `expect(u.inadimplente).toBeUndefined()` e
    `expect(isInadimplente(u, faturasDaConta, aposVencimento)).toBe(true)`;
  - `:150` (nome) e `:175`: o teste passa a se chamar `permite pagar fatura atrasada com saldo: a conta sai
    da inadimplência por fatura e a marca manual fica`. A asserção vira
    `expect(isInadimplente(u, faturasDaConta, agora)).toBe(false)` e `expect(u.inadimplente).toBe(true)`.
- **`src/server/db/payments.test.ts`**, dois `it` novos no fim do `describe` (a instância de PGlite que
  já existe; inserir `coins` e `retiradas` com `ON CONFLICT DO NOTHING`):
  - `migration 030: rastreio de retirada grava com retirada_id e volta na chave da retirada`:
    `salvarRastreioDeRetirada` duas vezes com o mesmo código dá uma linha, e `carregarRastreios` devolve
    `protocolo` igual ao id da retirada e `retiradaId` preenchido. O rastreio de envio de antes continua
    voltando com `retiradaId: null`;
  - `migration 030: cada rastreio tem exatamente um dono`: `INSERT` com `protocolo` e `retirada_id` nulos
    é recusado, e com os dois preenchidos também.

### Rodada focada

```powershell
npx vitest run src/server/payments src/server/actions/compra-direta.test.ts src/server/actions/compra-direta-comissao-comprador.test.ts src/server/actions/bloqueio-por-debito.test.ts src/server/shipping src/server/custodia src/server/db/payments.test.ts src/server/db/derivar.test.ts src/domain/admin/usuarios.test.ts
```

---

## Regras que valem nesta branch

- **Palavras proibidas** em código, comentário, nome de teste, commit, relatório e RA: token, NFT, cripto,
  ativo digital, ativo, investimento, investidor, corretora, rentabilidade, retorno. Use "recibo" e
  "moeda". O literal `'Ativo'` do status do recibo e a variável `MP_ACCESS_TOKEN` já existem e ficam. Nos
  comentários novos, escreva "o que a função devolve". Varra antes de cada commit:
  `git diff origin/main -U0 | Select-String -Pattern '^\+' | Select-String -Pattern 'token|NFT|cripto|ativo|investi|corretora|rentabilidade|retorno'`
  e julgue pelo sujeito da frase.
- **Nenhuma trava nova.** Nada de feature flag, variável de ambiente que liga ou desliga, confirmação
  obrigatória. A conferência na conciliação só aplica, na chegada do dinheiro, a regra que a E4 já aplica
  na porta, e o dinheiro nunca fica preso: vira saldo. **Conta da equipe nunca é barrada, e checagem que
  falha libera.**
- **Dinheiro sempre em centavos inteiros.** A comissão sai de `comissaoPorMoeda` e de
  `custoDeCompraPorMoeda`. Nada de `* 0.005` nem de divisão que gere fração.
- **Fórmulas do hash e do livro-razão não mudam.** O livro fecha porque o depósito passa a cobrir a
  comissão, e não porque a derivação mudou.
- **Toda mutação passa por `mutateState`.** Leitura assíncrona (tabela, isenção) fica antes da transação.
- **Nada de `@/server/*` em Client Component.** O modal de `/mercado` só muda texto.
- **Migration:** a 030 é a única. Aditiva e idempotente, com `aurea.` explícito. Não editar migration já
  aplicada. **A E8 não roda migration em produção** (nada de `npm run db:migrate` nesta branch): no
  desenvolvimento, a 030 é testada só no PGlite (`payments.test.ts`). Quem aplica em produção é a integração
  da E8, no worktree de integração com a E8 já mesclada, antes do push na main (seção "Integração da E8"
  de `docs/execucao-pendencias/INTEGRACAO.md`).
- **Comentários em português explicando o porquê.** Atalho novo ou atualizado entra no
  `RISCOS_ASSUMIDOS.md` e no `ATALHOS.md` da pasta, no mesmo commit.
- **Não mexer em DNS, e-mail, domínio, Vercel, Supabase nem Mercado Pago.** Não criar conta nem credencial.
  Não é esperada variável de ambiente nova.
- **Não digitar senha em tela de login** e não criar rota, script ou cookie que pule autenticação.
- **Servidor local só na porta 3108** (`npm run dev -- -p 3108`). Pare o servidor antes de rodar a suíte.
  A contagem de arquivos precisa ser a da base mais 5; arquivo que some da contagem é worker que morreu:
  rode o arquivo sozinho com `npx vitest run <arquivo>` e registre no relatório.
- **Windows, PowerShell 5.1**: sem `&&`; use `;` e `if ($?) { … }`.
- **Sem merge na main**, sem `push --force`, sem `git stash` sem etiqueta.

## O que NÃO fazer

- Não ler a comissão do comprador da tabela na hora da aprovação. O valor cobrado não muda depois de a
  cobrança abrir, e o livro-razão só fecha com a comissão que foi cobrada.
- Não tornar `contaBloqueavel` obrigatório em `RegrasDaLiquidacao` e não editar o teste da E2.
- Não devolver dinheiro pelo gateway nem criar estorno no Mercado Pago: o valor vira saldo (RA-56).
- Não tirar do livro a oferta de vendedor pausado nem a que subiu de preço.
- Não mudar `isInadimplente`, `verificarStatusFatura` nem `marcarInadimplencia`. Não criar coluna nova de
  marca manual, não subir `STORE_KEY` e não mexer em `types.ts`.
- Não mudar `salvarRastreio` (o de envio) nem juntar envios e retiradas na mesma transação de gravação.
- Não criar botão de avançar retirada no painel (ver Dúvidas).
- Não mudar comissão nem catálogo em produção. Não há conferência de taxa nesta branch.
- Não marcar RA, P-C ou pendência manual como feita fora de `RISCOS_ASSUMIDOS.md` e dos `ATALHOS.md` do
  território.

---

## Entrega

1. **Ciclo, na raiz do worktree, com o servidor local parado, antes de cada push:**

   ```powershell
   npm run typecheck; if ($?) { npm run lint }; if ($?) { npm test }; if ($?) { npm run build }
   ```

2. **Conferências que vão para o relatório:**

   ```powershell
   git diff origin/main --name-only
   git diff origin/main --stat -- src/domain/hash.ts src/domain/ledger.ts src/domain/analise.ts src/server/db/derivar.ts src/server/db/diff.ts src/domain/types.ts
   Select-String -Path src\server\custodia\faturamento.ts,src\server\actions\plano-custodia.ts,src\server\payments\conciliacao.ts -Pattern '\.inadimplente\s*=[^=]'
   Select-String -Path 'src\app\(app)\mercado\page.tsx' -Pattern 'Total a pagar \(debitado da conta\)'
   ```

   O primeiro lista só caminhos do território. O segundo, o terceiro e o quarto não mostram nada.

3. **Conferência local opcional do job** (sem login, sem banco no worktree):

   ```powershell
   npm run dev -- -p 3108
   ```

   Em outro terminal:

   ```powershell
   curl.exe -s http://localhost:3108/api/cron/shipping
   ```

   O esperado é um JSON com `"ok":true`, `"persistido":false`, `"retiradasVerificadas":0` e
   `"retiradasGravadas":0`. Em desenvolvimento, sem `CRON_SECRET`, a rota não pede cabeçalho. Pare o
   servidor antes de rodar a suíte.

4. **Commits** (mensagem sem acento é aceitável), nesta ordem:
   - `Compra direta pelo gateway cobra a comissao do comprador e o livro-razao lanca as duas` — tarefas 1,
     2 (comissão e valor que cabe), 8, os testes de compra direta e o RA-24.
   - `Conciliacao reconfere a pendencia de custodia na compra direta e na retirada` — tarefas 2 (vendedor
     pausado) e 3, `conciliacao-pendencia.test.ts`, RA-53 e RA-56.
   - `Marca manual de inadimplencia so sai pelo painel` — tarefas 4 e 5,
     `marca-de-inadimplencia.test.ts`, as asserções de `faturamento.test.ts` e o RA-52.
   - `Rastreio da retirada postada no job diario (migration 030)` — tarefa 6, `rastreios.test.ts` e os casos
     de `payments.test.ts`.
   - `Relatorio da E8` — `docs/execucao-pendencias/relatorios/E8.md`.

   Cada mensagem termina com a linha `Co-Authored-By` do agente que executou, se houver.

5. **Push, sem merge:**

   ```powershell
   git push -u origin exec/e8-segunda-onda-conciliacao-e-rastreio
   ```

6. **Relatório** `docs/execucao-pendencias/relatorios/E8.md`, com:
   - a base conferida na tarefa 0 (hash da main, as três conferências de E2 e E4, a contagem);
   - o que foi feito, por item (RA-24, RA-53, rastreio, marca), com caminho e função;
   - testes: arquivos novos e o que cada um prova, as asserções antigas trocadas e o motivo, a contagem
     antes e depois (a base mais 5 arquivos) e a saída da rodada focada;
   - as conferências do passo 2, com a saída;
   - riscos: RA-24 e RA-53 pagos, RA-52 atualizado, RA-56 novo, migration 030 criada e **não aplicada**;
   - para a integração da E8 (seção "Integração da E8" de `docs/execucao-pendencias/INTEGRACAO.md`):
     marcar como pagos RA-24 e RA-53 no índice único (`docs/PENDENCIAS_ABERTAS.md`), aplicar a migration
     030 e atualizar `docs/execucao-pendencias/README.md`;
   - os passos manuais abaixo, copiados;
   - a última linha: `E8 pronta para integração — <hash do último commit de código>`.

---

## Passos manuais que sobram para o Gabriel

Nenhum passo muda taxa, catálogo ou configuração de painel externo.

### 1. Aplicar a migration 030 — tarefa da integração da E8

A E8 não aplica a 030 em produção. Quem aplica é a integração da E8, no worktree de integração com a E8
já mesclada, **antes** do push na main, pelo roteiro da seção "Integração da E8" de
`docs/execucao-pendencias/INTEGRACAO.md`.

- Lá, o `db:migrate` precisa listar `030_rastreio_da_retirada` como aplicada, e o `db:check` termina em `030`.
- A 030 é aditiva: o código que está no ar continua gravando rastreio de envio normalmente com ela
  aplicada. Por isso a ordem segura é **migration antes do push**. Se o push for antes, a leitura dos
  rastreios (logística do painel e `/api/rastreios`) falha até a migration ser aplicada.
- Sem a migration, a gravação de retirada falha sozinha (log `[rastreio]`) e a dos envios continua.

### 2. Conferir a comissão da compra direta — sem mudar taxa

**Sem credencial do Mercado Pago (o caso de hoje em produção).** Sem `MP_ACCESS_TOKEN`,
`src/server/actions/payments.ts` responde pelo simulador, e o modal para em "O gateway de pagamento ainda
não está configurado neste ambiente. Nenhuma cobrança foi aberta." A conferência do valor cobrado e do
livro-razão é o teste. Na raiz de uma pasta com a main já integrada:

```powershell
npx vitest run src/server/actions/compra-direta-comissao-comprador.test.ts src/server/payments/compra-direta-comissao-comprador.test.ts
```

O esperado é **10 testes passando**. O primeiro prova que duas moedas de R$ 200,00, com a comissão de
compra em 0,8% + R$ 1,50, cobram R$ 406,20 no Pix.

Na tela, sem pagar nada: entre com a sua conta, abra `https://aurea-custodia-mvp.vercel.app/mercado`,
clique em comprar num lote de outra conta e confira que "Total a pagar" é o subtotal mais a "Comissão de
compra da Áurea", e que a Opção 2 diz o mesmo valor.

**Com credencial do Mercado Pago.** Se `MP_SANDBOX` for `false`, o Pix é dinheiro de verdade entre contas
de sócios: escolha o lote mais barato e uma unidade.

1. Em `https://aurea-custodia-mvp.vercel.app/mercado`, abra o lote e anote o "Total a pagar".
2. Clique em **Pagar com Pix**. A nota abaixo do QR code mostra o mesmo valor. Pague.
3. Em `https://aurea-custodia-mvp.vercel.app/conta/extrato`, a linha da compra traz na coluna Taxa a
   comissão de compra, e a moeda está no seu acervo.

### 3. Conferir as marcas de inadimplência que ficaram gravadas

Uma vez, depois do deploy da E8:

1. Abra `https://aurea-custodia-mvp.vercel.app/admin/usuarios?inadimplente=1`.
2. Para cada conta da lista, abra a ficha. Se o selo disser "Inadimplente (marca manual)", abra a aba
   **Atividade** e procure na trilha de auditoria por `admin.usuarios.marcar_inadimplente`.
3. Se ninguém da equipe marcou (a trilha não tem essa linha), a marca veio de um pagamento de fatura
   antes da E8. Na aba da ficha com as ações da conta, clique em **Retirar a marca manual** (ou no
   rótulo equivalente que a E5 tiver deixado) e escreva o motivo:

   ```
   Marca gravada automaticamente antes da E8; não foi posta pela equipe.
   ```

   Se a conta tiver fatura vencida, ela continua na lista como inadimplente por fatura, e isso está certo.

### 4. Rastreio da retirada

Nada a conferir em produção agora, por dois motivos: nenhuma tela leva a retirada a "postada" (ver
Dúvidas), e o job diário responde 401 em produção sem `CRON_SECRET` (N-01, o passo a passo conferido
está no tutorial manual entregue ao Gabriel). Os testes cobrem a regra.

---

## Dúvidas que este plano não resolve

1. **Não há tela que leve a retirada a "postada".** `avancarStatusRetirada` grava o código e só é chamada
   nos testes. Um botão em `/admin/logistica` (separação → postada com código → entregue), com a
   permissão do painel, fica para outra rodada. Com ele, o rastreio da E8 passa a valer sem mudança.
2. **O job registra "entregue", mas não avança a retirada para `entregue`.** É o mesmo comportamento dos
   envios. Avançar sozinho seria regra nova.
3. **A tela de pagamento diz "Pagamento confirmado" quando o valor virou saldo** (lote indisponível, preço
   que subiu, vendedor pausado, retirada com pendência). Registrado no RA-56. Resolver pede guardar o
   motivo na intenção e mudar `PainelPagamento`.
4. **A comissão do comprador fica a da hora da cobrança.** Se o preço baixar antes de o pagamento cair, o
   troco devolve a diferença de preço, e a comissão continua calculada sobre o preço antigo. A diferença
   é de centavos, e a regra está no comentário.
5. **Retirada cancelada que recebe pagamento depois** é liquidada como paga por `liquidarRetirada`, que só
   recusa `paga`. Achado fora do escopo, para o relatório.
6. **Ficha com marca manual e fatura vencida ao mesmo tempo:** `AcoesDaConta` só mostra a mensagem da marca
   manual. É tela da E5; o dado (`inadimplente` e `marcaManual`) já permite mostrar as duas.
