# Finalizações da Áurea — plano de execução em 3 branches e 9 sub-branches

```
Projeto:     Áurea Custódia / Real Olímpico
Base:        main @ bb975db
Escrito em:  13/09/2026
Frentes:     A (mercado e termos) · B (cobrança e custódia) · C (painel Admin)
Referências: docs/PLANO_EXECUCAO_ADMIN.md — o desenho do Admin, que a frente C executa
             docs/publish_docs/PROTOCOLO_DO_AGENTE.md — as regras de sessão
             docs/finalizacoes/2026-09-13_minuta_* — a minuta dos termos e os comentários do advogado
```

> **Para o Rogério.** São sete pedidos do Gabriel, divididos em três equipes que trabalham
> ao mesmo tempo sem pisar uma no arquivo da outra. A equipe A arruma o mercado (taxa dos dois
> lados, fila justa, edição de ofertas) e publica os termos do advogado. A equipe B faz o
> cliente conseguir pagar custódia e retirada por Pix e cartão, e organiza esse dinheiro no
> financeiro. A equipe C monta o painel de administração.

---

# 0. A resposta curta

## 0.1 Onde cada pedido vira trabalho

| # | Pedido do Gabriel (13/09) | Sub-branch |
|---|---|---|
| 1 | Taxa por negociação cobrada do comprador e do vendedor | **A1** |
| 2 | Edição de ofertas de compra e de venda enquanto não houver aceite | **A2** |
| 3 | Compra e venda automáticas, respeitando a ordem de cadastro | **A2** |
| 4 | Termos e condições do advogado no site, com registro formal de aceite | **A3** |
| 5 | Painel Admin, conforme `docs/PLANO_EXECUCAO_ADMIN.md` | **C1 · C2 · C3** |
| 6 | Pix e cartão no envio de moeda (serviço de custódia) e na retirada | **B1 · B2 · B3** |
| 7 | Custódia mensal e anual, separação financeira e organização no financeiro | **B2 · B3** |

## 0.2 O que o reconhecimento de 13/09 encontrou

Leitura arquivo por arquivo antes de planejar. Seis achados mudam o que se faz:

1. **O casamento automático já existe e funciona na regra.** `matchOrders` roda depois de
   publicar e de editar oferta dos dois lados (`src/server/actions/market.ts` e `sell.ts`), e
   os 51 testes do motor e do banco passaram em 13/09. O defeito que o Gabriel viu está no
   caminho entre a tela e a regra — A2 começa reproduzindo, não reescrevendo.
2. **A edição de oferta de compra também já existe no servidor** (`editBid`), mas o botão é um
   texto sublinhado de 11,5 px (`src/components/market/BidRow.tsx`, `src/styles/market.css:106`),
   abaixo do alvo mínimo de 44 px e fácil de não enxergar.
3. **A comissão sai só do vendedor em 4 caminhos de execução** — motor, compra de lote, venda
   para oferta de compra e compra direta pelo gateway — e é lida em mais 12 pontos (ledger,
   extrato, diff, conciliação, prévias). Mudar só o motor faria o livro-razão lançar a
   diferença como "ajuste".
4. **Moeda comprada no marketplace nunca mais é faturada.** `gerarFaturaParaUsuario`
   (`src/domain/custody.ts`) conta `!c.transferido`, e `transferCoin` marca `transferido`
   em toda moeda que muda de dono. Moeda já retirada, ao contrário, continua sendo cobrada.
5. **A caixa "Li e aceito os Termos" nasce marcada e grava aceite mesmo desmarcada**
   (`src/components/login/RegisterForm.tsx:35`, `useState(true)`; o botão não depende dela).
   Caixa pré-marcada não serve como prova de aceite.
6. **A cobrança por Pix e cartão está presa dentro do modal de depósito**
   (`src/components/account/AccountModals.tsx:304`), e a retirada recusa quem não tem saldo
   (`src/server/actions/custody.ts:467`).

---

# 1. Decisões de 13/09/2026 que este plano executa

| # | Decisão | Consequência no código |
|---|---|---|
| F-1 | Comissão cobrada **dos dois lados**, no valor já definido: 0,5% + R$ 1,00 por moeda | Numa negociação de R$ 200,00: comprador paga **R$ 202,00**, vendedor recebe **R$ 198,00**, Áurea fica com **R$ 4,00** |
| F-2 | O casamento automático segue **preço e depois ordem de cadastro** | Campo `prioridadeEm` explícito; `createdAt` nunca muda |
| F-3 | **Mudou o preço ou aumentou a quantidade, a oferta vai para o fim da fila** daquele preço. Reduzir quantidade ou trocar observação mantém a posição | `prioridadeEm` é reescrito nesses dois casos |
| F-4 | "Comprar" num anúncio da vitrine e "Vender" para uma oferta de compra **executam o item clicado**, como hoje | `buyLot` e `sellToBid` não passam a consumir a fila |
| F-5 | "Split para o Mercado Pago" na custódia é **separação no financeiro**: todo pagamento cai na conta da Áurea, e o sistema separa bruto, tarifa do Mercado Pago e líquido, por competência | Sem OAuth, sem conta de terceiro, sem `marketplace_fee` |
| F-6 | **Nenhuma trava.** Termos não bloqueiam cadastro nem operação; plano de custódia não bloqueia a postagem; retirada não exige saldo | Aceite por clique com registro de prova; "pagar depois" sempre disponível |
| F-7 | A minuta do advogado é publicada **como veio**. Os pontos de texto voltam para ele | Lista em `docs/finalizacoes/2026-09-13_minuta_pontos_para_os_socios.md` |

