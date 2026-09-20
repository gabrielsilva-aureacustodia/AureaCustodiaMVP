/**
 * MÓDULO DE DOMÍNIO — Aceite por blocos dos Termos de Uso e Privacidade.
 *
 * Reunião jurídica com Felipe Moraes (09/09/2026) e Gabriel:
 * Em vez de um aceite genérico único ("Li e aceito tudo"), o cliente marca
 * caixas temáticas para os pontos operacionais mais sensíveis da plataforma.
 * Meta: entre 4 e 6 caixas.
 *
 * Módulo puro: sem I/O, sem dependências de servidor ou banco, determinístico
 * e testável isoladamente.
 */

import type { LegalBlockAcceptance, LegalBlockId, LegalBlockItem } from '@/domain/types'

/** Versão oficial vigente dos Termos de Uso. Nunca deve ser reciclada. */
export const VERSAO_TERMOS_VIGENTE = '2.0'

/** Versão oficial vigente da Política de Privacidade. Nunca deve ser reciclada. */
export const VERSAO_PRIVACIDADE_VIGENTE = '2.0'

/**
 * As 6 caixas de aceite acordadas para a publicação:
 * 1. Moeda equiparável na devolução (7.2.6 e 7.5.3)
 * 2. Prazos D+3 e D+30 (7.5.6 e 7.7.2)
 * 3. Custos de retirada e de saque (7.5.5 e Tabela de Taxas)
 * 4. Bloqueio por débito (5.1 e 11.1)
 * 5. Posicionamento institucional (Preâmbulo)
 * 6. Tratamento de dados pessoais essenciais (Cláusula 13)
 */
export const BLOCOS_LEGAIS_OBRIGATORIOS: readonly LegalBlockItem[] = [
  {
    id: 'moeda_equiparavel',
    titulo: 'Moeda equiparável na devolução',
    resumo:
      'A moeda devolvida na retirada física não é necessariamente o mesmo exemplar depositado, mas moeda equiparável de mesma espécie, valor facial e estado de conservação.',
    clausulaReferencia: 'Cláusulas 7.2.6 e 7.5.3 dos Termos de Uso',
    urlDocumento: '/termos',
  },
  {
    id: 'prazos_d3_d30',
    titulo: 'Prazos operacionais (D+3 e D+30)',
    resumo:
      'Prazos operacionais: até D+3 (3 dias úteis) para conclusão de saques bancários e até 30 dias corridos para separação, embalagem e POSTAGEM da moeda na retirada física. O prazo de entrega depois da postagem é o dos Correios, e não do Real Olímpico.',
    clausulaReferencia: 'Cláusulas 7.5.6 e 7.7.2 dos Termos de Uso',
    urlDocumento: '/termos',
  },
  {
    id: 'custos_cliente',
    titulo: 'Custos de frete, seguro e saque',
    resumo:
      'Os custos operacionais de transporte, seguro e embalagem na retirada física, bem como eventuais tarifas de transferência para saque, são de responsabilidade do cliente.',
    clausulaReferencia: 'Cláusula 7.5.5 dos Termos de Uso e Tabela de Taxas',
    urlDocumento: '/taxas',
  },
  {
    id: 'debito_garantia',
    titulo: 'Bloqueio por débito',
    resumo:
      'Débitos pendentes de custódia podem bloquear a emissão e transferência de recibos e a realização de novas operações.',
    clausulaReferencia: 'Cláusulas 5.1 e 11.1 dos Termos de Uso',
    urlDocumento: '/termos',
  },
  {
    id: 'posicionamento_institucional',
    titulo: 'Natureza do serviço e posicionamento institucional',
    resumo:
      'O Real Olímpico presta serviços de guarda de bens físicos e emissão de recibos nominativos. Não é corretora, não é instituição financeira e não intermedia ativos digitais, tokens ou investimentos.',
    clausulaReferencia: 'Preâmbulo dos Termos de Uso',
    urlDocumento: '/termos',
  },
  {
    id: 'dados_pessoais_lgpd',
    titulo: 'Tratamento de dados pessoais (LGPD)',
    resumo:
      'Concordo com a coleta e tratamento de dados cadastrais essenciais (CPF, endereço, telefone e dados bancários) estritamente para identificação fiscal, cumprimento contratual e segurança.',
    clausulaReferencia: 'Cláusula 13 dos Termos de Uso e Política de Privacidade',
    urlDocumento: '/privacidade',
  },
] as const

/** Lista canônica de IDs de todos os blocos obrigatórios. */
export const TODOS_OS_BLOCOS_IDS: readonly LegalBlockId[] = BLOCOS_LEGAIS_OBRIGATORIOS.map(
  (b) => b.id,
)

export interface ValidacaoAceiteResultado {
  valido: boolean
  faltando: LegalBlockId[]
}

/**
 * Valida se uma lista arbitrária de blocos marcados contém todos os 6 blocos obrigatórios.
 */
export function validarAceiteBlocos(
  blocosMarcados: readonly string[] | null | undefined,
): ValidacaoAceiteResultado {
  if (!blocosMarcados || !Array.isArray(blocosMarcados)) {
    return { valido: false, faltando: [...TODOS_OS_BLOCOS_IDS] }
  }

  const conjunto = new Set(blocosMarcados)
  const faltando = TODOS_OS_BLOCOS_IDS.filter((id) => !conjunto.has(id))

  return {
    valido: faltando.length === 0,
    faltando,
  }
}

/**
 * Verifica se o registro de aceite fornecido é válido perante a versão vigente.
 *
 * Critérios rigorosos:
 * 1. O objeto de aceite deve existir;
 * 2. A versão dos termos registrada deve coincidir exatamente com a versão vigente;
 * 3. A versão de privacidade registrada deve coincidir exatamente com a versão vigente;
 * 4. Todos os 6 blocos obrigatórios devem constar na lista de aceites.
 *
 * Se qualquer critério falhar (ou se houver subida de versão), a verificação retorna false,
 * indicando que a interface deve solicitar novo aceite antes de operar.
 */
export function verificarAceiteVigente(
  aceite: LegalBlockAcceptance | null | undefined,
  versaoTermos: string = VERSAO_TERMOS_VIGENTE,
  versaoPrivacidade: string = VERSAO_PRIVACIDADE_VIGENTE,
): boolean {
  if (!aceite) return false
  if (aceite.termsVersion !== versaoTermos) return false
  if (aceite.privacyVersion !== versaoPrivacidade) return false
  return validarAceiteBlocos(aceite.blocks).valido
}
