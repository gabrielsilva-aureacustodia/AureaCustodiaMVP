# Mercado multi-ativo, depósito e extrato — registro técnico da mudança

**Data:** 19 de agosto de 2026
**Escopo:** 28 arquivos alterados, 6 arquivos novos, +1.463 / −276 linhas
**Autorizado por:** Gabriel Silva (sócio), em 19/08/2026
**Estado da verificação:** `npm run build` ✅ · `npm run typecheck` ✅ · 34 verificações de motor ✅ · teste manual na aplicação ✅

---

## Índice

1. [O que foi pedido e o que foi entregue](#1-o-que-foi-pedido-e-o-que-foi-entregue)
2. [A decisão central: um livro de ordens por ativo](#2-a-decisão-central-um-livro-de-ordens-por-ativo)
3. [Mudanças no modelo de dados](#3-mudanças-no-modelo-de-dados)
4. [Arquivo por arquivo: o que mudou e por quê](#4-arquivo-por-arquivo-o-que-mudou-e-por-quê)
5. [As features, explicadas](#5-as-features-explicadas)
6. [Comparação antes × depois](#6-comparação-antes--depois)
7. [Como isto foi verificado](#7-como-isto-foi-verificado)
8. [Autocrítica: o que pode estar errado e o que ficaria melhor](#8-autocrítica-o-que-pode-estar-errado-e-o-que-ficaria-melhor)
9. [Riscos do deploy](#9-riscos-do-deploy)

---

## 1. O que foi pedido e o que foi entregue

O pedido tinha sete itens. **Dois deles já existiam** e isso mudou o tamanho do trabalho — vale registrar, porque quem ler o pedido original vai procurar por eles no diff e não vai achar.

| # | Pedido | Situação |
|---|---|---|
| 1 | Ofertar várias moedas ao mesmo preço, escolhendo preço unitário e quantidade | **Já existia.** O campo "Quantidade a ofertar" seleciona as N primeiras moedas livres e o anúncio vira um lote com compra parcial (`publishOffer`, `lotId`). |
| 2 | Ofertar valor de compra com execução automática | **Já existia.** `publishBid` + `matchOrders`. |
| 3 | Hierarquia de ordem das ofertas e ativação automática | **Já existia.** Prioridade preço-tempo (`createdAt` como desempate) — é regra protegida no `CLAUDE.md`. |
| 4 | Depósito de valor em conta (simulado) | **Novo.** Etapa 3. |
| 5 | Extrato do usuário com exportação | **Novo.** Etapa 4. |
| 6 | Moeda dos Direitos Humanos + valores de mercado pesquisados | **Novo.** Etapa 1. |
| 7 | Organizar as moedas em pastas + escolha de tipo na compra e na venda | **Novo.** Etapa 2. |

O item 6 é o que puxou todo o resto. Adicionar uma moeda **negociável** ao catálogo obrigou a plataforma inteira a deixar de assumir que existe um ativo só — e essa suposição estava espalhada por 20 e poucos lugares do código, quase sempre na forma `tipoMoeda === COIN.name`.

---

## 2. A decisão central: um livro de ordens por ativo

### O problema

O motor de casamento (`src/domain/market.ts`, `matchOrders`) executava assim:

```ts
const so = state.sellOffers.find((s) => s.price <= bo.price && s.seller !== bo.buyer)
```

Traduzindo: *"ache a primeira oferta de venda cujo preço caiba no meu preço-limite"*. Enquanto todas as ofertas eram da mesma moeda, isso estava certo. Com a Direitos Humanos no mercado, ficou catastrófico:

> Alguém publica uma oferta de compra de **Direitos Humanos a R$ 450**.
> O livro tem uma **Bandeira Olímpica a R$ 285** à venda.
> R$ 285 ≤ R$ 450 → o motor executa.
> O comprador paga R$ 285, recebe uma moeda que **não pediu**, e o vendedor da Bandeira ganha um comprador que nunca quis a moeda dele.

Não é um bug sutil: é dinheiro trocando de mãos pelo ativo errado.

### A solução

Uma linha:

```ts
const so = state.sellOffers.find(
  (s) => s.tipoMoeda === bo.tipoMoeda && s.price <= bo.price && s.seller !== bo.buyer,
)
```

### Por que esta solução e não outra

Considerei três desenhos:

**(a) Um `Map<tipo, Livro>` dentro de `AppState`.** Rejeitado. Mudaria a forma do estado persistido em três stores, quebraria a serialização JSON (`Map` não é serializável — restrição escrita no topo de `types.ts`), e reescreveria o laço do motor. Custo alto, ganho nenhum na escala atual (dezenas de ofertas, não milhões).

**(b) Rodar `matchOrders` uma vez por tipo, com o estado filtrado.** Rejeitado. Filtrar cria arrays novos; o motor **muta** `state.sellOffers` e `state.buyOrders` no lugar (é assim que ele remove as ofertas consumidas). Reconciliar as cópias de volta no estado é exatamente o tipo de código que introduz compra fantasma — o defeito que este port já corrigiu duas vezes.

**(c) Um predicado a mais no `find`.** ✅ Escolhido. O laço continua idêntico, a ordenação preço-tempo continua idêntica, a aritmética continua idêntica. **A separação dos livros vira uma propriedade emergente do filtro, não uma estrutura nova.** É a menor mudança que resolve o problema por completo, e a que menos superfície oferece para regressão.

> **Em português para o Rogério:** cada moeda passou a ter sua própria fila. Quem quer comprar Direitos Humanos entra na fila da Direitos Humanos; uma oferta de Bandeira Olímpica, por mais barata que esteja, nunca é vendida para ele. Dentro de cada fila nada mudou: quem oferece mais compra primeiro, e no empate ganha quem chegou antes.

### A segunda mudança dentro do motor

O motor agrupa execuções unitárias para que N moedas do mesmo lote virem **uma** linha no histórico com `qty = N`. Ele fazia isso com uma chave de texto:

```ts
const k = bo.buyer + '|' + so.seller + '|' + price
fills.set(k, (fills.get(k) || 0) + 1)
// ...depois:
const [buyer, seller, priceStr] = k.split('|')
```

Acrescentar o tipo à chave (necessário — senão uma Bandeira e uma Direitos Humanos vendidas pelo mesmo par ao mesmo preço virariam uma linha só) tornaria esse `split('|')` dependente de **nenhum nome de moeda do catálogo conter uma barra vertical**. É uma armadilha silenciosa esperando o primeiro ativo novo.

Troquei o valor do `Map` por um objeto com os campos já separados:

```ts
const fills = new Map<string, { buyer: string; seller: string; price: Cents; tipoMoeda: string; qty: number }>()
```

A chave continua sendo texto (é só identidade de agrupamento), mas nada é reconstruído dela. **Esta é a única mudança do motor que não era estritamente obrigatória** — fiz porque o custo é de cinco linhas e o defeito que ela previne seria descoberto meses depois, em produção, por um nome de moeda infeliz.

---

## 3. Mudanças no modelo de dados

`src/domain/types.ts` é a fonte da verdade do modelo. Estas são todas as alterações:

| Tipo | Campo | Tipo do campo | Por quê |
|---|---|---|---|
| `SellOffer` | `tipoMoeda` | `string` | O livro precisa saber o que está à venda **sem varrer o inventário de todos os usuários** a cada volta do motor. Desnormalização consciente: a moeda anunciada não pode trocar de tipo, então a cópia nunca diverge. |
| `BuyOrder` | `tipoMoeda` | `string` | É o campo que separa os livros. |
| `Trade` | `tipoMoeda` | `string` | Sem ele, média de 7 dias, mediana de 24 h e os gráficos misturariam preços de moedas diferentes numa série só. |
| `Lot` | `tipoMoeda` | `string` | Derivado em leitura, não persistido. A vitrine agrupa por ele. |
| `CoinType` | `categoria` | `string` | A pasta em que a moeda aparece. |
| `CoinType` | `negociavel` | `boolean` | Substitui o `=== COIN.name` espalhado pelo código. |
| `CoinType` | `detail` | `string` | Ficha técnica por tipo. Antes havia **uma só** (`COIN.detail`), porque só um ativo ia à vitrine. |
| `Deposit` *(novo)* | `userEmail`, `valor`, `date` | — | Sem registro do aporte, o extrato não explica de onde veio o dinheiro. |
| `AppState` | `deposits` | `Deposit[]` | Continua serializável em JSON — os três stores não mudam, gravam o blob inteiro. |

**Os três campos de `CoinType` são obrigatórios, não opcionais.** Deliberado: opcional deixaria um tipo novo cadastrado sem `negociavel` cair em `undefined` (falsy, "não negociável") silenciosamente. Obrigatório força quem adicionar uma moeda a decidir.

### A consequência: a chave do estado subiu para `v6`

Um `BuyOrder` gravado na v5 não tem `tipoMoeda`. Se ele sobrevivesse ao deploy, `s.tipoMoeda === bo.tipoMoeda` compararia `undefined` com uma `string` — o bid **nunca casaria com nada** e ficaria preso no livro para sempre, invisível para o motor e visível para o usuário.

`STORE_KEY` foi de `aurea-market-v5` para `aurea-market-v6`. No primeiro acesso após o deploy, o banco vazio é semeado do zero. **Saldos, anúncios abertos e senhas trocadas das 7 contas de teste voltam ao seed.** É o padrão que este repositório já usou na migração do monolito (v4 → v5): dado de demonstração não se migra, se recria.

---

## 4. Arquivo por arquivo: o que mudou e por quê

### 4.1 Camada de domínio (`src/domain/`)

#### `types.ts` (+56 / −4)
As mudanças da seção 3. Cada campo novo levou comentário explicando o *porquê*, seguindo o padrão do arquivo.

#### `constants.ts` (+201 / −27)

O maior crescimento proporcional do diff, e quase tudo é catálogo.

- **`STORE_KEY`** → `aurea-market-v6`, com o comentário explicando o motivo do salto.
- **`COIN_TYPES`** ganhou a Direitos Humanos e os três campos novos em todos os 10 tipos. O formato passou de uma linha por moeda para um objeto por moeda — mais verboso, mas com `negociavel` e `categoria` legíveis à primeira vista.
- **`CATEGORIAS`**, `CATEGORIA_OLIMPICAS`, `CATEGORIA_DIREITOS_HUMANOS` — a ordem das pastas na tela. Ordem **de produto**, não alfabética: a olímpica vem primeiro porque é a origem da plataforma.
- **`isNegociavel(key)`** — a função que substitui o `=== COIN.name`. Detalhe importante: chave desconhecida devolve `false`, e **não** o `negociavel` da moeda-referência que `coinTypeInfo` entregaria pelo fallback. Um tipo fora do catálogo não tem mercado; deixá-lo cair na Bandeira abriria a porta para negociar um ativo que a plataforma não reconhece.
- **`tiposNegociaveis()`**, **`categoriasDoCatalogo()`** — alimentam os seletores e as pastas. A segunda coloca categoria desconhecida no fim em vez de sumir com ela, para um tipo novo nunca desaparecer da tela por esquecimento.
- **`FAIXA_VALOR` / `faixaValor(tipo)`** — os valores de referência por tipo, para quando não há mercado. Os da Bandeira são os do MVP original (R$ 235–300); os da Direitos Humanos vêm da pesquisa (seção 5.1).
- **`DEPOSITO_MAX`** — R$ 100.000. Não é regra financeira, é anteparo de ambiente de teste.

**`COIN` continua existindo** e continua sendo a moeda-referência (é o "Real Olímpico" dos gráficos). O que mudou é o comentário no topo dela, que agora avisa explicitamente para **não** usá-la como teste de negociabilidade — que era exatamente o atalho que excluía a Direitos Humanos.

#### `market.ts` (+163 / −59)

| Função | Antes | Depois | Motivo |
|---|---|---|---|
| `avg7(state)` | média de todas as negociações | `avg7(state, tipo)` — **obrigatório** | Uma DH de R$ 450 e uma Bandeira de R$ 285 na mesma média não descrevem mercado nenhum. |
| `lastTrade(state)` | última negociação | `lastTrade(state, tipo?)` — **opcional** | O painel inicial quer a última da *plataforma* (mistura proposital, e o cartão anuncia o tipo ao lado do preço). O mercado quer a do tipo em foco. |
| `medianSellPrice(state)` | mediana global | `medianSellPrice(state, tipo)` — **obrigatório** | Esta função decide o **valor impresso no certificado**. Um parâmetro opcional que, esquecido, devolvesse a mediana de todos os ativos escreveria um valor errado no documento sem nada acusar. |
| `availableCoinsForSell(state, u)` | moedas de `COIN.name` livres | `(state, u, tipo?)` | `tipo` omitido = todas as negociáveis livres. A checagem de `isNegociavel` ficou **dentro** da função: quem chama pode passar um tipo que o usuário possui mas que o mercado não aceita. |
| `lotsFromOffers(state)` | todos os lotes | `(state, tipo?)` | A vitrine agrupa depois; o filtro serve às contagens dos seletores. |
| `matchOrders(state)` | um livro | um livro **por tipo** | Seção 2. |

**A escolha entre parâmetro obrigatório e opcional não foi estética.** A regra que apliquei: *se esquecer o argumento produz um número silenciosamente errado num lugar que ninguém revisita, o parâmetro é obrigatório*. `medianSellPrice` e `avg7` caem nisso. `lastTrade` e `lotsFromOffers` têm um uso global legítimo, então são opcionais.

#### `seed.ts` (+155 / −45)

- **`mkCoinsForUser`** — cada conta recebe de 1 a 3 Direitos Humanos, **recortadas do total** que a conta já tinha, não somadas a ele. Somar mudaria a contagem de moedas e, com ela, a faixa da taxa de custódia anual (R$ 5/15/25/30/60) — um efeito colateral silencioso numa tabela de preços que só os sócios podem alterar.
- Guarda: `Math.min(nDh, Math.max(0, n - 1))` garante ao menos uma Bandeira. Sem isso, uma conta pequena poderia abrir a tela de venda sem nada do ativo principal.
- **`TIPOS_DECORATIVOS`** sai do próprio catálogo (`filter(t => !t.negociavel)`) em vez de ser uma lista escrita à mão. Assim um ativo negociável novo nunca cai por engano na cota de "variedade visual".
- **`genHistoryTrades`** foi generalizado para um array `SERIES`. Os números da Bandeira (R$ 235 → R$ 300, 24 negociações, jitter de ±R$ 13, piso de R$ 200) **são exatamente os do original** — é a deriva que dá ao gráfico da home a inclinação positiva que a demonstração mostra. A série da DH é nova e deliberadamente mais discreta: 8 negociações girando em torno de R$ 450.
- A ordenação cronológica final é **global**, não por série: `lastTrade` devolve o último item do array, e o histórico precisa continuar sendo lido como uma linha do tempo única.

#### `selectors.ts` (+10 / −4)
`roDailySeries(state, days)` → `roDailySeries(state, days, tipo)`, obrigatório. Sem o recorte, um dia com uma DH de R$ 450 e uma Bandeira de R$ 285 viraria um único ponto em R$ 367, e o gráfico do Real Olímpico mostraria um salto que nunca aconteceu no preço dele.

#### `statement.ts` — **novo, 234 linhas**
A regra do extrato. Função pura, como todo o resto do domínio: recebe o estado, devolve linhas. Não sabe o que é CSV nem XLSX.

Decisões registradas no arquivo:
- **Ordem crescente** (mais antigo primeiro). Extrato se lê somando de cima para baixo; é assim que ele bate com o saldo. A tela inverte para exibição; o arquivo mantém.
- **Envios e cobrança de custódia entram com `impacto: 0`**, porque não movem saldo. O extrato também responde *"o que aconteceu com as minhas moedas"*.
- **A comissão é recalculada** com `tradeFee`, não lida de um campo. É a mesma regra do motor — o `Trade` não grava a comissão justamente para as duas não poderem divergir. *(Ver a ressalva 8.3.)*
- **`parseDateBR`** devolve `0` em data malformada, não `NaN`. `NaN` envenenaria o comparador do `sort` e deixaria a ordem do extrato inteiro indefinida.

### 4.2 Camada de servidor (`src/server/`)

#### `actions/sell.ts` (+70 / −19)

**A mudança mais importante de segurança da entrega:** o tipo do lote sai das moedas, **nunca do cliente**.

```ts
const tipoMoeda = validas[0].tipoMoeda   // do inventário do servidor
```

A tela tem um seletor de tipo, mas ele é conveniência de interface. Aceitar o tipo pela requisição permitiria anunciar uma Bandeira de R$ 285 dentro do livro da Direitos Humanos e casá-la com um bid de R$ 450 — **um lucro de R$ 165 fabricado por uma requisição forjada**. É exatamente o tipo de coisa que motivou toda a regra de negócio a sair do navegador neste port.

Duas recusas novas:
- **Lote misto** (`Um anúncio só pode conter moedas do mesmo tipo.`) — a interface nunca monta um, mas a server action é um endpoint HTTP. Um lote tem um preço unitário só; misturar ativos venderia a moeda cara pelo preço da barata.
- **Tipo não negociável** — segunda barreira, redundante com a interface de propósito.

`sellToBid` passou a filtrar o estoque pelo tipo do bid. Sem isso, aceitar uma oferta de compra de DH entregaria a primeira moeda livre do inventário — quase sempre uma Bandeira, bem mais barata.

#### `actions/market.ts` (+40 / −8)
- `publishBid(qty, preco, **tipoMoeda**)` com validação de `isNegociavel`. Sem ela, um bid de "Mascote Vinicius" entraria no livro e ficaria preso lá para sempre.
- `buyLot` carimba `tipoMoeda` na negociação (lido da oferta, não do cliente).
- **`editBid` não permite trocar o tipo.** Registrado em comentário: trocar o ativo de uma ordem publicada preservaria a posição dela na fila de um livro em que ela nunca esteve, furando a prioridade de quem chegou antes naquele mercado. Para comprar outro tipo, cancela-se e publica-se outro.

#### `actions/custody.ts` (+19 / −8)
A emissão de recibo usava `envio.tipoMoeda === COIN.name` para decidir se consultava o mercado. Virou `isNegociavel` + `medianSellPrice(state, tipo)` + `faixaValor(tipo)`. Antes, uma Direitos Humanos recém-custodiada receberia um valor sorteado na faixa das olímpicas comuns (R$ 140–360) **mesmo com o mercado dela aberto e cotado**.

#### `actions/account.ts` (+56 / −3)
Ação `deposit(valorCents)` nova. Comentário no arquivo explica por que ela roda no servidor: **é a ação que cria dinheiro**. No navegador, bastaria o console para inventar saldo e varrer o livro de ordens das outras seis contas.

Validações, na ordem: `Number.isFinite` → `> 0` → `<= DEPOSITO_MAX`. O `isFinite` vem primeiro de propósito — `Infinity` somado ao saldo o transformaria em `Infinity`, e daí em `null` na serialização JSON, corrompendo a conta.

#### `state.ts` (+23 / −2)
`garantirFormato(state)` preenche `deposits` quando ausente. **Não é uma migração** — a troca de `STORE_KEY` é que garante o banco limpo. Esta função existe só para o caso de alguém apontar `AUREA_STORE_KEY` de volta para uma chave antiga, em que `state.deposits.push()` estouraria um `TypeError` no meio de uma transação de escrita. *(Ver a ressalva 8.1 — ela cobre menos do que parece.)*

### 4.3 Interface (`src/components/`, `src/app/`)

#### `Folder.tsx` — **novo, 81 linhas**
Pasta recolhível, puramente apresentacional. Decisões:
- **Estado mora na página, não aqui.** A mesma tela precisa abrir a pasta do tipo que o usuário acabou de escolher no seletor; guardar `aberta` internamente deixaria os dois controles discordando.
- **O cabeçalho é `<button>`, não `<div>` com `onClick`.** É um controle que abre e fecha conteúdo: precisa de foco por teclado, Enter/Espaço nativos e `aria-expanded`. Sem isso, um leitor de tela anuncia "Moedas Olímpicas" e não diz que há algo a expandir.
- **O conteúdo é desmontado quando fechado**, não escondido com `display:none`. Uma pasta fechada pode ter dezenas de moedas; mantê-las no DOM custa render a cada volta do ciclo de sincronização de 10 s.

#### `TipoSelector.tsx` — **novo, 87 linhas**
`<fieldset>` + `<legend>` + `<input type="radio">` em vez de botões estilizados. São opções mutuamente exclusivas de formulário: o rádio nativo entrega navegação por setas, agrupamento anunciado pelo leitor de tela e estado marcado **sem uma linha de ARIA escrita à mão**. O visual de pílula é CSS.

A prop `name` é obrigatória porque a tela de mercado tem **dois** seletores; com o mesmo `name`, marcar um desmarcaria o outro.

#### `CoinPicker.tsx` (+185 / −78) — reescrito
De lista corrida para pastas em dois níveis (categoria → tipo → moedas). Usa `Map` e não objeto literal: a ordem de inserção é garantida, e nomes como `Rio 2016 – Estádio` não combinam com acesso por propriedade.

Moedas de outro tipo aparecem **inertes** com a etiqueta `OUTRO TIPO SELECIONADO`, em vez de sumirem. Bloquear na hora é o que evita o usuário montar a seleção para depois levar uma recusa do servidor que ele não tinha como prever.

Trocou `CoinSvg` (arte fixa da Bandeira) por `CoinArt type={c.tipoMoeda}`.

#### `CoinArt.tsx` (+32)
Motivo novo para a Direitos Humanos: globo com meridianos e figura humana de braços abertos — evocação do anverso real, não fac-símile. **Nenhum anel olímpico**, e não por acaso: a restrição de PI do COB vale para toda arte de moeda do projeto, inclusive as que não são olímpicas. Nenhum traçado existente foi tocado.

#### `mercado/page.tsx` (+177 / −33)
- `tipoAtivo` comanda três coisas ao mesmo tempo: indicadores da esquerda, tipo da oferta de compra e qual pasta abre. **Um estado só, deliberadamente** — dois seletores independentes deixariam publicar um bid de um ativo enquanto se olha o preço de outro.
- Vitrine agrupada em pastas com resumo (`N anúncio(s) · N moeda(s) · a partir de R$ X`).
- O `note` do formulário passou a dizer que ofertas de outros tipos **não** são consideradas.
- Histórico e indicadores filtrados por tipo, com estado vazio próprio.

#### `vender/page.tsx` (+120 / −25)
- `tipoAtivo` + `abertas`, com `trocarTipo` **limpando a seleção**: as moedas marcadas são do tipo anterior e o servidor recusa lote misto.
- O parâmetro `?moeda=RO-000042` (vindo do certificado) agora define o tipo a partir da moeda. Sem isso, a moeda pré-selecionada apareceria bloqueada como "outro tipo".
- `abrirVendaDireta` confere o estoque **do tipo do bid**, não do tipo em foco — a lista de ofertas recebidas mostra todos os ativos.

#### Demais telas
`conta`, `recibos`, `Certificate`, `HomeStats`, `graficos`, `graficos/comparacoes`, `LotCard`, `BidRow`, `SellerBidRow`, `Topbar` — todas trocaram `=== COIN.name` por `isNegociavel` ou por leitura do tipo do próprio registro. Dois detalhes:

- **`conta` e `recibos` pré-calculam `medPorTipo`** em vez de chamar `medianSellPrice` dentro do `valOf`. Com 21 moedas na conta seriam 21 varreduras de `sellOffers` para responder duas perguntas distintas.
- **`SellerBidRow` ganhou `livres`** e desabilita o botão quando é zero. Antes ele estava sempre ativo (havia um ativo só e a recusa vinha dentro da modal).
- **Topbar:** "Comprar moeda olímpica" → **"Comprar moedas"**. Deixou de ser verdade quando uma moeda não-olímpica entrou no marketplace.

#### `market.css` (+53)
`.folder*`, `.tipo-sel`, `.tipo-opt`. Alvos de toque com `min-height: 44px` — mínimo do projeto. O rádio nativo fica **visível** de propósito. Adicionado no fim do arquivo, sem tocar em nada existente; `responsive.css` continua sendo o último import de `globals.css`.

### 4.4 Extrato e exportação

#### `conta/extrato/page.tsx` — **novo, 259 linhas**
Client Component porque a lista acompanha o ciclo de 10 s: uma venda casada em outra aba entra sozinha.

- Filtros por tipo de movimentação.
- **O arquivo exportado leva sempre tudo, nunca o filtro.** Um arquivo que parece completo mas traz só as compras é pior que nenhum arquivo — está escrito na tela.
- Cores no impacto: verde entra, vermelho sai, cinza não mexeu no saldo.
- Duas limitações reais escritas na própria tela (custódia não debitada; só a cobrança vigente; saldo inicial não é depósito). Sem elas o extrato *parece* errado a quem conferir.

#### `lib/export/statement-export.ts` — **novo, 193 linhas**
Espelha o padrão de `lib/xlsx/audit-export.ts`: roda no cliente, import dinâmico do SheetJS.

- **`toFileRows`** é compartilhada pelos dois formatos. Duplicar a conversão deixaria CSV e XLSX divergirem com o tempo.
- **CSV com `;` e decimal com vírgula**, mais BOM UTF-8. É o que o Excel em português abre em colunas com duplo clique. Com vírgula de separador ele joga a linha inteira numa célula só e o arquivo "não funciona" para quem recebeu. Sem o BOM, "Custódia" vira "CustÃ³dia".
- **`csvCampo`** escapa `;`, aspas e quebras de linha. A observação de um anúncio é texto livre; sem isso um ponto e vírgula digitado partiria a linha.
- **`revokeObjectURL`** após o download. Sem ele, cada exportação deixa o Blob preso na memória da aba.
- **Diferença deliberada em relação à auditoria:** este arquivo **leva** dados do proprietário. A regra "sem dados de proprietário" vale para a planilha de auditoria pública, que é outro documento com outro propósito.

**Por que CSV e XLSX, e não PDF ou XML.** CSV não precisa de biblioteca (texto puro, pesa nada); XLSX reaproveita o SheetJS que a auditoria já carrega. PDF exigiria uma segunda dependência pesada por um documento que ninguém vai reimprimir; XML não tem leitor natural para quem usa a plataforma. As linhas já saem prontas de `@/domain/statement` — o caminho está aberto se o contador pedir.

---

## 5. As features, explicadas

### 5.1 Moeda dos Direitos Humanos

**R$ 1 de 1998, cinquentenário da Declaração Universal dos Direitos Humanos.** Bimetálica, 27 mm, 7,84 g, tiragem de **600.000** — a menor do Plano Real, e o motivo de ela valer muito mais que as olímpicas de 2016. Emitida pelo Banco Central em 10/12/1998.

**Pesquisa de preço (agosto/2026), em lojas numismáticas:**

| Estado de conservação | Preço praticado |
|---|---|
| MBC (Muito Bem Conservada) | ~R$ 350 |
| Soberba | ~R$ 590 |
| FC (Flor de Cunho) | ~R$ 600 |
| Catálogo | até R$ 550 |

Fontes consultadas: Marcon Numismática, Caravelas Coleções, Numismática Colon, Contagem Numismática, Seu Crédito Digital.

**Faixa adotada na simulação: R$ 380 a R$ 520**, com histórico girando em torno de R$ 450. Estreitei para o centro **porque a plataforma não classifica estado de conservação** — usar a ponta alta (R$ 600) sugeriria uma precisão que o sistema não tem. Matérias sensacionalistas falam em R$ 1.100; ignorei, porque preço de manchete não é preço de loja.

### 5.2 Um livro por ativo
Seção 2.

### 5.3 Pastas e seletor de tipo
A lista corrida virou pastas por categoria, com seletor de tipo antes — é ele que diz a que moeda o preço unitário se refere. Um anúncio continua sendo de **um tipo só**.

### 5.4 Depósito simulado
Botão junto ao saldo em *Minha conta*. **Não há Pix, cartão nem boleto.** Teto de R$ 100.000 por operação. O aviso de "simulado" está na modal — um botão "Depositar" que parece um caixa eletrônico de verdade seria enganoso mesmo entre sócios.

### 5.5 Extrato da conta
`/conta/extrato`, com filtros e exportação CSV/XLSX (o XLSX leva aba de resumo). **Não confundir com a auditoria pública (2.0):** aquela é o estoque de todas as contas e não leva dado de proprietário; esta é de uma conta só, com dinheiro, contraparte e comissão à vista.

---

## 6. Comparação antes × depois

### Comportamento

| Situação | Antes | Depois |
|---|---|---|
| Bid de DH a R$ 450, oferta de Bandeira a R$ 285 no livro | **Executava** — comprador recebia a moeda errada | Não executa. Oferta segue no livro, nenhum saldo se move |
| Empate de preço no mesmo ativo | Quem publicou antes leva | **Idêntico** |
| Preço maior vs. quem chegou antes | Preço maior ganha | **Idêntico** |
| Média de 7 dias | Todas as negociações | Do tipo em foco |
| Mediana de 24 h (valor do certificado) | Global | Do tipo da moeda |
| Gráfico do Real Olímpico | Todas as negociações | Só a Bandeira |
| Tipos negociáveis | 1 | 2 |
| Escolher moedas para vender | Lista corrida de até 21 itens | Pastas por categoria + seletor de tipo |
| Vitrine de ofertas | Lista corrida | Pastas por categoria |
| Aumentar saldo | Impossível | Depósito simulado até R$ 100.000 |
| Ver as próprias movimentações | Impossível | Extrato com CSV/XLSX |
| Título da tela de compra | "Comprar moeda olímpica" | "Comprar moedas" |
| Valor de recibo de moeda recém-custodiada | Mercado só para a Bandeira | Mercado para qualquer negociável |

### Código

| Métrica | Antes | Depois |
|---|---|---|
| Arquivos em `src/domain/` | 9 | 10 |
| Testes de `tipoMoeda === COIN.name` | ~8 pontos de decisão | 0 (substituídos por `isNegociavel`) |
| Chamada mais perigosa | `medianSellPrice(state)` — global, opcional esquecer | `medianSellPrice(state, tipo)` — obrigatório |
| Reconstrução de dados por `split('|')` | Sim, no motor | Não |
| Chave do estado | `aurea-market-v5` | `aurea-market-v6` |

---

## 7. Como isto foi verificado

**1. `npm run typecheck` e `npm run build`** — ambos limpos. O `tsc` foi usado como ferramenta de busca: tornar `medianSellPrice`, `avg7` e `roDailySeries` obrigatórios fez o compilador **listar exatamente os 9 pontos** que precisavam do recorte por tipo. Nenhum foi encontrado a olho.

**2. Suíte de 34 verificações do motor.** Compilei `src/domain` isoladamente e exercitei o motor com estados montados à mão. Todas passaram:

- Bid de DH a R$ 450 **não** consome oferta de Bandeira a R$ 285 (nenhuma moeda, nenhum saldo, oferta intacta)
- Mesmo tipo casa; comprador paga cheio, vendedor recebe líquido, comissão confere ao centavo
- **Empate de preço: quem publicou antes leva** — prioridade preço-tempo intacta
- **Preço maior ganha de quem chegou antes** — idem
- Dois livros executando em paralelo sem contaminação
- Mesmo preço em tipos diferentes gera **duas** linhas no histórico
- `avg7` e `medianSellPrice` isolam os tipos
- Seed: toda conta com 1–3 DH, ao menos 1 Bandeira, **contagem total por conta inalterada**, histórico dos dois ativos em ordem cronológica, preços de DH na faixa pesquisada
- **Extrato fecha com o saldo real** (saldo inicial + soma dos impactos = saldo atual)

**3. Teste manual na aplicação rodando:**
- Publiquei uma oferta de DH a R$ 450 → gravou com `tipoMoeda: "Direitos Humanos"`, `price: 45000`
- Média de 7 dias da Bandeira ficou em **R$ 292,50**, ignorando corretamente as negociações de R$ 450
- Depósito de R$ 1.500,00 (digitado como `1.500,00`) → saldo 5.400.000 → 5.550.000 centavos, aporte registrado
- Extrato mostrou as duas moedas, comissão só nas vendas, custódia com impacto zero

> ⚠️ **O que NÃO foi testado ao vivo:** o cruzamento entre duas contas diferentes na interface (publicar oferta na conta A e bid na conta B). O painel do navegador parou de compor imagem no meio da sessão e a troca de conta ficou inviável. **O cenário está coberto pela suíte automatizada** (testes 1 e 5), que é mais rigorosa que o clique manual — mas a ressalva fica registrada.

---

## 8. Autocrítica: o que pode estar errado e o que ficaria melhor

Esta seção existe porque um registro de mudança que só lista acertos não serve para nada na próxima sessão.

### 8.1 `garantirFormato` cobre menos do que o nome sugere ⚠️

Ela preenche `deposits`, e só. Se alguém apontar `AUREA_STORE_KEY` para um blob v5, as ofertas e ordens antigas continuarão sem `tipoMoeda` — e aí acontece algo pior que um erro: **duas ordens v5 (ambas com `tipoMoeda: undefined`) casariam entre si**, porque `undefined === undefined` é verdadeiro. O comportamento seria o antigo, misturando ativos.

Não é um risco no deploy planejado (a chave nova garante banco limpo), mas o nome da função dá uma sensação de proteção que ela não entrega. **Melhoria:** ou renomear para `garantirDeposits`, ou fazê-la de fato normalizar — descartar ordens sem `tipoMoeda` e registrar quantas foram descartadas.

### 8.2 O extrato não inclui o saldo inicial 🔸

O saldo das contas de demonstração vem do seed e não é um depósito. Consequência: a soma dos impactos do extrato **não** dá o saldo atual sozinha — só bate se você souber o saldo inicial. Documentei isso na tela, mas documentar uma limitação é pior que removê-la.

**Melhoria clara:** uma linha de abertura "Saldo inicial da conta" com o valor do seed, tornando o extrato autoexplicativo. Não fiz porque exigiria gravar o saldo inicial no estado (hoje ele é indistinguível do saldo corrente) — é mudança de modelo, e eu já estava mexendo em `AppState`. **Ficaria melhor ter feito junto.**

### 8.3 A comissão histórica é recalculada, não congelada ⚠️

`statement.ts` chama `tradeFee(t.price)` para cada venda. Se `FEE_PCT` ou `FEE_FIXED` mudarem um dia, **o extrato passará a mostrar comissões diferentes para negociações que já aconteceram.** Um extrato que muda o passado é um problema contábil real, não estético.

Herdei a decisão do repositório (o `Trade` não grava a comissão de propósito, para tela e execução não divergirem), e ela é defensável enquanto as taxas não mudam. Mas **a decisão certa a longo prazo é gravar a comissão no `Trade`** e recalcular apenas para registros antigos que não a tenham. Não fiz porque estava fora do escopo autorizado e mexe numa regra de negócio protegida — **mas deve entrar na próxima conversa com os sócios.**

### 8.4 Nenhum teste ficou no repositório ⚠️

As 34 verificações rodaram numa compilação isolada, num diretório temporário, e foram apagadas. **A verificação não é reproduzível pela equipe** — se alguém mexer no motor amanhã, não há rede.

O projeto não tem runner de teste configurado (sem Vitest, sem Jest). Adicionar um estava fora do escopo. **Recomendação forte:** transformar a suíte num arquivo real. É a maior fragilidade desta entrega — o código mais crítico da plataforma continua sem teste versionado.

### 8.5 Recálculos sem memoização 🔸

`mercado/page.tsx` reconstrói `lotesPorCategoria` e `lotesPorTipo` a cada render; `vender/page.tsx` chama `availableCoinsForSell` uma vez por tipo negociável a cada render; `extrato/page.tsx` reconstrói o extrato inteiro. Como o `AppProvider` traz estado novo a cada 10 s, isso roda com frequência.

Na escala atual (7 contas, ~90 moedas, poucas ofertas) o custo é irrelevante — medi como imperceptível. Mas nenhum deles está em `useMemo`, e o custo é O(tipos × moedas × ofertas). **Com centenas de ofertas isso vira lentidão visível.** Não memoizei porque otimização prematura esconde mais do que resolve, mas o ponto está mapeado.

### 8.6 `availableCoinsForSell` ficou com duas semânticas num parâmetro só 🔸

`tipo` omitido = "todas as negociáveis"; `tipo` informado = "só desse tipo, se for negociável". É subtil demais para uma função que decide o que pode ir à venda. **Duas funções com nomes explícitos** (`coinsLivresParaVenda` e `coinsLivresDoTipo`) seriam mais honestas. Mantive uma só para não multiplicar a superfície de API no meio de uma mudança grande — é dívida consciente, não descuido.

### 8.7 Acessibilidade: dois controles herdados continuam inacessíveis 🔸

O aceite de termos (`.terms`) e o "Sair" (`.logout`) são `<div>`/`<span>` com `onClick`, sem `role`, sem `tabIndex`. **Não são operáveis por teclado.** Descobri isso na prática: durante o teste manual, o aceite de termos não aparecia na árvore de acessibilidade e tive que clicar por coordenada.

São defeitos **pré-existentes** do port, não introduzidos aqui, e a regra do repositório é não refatorar o que não foi pedido. Mas eu estava mexendo nessa tela, e os componentes novos (`Folder`, `TipoSelector`) foram feitos acessíveis justamente por esse critério. **Ficou uma inconsistência dentro da mesma tela** — vale uma tarefa separada.

### 8.8 `trocarTipo` fecha as pastas que o usuário abriu 🔹

Trocar o tipo substitui o conjunto de pastas abertas por uma só. Se o usuário tinha aberto as duas para comparar, perde isso. Escolhi assim porque o clique no seletor precisa mostrar algo novo — mas abrir a nova **sem fechar as outras** teria sido igualmente claro e menos destrutivo.

### 8.9 Depósito sem proteção contra repetição 🔸

Não há idempotência nem limite de frequência: o teto é por operação, não por período. A modal desabilita o botão durante o envio, o que resolve o duplo clique — mas uma requisição repetida processaria de novo. Em ambiente de teste com 7 sócios é aceitável; **antes de qualquer cliente real, não é.**

### 8.10 A pasta "Moedas Olímpicas" mostra menos do que o nome promete 🔹

Na tela de venda, ela só contém a Bandeira — as outras 8 olímpicas não são negociáveis e a tela existe para anunciar. É correto, mas pode surpreender quem abrir esperando ver o acervo olímpico inteiro. Uma linha do tipo *"+ 6 moedas olímpicas não negociáveis"* dentro da pasta resolveria sem poluir.

### 8.11 O que eu faria diferente se recomeçasse

1. **Testes versionados desde o começo** (8.4) — de longe o item mais importante.
2. **Saldo inicial como linha de abertura do extrato** (8.2), feito junto com a mudança de `AppState`.
3. **Levar a comissão congelada no `Trade`** à decisão dos sócios (8.3) antes de escrever o extrato.
4. Menos comentário narrativo em alguns pontos: o padrão do repositório é comentário de bloco explicando o porquê, e em dois ou três lugares eu passei do ponto — comentário que repete o código é ruído que envelhece mal.

---

## 9. Riscos do deploy

| Risco | Gravidade | Mitigação |
|---|---|---|
| **Banco de teste zera** — saldos, anúncios e senhas trocadas voltam ao seed | Alta, mas **esperada e autorizada** | É dado de demonstração. Documentado no README e no CLAUDE.md |
| `AUREA_STORE_KEY` definida na Vercel anularia o salto de versão | Alta se ocorrer | **Conferir antes do deploy** que a variável **não** existe no projeto. Se existir, ou removê-la ou apontá-la para um valor novo |
| Persistência hoje é **Redis (Vercel KV)**, não Postgres | Média | "Última gravação vence". Já era assim; não piorou. Só o Postgres resolve concorrência de verdade |
| Regressão no motor de casamento | Alta se ocorrer | 34 verificações passaram, incluindo prioridade preço-tempo. **Mas não ficaram versionadas** (8.4) |
| Layout das pastas no celular | Baixa | Alvos de 44px; `responsive.css` intocado e ainda último no `globals.css` |

**Checklist antes de publicar:**

- [ ] `npm run build` e `npm run typecheck` limpos
- [ ] Conferir na Vercel que `AUREA_STORE_KEY` **não** está definida
- [ ] Avisar os sócios que o ambiente vai zerar
- [ ] Após o deploy: entrar, conferir que a Direitos Humanos aparece na carteira e que a média de 7 dias da Bandeira continua na casa dos R$ 290
