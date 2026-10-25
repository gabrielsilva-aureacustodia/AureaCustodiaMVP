# Brandbook — Real Olímpico

```
Versão:     1.0 — 25/10/2026 (Frente 1 do polimento, branch feat/brandbook-real-olimpico)
Marca:      Real Olímpico (nome fantasia) · AUREA CUSTODIA LTDA (razão social, CNPJ 68.071.452/0001-06)
Código:     src/brand/ (tokens, fontes, logo) · src/brand/componentes.css · src/styles/base.css
Pesquisa:   docs/polimento/brandbook/BENCHMARK.md (25 referências medidas, decisões D1–D12)
Ativos:     public/visuais/ (Frente 2, Antigravity) · pedidos novos em docs/marca/PEDIDOS_ANTIGRAVITY.md
Regra:      acrescente, não apague — date cada mudança no §15; o que deixar de valer fica riscado com o motivo
```

Este documento é lido por pessoas (sócios, contador, agência) **e** por agentes (Claude Code, Antigravity). Onde houver
número, ele é medido; onde houver regra, ela tem o porquê ao lado. Se uma tela brigar com este documento, o documento
vence — ou é corrigido aqui, com data.

---

## 1. Essência

### 1.1 O que é o Real Olímpico, em uma frase
O lugar onde a sua moeda comemorativa fica **guardada de verdade, num cofre**, e pode ser **negociada sem sair de lá** —
com o comprovante de custódia (o recibo) no seu nome.

### 1.2 A ideia que a marca carrega: **cofre e vitrine**
Todo colecionador vive entre duas vontades: **proteger** a peça (gaveta, cofre, ninguém mexe) e **mostrar** a peça
(vitrine, luz, gente olhando). O Real Olímpico é o primeiro lugar em que as duas coisas acontecem ao mesmo tempo. A
identidade visual traduz isso em dois registros que convivem na mesma tela:

| Registro | Onde aparece | Como se vê |
|---|---|---|
| **Cofre** — segurança, prova, número certo | painel, extrato, recibo, tabela, admin | azul-noite, linhas finas, números tabulares, nada que pisque |
| **Vitrine** — a moeda como peça de museu | landing, cartão de moeda, recibo, abertura de área | luz quente sobre metal, serifa clássica, espaço em volta da peça |

### 1.3 Princípios (ordem de desempate — o de cima vence)
Modelo: `aprendizado_frontend/toolkits/direcao-de-design/brief-de-design.md`.

1. **Dado certo antes de bonito** — saldo, preço, taxa e prazo nunca ficam atrás de animação, fonte carregando ou
   imagem. Nenhum número dentro de imagem.
2. **Confiança se mostra, não se promete** — o cofre aparece (foto real, lote, caixa, recibo); não existe "100% seguro",
   "garantido", "rentável". Vocabulário jurídico do §11 é piso.
3. **A moeda é a protagonista** — a peça real (foto ou render fiel) é o ponto focal de cada vitrine; ornamento nenhum
   compete com ela.
4. **Uma ação dourada por tela** — o ouro é raro: botão primário, número principal, filete de assinatura. O resto é
   contorno, texto ou neutro.
5. **O sistema vence a exceção** — cor, raio, sombra e movimento só por token `--ro-*`; padrão novo entra aqui antes de
   entrar na tela.
6. **Movimento informa, nunca decora** — e some com "reduzir movimento".

> Desempate: se o giro da moeda no herói (3, 6) atrasar o "Criar conta" no celular (1), o giro vira imagem parada. Se
> uma foto bonita do cofre (3) empurrar a tabela de taxas para baixo da dobra em `/taxas` (1), a foto sai.

### 1.4 Arquitetura de marcas: Real Olímpico × AUREA CUSTODIA LTDA
| | **Real Olímpico** | **AUREA CUSTODIA LTDA** |
|---|---|---|
| Papel | marca de produto, a que o público vê | empresa responsável, a que assina |
| Onde | toda interface, título de página, e-mail, material público, redes | onde há CNPJ: contrato, termos, NFS-e, rodapé legal, objeto postal, descritor de cartão, certificado |
| Logo | os dois recortes de `public/brand/` (§3) | **sem logo**: assinatura tipográfica (abaixo) |
| Concordância | masculina: "**o** Real Olímpico", "do Real Olímpico" | feminina quando citada por extenso ("a AUREA CUSTODIA LTDA") |

**Assinatura institucional** (rodapé, contrato, PDF): texto, nunca imagem — `AUREA CUSTODIA LTDA · CNPJ
68.071.452/0001-06`, em Inter 500, caixa-alta com espaçamento `.08em`, cor `--ro-texto-suave`. Endosso curto, quando a
marca de produto vem antes: "Real Olímpico é operado pela AUREA CUSTODIA LTDA". A logo antiga `logo-aurea.webp` é
**histórico**: não aparece mais em tela nenhuma.

---

## 2. Tom de voz

**Um curador de cofre conversando com um colecionador.** Sabe muito, fala simples, nunca vende sonho.

| É | Não é |
|---|---|
| claro — "Sua moeda está no cofre desde 02/10." | técnico — "Ativo custodiado com status ATIVO." |
| exato — "R$ 2,00 por moeda por mês." | vago — "Taxas a partir de valores acessíveis!" |
| calmo — "O pagamento ainda não caiu. Vamos avisar por e-mail." | alarmado — "ERRO! Pagamento falhou!!" |
| respeitoso com a peça — "peça", "moeda", "exemplar" | gíria de mercado — "papel", "ativo", "posição" |
| segunda pessoa, "você" | "o usuário", "o cliente" na interface |

