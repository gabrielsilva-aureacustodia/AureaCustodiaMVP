# `/admin/resultados/kpis`

`page.tsx` — confere `resultados.ver`, lê o período e chama `carregarKpis`, que junta estado,
retiradas e o histórico da fila (A2, quando existir) e passa para `montarKpis`
(`src/domain/kpis.ts`). Desenha com `components/admin/resultados/Indicadores`.
