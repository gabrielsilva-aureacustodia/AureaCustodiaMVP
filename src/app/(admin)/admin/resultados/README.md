# `src/app/(admin)/admin/resultados/` — a Central de Resultados

| Pasta | Rota | Permissão | Carrega com | Desenha com |
|---|---|---|---|---|
| `page.tsx` | `/admin/resultados` | — | — | redireciona para `financeiro` |
| `financeiro/` | `/admin/resultados/financeiro` | `resultados.ver` | `carregarFinanceiro` | `components/admin/resultados/Financeiro` |
| `contabil/` | `/admin/resultados/contabil` | `resultados.ver` | `carregarContabil` | `components/admin/resultados/Contabil` |
| `kpis/` | `/admin/resultados/kpis` | `resultados.ver` | `carregarKpis` | `components/admin/resultados/Indicadores` |
| `uso/` | `/admin/resultados/uso` | `resultados.ver` ou `admin.auditoria` | `carregarUso` | `components/admin/resultados/Uso` |

Os carregadores estão em `src/server/admin/resultados.ts`. O período vem da URL e é lido por
`lerPeriodo` (`src/domain/admin/periodo.ts`), com a mesma regra das rotas de exportação de
`/api/relatorios/*` — que continuam no mesmo endereço, porque o Google Sheets e o Excel do
contador dependem delas.