Regras de escrita: frase curta (até ~20 palavras); verbo na frente do botão ("Guardar moeda", "Ver recibo"); número
sempre com unidade e formato brasileiro (`R$ 1.234,56`, `02/10/2026`, `0,5%`); data por extenso só em texto corrido.
Mede-se com a skill `legibilidade-flesch-kincaid` (alvo: até 8.º ano no texto de interface).

---

## 3. Logo

**A logo é intocável** (registro formal em andamento). Existem dois recortes de interface e uma prancha de referência:

| Arquivo | O que é | Use quando |
|---|---|---|
| `public/brand/logo-real-olimpico-marca.webp` (600×560) | emblema + letreiro "REAL OLÍMPICO" | a logo aparece sozinha e precisa dizer o nome: entrada, cadastro, rodapé, painel, e-mail |
| `public/brand/logo-real-olimpico-emblema.webp` (1024×1024) | só o medalhão | o nome já está escrito ao lado: barra lateral, cabeçalho compacto, favicon, avatar |
| `public/brand/logo-real-olimpico.webp` | prancha de identidade (painel + 6 variações) | **nunca em interface** — é referência para a agência |

Componentes: `<LogoMarca largura={160} />` e `<LogoEmblema largura={40} />` (`src/brand/componentes/Logo.tsx`).

### 3.1 Área de proteção
Espaço livre em volta da logo = **metade do diâmetro do medalhão** (na marca: ~¼ da largura total; no emblema: ½ da
largura). Nada de texto, borda ou outra imagem dentro dessa margem.

### 3.2 Tamanho mínimo
| Recorte | Mínimo em tela | Por quê |
|---|---|---|
| Marca | **72 px de largura** | abaixo disso o "OLÍMPICO" vira risco (estimado pela proporção do arquivo: a 72 px a letra fica com ~4 px) |
| Emblema | **24 px** | abaixo disso o "R" do medalhão perde a perna |

Os componentes impõem esses mínimos sozinhos.

### 3.3 Fundos permitidos
| Fundo | Permitido | Observação |
|---|---|---|
| Azul-noite (`--ro-noite-900/950`) | ✅ preferido | é o fundo da prancha oficial |
| Pergaminho / branco (`--ro-pergaminho-0/100`) | ✅ | sombra mais leve (base.css já troca no tema claro) |
| Foto escura sem textura sob a logo | ✅ | com véu `--ro-veu` se a foto tiver detalhe |
| Ouro, verde, vermelho, gradiente colorido | ❌ | o ouro da logo some ou vibra |
| Foto clara ou com textura atrás do medalhão | ❌ | perde o contorno |

### 3.4 Proibido
Recolorir (inclusive monocromático), girar, distorcer, contornar, aplicar brilho/filtro, animar o medalhão girando,
recortar o letreiro, recompor emblema e letreiro em outra posição, gerar uma "versão nova" por IA, usar a prancha como
logo. A única intervenção permitida é a sombra discreta de `.logo-box img` / `.ro-logo` para separar do fundo.

---

## 4. Cor

### 4.1 De onde vem a paleta
Amostrada **dos próprios arquivos da logo** (script `sharp` sobre os `.webp`, 25/10/2026):
- azul da prancha ≈ `#001028`–`#001030` → família **noite**; os tons do monolito (`#081226`, `#0d1b35`, `#10203f`,
  `#132546`) já eram esse azul e foram mantidos;
- ouro do emblema de `#4e3511` (sombra) a `#f7de8a` (brilho), meio em `#ae8b44` → família **ouro**, com o `#c9a24b` do
  monolito como 500;
- creme da prancha `#f0f0e8` → família **pergaminho**.

O benchmark confirma a escolha: Sotheby's usa navy `#00253e` + ouro `#c29b40`; Royal Mint, roxo-noite `#211c35` +
creme `#f4f1eb`; Stripe, navy `#0d1738` — **azul profundo + metal + papel é a gramática da confiança** em casa de leilão,
casa da moeda e fintech (BENCHMARK §D1).

### 4.2 Primitivos (camada 1) — `src/brand/tokens.css`
| Família | Tons (hex) |
|---|---|
| **noite** | 50 `#eef2f9` · 100 `#d9e1ef` · 200 `#b3c1da` · 300 `#8fa0bd` · 400 `#6a7d9f` · 450 `#5a6b8c` · 500 `#4a5d80` · 600 `#34466a` · 700 `#1e3054` · 750 `#152a52` · 800 `#132546` · 850 `#10203f` · 900 `#0d1b35` · 920 `#0b1830` · 950 `#081226` · 990 `#050a16` |
| **ouro** | 50 `#fbf6e9` · 100 `#f8ecc6` · 200 `#f2dc95` · 300 `#ebc977` · 350 `#d4af6a` · 400 `#e3b95c` · **500 `#c9a24b`** · 600 `#a07c2c` · 650 `#8a7444` · 700 `#8a6c2a` · 800 `#7a5d1c` · 900 `#5d4718` · 950 `#1a1608` |
| **pergaminho** | 0 `#ffffff` · 50 `#fdf9ef` · 100 `#f7f5f0` · 150 `#f4f1e9` · 200 `#f5f0e4` · 250 `#f2ede0` · 300 `#e3dbc0` · 400 `#d9cfae` · 500 `#a08e5e` · 600 `#6b6248` · 950 `#fdfaf2` |
| **verde** (sucesso) | 300 `#dff5e8` · 400 `#4cc27c` · 500 `#3fae6a` · 700 `#1f7a45` |
| **vermelho** (perigo) | 300 `#ffe3e3` · 400 `#e07a7a` · 500 `#d05555` · 700 `#a33232` |
| **bronze** (aviso) | 300 `#f7e7bd` · 400 `#e8913a` · 700 `#9a4f0f` |
| **azul** (informação) | 400 `#6ea8ff` · 700 `#2f5fb3` |

