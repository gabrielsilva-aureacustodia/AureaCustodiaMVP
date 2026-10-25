/**
 * Famílias da marca Real Olímpico, carregadas por next/font (arquivos servidos
 * do próprio domínio: sem requisição a terceiro e sem flash de fonte).
 *
 * Substituem Playfair Display + Source Sans 3, que vinham do monolito. Motivo,
 * medido no benchmark (docs/polimento/brandbook/BENCHMARK.md §Decisões):
 *  - Newsreader: serifa de traço clássico com eixo óptico (opsz 6-72). A logo é
 *    uma capitular romana de serifa triangular; o Playfair é didone (contraste
 *    vertical extremo) e brigava com ela. O eixo óptico deixa o mesmo arquivo
 *    firme no título de painel (18px) e fino no herói (72px).
 *  - Inter: grotesca neutra de altura-x grande, com algarismos tabulares — o
 *    padrão das plataformas financeiras medidas (Söhne, Suisse, BTG Sans) numa
 *    fonte livre, e legível em 13px numa tabela de ofertas.
 *
 * As duas são variáveis: um arquivo cobre todos os pesos, então não listamos
 * `weight`. A classe `.variable` de cada uma vai no <html> (ver layout.tsx).
 */

import { Inter, Newsreader } from 'next/font/google'

export const fonteDisplay = Newsreader({
  subsets: ['latin'],
  axes: ['opsz'],
  variable: '--font-display',
  display: 'swap',
})

export const fonteTexto = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

/** As duas classes que publicam --font-display e --font-sans. Vão no <html>. */
export const classesDasFontes = `${fonteDisplay.variable} ${fonteTexto.variable}`
