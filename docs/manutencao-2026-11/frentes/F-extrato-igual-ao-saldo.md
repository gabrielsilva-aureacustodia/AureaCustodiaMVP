# Ficha da frente F — Extrato: refletir o saldo real

```
ID / branch:   F · manut-extrato-igual-ao-saldo   Onda de merge: 4 (por último das frentes de código)    Migration reservada: 054 (só se precisar)
Item do Rogério: 15           Prazo: 30/11/2026   Base: 9e21fe1
Aceite em uma frase: o saldo do topo da conta e o extrato são o mesmo número, e cada linha mostra o saldo depois dela, para o cliente nunca mais ficar em dúvida.
```

## Pedido do Rogério (as palavras dele)
"Falei sobre os extratos na conta do cliente. O EXTRATO TEM QUE REFLETIR O SALDO REAL DA CONTA, do jeito que está faz confusão na cabeça do cliente e ele não entende qual é o saldo verdadeiro dele, se o que aparece no extrato ou se o que aparece lá em cima na conta."

## Aceite
- [ ] **Análise** `ANALISE_EXTRATO_X_SALDO.md`: lista dos eventos que mexem no saldo (depósito, compra, venda, comissão, frete, custódia/fatura paga por saldo, saque e tarifa, estorno, ajuste da equipe, reserva de oferta pré-paga, saque pendente, entrada `custodia_recebida_fora`) **×** os que `userStatement` mostra hoje. Cada diferença com **exemplo numérico**.
- [ ] **Teste de invariante** (o coração da frente): para contas de fixture com todos os tipos de evento, **soma dos impactos do extrato = saldo da conta** (ou *saldo disponível + em reserva = total*, com a diferença explicada por linha). Falha de verdade se alguma fonte de movimento ficar de fora. O Controle **reexecuta** este teste depois do merge de B e H.
- [ ] **Extrato com saldo acumulado** (coluna "Saldo depois"), e no cabeçalho o **mesmo número** da barra superior. Se existe dinheiro em **reserva** (oferta pré-paga, saque pedido e ainda não pago), aparece como linha própria e como *Total = Disponível + Em reserva*, com a **mesma conta** nos dois lugares (extrato e topo).
- [ ] Cada linha diz o que foi **em linguagem de cliente** ("Frete do envio RO-ENV-0007", "Estorno do frete", "Pagamento da custódia", "Ajuste da equipe"), sem jargão contábil.
- [ ] Exportações (CSV/XLSX/PDF, se existirem) trazem a mesma coluna e o mesmo total.
- [ ] `npm run typecheck`, `npm test` ao fim.

## Ler (e só isto)
`src/domain/statement.ts` e `statement.test.ts` · `src/app/(app)/conta/extrato/page.tsx` e `conta/page.tsx` · `src/components/shell/Topbar.tsx`, `Sidebar.tsx` (onde o saldo do topo é lido) · `src/domain/types.ts` (Deposit, Trade, Saque, Fatura, Reserva, Envio.frete) — **ler** · `src/domain/ledger.ts` (**só** como mapa de eventos) · `src/server/db/derivar.ts` (como o ajuste da equipe vira lançamento) · `docs/TERMINOLOGIA_CONTABIL_LIVRO_RAZAO.md`.

## Touch
`src/domain/statement*.ts` · `src/app/(app)/conta/extrato/**` · o componente que mostra o saldo no topo (**só** para ler o mesmo número do mesmo lugar; se a conta do topo estiver errada, **corrija na fonte** e anote).

## Do not touch
`src/domain/ledger.ts` (contábil) · `types.ts` (superfície protegida) · Server Actions · qualquer frente que **gera** o movimento (B, H): elas entregam o dado, F garante que aparece.

## Fora de escopo
Mudar como o saldo é calculado nas regras de negócio, relatório contábil da equipe (`/admin/resultados`), extrato de custódia por moeda.

## Tópicos
| T | O quê | Aceite do tópico |
|---|---|---|
| T1 | Análise com os eventos e exemplos numéricos | MD escrito |
| T2 | Teste de invariante (vermelho no estado atual, se achar diferença) | teste prova a diferença |
| T3 | Correção de `userStatement` + reserva + totais | invariante verde |
| T4 | Tela: saldo depois de cada linha, mesmo número do topo, linguagem de cliente | navegador local, 320–430 px e desktop |
| T5 | Exportações + suíte da branch | verde |

## Contratos
- B e H criam/estornam dinheiro: **F valida** que cada evento novo deles aparece no extrato. Reexecutar o teste **depois do merge** (executivo, seção 4, item 2).

## Específico
Não. Se for preciso comparar com contas reais, **peça ao Controle** (leitura `BEGIN READ ONLY`, sem `SET`).

## Superfície protegida
Nenhuma esperada.
