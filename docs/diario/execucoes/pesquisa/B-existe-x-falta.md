# Frente B — o que existe × o que falta (compra e envio)

> Arquivo de trabalho LOCAL da frente B (não se commita). Escrito em 17/11/2026 pela Execução, no T1.

## Conclusão (sem rodeio)

**Compra: não falta nada.** As seis vias de compra passam por uma função só, `transferirMoedaVendida`
(`src/domain/market.ts`), que chama `registrarCustodiaDaCompra` e cria a fatura PAGA do 1º mês do comprador. O
dinheiro do mês também sai em todas elas, porque cada via debita `custoDeCompraPorMoeda` (preço + comissão + mês da
tabela). Agora há um teste por via provando as duas metades: `src/server/actions/primeiro-mes-em-toda-compra.test.ts`
(10 testes, verdes). A tabela do teste é de R$ 3,50 de custódia, e não os R$ 2,00 do código: nenhuma via tem número
fixo.

**Envio: faltava, e é o resto da frente.** Hoje o envio tem dois pagamentos separados — o do plano (passo 3 do
wizard, "Pagar depois" permitido) e o do frete (passo 4). O pedido do Rogério é UM pagamento, frete + 1º mês.

## Compra — via por via

| Via | Código que cria a fatura | Débito do mês | Teste novo |
|---|---|---|---|
| Saldo — compra de lote | `buyLot` (`actions/market.ts`) → `transferirMoedaVendida` | `buyer.balance -= custoUnit` | `buyLot: compra do lote…` |
| Pix — compra direta | `liquidarCompraDireta` (`payments/conciliacao.ts`) → `transferirMoedaVendida` | cobrança do gateway = `custoDeCompraPorMoeda × qty` | `Pix: o pagamento confirmado…` |
| Cartão — compra direta | idem (mesmo liquidador, método `checkout_pro`) | idem | `cartão: o mesmo total…` |
| Oferta de compra a saldo (motor) | `matchOrders` (`domain/market.ts`) | `buyer.balance -= custoUnit` | dois testes (comprador antes e depois da venda) |
| Oferta de compra pré-paga (motor) | `matchOrders` | sai do valor preso (`pagoAntecipadoCents`), que já nasce com o mês | `o valor preso já leva o mês…` |
| Venda a uma oferta de compra | `sellToBid` (`actions/sell.ts`) | `buyer.balance -= custoDeCompraPorMoeda` | `sellToBid: …` |
| Reserva pós-paga (oculta na tela) | `pagarReservaComSaldo` e `liquidarReservaCompra` | `r.totalCents` (já leva `custodiaCents`) | dois testes (saldo; Pix pela conciliação) |

## Observações que não são lacuna (para o Controle saber)

1. **Pix aberto antes de uma mudança de tabela.** A cobrança congela `custodiaPorMoeda` na intenção, mas a conciliação
   chama `transferirMoedaVendida(..., regras.taxas)` com a tabela de AGORA. Se a equipe mudar o preço da custódia
   entre abrir e confirmar o Pix, a fatura de compra sairia com o preço novo e o dinheiro cobrado seria o antigo. Janela
   de minutos, risco baixo, arquivo fora do Touch (`conciliacao.ts` só na parte do frete). Levo ao chat de branch; não mexi.
2. **Reserva sem `custodiaCents`.** `abrirReserva` aceita `custodiaCents` opcional (`?? 0`). O único chamador
   (`matchOrders`) sempre o passa, então hoje não há reserva sem o mês. Um chamador novo que esquecesse cobraria a
   reserva sem o mês e a fatura sairia paga (o ledger mostraria um `ajuste`). Sem ação.

## Envio — o que existe (antes desta frente)

- `createProtocol` cria o protocolo; o wizard, no passo 3, chama `contratarPlanoCustodia` (cria `PlanoCustodia` +
  fatura `contratacao` pendente) e oferece pagar agora **ou depois**.
- O frete (passo 4) é cobrado à parte: `pagarFreteComSaldo`, `iniciarPixFrete`, `iniciarCartaoFrete`, liquidado por
  `liquidarFreteEnvio` na conciliação. Debita só `frete.valorCents`.
- No aceite da moeda (`advanceAnalysis` e a bancada `fecharAnalise`), `alimentarPlanoNaAnalise` liga a fatura de
  contratação às moedas aceitas; já devolvia o mês das moedas recusadas quando o plano estava pago
  (`plano.estornadoCents`, lançamento `estorno` em `derivar.ts`).

## Envio — o que falta (a frente B fecha)

1. Cobrar frete + 1º mês **numa só cobrança**, por saldo, Pix e cartão. Valor do mês = quantidade × `custodiaMensalPorMoeda`
   da tabela vigente.
2. Wizard sem opção "pagar depois"/"não contratar": linhas *Frete* e *1º mês de custódia* e o total.
3. Recusa na análise: o mês das moedas recusadas já volta ao saldo (existia); falta teste do caminho novo.
4. Ligação mês ↔ protocolo para a frente H (já existe: `PlanoCustodia.protocoloEnvio` → fatura `planoId`); falta o
   auxiliar de localização e o de estorno que H vai usar.

## Pergunta ao contador (levada ao `registro/B.md`)

1. Pagamento antecipado do envio: a NFS-e do 1º mês sai **na data do pagamento** (regra vigente) ou **no aceite**
   da moeda? Com o pagamento único isso passa a acontecer em todo envio.
2. Moeda recusada depois do pagamento antecipado: o valor volta ao saldo (lançamento `estorno`), mas a nota emitida
   pela fatura inteira não é cancelada nem ajustada hoje (`cancelamentosDeNfse` só trata fatura paga→cancelada e
   saque recusado). Cancelar e reemitir pelo valor das aceitas, ou nota de ajuste?
