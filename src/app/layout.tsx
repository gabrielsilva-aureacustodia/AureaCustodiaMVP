/**
 * Layout raiz — o <html>/<head>/<body> que o monolito escrevia à mão
 * (aurea-mvp-teste.html, linhas 1-9 e 627).
 *
 * Três responsabilidades, e as três têm armadilha:
 *
 *  1. FONTES. As famílias da marca (Newsreader e Inter desde o Brandbook de
 *     25/10/2026) moram em src/brand/fontes.ts e vêm de next/font/google, que
 *     hospeda os arquivos junto da aplicação (sem requisição a terceiro, sem
 *     flash de fonte). As classes .variable PRECISAM ir no <html>, não no <body>:
 *     brand/tokens.css declara --ro-fonte-texto:var(--font-sans,...) em :root, e a
 *     substituição de uma custom property acontece no elemento onde ela é
 *     DECLARADA. Com as classes no <body>, --font-sans ainda não existiria no
 *     momento em que :root é resolvido e o site inteiro cairia no fallback.
 *
 *  2. TEMA ANTES DA PRIMEIRA PINTURA. Ver o bloco do script logo abaixo.
 *
 *  3. PROVIDERS. Tema, toast e modal envolvem TODA a aplicação — inclusive a
 *     tela de login, que é irmã do casco autenticado e não filha dele.
 */

import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'

import './globals.css'

import { classesDasFontes } from '@/brand/fontes'
import { RaizDoPwa } from '@/components/pwa/RaizDoPwa'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { ModalProvider } from '@/components/ui/Modal'
import { ToastProvider } from '@/components/ui/Toast'

export const metadata: Metadata = {
  title: 'Real Olímpico — Custódia de moedas comemorativas',
  description: 'Plataforma de custódia e marketplace de moedas comemorativas brasileiras.',
  // PWA (04/11/2026). O manifesto vem de src/app/manifest.ts e o ícone do iPhone de src/app/apple-icon.png — o Next
  // liga os dois ao <head> sozinho. O iPhone NÃO lê o manifesto para o nome nem para o modo de exibição (versões
  // antigas), então os dois ficam repetidos aqui:
  //  - `title`: o rótulo embaixo do ícone na tela inicial;
  //  - `statusBarStyle: 'black'`: a barra de status do iPhone fica preta e o conteúdo começa ABAIXO dela. A alternativa
  //    `black-translucent` põe o app por baixo da barra e exigiria tratar `safe-area` na topbar da área do cliente.
  applicationName: 'Real Olímpico',
  appleWebApp: { capable: true, title: 'Real Olímpico', statusBarStyle: 'black' },
  formatDetection: { telephone: false },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Barra de endereço do Android e barra de status do app instalado, na cor do fundo do tema escuro (o de nascença).
  themeColor: '#081226',
}

/**
 * CAPTURA PRECOCE DO CONVITE DE INSTALAÇÃO. O Chrome dispara `beforeinstallprompt` UMA vez por carregamento, assim que
 * julga o site instalável — e isso pode acontecer antes de o React hidratar e montar o ouvinte de verdade
 * (src/lib/pwa/navegador.ts). Este ouvinte de uma linha só guarda o evento em `window.__roPwaEvento`; a loja de
 * instalação o recolhe ao iniciar. Sem isso, num celular lento, o botão "Instalar" poderia nascer sem o diálogo nativo.
 * Não chama `preventDefault()`: o convite do próprio navegador segue funcionando.
 *
 * É um <script> inline comum, como o anti-flash do tema, e NÃO `next/script` com `beforeInteractive`: no App Router
 * esse modo não vira script de verdade no HTML, vira uma entrada na fila `self.__next_s` que só roda quando o bundle
 * principal carrega — quase tão tarde quanto a hidratação, o que anularia o propósito (verificado no HTML de produção
 * em 04/11/2026). O inline roda durante o parse, antes de qualquer pacote.
 */
const CAPTURA_DO_CONVITE = `window.addEventListener('beforeinstallprompt',function(e){window.__roPwaEvento=e});`

/**
 * SCRIPT ANTI-FLASH — não é enfeite, é requisito.
 *
 * tokens.css não define cor nenhuma em :root. As variáveis semânticas (--bg,
 * --text, --card, --line, --shadow) só existem dentro de body[data-theme="dark"]
 * e body[data-theme="light"]. Um <body> que nasça sem o atributo não tem
 * background nem cor de texto: a página fica branca com texto preto por um
 * instante, mesmo para quem escolheu o tema escuro.
 *
 * Por isso o servidor já emite <body data-theme="dark"> — o mesmo literal do
 * monolito, que também nascia escuro. Este script só corrige o caso de quem
 * escolheu o claro, e roda como PRIMEIRO FILHO DO <body>, não dentro do <head>:
 *
 *  - dentro do <head>, `document.body` ainda é null e não há o que ajustar;
 *  - operar em document.documentElement resolveria a ordem, mas exigiria
 *    duplicar todos os blocos de tema em tokens.css para html[data-theme=...];
 *  - como primeiro filho do <body> o elemento já existe, o script é
 *    bloqueante de parser e o navegador não pintou nada ainda.
 *
 * dangerouslySetInnerHTML é obrigatório aqui e é a ÚNICA ocorrência do projeto:
 * React escapa &, < e > em filhos de texto, e o parser HTML não desfaz entidades
 * dentro de <script> — um `&&` no código viraria `&amp;&amp;` e o script quebraria
 * na sintaxe. O conteúdo é uma constante deste arquivo; nada de fora entra nele.
 */
const APLICA_TEMA = `(function(){try{var t=localStorage.getItem('aurea-theme');if(t==='light'||t==='dark'){document.body.setAttribute('data-theme',t)}}catch(e){}})();`

export default function RootLayout({ children }: { children: ReactNode }): ReactNode {
  return (
    <html lang="pt-BR" className={classesDasFontes}>
      {/* data-theme no HTML do servidor: sem ele, o primeiro frame sai sem
          nenhuma cor semântica. suppressHydrationWarning porque o script abaixo
          pode ter trocado o atributo para 'light' antes de o React hidratar —
          divergência esperada, não um defeito. */}
      <body data-theme="dark" suppressHydrationWarning>
        <script dangerouslySetInnerHTML={{ __html: APLICA_TEMA }} />
        <script dangerouslySetInnerHTML={{ __html: CAPTURA_DO_CONVITE }} />
        <ThemeProvider>
          <ToastProvider>
            <ModalProvider>{children}</ModalProvider>
          </ToastProvider>
        </ThemeProvider>
        {/* Fora dos providers de propósito: não usa tema, toast nem modal, e o aviso flutuante não deve herdar nada
            que possa remontá-lo. Liga o PWA (instalação + service worker) e hospeda o aviso e o painel de instruções. */}
        <RaizDoPwa />
      </body>
    </html>
  )
}
