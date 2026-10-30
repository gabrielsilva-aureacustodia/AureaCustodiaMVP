# Benchmark — plataforma do cliente do Real Olímpico

```
Frente:     4 — Plataforma do cliente (feat/plataforma-real-olimpico)
Data:       25/10/2026
Rota 1:     VM do Colab, sessão ro-app (toolkits/pesquisa-na-vm): 18 alvos × 1440 e 375 px, capturas + auditoria JSON
Rota 2:     navegador embutido, para o que a VM não alcançou (403 no IP do Colab) e para o demo logado da Mercury
Leitura:    docs/pesquisa_benchmark_plataformas.md, pesquisa_benchmark_fase2.md, PLANO_EXECUTIVO_FRONTEND_PLATAFORMA.md,
            PLANO_EXECUTIVO_FASE2_FRONTEND.md; aprendizado_frontend docs 17, 20, 33, 34, 35, tópicos 29 e 35,
            toolkits/direcao-de-design
Marcas:     [MEDIDO] visto/medido nesta rodada · [LIDO] de documentação ou pesquisa anterior · [INFERÊNCIA] dedução
```

## 0. O que deu para ver, e o que não

| Alvo | VM (1440/375) | Navegador embutido | O que serviu |
|---|---|---|---|
| Nubank, Inter, Robinhood, Mercury, Conta Azul, Sotheby's, Binance (livro) | 200 | — | página pública; Binance carregou só o esqueleto do livro ("Order Book", "Market Trades") |
| XP, StockX, eBay, Catawiki, Heritage, PCGS Set Registry, Numista, Coinbase Advanced | **403** (IP do Colab bloqueado) | StockX, Numista, Catawiki, PCGS, Heritage abriram | página de produto/lote/catálogo |
| QuickBooks | erro de navegação na VM | não tentado de novo | só [LIDO] |
| **Mercury (demo logado)** | — | `demo.mercury.com` abriu a 1366 e a 375 | o único painel de conta real visível sem login — a melhor referência de área logada da rodada |

**Limite assumido:** os apps de conta (Nubank, Inter, XP, Robinhood, QuickBooks, Conta Azul) só mostram a área logada
depois de login. Para eles, o que entra aqui é o padrão já documentado nas pesquisas anteriores [LIDO] e o que as páginas
públicas mostram do produto [MEDIDO]. Nenhuma captura foi publicada; ficam no scratchpad da sessão.

Números da auditoria da VM [MEDIDO, `_resumo.tsv`]: Mercury 91 SVG inline e 27 `<picture>` na home; Sotheby's 151
`<picture>` e 145 imagens sem `width/height`; Nubank 96 imagens sem `width/height` no desktop; Robinhood com vídeo como
LCP no celular. Nenhum dos medidos usa sprite de ícones por `<use>` em quantidade, salvo Inter (6).

## 1. Por tema

### 1.1 Painel inicial (dashboard)
- **Mercury (demo) [MEDIDO]:** "Welcome, Jane" → fileira de ações em chips com **uma** primária ("Send") e as demais
  neutras (Transfer, Deposit, Request) → cartão do saldo com gráfico → contas. No celular a primária vira um botão de
  largura cheia ("Send money") com "More" ao lado.
- **Nubank, Inter [LIDO]:** saldo primeiro, atalhos em carrossel de ícones, o resto em cartões.
- **Robinhood [LIDO]:** valor da carteira grande no topo, um gráfico, e só então a lista.
- **Lição:** o painel abre pelo que é **da pessoa** (saldo, o que ela guarda) e oferece **um** próximo passo.

### 1.2 Acervo / carteira
- **PCGS Set Registry [MEDIDO]:** o acervo é exibido como coleção, foto da moeda encapsulada em destaque, contagem
  ("183.672 Registered Sets") como selo de confiança.
- **Numista [MEDIDO]:** página da moeda = foto do anverso e do reverso lado a lado + tabela "Features" (emissor,
  período, composição, peso, diâmetro) + duas ações neutras ("See swap offers", "View sale offers").
- **Lição:** linha de acervo com foto, código, valor e **status em selo**; ficha da moeda em tabela de pares.

### 1.3 Livro de ofertas por tipo de moeda (Coinbase/Binance só como UX de livro)
- **StockX [MEDIDO]:** na página do item, "Buy Now for $148" + dois botões — "Make Offer" (contornado) e "Buy Now"
  (primário) — e logo abaixo "Last Sale $304 · Highest Offer $270". "Sell Now for $270 or Ask for More".
