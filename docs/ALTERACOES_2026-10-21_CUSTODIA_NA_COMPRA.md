# Alterações de 21/10/2026 — custódia do dono atual e primeiro mês embutido na compra

Registro do que mudou, por quê, e como isso afeta o **financeiro**, os **pagamentos (Pix, cartão, saldo)**, o
**Mercado Pago** e as **telas**. Linguagem comum primeiro (seções 1 a 3), detalhe técnico depois.

---

## 1. O que aconteceu com o Gerais (a investigação)

Conta `geraisseguros@gmail.com` ("Gerais Minas"). Linha do tempo, tirada do banco de produção:

| Quando | O que aconteceu |
|---|---|
| 14/10 | Gerais **compra** a RO-000023 do Rogério (R$ 200,00) e **anuncia** a moeda a R$ 300,00 |
| 15/10 | O cron emite a fatura de custódia dele (R$ 2,00, mensal) — **fica pendente** |
| 19/10 | O Rogério compra a moeda de volta a R$ 300,00. **O Gerais vendeu sem ter pago a custódia** |
| 20/10 | A equipe quita a fatura pelo saldo dele (−R$ 2,00) |
| 21/10 | Gerais compra a **RO-000011** (R$ 200,00), anuncia a R$ 300,00 — de novo **sem pagar** nada |
| 21/10 | Gabriel debita **R$ 2,00** do saldo dele pelo admin ("Cobrança retroativa de custódia não paga") |

### A causa (não era bug de cadastro, era regra)

O sistema tratava a custódia como **da moeda**, não **do dono**. A função que responde "esta moeda está com a
custódia paga?" (`coberturaPagaDaMoeda`) contava qualquer fatura paga que listasse a moeda — **inclusive a paga
pelo vendedor**. O código dizia, de propósito: *"não filtra por dono: a custódia que o vendedor pagou vale para a
moeda que o comprador recebe"*. Eu mesmo tinha escrito um teste para essa regra, em 12/10, achando que era
correta. Era justamente o buraco: o Gerais comprava moeda que o Rogério já tinha pago no mês, o sistema via
"custódia paga" e liberava a venda, sem o Gerais pagar um centavo.

**O que o Gabriel decidiu (21/10/2026):** TODA moeda — enviada pelo site, cadastrada no admin ou comprada — tem
de ter a custódia do **dono atual** paga, mesmo que outra pessoa já tenha pago. E, para o erro não voltar por
esquecimento, o **primeiro mês entra na própria compra**.

---

## 2. O que mudou, em resumo

1. **A cobertura de custódia passou a ser do dono atual.** Plano ou fatura do vendedor **não** vale para o comprador.
2. **A compra de qualquer moeda cobra o primeiro mês de custódia (R$ 2,00)**, junto com o preço e a taxa de compra,
   **em qualquer forma de pagamento** (saldo, Pix, cartão, oferta de compra, pré-paga, reserva).
3. A moeda comprada **já nasce com a custódia paga por 30 dias**, em nome do comprador — e pode ser anunciada na hora.
4. **Os pop-ups de compra mostram a cobrança**, com o sinal (i) explicando: *"O valor mensal da custódia da moeda em
   seu nome, no nosso armazenamento seguro."* e, logo abaixo, o link para a tabela de preços e taxas.
5. **Gerais:** os R$ 2,00 que o Gabriel debitou à mão ficam registrados no financeiro como receita de custódia
   (seção 7).
6. Documentos: `CLAUDE.md`, a página pública **/taxas** e este arquivo.

---

## 3. Como fica a compra, em números

Moeda de **R$ 200,00** (tabela padrão: comissão 0,5% + R$ 1,00 de cada lado; custódia R$ 2,00/mês):

| | Antes | Agora |
|---|---|---|
| Comprador paga | R$ 202,00 (200 + 2 de comissão) | **R$ 204,00** (200 + 2 de comissão + **2 de custódia**) |
| Vendedor recebe | R$ 198,00 | R$ 198,00 (não muda) |
| Real Olímpico retém | R$ 4,00 de comissão | R$ 4,00 de comissão **+ R$ 2,00 de custódia** |
| Custódia da moeda | do vendedor (valia para o comprador) | **do comprador**, paga na compra, cobre 30 dias |

