# `src/server/db/repositories/` — uma tabela por arquivo

Cada arquivo conhece a SQL de **uma** tabela (ou de um par inseparável) e nada mais. Nenhum
repositório importa outro, exceto `state.ts`, que é o montador.

| Arquivo | Tabela(s) | Substitui, no blob | Escrita |
|---|---|---|---|
| `users.ts` | `users` | `state.users[email]` sem `coins` | inserir · atualizar · remover |
| `coins.ts` | `coins` + `nfts` | `user.coins[]` (moeda com recibo embutido) | inserir · atualizar · remover |
| `offers.ts` | `sell_offers`, `buy_orders` | `state.sellOffers`, `state.buyOrders` | inserir · atualizar · remover |
| `trades.ts` | `trades` | `state.trades` | **só inserir** (append-only) |
| `envios.ts` | `envios` | `state.envios` | inserir · atualizar · remover |
| `account.ts` | `deposits`, `custody_charges` | `state.deposits`, `state.custodyCharges` | inserir (append-only) · upsert |
| `seq.ts` | `seq` | `state.seq` — **e a trava de escrita** | atualizar |
| `state.ts` | todas as do M1 | o `AppState` inteiro | `carregarEstado`, `persistirEstado` |
| `payments.ts` | `payment_events`, `payment_intents` | (não entram no `AppState`) | reivindicar · concluir · recusar |
| `rastreios.ts` | `rastreios` | (não entra no `AppState`) | upsert |
| `ledger.ts` | `ledger_entries` | (não entra no `AppState`) | **só inserir**; `ultimoHash`, `listar`, `saldosPeloLedger` |
| `auditoria.ts` | `audit_log` | — | **só inserir**; `listar` |
| `contabil.ts` | `parametros_contabeis`, `contas_contabeis`, `lancamentos_manuais`, `exportacoes` | — | `garantirCatalogos` (upsert do domínio) · gravar parâmetro · inserir lançamento/estorno · registrar exportação |

## As três regras dos repositórios

1. **Recebem uma `Consulta`, nunca abrem conexão.** Quem abre é o `Executor` (`../client.ts`
   em produção, PGlite nos testes).
2. **Devolvem o tipo do domínio já pronto**, com `num()` aplicado a todo `bigint`/`integer`.
   Nenhum `string` de saldo escapa daqui.
3. **A ordem de leitura é parte do contrato.** `ORDER BY ord` (usuários, envios),
   `ORDER BY created_at, ord` (livro), `ORDER BY owner_email, posicao` (moedas), `ORDER BY id`
   (histórico). Mudar a ordem muda o que `sellToBid` vende primeiro e quem o motor casa
   primeiro no empate.

## `state.ts` — o montador

`carregarEstado(tx, { travar })`: trava `seq` **primeiro** (se pedido), depois dispara as
oito leituras em paralelo na mesma transação e monta o `AppState`.

`persistirEstado(tx, antes, depois)`: pede a lista ao planejador (`../diff.ts`) e executa
operação por operação, **em sequência** — a ordem é a das chaves estrangeiras.

## Conexões

- `../diff.ts` define as formas canônicas (`UserRegistro`, `CoinRegistro`, `TradeRegistro`)
  que os repositórios leem e gravam. Mudou a forma lá, muda a SQL aqui.
- `../migrations/*.sql` é o schema que estas consultas assumem. Coluna nova entra na próxima
  migration **e** no repositório, no mesmo commit.
- `../derivar.ts` é quem decide o que `ledger.ts` e `auditoria.ts` gravam a cada mutação;
  `../estado.ts` é quem chama, dentro da transação.
