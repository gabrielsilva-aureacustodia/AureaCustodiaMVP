# Análise — o extrato do cliente × o saldo da conta (frente F, item 15 do Rogério)

```
Data:      2026-11-18          Base: main = 0f55132 (já com as frentes I, D, C, B, E, H e A)
Pergunta:  "o extrato tem que refletir o saldo real da conta" — por que o cliente vê dois números e não sabe qual é o verdadeiro?
Fonte:     src/domain/statement.ts (extrato) · src/server/db/derivar.ts + src/domain/ledger.ts (o livro-razão, que fecha com o saldo por construção)
Estado:    arquivo de trabalho local, sem commit
```

## 1. Em uma frase

O número do topo e o do cabeçalho do extrato **são o mesmo** (`me.balance`). O que não fecha é a **lista de linhas**: ela soma
um valor diferente do saldo, porque **faltam linhas** (frete, taxa de retirada, estorno, ajuste), **sobram linhas** (a entrada por
Pix de um serviço aparece sem a saída que a paga) e **não existe a coluna "saldo depois"** para o cliente conferir linha a linha.
O livro-razão (ledger) já fecha ao centavo; o extrato é que não é derivado dos mesmos fatos.

## 2. O mapa: o que mexe no saldo × o que o extrato mostra hoje

Convenção dos exemplos: centavos escritos em reais. Comissão padrão 0,5% + R$ 1,00 por moeda, **dos dois lados**; custódia R$ 2,00;
frete PAC R$ 11,60; taxa de retirada comum R$ 50,00; saque de R$ 100,00 com tarifa de R$ 5,00. "Diferença" = soma do extrato − saldo
real (deveria ser zero).

