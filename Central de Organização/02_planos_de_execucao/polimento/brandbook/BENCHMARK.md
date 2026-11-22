# Benchmark de marca — Real Olímpico (Frente 1)

```
Data:       25/10/2026
Método:     extrator próprio de "DNA visual" (vm_marca.py, fora do Git) na VM do Colab, sessão ro-brand
            (toolkits/pesquisa-na-vm), 1440×900 e 375×812; sites que bloquearam o IP da VM medidos no navegador
            embutido com o MESMO script (javascript), motivo registrado na coluna "Rota"
Mede:       cores mais frequentes de fundo (ponderadas por área) e de texto; famílias, pesos e tamanhos de fonte;
            h1/h2/p; raios; sombras; botão (fundo, cor, raio, altura, peso)
Não refaz:  docs/pesquisa_benchmark_plataformas.md e _fase2.md (padrões de UX e conversão, 01/10/2026)
Capturas:   nenhuma no Git; só JSON e números (aqui)
```

## 1. Medido (página inicial, 1440 px)

| # | Referência | Setor | Rota | Fundo / superfície | Texto | Acento | Tipografia (família · h1 · corpo) | Raio | Botão |
|---|---|---|---|---|---|---|---|---|---|
| 1 | **Stripe** | pagamentos | VM 200 | `#ffffff` `#f8fafd` `#e5edf5`; navy `#0d1738` | `#061b31` `#50617a` | roxo `#533afd` | Söhne var · h1 44/50,6 w300 −0,88px · corpo 16 | 4–8 | 40 px, raio 4 |
| 2 | **Nubank** | banco | VM 200 | `#ffffff` `#f3efe6` | `#1e002f` | roxo `#8d0de3` | nu Sans Display/Text · h1 112 w600 −1,4px | pílula, 12–16 | 48 px |
| 3 | **XP** | corretagem | navegador (VM 403) | `#f0f0f0` `#1f1f1f` | `#121212` `#666` | amarelo `#fbc105` | XP Lighthouse 400/500 · h1 24/40 w700 | pílula 40, 24, 8 | 40 px pílula |
| 4 | **BTG Pactual** | banco | navegador (VM ERR_HTTP2) | `#ffffff` | `#05132a` `#69717f` | azul `#195ab4` | BTG Pactual Sans quase só 400 · h1 24 w400 −0,42px | 4–8 | 48 px, raio 4 |
| 5 | **Robinhood** | trading | VM 200 | `#110e08` `#1c180d` `#fff` | `#110e08` `#d9d9d9` | lima `#ccff00` | **Martina Plantijn (serifa)** h1 110 w400 + Capsule Sans/Phonic | 36 | — |
| 6 | **Carbon (IBM)** | design system | VM 200 | `#f4f4f4` `#fff` `#161616` | `#161616` `#525252` | azul `#0f62fe` | **IBM Plex Serif** h1 187 w200 + Plex Sans 400/600 | 0–8 | raio 0 |
| 7 | **Primer (GitHub)** | design system | VM 200 | `#ffffff` `#f6f8fa` | `#1f2328` `#59636e` | azul `#0055d5` | Mona Sans var · h1 56 w440 · corpo 16/24 | 6–12 | 32 px, raio 6 |
| 8 | **StockX** | marketplace | navegador (VM 403) | `#f4f3f1` `#0f0f0f` | `#242424` | verde `#006340`, alta `#1d8751`, baixa `#c92e1a` | Suisse Intl 400/500 · corpo 16/24 | pílula, 8 | 44 px |
| 9 | **Heritage Auctions** | leilão numismático | navegador (VM 403) | `#ffffff` `#dcdcdc` `#040821` | `#383838` | azul `#0253c2` | Proxima Nova + Helvetica Neue Light · corpo 14 | 3–5 | 50 px |
| 10 | **Sotheby's** | leilão | VM 200 | `#ffffff` `#f1f1f1`; **navy `#00253e`** | `#333333` `#6b6b6b` | **ouro `#c29b40`** | **Mercury Display (serifa)** h1 32 w500 + Benton Sans | 2–6 | 80 px contorno |
| 11 | **Christie's** | leilão | navegador (VM timeout) | `#ffffff` `#f7f7f7` `#222` | `#222222` | — | **ABC Arizona Serif** + Arizona Sans 300 · corpo 16/22,4 | 2 | 38 px, raio 2 |
| 12 | **Catawiki** | leilão online | navegador (VM 403) | `#f5f5f6` `#ffffff` areia `#ebe6da` | `#000` `#6d7073` | azul `#0033ff` | Basis Grotesque 400/500/700 + **Freight Big (serifa)** | 17–32, pílula | — |
| 13 | **PCGS** | certificação | VM 200 | `#fafafa` `#0f0f0f` `#1d1d1d` | `#212121` `#48494a` | — | Area Normal + Montserrat · corpo 15 | 8–16, pílula | — |
| 14 | **NGC** | certificação | navegador (VM 403) | `#ffffff` `#efeeee`; navy `#0c264c` | `#000` `#999` | azul `#0f76ce` | Arial + **Georgia nos títulos** (28 w400) | 4–6 | — |
| 15 | **Numista** | catálogo | navegador (VM 403) | `#f4f1ee` `#dfeefb`; navy `#000088` | `#000` | azul `#006da8` | **Source Sans 3** 400/700 (a fonte de texto atual do RO) | 8 | — |
| 16 | **Royal Mint** | casa da moeda | VM 200 | **creme `#f4f1eb`**, `#edeae5`; **roxo-noite `#211c35`** | `#0e072c` `#4a4a49` | — | **Garamond** h1 48 w300 + Brandon Grotesque + Freight Text | 4, 32 | sombra `0 30 70 rgba(0,0,0,.3)` |
| 17 | **Rijksmuseum** | museu | VM 200 | `#40474f`, foto | `#ffffff` `#000` | laranja `#cc4c28` | RijksText 400/700 · corpo 17,4 | 1–2 | 50 px |
| 18 | **British Museum** | museu | navegador (VM 403) | `#ffffff`, foto com véu `rgba(0,0,0,.75)` | `#000` `#595959` | verde `#9ac23d` | Helvetica Neue 400/700 | 0 | — |
| — | Museu de Valores do BCB | museu numismático | VM 404 | endereço mudou; não substituído nesta rodada | | | | | |

