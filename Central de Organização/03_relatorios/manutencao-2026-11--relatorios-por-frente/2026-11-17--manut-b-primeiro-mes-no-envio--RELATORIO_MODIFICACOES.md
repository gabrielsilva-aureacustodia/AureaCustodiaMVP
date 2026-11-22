# Relatório de Modificações (detalhado) — frente B

> Filtro: estrutural/crítico, comparado à base `9e21fe1`. Escrito pela Auditoria B.

## 1. Base comparada
`9e21fe1` → worktree `claude/manut-primeiro-mes-no-envio-1ff25c` (0 commits; mudanças sem commit).

## 2. Tabela
| Item | Tipo | Path | Consequência |
|---|---|---|---|
| Cobrança do envio passa a ser frete + 1º mês numa só cobrança | crítico (cobrança) | `src/server/actions/custody.ts`, `src/server/payments/conciliacao.ts` (parte do frete) | saldo, Pix e cartão cobram o total; divergência de valor vira crédito em saldo; mês já pago não se cobra de novo |
| Módulo de domínio novo do 1º mês do envio | contrato (B↔H) | `src/domain/primeiro-mes-do-envio.ts` | localizador `faturasDoEnvio(state, protocolo)`: H acha o mês pelo protocolo |
| `contratarPlanoCustodia` delega ao módulo novo | crítico | `src/server/actions/plano-custodia.ts` | mesmo resultado `{faturaId, planoId}`; reprecifica fatura PENDENTE, nunca mexe em paga |
| Wizard: passo 3 sem pagamento, passo 4 com Frete + 1º mês + Total | contrato (tela) | `src/app/(app)/envios/page.tsx`, `src/components/envios/` (pasta nova) | some "Pagar depois" e qualquer opção de não contratar |
| Testes novos e atualizados | teste | `primeiro-mes-em-toda-compra.test.ts`, `primeiro-mes-no-envio-recusa.test.ts`, `ResumoDoPagamentoDoEnvio.test.ts`, `frete-envio.test.ts`, `conciliacao.test.ts` | cobertura de compra (6 vias), envio (3 formas) e recusa |

## 3. O que NÃO mudou de estrutura
Nenhuma migration, nenhuma variável de ambiente, nenhuma integração nova, nenhuma pasta na raiz. `types.ts`, `fees.ts`, `constants.ts`, `custodia-da-moeda.ts` (regra única de 03/11) e o preço de R$ 2,00 intactos; `Envio.frete.valorCents` segue só o frete (DRE e ledger não misturam frete com custódia). Sem campo novo em `types.ts`.

## 4. Atualizações de MD de pasta / ENVIRONMENT_TABLE
Nenhuma feita na branch. **Sugestão ao Controle no merge:** README da pasta `src/components/envios/` (R3) e menção de `primeiro-mes-do-envio.ts` no MD de `src/domain/`.

## 5. Superfície protegida
Server Actions tocadas dentro do pedido (`custody.ts`, `plano-custodia.ts`). Nada fora disso.
