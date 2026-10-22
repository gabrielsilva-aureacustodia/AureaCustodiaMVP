import 'server-only'

/**
 * Cliente HTTP da API CWS dos Correios, com o token renovado sozinho.
 *
 * O TOKEN VIVE 24 HORAS e a API Token aceita no máximo 3 pedidos por segundo. Por isso ele fica
 * em memória do processo e só é pedido de novo quando falta menos de 10 minutos para vencer — ou
 * quando os Correios respondem 401 a uma chamada, sinal de que o token foi invalidado antes da hora
 * (um código de acesso regerado no CWS derruba o anterior). Pedidos simultâneos de token esperam a
 * mesma promessa, em vez de cada um abrir o seu.
 *
 * Em serverless cada instância fria pede o seu token. É o comportamento esperado da API (o token
 * "é devolvido o mesmo" enquanto válido, diz a documentação) e não justifica guardar segredo em
 * banco.
 *
 * Erro dos Correios vira `ErroCorreios` com as mensagens deles (`msgs`), porque são elas que dizem
 * o que corrigir ("ERP-054: Serviço adicional 019 nao pode..."). Nada de cair num valor inventado
 * em silêncio: quem chama decide o que fazer com a falha.
 */

import { lerConfigCorreios, type ConfigCorreios } from './config'

export const BASE_CWS = 'https://api.correios.com.br'

/** Antecedência com que o token é renovado antes de vencer. */
const MARGEM_RENOVACAO_MS = 10 * 60 * 1000
const TIMEOUT_MS = 20_000

export class ErroCorreios extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly mensagens: string[] = [],
  ) {
    super(message)
    this.name = 'ErroCorreios'
  }
}

interface TokenEmCache {
  token: string
  expiraEm: number
}

let tokenEmCache: TokenEmCache | null = null
let tokenEmVoo: Promise<TokenEmCache> | null = null

/**
 * `expiraEm` vem sem fuso ("2026-10-23T12:32:01") e o `zoneOffset` ao lado ("-03:00"). Sem o
 * fuso, `new Date()` leria a hora como local do servidor — UTC na Vercel — e o token pareceria
 * valer três horas a mais do que vale.
 */
function instanteDeExpiracao(expiraEm: string | undefined, zoneOffset: string | undefined): number {
  if (!expiraEm) return Date.now() + 60 * 60 * 1000
  const temFuso = /[zZ]|[+-]\d{2}:?\d{2}$/.test(expiraEm)
  const iso = temFuso ? expiraEm : `${expiraEm}${zoneOffset && /^[+-]\d{2}:\d{2}$/.test(zoneOffset) ? zoneOffset : '-03:00'}`
  const t = Date.parse(iso)
  return Number.isFinite(t) ? t : Date.now() + 60 * 60 * 1000
}

async function lerMensagens(res: Response): Promise<string[]> {
  try {
    const corpo = (await res.json()) as { msgs?: unknown; mensagem?: unknown }
    if (Array.isArray(corpo.msgs)) return corpo.msgs.map(String)
    if (typeof corpo.mensagem === 'string') return [corpo.mensagem]
  } catch {
    /* corpo vazio ou não-JSON */
  }
  return []
}

async function pedirToken(cfg: ConfigCorreios): Promise<TokenEmCache> {
  const basic = Buffer.from(`${cfg.usuario}:${cfg.codigoAcesso}`).toString('base64')
  const res = await fetch(`${BASE_CWS}/token/v1/autentica/cartaopostagem`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ numero: cfg.cartaoPostagem, contrato: cfg.contrato, dr: cfg.dr }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: 'no-store',
  })
  if (!res.ok) {
    const msgs = await lerMensagens(res)
    throw new ErroCorreios(
      `Os Correios recusaram as credenciais do contrato (HTTP ${res.status})${msgs.length ? `: ${msgs.join(' ')}` : ''}.`,
      res.status,
      msgs,
    )
  }
  const corpo = (await res.json()) as { token?: string; expiraEm?: string; zoneOffset?: string }
  if (!corpo.token) throw new ErroCorreios('Os Correios não devolveram o token de acesso.', 502)
  return { token: corpo.token, expiraEm: instanteDeExpiracao(corpo.expiraEm, corpo.zoneOffset) }
}

async function obterToken(cfg: ConfigCorreios, forcarNovo = false): Promise<string> {
  if (!forcarNovo && tokenEmCache && tokenEmCache.expiraEm - Date.now() > MARGEM_RENOVACAO_MS) {
    return tokenEmCache.token
  }
  if (!tokenEmVoo) {
    tokenEmVoo = pedirToken(cfg)
      .then((t) => {
        tokenEmCache = t
        return t
      })
      .finally(() => {
        tokenEmVoo = null
      })
  }
  return (await tokenEmVoo).token
}

export interface OpcoesChamada {
  metodo?: 'GET' | 'POST' | 'DELETE' | 'PATCH'
  /** Parâmetros de query. Arrays viram a chave repetida (`?a=1&a=2`), como a API pede. */
  query?: Record<string, string | number | readonly string[] | undefined>
  corpo?: unknown
}

function montarUrl(caminho: string, query: OpcoesChamada['query']): string {
  const url = new URL(`${BASE_CWS}${caminho}`)
  for (const [chave, valor] of Object.entries(query ?? {})) {
    if (valor === undefined || valor === '') continue
    if (Array.isArray(valor)) for (const v of valor) url.searchParams.append(chave, v)
    else url.searchParams.set(chave, String(valor))
  }
  return url.toString()
}

/**
 * Chama um endpoint da CWS com o token do contrato e devolve o JSON.
 *
 * Lança `ErroCorreios` quando o contrato não está configurado (status 0), quando os Correios
 * respondem erro, ou quando a resposta não chega no tempo. Um 401 renova o token e tenta uma vez
 * de novo — mais que isso esconderia credencial errada atrás de repetição.
 */
export async function chamarCws<T>(caminho: string, opcoes: OpcoesChamada = {}): Promise<T> {
  const cfg = lerConfigCorreios()
  if (!cfg) throw new ErroCorreios('Contrato dos Correios não configurado neste ambiente.', 0)

  const url = montarUrl(caminho, opcoes.query)
  const executar = async (token: string): Promise<Response> =>
    fetch(url, {
      method: opcoes.metodo ?? 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        ...(opcoes.corpo !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: opcoes.corpo !== undefined ? JSON.stringify(opcoes.corpo) : undefined,
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: 'no-store',
    })

  let res = await executar(await obterToken(cfg))
  if (res.status === 401) res = await executar(await obterToken(cfg, true))

  if (!res.ok) {
    const msgs = await lerMensagens(res)
    throw new ErroCorreios(
      msgs.length ? msgs.join(' ') : `Os Correios responderam HTTP ${res.status}.`,
      res.status,
      msgs,
    )
  }
  const texto = await res.text()
  return (texto ? JSON.parse(texto) : null) as T
}

/** Limpa o token em memória (testes). */
export function _resetTokenParaTestes(): void {
  tokenEmCache = null
  tokenEmVoo = null
}
