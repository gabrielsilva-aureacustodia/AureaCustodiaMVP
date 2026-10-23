/**
 * Assinatura XMLDSig da DPS (e dos pedidos de evento, como o cancelamento).
 *
 * Padrão do Sistema Nacional NFS-e (Manual Integrado §6.1.4): assinatura "enveloped" sobre o
 * elemento que tem o atributo `Id` (`infDPS`), com `Reference URI="#<Id>"`, só o certificado do
 * titular no `KeyInfo` e o `<Signature>` como último filho da raiz (`DPS`).
 *
 * Algoritmos: RSA-SHA256, canonicalização exclusiva (exc-c14n) e digest SHA-256 — o que a produção
 * restrita aceita (biblioteca de referência open-nfse). O Manual Integrado de 2022 ainda fala em
 * SHA-1; se a Sefin um dia recusar, é aqui que se troca.
 */

import { SignedXml } from 'xml-crypto'

import type { CertificadoA1 } from './certificado'

const RSA_SHA256 = 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256'
const EXC_C14N = 'http://www.w3.org/2001/10/xml-exc-c14n#'
const SHA256 = 'http://www.w3.org/2001/04/xmlenc#sha256'
const ENVELOPED = 'http://www.w3.org/2000/09/xmldsig#enveloped-signature'

/**
 * Assina `elementoAssinado` (o que tem `Id`) e põe a assinatura no fim de `raiz`.
 * Ex.: `assinarXml(dps, cert, 'DPS', 'infDPS')`, `assinarXml(evento, cert, 'pedRegEvento', 'infPedReg')`.
 */
export function assinarXml(xml: string, cert: CertificadoA1, raiz: string, elementoAssinado: string): string {
  const id = new RegExp(`<${elementoAssinado}\\b[^>]*\\bId="([^"]+)"`).exec(xml)?.[1]
  if (!id) throw new Error(`<${elementoAssinado}> sem atributo Id: não há o que referenciar na assinatura.`)

  const sig = new SignedXml({
    privateKey: cert.chavePem,
    publicCert: cert.certificadoPem,
    signatureAlgorithm: RSA_SHA256,
    canonicalizationAlgorithm: EXC_C14N,
  })
  sig.addReference({
    xpath: `//*[local-name(.)='${elementoAssinado}']`,
    transforms: [ENVELOPED, EXC_C14N],
    digestAlgorithm: SHA256,
    uri: `#${id}`,
  })
  sig.computeSignature(xml, { location: { reference: `//*[local-name(.)='${raiz}']`, action: 'append' } })
  return sig.getSignedXml()
}
