/**
 * Content-Security-Policy do site (QA do Davi, 22/11/2026) — em .mjs porque o `next.config.mjs` a importa (o config
 * roda antes de qualquer TypeScript). O tipo está em `csp.d.mts`; o teste, em `csp.test.ts`.
 *
 * MODO BLOQUEANTE. A lista de origens vem do que o CÓDIGO usa no navegador, não de tentativa e erro em produção:
 *  - Meta (Pixel): `connect.facebook.net` (script fbevents.js), `www.facebook.com` (imagem/beacon `tr?id=…` e noscript).
 *    O Pixel só carrega depois do "Aceitar" do banner de cookies (A09).
 *  - Mercado Pago: o pagamento abre `init_point` em OUTRA aba (`window.open`) e o QR do Pix vem como dado — o site não
 *    carrega o SDK do Mercado Pago. Mesmo assim ficam liberadas imagens e frames de `*.mercadopago.com`/`*.mlstatic.com`/
 *    `*.mercadolibre.com`, para o caso de o checkout embutido ou a marca das bandeiras aparecerem em tela.
 *  - Supabase: `*.supabase.co` em connect (API e realtime), img e media (vídeos da bancada vêm de URL assinada do Storage).
 *  - Fontes: `next/font` as serve do próprio domínio (`'self'`).
 *  - Service worker do PWA e manifesto: do próprio domínio.
 * 'unsafe-inline' em script/style continua: o Next injeta scripts inline sem nonce e o layout raiz tem dois (tema e
 * convite do PWA). Trocar por nonce exige renderização dinâmica de todas as páginas — fica como endurecimento seguinte.
 * Em desenvolvimento entra 'unsafe-eval' (o HMR do Next precisa); em produção não.
 *
 * `form-action` FICA DE FORA de propósito: o login pelo Google responde a um formulário com redirecionamento para
 * `accounts.google.com`, e o Chrome aplica `form-action` também ao destino do redirecionamento.
 */

/** @param {boolean} producao */
export function politicaDeSeguranca(producao) {
  const scripts = ["'self'", "'unsafe-inline'", 'https://connect.facebook.net']
  if (!producao) scripts.push("'unsafe-eval'")

  return [
    "default-src 'self'",
    `script-src ${scripts.join(' ')}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://www.facebook.com https://*.facebook.com https://*.mlstatic.com https://*.mercadopago.com https://*.supabase.co",
    "font-src 'self' data:",
    "media-src 'self' blob: data: https://*.supabase.co",
    "connect-src 'self' https://connect.facebook.net https://*.facebook.com https://*.supabase.co wss://*.supabase.co https://*.mercadopago.com https://*.mercadolibre.com",
    "frame-src 'self' https://*.mercadopago.com https://*.mercadolibre.com",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "object-src 'none'",
  ].join('; ')
}
