/**
 * Catálogo dos ativos visuais da marca (public/visuais/, gerados pela Frente 2 e conferidos no
 * Brandbook §13.4). Um lugar só para tela nenhuma escrever caminho de imagem à mão.
 *
 * POR QUE A SITUAÇÃO MORA AQUI: a rodada 3 entregou as moedas compostas com os canais vermelho e
 * azul trocados (o anel dourado saiu azul), corrigidos na 3b. Ativo reprovado fica marcado, com o
 * motivo, e os componentes caem para a foto real de public/moedas/ — que está sempre certa. Liberar
 * um ativo é trocar `situacao` para 'aprovado' depois de conferir (Brandbook §13.4).
 *
 * Os arquivos raster existem em quatro larguras (640/960/1440/1920), em AVIF e WebP, com o nome
 * `<base>-<largura>.<formato>`; os OG têm também 1200.
 */

export type SituacaoDoAtivo = 'aprovado' | 'pendente'

export interface AtivoRaster {
  readonly tipo: 'raster'
  /** Caminho sem largura nem extensão, ex.: '/visuais/cenarios/jornada-cena-01-envio'. */
  readonly base: string
  readonly larguras: readonly number[]
  /** Largura e altura relativas, para reservar o espaço e evitar salto de layout. */
  readonly proporcao: readonly [number, number]
  readonly alt: string
  readonly situacao: SituacaoDoAtivo
  readonly motivo?: string
}

export interface AtivoVetor {
  readonly tipo: 'vetor'
  readonly src: string
  /** Versão desenhada para fundo escuro, quando existe. */
  readonly srcEscuro?: string
  readonly alt: string
  readonly situacao: SituacaoDoAtivo
}

const LARGURAS = [640, 960, 1440, 1920] as const
const LARGURAS_OG = [640, 960, 1200, 1440, 1920] as const

const raster = (
  base: string,
  proporcao: readonly [number, number],
  alt: string,
  situacao: SituacaoDoAtivo = 'aprovado',
  motivo?: string,
  larguras: readonly number[] = LARGURAS,
): AtivoRaster => ({ tipo: 'raster', base, larguras, proporcao, alt, situacao, motivo })

export const ATIVOS = {
  moedaBandeiraTresQuartos: raster(
    '/visuais/moedas/moedas-bandeira-tres-quartos-transparente',
    [1, 1],
    'Moeda comemorativa de 1 real Entrega da Bandeira Olímpica, vista em três quartos',
  ),
  moedaDireitosHumanosTresQuartos: raster(
    '/visuais/moedas/moedas-direitos-humanos-tres-quartos-transparente',
    [1, 1],
    'Moeda comemorativa de 1 real dos 50 anos da Declaração Universal dos Direitos Humanos, vista em três quartos',
  ),
  moedaBandeiraReverso: raster('/visuais/moedas/moedas-bandeira-reverso', [1, 1], 'Reverso da moeda Entrega da Bandeira Olímpica'),
  moedaDireitosHumanosReverso: raster('/visuais/moedas/moedas-direitos-humanos-reverso', [1, 1], 'Reverso da moeda dos Direitos Humanos'),
  parDeMoedas: raster('/visuais/moedas/moedas-dupla-par-hero', [16, 9], 'As duas moedas negociáveis lado a lado sobre ardósia'),
  macroSerrilha: raster('/visuais/macros/macros-perfil-serrilha-duas-moedas', [21, 9], 'Bordo serrilhado da moeda visto de perfil'),
  cofre: raster('/visuais/cenarios/cenarios-cofre-custodia-hero', [16, 9], 'Interior do cofre de custódia, com gavetas de aço'),
  gavetas: raster('/visuais/cenarios/cenarios-gavetas-seguranca-card', [4, 3], 'Gaveteiro modular de custódia'),
  veludo: raster('/visuais/fundos/fundos-veludo-noite', [1, 1], ''),
  faixaPainel: raster('/visuais/cenarios/cenarios-faixa-abertura-painel', [21, 9], ''),
  lacre: raster(
    '/visuais/cenarios/cenarios-lacre-de-custodia',
    [4, 3],
    'Moeda lacrada em envelope de segurança sobre bandeja do cofre',
    'pendente',
    'rodadas 2, 3 e 3b: a cena nunca saiu como foto de bandeja com envelope (esquema chapado). Proposta: usar jornadaCofre no lugar — Brandbook §13.4.3',
  ),
  jornadaEnvio: raster('/visuais/cenarios/jornada-cena-01-envio', [4, 3], 'Caixa de envio lacrada com fita dourada e etiqueta em branco'),
  jornadaPericia: raster('/visuais/cenarios/jornada-cena-02-pericia', [4, 3], 'Balança de precisão, paquímetro e lupa sobre feltro azul'),
  jornadaCofre: raster('/visuais/cenarios/jornada-cena-03-cofre', [4, 3], 'Gaveta do cofre aberta, com forro de veludo'),
  jornadaRecibo: raster('/visuais/cenarios/jornada-cena-04-recibo', [4, 3], 'Recibo de custódia aberto na tela do celular'),
  ogLanding: raster('/visuais/og/og-landing-real-olimpico', [16, 9], '', 'aprovado', undefined, LARGURAS_OG),
  ogRecibo: raster('/visuais/og/og-recibo-de-custodia', [16, 9], '', 'aprovado', undefined, LARGURAS_OG),
  ogMoedaBandeira: raster('/visuais/og/og-moeda-bandeira', [16, 9], '', 'aprovado', undefined, LARGURAS_OG),
  ogMoedaDireitosHumanos: raster('/visuais/og/og-moeda-direitos-humanos', [16, 9], '', 'aprovado', undefined, LARGURAS_OG),
} as const satisfies Record<string, AtivoRaster>

