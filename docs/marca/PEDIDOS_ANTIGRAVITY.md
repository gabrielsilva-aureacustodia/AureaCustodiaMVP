# Pedidos ao Antigravity — ativos 4K dos componentes novos da marca

```
Origem:   Frente 1 (Brandbook), 25/10/2026 — Brandbook §13.5
Para:     o agente do Antigravity na worktree C:\dev\AureaCustodiaMVP-assets (Frente 2), com o kit .agents/ já instalado
Formato:  o mesmo dos pedidos da Frente 2 (docs/polimento/assets/pedidos/<grupo>-<nome>.json) e o workflow /gerar-asset
```

## Como usar
O Gabriel cola o **prompt-mestre** abaixo no Antigravity. O agente cria cada JSON da §2 em
`docs/polimento/assets/pedidos/`, gera pelo `/gerar-asset`, revisa nos 4 portões e entrega em `public/visuais/<grupo>/`
(PNG mestre no Drive, AVIF/WebP 640/960/1440/1920 no repositório, `.json` de registro, linha nova no
`public/visuais/README.md`).

---

## 1. Prompt-mestre (colar no Antigravity)

```text
Você é o agente da Frente 2 — Ativos do Real Olímpico, de volta para uma segunda rodada. Trabalhe SOMENTE em
C:\dev\AureaCustodiaMVP-assets (Touch: .agents/**, public/visuais/**, docs/polimento/assets/**). Não commite.

ANTES DE GERAR, leia nesta ordem:
1. C:\dev\AureaCustodiaMVP-brandbook\docs\marca\BRANDBOOK_REAL_OLIMPICO.md — §1 (cofre e vitrine), §4.1–4.2 (paleta),
   §8 (fotografia de moeda: luz, cena, ângulos, anéis), §13 (pedidos e inventário).
2. C:\dev\AureaCustodiaMVP-brandbook\docs\marca\PEDIDOS_ANTIGRAVITY.md §2 — os 9 pedidos desta rodada, já em JSON.
3. Seus próprios .agents/rules/assets-web.md e o workflow /gerar-asset.

O QUE MUDOU DESDE A SUA PRIMEIRA RODADA
- Decisão do Gabriel (25/10/2026): os anéis olímpicos PODEM aparecer quando fazem parte da moeda real retratada
  (a moeda da Bandeira tem os anéis cunhados). Continua proibido usá-los soltos, como ornamento ou padrão. Tire
  "olympic rings" do bloco `evitar` dos pedidos de moeda e troque por "olympic rings outside the coin".
- A paleta da marca agora é contrato (src/brand/tokens.css). Use os hex da §13.1 do Brandbook; troque qualquer
  [PALETA] que tenha sobrado pelos valores de lá.

PARA CADA PEDIDO DA §2:
- copie o JSON para docs/polimento/assets/pedidos/<nome>.json (pode refinar o prompt, nunca a proporção, o tamanho
  4K, as referências nem o bloco evitar);
- gere 4K no modelo de maior controle de relevo; para frames, trave câmera, lente, luz e fundo;
- Portão 3: a moeda tem de bater com a foto de referência (legenda, desenho, serrilha, proporção núcleo/anel);
  sem plástico, sem reflexo impossível, sem texto inventado;
- Portão 4: área livre para HTML onde o pedido manda; nenhum número, preço, taxa ou palavra legível fora da moeda;
- pós-processo: recorte de fundo quando o pedido diz "transparente", AVIF/WebP 640/960/1440/1920, .json de registro
  (modelo, data, proporção, prompt, referências, "contém SynthID");
- acrescente cada ativo ao public/visuais/README.md com a frente que usa (3 landing, 4 plataforma, 5 admin), o
  componente do Brandbook onde entra (ex.: .ro-cartao-moeda, .ro-faixa, <EstadoVazio>) e o alt sugerido.

NUNCA: gerar, redesenhar ou "melhorar" a logo (arquivos de public/brand/ são só referência de paleta); pessoa, rosto ou
mão; marca de terceiro; as palavras token, NFT, cripto, ativo digital, investimento em nome de arquivo ou JSON;
arquivo > 5 MB no repositório.

FECHAMENTO: varredura de segredo, nenhum arquivo > 5 MB, seção "Sessões" do seu MD_EXECUCAO com Feito / Não feito
(motivo) / Próximo, e diga ao Gabriel que a segunda rodada está pronta para o merge.
```

