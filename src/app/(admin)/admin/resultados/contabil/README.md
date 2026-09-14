# `/admin/resultados/contabil`

`page.tsx` — confere `resultados.ver`, lê `?aba=` e o período, e chama `carregarContabil`
(plano de contas, lançamentos manuais, alíquotas, exportações, estado da integração com o
Sheets). Desenha com `components/admin/resultados/Contabil`. As escritas pedem cada uma a sua
permissão em `src/server/actions/admin/contabil.ts`.