**Aviso é bronze, não amarelo**: amarelo ao lado do ouro da marca seria lido como "destaque", não como "atenção".
**Neutro frio (cinza puro) não existe**: ao lado do ouro ele parece sujo.

### 4.3 Papéis (camada 2) — o que o CSS das telas lê
| Papel | Escuro | Claro | Uso |
|---|---|---|---|
| `--ro-fundo` | noite-950 | pergaminho-100 | fundo da página |
| `--ro-superficie` | noite-900 | branco | barra lateral, cabeçalho |
| `--ro-cartao` / `--ro-cartao-base` | gradiente 850→900 / noite-850 | gradiente branco→150 / branco | painel, cartão |
| `--ro-superficie-sutil` | branco 3% | ouro 5% sobre branco | linha alternada, área de destaque calma |
| `--ro-campo` | noite-920 | branco | fundo de campo |
| `--ro-texto` · `-forte` · `-suave` | pergaminho-250 · 950 · noite-300 | noite-900 · 950 · noite-450 | texto |
| `--ro-borda` · `-suave` | ouro 55% · 28% | ouro-600 65% · 32% | divisória, contorno de cartão |
| `--ro-borda-campo` | ouro-650 | ouro-600 | contorno de controle (3:1) |
| `--ro-primaria` · `-forte` | ouro-500 · 400 | ouro-500 · 400 | **preenchimento** dourado (botão, disco) |
| `--ro-sobre-primaria` | ouro-950 | ouro-950 | texto sobre o dourado |
| `--ro-primaria-texto` | ouro-500 | **ouro-800** | **texto** dourado (link, rótulo, ícone) |
| `--ro-sucesso/perigo/aviso/info` + `-texto` + `-fundo` | 500/400 | 500/700 | situação |
| `--ro-foco` | ouro-400 | ouro-800 | anel de foco |
| `--ro-veu` | noite-990 70% | noite-990 55% | fundo de modal |
| `--ro-sombra-1…4` | preto 35–55% | noite 6–22% | elevação |

### 4.4 Contraste medido (WCAG 2.x, 25/10/2026)
Conferido também pelo teste `src/brand/__tests__/tokens.test.ts` — o build da suíte falha se um par cair abaixo do AA.

| Par | Escuro | Claro | Mínimo |
|---|---|---|---|
| texto / fundo | **15,97** | **15,73** | 4,5 |
| texto / cartão | 13,82 | 17,14 | 4,5 |
| texto suave / fundo | 7,05 | 4,92 | 4,5 |
| texto suave / cartão | 6,10 | 5,36 | 4,5 |
| ouro como texto / fundo | 7,78 | 5,65 | 4,5 |
| ouro como texto / cartão | 6,73 | 6,16 | 4,5 |
| tinta sobre botão dourado (950/500) | 7,53 | 7,53 | 4,5 |
| sucesso / cartão | 7,16 | 5,35 | 4,5 |
| perigo / cartão | 5,56 | 6,86 | 4,5 |
| aviso / cartão | 6,57 | 6,00 | 4,5 |
| info / cartão | 6,70 | 6,16 | 4,5 |
| borda de campo / campo | 3,93 | 3,88 | 3,0 |
| anel de foco / fundo | 10,10 | 5,65 | 3,0 |

**Três correções que este contrato fez** (medidas antes de corrigir): o `--gold` como texto no claro dava **2,40:1**
(reprova); o `--red` em texto miúdo sobre o cartão escuro dava **3,93:1** (reprova); a borda de campo
(`--line-soft`) dava **~1,6:1** (reprova WCAG 1.4.11). Os papéis `--ro-primaria-texto`, `--ro-perigo-texto` e
`--ro-borda-campo` resolvem; o `--gold` continua igual porque também é o **metal** da moeda desenhada.

### 4.5 Orçamento de ouro
Por dobra de tela: **1** preenchimento dourado (o botão primário **ou** o disco de destaque), números principais em
serifa, filetes de assinatura. Texto corrido nunca é dourado. Fundo dourado em área grande, nunca.

### 4.6 Cores que NÃO mudam com a marca
- `--cert-*`: o certificado é o mesmo documento do PDF, creme nos dois temas — valores idênticos aos de antes.
- `--coin-*`: metal da moeda desenhada (`CoinArt.tsx`) — valores idênticos aos de antes.

---

## 5. Tipografia

