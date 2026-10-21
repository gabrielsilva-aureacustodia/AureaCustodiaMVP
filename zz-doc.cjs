const fs=require('fs');
let t=fs.readFileSync('CLAUDE.md','utf8');
const a="herdava os meses restantes. **Nada disso vale mais.** Quem compra moeda em custódia simplesmente\n  paga o próximo mês, como qualquer outra moeda que guarde.";
if(!t.includes(a)) throw new Error('ancora');
t=t.replace(a,"herdava os meses restantes. **Nada disso vale mais.** (A seção seguinte, de 21/10/2026, diz o que vale para a\n  moeda comprada.)");
const b="- **Saque é aprovado pela equipe, e só pela equipe**";
const i=t.indexOf(b); if(i<0) throw new Error('b');
const novo=[
"- **TODA moeda tem a custódia do DONO ATUAL paga — inclusive a comprada, mesmo que o vendedor já tenha pago**",
"  (Gabriel, 21/10/2026, depois que o \"Gerais\" comprou moeda já paga pelo vendedor e a anunciou sem pagar nada).",
"  A cobertura de custódia é do dono, nunca da moeda: `custodiaPagaAteCompetencia`, `coberturaPagaDaMoeda` e",
"  `custodiaResolvidaNaCompetencia` só contam plano e fatura **do dono atual**, emitidos depois da compra",
"  (`donoAtualDaMoeda`, `src/domain/bloqueio-por-debito.ts`). Para isso não depender de ninguém lembrar de pagar, **o",
"  primeiro mês entra na própria compra, em qualquer forma de pagamento**: `custoDeCompraPorMoeda` = preço +",
"  comissão de compra + `custodiaDaCompraPorMoeda` (R$ 2,00, da tabela vigente), e `transferirMoedaVendida` cria, na",
"  mesma transação, uma fatura **já paga** do comprador (`origem: 'compra'`, `src/domain/custodia-da-compra.ts`) que",
"  cobre os 30 dias seguintes. O ciclo da moeda recomeça na compra (`transferCoin` grava o dia de **Brasília** em",
"  `entrada`) e o cron cobra o dono novo no aniversário seguinte. Saldo que cobre preço + comissão mas não a custódia",
"  não compra. A custódia **não** entra na comissão nem em `Trade.fee`: é receita de custódia (ledger `custodia`, DRE",
"  3.1.02). Quem mexe numa compra nova precisa debitar `custoDeCompraPorMoeda` — e nunca `price + comissão`. Pop-ups de",
"  compra mostram a linha \"Custódia (1º mês)\" com o sinal (i) (`LinhaCustodiaNaCompra`).",
""].join("\n");
t=t.slice(0,i)+novo+t.slice(i);
fs.writeFileSync('CLAUDE.md',t);
