# Benchmark — landings de finanças, marketplace, leilões e coleção (Frente 3, 25/10/2026)

**Método.** Rodada na VM do Colab (`toolkits/pesquisa-na-vm/vm.sh`, sessão `ro-landing`, rodada `LP`): 16 alvos × 2
larguras (1440 e 375), captura da 1ª dobra + auditoria (`vm_paginas.py`: h1, landmarks, "pular", rótulos de ação, LCP,
imagens, regras de `prefers-reduced-motion`). **Sete alvos bloquearam o IP do Colab** (StockX, Heritage, Catawiki, PCGS,
Numista e British Museum com 403; Christie's estourou 45 s) — esses foram lidos no navegador embutido (texto da 1ª dobra,
sem captura), como manda a regra do kit ("a VM é a primeira rota, o navegador é a reserva, e o motivo fica registrado").
Capturas e JSON ficaram no scratchpad da sessão, **fora do Git**. Leitura prévia, para não refazer:
`docs/pesquisa_benchmark_plataformas.md` e `pesquisa_benchmark_fase2.md` (01/10/2026) — aqui só o que é novo ou medido.

[M] = medido na VM · [L] = lido no navegador · [P] = vem das pesquisas anteriores.

## 1. Por referência

| Site | 1ª dobra | Ordem dos blocos | Prova de confiança | CTA | Movimento | Mobile |
|---|---|---|---|---|---|---|
| **Stripe** [M] | h1 de uma frase + contador "PIB global em execução" | herói → logos → soluções → números (135+, US$ 1,9 tri, 99,999%) | números próprios auditáveis + logos de clientes | "Comece já" + "Registre-se com o Google" | gradiente animado; **0 regras de reduced-motion** | 2 botões empilhados em largura total |
| **Mercury** [M] | "Radically different banking" + e-mail + "Open account"; foto | herói → produtos → demo → preços | **aviso regulatório na 1ª dobra**: "fintech company, not an FDIC-insured bank" | "Open account" repetido 3× | vídeo + canvas; 5 regras de reduced-motion | menu "Open Menu" |
| **Nubank** [M] | h1 = campanha; campo de CPF | herói → produtos (Nubank, Croma, Ultravioleta) → cartões | marca; sem números | "Quero ser Nubank" | iframe; 3 regras RM | **sem `main` e sem `nav`** nas landmarks |
| **Robinhood** [M] | "Trade All in One Place" + vídeo (LCP = VÍDEO) | herói → ferramentas → cripto → aprendizado → divulgações | **"Fee Schedule" e "Risk Disclosures" como links visíveis**; BrokerCheck no rodapé | "Get started" | vídeo; **0 regras RM** | igual ao desktop |
| **Public** [M] | lista de produtos com taxas (6,46%…) no h1 | produtos → contas → preços | taxa/números no topo | "Sign up" / "Get started" | 4 vídeos + **27 Lottie**; 1 regra RM | h1 quebrado (texto de vários botões dentro do h1) |
| **StockX** [L][P] | navegação por categoria + busca; banner de cookies | vitrine → tendências | "verificado" em cada item; preço "all-in" antes do clique [P] | "Sign Up \| Login" | — | — |
| **Heritage** [L] | busca + "Consign Now"; "$17 Billion+ Sold" | lotes → vender → avaliação grátis | **número próprio** + depoimento + endereço e telefone completos | "Consign Now" | — | — |
| **Sotheby's** [M] | carrossel de lotes; h1 = "Sotheby's \| Home" | lotes → leilões → histórias | peça rara como herói (o objeto é a prova) | "DISCOVER" ×N (**mesmo nome, destinos diferentes**) | carrossel; 0 RM | sem header/footer como landmark |
| **Christie's** [L] | carrossel promocional + histórias | promo → newsletter → histórias → leilões online | autoridade editorial (datas, artigos) | "SIGN UP" | carrossel | — |
| **Catawiki** [L] | categorias + "Exclusive Selection" repetido 5× (carrossel) | categorias → seleção → lotes | volume de leilões | "Explorar agora" ×5 | carrossel | — |
| **PCGS** [L] | "YOU COLLECT. WE PROTECT." + **verificação de certificado** | serviços → verificação → novidades → guias para iniciantes | ferramenta de conferência (o visitante checa sozinho) | "Get Started", "Verify" | — | — |
| **Numista** [L] | frase do que é + catálogo | catálogo → coleção → troca | "Explore 550.000 tipos" | "Registre-se de graça" | — | — |
| **Royal Mint** [M] | carrossel de produto + cookies | loja → coleção → "INVEST" → "Hold Real Value" | 1.100 anos de marca; Trial of the Pyx | "SHOP NOW" | carrossel; 18 regras RM | 3 h1; 66 imagens sem alt |
| **Rijksmuseum** [M] | h1 de visita + "Skip to main content" | visita → acervo → histórias | acervo (o objeto) | "Book your ticket" | 42 regras RM (a melhor) | menu com "Open menu." |
| **British Museum** [L] | "Welcome" + vídeo **com botão "Pause video"** | visita → exposições → galerias | 2 milhões de anos de história | "Plan your visit" | vídeo pausável | — |
| **Masterworks** (só UX) [M] | h1 + "INQUIRE ABOUT MEMBERSHIP" | herói → **linha do tempo de um caso** (adquirido → retido → vendido) → números | dados da oferta com fonte | 1 CTA repetido | 1 regra RM; **sem `main`** | — |

