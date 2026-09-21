# AG3 — A página Mercado nova, e o fim da página Gráficos

Branch: `exec/ag3-pagina-mercado`, a partir de `main` em `c520233`.

**Depende da AG2.** Faça o merge da AG2 primeiro e parta dela: esta branch move
blocos que a AG2 acabou de reordenar e renomear. Rodar as duas em paralelo
garante conflito nas mesmas telas.

## O desenho

Nasce uma página **Mercado**, que é a **segunda do menu**, logo abaixo de Início
e **antes de Compras**. Ela junta o que hoje está espalhado entre a tela de
mercado e a tela de gráficos. No fim, **a página Gráficos deixa de existir**.

Menu final, em ordem: Início · **Mercado** · Compras · Vendas · Envios ·
**Recibos** · Minha conta.

## O que vai para a página Mercado

### 1. "Minhas ofertas no mercado" — no topo

O bloco é **copiado** para cá (continua existindo em Compras e em Vendas, onde a
AG2 o desceu para o fim). Aqui ele fica no topo.

### 2. Ofertas de venda e Ofertas de compra — lado a lado

Vêm de `src/app/(app)/mercado/page.tsx` ("Ofertas de venda" e "Ofertas de compra
ativas"). Saem de lá e passam a ficar **um ao lado do outro** aqui.

Em cada um dos dois blocos:

- **Dropdown**, para não despejar tudo de uma vez.
- **10 moedas por vez.** Um controle deixa o usuário pedir mais, de 10 em 10.
- **Filtrar por valor** dentro do bloco, com o mesmo comportamento do bloco
  "Filtrar por valor" que hoje é avulso na tela de mercado — agora **duplicado**,
  um dentro de cada bloco, para filtrar venda e compra separadamente.
- **Botão simples de filtro por tipo de moeda.**

O bloco "Filtrar por valor" avulso deixa de existir como bloco solto: ele vira o
filtro de dentro de cada um dos dois.

### 3. Os gráficos — logo abaixo

Tudo o que está em `src/app/(app)/graficos/page.tsx` desce para cá, **igual**:
"Real Olímpico — Preço médio histórico", "Comparação simples", as mesmas
funções e as mesmas APIs de cotação. Não é hora de redesenhar gráfico.

A subpágina de comparação (`/graficos/comparacoes`, aberta ao clicar no bloco
pequeno de BTC/ETH/USDT × Real Olímpico) passa a ser **subpágina de Mercado**. O
link do topo esquerdo, hoje **"‹ Voltar para mercado e auditoria"**, passa a ser
**"‹ Voltar para mercado"** — porque a auditoria não está mais nessa página.

## O que vai para a página Recibos

O bloco **"Auditoria de estoque"** de `graficos/page.tsx` sai de lá e vai para
`src/app/(app)/recibos/page.tsx`.

Acrescente uma frase de explicação, uma só, exatamente com este sentido:

> Auditoria transparente de todas as moedas no nosso sistema, suas e de outros
> usuários (nenhum nome será exposto).

Confira no código que isso é verdade antes de publicar a frase: o bloco agrega
por tipo de moeda (`allCoinsFlat`), sem nome nem e-mail de ninguém. Se algo ali
expuser titular, o bloco é que tem de mudar, não a frase.

**"Meus recibos" passa a se chamar "Recibos"** no menu
(`src/components/shell/Sidebar.tsx:194`) e no título derivado da rota
(`src/components/shell/Topbar.tsx`). A rota `/recibos` não muda.

## O fim da página Gráficos

Depois que tudo acima estiver movido, remova `src/app/(app)/graficos/page.tsx` e
a entrada do menu (`Sidebar.tsx:203`). A subpágina de comparações **não** é
removida — ela muda de lugar, para baixo de Mercado.

Verifique o que aponta para `/graficos` antes de apagar: há pelo menos um
`router.push('/graficos/comparacoes')` dentro da própria tela, e outras telas
podem linkar para lá. Link quebrado em produção é o tipo de coisa que só aparece
quando o cliente clica.

## Ordem de leitura

1. `CLAUDE.md`
2. `docs/execucao/AG2_COMPRAS_E_VENDAS.md` — o estado de onde esta branch parte
3. `src/app/(app)/graficos/page.tsx` e `graficos/comparacoes/page.tsx`
4. `src/app/(app)/mercado/page.tsx`
5. `src/app/(app)/recibos/page.tsx`
6. `src/components/market/` e `src/components/charts/`
7. `src/components/shell/Sidebar.tsx` e `Topbar.tsx`
8. `src/lib/charts.ts`

## Cuidados

- **Mover, não reescrever.** Os gráficos e a auditoria mantêm as mesmas funções,
  os mesmos dados e as mesmas APIs. O `Sparkline` e o `LineChart` não mudam.
- As cores das séries BTC/ETH/USDT foram trocadas em 21/09/2026 para as cores de
  marca de cada ativo (`#f7931a`, `#627eea`, `#26a17b`), e o Real Olímpico usa o
  emblema oficial de `/brand/` no lugar da sigla "RO". Preserve isso na mudança.
- Nada de `@/server/*` dentro de Client Component.
- Paginação de 10 em 10 é de **apresentação**: filtre e fatie no cliente, sobre o
  estado que o `AppProvider` já mantém. Não crie endpoint novo.
- CSS global por área, nomes de classe do monolito preservados. `responsive.css`
  continua sendo o último import de `globals.css`.

## Fechamento

`npm run typecheck`, `npm run lint`, `npm test` e `npm run build` — **uma vez
cada, no fim**. Não rode teste entre as etapas. Depois commit e push da branch.