- **Binance [MEDIDO, esqueleto]:** "Order Book" numa coluna, "Market Trades / My Trades" em abas na outra.
- **Coinbase Advanced [LIDO]:** livro com os dois lados lado a lado, a última negociação no meio, o seletor de par no topo.
- **Catawiki [MEDIDO]:** filtros como **chips** ("No reserve price", "Ending today") e categorias como chips.
- **Lição:** venda e compra lado a lado, filtro por tipo em chips, **última negociação e maior oferta de compra** à vista
  antes de agir; "Comprar" é a ação primária do cartão, "Fazer oferta" a secundária.

### 1.4 Fluxo de compra e venda
- **StockX [LIDO, fase 2]:** "All-in pricing" — o total com todas as taxas antes de confirmar.
- **Robinhood [LIDO]:** confirmação em uma tela, valor grande, uma ação.
- **eBay [LIDO]:** "Buy It Now" primário, "Make offer" secundário, a taxa de frete/serviço somada antes do clique.
- **Lição:** formulário na ordem **o quê → quanto → como pagar → total → ação**, com o total colado no botão.

### 1.5 Extrato
- **Mercury (demo, Transactions) [MEDIDO]:** chips de filtro (Saved views, Filters, Date, Keyword, Amount), três totais
  acima da tabela (Net change, Money in, Money out), "Export all" à direita, **esqueleto** na carga.
- **Conta Azul, QuickBooks [LIDO]:** extrato como tabela com 1.ª coluna data/descrição, exportação para planilha.
- **Lição:** filtros visíveis e removíveis, totais em cima, tabela larga com a 1.ª coluna fixa no celular, exportar à
  direita.

### 1.6 Faturas
- **Conta Azul, QuickBooks [LIDO]:** fatura com **status em selo** (aberta, vencida, paga), vencimento na linha, ação
  "Pagar" só na linha que pede ação.
- **Lição:** selo com cor + ícone + texto (Carbon, doc 20 §3.4); ação primária só onde há dívida.

### 1.7 Comprovante / recibo
- **Sotheby's, Heritage [MEDIDO]:** o lote é um documento: foto grande, ficha em pares, ação discreta.
- **PCGS [LIDO]:** verificação do certificado por número.
- **Lição:** o recibo continua documento (creme nos dois temas, `recibo.css`), com as ações agrupadas num painel ao lado.

### 1.8 Estados vazios
- **Mercury [MEDIDO]:** esqueleto enquanto carrega; vazio com explicação e ação.
- **Geist/Vercel [LIDO, doc 20 §1.7]:** "vazio por motivo" — por que está vazio e quando deixa de estar.
- **Lição:** todo vazio diz o motivo e oferece o próximo passo (link), e todo carregamento é esqueleto, não texto solto.

### 1.9 Navegação no celular
- **Mercury [MEDIDO]:** cabeçalho compacto e fixo, menu numa gaveta, primária de largura cheia.
- **Nubank [MEDIDO, página pública]:** cabeçalho de 56 px com a ação principal e o menu.
- **Lição:** cabeçalho que gruda no topo com o menu e o saldo; barra lateral só a partir de `lg` (doc 35 §5).

## 2. Comparação explícita com os métodos do repositório de frontend

