# Pedido ao Antigravity — ativos para a plataforma do cliente (Frente 4)

> Para o Gabriel colar no Antigravity. Complementa (não repete) `docs/marca/PEDIDOS_ANTIGRAVITY.md` da Frente 1 e o
> que a Frente 2 já entregou em `public/visuais/` (onboarding, cenários, macros). Tudo aqui tem lugar pronto na
> plataforma — os caminhos abaixo já são lidos pelas telas ou estão anotados para ligar.

---

**PROMPT (colar a partir daqui)**

Você vai produzir ativos visuais para a área logada do **Real Olímpico** (custódia física de moedas comemorativas
brasileiras de R$ 1 e negociação entre colecionadores; marca no masculino: "o Real Olímpico"). Leia antes
`docs/marca/BRANDBOOK_REAL_OLIMPICO.md` (§1 princípios, §4 cor, §9 componentes) e `public/visuais/README.md`.

Regras que não se negociam:
1. Nada de token, NFT, cripto, gráfico de "investimento", seta de valorização ou promessa de retorno.
2. Fotografia de objeto, luz de estúdio, fundo noite (#0B1730–#14254A) ou pergaminho (#F7F2E7); acento ouro #C9A24B.
3. Entrega: PNG mestre + WebP e AVIF em 640/960/1440/1920 (fotos) e SVG puro com `<title>` e cores por
   `currentColor`/variáveis (ilustrações). Um `.json` por ativo com alt-text em português e dimensões.
4. Nomes de arquivo exatamente como abaixo, em `public/visuais/<pasta>/`.

Ativos:

| # | Arquivo | Formato | Onde entra | Descrição |
|---|---|---|---|---|
| 1 | `moedas/moeda-bandeira-2012-reverso` | 1:1, fundo transparente | Início (cartão da moeda), cotação do Mercado, `CoinArt` | Reverso da moeda Entrega da Bandeira 2012, frontal, foto realista, em alta resolução |
| 2 | `moedas/moeda-direitos-humanos-1998-reverso` | 1:1, transparente | idem | Reverso Direitos Humanos 1998, frontal, mesma luz do #1 |
| 3 | `moedas/moeda-real-anverso-padrao` | 1:1, transparente | ficha da moeda (alternar anverso/reverso) | Anverso de valor facial R$ 1 (bimetálica), frontal |
| 4 | `moedas/moeda-<tipo>-tres-quartos` (2 arquivos) | 4:3, transparente | galeria de recibos (`.recibo-card`) | As duas moedas em ¾ com sombra de contato, para o cartão do recibo |
| 5 | `onboarding/onboarding-spot-livro-por-tipo` | SVG 4:3 | Mercado, vazio do livro filtrado | Duas pilhas de fichas separadas por um filete: "cada tipo de moeda tem a sua fila" |
| 6 | `onboarding/onboarding-spot-jornada-retirada` | SVG 16:5 | `/retirada`, acima da jornada | Cinco marcos em linha: pedido → taxa → separação → postagem → entrega (sem texto na arte) |
| 7 | `onboarding/onboarding-spot-cadastro-completo` | SVG 4:3 | aviso "Complete seu cadastro" em Minha conta | Documento com check e cadeado, traço fino ouro |
| 8 | `cenarios/cenarios-faixa-abertura-painel-claro` | 21:9 | Início no tema claro (o escuro já existe) | Mesma composição de `cenarios-faixa-abertura-painel`, em pergaminho, moeda à direita, 55% esquerdos limpos para texto |

Critério de aceite: cada imagem legível a 160 px de largura; contraste do motivo ≥ 3:1 contra o fundo; nenhum texto
gravado na imagem (o texto vem da página); alt-text descreve o objeto, não o efeito.

**(fim do prompt)**

---

Depois de entregue: os itens 1–3 entram no lugar das fotos atuais (mais resolução e a mesma luz nas duas moedas); o
item 8 entra no `.inicio-conta` de `home.css`/`shell.css` com `body[data-theme="light"]`.
