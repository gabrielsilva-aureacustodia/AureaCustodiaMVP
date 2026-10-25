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
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { ModalProvider } from '@/components/ui/Modal'
import { ToastProvider } from '@/components/ui/Toast'

export const metadata: Metadata = {
  title: 'Real Olímpico — Custódia de moedas comemorativas',
  description: 'Plataforma de custódia e marketplace de moedas comemorativas brasileiras.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

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
        <ThemeProvider>
          <ToastProvider>
            <ModalProvider>{children}</ModalProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