| Método do `aprendizado_frontend` | Onde está | Estado na plataforma antes | Aplicado nesta frente |
|---|---|---|---|
| Barra lateral só a partir de `lg` | doc 35 §5 | gaveta só abaixo de 1080 px | cliente com coluna a partir de 1024 px; /admin intocado em 1080 |
| Tabela larga: 1.ª coluna `sticky` com fundo opaco, sem JS | doc 35 §5; tópico 35 passo 4b | 0 de 7 tabelas | primitivo `.tabela-fixa` + `th scope="row"` |
| Componente só de marcação sem `"use client"` | doc 35 §4.1 | 14 páginas `use client` | `/inicio` deixou de ser; componentes novos de marcação sem hook |
| Ícone estático sem biblioteca de cliente | doc 35 §4.5 | SVG inline (já ok) | mantido; ícones decorativos com `aria-hidden` |
| Nome acessível único por destino | doc 35 §6 | "Comprar", "Editar", "Cancelar", "Ver recibo" repetidos | `.sr-only` com o objeto ("Comprar 2 Direitos Humanos a R$ 440,00…") |
| Um primário por bloco de decisão | tópico 35 passo 1; doc 18 V05/V14 | 11 arquivos com mais de um `btn-gold` | filtros viraram chips; primária única por tela/bloco |
| `disabled` só com o motivo escrito | tópico 35 passo 1 | "Publicar anúncio" desabilitado mudo | motivo ao lado, ligado por `aria-describedby` |
| Filtro visível e removível; contagem junto da lista | tópico 35 passo 2; doc 20 §3.5 | botões dourados por tipo, valor sempre aberto | chips `aria-pressed`, faixa de valor em `<details>` que nasce aberto com filtro |
| Teclado do celular no campo | tópico 35 passo 3 | 32 de 50 campos sem dica | `inputMode`/`autoComplete` nos campos tocados |
| Vazio por motivo | tópico 35 passo 4b; doc 17 P7 | "Nenhuma oferta…" seco | `.vazio` com motivo e próximo passo |
| Selo com cor + ícone + texto | tópico 35 passo 4b; doc 20 §3.4 | selo só por cor (`#d9383a`) | `.selo` com ✓ ! ✕ e tokens |
| Página longa com "Nesta página" e `scroll-margin-top` | tópico 35 passo 4 | não havia | primitivo `.nesta-pagina`; `[id]{scroll-margin-top}` |
| Reduced motion: reduzir, não zerar | tópico 35 passo 3c | zera tudo (`responsive.css`) | mantido o global existente; nada novo anima além de cor/opacidade |
| Clique só em `button`/`a` | tópico 29 (QA) | 31 `div/span` com `onClick` | atalhos, tema, sair, termos, "Selecionar todas" viraram `button`/`Link` |
| Brief e princípios em ordem de desempate | toolkits/direcao-de-design | não havia | §3 abaixo |
| Revisão por conceito (hierarquia 14, ênfase 08, Gestalt 11) | skill revisao-de-design | — | cada decisão da §4 cita o conceito |

## 3. Brief curto da plataforma (princípios em ordem de desempate)

1. **A regra aparece antes da ação** — aviso de custódia, taxa e total ficam visíveis antes do botão; nada de surpresa
   depois do clique. (Vence qualquer ganho de espaço.)
2. **O que é da pessoa primeiro** — saldo, acervo e pendências antes dos números da plataforma.
3. **Uma ação primária por tela** — o dourado é escasso (conceito 08); o que se repete por linha é contornado.
4. **Funciona com teclado e leitor de tela** — `button`/`a` de verdade, nomes únicos, selo não só por cor.
5. **O sistema vence a exceção** — classe e token em vez de `style={{}}`; cor só de `tokens.css` (conceito 12).

> Desempate: se "uma primária" (3) brigar com "a regra antes" (1), vence a regra — o aviso "Custódia a pagar" com o
> link "Pagar agora" fica mesmo onde já existe outra ação dourada.

## 4. Decisões (cada uma com a referência)

| # | Decisão | Referência |
|---|---|---|
| D1 | Casco do cliente com classe própria (`.app-cliente`); coluna lateral a partir de 1024 px, gaveta abaixo; cabeçalho que gruda no topo no celular | doc 35 §5; Mercury e Nubank 375 [MEDIDO] |
| D2 | Menu agrupado por tarefa (Visão geral · Negociar · Meu acervo · Conta) e item aceso nas subpáginas | conceito 11 (proximidade); Mercury [MEDIDO] |
| D3 | Início: resumo da conta (saldo + 3 contadores + **uma** primária que muda com o momento) → atalhos → mercado de hoje | Mercury, Nubank, Robinhood §1.1 |
| D4 | Mercado: faixa de números no topo; livro em duas colunas iguais; filtro por tipo em chips; faixa de valor em `<details>`; histórico pessoal recolhido | StockX, Coinbase, Catawiki §1.3; tópico 35 passo 2 |
| D5 | Compras/Vendas: o quê → quanto → como pagar → **total** → ação; total colado ao botão; motivo do botão desabilitado escrito | StockX "all-in", eBay §1.4; tópico 35 passo 1 |
| D6 | Minha conta: cartão do saldo com Depositar (primária) e Sacar; contadores ao lado; atalhos como `button`/`Link` | Mercury, Nubank §1.1; tópico 29 |
| D7 | Tabelas (extrato, custódia, faturas, auditoria, configurações): `.tabela-fixa` com 1.ª coluna fixa e `th scope="row"` | doc 35 §5; Mercury Transactions [MEDIDO] |
| D8 | Vazio por motivo + próximo passo; carregamento em esqueleto | Geist (doc 20 §1.7); Mercury [MEDIDO] |
| D9 | Selo de status com cor + ícone + texto | Carbon (doc 20 §3.4) |
| D10 | Nome acessível único por destino nos botões repetidos | doc 35 §6 |
| D11 | Ficha da moeda e recibo continuam documento; ações agrupadas | Numista, Sotheby's, Heritage §1.2/§1.7 |
| D12 | Nenhuma feature removida: o que saiu da vista foi para `<details>` com o resumo dizendo o que tem dentro | regra da frente; tópico 35 passo 4b |

