# `src/components/pwa/` — a tela do app instalável

Tudo que a pessoa **vê** do PWA: o aviso flutuante, o painel com o passo a passo por sistema e o botão da página
inicial. As regras (quando mostrar, o que cada aparelho pode, atualização) estão em
[`src/lib/pwa/`](../../lib/pwa/README.md) — estes componentes só desenham o que a loja de estado manda.

## Arquivos

```
src/components/pwa/
├── RaizDoPwa.tsx           Montado UMA vez no layout raiz. Liga a loja + service worker e hospeda aviso e painel.
├── useInstalacao.ts        Hook (useSyncExternalStore) sobre a loja. Devolve { instantaneo, caminho, pronto, loja }.
├── AvisoDeInstalacao.tsx   Cartão que sobe do rodapé. "Instalar" (Chrome) ou "Como instalar"; "Agora não".
├── GuiaDeInstalacao.tsx    Painel (folha no celular, janela centrada ≥640px) com abas Android | iPhone.
├── BotaoBaixarApp.tsx      "Baixar o app" no herói da página inicial. Some se instalou; volta se desinstalar.
└── IconesDoGuia.tsx        Ícones SVG dos passos e as duas barras desenhadas (Chrome do Android, Safari do iPhone).
```

CSS: `src/styles/pwa.css` (importado em `globals.css`, antes de `admin` e `responsive`).

## Comportamento que não é óbvio

- **Uma só implementação do painel**, aberta pelo aviso e pelo botão. Cada aba tem a versão do sistema: a aba padrão
  é a do aparelho (iPhone abre em iPhone). O botão "Já adicionei" aparece **só** em aparelho iOS, na aba iPhone, e nunca
  dentro de outro aplicativo (Instagram etc.), onde não há como ter instalado.
- **Fora do Safari no iPhone** (Chrome, Firefox, Edge): o painel avisa que o Compartilhar fica na barra de endereço e a
  barra desenhada do Safari não aparece, porque mostraria uma tela que a pessoa não vê.
- **O botão da página inicial nasce visível no HTML do servidor** (antes de hidratar) e some depois, se for o caso. Se
  só nascesse depois, o herói empurraria o conteúdo no meio da leitura (deslocamento de layout). No computador (mouse e
  ≥900px) o CSS o esconde desde o HTML.
- **O aviso cede ao botão**: enquanto o botão da página inicial está na tela (`IntersectionObserver` em
  `[data-pwa-baixar]`), o cartão não aparece; entra quando a pessoa rola para além dele.
- **Os botões flutuantes que já existiam** (Atendimento e "Ver tutorial") **sobem** enquanto o aviso está na tela:
  `AvisoDeInstalacao` mede a própria altura em `--pwa-aviso-altura` e o CSS aplica `translateY` via `:has()`. O
  aviso se retira quando a folha de atendimento, o tour ou as dicas estão abertos.
- **Painel acessível**: `role="dialog"`, abas WAI-ARIA com setas, foco preso dentro, Esc fecha, rolagem do fundo
  travada, foco devolvido a quem abriu. Todo alvo de toque tem 44 px. Sem animação para quem pede `prefers-reduced-motion`.
- **Rótulos do cartão não quebram** (`white-space: nowrap`): em 320 px "Como instalar" quebrava em duas linhas.

## Como mexer

- Texto de passo, ícone ou ilustração: `GuiaDeInstalacao.tsx` e `IconesDoGuia.tsx`. Mantenha os dois sistemas em paralelo
  (mesmo número de passos, mesma estrutura) — a pessoa pode trocar de aba para conferir.
- Onde o aviso aparece: `ROTAS_DO_AVISO` em `src/lib/pwa/instalacao.ts` (teste correspondente no mesmo arquivo).
- Não importe `@/server/*` aqui: são Client Components.
- Teste visual temporário (botão extra, rota de conferência) **nunca vai para produção**: apague antes do commit.
