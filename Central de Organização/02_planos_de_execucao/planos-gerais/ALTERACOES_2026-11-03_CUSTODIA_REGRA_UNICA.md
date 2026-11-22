# Custódia: uma regra só (03/11/2026)

Pedido do Gabriel: "esse erro nunca para de acontecer [...] você precisa DE FATO corrigir esse problema para todos os
usuários, nem que reescreva tudo". Decisão dele no mesmo dia: **zerar as regras, manter os pagamentos** ("Sim, reescreva").

## O que estava errado

O Sidnei pagou em 27/10 a custódia do envio RO-ENV-0019; a moeda RO-000182 foi aceita em 30/10 e travou em 01/11, pedindo
pagamento "até 01/11". No mesmo dia o cron emitiu uma "renovação do plano" para ele e **debitou R$ 2,00 do Rogério** pela
renovação de um envio (RO-ENV-0017) sem moeda nenhuma.

A causa não era um bug pontual: havia **dois modelos de cobrança vivos ao mesmo tempo** —

1. o "plano" contado por **mês do calendário** (`pagoAteCompetencia`; pago em 27/10 = "pago até outubro" = até 31/10),
   renovado por um bloco do cron no dia 1º;
2. o **ciclo de cada moeda**, contado do aceite (a regra do Gabriel desde 02/10).

— e **cinco funções** respondendo "até quando esta moeda está paga". Em 03/11, para a RO-000182, a trava dizia 31/10, a tela
29/11 e a próxima cobrança 30/12. Cada correção anterior mexia numa função e deixava as outras.

## O que mudou no código

| Antes | Agora |
|---|---|
| `coberturaPagaDaMoeda`, `custodiaPagaAteCompetencia`, `guardaPagaAteDaMoeda`, `custodiaResolvidaNaCompetencia`, `moedasCobertas`, `moedaComCustodiaNaoPagaNoEstado`, `custodiaNaoComprovadaNoEstado`, `temCobrancaRegistrada`... | **`src/domain/custodia-da-moeda.ts`**: `custodiaPagaAte`, `custodiaCobradaAte`, `custodiaImpedeNegociar`, `cicloJaCobrado`, `proximaCobrancaDaMoeda` |
| plano cobria moeda por mês do calendário; `renovacaoDevida`, `calcularPagoAte`, `competenciaCoberta` | plano é só o **pagamento antecipado do 1º mês do envio**; no aceite, `alimentarPlanoNaAnalise` liga a fatura de contratação às moedas com o **primeiro ciclo delas** |
| bloco A do cron: renovação de plano no dia 1º | **saiu**. O cron só emite o ciclo de cada moeda que fez aniversário |
| seis lugares marcavam fatura como paga, cada um com um pedaço da regra | **`quitarFatura`** (`src/domain/quitar-fatura.ts`) — o único caminho |
| Pix de fatura já paga sumia; Pix de fatura cancelada a marcava paga; cartão recorrente estendia "plano por mês" | o dinheiro vira saldo; o cartão recorrente paga a fatura em aberto pelo caminho único |
| fatura antiga sem `coberturaAte` cobria "até o fim do mês" | só `coberturaAte` conta; fatura sem ela não cobre nada (a produção não dependia mais disso — conferido moeda por moeda) |
| — | **`estornarFaturaPaga`**: devolve ao saldo, `estorno` no ledger e NFS-e marcada para cancelamento (serviço não prestado) |
| extrato: toda entrada era "Depósito simulado em conta" | `Deposit.origem/metodo/refExterna` (migration **049**), gravados num lugar só em `conciliarPagamento`; o extrato diz "Pagamento da custódia por Pix" etc. |
| cartões de plano mostravam "Pago até: 2026-10" | mostram "Custódia paga até dd/mm/aaaa", a data da regra única (`custodiaDoPlanoPagaAte`) |

A regra, em quatro frases, está no topo de `custodia-da-moeda.ts` e no `CLAUDE.md`.

## A prova

- `src/domain/custodia-da-moeda.test.ts`: um acervo com aniversários nos cantos do calendário (31, 30, 1º, 29) anda dia a
  dia de 30/10/2026 a 01/03/2027, com o cron cobrando e o cliente pagando; em todo dia, para toda moeda, a trava, a próxima
  cobrança, a cobertura da tela e o cron dão a mesma data. E nenhuma fatura nasce num dia 1º fora do aniversário.
- Regressões do caso real: `plano-custodia.test.ts` (Sidnei: pago 27/10, aceito 30/10 → coberto até 29/11, próxima cobrança
  30/11, não trava em 01/11) e `faturamento.test.ts` ("NÃO EXISTE RENOVAÇÃO NO DIA 1º").
- **Contra o banco de produção, só leitura:** das 182 moedas, 181 dão exatamente a mesma resposta na regra nova e na antiga
  (ninguém piora); a única diferença era a RO-000182. Simulação de 35 dias de cron: nenhuma cobrança fora do aniversário.
- Suíte inteira (sobre o `origin/main`): 161 arquivos, 1503 testes passando; typecheck e build limpos. Os 5 testes que
  estavam vermelhos antes (datas fixas de outubro em `custodia-da-compra.test.ts`) foram corrigidos.

## O que foi feito em produção (com ordem do Gabriel)

1. **Backup** antes de qualquer gravação: `aurea.bkp_<tabela>_20261103` para `faturas_custodia`, `planos_custodia`, `coins`,
   `users`, `deposits`, `sell_offers`, `nfse_emissoes` e `payment_intents` (contagens conferidas).
2. **Sidnei liberado** (sem mover dinheiro): a fatura de contratação paga em 27/10 foi ligada à RO-000182 com o ciclo
   30/10–29/11; a "renovação" de 01/11 (pendente) foi cancelada. Logo depois ele vendeu a moeda ao Rogério (03/11, 11:51),
   que já a recebeu com o 1º mês pago na compra.
3. **Rogério estornado**: a "renovação" de 01/11 (R$ 2,00, paga com saldo) virou cancelada, o saldo voltou (R$ 353,45 →
   R$ 355,45), o ledger lançou o `estorno`, e a **NFS-e nº 20** ficou `cancelando` — a rotina de notas envia o evento à Sefin
   na próxima passada (cron diário, ou "Processar notas" no painel fiscal).

Tudo por `mutarEstado`, com ator `correcao:custodia-20261103` na trilha de auditoria.

## Para publicar

`npm run db:migrate` (aplica só a 049, aditiva — o código no ar não lê as colunas novas) e o push, nessa ordem, no mesmo
passo. Até o push, o código no ar ainda tem o modelo velho: não cobra mais o Sidnei nem o Rogério (os dois planos ficaram
"pago até 2026-10" e as renovações de novembro existem, canceladas), mas **qualquer envio pago em novembro** voltaria a
travar a moeda no fim do mês e a ser "renovado" em 01/12 — o push precisa sair antes disso.