Sobre o **split do Mercado Pago**, para registro: conferido na documentação vigente em 13/09,
o split só existe no modelo Marketplace, em que cada recebedor tem conta própria vinculada
por OAuth (credencial renovada a cada 6 meses) e a plataforma retém a comissão pelo parâmetro
`marketplace_fee` (Checkout Pro) ou `application_fee` (API de pagamentos). Na custódia a
Áurea é a única recebedora, por isso F-5.
Fonte: [Split de pagamentos — integração](https://www.mercadopago.com.br/developers/pt/docs/split-payments/split-1-1/integration-configuration/integrate-marketplace).

---

# 2. Como as nove sub-branches correm

## 2.1 O desenho

```
main @ bb975db
 │
 ├── feat/a-mercado-e-termos ──── A1 ──► A2 ──► A3          (Agente A)
 │                                 │
 │                                 └─► main PRIMEIRO  (B1.4 e C3 dependem dela)
 │
 ├── feat/b-cobranca-e-custodia ── B1 ──► B2 ──► B3          (Agente B)
 │
 └── feat/c-painel-admin ───────── C1 ──► C2 ──► C3          (Agente C)
```

**Entre frentes, paralelo. Dentro da frente, em sequência.** Os três agentes abrem no mesmo
dia. Cada um faz as suas três sub-branches uma depois da outra, porque as três de uma frente
mexem nos mesmos arquivos.

## 2.2 Nomes das branches

| Frente | Branch da frente | Sub-branches, nesta ordem |
|---|---|---|
| A | `feat/a-mercado-e-termos` | `feat/a1-comissao-dois-lados` · `feat/a2-livro-de-ordens` · `feat/a3-termos-oficiais` |
| B | `feat/b-cobranca-e-custodia` | `feat/b1-cobranca-reutilizavel` · `feat/b2-plano-de-custodia` · `feat/b3-retirada-e-financeiro` |
| C | `feat/c-painel-admin` | `feat/c1-fundacao-e-resultados` · `feat/c2-usuarios-e-cs` · `feat/c3-bancada-e-configuracao` |

Nomes planos, sem barra depois do prefixo: o Git não aceita `feat/a` como branch e
`feat/a/a1` ao mesmo tempo.

## 2.3 Um worktree por frente, e o ciclo de cada sub-branch

Como nas rodadas anteriores, **cada frente trabalha numa pasta própria**, para os três agentes
não trocarem de branch debaixo um do outro:

| Frente | Pasta do worktree |
|---|---|
| A | `C:\dev\AureaCustodiaMVP-mercado` |
| B | `C:\dev\AureaCustodiaMVP-cobranca` |
| C | `C:\dev\AureaCustodiaMVP-admin` |

Abertura da frente A (B e C trocam pasta e nomes):

```bash
git -C C:/dev/AureaCustodiaMVP fetch origin
git -C C:/dev/AureaCustodiaMVP worktree add C:/dev/AureaCustodiaMVP-mercado -b feat/a-mercado-e-termos origin/main
cd C:/dev/AureaCustodiaMVP-mercado
npm install
git checkout -b feat/a1-comissao-dois-lados
```

O `.env.local` não viaja para o worktree, porque o Git o ignora: `scripts/env-local.mjs` já o
encontra para `npm run db:migrate` e `db:check`, e para `npm run dev` no worktree copia-se o
arquivo da pasta principal (ele continua ignorado pelo Git). A minuta e os comentários do
advogado estão em `docs/finalizacoes/` e viajam junto com o resto.

Trabalho, testes e commits. Ao terminar:

```bash
npm run typecheck
npm test
npm run build
git checkout feat/a-mercado-e-termos
git merge --no-ff feat/a1-comissao-dois-lados
git push origin feat/a-mercado-e-termos feat/a1-comissao-dois-lados
```

E uma linha no relatório da frente: **"A1 pronta para main"**, com o hash do merge.

**Quem leva para a `main` é o Gabriel (ou o agente de auditoria), sub-branch por sub-branch,
na ordem em que ficam prontas.** Antes de abrir a sub-branch seguinte, o agente traz a `main`
atual para a branch da frente (`git merge origin/main`) — é assim que A2 enxerga o que B1
publicou, e C3 enxerga o que A1 e B2 publicaram.

## 2.4 As quatro dependências entre frentes

| Quem espera | O quê | Por quê | O que fazer enquanto espera |
|---|---|---|---|
| **B1.4** | **A1 na main** | A compra direta pelo gateway passa a cobrar a comissão do comprador, com a função de A1 | B1.5 (tela de pagamento) antes de B1.4 |
| **B2** | **A1 na main** | B2 mexe em `src/server/db/derivar.ts` e `src/domain/ledger.ts`, que A1 também muda | B1 inteira |
| **C2** (aba Cadastro da ficha) | **A3 na main** | Lê os aceites formais de `aurea.aceites_documentos` | Ler `settings.legalAcceptance`, e trocar num commit pequeno quando A3 entrar |
| **C3** | **A1, A3 e B2 na main** | Taxas editáveis usam a tabela de A1; nova versão da Tabela de Taxas usa a publicação de documentos de A3; a bancada web chama o serviço de análise que B2 conectou à cobrança | C3 é a última sub-branch da C — a espera acontece sozinha |

---

# 3. Territórios

**Arquivo fora do seu território você não edita.** Você escreve um item em
`docs/finalizacoes/PENDENCIAS_AGENTE_<X>.md` pedindo que o dono edite.

## 3.1 Quem pode editar o quê

| Área | A | B | C |
|---|---|---|---|
| `src/domain/market.ts`, `fees.ts`, `statement.ts`, `constants.ts` (taxas) | **dono** | consome | consome (C3, depois de A1) |
| `src/domain/ledger.ts` | edita `lancamentosDeTrade` | acrescenta funções **no fim** | — |
| `src/domain/legal.ts`, `aceite.ts`, `documentos-legais/` | **dono** | — | — |
| `src/domain/custody.ts`, `plano-custodia.ts`, `competencia.ts`, `retirada.ts`, `dre.ts` | — | **dono** | lê |
| `src/domain/kpis.ts`, `src/domain/admin/` | — | — | **dono** |
| `src/domain/constants.ts` (`COIN_TYPES`, `isNegociavel`) | — | — | **dono** (C3) |
| `src/domain/types.ts` | edita `SellOffer`, `BuyOrder`, `Trade`; bloco próprio no fim | só bloco próprio no fim | só bloco próprio no fim |
| `src/server/actions/market.ts`, `sell.ts`, `auth.ts`, `legal.ts` | **dono** | — | — |
| `src/server/actions/payments.ts`, `src/server/payments/` | — | **dono** | — |
| `src/server/actions/custody.ts`, `plano-custodia.ts` (novo) | — | **dono** | — |
| `src/server/actions/admin/`, `src/server/admin/`, `src/server/config/` | — | — | **dono** |
| `src/server/custodia/`, `src/server/estacao/analise.ts` | — | **dono** | C3 **chama**, não edita |
| `src/server/auth/legal.ts`, `src/server/auth/config.ts` | **dono** | — | — |
| `src/server/db/diff.ts`, `estado.ts`, `derivar.ts` | A1 e A2 primeiro | depois de trazer a main | só tabelas próprias, fora do AppState |
| `src/server/relatorios/dados.ts` | A1 (relatório de negociações) | B3 (relatórios novos) | lê |
| `src/lib/payments/` | — | **dono** | — |
| `src/lib/mensageria/` (novo) | — | — | **dono** |
| `src/app/(app)/mercado`, `vender`, `src/components/market/` | **dono** | — | — |
| `src/app/(app)/envios`, `src/components/custody/` | — | **dono** | — |
| `src/app/(app)/conta/configuracoes` | **dono** (A3) | — | — |
| `src/app/(app)/conta/faturas` (novo), link em `conta/page.tsx` | — | **dono** | — |
| `src/components/recibo/ModalSolicitarRetirada.tsx` | — | **dono** | — |
| `src/components/account/AccountModals.tsx`, `src/components/pagamento/` (novo) | — | **dono** | — |
| `src/components/providers/AppProvider.tsx`, `src/components/shell/Topbar.tsx` | **dono** | — | — |
| `src/components/shell/Sidebar.tsx` | — | — | **dono** (item do Admin) |
| `src/app/termos`, `privacidade`, `taxas` (novo), `suporte` (novo), `cadastrar`, `entrar` | **dono** | — | — |
| `src/components/login/`, `src/components/legal/` | **dono** | — | — |
| `src/app/(admin)/`, `src/components/admin/` | — | — | **dono** |
| `src/app/api/webhooks/mercadopago`, `api/cron/faturamento` | — | **dono** | — |
| `src/app/api/webhooks/whatsapp`, `api/eventos` (novos) | — | — | **dono** |
| `src/styles/market.css`, `legal.css`, `login.css` | **dono** | — | — |
| `src/styles/account.css`, `wizard.css`, `recibo.css`, `pagamento.css` (novo) | — | **dono** | — |
| `src/styles/admin.css` (novo) | — | — | **dono** |
| `vercel.json` | — | **dono** (cron) | — |
| `package.json` | — | — | **dono** (se precisar de dependência) |

## 3.2 Os arquivos de encontro, e a regra de cada um

| Arquivo | Regra |
|---|---|
| `src/domain/types.ts` | A edita as três interfaces de mercado no lugar. Todo o resto só **acrescenta no fim**, num bloco `/* === Finalizações · Frente X === */` |
| `src/app/globals.css` | B acrescenta `@import '../styles/pagamento.css';` **logo depois** de `account.css`. C acrescenta `@import '../styles/admin.css';` **logo antes** de `responsive.css`. `responsive.css` continua sendo o último |
| `CLAUDE.md` | **A1 faz a atualização grande** (seção 4.1, passo A1.7). Depois dela, B e C acrescentam **um parágrafo cada**, em seções diferentes |
| `RISCOS_ASSUMIDOS.md` | Só acrescentar. Faixas: **A = RA-24 a RA-29 · B = RA-30 a RA-39 · C = RA-40 a RA-49** (o último em uso é o RA-23) |

## 3.3 Numeração de migrations

| Sub-branch | Migration |
|---|---|
| A1 | `014_comissao_dois_lados.sql` |
| A2 | `015_prioridade_e_historico_ofertas.sql` |
| A3 | `016_documentos_e_aceites.sql` |
| B1 | `017_cobrancas_gateway.sql` |
| B2 | `018_planos_custodia.sql` |
| B3 | `019_retirada_paga.sql` |
| C1 | `020_admin_rbac.sql` · `021_eventos_uso.sql` |
| C2 | `022_cs_mensageria.sql` · `023_notas_e_atribuicoes.sql` |
| C3 | `024_config_plataforma.sql` · `025_caixas_fisicas.sql` |

**Esta tabela substitui a seção 6 de `docs/PLANO_EXECUCAO_ADMIN.md`**, que reservava 014 a 019
para o Admin antes de as outras frentes existirem.

O aplicador (`src/server/db/migrar.ts` e `scripts/db-migrate.mjs`) registra cada migration
**pelo nome**, então merge fora da ordem numérica não quebra — desde que nenhuma migration
dependa de tabela criada por migration de **outra** frente. Nenhuma das listadas depende.

Padrão da casa em toda migration nova: schema `aurea`, RLS ligado em toda tabela nova,
dinheiro em `bigint` de centavos, horário em `bigint` de milissegundos UTC, constraint
recriada com `DROP CONSTRAINT IF EXISTS` antes do `ADD CONSTRAINT`, comentário de bloco no
topo dizendo o porquê.

## 3.4 `STORE_KEY`

Nenhuma sub-branch deste plano sobe a `STORE_KEY`. Todas as mudanças no `AppState` são
**aditivas** — campo opcional ou lista nova —, que é o caso em que a migration 004 já decidiu
não recomeçar o banco de teste. Se um agente concluir que precisa subir, ele escreve o motivo
no relatório antes do commit.

---

# 4. Frente A — Mercado e termos · `feat/a-mercado-e-termos`

## A1 · Comissão dos dois lados — `feat/a1-comissao-dois-lados`

> **Para o Rogério.** Hoje só quem vende paga a taxa. Passa a pagar quem compra também. Numa
> negociação de R$ 200,00, o comprador desembolsa R$ 202,00, o vendedor recebe R$ 198,00 e a
> Áurea fica com R$ 4,00. Negociação antiga continua com a taxa que tinha.

### Onde está hoje

| Ponto | Arquivo | O que faz |
|---|---|---|
| Motor | `src/domain/market.ts` (`matchOrders`, linha 216) | `buyer.balance -= price`; `seller.balance += price - fee`; confere `buyer.balance >= so.price` |
| Compra de lote | `src/server/actions/market.ts` (`buyLot`, linha 205) | Mesma aritmética; confere `buyer.balance < price * qty` |
| Publicar e editar compra | `market.ts` (`publishBid`, `editBid`) | Reserva `Math.floor(u.balance / cents)` unidades — sem comissão |
| Vender para oferta | `src/server/actions/sell.ts` (`sellToBid`, linha 342) | Mesma aritmética; `affordable = Math.floor(buyer.balance / bo.price)` |
| Compra direta pelo gateway | `src/server/actions/payments.ts` (`iniciarCompraDireta`) e `src/server/payments/conciliacao.ts:133` | **Território da frente B** — muda em B1.4 |
| Livro-razão | `src/domain/ledger.ts` (`lancamentosDeTrade`, linha 110) | Três lançamentos: compra, venda, comissão só do vendedor |
| Derivação e diff | `src/server/db/derivar.ts:71` · `src/server/db/diff.ts:186` | `t.fee ?? tradeFee(t.price) * qty` |
| Extrato | `src/domain/statement.ts:126` | **Recalcula** a comissão em vez de ler a congelada (RA-06, CD-09) |
| Prévias | `src/app/(app)/vender/page.tsx:171` · `mercado/page.tsx` (`bidTotal` e `ConfirmarCompraModal`) | Mostram só o lado do vendedor |
| Banco | `aurea.trades.fee` (migration 001, linha 135) | Uma coluna, comissão total |

### Passos

**A1.1 — A tabela de taxas vira um objeto único.** Em `src/domain/fees.ts`:

```ts
/** Pontos-base: 50 bp = 0,5%. Inteiro, como em aurea.parametros_contabeis. */
export interface TabelaDeTaxas {
  comissaoCompradorBp: number
  comissaoCompradorFixa: Cents
  comissaoVendedorBp: number
  comissaoVendedorFixa: Cents
  custodiaMensalPorMoeda: Cents
  custodiaAnualPorMoeda: Cents
  custodiaAnualParcelasMax: number
  taxaSaqueFixa: Cents
  taxaRetiradaComum: Cents
  taxaRetiradaSegura: Cents
  retiradaSeguraParcelasMax: number
}

export const TAXAS_PADRAO: TabelaDeTaxas = {
  comissaoCompradorBp: 50,
  comissaoCompradorFixa: 100,
  comissaoVendedorBp: 50,
  comissaoVendedorFixa: 100,
  custodiaMensalPorMoeda: 200,
  custodiaAnualPorMoeda: 2400,
  custodiaAnualParcelasMax: 12,
  taxaSaqueFixa: 500,
  taxaRetiradaComum: 5000,
  taxaRetiradaSegura: 18000,
  retiradaSeguraParcelasMax: 2,
}

export interface ComissaoPorMoeda { comprador: Cents; vendedor: Cents }

export function comissaoPorMoeda(price: Cents, t: TabelaDeTaxas = TAXAS_PADRAO): ComissaoPorMoeda
export function custoDeCompraPorMoeda(price: Cents, t?: TabelaDeTaxas): Cents   // price + comprador
export function liquidoDeVendaPorMoeda(price: Cents, t?: TabelaDeTaxas): Cents  // price − vendedor
```

- Cada lado: `Math.round(price * bp / 10000) + fixa`.
- `tradeFee(price)` continua existindo e passa a devolver `comissaoPorMoeda(price).vendedor`
  — B, C e os testes antigos continuam compilando.
- `FEE_PCT` e `FEE_FIXED` em `constants.ts` ficam como apelidos derivados de `TAXAS_PADRAO`,
  com comentário dizendo que a fonte é `fees.ts`.
- `custodiaMensalPorMoeda()`, `custodiaAnualPorMoeda()` e `TAXA_SAQUE_FIXA_CENTS` passam a ler
  de `TAXAS_PADRAO`.
- **`src/domain/retirada.ts` é da frente B e não é editado aqui.** `TAXAS_PADRAO` repete os dois
  valores de retirada como literais, e um teste confere que são iguais aos de `retirada.ts`.
  Importar de lá criaria import circular quando B3 fizer `retirada.ts` ler de `fees.ts`.

*Pronto quando:* teste de equivalência — para todo preço de 1 a 1.000.000 centavos,
`comissaoPorMoeda(p).vendedor === Math.round(p * 0.005) + 100`.

**A1.2 — `Trade` guarda os dois lados.** Em `src/domain/types.ts`:

```ts
export interface Trade {
  // … campos atuais …
  /** Comissão TOTAL da negociação (comprador + vendedor), congelada. */
  fee?: Cents
  feeComprador?: Cents
  feeVendedor?: Cents
}
```

`fee` continua sendo o total. Negociação gravada antes de A1 carrega `feeComprador = 0` e
`feeVendedor = fee`.

**A1.3 — O motor cobra dos dois.** Em `matchOrders(state, taxas = TAXAS_PADRAO)`:

- conferência de saldo: `buyer.balance >= so.price + comissaoPorMoeda(so.price, taxas).comprador`;
- `buyer.balance -= price + comprador`;
- `seller.balance += price - vendedor`;
- o agrupamento em `fills` soma `feeComprador` e `feeVendedor`, e o `Trade` nasce com os três
  campos preenchidos.

A regra "bid sem saldo é PULADO, não cancelado" continua valendo, agora contando a comissão.

**A1.4 — As três ações de mercado.**

| Ação | Mudança |
|---|---|
| `buyLot` | Confere `buyer.balance < custoDeCompraPorMoeda(price) * qty`. Debita `price + comprador` por moeda. Grava `Trade` com os dois lados. Mensagem de saldo: `Saldo insuficiente para esta quantidade (o total inclui a comissão de compra).` |
| `publishBid` e `editBid` | `maxAfford = Math.floor(u.balance / custoDeCompraPorMoeda(cents))` — reserva pelo preço-limite, que é o maior preço possível de execução |
| `sellToBid` | `affordable = Math.floor(buyer.balance / custoDeCompraPorMoeda(bo.price))`. Debita comprador com comissão, credita vendedor líquido |

**A1.5 — Livro-razão, diff e extrato.**

- `lancamentosDeTrade(t, { comprador, vendedor }, ref, nomes)` passa a devolver **quatro**
  lançamentos: compra (comprador −bruto), **comissão de compra (comprador −feeComprador)**,
  venda (vendedor +bruto), comissão de venda (vendedor −feeVendedor). Descrições sem número:
  `Comissão de compra` e `Comissão de venda` — o valor está na linha, e o percentual pode mudar
  pelo Admin (C3).
- `src/server/db/derivar.ts:71` passa os dois lados.
- `src/server/db/diff.ts` (`normalizarTrade`): `feeVendedor = t.feeVendedor ?? t.fee ?? tradeFee(t.price) * qty`,
  `feeComprador = t.feeComprador ?? 0`, `fee = feeComprador + feeVendedor`.
- `src/server/db/repositories/trades.ts`: lê e grava `fee_comprador` e `fee_vendedor`.
- `src/domain/statement.ts`: o extrato **para de recalcular** e lê `feeComprador` e
  `feeVendedor` do `Trade`. A conta compradora ganha a linha "Comissão de compra". Isso fecha o
  **CD-09** e o **RA-06**.
- `src/server/relatorios/dados.ts` (`relatorioNegociacoes`): colunas `comissao_comprador`,
  `comissao_vendedor` e `comissao_total`.
- A DRE não muda: ela soma os lançamentos `comissao`, e agora eles vêm dos dois lados.

**A1.6 — As prévias na tela.**

- `/vender`: "Comissão de venda" e "Você recebe", por moeda e no total.
- `/mercado`, painel "Fazer oferta de compra": "Comissão de compra (estimada no seu preço
  máximo)" e "Total com comissão".