---

## 2. Os pedidos

Paleta comum: noite `#081226` `#0d1b35` `#10203f` · ouro `#7a5d1c` `#a07c2c` `#c9a24b` `#e3b95c` `#f2dc95` ·
pergaminho `#f5f0e4` `#fdf9ef` · prata da moeda `#cfd4dc` `#eef1f5` `#7d8694`.

Núcleo `evitar` (todos): `"logos"`, `"watermarks"`, `"text outside the coin"`, `"numbers, prices"`, `"hands"`,
`"persons"`, `"plastic shiny look"`, `"CGI flare"`, `"bokeh in saturated colors"`, `"invented coin design"`.

### 2.1 `moedas-bandeira-tres-quartos-transparente`
```json
{
  "nome": "moedas-bandeira-tres-quartos-transparente",
  "grupo": "moedas",
  "uso": "Frente 3 e 4 — .ro-cartao-moeda (vitrine e galeria de recibos); fundo transparente para a luz de .ro-vitrine-luz",
  "aspect_ratio": "1:1",
  "image_size": "4K",
  "prompt": "Fotografia de produto numismático de uma única moeda comemorativa brasileira de 1 Real 'Entrega da Bandeira Olímpica 2012', reverso voltado para a câmera, inclinada em três quartos (35 graus de rotação no eixo vertical, 10 graus no horizontal), ocupando 78% da largura do quadro e centralizada. Bimetálica real: anel externo de bronze-alumínio dourado #c9a24b com legenda 'ENTREGA DA BANDEIRA OLÍMPICA' e 'LONDRES 2012 - RIO 2016' em relevo fiel à referência; núcleo de cuproníquel prateado #cfd4dc com a bandeira tremulando e os anéis cunhados exatamente como na moeda real. Bordo serrilhado visível na lateral com micro brilho. Luz-chave quente rasante a 40 graus vinda de cima à esquerda revelando o relevo; contraluz fria fraca contornando o bordo à direita; sem reflexo estourado no núcleo. Fundo totalmente transparente (canal alfa), sem sombra projetada. Acabamento de circulação com micro riscos naturais.",
  "referencias": ["public/moedas/moeda-entrega-da-bandeira-2012.png"],
  "evitar": ["olympic rings outside the coin", "background", "drop shadow", "<núcleo>"]
}
```

### 2.2 `moedas-direitos-humanos-tres-quartos-transparente`
Igual ao 2.1, trocando a moeda: "'Declaração Universal dos Direitos Humanos — Cinquentenário 1998', reverso com o globo
quadriculado e a figura humana dourada saindo do núcleo, legenda 'DECLARAÇÃO UNIVERSAL DOS DIREITOS HUMANOS' e
'CINQÜENTENÁRIO' no anel". Referência: `public/moedas/moeda-direitos-humanos-1998.png`.

### 2.3 `macros-perfil-serrilha-duas-moedas`
```json
{
  "nome": "macros-perfil-serrilha-duas-moedas",
  "grupo": "macros",
  "uso": "Frente 4 — detalhe do recibo (/recibos/[coinId]), faixa lateral da ficha da moeda",
  "aspect_ratio": "21:9",
  "image_size": "4K",
  "prompt": "Macro de perfil (câmera a 80 graus, quase rasante) do bordo serrilhado de uma moeda bimetálica brasileira de 1 Real, pousada em ardósia escura #10203f. A serrilha ocupa a faixa central horizontal do quadro; profundidade de campo curta, foco no terço esquerdo, desfoque suave para a direita. Luz quente rasante da esquerda que acende cada dente da serrilha em ouro #e3b95c, sombra entre os dentes #5d4718. Os 40% da direita escurecem em gradiente até #081226 para título em HTML.",
  "referencias": ["public/moedas/moeda-entrega-da-bandeira-2012.png", "public/visuais/macros/macros-serrilha-bordo.png"],
  "evitar": ["<núcleo>"]
}
```

