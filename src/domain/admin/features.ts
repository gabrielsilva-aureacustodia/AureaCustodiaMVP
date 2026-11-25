/* ============================================================================
 * FEATURES — interruptores que a superadmin liga e desliga em /admin/features.
 *
 * Regra pura (sem React, sem Next, sem I/O): a lista, o padrão de cada uma e a leitura do que está
 * gravado. O banco guarda cada interruptor em `aurea.config_plataforma` com a chave `feature.<chave>`
 * (tipo `inteiro`, 1 = ligada, 0 = desligada) — a mesma tabela e o mesmo histórico da configuração
 * do site, sem migration nova. Chave sem linha vale o PADRÃO daqui, então este arquivo é o que o
 * site faz quando ninguém mexeu em nada.
 *
 * `confirmacaoNegociacao` nasce DESLIGADA (pedido do Gabriel, 25/11/2026): compra, venda e oferta
 * passam sem pedir a senha. Ligar volta à regra D3 de 17/11 (confirmação por senha, janela de 5 min).
 * ==========================================================================*/

export type GrupoFeature = 'negociacao' | 'visual' | 'atendimento'

export interface DefinicaoFeature {
  chave: string
  grupo: GrupoFeature
  rotulo: string
  descricao: string
  /** O que vale quando ninguém gravou nada. */
  padrao: boolean
}

export const ROTULO_GRUPO_FEATURE: Record<GrupoFeature, string> = {
  negociacao: 'Negociação',
  visual: 'Aparência e animações',
  atendimento: 'Atendimento e ajuda',
}

export const DEFINICOES_FEATURES: readonly DefinicaoFeature[] = [
  {
    chave: 'confirmacaoNegociacao',
    grupo: 'negociacao',
    rotulo: 'Pedir a senha para negociar',
    descricao:
      'Ligada: comprar, vender, anunciar e pagar compra pedem a senha (ou o código por e-mail) a cada 5 minutos. Desligada: toda negociação é feita sem nenhuma confirmação. Saque, troca de senha, e-mail, Pix e retirada de moeda continuam pedindo, porque não são negociação.',
    padrao: false,
  },
  {
    chave: 'animacoes',
    grupo: 'visual',
    rotulo: 'Animações e transições',
    descricao:
      'Desligada: tira as animações e transições do app do cliente e do painel (útil se alguma tela estiver pesada ou piscando).',
    padrao: true,
  },
  {
    chave: 'botaoTutorial',
    grupo: 'atendimento',
    rotulo: 'Botão flutuante "Ver tutorial"',
    descricao: 'Desligada: esconde o botão de tutorial do app do cliente.',
    padrao: true,
  },
  {
    chave: 'botaoAtendimento',
    grupo: 'atendimento',
    rotulo: 'Botão flutuante de atendimento',
    descricao: 'Desligada: esconde o botão de atendimento do app do cliente.',
    padrao: true,
  },
]

export type ChaveFeature = (typeof DEFINICOES_FEATURES)[number]['chave']

/** Prefixo na tabela `config_plataforma`: nenhuma chave de configuração do site começa com ele. */
export const PREFIXO_FEATURE = 'feature.'

export function chaveNoBanco(chave: string): string {
  return `${PREFIXO_FEATURE}${chave}`
}

export function definicaoDeFeature(chave: string): DefinicaoFeature | undefined {
  return DEFINICOES_FEATURES.find((d) => d.chave === chave)
}

export type FeaturesVigentes = Record<string, boolean>

/** O padrão do código: o que vale sem banco, sem tabela ou com a leitura falhando. */
export function featuresPadrao(): FeaturesVigentes {
  return Object.fromEntries(DEFINICOES_FEATURES.map((d) => [d.chave, d.padrao]))
}

/**
 * Junta o padrão com o que está gravado. Valor gravado que não é 0 nem 1 (linha corrompida) é
 * ignorado: vale o padrão, nunca um palpite.
 */
export function featuresVigentes(gravados: Readonly<Record<string, unknown>>): FeaturesVigentes {
  const saida = featuresPadrao()
  for (const d of DEFINICOES_FEATURES) {
    const bruto = gravados[chaveNoBanco(d.chave)]
    if (bruto === 1 || bruto === true) saida[d.chave] = true
    else if (bruto === 0 || bruto === false) saida[d.chave] = false
  }
  return saida
}

/**
 * CSS que aplica as features visuais no app e no painel. Texto fixo montado só a partir de chaves
 * conhecidas: nada vindo do banco ou do cliente entra aqui.
 */
export function cssDasFeatures(f: FeaturesVigentes): string {
  const regras: string[] = []
  if (f.animacoes === false) {
    regras.push('*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}')
  }
  if (f.botaoTutorial === false) regras.push('.tutorial-link{display:none!important}')
  if (f.botaoAtendimento === false) regras.push('.atd-fab{display:none!important}')
  return regras.join('')
}
