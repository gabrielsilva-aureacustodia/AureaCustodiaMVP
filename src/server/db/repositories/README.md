# `src/server/db/repositories/` — uma tabela por arquivo

Cada arquivo conhece a SQL de **uma** tabela (ou de um par inseparável) e nada mais. Nenhum
repositório importa outro, exceto `state.ts`, que é o montador.

| Arquivo | Tabela(s) | Substitui, no blob | Escrita |
|---|---|---|---|
| `users.ts` | `users` | `state.users[email]` sem `coins` | inserir · atualizar · remover |
| `coins.ts` | `coins` + `recibos` | `user.coins[]` (moeda com recibo embutido) | inserir · atualizar · remover |
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

## Repositórios do painel administrativo (frente C)

Nenhum deles entra no `AppState`; quem chama é `src/server/admin/`.

| Arquivo | Tabela(s) | Escrita |
|---|---|---|
| `admin-rbac.ts` | `admin_permissoes`, `admin_papeis`, `admin_papel_permissoes`, `admin_membros` (migration 020) | upsert do catálogo (set-based) · inserir e atualizar membro · criar, atualizar e excluir papel · substituir concessões. Lê `users.name` para o nome no cabeçalho |
| `eventos-uso.ts` | `eventos_uso` (migration 021) | **só inserir**, um `unnest` por lote; `listarEventos`, `contarEventosDesde` |
| `painel-leituras.ts` | `audit_log` (003), `ofertas_historico` (A2, 015), `aceites_documentos` (A3, 016) e `recebimentos_gateway` (B1, 017) | **nenhuma** — só leitura. A trilha filtrada por trecho do ator e começo da ação; histórico da fila, aceites e recebimentos (também por conta, para a ficha do usuário) devolvem `null` enquanto a tabela da outra frente não existir (`to_regclass`) |
| `cs.ts` | `cs_canais`, `cs_contatos`, `cs_conversas`, `cs_mensagens` (022), `cs_notas`, `cs_etiquetas`, `cs_conversa_etiquetas` (023) | canal, contato e conversa por upsert · mensagem recebida com `ON CONFLICT DO NOTHING` (reentrega não duplica) e enviada com `ON CONFLICT DO UPDATE` do autor (o eco do webhook vira a mesma linha) · **notas só inserir** · etiquetas. Lê `users.telefone` para casar o contato com a conta |
| `admin-usuarios.ts` | `admin_notas_usuario`, `admin_situacao_contas` (023) | **só inserir** nas duas. Lê a data de criação das contas (primeiro `saldo_inicial` do ledger), a trilha e o registro de uso de uma conta |
