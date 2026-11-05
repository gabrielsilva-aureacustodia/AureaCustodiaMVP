/**
 * Manifesto do PWA do Real Olímpico — é ele que faz o navegador oferecer "Instalar app".
 *
 * Servido como `/manifest.webmanifest` pelo App Router, com o Content-Type certo e a tipagem do próprio Next
 * (`MetadataRoute.Manifest`): campo escrito errado quebra o build em vez de quebrar em silêncio na instalação.
 * O middleware NÃO barra este endereço (ver o `matcher` de src/middleware.ts): o navegador busca o manifesto sem
 * cookie, e um redirecionamento para /entrar entregaria HTML onde ele espera JSON — o app deixaria de ser instalável
 * só para quem está deslogado, que é justamente quem vê o convite.
 *
 * O QUE O CHROME EXIGE PARA OFERECER A INSTALAÇÃO (e onde isso está garantido):
 *   - HTTPS ........................ Vercel
 *   - manifesto com name, icons 192 e 512, start_url e display standalone ........ abaixo
 *   - service worker com `fetch` ... public via src/app/sw.js/route.ts
 *
 * O QUE O iPHONE FAZ DIFERENTE: não existe convite automático. O Safari lê o ícone do `<link rel="apple-touch-icon">`
 * (src/app/apple-icon.png) e o nome de `appleWebApp.title` (layout.tsx), e a instalação é manual pelo botão
 * Compartilhar — por isso o painel de instruções (src/components/pwa/) existe.
 */

import type { MetadataRoute } from 'next'

/**
 * Mesmo azul de `--ro-noite-950`, o fundo do tema escuro (que é o tema de nascença do site). Serve de cor da barra de
 * status do Android e de fundo da tela de abertura; com a mesma cor do ícone, a abertura não mostra "caixa" em volta do
 * medalhão.
 */
const AZUL_NOITE = '#081226'

export default function manifest(): MetadataRoute.Manifest {
  return {
    // Identidade estável do app. Sem `id`, o navegador deriva de `start_url`, e mudar a página inicial um dia faria o
    // sistema tratar o app como OUTRO e duplicar o ícone de quem já instalou.
    id: '/',
    name: 'Real Olímpico',
    short_name: 'Real Olímpico',
    description: 'Guarda e marketplace de itens de coleção. Proteja suas moedas no cofre e venda quando quiser.',
    lang: 'pt-BR',
    dir: 'ltr',

    // Quem abre o app pelo ícone quer o painel, não a página de vendas: com sessão cai em /inicio; sem sessão o
    // middleware manda para /entrar. `scope: '/'` mantém /admin e /painel dentro da mesma janela do app.
    start_url: '/inicio',
    scope: '/',

    // `standalone` tira a barra de endereço (parece aplicativo) e mantém a barra de status do sistema. Não é
    // `fullscreen`: esconder relógio e bateria irritaria sem ganho. Sem `orientation`: o cliente usa tablet e celular
    // nos dois sentidos, e travar em retrato quebraria o tablet.
    display: 'standalone',
    background_color: AZUL_NOITE,
    theme_color: AZUL_NOITE,
    categories: ['shopping', 'lifestyle'],

    icons: [
      // `any`: usado como está (lista de apps, diálogo de instalação). Gerados por scripts/gerar-icones-pwa.mjs.
      { src: '/pwa/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/pwa/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      // `maskable`: o Android recorta na forma do sistema. O medalhão ocupa 68% do lado, dentro da zona segura.
      { src: '/pwa/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],

    // Atalhos do toque longo no ícone (Android). Só telas que já existem e que o cliente abre todo dia.
    shortcuts: [
      { name: 'Mercado', url: '/mercado', description: 'Ver ofertas de moedas' },
      { name: 'Vender', url: '/vender', description: 'Anunciar uma moeda da sua custódia' },
      { name: 'Extrato', url: '/conta/extrato', description: 'Ver movimentações da conta' },
    ],

    // Dizer explicitamente que NÃO há app de loja equivalente: sem isso o Chrome pode deixar de oferecer a instalação
    // quando há uma "alternativa nativa" declarada.
    prefer_related_applications: false,
  }
}
