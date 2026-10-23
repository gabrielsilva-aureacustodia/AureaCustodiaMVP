/**
 * O certificado e-CNPJ A1 da AUREA CUSTODIA LTDA — quem assina cada nota e autentica a conexão.
 *
 * O arquivo NUNCA vive no repositório (o repositório é público, e com o arquivo e a senha qualquer
 * um assina como a empresa). Ele chega por duas variáveis de ambiente, no `.env.local` e na Vercel
 * (Sensitive): `NFSE_CERT_PFX_BASE64` (o .pfx em Base64) e `NFSE_CERT_SENHA`. O original está em
 * docs/privado/certificados/, fora do Git. Válido até 04/08/2027.
 *
 * Por que `node-forge`: o .pfx da AC Safeweb usa a cifra antiga do PKCS#12 (RC2/3DES), que o
 * OpenSSL 3 do Node só abre em modo "legacy" — nem para a conexão TLS (`https` com `pfx` falha com
 * "Unsupported PKCS12 PFX data") nem para extrair a chave. O forge lê o arquivo em JavaScript puro,
 * e daí em diante tudo usa PEM: a assinatura XML e a conexão.
 */

import forge from 'node-forge'

export interface CertificadoA1 {
  /** Chave privada em PEM — assina o XML e autentica a conexão TLS. */
  chavePem: string
  /** Certificado do titular em PEM — vai no `<X509Certificate>` da assinatura. */
  certificadoPem: string
  /**
   * Titular seguido da cadeia da AC, em PEM, para a conexão TLS. O `pfx` cru não serve ali: o
   * OpenSSL 3 do Node recusa a cifra antiga do arquivo ("Unsupported PKCS12 PFX data").
   */
  cadeiaPem: string
  titular: string
  validoAte: Date
}

export class CertificadoAusenteError extends Error {
  constructor() {
    super('Certificado da NFS-e não configurado: faltam NFSE_CERT_PFX_BASE64 e/ou NFSE_CERT_SENHA.')
    this.name = 'CertificadoAusenteError'
  }
}

/** Abre o .pfx e separa chave e certificado do titular (o que tem a chave correspondente). */
export function abrirCertificado(pfx: Buffer, senha: string): CertificadoA1 {
  const asn1 = forge.asn1.fromDer(forge.util.createBuffer(pfx.toString('binary')))
  const p12 = forge.pkcs12.pkcs12FromAsn1(asn1, senha)

  const chaves = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[forge.pki.oids.pkcs8ShroudedKeyBag] ?? []
  const chave = chaves[0]?.key
  if (!chave) throw new Error('O arquivo do certificado não traz chave privada.')

  const certificados = (p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag] ?? [])
    .map((b) => b.cert)
    .filter((c): c is forge.pki.Certificate => Boolean(c))
  // O certificado do titular é o que tem a mesma chave pública da chave privada; os demais são a cadeia da AC.
  const modulo = (chave as forge.pki.rsa.PrivateKey).n.toString(16)
  const titular = certificados.find((c) => (c.publicKey as forge.pki.rsa.PublicKey).n.toString(16) === modulo)
  if (!titular) throw new Error('O arquivo do certificado não traz o certificado do titular.')

  const certificadoPem = forge.pki.certificateToPem(titular)
  return {
    chavePem: forge.pki.privateKeyToPem(chave),
    certificadoPem,
    cadeiaPem: [certificadoPem, ...certificados.filter((c) => c !== titular).map((c) => forge.pki.certificateToPem(c))].join(''),
    titular: String(titular.subject.getField('CN')?.value ?? ''),
    validoAte: titular.validity.notAfter,
  }
}

let emCache: CertificadoA1 | null = null

/** O certificado das variáveis de ambiente, aberto uma vez por processo. */
export function certificadoDoAmbiente(): CertificadoA1 {
  if (emCache) return emCache
  const b64 = process.env.NFSE_CERT_PFX_BASE64?.trim()
  const senha = process.env.NFSE_CERT_SENHA
  if (!b64 || !senha) throw new CertificadoAusenteError()
  emCache = abrirCertificado(Buffer.from(b64, 'base64'), senha)
  return emCache
}

export function certificadoConfigurado(): boolean {
  return Boolean(process.env.NFSE_CERT_PFX_BASE64?.trim() && process.env.NFSE_CERT_SENHA)
}
