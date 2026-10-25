/**
 * Os mesmos tokens de src/brand/tokens.css, em TypeScript, para quem não lê CSS:
 * gráficos (canvas/SVG gerado), PDF do recibo (jsPDF), imagem OG e e-mail.
 *
 * A fonte da verdade é o CSS — este arquivo é espelho, e o teste
 * src/brand/__tests__/tokens.test.ts falha se um hex daqui divergir de lá.
 * Só entram os primitivos e os papéis SÓLIDOS; véus (color-mix) e gradientes
 * existem só no CSS, porque fora do navegador não há o que misturar.
 */

export const primitivos = {
  noite: {
    50: '#eef2f9',
    100: '#d9e1ef',
    200: '#b3c1da',
    300: '#8fa0bd',
    400: '#6a7d9f',
    450: '#5a6b8c',
    500: '#4a5d80',
    600: '#34466a',
    700: '#1e3054',
    750: '#152a52',
    800: '#132546',
    850: '#10203f',
    900: '#0d1b35',
    920: '#0b1830',
    950: '#081226',
    990: '#050a16',
  },
  ouro: {
    50: '#fbf6e9',
    100: '#f8ecc6',
    200: '#f2dc95',
    300: '#ebc977',
    350: '#d4af6a',
    400: '#e3b95c',
    500: '#c9a24b',
    600: '#a07c2c',
    650: '#8a7444',
    700: '#8a6c2a',
    800: '#7a5d1c',
    900: '#5d4718',
    950: '#1a1608',
  },
  pergaminho: {
    0: '#ffffff',
    50: '#fdf9ef',
    100: '#f7f5f0',
    150: '#f4f1e9',
    200: '#f5f0e4',
    250: '#f2ede0',
    300: '#e3dbc0',
    400: '#d9cfae',
    500: '#a08e5e',
    600: '#6b6248',
    950: '#fdfaf2',
  },
  verde: { 300: '#dff5e8', 400: '#4cc27c', 500: '#3fae6a', 700: '#1f7a45' },
  vermelho: { 300: '#ffe3e3', 400: '#e07a7a', 500: '#d05555', 700: '#a33232' },
  bronze: { 300: '#f7e7bd', 400: '#e8913a', 700: '#9a4f0f' },
  azul: { 400: '#6ea8ff', 700: '#2f5fb3' },
} as const

export type Tema = 'dark' | 'light'

/** Papéis sólidos já resolvidos por tema — o que um gráfico ou PDF deve usar. */
export const papeis: Record<
  Tema,
  {
    fundo: string
    superficie: string
    cartaoBase: string
    campo: string
    texto: string
    textoForte: string
    textoSuave: string
    bordaCampo: string
    primaria: string
    sobrePrimaria: string
    primariaTexto: string
    sucessoTexto: string
    perigoTexto: string
    avisoTexto: string
    infoTexto: string
    foco: string
  }
> = {
  dark: {
    fundo: primitivos.noite[950],
    superficie: primitivos.noite[900],
    cartaoBase: primitivos.noite[850],
    campo: primitivos.noite[920],
    texto: primitivos.pergaminho[250],
    textoForte: primitivos.pergaminho[950],
    textoSuave: primitivos.noite[300],
    bordaCampo: primitivos.ouro[650],
    primaria: primitivos.ouro[500],
    sobrePrimaria: primitivos.ouro[950],
    primariaTexto: primitivos.ouro[500],
    sucessoTexto: primitivos.verde[400],
    perigoTexto: primitivos.vermelho[400],
    avisoTexto: primitivos.bronze[400],
    infoTexto: primitivos.azul[400],
    foco: primitivos.ouro[400],
  },
  light: {
    fundo: primitivos.pergaminho[100],
    superficie: primitivos.pergaminho[0],
    cartaoBase: primitivos.pergaminho[0],
    campo: primitivos.pergaminho[0],
    texto: primitivos.noite[900],
    textoForte: primitivos.noite[950],
    textoSuave: primitivos.noite[450],
    bordaCampo: primitivos.ouro[600],
    primaria: primitivos.ouro[500],
    sobrePrimaria: primitivos.ouro[950],
    primariaTexto: primitivos.ouro[800],
    sucessoTexto: primitivos.verde[700],
    perigoTexto: primitivos.vermelho[700],
    avisoTexto: primitivos.bronze[700],
    infoTexto: primitivos.azul[700],
    foco: primitivos.ouro[800],
  },
}

/** Razão de contraste WCAG 2.x entre duas cores #rrggbb (1 a 21). */
export function contraste(a: string, b: string): number {
  const luminancia = (hex: string): number => {
    const canais = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    const [r, g, bl] = canais.map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
    return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (bl ?? 0)
  }
  const [x, y] = [luminancia(a), luminancia(b)]
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}