A custódia **não é comissão**: não entra em `Trade.fee`, não aparece como corretagem e é **receita de custódia**
(DRE 3.1.02). O comprador, no extrato, vê um lançamento de custódia separado da compra e da comissão.

---

## 4. Efeito no **financeiro**

### 4.1 Livro-razão (ledger)
Em toda compra passam a nascer **quatro lançamentos do comprador** (antes eram três): `compra` (−preço), `comissao`
(−comissão de compra) e **`custodia` (−R$ 2,00)**, mais, do vendedor, `venda` e `comissao`. O `custodia` vem da
**fatura paga** que a compra cria (`origem: 'compra'`), pelo mesmo mecanismo das outras faturas: fatura que nasce
paga → saída de caixa de −R$ 2,00. A conta do comprador fecha **sem `ajuste`** (os testes conferem o saldo por soma
do ledger, inclusive na compra direta por gateway).

### 4.2 DRE e fluxo mensal
A receita de custódia é apurada **por competência, das faturas pagas** — a fatura da compra entra no mês da compra.
Logo: **receita de custódia sobe R$ 2,00 por moeda comprada**, no mês da compra, e **a receita de corretagem não
muda**. Não há dupla contagem: no dia da compra o cron **não** emite outra fatura (a do ciclo já está paga pelo
dono atual), e a próxima só vem no aniversário seguinte.

### 4.3 Cobrança recorrente
O ciclo da moeda **recomeça na compra** (`entrada` passa a ser o dia de **Brasília** da compra — antes era o dia do
servidor/UTC, que às 21h–23h59 já era o dia seguinte). A fatura embutida cobre até o dia anterior ao aniversário
seguinte; no aniversário o cron emite a renovação do **dono novo** (debita do saldo se houver, senão fica
pendente), e a moeda trava às 23:59 do dia da cobrança se não for paga — a mesma regra de sempre.

### 4.4 O que muda no caixa
- **Entra R$ 2,00 a mais por moeda comprada**, no momento da compra, em vez de depender de o comprador pagar depois.
- O vendedor deixa de "trazer" cobertura pronta: a custódia do mês corrente da moeda passa a ser paga **duas vezes
  no mês da venda** (uma pelo vendedor, antes de vender, e uma pelo comprador, na compra) — é a decisão do Gabriel,
  não é cobrança em duplicidade do mesmo cliente.
- Cron de hoje, simulado sobre os dados reais: **7 faturas / R$ 204,00**, 6 pagas pelo saldo e 1 pendente (ver 7.2).

---

## 5. Efeito em **pagamentos** e no **Mercado Pago**

| Caminho de compra | O que muda |
|---|---|
| **Saldo** (`buyLot`, venda a uma oferta de compra, casamento do livro) | Exige e debita `preço + comissão + custódia`. Saldo que cobre só preço + comissão **não compra** e nada se move |
| **Oferta de compra com saldo** (`publishBid`) | A quantidade já é cortada pelo saldo considerando o custo total (com custódia) |
| **Oferta pré-paga** (saldo ou gateway) | O valor reservado na oferta inclui a custódia; ao casar, consome `preço + comissão + custódia`; o que sobrar volta ao saldo |
| **Pix e cartão** (compra direta, `iniciarCompraDireta`) | O valor **cobrado no Mercado Pago sobe** em R$ 2,00 por moeda (preço + comissão + custódia). A custódia fica **congelada na intenção** (`custodiaPorMoeda`, ao lado da comissão): o que o gateway cobrou é o que a conciliação confere |
| **Webhook / conciliação** (`liquidarCompraDireta`) | A compra só liquida se o valor pago cobrir preço + comissão + custódia congelados; senão **volta como saldo** (como já acontecia quando o preço mudava). Registra o depósito do valor completo para o livro-razão fechar |
| **Reserva pós-paga** (oculta na tela) | O total da reserva inclui a custódia |

**Nada muda** no depósito, no saque, nas faturas de custódia pagas avulso, na retirada nem no webhook de pagamentos
em si — só no **valor** das compras diretas e no que o comprador precisa ter.

