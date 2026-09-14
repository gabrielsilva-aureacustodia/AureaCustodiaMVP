# `/admin/resultados/uso`

`page.tsx` — entra com `resultados.ver` ou `admin.auditoria`. A primeira mostra o resumo do
registro de uso; a segunda, a trilha de auditoria com filtro (`?ator=&acao=`). Cada parte só é
lida do banco para quem pode vê-la (`carregarUso`). Desenha com `components/admin/resultados/Uso`.
