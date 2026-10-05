# Correções de produção — 05/10/2026

Registro do que foi alterado **em dados** no banco de produção nesta data, por que, e como foi
conferido. O código que acompanha está no commit que traz este arquivo.

## 1. Custódia cobrada em 01/10 (regra antiga) — faturas canceladas e saldo devolvido

**Contexto.** Até 02/10/2026 o cron cobrava a custódia por mês-calendário, no dia 1º. O ciclo agora é
de cada moeda, no aniversário do dia em que ela foi aceita (`src/domain/ciclo-custodia.ts`). As
cobranças de 01/10 deixaram de fazer sentido e geraram problema de caixa para os sócios.

**Feito.** Quatro faturas `ciclo_mensal` de competência `2026-10` passaram a `cancelada`:

| Fatura | Conta | Moedas | Valor | Situação antes | Dinheiro |
|---|---|---|---|---|---|
| `FAT-2026-10-siqueiraro-1790841731544` | Rogério | 106 | R$ 212,00 | paga com saldo | **devolvido ao saldo** (+R$ 212,00 → R$ 964,10) |
| `FAT-2026-10-rozanebagl-1790841731544` | Rozâne | 10 | R$ 20,00 | paga com saldo | devolvido pelo Gabriel via Mercado Pago — saldo do sistema **não** mexido |
| `FAT-2026-10-peggemende-1790841731544` | Peggê | 1 | R$ 2,00 | paga com saldo | idem |
| `FAT-2026-10-aliancacei-1790841731544` | Aliança | 10 | R$ 20,00 | em aberto | nada a devolver |

O crédito do Rogério passou pelo mesmo caminho do "ajuste de saldo" do painel (`ajustarSaldo`): gerou o
lançamento `ajuste` #263 no razão e a linha `admin.usuarios.ajustar_saldo` na trilha, com o motivo. As
quatro faturas canceladas têm a linha `custodia.atualizar_fatura` e `admin.custodia.cancelar_faturas`.
No DRE, esse `ajuste` aparece em "precisam de explicação" — a explicação é este registro.

**Resultado conferido** (simulação do cron sobre os dados reais): nenhuma moeda é recobrada hoje; as
próximas cobranças são Rogério 21/10 (Bandeira, lote RO-ENV-0003) e 24/10 (Direitos Humanos, lote
RO-DIR-0004) e 28/10 (a comprada); Rozâne e Peggê 23/10; Aliança 24/10.

## 2. Faturas por lote

`emitirFaturasDosCiclos` agora emite **uma fatura por lote** (envio ou cadastro) em cada ciclo — antes,
lotes diferentes aceitos no mesmo dia andavam juntos. O extrato mostra "Lote RO-ENV-0003".

## 3. Caixas do cofre

**Contexto.** O Rogério cadastrou as 127 moedas e a caixa não ficou registrada: só a RO-000001 tinha
caixa; 98 tinham posição sem caixa; as demais, nada. EB-001 nem estava cadastrada, e nenhuma caixa dizia
de que moeda era.

**Feito** (`mover-moedas-para-as-caixas-certas.cjs`, mesma técnica de `corrigir-peso-dos-laudos.cjs`):

- Bandeira, 1ª a 100ª (RO-000001…100) → **EB-001**, posições 1 a 100;
- Bandeira, 101ª a 120ª (RO-000101…110 e RO-000112…121) → **EB-002**, posições 1 a 20;
- Direitos Humanos (RO-000111 e RO-000122…127) → **DH-001**, posições 1 a 7;
- EB-001 passou a existir em `aurea.caixas` (100 posições) e as três caixas ganharam `tipo_moeda`.

`caixa` e `posicao` estão dentro do hash do laudo, então a cadeia de hashes das 127 análises e os 127
hashes de recibo foram recalculados, com a trava de sempre: a fórmula reproduziu os hashes antigos antes
de qualquer escrita, e a conferência final deu cadeia íntegra e 0 recibos fora de sincronia.

**O que impede de voltar** (código): `alocarNasCaixas` / `colocarMoeda` em `src/domain/admin/caixas.ts`,
usados pelo fechamento da análise e pelo cadastro direto. Caixa cheia → a moeda vai para a próxima caixa do
mesmo tipo com vaga; Bandeira não entra em caixa de Direitos Humanos; sem vaga em nenhuma caixa do tipo,
volta erro e nada é gravado pela metade. Tipo sem nenhuma caixa cadastrada continua como antes (caixa
digitada). Migration `040_tipo_de_moeda_da_caixa.sql`.