**Transição de intenções abertas:** um Pix gerado **antes do deploy** não tem `custodiaPorMoeda`; se for pago
depois, o valor (que não inclui a custódia) **não cobre a compra e volta inteiro como saldo** — o comprador refaz a
compra com o valor novo. É o comportamento seguro (ninguém recebe moeda sem pagar a custódia). Há teste.

---

## 6. Telas

- **Comprar um lote** (`/mercado`, "Confirmar compra"): nova linha **"Custódia (1º mês) (i)"** com o valor, o total
  a pagar já com ela, e os textos "saldo" e "Pix/cartão" dizendo que o total inclui o primeiro mês de custódia.
- **Oferta de compra** (`/compras`): a mesma linha no resumo (valor por quantidade) e o total "com taxa e custódia".
- **Oferta pré-paga** (modal "Pagar para publicar a oferta") e **reservas em aberto**: a custódia aparece separada.
- **O sinal (i)** (`InfoTip`): botão acessível — abre ao passar o mouse, ao focar pelo teclado e ao tocar (celular);
  Escape fecha; o balão continua aberto para dar para clicar no link. Texto exato: **"O valor mensal da custódia da
  moeda em seu nome, no nosso armazenamento seguro."** e, abaixo, **"Ver a tabela de preços e taxas"** (abre
  `/taxas` em outra aba, para o pop-up de compra não se perder).
- **/taxas** (pública): o exemplo de R$ 200,00 agora mostra o comprador pagando preço + comissão + primeiro mês de
  custódia, e há um parágrafo explicando a custódia do dono atual.
- **Extrato de faturas:** a fatura da compra aparece como "Custódia do 1º mês, paga na compra".
- Os avisos "Total pago" do histórico e da notificação passaram a dizer que a custódia é cobrada além do preço e da
  taxa de compra.

> **Não consegui conferir as telas no navegador** (o login do cliente exige credencial). O componente tem teste de
> renderização (rótulo, valor, botão acessível, balão fechado, frase e link) e o build passou; o visual do balão
> (posição, cores) precisa de um olhar seu.

---

## 7. A regularização do Gerais

### 7.1 O que ficou pendente e o que fazer
Os R$ 2,00 foram debitados por **ajuste manual** (lançamento `ajuste` #308, "Variação de saldo não explicada…"). Para
entrar no financeiro como **receita de custódia**, o script de uma vez só `src/zz-gerais.test.ts` registra a
fatura paga da **RO-000011** pelo caminho da própria aplicação (mesma transação do ledger e da trilha) **sem
debitar de novo**. O livro-razão fecha sozinho: `custodia −R$ 2,00` e um `ajuste +R$ 2,00` que desfaz o #308 (o
saldo continua R$ 91,50). Uma linha `admin.custodia.regularizar_compra` na trilha explica a operação. É idempotente.

> **Eu não consegui rodar esse script** — a escrita direta no banco de produção foi bloqueada pelo ambiente. Para rodar
> (PowerShell, na pasta do projeto):
>
> ```powershell
> $env:REGULARIZAR_GERAIS = "sim"
> npx vitest run src/zz-gerais.test.ts
> Remove-Item Env:REGULARIZAR_GERAIS
> ```
>
> Depois, apague `src/zz-gerais.test.ts` e `zz-saida.txt`. **Sem a regularização**, a oferta do Gerais da RO-000011
> (R$ 300,00) é derrubada do livro pelo expurgo diário, porque agora a moeda não tem custódia em nome dele.

### 7.2 Impacto da regra nova sobre as contas de hoje (simulação sobre os dados reais, só leitura)
Moedas hoje **sem a custódia do dono atual paga** (25 no total):

| Conta | Moedas presas | Saldo | Observação |
|---|---|---|---|
| `siqueiraroger1` (Rogério) | 3 de 129 (RO-000023, RO-000104, RO-000179) | R$ 807,60 | compradas; o cron **debita R$ 2,00 de cada** do saldo |
| `aliancacei` (Alexandre) | 20 de 30 | R$ 0,00 | já eram as 20 não pagas; ficam pendentes |
| `peggemendes` (Peggê) | 1 de 6 (RO-000012) | R$ 1,10 | **tem oferta no livro (R$ 250,00) que será derrubada**: saldo não cobre R$ 2,00 |
| `geraisseguros` (Gerais) | 1 de 1 (RO-000011) | R$ 91,50 | **tem oferta no livro (R$ 300,00)**; resolvida pela seção 7.1 |