### 2.4 `cenarios-lacre-de-custodia`
```json
{
  "nome": "cenarios-lacre-de-custodia",
  "grupo": "cenarios",
  "uso": "Frente 3 — faixa de confiança da landing ('a moeda fica lacrada no cofre'); Frente 4 — envio recebido",
  "aspect_ratio": "4:3",
  "image_size": "4K",
  "prompt": "Natureza-morta documental: uma moeda bimetálica brasileira de 1 Real dentro de um envelope plástico de segurança transparente com fita de lacre numerada sem texto legível, pousado sobre bandeja de aço escovado de cofre. Ao lado, uma etiqueta de papel algodão creme #f5f0e4 em branco (sem escrita). Luz fria de teto de cofre misturada a uma luz-chave quente rasante sobre a moeda, que é o ponto mais claro da cena. Paleta dominante azul-noite #0d1b35 e aço, com o ouro da moeda como único acento quente. Terço superior escuro e limpo para título em HTML.",
  "referencias": ["public/moedas/moeda-direitos-humanos-1998.png", "public/visuais/cenarios/cenarios-gavetas-seguranca-card.png"],
  "evitar": ["readable text", "barcodes", "brand names on the bag", "<núcleo>"]
}
```

### 2.5 `fundos-veludo-noite`
```json
{
  "nome": "fundos-veludo-noite",
  "grupo": "fundos",
  "uso": "Frente 4 — fundo do cartão de moeda e da faixa de abertura no tema escuro (sob .ro-vitrine-luz)",
  "aspect_ratio": "1:1",
  "image_size": "4K",
  "prompt": "Textura plana, vista de cima, de veludo de algodão azul-noite #0d1b35 com variação mínima de pelo e luz difusa uniforme, levemente mais clara no centro (#10203f) e mais escura nas bordas (#081226). Repetível sem costura nas quatro bordas. Sem dobras, sem objetos, sem fiapos visíveis.",
  "referencias": [],
  "evitar": ["seams", "folds", "objects", "patterns", "<núcleo>"]
}
```

### 2.6 `cenarios-faixa-abertura-painel`
```json
{
  "nome": "cenarios-faixa-abertura-painel",
  "grupo": "cenarios",
  "uso": "Frente 4 — .ro-faixa do /inicio (saudação e saldo à esquerda em HTML)",
  "aspect_ratio": "21:9",
  "image_size": "4K",
  "prompt": "Fundo panorâmico escuro para faixa de abertura: à direita, a moeda 'Entrega da Bandeira Olímpica' em três quartos, grande e fora de foco (desfoque óptico de lente 85 mm f/1.4), com o anel dourado #c9a24b capturando um brilho quente; o restante do quadro é veludo azul-noite #0d1b35 em gradiente até #081226 à esquerda, com finíssimas linhas concêntricas de guilhoché em ouro a 6% de opacidade. Os 60% da esquerda totalmente limpos para texto em HTML.",
  "referencias": ["public/moedas/moeda-entrega-da-bandeira-2012.png", "public/visuais/fundos/fundos-textura-escura-guilloche.svg"],
  "evitar": ["olympic rings outside the coin", "sharp coin", "<núcleo>"]
}
```

