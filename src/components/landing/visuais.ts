/**
 * Ativos visuais da Frente 2 (`public/visuais/**`, branch assets/real-olimpico-visuais) usados pela landing.
 *
 * Os arquivos NÃO são copiados para esta branch (regra do plano): chegam no merge, que vai na ordem 1 → 2 → 3.
 * Por isso os caminhos já são os finais. `FRENTE_2_MESCLADA` é a chave de segurança: se a Frente 3 for
 * mesclada sem a 2, virar para `false` faz a landing voltar às fotos de `public/moedas/` e aos fundos em CSS,
 * sem nenhum 404. Caminhos, dimensões e alt seguem o README da Frente 2 (rodada 2, 25/10/2026).
 *
 * TRIAGEM — o que ficou de fora, de propósito:
 * - fotos de moeda GERADAS (`moedas-*`, `moedas-*-tres-quartos-*`, `cenarios-lacre-de-custodia`, giro 360): a
 *   vitrine mostra as fotos REAIS de `public/moedas/` — moeda é prova, e imagem gerada não pode se passar por
 *   peça guardada. As de "três quartos" ainda redesenham as cores da moeda e a da Bandeira traz os anéis
 *   olímpicos e o logo Rio 2016;
 * - `og-compartilhamento-padrao` e `og-moeda-bandeira` (anéis olímpicos).
 * Cenários (cofre, gavetas, jornada) são ilustração e a tela diz isso ("Imagem ilustrativa").
 */

export const FRENTE_2_MESCLADA = true

export interface Visual {
  base: string
  larguras: readonly number[]
  largura: number
  altura: number
  alt: string
}

export function fontesDo(v: Visual): { avif: string; webp: string; src: string } {
  const lista = (ext: string): string => v.larguras.map((w) => `${v.base}-${w}.${ext} ${w}w`).join(', ')
  return { avif: lista('avif'), webp: lista('webp'), src: `${v.base}-${v.larguras[v.larguras.length - 1]}.webp` }
}

const LARGURAS = [640, 960, 1440, 1920] as const

/** Fundo do herói (16:9, lado esquerdo escuro para o texto). */
export const VISUAL_COFRE: Visual = {
  base: '/visuais/cenarios/cenarios-cofre-custodia-hero',
  larguras: LARGURAS,
  largura: 1920,
  altura: 1080,
  alt: '',
}

/** O mesmo cofre recortado para o celular (4:5, terço de cima escuro para o título). */
export const VISUAL_COFRE_RETRATO: Visual = {
  base: '/visuais/cenarios/cenarios-cofre-custodia-hero-retrato',
  larguras: [640, 960, 1080],
  largura: 1080,
  altura: 1350,
  alt: '',
}

/** Foto do bloco Segurança (4:3). */
export const VISUAL_GAVETAS: Visual = {
  base: '/visuais/cenarios/cenarios-gavetas-seguranca-card',
  larguras: LARGURAS,
  largura: 1920,
  altura: 1440,
  alt: 'Gaveteiro de aço para guarda individual, com forro de veludo azul-marinho (imagem ilustrativa)',
}

/** Macro do bordo serrilhado (≈ 2,33:1) — abre a seção Reserva de valor. Sem anel olímpico visível. */
export const VISUAL_SERRILHA: Visual = {
  base: '/visuais/macros/macros-perfil-serrilha-duas-moedas',
  larguras: LARGURAS,
  largura: 1920,
  altura: 823,
  alt: 'Bordo serrilhado de uma moeda comemorativa, visto de perto (imagem ilustrativa)',
}

function cena(nome: string, alt: string): Visual {
  return { base: `/visuais/cenarios/${nome}`, larguras: LARGURAS, largura: 1920, altura: 1440, alt }
}

/**
 * Cenas da jornada "Como funciona", na ORDEM DOS PASSOS (envio, perícia, recibo, venda): a cena 04 (recibo no
 * celular) vem antes da 03 (gaveta do cofre), porque o passo 4 é "o item não sai do cofre".
 */
export const CENAS_DA_JORNADA: readonly Visual[] = [
  cena('jornada-cena-01-envio', 'Caixa lacrada com fita dourada sobre balcão de madeira'),
  cena('jornada-cena-02-pericia', 'Balança de precisão, paquímetro e lupa sobre feltro azul-marinho'),
  cena('jornada-cena-04-recibo', 'Celular mostrando um recibo de custódia em papel creme'),
  cena('jornada-cena-03-cofre', 'Gaveta de aço do cofre aberta, com divisórias de veludo'),
]

/** Ícones dos pilares da Reserva de valor (SVG em currentColor — pintados por máscara CSS). */
export const SPOTS_DA_RESERVA = {
  proteja: '/visuais/reserva/reserva-spot-proteja.svg',
  valorize: '/visuais/reserva/reserva-spot-valorize.svg',
  ganhe: '/visuais/reserva/reserva-spot-ganhe.svg',
} as const

/** Moldura de papel-moeda e selo da perícia do recibo ilustrado (currentColor, máscara CSS). */
export const MOLDURA_GUILLOCHE = '/visuais/fundos/fundos-textura-guilloche-moldura.svg'
export const SELO_PERICIA = '/visuais/marca/selo-pericia.svg'

/** Texturas de fundo. */
export const TEXTURA_GUILLOCHE = '/visuais/fundos/fundos-textura-escura-guilloche.svg'
export const TEXTURA_VELUDO: Visual = {
  base: '/visuais/fundos/fundos-veludo-noite',
  larguras: LARGURAS,
  largura: 1024,
  altura: 1024,
  alt: '',
}

/** Vídeo de 6 s em laço (porta e gavetas do cofre) da chamada final. 1280x720, sem som. */
export const VIDEO_COFRE = {
  webm: '/visuais/cenarios/cenarios-cofre-porta-loop.webm',
  mp4: '/visuais/cenarios/cenarios-cofre-porta-loop.mp4',
  poster: '/visuais/cenarios/cenarios-cofre-porta-loop-poster.webp',
} as const

/**
 * Card Open Graph (sem anéis). Usa o WebP de 1200 px (59 KB): o PNG mestre tem 1,4 MB, acima do que o
 * WhatsApp aceita bem. Pedido de um JPG 1200x630 < 300 KB em PEDIDO_FRENTE_2.md (rodada 3).
 */
export const VISUAL_OG = { url: '/visuais/og/og-landing-real-olimpico-1200.webp', largura: 1200, altura: 675 } as const
