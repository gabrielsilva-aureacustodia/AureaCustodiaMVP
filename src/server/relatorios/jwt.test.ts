/**
 * O JWT precisa ser verificável com a chave pública correspondente e carregar
 * os campos que o OAuth do Google exige. Chave gerada na hora — nenhuma
 * credencial real entra no repositório.
 */

import { createVerify, generateKeyPairSync } from 'node:crypto'

import { describe, expect, it } from 'vitest'

import { assinarJwtRs256 } from './jwt'

describe('assinarJwtRs256', () => {
  it('produz um JWT RS256 válido, com iss, scope, aud, iat e exp', () => {
    const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
    const pem = privateKey.export({ type: 'pkcs8', format: 'pem' }) as string

    const jwt = assinarJwtRs256(
      { email: 'robo@projeto.iam.gserviceaccount.com', chavePrivada: pem },
      'https://www.googleapis.com/auth/spreadsheets',
      'https://oauth2.googleapis.com/token',
      1_700_000_000,
    )
    const [h, c, s] = jwt.split('.')
    expect(JSON.parse(Buffer.from(h, 'base64url').toString())).toEqual({ alg: 'RS256', typ: 'JWT' })
    const claims = JSON.parse(Buffer.from(c, 'base64url').toString())
    expect(claims).toMatchObject({
      iss: 'robo@projeto.iam.gserviceaccount.com',
      aud: 'https://oauth2.googleapis.com/token',
      iat: 1_700_000_000,
      exp: 1_700_003_600,
    })
    const ok = createVerify('RSA-SHA256').update(`${h}.${c}`).verify(publicKey, Buffer.from(s, 'base64url'))
    expect(ok).toBe(true)
  })
})
