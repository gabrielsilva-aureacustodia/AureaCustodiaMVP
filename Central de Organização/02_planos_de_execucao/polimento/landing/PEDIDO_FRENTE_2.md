# Pedido à Frente 2 (Antigravity) — ativos para a landing de alto nível (25/10/2026, rodada 2)

> Para o Gabriel colar no agente da Frente 2. Tudo vai para `C:\dev\AureaCustodiaMVP-assets\public\visuais\`, no
> mesmo padrão do README de lá (mestre + WebP/AVIF 640/960/1440/1920 + JSON). A landing já consome
> `cenarios-cofre-custodia-hero`, `cenarios-gavetas-seguranca-card`, os 4 `onboarding-spot-*` e
> `fundos-textura-escura-guilloche`. Os itens abaixo alimentam as peças novas: jornada presa em "Como funciona",
> pilares da reserva de valor, chamada final e compartilhamento.

## Onde cada ativo entra (para o agente entender o porquê)

| Ativo | Componente da landing | Uso |
|---|---|---|
| 1. og-landing-real-olimpico | `src/app/page.tsx` (metadata) | prévia do link no WhatsApp/redes |
| 2. cofre-hero-retrato | herói no celular (`PictureResponsiva` + `<source media>`) | fundo 4:5 |
| 3. jornada-cena-01…04 | `movimento/JornadaPresa.tsx` | quadro que troca a cada passo da rolagem |
| 4. reserva-spot-proteja/valorize/ganhe | pilares da reserva de valor | medalhão de cada pilar |
| 5. onboarding-spot-*-escuro | jornada no tema escuro | versão sem papel branco |
| 6. moldura + selo | `ReciboIlustrado.tsx` | moldura de papel-moeda e selo "conferido" |
| 7. cofre-porta-loop | chamada final | vídeo curto de fundo, com pôster e botão de pausa |

---

```text
Você é o agente da Frente 2 (ativos visuais) do Real Olímpico. Trabalhe só em C:\dev\AureaCustodiaMVP-assets
(branch assets/real-olimpico-visuais). A landing nova (Frente 3) já usa: cenarios-cofre-custodia-hero (herói),
cenarios-gavetas-seguranca-card (Segurança), os 4 onboarding-spot-* (jornada "Como funciona") e
fundos-textura-escura-guilloche (chamada final). O posicionamento agora é mais amplo que moedas: "guarda e
marketplace de itens de coleção" — proteger, valorizar, vender quando quiser, reserva de valor. Começamos pelas
moedas comemorativas, mas a marca vai receber outros itens de coleção.

Paleta: navy #081226 / #0d1b35, dourado #c9a24b / #e3b95c, creme #f5f0e4, tinta de certificado #8a6c2a.
Luz: a mesma do cofre do herói (aço escovado, luz fria de teto, reflexo dourado discreto), lado esquerdo escuro.

REGRAS QUE NÃO SE NEGOCIAM
- NENHUM anel olímpico, logo Rio 2016, mascote ou marca do COB/COI, em nenhum ativo, nem desfocado ao fundo.
  (O og-compartilhamento-padrao atual mostra os anéis e o logo Rio 2016 e NÃO pode ser usado.)
- Nenhuma marca de terceiros (Correios, Sicoob, bancos, cartões). Nenhum texto legível dentro das imagens: nada de
  números, valores, nomes, "token", "NFT", "cripto", "investimento", "rentabilidade".
- Não gerar nem imitar as logos de public/brand/.
- Moeda gerada por IA nunca como foto de peça guardada. Se aparecer moeda, é secundária, desfocada ou só pelo
  ANVERSO (valor de face), e nunca o reverso da Entrega da Bandeira.
- Sem pessoas identificáveis (rosto); mãos podem aparecer, sem anel/aliança chamativos.

ENTREGAS
1. og-landing-real-olimpico — 1200x630, PNG + WebP. Fundo navy com textura guilloché, o cofre desfocado à direita,
   metade esquerda vazia (o título não vai na imagem).
2. cenarios-cofre-custodia-hero-retrato — 4:5 (1080x1350 + derivados). O mesmo cofre do herói, recortado para
   celular, com o terço de cima escuro e liso para o título.
3. jornada-cena-01-envio, -02-pericia, -03-cofre, -04-recibo — 4:3 (1440x1080 + derivados), série coerente, mesma
   luz e ângulo de 3/4:
   01 caixa pequena lacrada com fita dourada sobre balcão de madeira escura, sem logo;
   02 bancada de perícia: balança de precisão, paquímetro e lupa sobre feltro azul-marinho, peça fora de foco;
   03 gaveta de aço do cofre fechando, com forro de veludo azul-marinho visível;
   04 mão segurando um celular cuja tela mostra um documento creme com moldura guilloché, sem texto legível.
4. reserva-spot-proteja, reserva-spot-valorize, reserva-spot-ganhe — SVG semântico 96x96, traço 2.5px em
   currentColor (para eu colorir pelo tema), <title> em português:
   proteja = escudo com fechadura; valorize = medalhão com seta curva para cima, SEM números ou eixos;
   ganhe = recibo virando moedas que caem numa carteira.
5. onboarding-spot-*-escuro — os 4 spots atuais, sem o retângulo branco, traço creme #f5f0e4 + dourado #c9a24b,
   fundo transparente.
6. fundos-textura-guilloche-moldura.svg (moldura retangular de papel-moeda, rosetas nos 4 cantos, faixa de 6px,
   currentColor, viewBox 330x220) e selo-pericia.svg (selo circular serrilhado, sem texto, currentColor, 96x96).
7. cenarios-cofre-porta-loop — vídeo de 6 s em laço perfeito, 1280x720, sem som, WebM (VP9) + MP4 (H.264),
   cada um com menos de 1,5 MB, + pôster WebP do 1º quadro: a porta do cofre fechando devagar, câmera parada.

ENTREGA FINAL: atualize o README do catálogo (tabela + frente de destino + alt sugerido) e liste os arquivos novos.
Não faça commit (o orquestrador commita no merge). Se usar a VM, desligue só a sua sessão.
```

## Depois que os ativos chegarem (Frente 3 ou orquestrador)
- `visuais.ts`: acrescentar os caminhos; `JornadaPresa` passa a usar `jornada-cena-0N` no lugar dos spots.
- `page.tsx`: `openGraph.images` com o item 1.
- Herói: `<source media="(max-width: 860px)">` com o item 2.
- Chamada final: `<video muted playsinline loop poster>` com botão de pausar (WCAG 2.2.2), só em `no-preference`.