| # | Evento (o que o saldo faz) | Quem grava | O extrato de hoje mostra | Diferença (exemplo) |
|---|---|---|---|---|
| 1 | **Depósito em conta** por Pix/cartão (+) | `deposits` | ✔ "Depósito em conta por Pix" +R$ 200,00 | 0 |
| 2 | **Compra** (−preço −comissão de compra) | `trades.feeComprador` | ✔ −R$ 202,00 (venda de R$ 200,00) | 0 |
| 3 | **Venda** (+preço −comissão de venda) | `trades.feeVendedor` | ✔ +R$ 198,00 | 0 |
| 4 | **1º mês de custódia embutido na compra** (−R$ 2,00, fatura `origem:'compra'`, forma saldo) | `faturasCustodia` | ✔ linha "Taxa de custódia" −R$ 2,00 | 0 |
| 5 | **Fatura de custódia paga com saldo** (−) | `faturasCustodia` (`forma: saldo`) | ✔ −R$ 2,00 | 0 |
| 6 | **Fatura de custódia paga por Pix/cartão** (entra +R$ 2,00 e sai −R$ 2,00 no mesmo instante: o saldo não muda) | `deposits` + `faturasCustodia` | ✘ a **entrada** aparece (+R$ 2,00); a **saída** não (a fatura entra com impacto 0) | **+R$ 2,00** (extrato diz +2,00, saldo não saiu de 0) |
| 7 | **Frete do envio pago com saldo** (−R$ 11,60) | `envios[].frete` | ✘ nenhuma linha (o envio entra com impacto 0) | **+R$ 11,60** (extrato alto demais) |
| 8 | **Frete do envio pago por Pix/cartão** (entra e sai) | `deposits` + `frete` | ✘ só a entrada +R$ 11,60 | **+R$ 11,60** |
| 9 | **Estorno do frete** (envio desconsiderado ou cancelado — frentes H e K) (+R$ 11,60) | `frete.status='estornado'` | ✘ nenhuma linha | 0 nos dois casos, mas **só por coincidência** e **invisível**: com saldo, o frete e o estorno somem juntos; com Pix, a entrada +R$ 11,60 fica sozinha e acerta a conta por acaso |
| 10 | **1º mês de custódia pago junto com o frete do envio** (frente B; saldo ou Pix) | `faturasCustodia` `origem:'contratacao'` | mesmo defeito das linhas 5 e 6 | +R$ 2,00 por moeda no caso do Pix |
| 11 | **Estorno do 1º mês** (cancelar envio, frente H: `estornarFaturaPaga`) (+R$ 30,00 no caso do Rogério) | fatura `paga → cancelada` | ✘ a fatura some do cálculo (impacto 0) e **o estorno não aparece** | 0 nos dois casos, **só por coincidência** (com saldo, a saída e a volta somem juntas; com Pix, a entrada fica sozinha); o cliente nunca vê a devolução |
| 12 | **Estorno do plano por moedas recusadas na análise** (+) | `plano.estornadoCents` | ✘ nenhuma linha | **−R$ 2,00** por moeda recusada (plano pago com saldo) |
| 13 | **Taxa de retirada física paga com saldo** (−R$ 50,00) | `retiradas[].pagoEm` | ✘ nenhuma linha | **+R$ 50,00** |
| 14 | **Taxa de retirada paga por Pix/cartão** | `deposits` + `retiradas` | ✘ só a entrada +R$ 50,00 | **+R$ 50,00** |
| 15 | **Saque pedido** (−R$ 105,00: líquido R$ 100,00 + tarifa R$ 5,00, sai do saldo **no pedido**) | `saques` | ✔ −R$ 105,00 com status técnico (`solicitado`, `em_processamento`) | 0 |
| 16 | **Saque recusado** (volta +R$ 105,00) | `saques.status='falhou'` | ✘ continua mostrando −R$ 105,00 "· falhou"; o estorno não existe | **−R$ 105,00** (extrato diz que saiu; o saldo já voltou) |
| 17 | **Ajuste de saldo pela equipe** (± valor) | só o ledger (`ajuste`) e `audit_log`; **nada no `AppState`** | ✘ nenhuma linha | **± o valor do ajuste** (R$ 50,00 a mais na conta = −R$ 50,00 de diferença) |
| 18 | **Saldo inicial** da conta (seed ou conta trazida) | só o ledger (`saldo_inicial`) | ✘ nenhuma linha (o teste antigo "fechava" porque somava o saldo inicial por fora) | **± o saldo trazido** |
| 19 | **Oferta de compra pré-paga** — dinheiro **em reserva**: sai do saldo ao pagar com saldo (ou nem entra, se por Pix), fica preso à oferta e vira a compra no casamento; cancelar a oferta o devolve | `buyOrders[].pagoAntecipadoCents` (só o valor ainda preso) | ✘ a reserva não aparece em lugar nenhum; a compra aparece como −R$ 202,00 **sem ter saído do saldo** | **+R$ 202,00** na compra feita com valor da reserva; o dinheiro preso (ex.: R$ 400,00) é invisível |
| 20 | **Saque pedido e ainda não pago** (dinheiro já saiu do saldo e ainda não chegou ao banco) | `saques.status ∈ {solicitado, em_processamento}` | só como linha de saída | o cliente não tem onde ver "quanto está a caminho" |
| 21 | **Primeiro mês recebido fora** (`custodia_recebida_fora`, 14/11) (entrada +R$ 2,00 e fatura −R$ 2,00 no mesmo instante) | `deposits` + fatura `saldo` | ✔ as duas linhas já aparecem | 0 |
| 22 | **Compra direta por Pix** (entra preço+comissão+custódia; sai a compra e a custódia) | `deposits` + `trades` + fatura `compra` | ✔ fecha (a custódia da compra é fatura paga "saldo") | 0 |
| 23 | **Troco / pagamento que virou saldo** (lote sumiu, valor menor que a fatura…) | `deposits` | ✔ como depósito | 0 |
| 24 | **Fatura emitida e ainda em aberto** (não mexe no saldo) | `faturasCustodia` | ✔ linha informativa, impacto 0 | 0 |
| 25 | **Envio ao cofre** (não mexe no saldo) | `envios` | ✔ linha informativa, impacto 0 | 0 |

**Reserva pós-paga** (`reservas`, 10 minutos) **não mexe no saldo** enquanto aberta, e quando é paga vira a compra normal (linha 2).

## 3. Os quatro defeitos, na ordem do que o cliente sente

1. **Faltam saídas** (7, 8, 13, 14, 6): o cliente paga frete, taxa de retirada ou custódia por Pix e o extrato mostra o dinheiro
   **entrando** e nunca **saindo**. Ao somar de cima para baixo o extrato diz que ele tem mais do que tem. É o caso que mais
   deve ter gerado a dúvida do Rogério: o frete de todo envio novo (22/10) e o 1º mês (17/11) passam por aqui.
2. **Faltam estornos** (9, 11, 12, 16): o dinheiro volta ao saldo e o extrato não conta. As frentes H e A criaram **mais** motivos
   para o dinheiro voltar (cancelar envio, estornar fatura); sem a linha o cliente vê o saldo subir "do nada".
3. **Falta a conta inteira**: ajuste da equipe e saldo anterior (17, 18) não existem fora do livro-razão, e o dinheiro em
   reserva (19, 20) não tem lugar. O saldo do topo já os leva em conta; o extrato não.
4. **Não existe "saldo depois"**: o cliente não consegue conferir linha a linha onde o extrato deixou de bater com o saldo.