- `ConfirmarCompraModal`: preço × quantidade, comissão de compra, **total a pagar**.

Todo número de taxa exibido sai de `TAXAS_PADRAO`. Nenhum `100` ou `0.005` escrito em tela.

**A1.7 — A documentação para de travar o que foi decidido.** Instrução do Gabriel de
12/09/2026: instrução do repositório que impeça o que ele pediu sai do repositório. A1 é a
primeira sub-branch a chegar na `main`, então é ela que alinha tudo de uma vez:

| Arquivo | O que muda |
|---|---|
| `CLAUDE.md` | A seção "Regras de negócio que não podem mudar sem decisão dos sócios" vira **"Regras de negócio vigentes"**: comissão dos dois lados com o exemplo de R$ 200,00; custódia R$ 2,00/moeda/mês ou R$ 24,00/moeda/ano em até 12x (a linha de faixas R$ 5/15/25/30/60 está desatualizada desde a D-3); saque R$ 5,00; retirada R$ 50,00 ou R$ 180,00 em até 2x; fila por preço e `prioridadeEm`. Sai **"confirmar com o Gabriel antes"**: os valores vivem em `TAXAS_PADRAO` e, depois da C3, no Admin, e mudar um valor exige **teste atualizado no mesmo commit, não autorização**. A linha "Depósito em conta é simulado" é trocada: depósito por Pix e cartão via Mercado Pago, saldo só muda quando o webhook confirma. O item 3 de "Como trabalhar comigo" deixa de chamar esses arquivos de superfície que exige parada |
| `AGENTS.md` | Trava nº 3 reescrita no mesmo sentido |
| `docs/publish_docs/PROTOCOLO_DO_AGENTE.md` | Regra 5 vira **"Arquivos centrais — teste junto"**. Na lista "Nunca", sai a frase das "três travas legítimas" com o aceite dos termos; entra: aceite de termos não trava operação (13/09). Dados bancários para sacar e endereço para retirar continuam sendo pedidos porque sem eles a operação não acontece |
| `docs/ARQUITETURA_E_PASTAS.md` (linhas 61–79) | A seção "A superfície protegida" vira "Arquivos centrais", no mesmo sentido |
| `docs/diario/RITUAL_DE_SESSAO.md` (65, 367) e `RITUAL_DE_SESSAO_RESUMO.md` (81) | Idem |
| `.claude/commands/commit.md` (52) | O passo deixa de pedir decisão dos sócios; pede teste da regra alterada |
| `docs/diario/CRITICAL_DEBUGS.md` | CD-09 marcado como resolvido em A1 |
| `RISCOS_ASSUMIDOS.md` | RA-06 encerrado; RA-24 aberto para a janela em que a compra direta pelo gateway ainda cobra só o vendedor (fecha quando B1.4 entrar) |

### Migration 014 — `014_comissao_dois_lados.sql`

```sql
ALTER TABLE aurea.trades ADD COLUMN IF NOT EXISTS fee_comprador bigint NOT NULL DEFAULT 0;
ALTER TABLE aurea.trades ADD COLUMN IF NOT EXISTS fee_vendedor  bigint;
UPDATE aurea.trades SET fee_vendedor = fee WHERE fee_vendedor IS NULL;
ALTER TABLE aurea.trades ALTER COLUMN fee_vendedor SET NOT NULL;

ALTER TABLE aurea.trades DROP CONSTRAINT IF EXISTS trades_fee_lados_check;
ALTER TABLE aurea.trades ADD CONSTRAINT trades_fee_lados_check
  CHECK (fee_comprador >= 0 AND fee_vendedor >= 0 AND fee = fee_comprador + fee_vendedor);
```

### Testes que precisam existir

- `fees.test.ts` — `comissaoPorMoeda(20000)` devolve `{ comprador: 200, vendedor: 200 }`;
  equivalência de 1 a 1.000.000 centavos; valores de retirada em `TAXAS_PADRAO` iguais aos de
  `retirada.ts`.
- `market.test.ts` — o teste *"cheio do comprador, líquido do vendedor"* é substituído por
  *"comprador paga preço + comissão, vendedor recebe preço − comissão"*: venda R$ 200,00,
  compra R$ 200,00, comprador com R$ 202,00 → comprador fica com 0, vendedor ganha R$ 198,00,
  `Trade` com `feeComprador 200`, `feeVendedor 200`, `fee 400`.
- `market.test.ts` — *"comprador com saldo para o preço mas não para a comissão é pulado"*
  (saldo R$ 200,00, preço R$ 200,00).
- `ledger.test.ts` — quatro lançamentos por negociação; a soma por conta bate com a variação
  de saldo.
- `derivar.test.ts` — negociação pelo motor, por `buyLot` e por `sellToBid` **não gera
  `ajuste`**.
- `statement.test.ts` — extrato do comprador mostra a comissão de compra lida do `Trade`, e
  negociação antiga (sem `feeComprador`) mostra zero.
- `db.test.ts` (PGlite) — migration 014 aplica sobre banco com negociação antiga e mantém
  `fee = fee_vendedor`.

### Como se sabe que funcionou

Em produção, com duas contas de sócio (lista em `docs/referencia/CONTAS_DE_TESTE.md`):

1. `rogeriopena@testeaurea.com.br` anuncia **1** Entrega da Bandeira Olímpica a **R$ 200,00**.
2. `gabrielsilva@testeaurea.com.br` publica oferta de compra de **1** a **R$ 200,00**.
3. Gabriel: saldo cai **R$ 202,00**. Rogério: saldo sobe **R$ 198,00**.
4. Extrato de cada um mostra a linha de comissão do próprio lado.
5. `/relatorios` → DRE do mês: receita de comissões sobe **R$ 4,00**.

### Não faz parte de A1

Compra direta pelo gateway (B1.4). Taxas editáveis no Admin (C3). Fila e edição (A2).

---

## A2 · Livro de ordens: fila por ordem de cadastro, casamento automático e edição — `feat/a2-livro-de-ordens`

> **Para o Rogério.** Quando uma oferta de compra e uma de venda batem no preço, a negociação
> acontece sozinha, e quem cadastrou primeiro é atendido primeiro. Cada pessoa pode editar a
> própria oferta, de compra ou de venda, enquanto ela não foi executada — mas quem muda o preço
> ou aumenta a quantidade volta para o fim da fila, para ninguém guardar lugar e trocar o preço
> depois. E quem teve a oferta executada fica sabendo na hora.

### Onde está hoje

- **Casamento automático existe:** `matchOrders` roda no fim de `publishBid`, `editBid`,
  `publishOffer` e `editLot`. Prioridade: preço e depois `createdAt`
  (`src/domain/market.ts`, as duas linhas de `sort` dentro do laço).
- **A data e a hora do cadastro já são gravadas:** `aurea.sell_offers.created_at` e
  `aurea.buy_orders.created_at`, em milissegundos.
- **Edição de compra existe:** `editBid` (`market.ts`) e o modal `EditarBidModal`
  (`mercado/page.tsx`, a partir da linha 692). O acesso é um `<span>` de 11,5 px.
- **Edição de venda existe:** `editLot` (`sell.ts`), que só reduz quantidade e não edita
  observação.
- **Editar preço hoje mantém a posição na fila**, contra a decisão F-3.
- **Quem teve a oferta executada por outra pessoa não recebe aviso nenhum.** Só quem publicou
  a segunda oferta vê a mensagem. É a hipótese principal do "não aconteceu".
- `publishOffer` chama `Date.now()` uma vez **por moeda** dentro do `forEach`: moedas do mesmo
  anúncio podem nascer com milissegundos diferentes.

### Passos

**A2.1 — Reproduzir antes de mexer.** Cada hipótese é eliminada com evidência escrita no
relatório:

| Hipótese | Como conferir |
|---|---|
| Teste feito com a mesma conta nos dois lados | O motor recusa por `s.seller !== bo.buyer`. Refazer com duas contas diferentes |
| Saldo do comprador abaixo do preço (depois de A1, abaixo de preço + comissão) | Conferir o saldo antes de publicar |
| `tipo_moeda` gravado com grafia diferente entre ofertas, bids e moedas | Consultas abaixo, no editor SQL do Supabase |
| Falha de gravação engolida como "Falha ao salvar dados" | Logs da função na Vercel no horário do teste |
| Funciona, e faltou aviso para o outro lado | Refazer o roteiro de A1 com as duas contas abertas em navegadores diferentes |

```sql
SELECT tipo_moeda, count(*) FROM aurea.sell_offers GROUP BY 1 ORDER BY 1;
SELECT tipo_moeda, count(*) FROM aurea.buy_orders  GROUP BY 1 ORDER BY 1;
SELECT DISTINCT tipo_moeda FROM aurea.coins ORDER BY 1;
SELECT seller, price, created_at, tipo_moeda FROM aurea.sell_offers ORDER BY tipo_moeda, price, created_at;
SELECT buyer, price, qty, created_at, tipo_moeda FROM aurea.buy_orders ORDER BY tipo_moeda, price DESC, created_at;
```

Qualquer venda com preço ≤ a um bid do mesmo tipo, de contas diferentes, com o comprador tendo
saldo suficiente, **é defeito confirmado** — e vira teste antes de virar correção.

E um teste PGlite novo, `src/server/db/livro-de-ordens.test.ts`, com o cenário exato: A anuncia
1 moeda a R$ 200,00; B, com R$ 300,00, publica compra a R$ 200,00 → a negociação está em
`aurea.trades`, a moeda é de B, oferta e bid saíram do livro. E o mesmo na ordem inversa.

**A2.2 — Prioridade explícita.** Em `src/domain/types.ts`, `SellOffer` e `BuyOrder` ganham:

```ts
/**
 * Momento que define a vez na fila. Nasce igual a `createdAt` e é reescrito
 * quando o preço muda ou a quantidade aumenta (decisão F-3, 13/09/2026).
 * `createdAt` nunca muda: é a data do cadastro, para histórico e extrato.
 */
prioridadeEm: Timestamp
```

- `publishOffer` e `publishBid`: um único `const agora = Date.now()` para `createdAt` e
  `prioridadeEm` de todas as moedas do anúncio.
- `matchOrders` ordena por `preço → prioridadeEm → createdAt`.
- `lotsFromOffers` usa a mesma ordem.
- Leitura do banco: `prioridadeEm = prioridade_em ?? created_at`.

**A2.3 — Regras de edição no servidor.**

`editBid(bidId, qty, precoUnit)`:

- preço diferente **ou** quantidade maior → `bo.prioridadeEm = Date.now()`;
- quantidade menor com o mesmo preço → mantém;
- conferência de saldo com a comissão de compra (A1);
- `matchOrders` depois, como hoje.

`editLot(lotId, precoUnit, qty, obs)` — assinatura ganha `obs`:

- **aumentar quantidade passa a ser possível**: acrescenta moedas livres do mesmo tipo, na
  ordem do inventário (`availableCoinsForSell(s, u, tipo)`), com o mesmo `lotId`, preço e
  observação. Faltando moeda livre: `Você tem N moeda(s) livre(s) desse tipo para acrescentar.`;
- preço diferente **ou** quantidade maior → todas as ofertas do anúncio recebem
  `prioridadeEm = agora`;
- reduzir → saem as de `prioridadeEm` mais recente; as que ficam mantêm a vez;
- observação: corte em 140 caracteres, não mexe na vez;
- `matchOrders` depois.

A mensagem devolvida à tela diz quando a vez mudou: `Oferta atualizada. Como o preço mudou, ela foi
para o fim da fila desse preço.`

"Enquanto não houver aceite": oferta executada sai do livro e deixa de existir. Oferta
parcialmente executada é editável no que sobrou.

**A2.4 — Posição na fila.** Função pura em `market.ts`:

```ts
export function posicaoNaFila(state: AppState, lado: 'venda' | 'compra', id: string):
  { posicao: number; aFrente: number; mesmoPreco: number } | null
```