export type IdDoAtivo = keyof typeof ATIVOS

/* Ilustrações de estado (série de spots). Decorativas por padrão: o título do estado já diz tudo. */
const vetor = (nome: string, escuro = false): AtivoVetor => ({
  tipo: 'vetor',
  src: `/visuais/onboarding/${nome}.svg`,
  srcEscuro: escuro ? `/visuais/onboarding/${nome}-escuro.svg` : undefined,
  alt: '',
  situacao: 'aprovado',
})

export const ILUSTRACOES = {
  semItens: vetor('onboarding-vazio-sem-itens', true),
  semOrdens: vetor('onboarding-vazio-sem-ordens', true),
  reciboEmitido: vetor('onboarding-spot-recibo-emitido', true),
  saqueSolicitado: vetor('onboarding-spot-saque-solicitado', true),
  etiquetaFrete: vetor('onboarding-spot-etiqueta-frete', true),
  custodiaAPagar: vetor('onboarding-spot-custodia-a-pagar', true),
  envioEmAnalise: vetor('onboarding-spot-envio-em-analise', true),
  custodiaSegura: vetor('onboarding-spot-custodia-segura', true),
  reciboAutentico: vetor('onboarding-spot-recibo-autentico', true),
  negociacao: vetor('onboarding-spot-negociacao-marketplace', true),
  retirada: vetor('onboarding-spot-retirada-fisica', true),
} as const satisfies Record<string, AtivoVetor>

export type IdDaIlustracao = keyof typeof ILUSTRACOES

/** A foto real de cada moeda negociável: a recaída de todo render pendente. Nunca pendente. */
export const FOTO_REAL = {
  bandeira: { src: '/moedas/moeda-entrega-da-bandeira-2012.png', alt: 'Moeda comemorativa de 1 real Entrega da Bandeira Olímpica' },
  'direitos-humanos': { src: '/moedas/moeda-direitos-humanos-1998.png', alt: 'Moeda comemorativa de 1 real dos 50 anos da Declaração Universal dos Direitos Humanos' },
} as const

export type MoedaNegociavel = keyof typeof FOTO_REAL

export const RENDER_TRES_QUARTOS: Record<MoedaNegociavel, IdDoAtivo> = {
  bandeira: 'moedaBandeiraTresQuartos',
  'direitos-humanos': 'moedaDireitosHumanosTresQuartos',
}

/** `srcset` de um formato: "/visuais/x-640.avif 640w, /visuais/x-960.avif 960w, …". */
export function srcsetDe(ativo: AtivoRaster, formato: 'avif' | 'webp'): string {
  return ativo.larguras.map((l) => `${ativo.base}-${l}.${formato} ${l}w`).join(', ')
}

/** Caminho de uma largura específica (a mais próxima disponível acima dela). */
export function srcDe(ativo: AtivoRaster, largura: number, formato: 'avif' | 'webp' = 'webp'): string {
  const l = ativo.larguras.find((x) => x >= largura) ?? ativo.larguras[ativo.larguras.length - 1]
  return `${ativo.base}-${l}.${formato}`
}
