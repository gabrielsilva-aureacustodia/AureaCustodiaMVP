# AG8 — Sem custódia paga, a moeda não vai à venda

Branch: `exec/ag8-trava-venda-custodia`. Independente das outras, mas a AG9
mexe na mesma cobrança de custódia — se as duas rodarem juntas, combine a ordem
do merge.

## A regra

**O usuário não pode ofertar à venda uma moeda cuja custódia ele não pagou.**

Comprar, pode. Vender moeda própria que ele enviou e não pagou a guarda, nunca.
A empresa guardou o objeto e não recebeu por isso; deixar a moeda ser vendida
nesse estado é a empresa financiar a guarda de quem já está de saída.

A recusa precisa **dizer o motivo** — "a custódia desta moeda não foi paga" — e
**oferecer a saída na hora**, num pop-up que leva ao pagamento. Recusa sem
caminho de resolução é o tipo de coisa que gera chamado no WhatsApp.

## O que já existe

`src/domain/bloqueio-por-debito.ts` já tem a maior parte da conta feita:

- `contaComPendenciaDeCustodia(...)` e `contaComPendenciaNoEstado(state, email, agora)`
- `vendedoresComPendencia(state, agora)`
- `casarOrdensRespeitandoPendencia(...)`
- `MENSAGEM_RECIBO_BLOQUEADO_POR_PENDENCIA` e `MENSAGEM_ANUNCIO_PAUSADO`

E `src/components/custody/AvisoDebitoCustodia.tsx` já mostra o débito em aberto
em Meus Recibos, Minha Conta e Envios.

**Leia esses dois antes de escrever qualquer coisa.** Boa parte do trabalho pode
ser ligar o que existe no lugar certo, e não construir mecanismo novo.

O que hoje existe é uma trava por **conta vencida**. O que falta é a trava por
**moeda não paga**, que é mais estreita e vale mesmo antes do vencimento: a
custódia daquela moeda específica nunca foi quitada.

## Onde travar

A recusa é do **servidor**, não da tela. O menu pode esconder, mas quem decide é
a Server Action — `publishOffer` em `src/server/actions/sell.ts:96` é o caminho
principal. Confira também o que mais publica oferta ou aceita bid: `acceptBid` /
venda direta no mesmo arquivo, e o motor de casamento em `src/domain/market.ts`.

Uma moeda comprada de outro usuário **não** cai nesta trava pelo que o vendedor
anterior devia: a dívida que importa é a do dono atual sobre aquela moeda.

## A tela

- Na seleção de moedas para venda (`src/components/sell/CoinPicker.tsx`), a
  moeda com custódia em aberto aparece marcada e não selecionável, com o motivo
  visível — melhor do que deixar escolher e recusar depois.
- Ao tentar publicar mesmo assim, pop-up com o valor devido e um botão que leva
  ao pagamento (`/conta/faturas`, ou a mesma modal de pagamento que
  `FaturasCustodia` usa).

## Ordem de leitura

1. `CLAUDE.md`
2. `src/domain/bloqueio-por-debito.ts` — inteiro
3. `src/components/custody/AvisoDebitoCustodia.tsx`
4. `src/server/actions/sell.ts`
5. `src/domain/custody.ts` e `src/domain/plano-custodia.ts` — o que é moeda coberta
6. `src/components/sell/CoinPicker.tsx`
7. `src/components/custody/FaturasCustodia.tsx`

## Cuidados

- **Não bloqueie a compra.** Só a venda de moeda própria com custódia em aberto.
- **Não bloqueie login, cadastro nem retirada** por causa disso.
- Oferta já publicada antes da trava: decida e escreva no código o que acontece
  com ela — o mais coerente é sair do livro, porque senão a trava é contornável
  publicando antes de vencer.
- A mensagem de recusa é a mesma no servidor e na tela. Uma constante só.

## Fechamento

Sem commit. Rode typecheck, lint, teste e build **uma vez, no fim**, só para
confirmar que a branch está de pé, e **avise que terminou**. O merge e o commit
são feitos depois, por um agente só, com todas as branches juntas.