### 5.1 Famílias
| Papel | Família | Por quê (BENCHMARK §D3–D4) |
|---|---|---|
| **Exibição** — títulos, números de vitrine, sobretítulo da logo | **Newsreader** (variável, eixo óptico 6–72) | a logo é capitular romana de serifa triangular; o Playfair (didone) brigava com ela. Casas de leilão e casas da moeda usam serifa clássica no título (Sotheby's Mercury, Christie's Arizona Serif, Royal Mint Garamond); fintech de 2026 também (Robinhood Martina Plantijn, Carbon Plex Serif). O eixo óptico deixa o mesmo arquivo firme a 18 px e fino a 72 px |
| **Texto e dados** — interface, tabela, formulário | **Inter** (variável) | grotesca neutra de altura-x grande e algarismos tabulares: o padrão das plataformas de finanças medidas (Söhne/Stripe, Suisse/StockX, BTG Sans) numa fonte livre. O Source Sans 3 anterior é a fonte do Numista — genérica no setor |

Carregadas por `next/font` em `src/brand/fontes.ts` (servidas do próprio domínio, sem flash). As classes `.variable`
ficam no `<html>`. Máximo de **duas famílias**; itálico só da serifa, para ênfase de uma palavra.

### 5.2 Escala por papel (fluida: mínimo a 375 px → máximo a 1440 px)
| Token | Tamanho | Família / peso | Uso |
|---|---|---|---|
| `--ro-tipo-display-xl` | 40 → 72 px | Newsreader 500, −0,015em, 1,08 | título do herói da landing |
| `--ro-tipo-display` | 32 → 52 px | Newsreader 500 | abertura de seção, valor principal da faixa |
| `--ro-tipo-titulo-1` | 26 → 36 px | Newsreader 600 | `h1` de página da plataforma |
| `--ro-tipo-titulo-2` | 20 → 26 px | Newsreader 600 | `h2`, título de modal |
| `--ro-tipo-titulo-3` | 18 px | Newsreader 600 | `h3`, título de painel |
| `--ro-tipo-corpo-lg` | 17 px | Inter 400, 1,6 | parágrafo de abertura |
| `--ro-tipo-corpo` | 16 px | Inter 400, 1,55 | texto corrido |
| `--ro-tipo-corpo-sm` | 14 px | Inter 400/500 | tabela, interface densa |
| `--ro-tipo-legenda` | 13 px | Inter 500 | rótulo, nota, legenda |
| `--ro-tipo-sobretitulo` | 12 px | Inter 600, caixa-alta, +0,16em | sobretítulo — **a única caixa-alta** |

Classes prontas: `.ro-display-xl`, `.ro-display`, `.ro-titulo-1/2/3`, `.ro-corpo-lg`, `.ro-legenda`, `.ro-sobretitulo`,
`.ro-numero`, `.ro-valor`. Linha de texto ≤ 68 caracteres (`--ro-container-texto`). Números **sempre tabulares** (o
`body` já liga `tabular-nums`).

---

## 6. Grade, espaço, raio, sombra e camadas

- **Grade de 4 px**: `--ro-esp-1` 4 · 2 8 · 3 12 · 4 16 · 5 20 · 6 24 · 8 32 · 10 40 · 12 48 · 16 64 · 24 96.
- **Container** 1200 px (`.ro-container`), margem lateral fluida 16 → 40 px. Seção: 48 → 112 px de respiro
  (`.ro-secao`). Grade de cartões por `auto-fit` (`.ro-grade-auto`, mínimo 260 px).
- **Raio por elemento**: selo 4 · campo 8 · botão 10 · cartão/painel 14 · modal e faixa 20 · pílula 999. Casas de leilão
  usam 2–4 px (seco, institucional), fintech 8–16 (amigável); o Real Olímpico fica no meio — **firme, não infantil**.
- **Elevação** (4 níveis): 1 linha de tabela e cartão parado · 2 painel · 3 cartão em hover e faixa · 4 modal.
  Escuro usa preto translúcido; claro usa o próprio azul-noite translúcido (sombra cinza em fundo creme parece suja).
- **Camadas**: gaveta 40 · modal 50 · toast 60 · "pular para o conteúdo" 9999.
- **Toque**: todo alvo clicável ≥ **44 px** (`--ro-alvo-toque`).

---

## 7. Iconografia

Traço de **1,6–1,8 px**, cantos e terminais arredondados, grade de 24 px, `currentColor` — o mesmo desenho dos ícones
que já existem nos painéis (`.panel h3 svg`). Ícone estático em Server Component é **SVG inline** (sem biblioteca de
ícones de cliente: no lucide 1.x todo ícone hidrata — doc 35 do aprendizado_frontend). Ícone nunca é a única pista:
sempre acompanha texto ou `aria-label`. Metáforas da marca: cofre, lacre, recibo, lupa (perícia), balança (negociação),
caixa (envio). Proibido: foguete, gráfico subindo, cifrão voando, moedas empilhadas de cassino.

---

## 8. Fotografia, renders e ilustração de moeda

### 8.1 A moeda é a moeda real
Só as duas negociáveis — **Entrega da Bandeira Olímpica** (2012) e **Direitos Humanos** (1998) — e só como elas são:
bimetálica, núcleo prata, anel ouro, legenda e desenho fiéis às fotos de `public/moedas/`. Moeda inventada, moeda de
outro país ou "moeda genérica dourada" não entram.