### 2.7 `onboarding-spots-rodada-2` (série vetorial, 5 peças)
Mesma linguagem de `public/visuais/onboarding/*.svg` (traço 2,5 px `#c9a24b` sobre fundo transparente, preenchimentos
chapados `#0d1b35`/`#8fa0bd`, sem gradiente, sem rosto), 4:3, entregues em SVG otimizado:
1. `onboarding-spot-recibo-emitido` — recibo com selo de lacre e um check;
2. `onboarding-spot-saque-solicitado` — envelope com ampulheta;
3. `onboarding-spot-etiqueta-frete` — caixa com etiqueta em branco e um carimbo de postagem sem texto;
4. `onboarding-spot-custodia-a-pagar` — moeda com cadeado aberto e um calendário;
5. `onboarding-spot-envio-em-analise` — lupa sobre uma moeda numa bandeja.

Uso: `<EstadoVazio arte>` e os avisos da plataforma (Frente 4).

### 2.8 `og-por-tipo-e-recibo` (3 peças)
1200×630 seguro para corte, metade esquerda livre para título em HTML (gerado por `next/og`):
1. `og-moeda-bandeira` — a moeda da Bandeira em ¾ à direita, fundo noite com guilhoché;
2. `og-moeda-direitos-humanos` — idem com a moeda dos Direitos Humanos;
3. `og-recibo-de-custodia` — recibo de papel algodão creme `#f5f0e4` em branco, levemente inclinado, com a moeda
   pousada em cima, sobre ardósia.

### 2.9 `icone-app-a-partir-do-emblema` (NÃO é geração)
Redimensionar `public/brand/logo-real-olimpico-emblema.png` existente para 180, 192, 512 px e 32/16 px (favicon), sobre
fundo `#081226` com área de proteção de 12%. Sem redesenhar, recolorir ou simplificar o emblema.

---

## 3. Rodada 3 — refazer 6 ativos por COMPOSIÇÃO sobre a foto real (25/10/2026)

Conferência da rodada 2 no Brandbook §13.4.1: 6 ativos reprovados porque o gerador **inventou a moeda** (legenda
trocada, núcleo redesenhado, "1 REAL" acrescentado, "DEECLARAÇÃO", "ENTTTREGA"). Regra nova (Brandbook §8.1): **a face
legível da moeda vem sempre dos pixels da foto real**; o modelo de imagem só gera o entorno.

### 3.1 Prompt-mestre da rodada 3 (colar no Antigravity)

