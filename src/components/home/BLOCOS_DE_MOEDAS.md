# Blocos de moedas na página Início (branch `interno/moedas-no-mercado-e-blocos-home`)

- `HomeStats.tsx`: rótulo "Moedas em custódia" virou "Moedas no Mercado" (só neste arquivo; conta, recibos, mercado e admin não foram tocados).
- `BlocosDeMoedas.tsx` (novo, renderizado em `inicio/page.tsx` logo abaixo de `HomeStats`): dois cartões — Moeda dos Direitos Humanos e Moeda da Entrega da Bandeira — com foto, história curta, tiragem (de `COIN_TYPES`) e valor médio de mercado via `medianSellPrice` (mediana 24h por tipo; sem ofertas mostra "Sem ofertas no momento").
- CSS em `src/styles/home.css` (`.moeda-bloco*`), sombra por `drop-shadow`.
- Fotos em `public/moedas/`. O sistema não tem foto de moeda (só vídeo privado de laudo), então vieram da web:
  - Direitos Humanos: Wikimedia Commons `1-real-1998-direitos-humanos-anverso.png` (domínio público), redimensionada para 480px.
  - Entrega da Bandeira: imagem oficial do Banco Central (`bcb.gov.br/ingles/Mecir/mcomemor/bimetalica_bandeira.jpg`), face recortada em círculo e ampliada 2x (origem tem só ~196px; fica levemente suave em tela retina). Se houver foto melhor da moeda, basta trocar o arquivo.