**A moeda não se gera do zero — compõe-se** (regra de 25/10/2026, depois da rodada 2 da Frente 2): quando o gerador
desenha a moeda, ele inventa legenda, troca o desenho do núcleo e erra a grafia (medido: 6 de 14 ativos reprovados,
ver §13.4). Toda imagem em que a face da moeda aparece legível usa **os pixels da foto real** (`public/moedas/*.png`
recortada), posta na cena por perspectiva, luz e sombra; o gerador só faz o que está em volta (fundo, superfície, luz,
desfoque). Moeda gerada só é aceita fora de foco ou de perfil, onde nenhuma letra se lê.

### 8.2 Luz e cena (padrão "vitrine")
- **Luz**: chave quente rasante a 30–45° vinda de cima-esquerda (revela o relevo, como o TrueView da PCGS), contraluz
  fria fraca na borda, **sem** reflexo estourado no núcleo prata.
- **Fundo**: azul-noite `#081226`–`#10203f` liso ou ardósia escura; no claro, pergaminho `#f5f0e4`. Sem bokeh colorido.
- **Sombra de contato** suave embaixo: a moeda pousa, não flutua (CSS: `.ro-vitrine-luz`).
- **Ângulos**: frontal 0° (catálogo), ¾ a 35° (herói), perfil a 80° (serrilha), macro 1:1 do relevo.
- **Espaço negativo**: herói e OG com ≥ 45% de área livre para o título em HTML — **nenhum texto dentro da imagem**.

### 8.3 Anéis olímpicos
A moeda da Bandeira traz os anéis cunhados pelo Banco Central. **Decisão do Gabriel, 25/10/2026:** retratar a moeda real
com os anéis **é permitido** ("ignora esse problema do CLAUDE.md"). Continua valendo o bom senso de marca: os anéis
aparecem **só como parte da moeda retratada** — nunca soltos, como ornamento, ícone ou padrão da identidade do Real
Olímpico. (A regra antiga do CLAUDE.md fica para o orquestrador atualizar — `PROPOSTAS_BACKEND.md`.)

### 8.4 Ilustração (estados vazios, tutorial, admin)
Linha única de 2–2,5 px, `#c9a24b` sobre noite ou `#0d1b35` sobre pergaminho, preenchimentos chapados de no máximo 2 tons
da paleta, sem gradiente, sem personagem com rosto. Série de referência: `public/visuais/onboarding/*.svg` (Frente 2).

---

## 9. Componentes base e estados

Nível na taxonomia do aprendizado_frontend: **componente** (com estilo, sobre HTML nativo). Onde o elemento HTML importa,
é classe CSS; onde há comportamento, é componente React em `src/components/ui/`.

### 9.1 Botão — `.btn` + variante
| Variante | Classe | Uso | Regra |
|---|---|---|---|
| Primário | `.btn.btn-gold` | **a** ação da tela | metal: luz em cima, sombra embaixo; uma por tela |
| Secundário | `.btn.btn-outline` | alternativa | texto em `--ro-primaria-texto` (AA no claro) |
| Neutro | `.btn.btn-ghost` | cancelar, voltar | sem cor |
| Destrutivo | `.btn.btn-danger` | recusar saque, cancelar oferta | sempre com confirmação |
| Tamanhos | `.btn-sm` (36 px, só desktop denso) · padrão 44 px · `.btn-lg` 52 px | | |

Estados: repouso → hover (sobe 1 px, brilho) → ativo (afunda 1,5%) → foco (anel 2 px `--ro-foco`, afastado 3 px) →
desabilitado (45%, sem sombra) → ocupado (`aria-busy="true"`, cursor de progresso).

### 9.2 Campo — `.field input`, `.tinput`, `textarea.obs`
44 px de altura mínima; borda `--ro-borda-campo` (3:1); hover dourado; foco com borda `--ro-foco` + halo de 3 px; erro
por `aria-invalid="true"` (borda `--ro-perigo-texto`) **mais** mensagem em texto ligada por `aria-describedby`.

### 9.3 Painel e cartão — `.panel`, `.ro-cartao`, `.ro-cartao-interativo`, `.ro-cartao-moeda`
Painel: borda suave + **filete de luz no topo** (o aro da moeda) + sombra 2. Cartão interativo sobe 2 px e ganha
sombra 3. Cartão de moeda: `.ro-vitrine-luz` (spot + sombra de contato) + nome em serifa + meta (tipo, ano, valor
estimado).

### 9.4 Selo de situação — `<Selo tom>` / `.ro-selo--{sucesso|perigo|aviso|info|ouro}`
Texto + ponto + fundo suave. Mapa: **No cofre / Paga / Concluída** → sucesso · **Em aberto / Aguardando** → aviso ·
**Travada / Recusada / Vencida** → perigo · **Em trânsito / Em análise** → info · **Negociável / Destaque** → ouro.

### 9.5 Aviso em bloco — `<Aviso tom titulo>`
Ícone de traço + título + texto, faixa lateral de 3 px. `role="alert"` só no perigo. Fica na tela (o toast some).

### 9.6 Tabela — `.ro-tabela` (dentro de `.table-scroll`)
Cabeçalho 12 px em `--ro-texto-suave`, linhas de 12 px de respiro, hover sutil, número à direita com `.num`.

### 9.7 Abas e chips — `.ro-abas`, `.ro-chip`
Estado pelo atributo (`aria-current="page"`, `aria-selected`, `aria-pressed`), nunca só pela classe.

### 9.8 Estado vazio — `<EstadoVazio titulo arte acao>`
Diz o que falta e oferece o próximo passo; arte da série de onboarding.

