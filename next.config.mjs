/** @type {import('next').NextConfig} */
/**
 * Content-Security-Policy em MODO RELATÓRIO (QA do Davi, 22/11/2026): só observa, não bloqueia nada. Entrar em
 * modo bloqueante antes de ver as violações reais quebraria Mercado Pago, Meta ou Supabase em produção. O
 * 'unsafe-inline' em script/style existe porque o Next injeta scripts inline sem nonce e o layout usa os seus
 * (anti-flash do tema, captura do convite); trocar por nonce é o passo seguinte, depois de limpar as violações.
 * Para endurecer: ler o console de um navegador com a página logada, ajustar a lista e trocar a chave para
 * 'Content-Security-Policy'.
 */
const CSP_RELATORIO = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://connect.facebook.net https://sdk.mercadopago.com https://http2.mlstatic.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https://www.facebook.com https://*.mlstatic.com https://*.mercadopago.com https://*.supabase.co",
  "font-src 'self' data: https://fonts.gstatic.com",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.mercadopago.com https://*.mercadolibre.com https://www.facebook.com https://connect.facebook.net https://viacep.com.br https://api.coingecko.com",
  "frame-src 'self' https://*.mercadopago.com https://*.mercadolibre.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ')

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // pg é carregado só pelo adaptador Postgres, em runtime Node. Mantê-lo externo
  // evita que o bundler do servidor tente resolver os drivers opcionais dele.
  serverExternalPackages: ['pg'],
  // Metadata no <head> para TODO navegador (04/11/2026). Desde o Next 15.2 a metadata de rota dinâmica é transmitida
  // no <body> (streaming) e só vai para o <head> para os robôs da lista padrão. O Chrome processa o `<link rel="manifest">`
  // em qualquer posição, mas o Safari do iPhone lê o título do ícone e o modo app (`apple-mobile-web-app-*`) e eu não
  // aposto nisso sem poder testar num iPhone. A documentação do Next dá esta linha como a forma de desligar o
  // streaming de metadata. Custo: a resposta espera a metadata resolver — aqui ela é estática, então é quase zero.
  htmlLimitedBots: /.*/,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Content-Security-Policy-Report-Only', value: CSP_RELATORIO },
        ],
      },
      {
        // Service worker do PWA (src/app/sw.js/route.ts): nunca em cache de CDN ou de navegador, para que o deploy
        // novo seja percebido na próxima checagem. `Service-Worker-Allowed` deixa o escopo ser a raiz do site.
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
    ]
  },
}

export default nextConfig