Conta, dentro do mesmo tipo, as ofertas com preço melhor e as de mesmo preço com
`prioridadeEm` anterior.

**A2.5 — Painel "Minhas ofertas".** Componente novo `src/components/market/MinhasOfertas.tsx`,
no topo de `/mercado` e de `/vender`:

- anúncios de venda e ofertas de compra da própria conta, juntos;
- tipo, preço, quantidade, **cadastrada em DD/MM/AAAA às HH:MM:SS**, posição na fila
  ("2ª na fila a R$ 200,00 · 1 oferta à frente");
- botões **Editar** e **Cancelar** como `<button>` de pelo menos 44 px;
- os dois modais de edição ganham o aviso: *"Mudar o preço ou aumentar a quantidade leva a
  oferta para o fim da fila."*;
- `BidRow` troca o `<span className="edit-link">` por `<button>`.

**A2.6 — Aviso para quem teve a oferta executada.** No `AppProvider`
(`src/components/providers/AppProvider.tsx`), a cada sincronização de 10 s: negociação nova
envolvendo a conta, que ela ainda não viu → aviso *"Sua oferta de venda foi executada: 1
Entrega da Bandeira Olímpica a R$ 200,00. Você recebeu R$ 198,00."* O "último visto" fica em
`localStorage` por conta, sempre dentro de `try/catch`. No painel "Minhas ofertas", a lista
"Executadas recentemente" mostra as 10 últimas, com data e hora.

**A2.7 — Histórico da fila.** Tabela append-only que responde "por que a oferta dele foi
executada antes da minha", escrita pela camada de banco na mesma transação da mutação, derivada
das operações do diff (como o ledger e a trilha já são):

- `src/server/db/derivar.ts` ganha `derivarHistoricoOfertas(ctx)`, pura;
- evento `executada` quando a oferta sai do livro e a moeda (ou o bid) aparece numa negociação
  nova da mesma mutação; `cancelada` nos outros casos de remoção;
- repositório `src/server/db/repositories/ofertas-historico.ts`, só `INSERT`.

### Migration 015 — `015_prioridade_e_historico_ofertas.sql`

```sql
ALTER TABLE aurea.sell_offers ADD COLUMN IF NOT EXISTS prioridade_em bigint;
UPDATE aurea.sell_offers SET prioridade_em = created_at WHERE prioridade_em IS NULL;
ALTER TABLE aurea.sell_offers ALTER COLUMN prioridade_em SET NOT NULL;

ALTER TABLE aurea.buy_orders ADD COLUMN IF NOT EXISTS prioridade_em bigint;
UPDATE aurea.buy_orders SET prioridade_em = created_at WHERE prioridade_em IS NULL;
ALTER TABLE aurea.buy_orders ALTER COLUMN prioridade_em SET NOT NULL;

CREATE INDEX IF NOT EXISTS sell_offers_fila_idx ON aurea.sell_offers (tipo_moeda, price, prioridade_em);
CREATE INDEX IF NOT EXISTS buy_orders_fila_idx  ON aurea.buy_orders  (tipo_moeda, price DESC, prioridade_em);

CREATE TABLE IF NOT EXISTS aurea.ofertas_historico (
  id                bigserial PRIMARY KEY,
  created_at        bigint  NOT NULL,
  lado              text    NOT NULL CHECK (lado IN ('venda', 'compra')),
  oferta_id         text    NOT NULL,
  lot_id            text,
  conta             text    NOT NULL,
  tipo_moeda        text    NOT NULL,
  evento            text    NOT NULL CHECK (evento IN ('publicada', 'editada', 'cancelada', 'executada')),
  preco_antes       bigint,
  preco_depois      bigint,
  qtd_antes         integer,
  qtd_depois        integer,
  prioridade_antes  bigint,
  prioridade_depois bigint,
  perdeu_a_vez      boolean NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS ofertas_historico_oferta_idx ON aurea.ofertas_historico (oferta_id, created_at);
CREATE INDEX IF NOT EXISTS ofertas_historico_conta_idx  ON aurea.ofertas_historico (conta, created_at);
ALTER TABLE aurea.ofertas_historico ENABLE ROW LEVEL SECURITY;
```

### Testes que precisam existir

- *"venda cadastrada antes, compra depois no mesmo preço: executa na publicação da compra"*
- *"compra cadastrada antes, venda depois no mesmo preço: executa na publicação da venda"*
- *"dois vendedores no mesmo preço: executa quem cadastrou primeiro"*
- *"vendedor que mudou o preço vai para o fim da fila, mesmo tendo cadastrado antes"*
- *"reduzir quantidade mantém a vez"* e *"aumentar quantidade vai para o fim"*
- *"editar observação mantém a vez"*
- *"`createdAt` nunca muda na edição"*
- *"moedas do mesmo anúncio nascem com a mesma `prioridadeEm`"*
- *"`editLot` acrescenta moedas livres do tipo e recusa quando não há"*
- `posicaoNaFila` — primeiro, empate de preço, preço melhor à frente, outro tipo não conta
- PGlite — `prioridade_em` persiste; histórico grava publicada, editada (com `perdeu_a_vez`),
  cancelada e executada

### Como se sabe que funcionou

1. Rogério anuncia 1 Bandeira a R$ 200,00 às 10:00:00. Alex anuncia 1 Bandeira a R$ 200,00
   às 10:00:30.
2. Gabriel publica compra de 1 a R$ 200,00 → executa com **Rogério**. Rogério vê o aviso em
   até 10 s.
3. Alex edita o anúncio para R$ 199,00 → "Minhas ofertas" mostra que ele foi para o fim da fila
   desse preço — e, como é o menor preço, fica em 1º.
4. Gabriel edita a própria compra de 1 para 2 unidades no mesmo preço → a vez dele é reiniciada
   e a execução com Alex acontece na hora.
5. Botões de Editar e Cancelar clicáveis com o dedo no celular.

### Não faz parte de A2

Vitrine consumindo a fila (F-4 manteve o item clicado). Taxa (A1).

---

## A3 · Termos de Uso oficiais, Tabela de Taxas, SAC e aceite formal — `feat/a3-termos-oficiais`

> **Para o Rogério.** O texto do advogado entra no site no lugar do rascunho, com link para uma
> página de Tabela de Taxas e para o atendimento. Cada aceite fica gravado como prova — quem,
> qual versão exata do texto, quando, de onde —, e a cláusula de arbitragem ganha assinatura
> própria, como o advogado pediu. Nada disso impede alguém de criar conta ou de operar.

### Onde está hoje

- `/termos` (`src/app/termos/page.tsx`) é o rascunho escrito por agente em 10/09. O aviso do
  topo diz que a redação do jurídico "será incorporada em 12/09/2026"
  (`src/components/legal/LegalDocument.tsx`).
- O aceite é um JSON sobrescrito em `user.settings.legalAcceptance`
  (`src/server/auth/legal.ts:172`) mais os campos de metadata do Supabase no cadastro
  (`src/server/actions/auth.ts`, a partir da linha 127). Sem histórico, sem hash do texto
  aceito, sem IP, sem registro do que estava escrito.
- **Defeito:** a caixa "Li e aceito" nasce marcada (`RegisterForm.tsx:35`) e o aceite é gravado
  mesmo com ela desmarcada.
- Os 6 blocos de aceite (`src/domain/legal.ts:30`) apontam para cláusulas do rascunho, que
  deixam de existir.
- `exigirAceiteLegal` e `useVerificarAceiteLegal` não têm chamador. Nenhuma operação é
  bloqueada por aceite — e continua assim.

### O que a minuta exige do sistema

Fonte: `docs/finalizacoes/2026-09-13_minuta_termos_de_uso_v1.docx` e o arquivo de comentários ao
lado. Estes são os pontos que viram código:

| Exigência | Onde entra |
|---|---|
| Uma página **Tabela de Taxas**, incorporada ao contrato por referência, com link em todas as menções | `/taxas` (A3.4) |
| Um canal de **SAC**, com link nas menções | `/suporte` (A3.5) |
| **Cláusula de arbitragem com texto em negrito e assinatura específica** — contrato de adesão, Lei 9.307/1996, art. 4º, §2º | A3.6 |
| Registro de aceite com prova | A3.6 e A3.7 |
| Data de entrada em vigor e três prazos em branco | A3.2 |

### Decisões aplicadas

- **Aceite geral por clique** ("sign-in-wrap"): a frase de aceite fica colada ao botão —
  *"Ao criar a conta, você aceita os Termos de Uso (versão 1.0, em vigor desde DD/MM/AAAA), a
  Tabela de Taxas e a Política de Privacidade."* Clicar é aceitar, e o clique é gravado com a
  frase exata. Sem caixa obrigatória.
- **Cláusula de arbitragem**: bloco próprio, texto integral em negrito, caixa **desmarcada** +
  nome completo digitado como visto. **Opcional**: sem ela a conta funciona igual, e o
  registro guarda que a cláusula não foi assinada.
- **Certificado digital** (gov.br ou ICP-Brasil), que o advogado sugere: fica fora desta
  branch, porque exige contratar provedor de assinatura eletrônica. O registro já nasce com o
  método `certificado_digital` previsto.

### Passos

**A3.1 — A fonte.** Ler `docs/finalizacoes/2026-09-13_minuta_termos_de_uso_v1.docx`. O `.md` ao lado
serve para leitura, mas **a numeração automática do Word se perde na conversão** — a
numeração publicada é conferida contra o `.docx`. Referências internas que conferem:
6.4, 7.5, 9.4. As que não conferem (13.1 e 13.2 no capítulo de conflitos) são publicadas como
estão e já estão na lista de pontos para o advogado.

**A3.2 — O texto como dado, com versão e hash.** Pasta nova `src/domain/documentos-legais/`,
com `README.md`:

```
documentos-legais/
├── README.md
├── termos-de-uso-v1.ts      a minuta como estrutura: capítulo, número, título, parágrafos, alíneas, negrito
├── parametros.ts            vigência, prazos em branco e canais de SAC — um lugar só
├── canonico.ts              textoCanonico(documento) e hashDoDocumento(documento)
├── canonico.test.ts         vetor congelado
└── index.ts                 DOCUMENTOS_VIGENTES: { termos_de_uso, politica_privacidade, tabela_de_taxas, clausula_arbitragem }
```

- **Texto canônico**: número, título e parágrafos na ordem, separados por `\n`, sem espaço no
  fim de linha, Unicode NFC. Hash = SHA-256 (`sha256Hex` de `src/domain/hash.ts`).
- **O texto do advogado não é reescrito.** Nem terminologia, nem concordância, nem referência
  cruzada.
- **Os valores em branco** vêm de `parametros.ts`. Até o Gabriel responder, valem as sugestões
  de `docs/finalizacoes/2026-09-13_minuta_pontos_para_os_socios.md`, seção A (vigência = data de
  publicação de A3; recibo = 2 dias úteis; venda = 1 hora; depósito = 2 dias úteis). Usar a
  sugestão abre o **RA-25**.
- Versão: `1.0`. Mudança de qualquer parâmetro gera versão nova (`1.1`, …) e hash novo.

**A3.3 — As páginas.**

- `/termos`: renderiza `termos-de-uso-v1.ts` pelo `LegalDocument`. Topo com versão, data de
  vigência e hash curto. Capítulo 14.4 inteiro em negrito. Toda menção a "Tabela de Taxas" é
  link para `/taxas`; toda menção a "SAC" é link para `/suporte`. Botão "Salvar em PDF"
  (`window.print()` com folha de impressão em `legal.css`). O aviso "redação final em
  12/09/2026" sai.
- **Resumo dos pontos principais** no topo de `/termos`, com os 6 blocos remapeados para a
  minuta: moeda equiparável → 7.2.6 e 7.5.3; prazos → 7.5.6 e 7.7.2; custos → 7.5.5 e Tabela de
  Taxas; bloqueio por débito → 5.1 e 11.1 (**sem** a frase sobre garantia, que não tem
  cláusula na minuta); posicionamento → preâmbulo; dados pessoais → 13. `clausulaReferencia`
  atualizado em `src/domain/legal.ts`.
- `/privacidade`: texto atual mantido; o aviso do topo sai, e a página ganha versão e hash como
  os demais documentos.

**A3.4 — `/taxas`, a Tabela de Taxas.** `src/app/taxas/page.tsx`, pública, sem login, lida por
`carregarTabelaDeTaxas()` em `src/server/taxas/carregar.ts` — que hoje devolve `TAXAS_PADRAO` e,
na C3, passa a ler do banco.

