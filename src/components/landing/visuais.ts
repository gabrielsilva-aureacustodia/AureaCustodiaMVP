/**
 * Ativos visuais da Frente 2 usados pela landing — lidos do CATÁLOGO da marca (`src/brand/ativos.ts`, Frente 1)
 * sempre que o ativo está lá: a regra do Brandbook é que tela nenhuma escreva caminho de imagem à mão, e que ativo
 * `pendente` não apareça (o catálogo sabe o que foi reprovado e cai para a foto real).
 *
 * Sem aviso de "imagem ilustrativa" na tela (pedido do Gabriel, 25/10/2026): as cenas são claramente de
 * ambientação, nenhum conceito mostrado é falso e o cofre real é mais protegido que o da foto — o aviso tirava
 * legitimidade sem informar nada.
 *
 * O que o catálogo ainda NÃO tem (retrato do herói, ícones da reserva, moldura, selo, vídeo e textura guilloché)
 * fica declarado aqui, com o mesmo formato, até a Frente 1 acrescentá-lo — pedido em PROPOSTAS_BACKEND.md (P11).
 * `src/brand/` é da Frente 1 e não é editado por esta frente.
 *
 * `FRENTE_2_MESCLADA` é a chave de segurança: com `false`, a landing volta às fotos de `public/moedas/` e aos
 * fundos em CSS, sem nenhum 404 — para publicar a Frente 3 antes de os arquivos de `public/visuais/` existirem.
 */

import { ATIVOS, type AtivoRaster } from '@/brand/ativos'

export const FRENTE_2_MESCLADA = true

export interface Visual {
  base: string
  larguras: readonly number[]
  largura: number
  altura: number
  alt: string
}

/** Converte um ativo do catálogo no formato desta landing. Ativo pendente vira `undefined` (não aparece). */
function doCatalogo(a: AtivoRaster, alt?: string): Visual | undefined {
  if (a.situacao !== 'aprovado') return undefined
  const [pw, ph] = a.proporcao
  const largura = a.larguras[a.larguras.length - 1] ?? 1920
  return { base: a.base, larguras: a.larguras, largura, altura: Math.round((largura * ph) / pw), alt: alt ?? a.alt }
}

export function fontesDo(v: Visual): { avif: string; webp: string; src: string } {
  const lista = (ext: string): string => v.larguras.map((w) => `${v.base}-${w}.${ext} ${w}w`).join(', ')
  return { avif: lista('avif'), webp: lista('webp'), src: `${v.base}-${v.larguras[v.larguras.length - 1]}.webp` }
}

/** Fundo do herói (16:9, lado esquerdo escuro para o texto). Decorativo. */
export const VISUAL_COFRE = doCatalogo(ATIVOS.cofre, '')

/** O mesmo cofre recortado para o celular (4:5). Fora do catálogo por enquanto (P11). */
export const VISUAL_COFRE_RETRATO: Visual = {
  base: '/visuais/cenarios/cenarios-cofre-custodia-hero-retrato',
  larguras: [640, 960, 1080],
  largura: 1080,
  altura: 1350,
  alt: '',
}

/** Foto do bloco Segurança (4:3). */
export const VISUAL_GAVETAS = doCatalogo(
  ATIVOS.gavetas,
  'Gaveteiro de aço para guarda individual, com forro de veludo azul-marinho',
)

/** Macro do bordo serrilhado — abre a seção Reserva de valor. */
export const VISUAL_SERRILHA = doCatalogo(ATIVOS.macroSerrilha, 'Bordo serrilhado de uma moeda, visto de perto')

/**
 * Cenas da jornada "Como funciona", na ORDEM DOS PASSOS (envio, perícia, recibo, venda): a cena do recibo no
 * celular vem antes da gaveta do cofre, porque o passo 4 é "o item não sai do cofre". Decorativas: o texto do
 * passo diz tudo.
 */
export const CENAS_DA_JORNADA: readonly (Visual | undefined)[] = [
  doCatalogo(ATIVOS.jornadaEnvio, ''),
  doCatalogo(ATIVOS.jornadaPericia, ''),
  doCatalogo(ATIVOS.jornadaRecibo, ''),
  doCatalogo(ATIVOS.jornadaCofre, ''),
]

/** Ícones dos pilares da Reserva de valor (SVG em currentColor — pintados por máscara CSS). Fora do catálogo (P11). */
export const SPOTS_DA_RESERVA = {
  proteja: '/visuais/reserva/reserva-spot-proteja.svg',
  valorize: '/visuais/reserva/reserva-spot-valorize.svg',
  ganhe: '/visuais/reserva/reserva-spot-ganhe.svg',
} as const

/** Moldura de papel-moeda e selo da perícia do recibo ilustrado (currentColor, máscara CSS). Fora do catálogo (P11). */
export const MOLDURA_GUILLOCHE = '/visuais/fundos/fundos-textura-guilloche-moldura.svg'
export const SELO_PERICIA = '/visuais/marca/selo-pericia.svg'

/** Textura de papel-moeda da chamada final. Fora do catálogo (P11). */
export const TEXTURA_GUILLOCHE = '/visuais/fundos/fundos-textura-escura-guilloche.svg'

/** Vídeo de 6 s em laço (porta e gavetas do cofre) da chamada final. 1280x720, sem som. Fora do catálogo (P11). */
export const VIDEO_COFRE = {
  webm: '/visuais/cenarios/cenarios-cofre-porta-loop.webm',
  mp4: '/visuais/cenarios/cenarios-cofre-porta-loop.mp4',
  poster: '/visuais/cenarios/cenarios-cofre-porta-loop-poster.webp',
} as const

/**
 * Card Open Graph (sem anéis), do catálogo. Usa o WebP de 1200 px (59 KB): o PNG mestre tem 1,4 MB, acima do que
 * o WhatsApp aceita bem.
 */
const OG = ATIVOS.ogLanding
export const VISUAL_OG = { url: `${OG.base}-1200.webp`, largura: 1200, altura: 675 } as const