Fora da lista pedida, já cobertos nos benchmarks de 01/10 (não refeitos): Goldin, PSA Vault, Rally, Chrono24, Coinbase,
Kraken, Uniswap, Revolut.

### 1.1 Medida de contraste dos acentos dourados do setor (sobre branco)
Sotheby's `#c29b40` 2,61:1 — **reprova como texto**, e a Sotheby's só o usa em fundo e filete. Nosso `#c9a24b` dá 2,40:1:
mesmo comportamento. Conclusão: ouro de marca é **preenchimento**; texto dourado no claro precisa do 800 (`#7a5d1c`, 6,16:1).

## 2. Padrões que os números mostram

| Padrão | Quem | Leitura para o Real Olímpico |
|---|---|---|
| **Serifa clássica no título + grotesca no texto** | Sotheby's, Christie's, Royal Mint, Catawiki (Freight Big), NGC (Georgia), Robinhood, Carbon | é a gramática de "peça de valor + interface confiável"; até fintech de 2026 voltou à serifa no herói |
| **Azul profundo como cor institucional, metal como acento** | Sotheby's (`#00253e` + `#c29b40`), Royal Mint (`#211c35`), NGC (`#0c264c`), Stripe (`#0d1738`), Heritage (`#040821`) | nosso azul-noite + ouro já é o par do setor; manter e **disciplinar** (orçamento de ouro) |
| **Fundo quente, não branco puro** | Royal Mint `#f4f1eb`, Nubank `#f3efe6`, StockX `#f4f3f1`, Numista `#f4f1ee`, Catawiki `#ebe6da` | tema claro em pergaminho `#f7f5f0`, não `#ffffff` |
| **Raio pequeno no leilão, médio no fintech** | leilão/museu 0–6; fintech/marketplace 8–16 + pílula | raio por elemento: 8 campo, 10 botão, 14 cartão |
| **Peso leve no título grande** | Stripe w300, Carbon w200, Royal Mint w300, Christie's w300, Primer w440 | display em Newsreader **500**, nunca 700 em tamanho grande |
| **Botão de 40–50 px** | Stripe 40, BTG 48, StockX 44, Heritage 50, Rijks 50 | 44 px é o piso, 52 px no herói |
| **Status com cor + texto** | StockX (alta `#1d8751`, baixa `#c92e1a`) | selos com texto e ponto |
| **Poucas sombras** | só Stripe (`0 16 32 rgba(50,50,93,.12)`), BTG e Royal Mint usam sombra marcada | sombra só para elevação real (4 níveis) |

