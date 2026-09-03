/* ============================================================================
 * ATENÇÃO — MÓDULO EXCLUSIVO DE SERVIDOR.
 *
 * Lê a chave privada da conta de serviço do Google. Nunca importe de Client
 * Component: a chave assina tokens que escrevem na planilha da empresa.
 * ==========================================================================*/

import 'server-only'

import type { Relatorio } from './dados'
import { relatorioParaMatriz } from './exportar'
import { assinarJwtRs256 } from './jwt'

/**
 * Google Sheets — o "push": a plataforma ESCREVE os relatórios na planilha.
 *
 * DOIS CAMINHOS PARA A PLANILHA, E QUANDO USAR CADA UM
 * ----------------------------------------------------
 *  1. PULL — o Sheets lê a plataforma: `=IMPORTDATA("https://…/api/relatorios/dre.csv?token=…")`.
 *     Zero configuração no Google, atualiza sozinho de hora em hora. Serve
 *     para quem só quer olhar. O token fica visível na fórmula — por isso ele
 *     é só de leitura e rotacionável (AUREA_RELATORIOS_TOKEN).
 *  2. PUSH — este arquivo: uma conta de serviço do Google Cloud com acesso de
 *     editor à planilha, e a plataforma grava uma aba por relatório quando o
 *     administrador clica "Enviar ao Google Sheets" (ou quando um cron chamar
 *     POST /api/relatorios/sheets). Serve para o contador trabalhar em cima
 *     dos dados, com fórmulas próprias em outras abas que não são apagadas.
 *
 * SEM SDK. A API de planilhas é REST e a autenticação é um JWT RS256 trocado
 * por um access token — trinta linhas com `node:crypto` e `fetch`. Uma
 * dependência do `googleapis` traria dezenas de megabytes para uma função
 * serverless por três chamadas HTTP.
 *
 * VARIÁVEIS (ver .env.example e docs/INTEGRACAO_GOOGLE_SHEETS.md):
 *   GOOGLE_SHEETS_SPREADSHEET_ID       o id na URL da planilha
 *   GOOGLE_SERVICE_ACCOUNT_EMAIL       …@….iam.gserviceaccount.com
 *   GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY a chave PEM do JSON da conta de serviço
 *                                      (com os `\n` literais que o painel gera)
 */

const ESCOPO = 'https://www.googleapis.com/auth/spreadsheets'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const API = 'https://sheets.googleapis.com/v4/spreadsheets'

export interface ConfigSheets {
  spreadsheetId: string
  email: string
  chavePrivada: string
}

/** null quando falta qualquer uma das três variáveis — e a tela diz qual. */
export function configuracaoSheets(): { config: ConfigSheets | null; faltando: string[] } {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID?.trim() ?? ''
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim() ?? ''
  const chaveBruta = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ?? ''
  const faltando: string[] = []
  if (!spreadsheetId) faltando.push('GOOGLE_SHEETS_SPREADSHEET_ID')
  if (!email) faltando.push('GOOGLE_SERVICE_ACCOUNT_EMAIL')
  if (!chaveBruta) faltando.push('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY')
  if (faltando.length) return { config: null, faltando }
  // O painel da Vercel guarda a chave numa linha só, com `\n` literal.
  const chavePrivada = chaveBruta.replace(/\\n/g, '\n').replace(/^"|"$/g, '')
  return { config: { spreadsheetId, email, chavePrivada }, faltando: [] }
}

async function accessToken(config: ConfigSheets): Promise<string> {
  const jwt = assinarJwtRs256(
    { email: config.email, chavePrivada: config.chavePrivada },
    ESCOPO,
    TOKEN_URL,
    Math.floor(Date.now() / 1000),
  )
  const r = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }),
  })
  if (!r.ok) throw new Error(`Google OAuth recusou a conta de serviço (${r.status}): ${await r.text()}`)
  const corpo = (await r.json()) as { access_token?: string }
  if (!corpo.access_token) throw new Error('Google OAuth não devolveu access_token.')
  return corpo.access_token
}

async function google<T>(token: string, url: string, init: RequestInit = {}): Promise<T> {
  const r = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  })
  if (!r.ok) throw new Error(`Google Sheets ${init.method ?? 'GET'} ${r.status}: ${await r.text()}`)
  return (await r.json()) as T
}

/** Aba do Sheets: até 100 caracteres, sem os proibidos. Prefixo fixo para não colidir com abas do contador. */
export function nomeDaAba(nomeRelatorio: string): string {
  return ('aurea_' + nomeRelatorio).replace(/[\\/?*[\]:]/g, '-').slice(0, 100)
}

export interface ResultadoSheets {
  abas: Array<{ aba: string; linhas: number }>
  spreadsheetUrl: string
}

/**
 * Grava cada relatório numa aba própria (`aurea_<nome>`), criando as que não
 * existem e LIMPANDO só essas antes de escrever. Abas com outro nome — as do
 * contador — nunca são tocadas.
 *
 * Valores entram como RAW: número é número, texto é texto, e nada é
 * interpretado como fórmula. Um relatório que começasse uma célula com `=`
 * viraria fórmula em USER_ENTERED — e "Descricao" é texto livre.
 */
export async function enviarParaSheets(config: ConfigSheets, relatorios: readonly Relatorio[]): Promise<ResultadoSheets> {
  const token = await accessToken(config)
  const base = `${API}/${config.spreadsheetId}`

  const meta = await google<{ sheets?: Array<{ properties: { title: string } }> }>(
    token,
    `${base}?fields=sheets.properties.title`,
  )
  const existentes = new Set((meta.sheets ?? []).map((s) => s.properties.title))

  const faltam = relatorios.map((r) => nomeDaAba(r.nome)).filter((t) => !existentes.has(t))
  if (faltam.length) {
    await google(token, `${base}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({ requests: faltam.map((title) => ({ addSheet: { properties: { title } } })) }),
    })
  }

  const abas: ResultadoSheets['abas'] = []
  for (const r of relatorios) {
    const aba = nomeDaAba(r.nome)
    const intervalo = encodeURIComponent(`'${aba}'`)
    await google(token, `${base}/values/${intervalo}:clear`, { method: 'POST', body: '{}' })
    const cabecalhoMeta = [
      [r.titulo, r.periodo ?? '', `gerado em ${new Date(r.geradoEm).toISOString()}`],
      [r.observacoes.join(' | ')],
      [],
    ]
    const valores = [...cabecalhoMeta, ...relatorioParaMatriz(r)]
    await google(token, `${base}/values/${intervalo}?valueInputOption=RAW`, {
      method: 'PUT',
      body: JSON.stringify({ range: `'${aba}'`, majorDimension: 'ROWS', values: valores }),
    })
    abas.push({ aba, linhas: r.linhas.length })
  }

  return { abas, spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${config.spreadsheetId}` }
}
