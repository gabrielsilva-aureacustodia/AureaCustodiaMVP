/**
 * Normalização e hash dos dados do cliente para a API de Conversões da Meta.
 *
 * A Meta só aceita e-mail, nome e país em SHA-256 hexadecimal, depois de uma normalização exata — um espaço ou uma
 * maiúscula a mais e o hash não bate com o do Facebook, o evento perde o vínculo com a pessoa e o cadastro some da
 * campanha. Regras de developers.facebook.com/docs/marketing-api/conversions-api/parameters/customer-information-parameters:
 *  - `em`: sem espaços nas pontas, minúsculas;
 *  - `fn`/`ln`: minúsculas, sem pontuação (acentos ficam, em UTF-8);
 *  - `country`: código ISO 3166-1 alfa-2 em minúsculas;
 *  - NÃO se faz hash de IP, user agent, `fbp` e `fbc`.
 *
 * Função pura (sem I/O) para ser testada sem rede; só usa `node:crypto`.
 */

import { createHash } from 'node:crypto'

export function sha256(valor: string): string {
  return createHash('sha256').update(valor, 'utf8').digest('hex')
}

export function hashEmail(email: string): string | undefined {
  const limpo = email.trim().toLowerCase()
  return limpo ? sha256(limpo) : undefined
}

/**
 * "Maria da Silva" → primeiro nome "maria", sobrenome "silva". Nome de uma palavra só não tem sobrenome. Números e
 * pontuação saem; o que sobra é comparado em minúsculas.
 */
export function hashNomes(nomeCompleto: string): { fn?: string; ln?: string } {
  const partes = nomeCompleto
    .toLowerCase()
    .replace(/[^\p{L}\s]/gu, '')
    .split(/\s+/)
    .filter(Boolean)
  if (partes.length === 0) return {}
  const primeiro = partes[0]
  const ultimo = partes.length > 1 ? partes[partes.length - 1] : undefined
  return {
    fn: primeiro ? sha256(primeiro) : undefined,
    ln: ultimo ? sha256(ultimo) : undefined,
  }
}

export function hashPais(codigoIso: string): string {
  return sha256(codigoIso.trim().toLowerCase())
}