## 3. Comparação explícita com os métodos do repositório de frontend

| Método (aprendizado_frontend) | O que ele pede | Como foi aplicado aqui | Onde |
|---|---|---|---|
| **Brief de design** (`toolkits/direcao-de-design/brief-de-design.md`, conceito 16) | propósito, usuário, **princípios em ordem de desempate**, métrica, direção datada | Brandbook §1: propósito em uma frase, conceito "cofre e vitrine", **6 princípios ordenados** com exemplo de desempate | `docs/marca/BRANDBOOK_REAL_OLIMPICO.md` §1 |
| **Espinha de tokens** (`espinha-de-tokens.md`) | auditar camada por camada antes de decidir | auditoria abaixo (§3.1); três camadas (primitivo → papel → alias legado), como o `@k2con/ui` | `src/brand/tokens.css`, `src/styles/tokens.css` |
| **Conceito 02 — cor** (OKLCH como ponte, papel antes de matiz) | cor com papel e par fundo/conteúdo | papéis `--ro-*` com par medido; ouro separado em **preenchimento** × **texto** | Brandbook §4.3–4.4 |
| **Conceito 07 — contraste** | ≥ 4,5:1 texto, 3:1 controle, nos dois temas | 13 pares × 2 temas medidos e travados em teste | `src/brand/__tests__/tokens.test.ts` |
| **Conceito 05 — tipografia** (≤ 2 famílias, corpo 16–20, entrelinha 1,2–1,45, 45–90 car.) | escala por papel | 2 famílias; corpo 16/1,55; linha ≤ 68 car.; 10 papéis | Brandbook §5 |
| **Conceito 10 — escala** | escala modular **ou** por papel (tensão registrada em `design/fontes.md`) | escolhida **por papel com clamp()** — escala modular pura deixava o título de painel grande demais a 375 px | `--ro-tipo-*` |
| **Conceito 08 — ênfase** (um ponto focal, uma ação primária) | | princípio 4 + "orçamento de ouro" (§4.5) | Brandbook §1.3, §4.5 |
| **Conceito 12 — ritmo e repetição** | mesmo papel, mesmo tratamento; token em vez de valor solto | 16 variáveis usadas e nunca definidas viraram alias; `.ro-*` para padrões que cada tela fazia do seu jeito | `src/brand/componentes.css` |
| **Conceito 04 — textura** | clima sem peso | guilhoché em CSS puro (0 KB de imagem) + versão SVG da Frente 2 | `.ro-guilloche` |
| **Conceito 09 — movimento** | cada animação orienta, dá retorno ou revela; reduzir movimento | durações em token, **zeradas no próprio token** com `prefers-reduced-motion`; giro de 4° da moeda removido | Brandbook §10 |
| **Conceito 15 — grid** | container e zonas | container 1200, margem fluida, `auto-fit` 260 px | Brandbook §6 |
| **Conceito 17 — direção estética** | escolher um extremo e dizer o que será lembrado | "cofre e vitrine": suíço objetivo na área logada, editorial de casa de leilão na vitrine | Brandbook §1.2, §12 |
| **Taxonomia de componentes** | primitivo → componente → padrão → bloco | `.btn`/`.field` = componente; `<Aviso>`, `<Selo>` = componente; faixa, passos, cartão de moeda = bloco | Brandbook §9 |
| **Doc 34 — malha** | ligar conceito → código → medida | cada decisão abaixo cita a referência medida e o conceito | §4 |
| **Doc 35 — lições K2CON** | ícone estático sem biblioteca de cliente; componente de marcação sem `"use client"` | `<Selo>`, `<Aviso>`, `<EstadoVazio>`, `<Esqueleto>`, `<LogoMarca>` são Server Components com SVG inline | `src/components/ui/`, `src/brand/componentes/` |
| **Skill revisao-de-design** | revisão por conceito antes de aceitar branch | rodada no fechamento (MD_EXECUCAO, Sessões) | — |
| **pesquisa-na-vm** | VM primeiro, navegador embutido de reserva, motivo registrado | 9 alvos medidos na VM; 9 no navegador (7 bloqueios 403, 1 erro HTTP/2, 1 timeout); 1 endereço 404 | §1 |

