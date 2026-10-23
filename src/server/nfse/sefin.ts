/**
 * Cliente da Sefin Nacional — a API oficial e gratuita de emissão da NFS-e (gov.br/nfse).
 *
 * Contrato (Manual dos Contribuintes – APIs do Emissor Público Nacional v1.2 e Swagger oficial):
 *  - POST /nfse   { dpsXmlGZipB64 }  → 201 com `chaveAcesso` e `nfseXmlGZipB64` (síncrono);
 *                                      400 com `erros[]` (rejeição de regra, ex.: E0187);
 *  - HEAD /dps/{id}                  → 200 se a DPS já gerou nota (para não emitir duas após timeout);
 *  - GET  /dps/{id}                  → a chave de acesso da nota que a DPS gerou;
 *  - GET  /nfse/{chave}              → a nota.
 *
 * Autenticação: TLS mútuo com o e-CNPJ A1 (o mesmo que assina), por chave e cadeia em PEM — o .pfx
 * cru é recusado pelo OpenSSL 3 (ver certificado.ts). Sem usuário e senha — a API não aceita outro
 * meio. `node:https` e não `fetch`: o `fetch` do Node não recebe certificado de
 * cliente sem o undici como dependência direta, e a Sefin recusa HTTP/2 nos caminhos autenticados
 * (relato da open-nfse) — o `https` do Node fala HTTP/1.1.
 *
 * Ambientes: `NFSE_AMBIENTE=producao` emite nota fiscal de verdade (`tpAmb` 1). Qualquer outro valor,
 * ou nenhum, usa a produção restrita (`tpAmb` 2), cujas notas saem "sem validade jurídica".
 */

import { request } from 'node:https'
import { gunzipSync, gzipSync } from 'node:zlib'

import type { CertificadoA1 } from './certificado'

export type AmbienteNfse = 'producao' | 'restrita'

const BASE: Record<AmbienteNfse, string> = {
  producao: 'https://sefin.nfse.gov.br/SefinNacional',
  restrita: 'https://sefin.producaorestrita.nfse.gov.br/SefinNacional',
}

export function ambienteConfigurado(): AmbienteNfse {
  return process.env.NFSE_AMBIENTE?.trim().toLowerCase() === 'producao' ? 'producao' : 'restrita'
}

export function tpAmbDo(ambiente: AmbienteNfse): 1 | 2 {
  return ambiente === 'producao' ? 1 : 2
}

export interface MensagemSefin {
  codigo: string
  descricao: string
  complemento?: string
}

export type ResultadoEmissao =
  | { ok: true; chaveAcesso: string; numeroNfse: string | null; xmlNfse: string; alertas: MensagemSefin[] }
  | { ok: false; status: number; erros: MensagemSefin[] }

/** Falha de rede ou 5xx: a nota pode ou não ter sido gerada — conferir antes de reenviar. */
export class FalhaTransitoriaSefin extends Error {
  constructor(mensagem: string) {
    super(mensagem)
    this.name = 'FalhaTransitoriaSefin'
  }
}

interface Resposta {
  status: number
  corpo: string
}

const TEMPO_LIMITE_MS = 30_000
export const DECLARACAO_XML = '<?xml version="1.0" encoding="UTF-8"?>'

function chamar(cert: CertificadoA1, ambiente: AmbienteNfse, metodo: string, caminho: string, corpo?: unknown): Promise<Resposta> {
  const url = new URL(BASE[ambiente] + caminho)
  const dados = corpo === undefined ? undefined : Buffer.from(JSON.stringify(corpo), 'utf8')
  return new Promise((resolve, reject) => {
    const req = request(
      url,
      {
        method: metodo,
        key: cert.chavePem,
        cert: cert.cadeiaPem,
        headers: {
          Accept: 'application/json',
          ...(dados ? { 'Content-Type': 'application/json', 'Content-Length': String(dados.length) } : {}),
        },
        timeout: TEMPO_LIMITE_MS,
      },
      (res) => {
        const partes: Buffer[] = []
        res.on('data', (c: Buffer) => partes.push(c))
        res.on('end', () => resolve({ status: res.statusCode ?? 0, corpo: Buffer.concat(partes).toString('utf8') }))
      },
    )
    req.on('timeout', () => req.destroy(new FalhaTransitoriaSefin(`Sefin não respondeu em ${TEMPO_LIMITE_MS / 1000}s (${metodo} ${caminho}).`)))
    req.on('error', (e) => reject(e instanceof FalhaTransitoriaSefin ? e : new FalhaTransitoriaSefin(`Falha de rede com a Sefin: ${e.message}`)))
    if (dados) req.write(dados)
    req.end()
  })
}

