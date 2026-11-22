# Manutenção 22-11 · T1 Financeiro e saldos — MD de execução

## RETOMADA
- **Estado (22/11/2026):** N1 e N2 codificados, SEM commit/push, SEM build. `npm run typecheck` verde; vitest verde em `statement-totais`, `statement-invariante`, `admin/financeiro`.
- **Falta:** commit/push pelo chat Merge/Deploy; conferir a tela em produção (cartão "Saldo dos clientes", tabela de reconciliação, ficha do Rogério = Taxas pagas R$ 554,70).
- **Decisões que esperam o Gabriel:** (1) como sanar o aviso da cadeia de hashes (abaixo); (2) conta da equipe fica dentro do "Saldo dos clientes"? (hoje só a conta da Áurea sai, e só quando `…AUREA_CONTA_PROPRIA_EMAIL` estiver ligada — depende da T2).

## Feito
1. Revisadas as edições locais (statement.ts, AbaFinanceiro, extrato, export): corretas; custódia estornada e tarifas tratadas.
2. `src/domain/admin/financeiro.ts`: `saldoDosClientes` (disponível + em reserva + reconciliação por tipo de lançamento, "diferença a explicar" sempre visível).
3. `src/server/admin/resultados.ts`: `DadosFinanceiro.saldoClientes`.
4. `Financeiro.tsx`: cartão Saldo dos clientes, definições nos cartões (Receita bruta, Depósitos de clientes, Custódia faturada), seção "Saldo dos clientes: de onde vem cada centavo", aviso da cadeia reescrito.
5. `server/admin/ficha.ts` + `AbaFinanceiro.tsx`: `resumo` (disponível/reserva/total), "Taxas pagas" com composição (mesmas palavras do extrato do cliente), coluna "Saldo depois".
6. Testes: `statement-totais.test.ts` (conta do Rogério: taxas 554,70; saldo 185,30), mais casos em `admin/financeiro.test.ts`.

## Investigação do aviso "cadeia de hashes não confere" (SÓ LEITURA, produção)
- 382 lançamentos; ponteiros `hash_anterior` íntegros; **4 linhas não reproduzem o próprio hash**: ids 493, 495, 499, 500, todas da conta `clarissepottier055@gmail.com`.
- Causa provada: o e-mail da conta foi corrigido de `…@gamil.com` para `…@gmail.com` (audit_log 1209/1210, 10/11/2026) e `trocar e-mail` faz `UPDATE ledger_entries SET user_email` (`src/server/db/repositories/users.ts:234`). `user_email` entra no hash; recalculando com `gamil`, os 4 hashes conferem.
- Dinheiro: Σ ledger = `users.balance` em TODAS as contas (zero divergência). Não é perda nem erro de saldo.
- NÃO corrigido (ledger é append-only). Opções, só com "sim": (a) recalcular a cadeia a partir do id 493 com o e-mail novo (é reescrever histórico); (b) aceitar a quebra e registrar a exceção documentada; (c) corrigir o código para NÃO reescrever `user_email` do ledger na troca de e-mail (guardar o e-mail original/identificador estável) — recomendo (c) para o futuro + decisão do Gabriel sobre (a)/(b) para as 4 linhas. Fora do meu Touch: `users.ts`.

## Cadeia do livro-razão refeita (autorizado pelo Gabriel: "Recalcular cadeia", 22/11/2026)
- Produção, uma transação com `LOCK TABLE aurea.ledger_entries`: recalculados `hash_anterior`/`hash` dos ids 493–624 (132 linhas; a correção do e-mail cascateia nos hashes seguintes). Nenhum campo de valor, saldo, e-mail ou texto foi alterado — só os hashes.
- Conferência depois: 382 lançamentos, 0 quebras; Σ ledger = `users.balance` em todas as contas.
- Backup dos hashes antigos: `side-session-notes/local_e60062ca-…/ledger-backup-hashes-2026-11-22.json` (fora do repo).
- Pendente (código, fora do Touch T1): `users.ts:234` ainda reescreve `user_email` do ledger na troca de e-mail e quebrará a cadeia de novo na próxima troca.

## Troca de e-mail sem reescrever o livro-razão (pedido do Controle, 22/11/2026)
- `users.ts`: sai o `UPDATE ledger_entries SET user_email`; entra `email_historico` (de/para, repontando gerações anteriores).
- **Migration 058** (`058_historico_de_email.sql`): tabela `email_historico` + remove a FK `ledger_entries_user_email_fkey` (era ela que forçava reescrever o livro). **NÃO APLICADA no banco**: precisa entrar ANTES de publicar o código (a troca de e-mail escreve na tabela nova). Merge/Deploy: `npm run db:migrate` antes do push.
- Leitura por conta junta as gerações: `ledger.ts` (`emailsDaConta`, `listarLancamentos` com filtro, `saldosPeloLedger`) e `admin-usuarios.ts` (`datasDeCriacao`). `listarLancamentos()` sem filtro devolve o e-mail da época (necessário para verificar o hash).
- Limite conhecido: relatórios que agrupam o livro inteiro por e-mail (`relatorios/dados.ts`, `admin/moedas.ts`) veem o e-mail da época nas linhas antigas.
- Testes: `troca-email.test.ts` (livro intocado, histórico, leitura pelas duas gerações), `db.test.ts` (lista de tabelas).
- `statement.test.ts` verde: a expectativa mudou de propósito — "taxas pagas" agora inclui a custódia, e o comprador paga o 1º mês (R$ 2,00) na compra; o teste confere comissões 243 + custódia 200 = 443.
- typecheck verde; vitest verde em statement, statement-totais, troca-email, db.
- **Migration 058 APLICADA em produção em 22/11/2026** (npm run db:migrate; tabela criada, FK removida). Falta só publicar o código.
