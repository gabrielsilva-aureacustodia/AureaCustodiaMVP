import 'server-only'

/**
 * Configuração do contrato dos Correios (API CWS) — lida do ambiente, nunca do código.
 *
 * Substitui o `CORREIOS_TOKEN` fixo de 02/09/2026. Aquele desenho guardava um token que a API
 * CWS faz vencer em 24 horas: funcionava no primeiro dia e, no segundo, os Correios respondiam 401
 * e o frete caía calado na tabela inventada. O contrato não entrega token, entrega USUÁRIO e CÓDIGO
 * DE ACESSO; o token nasce deles, no servidor (`./cliente.ts`).
 *
 * Os códigos de serviço vêm da API Meu Contrato, consultada em 22/10/2026 para o cartão
 * 0080378641. Entrada (cliente → custódia) é LOGÍSTICA REVERSA: o frete cai na fatura do contrato e
 * o cliente posta sem pagar no balcão. Saída (custódia → cliente, a retirada) é o serviço comum do
 * contrato.
 */

import type { ModalidadeEnvio } from '../types'

export interface ConfigCorreios {
  usuario: string
  codigoAcesso: string
  cartaoPostagem: string
  contrato: string
  /** Diretoria regional do contrato (20 = Minas Gerais). */
  dr: number
}

export const SERVICOS_CORREIOS: Record<'entrada' | 'saida', Record<ModalidadeEnvio, string>> = {
  entrada: { PAC: '03301', SEDEX: '03247' }, // PAC REVERSO / SEDEX REVERSO
  saida: { PAC: '03298', SEDEX: '03220' }, // PAC CONTRATO AG / SEDEX CONTRATO AG
}

/**
 * O adicional de valor declarado muda com o serviço: SEDEX usa 019, PAC usa 064. Mandar 019 num
 * PAC devolve `ERP-054: Serviço adicional 019 nao pode ser prestado` — conferido em 22/10/2026.
 */
export const ADICIONAL_VALOR_DECLARADO: Record<ModalidadeEnvio, string> = {
  SEDEX: '019',
  PAC: '064',
}

/** O seguro é sobre o valor declarado, e os Correios recusam declarar abaixo do mínimo. */
export const VALOR_DECLARADO_MINIMO_CENTS = 2450

function ler(nome: string): string {
  return (process.env[nome] ?? '').trim()
}

/** A configuração completa, ou `null` quando falta qualquer peça. */
export function lerConfigCorreios(): ConfigCorreios | null {
  const usuario = ler('CORREIOS_USUARIO')
  const codigoAcesso = ler('CORREIOS_CODIGO_ACESSO')
  const cartaoPostagem = ler('CORREIOS_CARTAO_POSTAGEM')
  const contrato = ler('CORREIOS_CONTRATO')
  const dr = Number.parseInt(ler('CORREIOS_DR'), 10)
  if (!usuario || !codigoAcesso || !cartaoPostagem || !contrato || !Number.isFinite(dr)) return null
  return { usuario, codigoAcesso, cartaoPostagem, contrato, dr }
}

export function correiosConfigurado(): boolean {
  return lerConfigCorreios() !== null
}
