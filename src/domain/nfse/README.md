# `src/domain/nfse/` — a regra pura da nota fiscal (NFS-e)

Sem React, sem rede, sem banco. Decide **que nota cada operação gera** e **como é o XML** do pedido de nota
(DPS) que vai à Sefin Nacional. Quem grava e envia é `src/server/nfse/`.

| Arquivo | O que faz |
|---|---|
| `codigos.ts` | A tabela fiscal de cada serviço — o espelho das três NFS-e que o contador emitiu em 22/10/2026 (custódia 11.04.01/001, intermediação 10.05.01/003, NBS, cIndOp, CST/cClassTrib, `tpOper`, `indFinal`), o emitente e os campos federais. Mudou o entendimento do contador? Muda só aqui |
| `pedidos.ts` | `pedidosDeNfse(antes, depois)`: compara os dois retratos do estado e devolve os pedidos de nota — dois por negociação nova (comprador e vendedor), um por fatura de custódia que passou a **paga** (nunca a fatura em aberto), um por saque novo com tarifa e um por retirada que passou a paga. `cancelamentosDeNfse`: o saque que passou a `falhou` cancela a nota da tarifa. Mesma convenção `TRADE-n` do ledger |
| `dps.ts` | `montarDps`: o XML da DPS na ordem do XSD, numa linha só, texto em Latin-1 maiúsculo; os leiautes v1.01 e NT 009 (a partir de 01/12/2026) e o formato de transição que a produção restrita aceitou em 23/10/2026; `problemasDoPedido` barra cadastro incompleto antes de ir ao governo |
| `eventos.ts` | `montarCancelamento`: o pedido de cancelamento (evento 101101, Anexo II), usado quando o saque é recusado e a tarifa volta ao saldo |
| `nfse.test.ts` | Reproduz as três notas do contador campo a campo e as regras de quando uma nota nasce |

## Conexões

- **Quem chama `pedidosDeNfse`:** `src/server/db/estado.ts` (`mutarEstado`), na mesma transação do ledger.
- **Quem chama `montarDps`:** `src/server/nfse/emissao.ts`.
- **As regras de negócio por trás:** `docs/fiscal-contabil/REGRAS_FISCAIS_E_CONTABEIS.md` (R2, R3, R5) e
  `docs/fiscal-contabil/NFSE_MODELOS_DO_CONTADOR.md`.
