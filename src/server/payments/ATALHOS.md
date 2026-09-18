# Atalhos assumidos em `src/server/payments/`

Cada item também está em [`RISCOS_ASSUMIDOS.md`](../../../RISCOS_ASSUMIDOS.md), na raiz.

---

## RA-24 ✅ — pago em 18/09/2026 (E8)

**Arquivos:** `conciliacao.ts`, `src/server/actions/payments.ts` (`iniciarCompraDireta`), `src/app/(app)/mercado/page.tsx`

A compra direta pelo gateway cobra do comprador o mesmo total que o modal de `/mercado` mostra:
`custoDeCompraPorMoeda(price, taxas) × qty`, com a Tabela de Taxas vigente. A comissão por moeda
fica congelada na metadata da intenção — o valor cobrado não muda depois de a cobrança abrir —, e
`liquidarCompraDireta` grava no `Trade` `feeComprador` (o congelado), `feeVendedor` (a tabela da
aprovação, regra da E2) e `fee` igual à soma. O depósito que explica a compra cobre os dois lados,
e o livro-razão fecha com `ajustes` vazio.

**Não é atalho:** as duas comissões vêm de momentos diferentes de propósito. O comprador já pagou
quando a cobrança abriu; o vendedor está recebendo agora.

---

## RA-56 🟡 — pagamento aprovado que não pode liquidar vira saldo

**Arquivo:** `conciliacao.ts`

Quatro situações fazem um pagamento aprovado não entregar o que foi comprado: lote indisponível,
preço que subiu depois da cobrança, vendedor com fatura de custódia vencida e retirada que não pode
ser liquidada (fatura vencida ou recibo bloqueado). Nos quatro, o valor entra **inteiro no saldo** de
quem pagou, e não volta pelo gateway — a conta da empresa não tem chamada de saída credenciada.

O atalho é a tela: `PainelPagamento` mostra "Pagamento confirmado com sucesso!" também nesses casos.
O motivo existe e é devolvido pela conciliação, e na retirada entra no histórico, mas a tela de
pagamento não o exibe. Detalhe em `RISCOS_ASSUMIDOS.md`.
