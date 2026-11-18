/**
 * As metatags do PWA que o layout raiz põe no <head>, separadas do `layout.tsx` por um motivo de teste: o layout importa
 * CSS e `next/font`, que a suíte (vitest, ambiente `node`) não carrega. Aqui o objeto é puro e `metadados.test.ts`
 * confere o que o iPhone vai ler.
 *
 * O QUE CADA UMA FAZ NO iPHONE
 *  - `apple-mobile-web-app-capable`: a tag que a Apple documenta para o site abrir como app (sem barra do Safari). O
 *    Next 15.5 NÃO a emite: `appleWebApp.capable` vira `mobile-web-app-capable` (a versão sem prefixo, do Chrome).
 *    Em 04/11/2026 o PWA saiu achando que as duas saíam; conferido em 17/11/2026 em
 *    node_modules/next/dist/lib/metadata/generate/basic.js, só a sem prefixo sai. Por isso a da Apple vai em `other`,
 *    ao lado da outra — as duas juntas não se atrapalham.
 *  - `apple-mobile-web-app-title`: o nome embaixo do ícone na tela inicial.
 *  - `apple-mobile-web-app-status-bar-style: black`: barra de status preta e conteúdo ABAIXO dela. `black-translucent`
 *    poria o app por baixo da barra e exigiria tratar `safe-area` na topbar do cliente (decisão D10 do MD do PWA).
 *  - `format-detection`: o Safari não transforma número de moeda ou de protocolo em link de telefone.
 */

import type { Metadata } from 'next'

export const METADADOS_DO_PWA: Pick<Metadata, 'applicationName' | 'appleWebApp' | 'formatDetection' | 'other'> = {
  applicationName: 'Real Olímpico',
  appleWebApp: { capable: true, title: 'Real Olímpico', statusBarStyle: 'black' },
  formatDetection: { telephone: false },
  other: { 'apple-mobile-web-app-capable': 'yes' },
}
