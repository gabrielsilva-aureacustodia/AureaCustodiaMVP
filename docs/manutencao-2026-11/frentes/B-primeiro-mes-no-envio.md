# Ficha da frente B — Cobrança: 1º mês de custódia no envio e na compra

```
ID / branch:   B · manut-primeiro-mes-no-envio    Onda de merge: 3 (antes de H)    Migration reservada: 052 (só se precisar)
Item do Rogério: 2            Prazo: 30/11/2026   Base: 9e21fe1
Aceite em uma frase: quem paga o envio já paga, no mesmo pagamento, o 1º mês de custódia das moedas; e toda forma de compra já cobra o 1º mês.
```

## Pedido do Rogério (as palavras dele)
"Cobrar o primeiro mês de custódia junto com o pagamento do envio, ou da compra."

## O que o código já faz (a frente **confere por teste**, não presume)
- **Compra:** desde 21/10/2026 `custoDeCompraPorMoeda` = preço + comissão + custódia (R$ 2,00 da tabela vigente), e `transferirMoedaVendida` cria a fatura já paga do comprador (`origem:'compra'`). Texto de regra em `CLAUDE.md` e `docs/ALTERACOES_2026-10-21_CUSTODIA_NA_COMPRA.md`.
- **Envio:** `createProtocol` → `contratarPlanoCustodia` (**opcional** no wizard) → frete (`pagarFreteComSaldo`, `iniciarPixFrete`, `iniciarCartaoFrete`). No aceite da moeda, `alimentarPlanoNaAnalise` liga a fatura do plano às moedas aceitas.

## Aceite
- [ ] **T1 — relatório "o que existe × o que falta"**: um teste para cada via de compra (saldo, Pix, cartão, reserva/pré-paga, `buyLot`, `sellToBid`, casamento do motor) confirmando que nasce a fatura paga do 1º mês do **comprador**. Lacuna achada = lacuna fechada ou levada ao Controle.
- [ ] **Envio:** o pagamento do envio (frete por saldo, Pix ou cartão) cobra **frete + 1º mês das moedas declaradas** em **uma cobrança** (D4). Valor = quantidade × `custodiaMensalPorMoeda` **da tabela vigente** — nunca número fixo no código.
- [ ] **Wizard** (`envios/page.tsx`): mostra as linhas *Frete* e *1º mês de custódia* (com o sinal (i) usado na compra, `LinhaCustodiaNaCompra`) e o total. Sem opção de "não contratar" (padrão D4).
- [ ] **Moeda recusada na análise** devolve o 1º mês **daquela** moeda (estorno parcial pelo caminho que já existe, `estornarFaturaPaga` ou equivalente). **Envio cancelado ou não postado** é da frente H — contrato B↔H abaixo.
- [ ] **NFS-e:** segue a regra vigente (nota na data do pagamento da fatura paga; fatura em aberto nunca gera nota). A dúvida "nota no pagamento antecipado ou no aceite?" vai para `docs/fiscal-contabil/LACUNAS_E_PERGUNTAS.md` como pergunta ao contador (uma linha — o dono desse arquivo, nesta rodada, é a frente K; **B escreve a linha no seu registro** e o Controle encaixa).
- [ ] A regra única (`custodia-da-moeda.ts`) **não muda**: o teste dia a dia dela continua verde. Testes novos de envio com 1º mês; `frete-envio.test.ts` e os de compra atualizados.

## Ler (e só isto)
- `CLAUDE.md` (itens de Custódia, Ciclo, Compra e "Moeda comprada antes de 21/10") · `docs/ALTERACOES_2026-11-03_CUSTODIA_REGRA_UNICA.md` · `docs/ALTERACOES_2026-10-21_CUSTODIA_NA_COMPRA.md`
- `src/domain/custodia-da-compra.ts`, `custodia-da-moeda.ts` (**ler**), `quitar-fatura.ts`, `cobranca-de-entrada.ts`, `plano-custodia.ts`, `ciclo-custodia.ts`
- `src/server/actions/plano-custodia.ts`, `custody.ts` (`createProtocol`, `cotarFrete*`, `pagarFrete*`, `iniciarPixFrete`, `iniciarCartaoFrete`, `advanceAnalysis`), `payments.ts`, `reserva.ts`, `market.ts`/`sell.ts` (**só leitura**, para os testes de compra)
- `src/server/shipping/frete-envio.ts` · `src/server/payments/conciliacao.ts` · `src/app/(app)/envios/page.tsx` (wizard) · testes `frete-envio.test.ts`, `plano-custodia.test.ts`, `custodia-da-moeda.test.ts`

## Touch
`src/server/actions/custody.ts` (região de envio/frete/plano — **dono**), `src/server/actions/plano-custodia.ts`, `src/server/shipping/frete-envio.ts`, `src/server/payments/conciliacao.ts` (só a parte do frete), `src/app/(app)/envios/page.tsx` (wizard), os testes acima e arquivos de teste novos.

## Do not touch
`src/domain/custodia-da-moeda.ts` e o preço de R$ 2,00 · `fees.ts`, `constants.ts` · `statement.ts` (F) · cancelamento, estorno de envio cancelado e a lista de envios (H) · `market.ts`/`sell.ts` (A).

## Fora de escopo
Mudar o preço, criar renovação de plano, cobrança no dia 1º (**não existe**), mudar a trava por débito, alíquota ou emissão fiscal.

## Decisões pendentes
**D4:** obrigatório e no mesmo pagamento; recusa devolve o mês das moedas recusadas. Se o Gabriel quiser cobrança separada ou opcional, é uma linha no wizard.

## Tópicos
| T | O quê | Aceite do tópico |
|---|---|---|
| T1 | Testes das vias de compra + relatório "existe × falta" | relatório escrito; lacunas anotadas |
| T2 | Cobrança do envio: frete + 1º mês (saldo, Pix, cartão) | testes por forma de pagamento |
| T3 | Wizard com as linhas e o total | tela conferida no navegador local |
| T4 | Recusa na análise devolve o mês daquela moeda | teste de recusa parcial |
| T5 | Contrato B↔H registrado + suíte da branch | verde |

## Contratos (cumprir sem exceção)
- **B↔H:** *tudo o que um envio gerou se acha pelo protocolo* — frete, plano/fatura do 1º mês e NFS-e. B **não cria cobrança do envio que H não consiga localizar pelo protocolo**. Escreva no `registro/B.md`, em uma linha, **como a cobrança do 1º mês fica ligada ao protocolo** (campo/relação), para H usar.
- **B→F:** todo movimento de saldo que B criar tem que ter evento que o extrato consiga mostrar.

## Superfície protegida (anotar se tocar)
Server Actions (dentro do pedido). `types.ts`: **só** campo opcional novo, se for inevitável para ligar fatura e protocolo.
