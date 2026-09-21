# AG2 — Compras e Vendas: nomes, ordem dos blocos e o bloco explicativo

- 21/09/2026 — Execução iniciada na branch `exec/ag2-compras-e-vendas`; plano `AG2_COMPRAS_E_VENDAS.md`, `CLAUDE.md` e `Regras_eficiencia_de_sessao_v1.md` lidos.
- 21/09/2026 — Menu e cabeçalhos atualizados: rótulos "Compras" e "Vendas" no menu da Sidebar e títulos da rota na Topbar, mantendo as rotas `/mercado` e `/vender`.
- 21/09/2026 — Pastas de moedas alteradas para fechadas por padrão (`abertas` inicializado como `new Set()`) em Compras e Vendas.
- 21/09/2026 — "Minhas ofertas no mercado" descido para abaixo de todos os blocos principais nas duas telas.
- 21/09/2026 — Componente compartilhado `ComoPrecoEFormado` extraído para `src/components/market/ComoPrecoEFormado.tsx` e reutilizado em Compras e Vendas.
- 21/09/2026 — "Fazer oferta de compra" reordenado para ser o primeiro bloco da coluna central em Compras.
- 21/09/2026 — Novo componente explicativo `ComoNegociacaoAcontece` criado em `src/components/market/ComoNegociacaoAcontece.tsx` e posicionado abaixo de "Como o preço é formado" nas duas telas, sem jargão e com vocabulário em conformidade regulatória.