> Masterworks entra **só** pela linha do tempo de um caso real (ADQUIRIDO → MANTIDO → VENDIDO), que vira o nosso
> "Quatro passos, do correio ao cofre". O enquadramento de "investir em arte" é exatamente o que o Real Olímpico não é.

## 2. O que os 16 fazem igual (e o que nós já fazíamos)
1. **Uma frase de "o que é" no h1** (Mercury, Stripe, PCGS, Numista). A landing antiga abria com "Transforme seus itens
   de colecionador em liquidez" — promessa, não definição.
2. **Prova logo abaixo da promessa**: número próprio (Stripe, Heritage, Numista) ou o objeto (Sotheby's, Rijksmuseum).
   Nosso número próprio e verificável é o **livro de ofertas** (maior oferta de compra, média) — ele subiu para o 3º bloco.
3. **Aviso regulatório visível, não escondido** (Mercury na 1ª dobra; Robinhood com "Fee Schedule"/"Risk Disclosures").
   Nosso posicionamento (não é corretora / não é instituição financeira / não é investimento) estava no 10º bloco.
4. **Preço à mostra** (Robinhood, Public, StockX all-in). Nossas taxas apareciam só no FAQ e no simulador.
5. **Carrossel é o padrão dos leilões** (Sotheby's, Christie's, Catawiki, Royal Mint) — e é onde aparecem os piores
   achados: rótulo repetido para destinos diferentes ("DISCOVER", "Explorar agora" ×5), h1 vazio de sentido, sem pausa.

## 3. Comparação explícita com os métodos do `aprendizado_frontend`

| Método do repositório | O que diz | O que o benchmark mostrou | Decisão aqui |
|---|---|---|---|
| Doc 15 §4 — anatomia (herói → prova social → benefícios → como funciona → … → FAQ → CTA final) | prova social logo após o herói | concordam Stripe, Heritage, Numista | prova = **dados reais do livro**, não logos (não temos cliente nem parceiro para mostrar, e inventar é proibido) |
| Doc 15 §4 (e) — oferta simples cabe em ~5 blocos | Astroship: 4 blocos | Mercury e Nubank cortam muito | 9 blocos, porque cada um responde uma objeção diferente; cortamos a "reserva de valor" como bloco solto (virou parágrafo da história, com ressalva) e a tabela de comparação entrou dentro de Segurança |
| Doc 15 §3.8 — marcar como client só o menor componente | — | — | herói, espécime, cabeçalho, rodapé e FAQ sem `'use client'`; client = simulador + observer do reveal |
| Doc 34 / conceito 08 — ponto focal = LCP | um ponto focal | Robinhood faz do vídeo o LCP | **uma** imagem com `priority` (fetchpriority=high) no herói; a segunda moeda `loading="eager"` sem prioridade; o emblema do cabeçalho perdeu o `priority` que disputava o LCP |
| Doc 34 / conceito 14 — hierarquia | 1 h1, sem pular níveis | Royal Mint 3 h1, Public h1 quebrado, Sotheby's h1 = título da aba | 1 h1; cada seção `aria-labelledby` no seu h2; h3 só dentro de seção |
| Doc 35 §6 — nome acessível único por destino | mesmo nome → mesmo destino | Sotheby's "DISCOVER", Catawiki "Explorar agora" ×5 | "Taxas" (âncora) ≠ "Tabela de taxas" (/taxas); os dois "Negociar →" ganharam `aria-label` com o nome da moeda |
| Doc 35 §4 — ícone estático sem biblioteca de cliente | SVG inline | — | ícones de `LandingIcons.tsx` (SVG inline, `aria-hidden`) |
| Tópico 29 C — reduced-motion | nada se move | Stripe e Robinhood: 0 regras; Rijksmuseum: 42 | flutuação das moedas só em `no-preference`; reveal some em `reduce`; o conteúdo nunca fica em `opacity:0` sem JS |
| Tópico 29 B — tabela acessível, `details` nativo | — | — | comparação casa × cofre virou `<table>` com `caption` e `th scope` (antes era `div role="table"`); FAQ em `<details>` |
| Toolkit direção de design — escala por papel, raio por elemento | eyebrow é a única caixa-alta | — | eyebrow + rótulos de dado em caixa-alta; raio 16 (cartão) / 10 (botão) / pílula (selo) |

## 4. Decisões (cada uma com a referência que a sustenta)
1. **h1 que define o serviço**: "Sua moeda guardada no cofre e pronta para vender." — Mercury, PCGS ("YOU COLLECT. WE
   PROTECT."), Numista. Substitui uma promessa de dinheiro que não combina com "não é investimento".
2. **Faixa "é / não é" logo abaixo do herói** — Mercury (aviso na 1ª dobra), Robinhood (divulgações visíveis). A citação
   institucional inteira continua no fim, intacta.
3. **Taxas na 1ª dobra** (guarda/mês, comissão, "sem frete a cada venda"), lidas da tabela vigente — Robinhood, Public.
4. **Mercado no 3º bloco** com os números reais — Heritage ("$17 Billion+ Sold"), Stripe (números próprios). Nada de
   logo de parceiro ou depoimento (proibido inventar).
5. **Quatro passos numerados em `<ol>`** — Masterworks (linha do tempo de um caso, só como UX), doc 15 §4 item 4.
6. **Perícia + cofre + comparação em um bloco só ("Segurança")** — PCGS (verificação), Royal Mint (autoridade do
   cunho). O espécime ficou sem o reverso (anéis olímpicos — ver PROPOSTAS_BACKEND).
7. **Simulador com as contas do servidor** — StockX (preço all-in), fase 2 [P]. O "custo do comprador" agora inclui o
   1º mês de guarda (regra de 21/10/2026), como no /taxas.
8. **Sem carrossel em lugar nenhum** — é o padrão dos leilões e é onde eles falham em hierarquia e nome acessível.
9. **Mesmo cabeçalho e rodapé em todas as páginas públicas** (`PublicHeader`/`PublicFooter`) — Mercury/Stripe mantêm um
   só casco do marketing ao legal. Telas de acesso em duas colunas (marca + formulário), com os mesmos formulários.
10. **Tema claro de verdade** — a landing antiga só funcionava no escuro (cores literais). Agora só papéis de token.

11. **Movimento acima da "parcimônia" do doc 34 §7, por pedido do Gabriel (25/10/2026)** — o doc 34 sugere 1 efeito no
    herói + até 2 abaixo da dobra; a landing tem mais, porque a meta mudou para "muito alto nível". O que segura o
    custo: cada efeito usa a receita medida do repositório (tópico 09 receita B para a jornada; tópico 14 para
    marquee e revelação; CountUp e Spotlight do doc 16 refeitos sem dependência), anima só transform/opacity, toca
    só na tela, e tem saída em "reduzir movimento" (tópico 15). Custo medido: +3 kB de First Load.
12. **Conceito antes do produto** — reserva de valor e marketplace explicados antes das duas moedas (Masterworks
    explica o modelo antes dos itens; Numista abre por "o que é a plataforma"), porque a marca vai além de moedas.

## 5. Limites
- Sete sites lidos só por texto (bloqueio do IP do Colab); para eles a coluna "movimento/mobile" ficou vazia.
- Nenhuma medição de Lighthouse nos concorrentes; os números de LCP/imagens estão em `_resumo.tsv` do scratchpad.