```text
Você é o agente da Frente 2 — Ativos do Real Olímpico, rodada 3. Trabalhe SOMENTE em C:\dev\AureaCustodiaMVP-assets
(Touch: .agents/**, public/visuais/**, docs/polimento/assets/**). Não commite.

LEIA ANTES: C:\dev\AureaCustodiaMVP-brandbook\docs\marca\BRANDBOOK_REAL_OLIMPICO.md §8.1 (regra nova: a moeda não se gera,
compõe-se) e §13.4.1 (por que cada ativo foi reprovado); e este arquivo, §3.2 e §3.3.

O PROBLEMA: na rodada 2, toda imagem em que o modelo desenhou a moeda saiu com a moeda errada. Não tente de novo
"melhorando o prompt". Mude o método: a moeda entra por COMPOSIÇÃO, com os pixels de
public/moedas/moeda-entrega-da-bandeira-2012.png e public/moedas/moeda-direitos-humanos-1998.png.

PIPELINE (Python com Pillow + OpenCV, rodando na sua sandbox ou localmente; scripts em docs/polimento/assets/composicao/):
1. RECORTE: a foto real tem fundo preto. Gere a máscara do disco (círculo ajustado por HoughCircles ou pelo limiar
   do fundo), aplique alfa com borda suavizada de 1–2 px. Resultado: moeda-<nome>-recorte.png, 1024×1024, RGBA.
2. PERSPECTIVA (para ¾): transforme o disco em elipse com cv2.getPerspectiveTransform — rotação de 35° no eixo
   vertical (largura × cos 35° ≈ 0,82) e 10° no horizontal. Nunca redimensione só um eixo: use os 4 cantos.
3. ESPESSURA DO BORDO: empilhe 10–14 cópias da elipse deslocadas 1 px para a direita/baixo, escurecidas de 15% a 45%
   em gradiente, por baixo da face — vira a lateral da moeda. Para a serrilha, sobreponha à lateral um padrão de
   listras verticais finas (2 px claro / 3 px escuro) em multiply a 35%.
4. LUZ: sobre a face, uma camada "soft light" com gradiente radial quente (#f2dc95 a 18%) vindo de cima-esquerda e
   um escurecimento linear (preto a 12%) para baixo-direita. Não pinte por cima das letras: só luz e sombra.
5. CENA: gere com o modelo de imagem SÓ o fundo (veludo, ardósia, cofre, papel), já com a luz e a sombra de contato
   onde a moeda vai pousar — e SEM moeda nenhuma no quadro (diga "empty surface, no coin, no object" e ponha
   "coin" no bloco evitar). Em 4K.
6. ENCAIXE: cole a moeda composta na posição combinada, acrescente a sombra de contato (elipse preta desfocada a 35%,
   deslocada 2% para baixo) e, se o pedido pede desfoque, aplique o desfoque NA COMPOSIÇÃO FINAL (gaussiano + bokeh),
   não na moeda isolada.
7. PORTÃO 3 OBRIGATÓRIO: ponha lado a lado o recorte da moeda no ativo final e a foto de referência; a legenda tem de
   ser letra por letra a mesma. Anexe esse lado a lado no .json de registro (campo "conferencia_fidelidade").

SAÍDA: mesmos nomes e caminhos da rodada 2 (sobrescreva os reprovados), PNG-mestre 4K no Drive (fora do Git),
AVIF/WebP 640/960/1440/1920 e, nos OG, também -1200. .json de registro com "metodo": "composicao-foto-real".

NUNCA: desenhar ou "repintar" a face da moeda; texto, código de barras ou número de série legível em qualquer objeto
da cena; a logo; pessoa ou mão; arquivo > 5 MB no repositório; as palavras token, NFT, cripto, ativo digital,
investimento em nome de arquivo ou JSON.

FECHAMENTO: varredura de segredo, nenhum arquivo > 5 MB, seção "Sessões" do seu MD_EXECUCAO com Feito / Não feito
(motivo) / Próximo, e avise o Gabriel que a rodada 3 está pronta para conferência.
```

### 3.2 Os 6 ativos a refazer

| Ativo | Moeda (foto real) | Cena gerada (sem moeda) | Posição e tratamento |
|---|---|---|---|
| `moedas-bandeira-tres-quartos-transparente` | Bandeira | nenhuma — fundo transparente | ¾ (35°/10°), 78% da largura, centralizada; sem sombra projetada |
| `moedas-direitos-humanos-tres-quartos-transparente` | Direitos Humanos | nenhuma — fundo transparente | igual ao de cima |
| `cenarios-lacre-de-custodia` | Direitos Humanos | bandeja de aço escovado de cofre, envelope plástico de segurança **vazio e sem nenhuma impressão**, etiqueta creme em branco; terço superior escuro e limpo (sem faixa chapada colada) | moeda dentro da área do envelope, ¾ suave (20°); por cima, uma camada de reflexo do plástico (branco 8%) |
| `cenarios-faixa-abertura-painel` | Bandeira | veludo `#0d1b35`→`#081226` com guilhoché a 6% (pode reaproveitar `fundos-veludo-noite`) | ¾ grande à direita, **desfocada depois da composição** (gaussiano 18–24 px na 1920), anel dourado capturando brilho; 60% da esquerda livre |
| `og-moeda-bandeira` | Bandeira | noite com guilhoché à direita (como na rodada 2) | ¾, metade direita; nítida; -1200 obrigatório |
| `og-moeda-direitos-humanos` | Direitos Humanos | idem | idem |

### 3.3 O que NÃO refazer
`macros-perfil-serrilha-duas-moedas`, `fundos-veludo-noite`, os 5 `onboarding-spot-*`, `og-recibo-de-custodia` e os
ícones (`marca/`) estão aprovados (Brandbook §13.4.1). Só falta gerar a versão `-1200` do `og-recibo-de-custodia`.
