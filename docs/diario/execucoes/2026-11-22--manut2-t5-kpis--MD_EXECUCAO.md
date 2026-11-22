# MD de execução — Manutenção 22-11 | T5 KPIs do conselho

## RETOMADA (atualizar a cada tópico)

- **Estado (22/11/2026):** pronto no código local. `npm run typecheck` limpo; `vitest` de `kpis.test.ts` + `configuracao.test.ts` = 71 verdes. Nada commitado, sem build local, sem migration. **Não conferido no navegador** (sem servidor local, regra do método).
- **Falta:** Merge/Deploy; depois o Rogério/Gabriel abrirem `/admin/resultados/kpis?aba=conselho` em produção e conferirem os números com dados reais; Gabriel confirmar o custo logístico (padrão R$ 25,00) e se a lista do WhatsApp de 3/11 tem algo além dos 5 do slide 3.1.
- **Sem migration:** o custo logístico é uma chave nova em `aurea.config_plataforma` (tabela chave-valor, migration 024) — nasce com o padrão do código e se edita em `/admin/configuracao` (grupo "operacional"), sem deploy.
- **Plano:** pedido do Controle (T5); `docs/manutencao-2026-11/garantias/PLANO_HIPERDETALHADO__Manutencao_Pendencias_22-11.md` não cita T5.
- Observação de processo: este MD foi criado depois da primeira edição de código (o pedido era antes). Sem efeito no resultado.

## Arquivos

| Arquivo | O que |
|---|---|
| `src/domain/kpis.ts` | `montarKpisDoConselho`, `FontesConselho`, `KpisConselho`, `LTV_HORIZONTE_MESES` (bloco novo, antes de "a entrada manual do gasto") |
| `src/domain/kpis.test.ts` | `describe('KPIs do conselho')`: 10 casos, cenário de novembro conferido à mão |
| `src/domain/admin/configuracao.ts` (+ `.test.ts`) | chave `custoLogisticoPorMoedaCents` (padrão 2500) e `operacionalDe` |
| `src/server/admin/kpis-conselho.ts` | **novo**: `carregarKpisDoConselho` (arquivo à parte para não tocar em `resultados.ts`, que tem edição do T1) |
| `src/components/admin/resultados/Conselho.tsx` | **novo**: a aba, texto leigo |
| `src/app/(admin)/admin/resultados/kpis/page.tsx` | aba `conselho` (2ª, `negocio` segue padrão) |
| `docs/kpis/PROPOSTA_DE_KPIS.md` | seção 3 preenchida com o mapa dos 5 × existia × entrou × fonte |

## Superfície protegida

Nenhuma tocada (`constants.ts`, `fees.ts`, `market.ts`, `types.ts`, contrato do store, Server Actions: intactos). `configuracao.ts` não é superfície protegida.

## Decisões minhas, para o Gabriel poder desfazer

- Custo logístico: padrão R$ 25,00 (o do pedido), parâmetro editável. Vale só por moeda de **envio postal** (cadastro sem envio não tem Correios).
- Churn medido pela retirada (o sistema não guarda "deixou de ser cliente"); moeda vendida não é saída.
- Comissão não é ligada à moeda captada (a negociação não registra a moeda); aparece à parte.
- LTV = custódia mensal por cliente × 12 (premissa de leitura).
- `contasQueNaoSaoCliente` foi repetida em `kpis-conselho.ts` (a de `resultados.ts` não é exportada e o arquivo é do T1); unificar depois do merge.
- O orçamento de R$ 3.600/mês não virou número no código: entra como gasto "Serviço" na aba de gasto (já existia).
