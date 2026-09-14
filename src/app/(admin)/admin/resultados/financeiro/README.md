# `/admin/resultados/financeiro`

`page.tsx` — confere `resultados.ver`, lê o período da URL e chama `carregarFinanceiro`
(`src/server/admin/resultados.ts`): DRE de `dreCompleta()`, resumo de caixa de
`resumirFinanceiro` e, quando a B3 criar o relatório, os recebimentos do Mercado Pago. Desenha
com `components/admin/resultados/Financeiro`. `/relatorios` redireciona para cá.
