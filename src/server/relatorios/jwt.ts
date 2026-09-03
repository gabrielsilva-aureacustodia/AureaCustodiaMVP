/**
 * JWT RS256 de conta de serviço do Google — o "assertion" que o OAuth troca
 * por um access token.
 *
 * Separado de sheets.ts (que tem `server-only`) para poder ser testado: aqui
 * não se lê variável de ambiente nenhuma — a chave entra por parâmetro. É a
 * mesma separação de db/client.ts × db/estado.ts.
 */

import { createSign } from 'node:crypto'

export interface ContaDeServico {
  email: string
  /** Chave privada em PEM (PKCS#8), já com quebras de linha reais. */
  chavePrivada: string
}

function base64url(entrada: string | Buffer): string {
  return Buffer.from(entrada).toString('base64url')
}

export function assinarJwtRs256(
  conta: ContaDeServico,
  escopo: string,
  audiencia: string,
  agoraSegundos: number,
  validadeSegundos = 3600,
): string {
  const cabecalho = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const corpo = base64url(
    JSON.stringify({
      iss: conta.email,
      scope: escopo,
      aud: audiencia,
      iat: agoraSegundos,
      exp: agoraSegundos + validadeSegundos,
    }),
  )
  const assinatura = createSign('RSA-SHA256').update(`${cabecalho}.${corpo}`).sign(conta.chavePrivada)
  return `${cabecalho}.${corpo}.${base64url(assinatura)}`
}