### 9.9 Carregamento — `<Esqueleto>` / `.ro-esqueleto`
Brilho que corre como luz sobre metal; parado com movimento reduzido.

### 9.10 Toast e modal
Toast: um só, com o ponto dourado de "selo", 3,6 s (regra do monolito mantida). Modal: topo com filete dourado de 2 px,
raio 20, véu com desfoque de 4 px, entrada "assenta" (8 px + 2%), fecha só por botão (decisão do monolito mantida).

### 9.10.1 Componentes que usam os ativos da Frente 2
Os caminhos de imagem vivem num lugar só, o catálogo `src/brand/ativos.ts` (`ATIVOS`, `ILUSTRACOES`, `FOTO_REAL`), com a
situação de cada ativo (aprovado/pendente e o motivo). Ativo pendente **nunca** aparece: o componente cai para a foto
real.
- `<ImagemDaMarca id sizes prioridade>` — `<picture>` com AVIF e WebP nas larguras entregues; reserva o espaço pela
  proporção.
- `<CartaoMoeda moeda nome selo href>` — cartão de vitrine (`.ro-cartao-moeda`): render em ¾ quando aprovado, senão a foto
  real com a inclinação do `<MoedaRealista>`; dados (ano, valor estimado) por `children`, fora da imagem.
- `<FaixaAbertura sobretitulo titulo acao arte fundo>` — faixa escura nos dois temas, fundo guilhoché (CSS) ou veludo
  (textura da Frente 2); arte desce para baixo do texto no celular por `flex-wrap`.
- `<EstadoVazio ilustracao>` — ilustração pelo nome do catálogo; quando há versão `-escuro`, o tema escolhe.

### 9.11 Assinatura visual
- **Filete** (`.ro-filete`): duas linhas douradas finas = o aro em relevo da moeda; separa abertura de conteúdo.
- **Serrilha** (`.ro-serrilha`): o bordo serrilhado, no topo de faixas e no rodapé — nunca no meio do texto.
- **Guilhoché** (`.ro-guilloche`): círculos concêntricos finos, fundo de segurança de cédula, só em superfície escura e
  grande (faixa de abertura, herói). Versão em imagem: `public/visuais/fundos/fundos-textura-escura-guilloche.svg`.
- **Faixa de abertura** (`.ro-faixa`): bloco escuro nos dois temas — saudação, número principal, a moeda.
- **Passos** (`.ro-passos`): número em disco dourado, o desenho de uma moeda.

---

## 10. Movimento

| Token | Valor | Uso |
|---|---|---|
| `--ro-dur-instante` | 90 ms | troca de cor de ícone |
| `--ro-dur-rapida` | 150 ms | hover, foco, cor |
| `--ro-dur-base` | 220 ms | entrada de componente, toast |
| `--ro-dur-lenta` | 400 ms | modal, tema, inclinação da moeda |
| `--ro-curva-saida` | `cubic-bezier(.16,1,.3,1)` | tudo que **chega**: começa rápido e assenta como metal pousando |
| `--ro-curva-padrao` | `cubic-bezier(.2,.8,.2,1)` | o resto |

Com `prefers-reduced-motion: reduce`, as quatro durações valem **0** (no próprio token) e as animações contínuas
(pulso do recibo, sincronia, esqueleto, giro) param. Permitido: estado, entrada de modal, inclinação da moeda seguindo o
mouse, giro de 24 quadros no herói (só sem movimento reduzido), revelação ao rolar por `animation-timeline` (sem JS).
Proibido: moeda girando sozinha em lista, número "contando" até o valor, parallax em texto, confete.

---

## 11. Voz e vocabulário (piso jurídico)

| Proibido para descrever a plataforma | Use |
|---|---|
| token, NFT, cripto, criptoativo, ativo digital | **recibo**, comprovante de custódia |
| ativo, investimento, investidor | **moeda**, **item**, **peça**, colecionador |
| corretora, corretagem, assessor | **marketplace**, **comissão de negociação** |
| rentabilidade, retorno, lucro garantido | **potencial de valorização**, **valor estimado**, **valor aproximado** |

Sempre: "o Real Olímpico" (masculino) · "AUREA CUSTODIA LTDA" onde há CNPJ · "código simulado" no QR do recibo (fica).
Nunca: blockchain, on-chain, tokenização, DApp. O recibo é **comprovante de custódia**, de propósito fora do
enquadramento de ativo virtual (Res. BCB 519–521/2026).

---

## 12. Direção por superfície

Resumo — o detalhe acionável por frente está em `docs/polimento/brandbook/RECOMENDACOES_AS_FRENTES.md`.

| Superfície | Registro | Estrutura proposta |
|---|---|---|
| **Landing** (`/`) | vitrine | herói escuro com guilhoché, título `display-xl` com uma palavra em itálico dourado, par de moedas em ¾ à direita, **um** botão dourado; faixa de confiança (cofre real, recibo, taxas abertas) em 3 cartões; "Como funciona" em `.ro-passos`; as duas moedas em `.ro-cartao-moeda`; taxas em `.ro-tabela` com os números do servidor; perguntas em `<details>`; rodapé com serrilha e assinatura institucional |
| **Plataforma** (área logada) | cofre | faixa de abertura no `/inicio` (saudação, saldo em `.ro-valor`, moedas no cofre); mercado com abas por tipo de moeda (`.ro-abas`), livro em `.ro-tabela`, selos de situação; recibos como galeria de `.ro-cartao-moeda`; avisos de custódia em `<Aviso>` ao lado da ação |
| **Admin** (`/admin`) | cofre, denso | mesma paleta, raio menor, `.btn-sm` liberado no desktop, tabelas `.ro-tabela` com 1.ª coluna fixa, selos para toda situação, nada de vitrine |
| **Certificado / PDF** | documento | creme, tintas `--cert-*` intactas, serifa nos títulos |
| **E-mail** | institucional | fundo branco, cabeçalho noite com `LogoMarca` 160 px, botão dourado único, assinatura institucional no rodapé |

