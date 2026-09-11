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
export const VERSAO_TERMOS_VIGENTE = '1.0-2026-09-10'

/** Versão oficial vigente da Política de Privacidade. Nunca deve ser reciclada. */
export const VERSAO_PRIVACIDADE_VIGENTE = '1.0-2026-09-10'

/**
 * As 6 caixas de aceite acordadas para a publicação:
 * 1. Moeda equiparável na devolução (não é a mesma moeda física depositada)
 * 2. Prazos D+3 (dinheiro) e D+30 (moeda)
 * 3. Custos de retirada e de saque por conta do cliente
 * 4. Débito pode bloquear recibo e moeda pode servir de garantia
 * 5. Posicionamento institucional (não é corretora, não é financeira, não é cripto)
 * 6. Tratamento de dados pessoais essenciais (LGPD)
 */
export const BLOCOS_LEGAIS_OBRIGATORIOS: readonly LegalBlockItem[] = [
  {
    id: 'moeda_equiparavel',
    titulo: 'Moeda equiparável na devolução',
    resumo:
      'A moeda devolvida na retirada física não é necessariamente o mesmo exemplar depositado, mas moeda equiparável de mesma espécie, valor facial e estado de conservação.',
    clausulaReferencia: 'Cláusula 1 dos Termos de Uso',
    urlDocumento: '/termos',
  },
  {
    id: 'prazos_d3_d30',
    titulo: 'Prazos operacionais (D+3 e D+30)',
    resumo:
      'Prazos operacionais: até D+3 (72h úteis) para conclusão de saques bancários e até D+30 para separação, embalagem e postagem da moeda na retirada física.',
    clausulaReferencia: 'Cláusula 6 dos Termos de Uso',
    urlDocumento: '/termos',
  },
  {
    id: 'custos_cliente',
    titulo: 'Custos de frete, seguro e saque',
    resumo:
      'Os custos operacionais de transporte, seguro e embalagem na retirada física, bem como eventuais tarifas de transferência para saque, são de responsabilidade do cliente.',
    clausulaReferencia: 'Cláusula 5 dos Termos de Uso',
    urlDocumento: '/termos',
  },
  {
    id: 'debito_garantia',
    titulo: 'Bloqueio por débito e garantia',
    resumo:
      'Débitos pendentes de custódia podem bloquear a emissão e transferência de recibos. Saldos e moedas sob custódia podem servir de garantia em caso de inadimplência.',
    clausulaReferencia: 'Cláusulas 3 e 4 dos Termos de Uso',
    urlDocumento: '/termos',
  },
  {
    id: 'posicionamento_institucional',
    titulo: 'Natureza do serviço e posicionamento institucional',
    resumo:
      'A Áurea Custódia presta serviços de guarda de bens físicos e emissão de recibos nominativos. Não é corretora, não é instituição financeira e não intermedia ativos digitais, tokens ou investimentos.',
    clausulaReferencia: 'Preâmbulo e Cláusula 8 dos Termos de Uso',
    urlDocumento: '/termos',
  },
  {
    id: 'dados_pessoais_lgpd',
    titulo: 'Tratamento de dados pessoais (LGPD)',
    resumo:
      'Concordo com a coleta e tratamento de dados cadastrais essenciais (CPF, endereço, telefone e dados bancários) estritamente para identificação fiscal, cumprimento contratual e segurança.',
    clausulaReferencia: 'Seções 3 e 4 da Política de Privacidade',
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