## 5. Fontes (acessadas em 25/10/2026)
- Capturas e auditoria da VM: `rf4-<alvo>-{desktop,375}-2026-10-25.png` e `auditoria/<alvo>-*.json` (scratchpad da
  sessão; não publicadas).
- `demo.mercury.com/dashboard` e `/transactions` (1366 e 375 px), `stockx.com` (página de item),
  `en.numista.com/2513`, `catawiki.com` (categoria), `pcgs.com/setregistry`, `coins.ha.com` — navegador embutido.
- Pesquisas anteriores do projeto e docs 17, 20, 33, 34, 35 e tópicos 29/35 do `aprendizado_frontend`.

## 6. Passada do Distilla (30/10/2026)

Método do `agentes/distilla/DISTILLA.md` §4 (cinco lentes) e checklist `topicos/29-checklist-qa-final.md`, aplicados
**sobre o que já foi feito em 25/10**. Evidência marcada: **[CÓDIGO]** = lido no repositório; **[NÃO MEDIDO]** = precisa
de navegador e fica para a verificação final.

| Lente | O que o repositório já tem [CÓDIGO] | O que faltava / decisão |
|---|---|---|
| 1 Estrutura e hierarquia | Uma primária por tela, resumo da conta antes do mercado, menu por tarefa (D2–D6) | Nada novo. Confirmar com a auditoria (7 arquivos com mais de um primário, todos modais/wizard com uma primária por etapa) |
| 2 Responsividade e toque | `responsive.css` com `16px` nos campos, alvos de 44 px em 8 regras, gaveta abaixo de 1024 px | `100vh` → `dvh` no casco (R4); `✕` do `PhotoSlot` com alvo de 44 px (R3); 9 campos sem dica de teclado (R7). 375/768/1440 **[NÃO MEDIDO]** nesta sessão |
| 3 Componentes e peças | `<EstadoVazio>`, `<Selo>`, `<Esqueleto>`, `<Aviso>` da marca já aplicados | `SellerBidRow` órfão (R5) — só registrado. **Nenhuma peça gerada**: a regra do Distilla (§8, "dado real") e a do repositório (logos só de `/brand/`) não pedem peça nova aqui |
| 4 Movimento, som e estados | `prefers-reduced-motion` global em `responsive.css` (zera animação e transição) | Faltam os estados de erro e carregamento por rota (R1) e a confirmação própria no cancelamento da retirada (R2). Sem som: a plataforma não tem trilha |
| 5 Acabamento | axe 0 violações em 25/10; contraste por tokens; foco visível em 11 CSS | Impressão do recibo (R6). axe, LCP e INP de novo **[NÃO MEDIDO]** |

**Checklist 29, itens que se aplicam e já passam [CÓDIGO]:** skip-link, `aria-current`, skeleton, `th scope`, `lang`,
rótulo ligado ao campo, `inputMode`/`autoComplete`, `rel="noopener noreferrer"` nos `target="_blank"` desta área.
**Não se aplicam à área logada:** SEO, JSON-LD, consentimento de terceiros e o restante da seção E/G (são da landing).

**Fontes:** `agentes/distilla/DISTILLA.md` §4 e §8; `topicos/29-checklist-qa-final.md` A–C e F; `design/mapa.md`
conceitos 08, 11, 29 (estados e retorno), 33 (toque e modos de entrada).