---

## 13. Pedidos para a Frente 2 (ativos)

> Lido direto desta pasta pelo agente do Antigravity. Prompts completos, prontos para colar:
> **`docs/marca/PEDIDOS_ANTIGRAVITY.md`**.

### 13.1 Paleta para geração (hex)
Noite `#081226` `#0d1b35` `#10203f` · Ouro `#7a5d1c` `#a07c2c` `#c9a24b` `#e3b95c` `#f2dc95` · Pergaminho `#f5f0e4`
`#fdf9ef` · Prata da moeda `#cfd4dc` `#eef1f5` `#7d8694`. Nada de roxo, verde-neon, azul-elétrico.

### 13.2 Materiais e luz
Metal bimetálico real (núcleo cuproníquel prateado, anel bronze-alumínio dourado), acabamento de circulação com micro
riscos naturais; ardósia escura, veludo azul-noite, papel de algodão creme, aço escovado de cofre. Luz conforme §8.2.

### 13.3 Referências obrigatórias
`public/moedas/moeda-entrega-da-bandeira-2012.png`, `public/moedas/moeda-direitos-humanos-1998.png`,
`public/moedas/moeda-real-anverso.png` (anverso comum) e a prancha `public/brand/logo-real-olimpico.webp` (só como
referência de paleta — **nunca** reproduzir a logo).

### 13.4 Inventário — o que a Frente 2 já entregou (25/10/2026, worktree `AureaCustodiaMVP-assets`)
| Grupo | Ativos | Situação |
|---|---|---|
| moedas | Bandeira anverso/reverso, Direitos Humanos anverso/reverso, par do herói (16:9) | ✅ aprovados (anéis liberados, §8.3) |
| macros | relevo Bandeira, relevo Direitos Humanos, serrilha | ✅ |
| cenários | cofre (herói 16:9, metade livre), gaveteiro (4:3) | ✅ |
| fundos | guilhoché escuro, algodão claro (SVG) | ✅ — coincidem com `.ro-guilloche` |
| animações | giro 24 quadros a 24 fps; brilho no relevo 16 quadros | ✅ |
| OG | padrão e marketplace (1200×630) | ✅ |
| onboarding / admin | 6 spots + 2 estados vazios; 2 spots de admin | ✅ base da série §8.4 |

### 13.4.1 Rodada 2 (pedidos de `PEDIDOS_ANTIGRAVITY.md` §2) — conferida pela Frente 1 em 25/10/2026
| Ativo | Situação | Motivo |
|---|---|---|
| `moedas-bandeira-tres-quartos-transparente` | ❌ reprovado | sem "BRASIL" e sem o logo Rio 2016 no núcleo; "1 REAL 2012" inventado sob a bandeira |
| `moedas-direitos-humanos-tres-quartos-transparente` | ❌ reprovado | mapa quadriculado virou globo genérico, figura dourada virou boneco prateado, "★ 1998 ★" inventado, legenda "DEECLARAÇÃO" |
| `macros-perfil-serrilha-duas-moedas` | ✅ com ressalva | uma moeda só (pedido falava em duas); serrilha e luz corretas, nenhuma letra legível |
| `cenarios-lacre-de-custodia` | ❌ reprovado | código de barras e texto legível no lacre ("LACRAÇÃO", número de série), moeda comum de 1 real em vez das negociáveis, faixa azul chapada colada no topo |
| `fundos-veludo-noite` | ✅ com ressalva | manchas escuras visíveis no centro; serve sob `.ro-vitrine-luz` |
| `cenarios-faixa-abertura-painel` | ❌ reprovado | moeda inventada (mão segurando a bandeira, "BRASIL" duas vezes no anel) e **nítida** — o pedido era fora de foco |
| `onboarding-spot-*` (5) | ✅ | mesma linguagem da série; prontos para `<EstadoVazio>` |
| `og-moeda-bandeira` | ❌ reprovado | moeda monometálica inventada, anéis duas vezes, legenda "ENTTTREGA" |
| `og-moeda-direitos-humanos` | ❌ reprovado | moeda inventada (mapa-múndi, "1 REAL 1998", "BRASIL" no anel) |
| `og-recibo-de-custodia` | ✅ | papel e ardósia corretos; a moeda é pequena e sem leitura |
| ícones do emblema (`marca/icon-180/192/512`, `favicon-16/32`) | ✅ | emblema oficial redimensionado, sem redesenho |
| Observações gerais | ⚠️ | os 3 OGs novos não têm a versão `-1200` (a rodada 1 tem); os PNG-mestre saíram em 1024 px, não 4K, e estão em `public/` em vez do Drive |

Refação pela regra do §8.1 (composição sobre a foto real): `PEDIDOS_ANTIGRAVITY.md` §3.

