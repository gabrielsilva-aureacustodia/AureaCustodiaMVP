# PWA do Real Olímpico — MD de execução (04/11/2026)

Arquivo de trabalho, no disco, **sem commit até o merge** (memória `commit-so-depois-do-merge`). Metodologia: a do IOCUS
(`C:\dev\IOCUS_Park\iocus\docs\diario\BRANCHES\B22-admin-pwa-botao-instalar.md` + `admin/public/sw.js`), adaptada ao que o
Real Olímpico tem de diferente: **plataforma financeira autenticada**, middleware de sessão e botões flutuantes que já existem.

## O pedido (Gabriel, 04/11/2026)
1. PWA instalável em qualquer Android ou iPhone, **fácil de baixar**, **leve e simples**.
2. **Atualiza sozinho** a cada mudança do sistema.
3. **Botão flutuante** de instalação que aparece naturalmente, com tudo que o navegador pede e **uma versão para cada
   sistema** (Android e iPhone), com **ícones explicativos**.
4. **Botão de download na página inicial** que **some** para quem já instalou e **reaparece** se desinstalar.
5. Muito teste de UX e de responsividade.

## O que ler (e nada além) — regra de eficiência nº 7
`src/app/layout.tsx`, `src/middleware.ts`, `src/server/rotas-publicas.ts`, `src/middleware.test.ts`,
`src/components/landing/LandingPage.tsx` (herói), `src/styles/{atendimento,tutorial,base}.css` (flutuantes e z-index),
`src/brand/tokens.css`. Referência externa: os 7 arquivos PWA do IOCUS listados acima.

## Decisões de desenho
| # | Decisão | Por quê |
|---|---|---|
| D1 | **Service worker nunca guarda HTML, API nem dados.** Só `/_next/static/**` e os ícones, mais uma tela `offline.html` | Saldo, ofertas e custódia velhos são pior que "sem conexão" (mesma lição do IOCUS). |
| D2 | `/sw.js` é uma **rota** (`src/app/sw.js/route.ts`) com a versão do deploy dentro do texto | O navegador só atualiza o SW se os bytes mudarem. Sem isso, `registration.update()` nunca acha nada e o app só atualizaria no próximo carregamento de página. |
| D3 | Atualização **sem interromper**: o SW novo assume na hora, e a página recarrega quando o app vai para segundo plano (ou logo na volta, se nada está sendo digitado) | Reload no meio de um Pix ou de um formulário perde o que a pessoa fazia. |
| D4 | Instalado = `display-mode: standalone` **ou** `appinstalled` guardado em `localStorage`; o evento `beforeinstallprompt` **limpa** a marca | O Chrome só dispara o evento se o app NÃO está instalado — é o sinal de "desinstalou, pode voltar o botão". |
| D5 | iPhone não tem sinal nenhum de instalação visto do Safari (armazenamento isolado do app). O botão fica; "Já adicionei" o esconde por **30 dias** e depois volta | Limite da Apple, não da implementação. Dito no relatório. |
| D6 | Banner flutuante **só em** `/`, `/inicio`, `/mercado`, `/taxas`, `/academy` | Nunca por cima de login, pagamento, venda ou retirada. |
| D7 | Banner depois de 6 s; "Agora não" some por 7 dias, depois 30 | Convite, não cobrança. |
| D8 | Um único painel de instruções (aba **Android / iPhone**), aberto pelo banner e pelo botão da landing | Uma implementação, uma armadilha de foco/teclado só. Também deixa conferir as duas versões sem trocar de aparelho. |
| D9 | Navegador embutido (Instagram, Facebook, TikTok…) mostra "abra no Chrome/Safari" + copiar endereço | Esses navegadores não instalam PWA; o link do WhatsApp/Instagram cai ali. |
| D10 | Nada de `viewport-fit=cover` e barra de status iOS `black` | Não mexe no layout do cliente; não exige tratar `safe-area` na topbar. |

## Ordem de prioridade
1. Ícones, manifesto, SW, offline, middleware. 2. Regras puras + store + testes. 3. Banner, painel, botão da landing, CSS.
4. Typecheck, lint, testes, build (uma vez). 5. Teste de navegador (mobile 360/375/390/430, tablet, desktop, tema claro/escuro,
SW em build de produção). 6. Docs.

## Registro de execução (04/11/2026)
- [x] Ícones (`scripts/gerar-icones-pwa.mjs` → `public/pwa/`, `src/app/apple-icon.png`)
- [x] `src/app/manifest.ts`
- [x] `src/lib/pwa/service-worker.ts` + `src/app/sw.js/route.ts` + `public/offline.html`
- [x] `middleware.ts` (matcher) + `rotas-publicas.ts` (`/sw.js`) + `next.config.mjs` (cabeçalhos e `htmlLimitedBots`)
- [x] `src/lib/pwa/instalacao.ts` + `instalacao.test.ts` (39 testes)
- [x] `src/components/pwa/*` + `src/styles/pwa.css` + `layout.tsx` + herói da landing
- [x] Verificação: `typecheck` limpo, `lint` 0 erros, suíte inteira 162 arquivos / 1.542 testes, `build` ok
- [x] Teste de navegador (resultados abaixo)
- [x] README de `src/lib/pwa/` e `src/components/pwa/`, `ATALHOS.md`, RISCOS_ASSUMIDOS (RA-60)

