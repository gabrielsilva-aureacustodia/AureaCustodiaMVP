# AG2 — Compras e Vendas: nomes, ordem dos blocos e o bloco explicativo

Branch: `exec/ag2-compras-e-vendas`, a partir de `main` em `c520233`.

**Ordem importa:** esta branch precisa ser mesclada **antes** da AG3. A AG3 move
blocos destas duas telas para uma página nova, e faz isso partindo do estado que
esta branch deixa.

## As duas telas

| Hoje | Passa a se chamar | Arquivo |
|---|---|---|
| Mercado (`/mercado`) | **Compras** | `src/app/(app)/mercado/page.tsx` |
| Vender moeda (`/vender`) | **Vendas** | `src/app/(app)/vender/page.tsx` |

Troque o rótulo no menu (`src/components/shell/Sidebar.tsx`, linhas 167 e 178) e
o título derivado da rota (`src/components/shell/Topbar.tsx` — o título da
página é montado lá a partir do caminho, não dentro da tela).

**As rotas `/mercado` e `/vender` continuam as mesmas.** Só o rótulo muda. Na
AG3 nasce uma página nova que se chamará Mercado; se você renomear a pasta agora,
as duas brigam pelo mesmo caminho.

## O que muda nas duas telas

1. **"Minhas ofertas no mercado" desce.** Hoje `<MinhasOfertas />` é a primeira
   coisa da página (`mercado/page.tsx:244`) e aparece também em Vendas. Passa a
   ficar **abaixo de todos os outros blocos**. O foco da tela é comprar e vender;
   conferir as próprias ofertas é consulta, vem depois.

2. **Pastas de moedas fechadas por padrão.** `src/components/market/Folder.tsx` —
   hoje a vitrine abre com pastas expandidas (ver `mercado/page.tsx:114`, o
   estado das pastas abertas). Passa a nascer fechada, para não carregar nem
   encher a tela à toa.

## Só na tela de Compras

3. **"Fazer oferta de compra" vira o primeiro bloco central.** Hoje é o último
   (`mercado/page.tsx:420`). A ordem atual da coluna é: Filtrar por valor →
   Ofertas de venda → Ofertas de compra ativas → Fazer oferta de compra.

4. **"Como o preço é formado" passa a existir também em Compras.** O bloco já
   existe em Vendas (`vender/page.tsx`) — reaproveite-o como componente
   compartilhado em `src/components/market/`, em vez de duplicar o JSX. Dois
   blocos gêmeos em arquivos diferentes é exatamente o que fez os cartões de
   plano de custódia divergirem entre si.

## Nas duas telas: bloco novo "Como a negociação acontece"

Na coluna da direita, **logo abaixo de "Como o preço é formado"**, nas duas
páginas.

**É bloco explicativo do que já funciona — não é feature.** Não mexa no motor de
casamento nem nas Server Actions. O texto precisa dizer, em linguagem que o
Rogério entenda sem jargão:

- o usuário pode **aceitar uma oferta na hora**, clicando nela — compra ou venda
  imediata pelo preço anunciado;
- ou pode **deixar o sistema negociar sozinho**, publicando a própria oferta: o
  sistema casa as ordens por preço e, no empate, por ordem de chegada — a
  primeira oferta da fila é a primeira a negociar.

O comportamento descrito está em `src/domain/market.ts` (`matchOrders`,
prioridade preço-tempo, um livro por tipo de moeda). Leia antes de escrever o
texto: o bloco precisa descrever o que o código faz, não o que parece fazer.

Vocabulário proibido pelo jurídico em qualquer texto do produto: *token, NFT,
cripto, ativo digital, ativo, investimento, investidor, corretora,
rentabilidade, retorno*. Use **recibo**, **moeda**, **item**, **marketplace**,
**potencial de valorização**.

## Ordem de leitura

1. `CLAUDE.md`
2. `src/app/(app)/mercado/page.tsx`
3. `src/app/(app)/vender/page.tsx`
4. `src/components/market/` — `Folder.tsx`, `MinhasOfertas.tsx`, `LotCard.tsx`, `BidRow.tsx`
5. `src/components/shell/Sidebar.tsx` e `Topbar.tsx`
6. `src/domain/market.ts` — só para escrever o texto do bloco novo com fidelidade

## Cuidados

- CSS é global por área, com os nomes de classe do monolito (`.panel`, `.btn`,
  `.nav-item`). Não transforme em CSS Modules. `responsive.css` continua sendo o
  **último** import de `globals.css`.
- Alvo mínimo de toque no celular: 44px.
- A tela é Client Component por dependência do estado vivo do `AppProvider` —
  não a converta em Server Component ao mexer na ordem dos blocos.

## Fechamento

`npm run typecheck`, `npm run lint`, `npm test` e `npm run build` — **uma vez
cada, no fim**. Não rode teste entre as etapas. Depois commit e push da branch.
