# Atalhos assumidos em `src/server/payments/`

Cada item também está em [`RISCOS_ASSUMIDOS.md`](../../../RISCOS_ASSUMIDOS.md), na raiz.

---

## RA-24 🟡 — compra direta pelo gateway não cobra a comissão do comprador

**Arquivos:** `conciliacao.ts`, `src/server/actions/payments.ts` (`iniciarCompraDireta`), `src/app/(app)/mercado/page.tsx`

- Ao liquidar a compra direta de lote via gateway (`liquidarCompraDireta` em `conciliacao.ts`), a
  comissão do vendedor é descontada pela tabela vigente lida de `carregarTabelaDeTaxas()` e
  gravada no `Trade` com `feeVendedor`, `feeComprador: 0` e `fee` (E2, 15/09/2026), fechando o
  livro-razão sem lançamentos de ajuste.
- A cobrança externa gerada em `iniciarCompraDireta` continua cobrando apenas o valor do lote
  sem comissão do comprador, e o modal de `/mercado` exibe o resumo com comissão enquanto o gateway
  cobra o subtotal.

**O que falta:** somar a comissão do comprador à intenção de cobrança em `iniciarCompraDireta`,
gravar `feeComprador` no `Trade` com a comissão cobrada do comprador e ajustar a exibição no modal
de `/mercado`.

**Como se paga:** E8 (segunda onda), após a integração das branches E1 a E7.