### 13.4.2 Rodada 3 — conferida em 25/10/2026
O método de composição funcionou: legendas, "BRASIL", logo Rio 2016, mapa e figura saíram **letra por letra iguais** à
foto real. Mas o `pipeline_composicao.py` lê a moeda com `cv2.imread` (ordem **BGR**) e a trata como RGB: o anel dourado
saiu **azul-ciano** e os anéis olímpicos trocaram de cor nos 6 ativos compostos. Confirmado invertendo os canais de
volta (o ouro reaparece certo).

| Ativo | Situação |
|---|---|
| `moedas-*-tres-quartos-transparente` (2) | ⏳ pendente — desenho fiel, canais trocados |
| `og-moeda-bandeira`, `og-moeda-direitos-humanos` | ⏳ pendente — canais trocados (agora com `-1200`) |
| `cenarios-faixa-abertura-painel` | ⏳ pendente — canais trocados; desfoque correto |
| `cenarios-lacre-de-custodia` | ❌ reprovado de novo — virou cartão branco com faixa dourada, sem bandeja nem envelope |
| Extras desta rodada: 4 cenas da jornada, cofre em retrato, OG da landing, vídeo do cofre, moldura e selo, spots `-escuro`, spots "Proteja/Valorize/Ganhe" | ✅ — ressalva de vocabulário: "Ganhe" e a seta subindo encostam em "retorno" (§11); o texto é da Frente 3 |
| Spots "neutros" (`onboarding-vazio-*`, os 5 da rodada 2) | ⚠️ desenhados para fundo claro; no cartão escuro ficam apagados — falta versão `-escuro` |

O catálogo `src/brand/ativos.ts` marca os pendentes; os componentes caem para a foto real até a correção
(`PEDIDOS_ANTIGRAVITY.md` §4).

### 13.4.3 Rodada 3b — conferida em 25/10/2026
| Ativo | Situação | Como foi conferido |
|---|---|---|
| `moedas-*-tres-quartos-transparente` (2) | ✅ liberado no catálogo | medição de cor (pixels dourados ≫ ciano: 168.691 × 1.023 e 174.167 × 0) + olhar: legenda e desenho iguais à foto real; visto dentro do `<CartaoMoeda>` |
| `og-moeda-bandeira`, `og-moeda-direitos-humanos` (com `-1200`) | ✅ liberado | idem (42.539 × 233 e 43.690 × 0) |
| `cenarios-faixa-abertura-painel` | ✅ liberado | idem (33.337 × 0); desfoque correto |
| 7 spots neutros em versão `-escuro` (+ os 4 que já existiam) | ✅ liberados | prancha sobre `#10203f`: traço claro legível |
| `cenarios-lacre-de-custodia` | ❌ **3.ª reprovação** | continua esquema chapado (retângulo escuro com faixa dourada e cartão creme), não foto de bandeja com envelope |

**Proposta para o lacre** (em vez de uma 4.ª rodada): a faixa de confiança da landing e o "envio recebido" usam a cena
aprovada `jornada-cena-03-cofre` (gaveta do cofre com forro de veludo). O ativo `lacre` fica pendente no catálogo, com
esse motivo, e não aparece em tela nenhuma.

### 13.5 O que ainda falta (pedido em `PEDIDOS_ANTIGRAVITY.md`)
1. Moedas em **¾ isoladas** (fundo transparente) para `.ro-cartao-moeda` — 4K, 1:1, as duas.
2. **Perfil 80°** da serrilha das duas moedas (cartão de detalhe do recibo).
3. **Lacre/selo de custódia** fotográfico (envelope de segurança com a moeda dentro) — prova visual da guarda.
4. **Textura de veludo azul-noite** 4K, sem costura (fundo do cartão de moeda no escuro).
5. **Faixa de abertura** 21:9 escura com uma moeda fora de foco à direita (painel do cliente).
6. **Spots novos** da série: recibo emitido, saque solicitado, frete pago/etiqueta, custódia a pagar, envio em análise.
7. **OG por tipo de moeda** (2) e **OG do recibo** (1), com área livre para o título.
8. **Favicon/ícone de app**: não é geração — sai do `logo-real-olimpico-emblema.png` existente (só redimensionar).

---

## 14. O package (`src/brand/`)
Organizado para virar `@real-olimpico/marca` no fim do polimento — ver `src/brand/README.md`: tokens CSS e TS, fontes,
logo, componentes da marca, teste de contrato. Regras: não importa nada de `@/domain` nem `@/server`; tudo o que é
número de negócio fica fora dele.

---

## 15. Registro de mudanças
| Data | Mudança | Motivo |
|---|---|---|
| 25/10/2026 | v1.0 criada: paleta amostrada da logo, papéis com AA medido, Newsreader + Inter, escala fluida, componentes `.ro-*`, assinatura (aro, serrilha, guilhoché) | Frente 1 do polimento; benchmark de 25 referências |
| 25/10/2026 | anéis olímpicos liberados quando parte da moeda real retratada | decisão do Gabriel |
| 25/10/2026 | moeda legível nunca é gerada do zero: composição sobre a foto real (§8.1); rodada 2 conferida (§13.4.1) | 6 de 14 ativos da rodada 2 com moeda inventada |
| 25/10/2026 | rodadas 3 e 3b conferidas (§13.4.2–13.4.3): 5 renders compostos e 11 spots escuros liberados; lacre segue reprovado, com troca proposta | conferência da Frente 1 |