### 3.1 Auditoria da espinha de tokens (estado em 24/10/2026, antes do contrato)
| Camada | Estado | Achado |
|---|---|---|
| Rampa de neutros | ⚠️ | só tons soltos (`--navy*`, `--muted`), sem escala |
| Cor de marca | ⚠️ | `--gold` servia de preenchimento **e** de texto: 2,40:1 no claro |
| Semânticas com par fundo/conteúdo | ❌ | verde/vermelho sem variante de texto; vermelho 3,93:1 no escuro |
| Espaçamento | ❌ | valores soltos (14, 16, 22, 26, 28 px) |
| Raio | ⚠️ | 8, 9, 10, 11, 14 sem papel |
| Escala tipográfica | ❌ | tamanhos soltos (12,5 / 13 / 13,5 / 14,5 / 17 / 21 px) |
| Sombra | ⚠️ | 1 por tema + 3 fixas; `--shadow-sm/md/lg` usadas e **inexistentes** |
| Movimento | ❌ | durações e curvas escritas à mão em cada regra |
| Z-index | ⚠️ | 50/60/9999 soltos |
| Fantasmas | ❌ | **16 variáveis usadas sem definição** (no claro, o texto `#f8fafc` do fallback sumia) |

## 4. Decisões (cada uma com a referência que a sustenta)

| # | Decisão | Sustentada por |
|---|---|---|
| **D1** | Manter azul-noite + ouro + pergaminho, amostrados da própria logo | Sotheby's `#00253e`+`#c29b40`, Royal Mint `#211c35`+`#f4f1eb`, NGC `#0c264c`, Stripe `#0d1738`; conceito 17 |
| **D2** | Ouro em dois papéis: preenchimento (500) e texto (800 no claro) | medida §1.1; Sotheby's só usa o ouro como fundo/filete; conceito 07 |
| **D3** | Serifa de exibição **Newsreader** (eixo óptico) no lugar de Playfair | Sotheby's Mercury, Christie's Arizona Serif, Royal Mint Garamond, Robinhood Martina Plantijn, Carbon Plex Serif; a logo é capitular romana, não didone |
| **D4** | Texto em **Inter** no lugar de Source Sans 3 | Söhne (Stripe), Suisse (StockX), BTG Sans: neo-grotesca tabular; Source Sans 3 = Numista (genérica no setor); conceito 05 |
| **D5** | Título grande em peso 500, nunca 700 | Stripe 300, Carbon 200, Royal Mint 300, Christie's 300 |
| **D6** | Tema claro em pergaminho `#f7f5f0`, não branco | Royal Mint, Nubank, StockX, Numista, Catawiki |
| **D7** | Raio por elemento 8/10/14/20 | leilão 0–6 × fintech 8–16 (§2); conceito 01 |
| **D8** | Aviso em bronze, não amarelo | colisão com o ouro da marca; XP usa amarelo como **marca**, não como alerta |
| **D9** | Status sempre texto + cor + ponto | StockX alta/baixa; conceito 07 (cor não é o único sinal) |
| **D10** | Assinatura visual = aro, serrilha e guilhoché | numismática (PCGS/NGC destacam bordo e relevo); cédula; Frente 2 entregou guilhoché e macro de serrilha |
| **D11** | Botão 44 px de piso, 52 no herói; 1 dourado por tela | Stripe 40, StockX 44, BTG 48, Heritage/Rijks 50; conceito 08 |
| **D12** | Movimento curto, zerado no token com movimento reduzido; sem giro automático em lista | Stripe e Primer (estados curtos); conceito 09 |