## 4. O que NÃO é divergência (já confere)

Depósito, compra, venda, comissão dos dois lados, custódia paga com saldo, custódia da compra, compra direta, troco, primeiro mês
recebido fora, e as linhas informativas (envio, fatura em aberto). O cabeçalho "Saldo atual" lê `me.balance`, **o mesmo** número
da barra superior (`Topbar`, linha 277): a frente não muda a conta do saldo (fora de escopo).

## 5. O que o extrato novo faz (decisões desta frente, todas reversíveis em uma linha)

- Cada fato que mexe no saldo vira linha **com a mesma regra do livro-razão**: fatura **paga** sempre sai do saldo (por saldo, Pix
  ou cartão — nos dois últimos a entrada correspondente já aparece como linha própria e as duas se anulam, como no ledger); frete
  pago sai; frete estornado volta; taxa de retirada paga sai; fatura paga e depois cancelada volta; estorno do plano volta;
  saque recusado volta.
- A coluna **"Saldo depois"** vem de cada linha (acumulada, na ordem do tempo) e **a última é sempre o saldo do topo**.
- O que o extrato **não consegue explicar** (ajuste da equipe, saldo anterior, valor que passou pela reserva pré-paga) vira **uma
  linha própria no começo**, "Saldo anterior e ajustes da equipe": o extrato nunca esconde a diferença nem a inventa, e o teste de
  invariante falha se essa linha aparecer onde não devia.
- **Reserva** aparece **separada do saldo disponível**: *Em reserva = ofertas de compra pré-pagas abertas + saques ainda a caminho*;
  *Total = Disponível + Em reserva*; o topo continua mostrando o **disponível**, o mesmo número do cabeçalho do extrato.
- Linguagem de cliente: "Frete do envio RO-ENV-0007", "Estorno do frete do envio…", "Taxa de retirada da moeda RO-000042",
  "Saque em análise / pago / recusado", "Ajuste da equipe" — sem "estorno de ledger", "compra de ativo", "lançamento".

## 6. Limite conhecido (fora da Touch desta frente — para o Controle decidir)

**Oferta de compra pré-paga:** o estado **não guarda** o valor total que entrou nem o que foi gasto na compra (só o saldo preso de
cada oferta ainda aberta; `Trade` não diz de que forma foi paga). Por isso o dinheiro **já gasto** pela reserva cai na linha
"Saldo anterior e ajustes" e o dinheiro **ainda preso** aparece em "Em reserva". O ledger tem o mesmo buraco e o resolve com um
`ajuste` (veja `devolverLastroDoBid`). Para fechar de vez seria preciso registrar a entrada do pré-pago (um `Deposit` com
`origem:'oferta_prepaga'`) e a modalidade no `Trade` — mexe em `types.ts` e na conciliação, e ficou fora (ficha: Do not touch).

## 7. O que o teste de invariante prova (T2/T3)

Para cada fixture (depósito, compra, venda, frete por saldo e por Pix, 1º mês, cancelamento de envio, estorno de fatura paga,
estorno do plano, saque pago e recusado, retirada, ajuste, custódia recebida fora, pré-paga):
**saldo da conta = soma dos impactos das linhas** (inclusive a linha "Saldo anterior e ajustes"); **a linha de ajuste só existe
quando o fixture faz um ajuste de verdade**; e **última linha "saldo depois" = saldo do topo**. Esse arquivo é
`src/domain/statement-invariante.test.ts` e o Controle o **reexecuta depois do merge de B e H**.

## 8. Resultado (18/11/2026, mesma sessão)

- **T2 vermelho de verdade:** o teste `statement-invariante.test.ts` (17 cenas) foi escrito contra a API nova e **falhou 17 de 17** com o
  código antigo. Em 16 delas a falha era a soma: ex.: frete por Pix, extrato **+R$ 11,60** × saldo **R$ 0,00**; 1º mês + frete por Pix,
  extrato **+R$ 21,60** × saldo **R$ 0,00**. A 17ª (depósito + venda, que já fechava) só falhou porque ainda não existia `saldoApos`.
- **T3 verde:** depois de `userStatement`/`resumoDaConta` novos, as 17 cenas passam, e `statement.test.ts` (5) e
  `statement-custodia.test.ts` (4) foram atualizados para a regra nova (fatura paga por Pix agora sai; o saldo anterior é uma linha).
- Os testes antigos mudados, e por quê: o primeiro de `statement.test.ts` somava o saldo inicial por fora (agora é a linha "Ajuste de saldo");
  o de `statement-custodia.test.ts` afirmava que fatura paga por Pix tinha impacto 0 — era exatamente o defeito 6 da tabela.
