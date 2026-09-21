# AG3 — A página Mercado nova, e o fim da página Gráficos

- 21/09/2026 — Execução iniciada na branch `exec/ag3-pagina-mercado`; merge da branch `exec/ag2-compras-e-vendas` realizado com sucesso (fast-forward c520233..5b874c2).
- 21/09/2026 — Navegação atualizada (`Sidebar.tsx` e `Topbar.tsx`):
  - Ordem do menu: Início (`/inicio`), Mercado (`/mercado`), Compras (`/compras`), Vendas (`/vender`), Envios (`/envios`), Recibos (`/recibos`), Minha conta (`/conta`).
  - "Meus recibos" renomeado para "Recibos".
  - Remoção de `/graficos` do menu e dos títulos derivados da rota.
- 21/09/2026 — Subpáginas migradas:
  - Comparação de referência movida para `src/app/(app)/mercado/comparacoes/page.tsx` com link "‹ Voltar para mercado".
  - Auditoria de estoque custodiado movida para `src/app/(app)/recibos/auditoria/page.tsx` com link "‹ Voltar para recibos".
- 21/09/2026 — Bloco de auditoria em Recibos:
  - Movido bloco "Auditoria de estoque" de gráficos para `src/app/(app)/recibos/page.tsx`.
  - Frase explicativa adicionada: *"Auditoria transparente de todas as moedas no nosso sistema, suas e de outros usuários (nenhum nome será exposto)."*
- 21/09/2026 — Nova página Mercado (`src/app/(app)/mercado/page.tsx`):
  - Topo: `<MinhasOfertas />`.
  - Meio: "Ofertas de venda" e "Ofertas de compra" dispostos lado a lado em colunas, com dropdown toggle, filtro por tipo de moeda, filtro de valor dedicado e paginação cliente de 10 em 10 com botão "Ver mais (+10)".
  - Abaixo: Preço médio histórico do Real Olímpico (`LineChart` + `PeriodTabs`), 3 indicadores de mercado e bloco de Comparação simples (Sparklines de RO, BTC `#f7931a`, ETH `#627eea`, USDT `#26a17b` com `LOGO_REAL_EMBLEMA`) apontando para `/mercado/comparacoes`.
- 21/09/2026 — Página Compras (`src/app/(app)/compras/page.tsx`):
  - Fazer oferta de compra, seletores de moeda em foco e compra, indicadores de mercado e regras explicativas ("Como o preço é formado" e "Como a negociação acontece"), com Minhas Ofertas ao fim.
- 21/09/2026 — Exclusão da página e pasta legada `src/app/(app)/graficos`.