| Serviço | Taxa |
|---|---|
| Envio de moeda para custódia — plano mensal | R$ 2,00 por moeda por mês |
| Envio de moeda para custódia — plano anual | R$ 24,00 por moeda por ano, em até 12x no cartão |
| Compra de moeda | 0,5% do preço + R$ 1,00 por moeda |
| Venda de moeda | 0,5% do preço + R$ 1,00 por moeda |
| Retirada — comum | R$ 50,00 |
| Retirada — segura | R$ 180,00, em até 2x no cartão |
| Depósito | sem taxa |
| Saque | R$ 5,00 |

Com o exemplo *"negociação de R$ 200,00: o comprador paga R$ 202,00 e o vendedor recebe
R$ 198,00"*, calculado pela função, não escrito à mão. Topo: "em vigor desde DD/MM/AAAA" e o
hash da tabela. O frete do envio é escolhido e pago pelo cliente nos Correios, e a página diz
isso.

**A3.5 — `/suporte`.** Página pública com os canais de `parametros.ts` (`SAC`). **O agente não
inventa número nem endereço.** Enquanto o Gabriel não informar, a página mostra só o que
existir, e o RA-26 registra a falta. Quando a C2 ligar o WhatsApp do CS, o número entra aqui.

**A3.6 — O registro formal do aceite.** Migration 016 (abaixo). Função pura em
`src/domain/aceite.ts`:

```ts
/** A ordem é congelada: mudar a lista invalida a prova de todo aceite já gravado. */
export const CAMPOS_DO_ACEITE = [
  'createdAt', 'userEmail', 'documentoChave', 'documentoVersao', 'hashConteudo',
  'canal', 'metodo', 'textoExibido', 'nomeDigitado', 'ip', 'userAgent',
] as const
```

Hash encadeado com `hashEncadeado` de `src/domain/hash.ts`, vetor congelado em
`aceite.test.ts`, verificação de cadeia como a do ledger. Repositório
`src/server/db/repositories/aceites.ts`, **só `INSERT` e `SELECT`**.

Onde cada aceite nasce — sempre no servidor, com IP do primeiro valor de `x-forwarded-for`
(ou `x-real-ip`) e o `user-agent` da requisição:

| Momento | Canal | Documentos gravados |
|---|---|---|
| "Criar conta por e-mail" (`registerWithEmail`) | `cadastro_email` | termos, tabela de taxas, privacidade — e arbitragem, se assinada |
| "Criar conta com Google" | `cadastro_google` | Os mesmos, no callback (`src/app/entrar/callback/route.ts`), a partir do cookie assinado que já existe |
| Entrar sem aceite da versão vigente | `entrada` | Frase de aceite junto ao botão de `/entrar` |
| Faixa de termos atualizados | `banner_atualizacao` | Botão "Aceitar" |
| Minha conta › Configurações | `conta_documentos` | Assinar a arbitragem depois |

**Sem chave estrangeira para `aurea.users`, de propósito:** o clique no cadastro acontece antes
de a conta existir na tabela. `settings.legalAcceptance` continua sendo preenchido, para o
store em memória e para as telas que já o leem.

**A3.7 — As telas do aceite.**

- `/cadastrar` (`RegisterForm.tsx`): **sai a caixa pré-marcada**. A frase de aceite fica colada
  aos dois botões. Abaixo, recolhível, "Cláusula de Arbitragem — assinatura específica": texto
  integral em negrito, caixa desmarcada *"Assino especificamente a Cláusula de Arbitragem
  (cláusula 14.4)"* e campo "Nome completo, como assinatura".
- **Faixa não bloqueante** no topo do app (`Topbar.tsx`) para quem não tem aceite da versão
  vigente: *"Os Termos de Uso foram atualizados (versão 1.0). Ler · Aceitar"*. Some ao aceitar;
  dispensável na sessão; não é modal e não impede nada.
- **Minha conta › Configurações** (`src/app/(app)/conta/configuracoes`): seção "Documentos e
  aceites" — documento, versão, data e hora, canal, hash curto — com "Ver comprovante": página
  imprimível `/conta/aceites/[id]` com todos os campos de prova e o hash do documento. E
  "Assinar a Cláusula de Arbitragem", para quem não assinou.

### Migration 016 — `016_documentos_e_aceites.sql`

```sql
CREATE TABLE IF NOT EXISTS aurea.documentos_legais (
  id            bigserial PRIMARY KEY,
  chave         text   NOT NULL CHECK (chave IN ('termos_de_uso', 'politica_privacidade', 'tabela_de_taxas', 'clausula_arbitragem')),
  versao        text   NOT NULL,
  vigente_desde bigint NOT NULL,
  hash_conteudo text   NOT NULL,
  conteudo      text   NOT NULL,
  publicado_por text   NOT NULL,
  created_at    bigint NOT NULL,
  UNIQUE (chave, versao)
);

CREATE TABLE IF NOT EXISTS aurea.aceites_documentos (
  id               bigserial PRIMARY KEY,
  created_at       bigint NOT NULL,
  user_email       text   NOT NULL,
  documento_chave  text   NOT NULL,
  documento_versao text   NOT NULL,
  hash_conteudo    text   NOT NULL,
  canal            text   NOT NULL CHECK (canal IN ('cadastro_email', 'cadastro_google', 'entrada', 'banner_atualizacao', 'conta_documentos', 'admin')),
  metodo           text   NOT NULL CHECK (metodo IN ('clique_no_botao', 'caixa_e_nome_digitado', 'certificado_digital')),
  texto_exibido    text   NOT NULL,
  nome_digitado    text,
  ip               text,
  user_agent       text,
  hash_anterior    text   NOT NULL,
  hash             text   NOT NULL UNIQUE
);
CREATE INDEX IF NOT EXISTS aceites_usuario_idx ON aurea.aceites_documentos (user_email, documento_chave, created_at);

ALTER TABLE aurea.documentos_legais  ENABLE ROW LEVEL SECURITY;
ALTER TABLE aurea.aceites_documentos ENABLE ROW LEVEL SECURITY;
```

A primeira leitura publica as versões vigentes em `documentos_legais` (upsert por `chave` +
`versao`), no mesmo desenho do `garantirCatalogos()` de `repositories/contabil.ts`.

C3 vai chamar, a cada mudança de taxa, a função que A3 expõe em `src/server/documentos/publicar.ts`:

```ts
export async function publicarVersaoDocumento(chave: ChaveDocumento, conteudo: string, ator: string): Promise<{ versao: string; hash: string }>
```

### Testes que precisam existir

- `canonico.test.ts` — vetor congelado do hash dos Termos v1.0; nenhum `X (x por extenso)` nem
  `XX/XX/XXXX` no texto renderizado; todas as menções a "Tabela de Taxas" e "SAC" viram link;
  capítulo 14.4 marcado como negrito.
- `aceite.test.ts` — vetor congelado; adulterar um aceite antigo quebra a cadeia; campos na
  ordem de `CAMPOS_DO_ACEITE`.
- PGlite — aceites só são inseridos; cadeia confere depois de 3 cadastros; publicar versão nova
  não apaga a anterior.
- Cadastro por e-mail grava o aceite com a frase exata; **desmarcar a arbitragem não impede o
  cadastro** e não grava aceite de arbitragem.

### Como se sabe que funcionou

1. `/termos` mostra o texto do advogado com versão, vigência, hash, capítulo 14.4 em negrito,
   links para `/taxas` e `/suporte`. Nenhum "X" sobrando.
2. `/taxas` mostra os valores de `TAXAS_PADRAO` e o exemplo de R$ 200,00.
3. Criar conta de teste por e-mail **sem** assinar a arbitragem → conta criada. No Supabase:
   `SELECT documento_chave, canal, metodo, texto_exibido, ip FROM aurea.aceites_documentos ORDER BY id DESC LIMIT 5;`
   mostra termos, tabela de taxas e privacidade.
4. Minha conta › Configurações → assinar a arbitragem → aparece a quarta linha, com o nome
   digitado. "Ver comprovante" abre a página imprimível.
5. Conta de sócio antiga vê a faixa de termos atualizados, navega normalmente, e a faixa some
   ao aceitar.

### Não faz parte de A3

Reescrever a minuta. Política de Privacidade nova. Certificado digital. Envio de comprovante por
e-mail (não há e-mail transacional configurado). Barrar dados bancários de outra titularidade.

---

# 5. Frente B — Cobrança e custódia · `feat/b-cobranca-e-custodia`

## B1 · Cobrança reutilizável — `feat/b1-cobranca-reutilizavel`

> **Para o Rogério.** Hoje só o depósito e a compra direta sabem cobrar por Pix e cartão. Esta
> parte transforma isso numa peça única, que o envio, a fatura de custódia e a retirada usam. E
> passa a guardar, de cada pagamento, quanto o cliente pagou, quanto o Mercado Pago ficou e
> quando o dinheiro cai na conta da Áurea.

### Onde está hoje

- `src/lib/payments/mercadopago.ts` — `criarPreferenciaDeposito` (parcelas fixas em 1, linha
  108; título "Depósito de saldo"), `criarPixDeposito`, `consultarPagamentoMercadoPago` (lê
  valor, status e método; **não lê tarifa, líquido, parcelas nem data de liberação**).
- `src/server/actions/payments.ts` — `iniciarDeposito` e `iniciarCompraDireta`.
- `src/server/payments/conciliacao.ts` — dois ramos fixos: depósito ou compra direta (prefixo
  `CMP-`). A compra direta já registra a entrada externa em `deposits` para o livro-razão fechar
  sem `ajuste` — é o padrão que todos os tipos novos seguem.
- `aurea.payment_intents` — `tipo_operacao` sem CHECK (migration 008), `metadata` jsonb.
- A tela de Pix e cartão está dentro de `ModalDeposito`
  (`src/components/account/AccountModals.tsx:304`).
- `aurea.faturas_custodia` já tem `forma_pagamento` pix/cartão e `payment_intent_id`
  (migration 010), nunca usados.

### Documentação do Mercado Pago conferida em 13/09