## O que foi testado (build de produção local, store em memória, nenhum banco real)
| Teste | Resultado |
|---|---|
| Arquivos do PWA sem sessão (`manifest`, `sw.js`, `offline.html`, ícones) | 200; `/inicio` segue 307 → `/entrar`; `/api/state` 401 |
| Tags no `<head>` (manifest, `apple-mobile-web-app-*`, `application-name`, ícones) | todas no `<head>` com `htmlLimitedBots` |
| Convite do Chrome capturado cedo | `<script>` inline no HTML; antes era fila `__next_s`, tardia (corrigido) |
| Larguras 320, 360, 375, 430 (celular) e 768 (computador/tablet) | sem estouro horizontal; alvos de toque 44 px; cartão 12 px acima do rodapé |
| Tema claro e escuro | cartão e painel legíveis nos dois |
| Painel Android e iPhone (aba, passos, barras desenhadas) | abas com setas, foco preso, Esc, rolagem travada, foco devolvido |
| iPhone Safari / Chrome do iPhone / Instagram (user agent trocado por proxy local) | aba iPhone padrão; "Já adicionei" some em 30 dias e volta; Chrome sem a barra do Safari; Instagram só "Copiar endereço" |
| Botão da landing | visível antes de hidratar; aviso cede enquanto ele está na tela e entra ao rolar; computador sem suporte não vê convite |
| Área logada (`/inicio`) | aviso se retira durante o passeio e as dicas do produto; com ele aberto, Atendimento e "Ver tutorial" sobem sem sobrepor (folga 12 px); "Agora não" devolve tudo ao lugar e grava 7 dias |
| Atualização automática | deploy novo mudou o `/sw.js` → worker novo assumiu com a página aberta **sem recarregar na cara da pessoa**; ao ir para segundo plano a página recarregou sozinha; só o cache da versão nova ficou |
| Sem conexão | tela nova nunca aberta cai em "Sem conexão" com "Tentar de novo" |

Correções feitas durante o teste: rótulo "Como instalar" quebrava em 320 px; passo 1 do Chrome do iPhone citava a barra do
Safari; "Já adicionei" aparecia dentro do Instagram; convite do Chrome era capturado tarde; aviso cobria o botão da landing.

## Teste em aparelho real (depende do deploy — o Gabriel faz)
**Android (Chrome):**
1. Abrir o site pelo Chrome → o botão "Baixar o app" aparece na página inicial; tocar → diálogo do sistema → Instalar.
2. O ícone do Real Olímpico aparece na tela inicial e abre em tela cheia, sem a barra do navegador.
3. Voltar ao site no Chrome: o botão **não** aparece mais. Desinstalar o app e abrir o site de novo: o botão **volta**.
4. Depois de um deploy novo: abrir o app, sair para a tela inicial do celular e voltar — ele deve estar na versão nova.
5. Modo avião, abrir uma tela nunca visitada → "Sem conexão".

**iPhone (Safari):**
1. Abrir o site no Safari → "Baixar o app" abre o painel já na aba iPhone.
2. Compartilhar → Adicionar à Tela de Início → Adicionar. Conferir o **ícone** (emblema sobre azul-marinho) e o nome "Real Olímpico".
3. Abrir pelo ícone: tela cheia, barra de status preta, sem o endereço. Anotar como é a **abertura** (fundo branco por
   quanto tempo?).
4. No Safari, tocar em "Já adicionei ao meu iPhone": o botão some e só volta em 30 dias.
5. Abrir o link por dentro do Instagram ou do WhatsApp: deve pedir para abrir no navegador.

**Ícones:** visual aprovado pelo Gabriel em 05/11/2026 (emblema sobre `#081226`; o `apple-icon.png` antigo foi substituído).
Falta só ver como fica na tela inicial de um aparelho real.

## Pendências que dependem do Gabriel (não verificáveis aqui)
- O teste em aparelho real acima — depende do deploy.
- `screenshots` no manifesto (instalação "rica" do Android) pedem capturas do visual final da landing.
- Tela de abertura (splash) do iPhone: sem imagem por aparelho; o iOS tende a abrir com fundo branco por ~1 s.

## Conflitos prováveis no merge
`src/app/layout.tsx` e `src/components/landing/LandingPage.tsx` também são editados pelas frentes de polimento
(landing, brandbook). As mudanças do PWA são pequenas e localizadas: no layout, três linhas de metadata, a constante
do ouvinte, o `<script>` e `<RaizDoPwa />`; na landing, um import e `<BotaoBaixarApp />` dentro de `.pub-acoes`.
O número **RA-60** pode colidir com outra branch que também registre um risco: renumerar se for o caso.
