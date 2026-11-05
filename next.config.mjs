/** @type {import('next').NextConfig} */
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