| O que | Onde confirmar na hora de codar |
|---|---|
| `payment_methods.installments` na preferência define o máximo de parcelas | [Checkout Pro — meios de pagamento](https://www.mercadopago.com.br/developers/pt/docs/checkout-pro/additional-settings/payment-methods) |
| Parcelamento sem juros para o cliente se ativa no painel da conta, e o custo fica com quem vende | [Blog Mercado Pago — parcelamento sem juros no Checkout Pro](https://www.mercadopago.com.br/blog/checkout-pro-parcelamento-sem-juros) |
| `transaction_details.net_received_amount`, `transaction_details.total_paid_amount`, `installments`, `transaction_details.installment_amount`, `money_release_date` na consulta do pagamento | [Referência — obter pagamento](https://www.mercadopago.com.br/developers/pt/reference/online-payments/checkout-api-payments/get-payment/get) |

`fee_details` não apareceu no trecho conferido da referência. **Regra que não depende do
formato dele:** tarifa = `transaction_amount` − `net_received_amount`. `fee_details` entra só
como detalhamento, depois de o agente conferir o formato na referência.

### Passos

**B1.0 — A credencial passa a seguir o ambiente.** Hoje `getMercadoPagoAccessToken()`
(`src/lib/payments/mercadopago.ts:29`) devolve `MP_ACCESS_TOKEN_TEST || MP_ACCESS_TOKEN`, sem
olhar `MP_SANDBOX`. Com as duas variáveis presentes e `MP_SANDBOX=false`, a cobrança é criada
com a credencial de teste enquanto a tela manda o cliente para o endereço de produção. Passa a
ser:

```ts
export function getMercadoPagoAccessToken(): string | null {
  return isMercadoPagoSandbox()
    ? process.env.MP_ACCESS_TOKEN_TEST || process.env.MP_ACCESS_TOKEN || null
    : process.env.MP_ACCESS_TOKEN || null
}
```

Sem credencial de produção em modo produção, a função devolve `null` e o simulador responde com
`simulado: true` — visível na tela, nunca cobrança de teste disfarçada. Teste para as quatro
combinações de variáveis.

**B1.1 — Cobrança genérica.** `src/lib/payments/cobranca.ts`:

```ts
export interface PedidoDeCobranca {
  externalReference: string
  userEmail: string
  valorCents: Cents
  titulo: string          // aparece no app do Mercado Pago e na fatura do cartão
  descricao: string
  parcelasMax: number     // 1 por padrão; 12 no plano anual; 2 na retirada segura
  voltarPara: { sucesso: string; pendente: string; falha: string }   // back_urls do Checkout Pro
}

export async function criarCobrancaPix(p: PedidoDeCobranca): Promise<CobrancaPix>
export async function criarCobrancaCartao(p: PedidoDeCobranca): Promise<CobrancaCartao>
```

`criarPreferenciaDeposito` e `criarPixDeposito` passam a chamar estas, **sem mudar de
assinatura**. Pix ignora `parcelasMax`. O simulador continua devolvendo URLs vazias com
`simulado: true` — a correção do bloco 8 de 11/09 não pode voltar.

**B1.2 — A consulta lê o que o financeiro precisa.** `DetalhesPagamento` ganha `valorLiquidoCents`,
`tarifaCents`, `totalPagoCents`, `parcelas`, `valorParcelaCents` e `dataLiberacao`. O simulador
devolve tarifa zero e líquido igual ao bruto.

**B1.3 — Migration 017** (abaixo) e repositório `src/server/payments/recebimentos.ts`, só
`INSERT … ON CONFLICT (payment_id) DO NOTHING` e `SELECT`.

**B1.4 — Conciliação por tipo. Só depois de `git merge origin/main` com A1 dentro.**
`conciliarPagamento` vira um despachante:

```ts
type Liquidador = (s: AppState, intencao: IntencaoPagamento, detalhes: DetalhesPagamento) => ResultadoLiquidacao

const LIQUIDADORES: Record<TipoOperacao, Liquidador> = {
  deposito:            liquidarDeposito,          // o ramo que existe
  compra_direta:       liquidarCompraDireta,      // o ramo que existe + comissão do comprador (A1)
  fatura_custodia:     liquidarFaturaCustodia,    // B2
  plano_custodia:      liquidarFaturaCustodia,    // B2 — a contratação é uma fatura de origem 'contratacao'
  assinatura_custodia: liquidarAssinaturaCustodia,// B2.8
  retirada:            liquidarRetirada,          // B3
}
```

- **Compra direta com a comissão de A1:** `iniciarCompraDireta` cobra
  `custoDeCompraPorMoeda(price) * qty`; o liquidador credita o vendedor com
  `liquidoDeVendaPorMoeda(price)`, registra a entrada externa pelo total pago e grava o `Trade`
  com `feeComprador` e `feeVendedor`. O troco segue a mesma regra de hoje. **Fecha o RA-24.**
- `src/server/payments/conciliacao-ledger.ts:113` soma `feeComprador + feeVendedor`.
- **Todo liquidador de serviço registra a entrada externa em `deposits`** e o débito do serviço
  na mesma mutação — o livro-razão fecha sem `ajuste`, como a compra direta já faz.
- Depois do `mutateState`, grava a linha de `recebimentos_gateway`. Fica fora da transação do
  estado e é idempotente por `payment_id` — **RA-30**.
- Liquidador de tipo que ainda não existe (B2, B3) devolve o valor como saldo, para ninguém
  pagar e ficar sem nada.

**B1.5 — A tela de pagamento.** Pasta nova `src/components/pagamento/`, com `README.md`, e
`src/styles/pagamento.css`:

```tsx
<PainelPagamento
  valorCents={…}
  parcelasMax={…}
  saldoDisponivel={me.balance}
  pagarComSaldo={() => run(…)}          // opcional: sem ela, a aba Saldo não aparece
  iniciarPix={() => …}                   // Server Action que devolve a cobrança Pix
  iniciarCartao={() => …}                // Server Action que devolve o link do Checkout Pro
  aoConcluir={() => …}
/>
```

- Três abas: **Saldo em conta · Pix · Cartão**, botões de pelo menos 44 px.
- Saldo insuficiente não esconde nada: a aba mostra quanto falta e as outras duas continuam lá.
- Pix: QR, copia-e-cola e "aguardando confirmação", consultando `consultarStatusCobranca(ref)` a
  cada 5 s.
- Cartão: abre o Checkout Pro em nova aba e faz a mesma consulta. Texto das parcelas: "em até
  12x no cartão".
- `simulado: true`: mostra o aviso do simulador e não abre página externa.
- `ModalDeposito` passa a usar o `PainelPagamento` — mesma aparência de hoje.

**B1.6 — `consultarStatusCobranca(externalReference)`** em `payments.ts`: confere o dono e
devolve `pendente | creditado | recusado`.

### Migration 017 — `017_cobrancas_gateway.sql`

```sql
ALTER TABLE aurea.payment_intents ADD COLUMN IF NOT EXISTS parcelas_max integer NOT NULL DEFAULT 1;

ALTER TABLE aurea.payment_intents DROP CONSTRAINT IF EXISTS payment_intents_tipo_operacao_check;
ALTER TABLE aurea.payment_intents ADD CONSTRAINT payment_intents_tipo_operacao_check CHECK (tipo_operacao IN (
  'deposito', 'compra_direta', 'plano_custodia', 'fatura_custodia', 'assinatura_custodia', 'retirada'
));

-- Um pagamento aprovado = uma linha. Separa bruto, tarifa e líquido (decisão F-5).
CREATE TABLE IF NOT EXISTS aurea.recebimentos_gateway (
  id                 bigserial PRIMARY KEY,
  created_at         bigint  NOT NULL,
  payment_id         text    NOT NULL UNIQUE,
  external_reference text    NOT NULL,
  tipo_operacao      text    NOT NULL,
  user_email         text    NOT NULL,
  metodo             text    NOT NULL,
  parcelas           integer NOT NULL DEFAULT 1,
  valor_bruto        bigint  NOT NULL CHECK (valor_bruto > 0),
  valor_pago_cliente bigint  NOT NULL,
  tarifa_gateway     bigint  NOT NULL CHECK (tarifa_gateway >= 0),
  valor_liquido      bigint  NOT NULL,
  aprovado_em        bigint  NOT NULL,
  liberacao_prevista bigint,
  competencia        text    NOT NULL
);
CREATE INDEX IF NOT EXISTS recebimentos_competencia_idx ON aurea.recebimentos_gateway (competencia, tipo_operacao);
CREATE INDEX IF NOT EXISTS recebimentos_liberacao_idx   ON aurea.recebimentos_gateway (liberacao_prevista);
ALTER TABLE aurea.recebimentos_gateway ENABLE ROW LEVEL SECURITY;
```

`competencia` é calculada por `competenciaAtual(aprovado_em)` de `src/domain/custody.ts` — a
mesma função das faturas, para recebimento e fatura ficarem na mesma régua. Ela usa **UTC**:
pagamento aprovado entre 21h e 23h59 do último dia do mês, no horário de Brasília, cai na
competência seguinte. Registrado como **RA-32**; trocar o fuso é trocar essa função, para os
dois ao mesmo tempo.

### Testes que precisam existir

- `cobranca.test.ts` — preferência com `installments = parcelasMax`; Pix sem parcela; simulador
  com URL vazia.
- `mercadopago.test.ts` — leitura de uma resposta de exemplo com líquido, parcelas e liberação;
  tarifa = bruto − líquido.
- `conciliacao.test.ts` — o despachante escolhe o liquidador pelo tipo; o mesmo `payment_id`
  duas vezes gera **um** recebimento; tipo sem liquidador vira saldo.
- `compra-direta.test.ts` — valor da intenção inclui a comissão de compra; vendedor recebe
  líquido; negociação com os dois lados.
- PGlite — cada tipo liquidado fecha o livro-razão **sem `ajuste`**.

### Como se sabe que funcionou

1. Depósito de R$ 50,00 por Pix no simulador: mesma tela de hoje, agora pelo `PainelPagamento`.
2. Depósito real por Pix (depois das credenciais do Gabriel):
   `SELECT valor_bruto, tarifa_gateway, valor_liquido, liberacao_prevista, competencia FROM aurea.recebimentos_gateway ORDER BY id DESC LIMIT 1;`
3. Compra direta de 1 moeda a R$ 200,00 pelo gateway: cobrança de **R$ 202,00**; vendedor
   recebe **R$ 198,00**.

---

## B2 · Plano de custódia no envio e ciclo mensal e anual — `feat/b2-plano-de-custodia`

> **Para o Rogério.** Quem manda moeda para guardar escolhe ali mesmo o plano — mensal, R$ 2,00
> por moeda por mês, ou anual, R$ 24,00 por moeda por ano em até 12x no cartão — e paga por
> saldo, Pix ou cartão. Pode também pagar depois, sem atrasar o envio. A partir daí a cobrança
> anda sozinha: a mensal todo dia 1º, com débito automático no saldo ou no cartão; a anual na
> renovação. Moeda recusada na análise devolve o valor como saldo.

### Onde está hoje

- O envio (`src/app/(app)/envios/page.tsx`) tem 4 passos e não fala de plano nem de pagamento.
  `createProtocol` (`src/server/actions/custody.ts:115`) só cria o protocolo.
- A custódia só é cobrada pelo ciclo do dia 1º (`src/server/custodia/faturamento.ts`): débito
  no saldo ou fatura pendente, que **só pode ser paga com saldo**.
- Não existe plano anual em código — só a constante.
- Não existe tela onde o cliente veja e pague as próprias faturas (hoje elas aparecem só em
  `graficos/auditoria`).
- **Defeito de contagem** (achado 4 da seção 0.2).

### Passos

**B2.1 — Corrigir a contagem, sozinho, num commit.** Em `src/domain/custody.ts`:

```ts
/** Moedas que pagam custódia: todas sob guarda com recibo que não foi extinto. */
export function moedasFaturaveis(user: User): Coin[] {
  return (user.coins || []).filter((c) => c.recibo.status !== 'Extinto')
}
```

`gerarFaturaParaUsuario` passa a usar `moedasFaturaveis`. Recibo `Bloqueado` continua pagando.
O campo `transferido` continua existindo — ele é o "Alienado" da auditoria —, só deixa de
decidir cobrança.

*Testes:* moeda comprada no marketplace é faturada para o comprador no ciclo seguinte; moeda com
recibo extinto não é faturada.

**B2.2 — O modelo.** No bloco da frente B no fim de `src/domain/types.ts`:

```ts
export type ModalidadePlanoCustodia = 'mensal' | 'anual'
export type StatusPlanoCustodia = 'aguardando_pagamento' | 'vigente' | 'encerrado' | 'cancelado'

export interface PlanoCustodia {
  id: string                          // 'PLC-000001'
  userEmail: UserEmail
  protocoloEnvio: string
  modalidade: ModalidadePlanoCustodia
  quantidadeContratada: number
  moedaIds: string[]                  // preenchido na emissão dos recibos
  valorPorMoedaCents: Cents           // congelado na contratação
  valorTotalCents: Cents
  parcelasMax: number
  inicioCompetencia: string           // 'AAAA-MM'
  pagoAteCompetencia: string | null
  status: StatusPlanoCustodia
  formaPagamento: FormaPagamentoFatura | null
  paymentIntentRef: string | null
  assinaturaId: string | null         // B2.8
  estornadoCents: Cents
  criadoEm: Timestamp
  atualizadoEm: Timestamp
}
```

- `AppState.planosCustodia?: PlanoCustodia[]`.
- `FaturaCustodia` ganha `planoId?: string | null` e
  `origem?: 'ciclo_mensal' | 'contratacao' | 'renovacao_anual'`.
- `Envio` ganha `modalidadeEnvio?: 'PAC' | 'SEDEX'` — a escolha que o cliente já faz no passo
  1, e que hoje não é gravada.
- `Seq` ganha o contador de `PLC-`.
- Repositório `src/server/db/repositories/planos.ts` e as operações de diff e estado, no desenho
  de `faturas.ts`.

**B2.3 — A regra, pura.** `src/domain/plano-custodia.ts`:

```ts
export function valorDoPlano(modalidade, quantidade, taxas?: TabelaDeTaxas): { porMoeda: Cents; total: Cents; parcelasMax: number }
export function somarMeses(competencia: string, meses: number): string
export function competenciaCoberta(plano: PlanoCustodia, competencia: string): boolean
export function moedasCobertas(planos: PlanoCustodia[], competencia: string): Set<string>
export function gerarFaturaDoCiclo(user, email, competencia, planos, taxas?, agora?): FaturaCustodia | null
export function renovacaoAnualDevida(plano: PlanoCustodia, competencia: string): boolean
```

A regra que evita cobrar duas vezes pelo mesmo mês: **`pagoAteCompetencia`**. Mensal pago na
contratação cobre a competência da contratação. Anual pago cobre `início + 11`. O ciclo do dia
1º cobra, de cada conta, as moedas faturáveis **menos** as cobertas por plano pago até aquela
competência.

**B2.4 — Servidor.** Arquivo novo `src/server/actions/plano-custodia.ts`:

| Ação | O que faz |
|---|---|
| `contratarPlanoCustodia(protocolo, modalidade)` | Cria o plano `aguardando_pagamento` e a fatura de origem `contratacao` com `quantidade × valor por moeda`. Devolve o id da fatura |
| `pagarFatura(faturaId, forma)` | `saldo`: debita e marca paga (generaliza `pagarFaturaCustodiaComSaldo`). `pix` e `cartao`: intenção `fatura_custodia` com `metadata.faturaId` e cobrança de B1 — `parcelasMax` 12 se a fatura for de plano anual, senão 1 |
| `listarMinhasFaturas()` e `listarMeusPlanos()` | Para `/conta/faturas` |

`liquidarFaturaCustodia` (no despachante de B1): marca paga com forma e intenção; se a origem é
`contratacao`, o plano vira `vigente` e ganha `pagoAteCompetencia`; registra a entrada externa e
reavalia a inadimplência.

Em `src/server/db/derivar.ts`: a saída de custódia passa a ser lançada quando a fatura **vira
paga por qualquer forma**, não só por saldo. Pago por Pix ou cartão, o livro mostra a entrada
externa e a saída de custódia, e o saldo não muda.

**B2.5 — A emissão dos recibos alimenta o plano.** Nos dois caminhos de análise — a bancada
(`src/server/estacao/analise.ts`, fechamento) e o avanço simulado (`advanceAnalysis`, em
`custody.ts`):

- moedas aprovadas entram em `plano.moedaIds`;
- **plano já pago** e moedas recusadas → `estornadoCents += recusadas × valor por moeda`; o saldo
  do cliente sobe esse valor; `derivar.ts` lança `estorno` pelo aumento de `estornadoCents`;
- **plano não pago** → a fatura de contratação passa a valer só as aprovadas;
- todas recusadas → plano `cancelado`; fatura `cancelada` se não paga, estorno integral se paga.

A C3 vai chamar este mesmo serviço pela bancada web. **A regra fica aqui, e só aqui.**

**B2.6 — O ciclo do dia 1º.** `processarCicloFaturamento`:

- fatura `ciclo_mensal` = `gerarFaturaDoCiclo`, com as moedas cobertas descontadas;
- renovação anual: plano anual com `pagoAteCompetencia = competência − 1` gera fatura
  `renovacao_anual` com a quantidade atual e a taxa vigente;
- débito automático no saldo continua como está;
- o mapa de faturas existentes passa a considerar a origem (`email#competencia#origem`).

**B2.7 — As telas.**

*Envio* — passo novo entre "Dados e fotos" e "Postagem", com `WizardSteps` indo de 4 para 5:

- dois cartões: **Mensal** — R$ 2,00 por moeda por mês, "N moedas = R$ X por mês" — e
  **Anual** — R$ 24,00 por moeda por ano, "N moedas = R$ Y por ano, em até 12x no cartão";
- `PainelPagamento` (saldo · Pix · cartão);
- botão **"Pagar depois"**: a fatura fica em Minha conta › Faturas e o envio segue para a
  postagem;
- retomada (`envios/page.tsx`, linhas 153–155): `Protocolo gerado` sem plano contratado abre
  no passo 3; com plano, no 4; etapas seguintes no 5;
- a modalidade PAC ou SEDEX escolhida no passo 1 passa a ser gravada no envio.

*Minha conta › Faturas* — rota nova `src/app/(app)/conta/faturas/page.tsx` e componente
`src/components/custody/FaturasCustodia.tsx`:

- faturas: competência, origem, moedas, valor, vencimento, situação, botão **Pagar** com o
  `PainelPagamento`;
- planos: modalidade, vigência, pago até, moedas cobertas;
- "Ativar débito automático no cartão" (B2.8);
- um link em `/conta` para esta página.

**B2.8 — Débito automático no cartão (Assinaturas do Mercado Pago).** Para a cobrança mensal
andar sozinha no cartão:

- `ativarDebitoAutomatico()` cria uma assinatura **sem plano associado** —
  `POST /preapproval` com `status: "pending"`, `external_reference: "ASS-<email>"` e
  `auto_recurring { frequency: 1, frequency_type: "months", transaction_amount, currency_id: "BRL" }` —
  e devolve o link para o cliente cadastrar o cartão;
- antes do ciclo do dia 1º, se a quantidade de moedas mudou, atualiza o valor com
  `PUT /preapproval/{id}` (`auto_recurring.transaction_amount`);
- cada cobrança autorizada liquida a fatura `ciclo_mensal` daquela competência
  (`liquidarAssinaturaCustodia`, idempotente pelo `payment_id`);
- "Desativar" envia `status: "canceled"`.

**Antes de codar, conferir na documentação vigente** quais tópicos de notificação chegam para
assinatura e como se chega do aviso ao pagamento:
[Assinaturas sem plano associado](https://www.mercadopago.com.br/developers/pt/docs/subscriptions/integration-configuration/subscription-no-associated-plan) ·
[Gerenciamento de assinaturas](https://www.mercadopago.com.br/developers/pt/docs/subscriptions/subscription-management) ·
[Notificações de assinaturas](https://www.mercadopago.com.br/developers/pt/docs/subscriptions/additional-content/your-integrations/notifications/additional-info).
Conferido em 13/09: a assinatura sem plano aceita `status` `pending` ou `authorized` (este exige
o identificador do cartão), e o `PUT` permite trocar valor, trocar cartão, pausar e cancelar.

### Migration 018 — `018_planos_custodia.sql`

```sql
ALTER TABLE aurea.seq ADD COLUMN IF NOT EXISTS plano_custodia integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS aurea.planos_custodia (
  id                    text    PRIMARY KEY,
  user_email            text    NOT NULL REFERENCES aurea.users (email),
  protocolo_envio       text    NOT NULL,
  modalidade            text    NOT NULL CHECK (modalidade IN ('mensal', 'anual')),
  quantidade_contratada integer NOT NULL CHECK (quantidade_contratada > 0),
  moeda_ids             text[]  NOT NULL DEFAULT '{}',
  valor_por_moeda       bigint  NOT NULL CHECK (valor_por_moeda >= 0),
  valor_total           bigint  NOT NULL CHECK (valor_total >= 0),
  parcelas_max          integer NOT NULL DEFAULT 1,
  inicio_competencia    text    NOT NULL,
  pago_ate_competencia  text,
  status                text    NOT NULL CHECK (status IN ('aguardando_pagamento', 'vigente', 'encerrado', 'cancelado')),
  forma_pagamento       text    CHECK (forma_pagamento IS NULL OR forma_pagamento IN ('saldo', 'pix', 'cartao')),
  payment_intent_ref    text,
  assinatura_id         text,
  estornado             bigint  NOT NULL DEFAULT 0 CHECK (estornado >= 0),
  criado_em             bigint  NOT NULL,
  atualizado_em         bigint  NOT NULL
);
CREATE INDEX IF NOT EXISTS planos_usuario_idx ON aurea.planos_custodia (user_email);
CREATE INDEX IF NOT EXISTS planos_envio_idx   ON aurea.planos_custodia (protocolo_envio);
ALTER TABLE aurea.planos_custodia ENABLE ROW LEVEL SECURITY;

ALTER TABLE aurea.faturas_custodia ADD COLUMN IF NOT EXISTS plano_id text REFERENCES aurea.planos_custodia (id);
ALTER TABLE aurea.faturas_custodia ADD COLUMN IF NOT EXISTS origem   text NOT NULL DEFAULT 'ciclo_mensal';
ALTER TABLE aurea.faturas_custodia DROP CONSTRAINT IF EXISTS faturas_origem_check;
ALTER TABLE aurea.faturas_custodia ADD CONSTRAINT faturas_origem_check
  CHECK (origem IN ('ciclo_mensal', 'contratacao', 'renovacao_anual'));

-- A unicidade antiga (uma fatura por conta por mês) impediria a contratação no mesmo mês do ciclo.
ALTER TABLE aurea.faturas_custodia DROP CONSTRAINT IF EXISTS faturas_usuario_competencia_uniq;
CREATE UNIQUE INDEX IF NOT EXISTS faturas_ciclo_uniq ON aurea.faturas_custodia (user_email, competencia)
  WHERE origem = 'ciclo_mensal';
CREATE UNIQUE INDEX IF NOT EXISTS faturas_plano_uniq ON aurea.faturas_custodia (plano_id, competencia, origem)
  WHERE plano_id IS NOT NULL;

ALTER TABLE aurea.envios ADD COLUMN IF NOT EXISTS modalidade_envio text;
```

### Testes que precisam existir

- `plano-custodia.test.ts` — valores mensal e anual; `somarMeses` virando o ano; moeda coberta
  não entra no ciclo; renovação no mês certo.
- `custody.test.ts` — os dois testes de B2.1.
- `faturamento.test.ts` — contratação e ciclo no mesmo mês convivem; anual pago não gera ciclo
  por 12 meses; renovação no 13º.
- PGlite — índices únicos novos aceitam contratação + ciclo e recusam dois ciclos no mesmo mês;
  fatura paga por Pix fecha o livro sem `ajuste`; estorno aparece como `estorno`.
- Análise — 3 moedas contratadas e pagas, 1 recusada: plano com 2 moedas e R$ 2,00 (mensal) ou
  R$ 24,00 (anual) de volta ao saldo.

### Como se sabe que funcionou

1. Envio de 3 Bandeiras, plano anual, cartão → cobrança de **R$ 72,00** com parcelamento em até
   12x no Checkout Pro.
2. Envio de 2 moedas, plano mensal, "Pagar depois" → o envio segue para a postagem, e a fatura
   de **R$ 4,00** aparece em Minha conta › Faturas.
3. Pagar essa fatura por Pix no simulador → fatura paga, extrato com entrada e saída.
4. Rodar o ciclo com a data de referência do mês seguinte → a conta anual não recebe fatura; a
   mensal recebe.
5. Comprar uma moeda no mercado e rodar o ciclo → a moeda comprada entra na fatura do comprador.

---

## B3 · Retirada paga e financeiro da empresa — `feat/b3-retirada-e-financeiro`

> **Para o Rogério.** A retirada da moeda passa a aceitar Pix e cartão — a segura em até 2x — e
> deixa de exigir saldo. E o financeiro ganha a separação que faltava: de cada pagamento, quanto
> entrou, quanto o Mercado Pago ficou e quando o dinheiro cai na conta. O plano anual vira
> receita mês a mês na DRE, em vez de aparecer inteiro no mês em que foi pago.

### Onde está hoje

- `solicitarRetirada` (`src/server/actions/custody.ts:404`) recusa sem saldo (linha 467) e
  debita a taxa (493). O modal manda "realize um depósito antes de continuar"
  (`ModalSolicitarRetirada.tsx`, linhas 329–337).
- O prazo D+30 é contado do pedido, e a minuta conta da confirmação.
- "Tarifas de gateway de pagamento" existe no plano de contas (`src/domain/dre.ts:132`) como
  conta **manual** — ninguém lança.
- A receita de custódia na DRE vem dos lançamentos do livro-razão: plano anual pago de uma vez
  entraria inteiro num mês só.

### Passos

**B3.1 — Retirada em duas fases.**

- `solicitarRetirada(coinId, modalidade, endereco)` cria a retirada `solicitada`, congela o
  endereço, **não confere saldo** e devolve o id.
- `pagarRetirada(retiradaId, forma)`: `saldo` debita na hora, como hoje; `pix` e `cartao` criam
  intenção `retirada` com `parcelasMax` 2 na segura e 1 na comum.
- `liquidarRetirada` (e o caminho do saldo): status `paga`, `pagoEm`, recibo `Extinto`,
  `dataLimiteD30` **recalculada a partir do pagamento**, entrada externa registrada quando veio
  do gateway.
- Em `src/server/db/derivar.ts`, `taxa_retirada` passa a ser lançada pela transição para `paga`
  com `valorTaxaCents`, qualquer que seja a forma — hoje ela depende de o saldo ter caído.
- Enquanto a retirada está `solicitada`, a moeda não aparece para venda
  (`availableCoinsForSell`) e o cliente pode **"Cancelar solicitação"**.
- `calcularTaxaRetirada(modalidade, taxas = TAXAS_PADRAO)` passa a ler de `fees.ts`; as
  constantes de `retirada.ts` saem, e o teste de igualdade de A1 é removido junto.

**B3.2 — O modal.** Modalidade e endereço como hoje, e o `PainelPagamento` no lugar do bloco de
saldo. Sai o "realize um depósito antes de continuar".

**B3.3 — Tarifa do Mercado Pago na DRE.** Conta `4.1.07` passa a `automatica: true`, alimentada
pela soma de `tarifa_gateway` de `aurea.recebimentos_gateway` por competência. `Fontes` em
`src/server/relatorios/dados.ts` ganha `recebimentos`.

**B3.4 — Custódia por competência.** Função pura `src/domain/competencia.ts`:

```ts
/** Receita de um plano anual dentro de um período: 1/12 por mês coberto; a sobra do
 *  arredondamento vai para o 12º mês, para os doze somarem exatamente o valor pago. */
export function apropriacaoPlanoAnual(plano: PlanoCustodia, periodo: Periodo): Cents
export function receitaDeCustodiaNoPeriodo(faturas: FaturaCustodia[], planos: PlanoCustodia[], periodo: Periodo): Cents
```

- Mensal (ciclo e contratação de plano mensal): receita na **competência da fatura**.
- Anual: **1/12 por mês** coberto.
- A linha "Receita de custódia" da DRE passa a usar `receitaDeCustodiaNoPeriodo`, e deixa de
  somar os lançamentos `custodia` do livro-razão — somar os dois contaria duas vezes.

Regra contábil de competência, não de imposto. Confirmação com o contador fica registrada como
**RA-31**, sem segurar a entrega.

**B3.5 — Relatórios novos** em `NOMES_RELATORIOS`, com rota em `/api/relatorios/<nome>` de graça:

| Nome | Colunas |
|---|---|
| `recebimentos-gateway` | data, tipo, conta, método, parcelas, bruto, tarifa, líquido, liberação prevista, situação (a receber · liberado), competência |
| `planos-custodia` | plano, conta, modalidade, moedas, valor, início, pago até, situação, forma |
| `receita-diferida` | plano anual, valor pago, já apropriado, a apropriar, meses restantes |
| `faturas-custodia` | fatura, conta, competência, origem, moedas, valor, vencimento, situação, forma, pagamento |

`docs/API_RELATORIOS.md` ganha as quatro.

### Migration 019 — `019_retirada_paga.sql`

```sql
ALTER TABLE aurea.retiradas ADD COLUMN IF NOT EXISTS forma_pagamento    text;
ALTER TABLE aurea.retiradas DROP CONSTRAINT IF EXISTS retiradas_forma_pagamento_check;
ALTER TABLE aurea.retiradas ADD CONSTRAINT retiradas_forma_pagamento_check
  CHECK (forma_pagamento IS NULL OR forma_pagamento IN ('saldo', 'pix', 'cartao'));
ALTER TABLE aurea.retiradas ADD COLUMN IF NOT EXISTS payment_intent_ref text;
ALTER TABLE aurea.retiradas ADD COLUMN IF NOT EXISTS parcelas           integer NOT NULL DEFAULT 1;
```

### Testes que precisam existir

- `competencia.test.ts` — R$ 24,00 em 12 meses soma exatamente R$ 24,00; R$ 72,00 idem; plano
  que começa em novembro divide entre dois anos.
- `dre.test.ts` — anual pago em janeiro aparece 1/12 por mês; tarifa entra como despesa; não
  conta duas vezes.
- `retirada.test.ts` — solicitar sem saldo funciona; pagar por Pix extingue o recibo; D+30 a
  partir do pagamento; moeda com retirada solicitada some da venda; cancelar devolve a moeda
  para a venda.
- PGlite — retirada paga por Pix fecha o livro sem `ajuste`, com `taxa_retirada`.

### Como se sabe que funcionou

1. Conta com saldo zero pede retirada **segura** → escolhe cartão → Checkout Pro de R$ 180,00 em
   até 2x.
2. Depois do pagamento: recibo extinto, prazo contado da data do pagamento.
3. `/relatorios` → DRE de um mês em que houve plano anual de R$ 72,00 pago: receita de custódia
   de **R$ 6,00** naquele mês.
4. `GET /api/relatorios/recebimentos-gateway?formato=csv` com a chave de integração devolve as
   colunas acima.

---

# 6. Frente C — Painel Admin · `feat/c-painel-admin`

**O desenho está em `docs/PLANO_EXECUCAO_ADMIN.md`, e é ele que a frente C executa.** Esta seção
lista a ordem, os ajustes que as frentes A e B provocaram e o que conferir ao fim de cada
sub-branch. Nada daqui repete aquele documento — duas cópias da mesma especificação divergem na
primeira edição.

## 6.1 Ajustes ao plano do Admin, válidos a partir de 13/09

| Seção do plano do Admin | Ajuste |
|---|---|
| 1.8 — alinhar a documentação | **Sai da C1.** Foi feito em A1.7. C1 só acrescenta o parágrafo do módulo Admin ao `CLAUDE.md` |
| 3.2 — congelar a comissão no `Trade` | **Sai da C3.** Foi feito em A1 |
| 3.2 — taxas editáveis | As chaves de configuração são os campos de `TabelaDeTaxas` (A1), um para um, inclusive comprador e vendedor separados |
| 6 — numeração de migrations | Substituída pela seção 3.3 deste plano: **C1 = 020 e 021 · C2 = 022 e 023 · C3 = 024 e 025** |
| Faixa de riscos | **RA-40 a RA-49** |

## C1 · Fundação e Central de Resultados — `feat/c1-fundacao-e-resultados`

Execução: seções 1.1 a 1.7 de `docs/PLANO_EXECUCAO_ADMIN.md`, com as migrations renumeradas
(`020_admin_rbac.sql`, `021_eventos_uso.sql`).

O que muda por causa das outras frentes:

- **Financeiro** lê `dreCompleta()`: as receitas de A1 (comissão dos dois lados) e a tarifa do
  gateway de B3 aparecem sozinhas quando entram na `main`. O cartão "Recebimentos do Mercado
  Pago" lê o relatório `recebimentos-gateway` e mostra "disponível depois da B3" enquanto ele não
  existir.
- **KPIs** ganham: comissão média por negociação separada por lado; ocupação da fila (ofertas
  abertas por tipo); tempo médio entre cadastro da oferta e execução (de `ofertas_historico`, A2);
  planos mensal × anual; faturas em aberto.
- **Sidebar do app** (`src/components/shell/Sidebar.tsx`): o item "Relatórios" passa a apontar
  para `/admin`.

Pronto quando: login de sócio abre `/admin`; conta criada por `/cadastrar` recebe o
redirecionamento; as quatro subpáginas carregam com o banco de produção; `npm run build`,
`npm run typecheck` e `npm test` verdes.

## C2 · Usuários e CS — `feat/c2-usuarios-e-cs`

Execução: seções 2.1 a 2.6 de `docs/PLANO_EXECUCAO_ADMIN.md`, com `022_cs_mensageria.sql` e
`023_notas_e_atribuicoes.sql`. **O provedor de WhatsApp precisa ter sido escolhido pelo Gabriel
antes de 2.3** (seção 10 daquele plano); até lá, o adaptador de registro local mantém a tela
funcionando.

O que muda por causa das outras frentes:

- Ficha do usuário, aba **Cadastro**: aceites de `aurea.aceites_documentos` (A3) — documento,
  versão, canal, data e hora, IP, hash — e se a arbitragem foi assinada. Sem A3 na `main`, lê
  `settings.legalAcceptance`.
- Aba **Financeiro**: planos e faturas de custódia (B2) e recebimentos do gateway (B1) da conta.
- Aba **Mercado**: ofertas com posição na fila (`posicaoNaFila`, A2) e o histórico da fila.
- **Ações sobre a conta** usam as funções de domínio das outras frentes, nunca aritmética
  própria: ajuste de saldo pelo lançamento `ajuste`; pagamento manual de fatura pela ação de B2.
- O número do WhatsApp do CS vai para `parametros.ts` de A3 como canal de SAC — **pedido em
  `PENDENCIAS_AGENTE_C.md` para o Agente A**, ou editado em C3 quando os canais virarem
  configuração.

## C3 · Bancada, moedas, logística e configuração — `feat/c3-bancada-e-configuracao`

Execução: seções 3.1 a 3.7 de `docs/PLANO_EXECUCAO_ADMIN.md`, com `024_config_plataforma.sql` e
`025_caixas_fisicas.sql`. **Começa com A1, A3 e B2 na `main`.**

O que muda por causa das outras frentes:

- **Taxas** (aba "Taxas e comissões"): cada campo de `TabelaDeTaxas` é uma chave de
  `aurea.config_plataforma`. `carregarTabelaDeTaxas()` (A3) passa a ler do banco, com
  `TAXAS_PADRAO` como padrão. Toda gravação: `config_historico` **e**
  `publicarVersaoDocumento('tabela_de_taxas', …)` (A3) — a Tabela de Taxas é parte do contrato,
  então mudança de taxa gera versão nova do documento, e a faixa de atualização de A3 aparece
  para os clientes.
- **As funções passam a tabela carregada**: `matchOrders(state, taxas)`, `buyLot`, `sellToBid`,
  `publishBid`, `editBid`, cobrança de plano e retirada. O teste de A1 com `TAXAS_PADRAO`
  continua passando; os novos testam uma tabela diferente.
- **Parâmetros dos termos** (vigência, prazos, canais de SAC) na aba "Operacional": gravação gera
  versão nova dos Termos pela mesma função.
- **Catálogo de moedas**: `isNegociavel(tipo)` passa a consultar `aurea.tipos_moeda`.
- **Bancada web**: chama `src/server/estacao/analise.ts`, que desde B2 alimenta o plano de
  custódia e o estorno. **Nenhuma regra de plano é reimplementada na tela.**
- **Logística**: retiradas com forma de pagamento, parcelas e situação (B3).

---

# 7. Merge na `main`, migrations em produção e conferência

## 7.1 Ordem de entrada na `main`

Na ordem em que ficam prontas, com uma prioridade: **A1 primeiro**. Depois de cada merge:

```bash
npm install
npm run typecheck
npm test
npm run build
```

## 7.2 Migrations no Supabase de produção

Toda sub-branch com migration, depois de entrar na `main`:

```bash
npm run db:migrate
npm run db:check
```

`db:check` precisa listar a migration nova como aplicada. Se não listar, a sub-branch seguinte
não abre em cima dela.

## 7.3 A varredura final de terminologia

Depois de A3, B3 e C3 na `main`: busca pelas palavras proibidas em todo texto de interface
**escrito nesta rodada**. A minuta do advogado não entra na varredura — ela é publicada como
veio (F-7).

---

# 8. O que o Gabriel precisa entregar

| Para | O quê | Onde a resposta entra |
|---|---|---|
| B1 e B2 | As credenciais do Mercado Pago, que já estão no seu roteiro de amanhã. Variáveis que o código lê (conferido em `src/lib/payments/mercadopago.ts` e `webhook.ts`): `MP_ACCESS_TOKEN`, `MP_ACCESS_TOKEN_TEST`, `MP_WEBHOOK_SECRET` e `MP_SANDBOX`. **Até B1.0 entrar, não cadastre `MP_ACCESS_TOKEN_TEST` no ambiente Production da Vercel** — o código atual usa a de teste primeiro, mesmo com `MP_SANDBOX=false` | Vercel e `.env.local` |
| B2 e B3 | Decidir se o cliente paga juros no parcelamento. Sem juros para ele, o custo fica com a Áurea e se ativa no painel do Mercado Pago — o caminho do menu é conferido na documentação na hora | Painel do Mercado Pago |
| A3 | Os 4 valores em branco da minuta, os canais de comunicação e o SAC | `docs/finalizacoes/2026-09-13_minuta_pontos_para_os_socios.md`, seções A e B |
| C2 | O provedor de WhatsApp (Evolution API ou Z-API) | `docs/PLANO_EXECUCAO_ADMIN.md`, seção 10 |
| Advogado | Os 6 pontos de texto da minuta | `docs/finalizacoes/2026-09-13_minuta_pontos_para_os_socios.md`, seção C |

Nenhum item desta tabela segura o começo das três frentes.

---

# 9. O que esta rodada produz

| Tipo | Arquivo |
|---|---|
| Plano | este arquivo |
| Prompts | `docs/prompts/FINALIZACAO_AGENTE_A.md`, `_B.md`, `_C.md` |
| Relatórios | `docs/finalizacoes/RELATORIO_AGENTE_A.md`, `_B.md`, `_C.md` — um por frente, atualizado a cada sub-branch |
| Pendências | `docs/finalizacoes/PENDENCIAS_AGENTE_A.md`, `_B.md`, `_C.md` — pedidos a outra frente e ações manuais |
| Migrations | 014 a 025 |
| Páginas públicas novas | `/taxas`, `/suporte`, `/conta/aceites/[id]` |
| Páginas do app novas | `/conta/faturas`, `/admin/*` |
