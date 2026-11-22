# MD de execução — Manutenção 22-11 | T5 KPIs do conselho

## RETOMADA (atualizar a cada tópico)

- **Estado (22/11/2026, 2ª rodada):** respostas do Gabriel aplicadas. `tsc --noEmit` limpo; `kpis.test.ts` + `configuracao.test.ts` = 75 verdes; suíte inteira: 2312 verdes, 5 vermelhos que **não são desta frente** (4 em `frete-envio.test.ts` — frete 10000 esperado 9600; 1 em `admin/banco.test.ts` — texto do CPF/CNPJ, T3). Sem build, sem commit, sem push.
- **MIGRATION 059 CRIADA E NÃO APLICADA:** `src/server/db/migrations/059_trades_codigo_da_moeda.sql` (`aurea.trades.coin_ids jsonb`). **O Controle aplica no commit** (`npm run db:migrate`). **Ordem importa:** `carregarTrades` já lê `coin_ids`; subir o código antes da migration quebra a leitura do estado. Aplicar a migration primeiro (ou junto) é obrigatório.
- **Falta:** Merge/Deploy + aplicar a 059; conferir `/admin/resultados/kpis?aba=conselho` em produção; Gabriel responder o horizonte do LTV (provisório 12 meses) e a pendência de marketing (API da Meta).
- **Plano:** pedido do Controle (T5).

## O que mudou na 2ª rodada

| Arquivo | O que |
|---|---|
| `src/domain/kpis.ts` | bloco do conselho reescrito: sem custo logístico; receita = custódia + comissão; pagante = pagou custódia (fatura paga > 0); churn em 3 motivos (45 dias) + total; comissão da moeda via `Trade.coinIds` (`null` se só há negociação antiga). Exporta `DIAS_PARA_CHURN`, `LTV_HORIZONTE_MESES` |
| `src/domain/kpis.test.ts` | bloco do conselho: 16 casos (pagante, fatura de valor zero, comissão por moeda, negociação sem código, mistura, churn por motivo e sem repetir) |
| `src/domain/admin/configuracao.ts` (+ test) | **revertida** a chave `custoLogisticoPorMoedaCents` (voltou ao que era antes do T5) |
| `src/server/admin/kpis-conselho.ts` | tirou o custo logístico |
| `src/components/admin/resultados/Conselho.tsx` | seções 1–4 reescritas; bloco "Premissas usadas" com as decisões e o LTV provisório |
| `src/domain/types.ts` | **superfície protegida**: `Trade.coinIds?: string[] \| null` (autorizado pelo Gabriel em 22/11) |
| `src/domain/market.ts`, `src/server/actions/{market,sell,reserva}.ts`, `src/server/payments/conciliacao.ts` | **superfície protegida**: cada ponto que grava `Trade` passa a gravar o código das moedas (`coinIds`). Nenhuma regra, valor ou comissão mudou |
| `src/server/db/diff.ts`, `src/server/db/repositories/trades.ts` | `coinIds` lido e gravado (ausente quando nulo, para o histórico continuar igual) |
| `src/server/db/migrations/059_…sql` + `README.md` | a migration |
| `docs/kpis/PENDENCIAS_DE_DADOS_E_AUTOMACOES.md` | "Respostas do Gabriel", "O que ficou sem cálculo" e "Ainda sem resposta (marketing)" |
| `docs/kpis/PROPOSTA_DE_KPIS.md` | seção 3 atualizada |

## Decisões minhas (desfazíveis)

- Retirada só é churn quando o cliente **não guarda mais nenhuma moeda** (retirada parcial não é).
- Inatividade e custódia não paga olham o dia de **hoje**; retirada olha o **período** escolhido. Base da taxa de churn = pagantes + quem retirou.
- Comissão mensal por cliente = comissão do período × 30 ÷ dias já decorridos do período ÷ pagantes.
- Custódia por cliente usa só as moedas dos pagantes; LTV = receita mensal × 12 (provisório).
- Comissão de uma negociação com várias moedas se reparte igualmente entre elas.
- `contasQueNaoSaoCliente` repetida em `kpis-conselho.ts` (a de `resultados.ts` não é exportada); unificar depois.