function json(corpo: string): Record<string, unknown> {
  try {
    return JSON.parse(corpo) as Record<string, unknown>
  } catch {
    return {}
  }
}

/** A Sefin às vezes devolve `erro` (objeto) e às vezes `erros` (lista): aceitar os dois. */
function mensagens(valor: unknown): MensagemSefin[] {
  const lista = Array.isArray(valor) ? valor : valor ? [valor] : []
  return lista.map((m) => {
    const r = (m ?? {}) as Record<string, unknown>
    return {
      codigo: String(r.codigo ?? r.Codigo ?? ''),
      descricao: String(r.descricao ?? r.Descricao ?? ''),
      ...(r.complemento || r.Complemento ? { complemento: String(r.complemento ?? r.Complemento) } : {}),
    }
  })
}

export function gzipBase64(texto: string): string {
  return gzipSync(Buffer.from(texto, 'utf8')).toString('base64')
}

export function deGzipBase64(b64: string): string {
  return gunzipSync(Buffer.from(b64, 'base64')).toString('utf8')
}

export function numeroDaNfse(xmlNfse: string): string | null {
  return /<nNFSe>(\d+)<\/nNFSe>/.exec(xmlNfse)?.[1] ?? null
}

/** Envia a DPS assinada. Rejeição de regra volta como `{ ok: false }`; rede e 5xx lançam `FalhaTransitoriaSefin`. */
export async function enviarDps(cert: CertificadoA1, ambiente: AmbienteNfse, dpsAssinada: string): Promise<ResultadoEmissao> {
  // Sem a declaração, a Sefin recusa com E1229 ("Xml não está utilizando codificação UTF-8"). Ela fica
  // fora da assinatura, que cobre só o `infDPS` — por isso entra aqui, no envio.
  const documento = dpsAssinada.startsWith('<?xml') ? dpsAssinada : `${DECLARACAO_XML}${dpsAssinada}`
  const r = await chamar(cert, ambiente, 'POST', '/nfse', { dpsXmlGZipB64: gzipBase64(documento) })
  if (r.status >= 500) throw new FalhaTransitoriaSefin(`Sefin respondeu ${r.status}: ${r.corpo.slice(0, 300)}`)
  const corpo = json(r.corpo)
  if (r.status === 200 || r.status === 201) {
    const xmlNfse = typeof corpo.nfseXmlGZipB64 === 'string' ? deGzipBase64(corpo.nfseXmlGZipB64) : ''
    return {
      ok: true,
      chaveAcesso: String(corpo.chaveAcesso ?? ''),
      numeroNfse: numeroDaNfse(xmlNfse),
      xmlNfse,
      alertas: mensagens(corpo.alertas),
    }
  }
  const erros = mensagens(corpo.erros ?? corpo.erro)
  return {
    ok: false,
    status: r.status,
    erros: erros.length ? erros : [{ codigo: `HTTP ${r.status}`, descricao: r.corpo.slice(0, 500) || 'Resposta sem corpo.' }],
  }
}

/** A chave da nota que esta DPS já gerou, ou `null` se não gerou nenhuma. */
export async function chaveDaDpsJaEmitida(cert: CertificadoA1, ambiente: AmbienteNfse, idDps: string): Promise<string | null> {
  const r = await chamar(cert, ambiente, 'GET', `/dps/${idDps}`)
  if (r.status === 404) return null
  if (r.status >= 500) throw new FalhaTransitoriaSefin(`Sefin respondeu ${r.status} na consulta da DPS.`)
  if (r.status !== 200) return null
  const chave = json(r.corpo).chaveAcesso
  return typeof chave === 'string' && chave ? chave : null
}

/** O XML de uma nota pela chave de acesso. */
export async function consultarNfse(cert: CertificadoA1, ambiente: AmbienteNfse, chave: string): Promise<string | null> {
  const r = await chamar(cert, ambiente, 'GET', `/nfse/${chave}`)
  if (r.status !== 200) return null
  const b64 = json(r.corpo).nfseXmlGZipB64
  return typeof b64 === 'string' ? deGzipBase64(b64) : null
}