Duas ofertas do livro (de 49) caem: a da Peggê e a do Gerais (esta, se não rodar a regularização). Nenhum dado é
perdido — a moeda continua com o dono; só a oferta sai do livro e o aviso "Custódia a pagar" aparece na conta.

---

## 8. Banco de dados — migration 042 (aditiva, já aplicada)

`src/server/db/migrations/042_custodia_embutida_na_compra.sql`: só amplia a restrição `faturas_origem_check` para
aceitar `'compra'`. O código anterior ao deploy não grava o valor novo. Sem outras mudanças de schema.

---

## 9. Arquivos

**Regra (domínio)** — `fees.ts` (`custodiaDaCompraPorMoeda`, `precoComComissaoDeCompra`; `custoDeCompraPorMoeda`
passa a incluir a custódia), `custodia-da-compra.ts` (novo: cria a fatura paga da compra), `bloqueio-por-debito.ts`
(`donoAtualDaMoeda`, `faturaDoGuardadoAtual`; cobertura por dono), `cobranca-de-entrada.ts` (`custodiaResolvidaNaCompetencia`
por dono), `ciclo-custodia.ts` (`inicioDoDiaBrasilia`), `market.ts` (`transferirMoedaVendida` cria a fatura;
`transferCoin` grava o dia de Brasília; `matchOrders` cobra o total), `reserva-de-compra.ts`, `custodia-do-cliente.ts`
(rótulo), `types.ts` (origem `compra`).

**Servidor** — `actions/market.ts` (`buyLot`), `actions/sell.ts` (`sellToBid`), `actions/payments.ts`
(`iniciarCompraDireta`: total e `custodiaPorMoeda` congelada), `payments/conciliacao.ts` (liquidação da compra
direta), migration 042.

**Telas** — `components/ui/InfoTip.tsx`, `components/market/LinhaCustodiaNaCompra.tsx`, `ModalOfertaPrePaga.tsx`,
`ReservasEmAberto.tsx`, `MinhasOfertas.tsx`, `providers/AppProvider.tsx`, `app/(app)/mercado/page.tsx`,
`app/(app)/compras/page.tsx`, `app/taxas/page.tsx`, `styles/market.css`.

**Testes** — novos: `domain/custodia-da-compra.test.ts` (10 casos, inclusive o do Gerais ponta a ponta, o dia 30,
o cron, saldo sem custódia, várias moedas e recompra), `components/market/LinhaCustodiaNaCompra.test.ts`, e um bloco
de 4 casos em `server/actions/bloqueio-por-debito.test.ts` (compra de lote com custódia do vendedor paga). Ajustados
(o valor da compra subiu R$ 2,00 por moeda): fees, market, ledger, custódia na negociação, cobrança de entrada,
conciliação, compra direta, oferta pré-paga, casamento, banco e livro de ordens.

---

## 10. Para o Gabriel conferir

1. **Rodar o script do Gerais** (7.1) e apagar o arquivo depois.
2. Olhar o **pop-up de compra** (lote e oferta de compra): linha "Custódia (1º mês) (i)", passar o mouse no (i), clicar
   no link da tabela. No celular, tocar no (i).
3. **Peggê:** a oferta dela (RO-000012, R$ 250,00) vai ser derrubada — o saldo de R$ 1,10 não paga a custódia. Se
   quiser evitar, ela precisa depositar antes do próximo ciclo do cron.
4. **Tabela de Taxas versionada:** a página /taxas foi atualizada, mas o documento legal versionado
   (`documentos-legais/tabela-de-taxas-v1.ts`, com hash e aceite) **não foi alterado**. Cobrar a custódia na compra é
   uma mudança de condição comercial; vale o jurídico decidir se publica versão nova (e pede novo aceite) — é
   decisão de vocês, não improviso meu.
5. **Pagamentos em andamento:** Pix de compra gerado antes do deploy volta como saldo (seção 5).
