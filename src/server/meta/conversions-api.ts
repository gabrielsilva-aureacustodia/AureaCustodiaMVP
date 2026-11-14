import 'server-only'

/**
 * API de Conversões da Meta — o canal do SERVIDOR para o mesmo evento que o Pixel manda pelo navegador.
 *
 * REGRAS QUE ESTE ARQUIVO GARANTE
 *  1. Rastreamento NUNCA derruba o produto. Sem `META_PIXEL_ID` ou sem `META_CAPI_ACCESS_TOKEN` a função não faz nada;
 *     com a Meta fora do ar ou lenta, o erro é engolido e registrado sem o segredo. Cadastro não falha por causa de anúncio.
 *  2. Não atrasa a resposta: o envio roda em `after()`, depois que o cadastro já respondeu ao cliente.
 *  3. Dado pessoal só sai em hash SHA-256 (e-mail, nome, país); IP, user agent, `fbp` e `fbc` seguem como a Meta pede
 *     (ver normalizacao.ts). Nenhum valor de dinheiro, saldo ou moeda do cliente é enviado.
 *  4. O segredo (`META_CAPI_ACCESS_TOKEN`) fica só na Vercel e no .env.local, vai no corpo da requisição e nunca em log.
 *
 * Contrato: POST https://graph.facebook.com/{versão}/{PIXEL_ID}/events com `data: [evento]`
 * (developers.facebook.com/docs/marketing-api/conversions-api/using-the-api). Para testar sem sujar a campanha, defina
 * `META_TEST_EVENT_CODE` com o código da aba "Testar eventos" do Gerenciador de Eventos e remova-o depois.
 */

import { after } from 'next/server'

import { lerPixelId, type ParametrosDoEvento } from '@/lib/meta/eventos'

import { hashEmail, hashNomes, hashPais } from './normalizacao'

/** Versão da Graph API da documentação vigente em 14/11/2026. Troque por `META_GRAPH_VERSION` sem mexer no código. */
const VERSAO_PADRAO_DA_GRAPH = 'v27.0'
const LIMITE_DE_ESPERA_MS = 4000

export interface DadosDoUsuario {
  email?: string
  nomeCompleto?: string
  ip?: string | null
  userAgent?: string | null
  /** Cookie `_fbp` do Pixel — não passa por hash. */
  fbp?: string | null
  /** Cookie `_fbc` (clique no anúncio) — não passa por hash. */
  fbc?: string | null
}

export interface EventoDoServidor {
  nome: string
  eventId: string
  /** Página onde o evento aconteceu; a Meta exige para evento de site e confere contra o domínio verificado. */
  urlDaOrigem: string
  usuario: DadosDoUsuario
  dadosCustom?: ParametrosDoEvento
}

export interface ContextoDaRequisicao {
  ip: string | null
  userAgent: string | null
  fbp: string | null
  fbc: string | null
  url: string
}

function valorDoCookie(cabecalho: string | null, nome: string): string | null {
  if (!cabecalho) return null
  for (const par of cabecalho.split(';')) {
    const [chave, ...resto] = par.trim().split('=')
    if (chave === nome) return decodeURIComponent(resto.join('=')) || null
  }
  return null
}

/** Extrai da requisição o que a Meta usa para casar o evento com a pessoa (IP, navegador, cookies do Pixel). */
export function contextoDaRequisicao(h: Headers, urlPadrao: string): ContextoDaRequisicao {
  const cookie = h.get('cookie')
  return {
    ip: h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || null,
    userAgent: h.get('user-agent'),
    fbp: valorDoCookie(cookie, '_fbp'),
    fbc: valorDoCookie(cookie, '_fbc'),
    url: h.get('referer') || urlPadrao,
  }
}

/** Monta o objeto `user_data` da Meta: hash onde se exige hash, texto puro onde se exige texto puro. */
export function montarUserData(u: DadosDoUsuario): Record<string, string | string[]> {
  const dados: Record<string, string | string[]> = { country: [hashPais('br')] }
  const em = u.email ? hashEmail(u.email) : undefined
  if (em) dados.em = [em]
  if (u.nomeCompleto) {
    const { fn, ln } = hashNomes(u.nomeCompleto)
    if (fn) dados.fn = [fn]
    if (ln) dados.ln = [ln]
  }
  if (u.ip) dados.client_ip_address = u.ip
  if (u.userAgent) dados.client_user_agent = u.userAgent
  if (u.fbp) dados.fbp = u.fbp
  if (u.fbc) dados.fbc = u.fbc
  return dados
}

export function montarCorpo(e: EventoDoServidor, codigoDeTeste?: string): Record<string, unknown> {
  const corpo: Record<string, unknown> = {
    data: [
      {
        event_name: e.nome,
        event_time: Math.floor(Date.now() / 1000),
        event_id: e.eventId,
        event_source_url: e.urlDaOrigem,
        action_source: 'website',
        user_data: montarUserData(e.usuario),
        ...(e.dadosCustom ? { custom_data: e.dadosCustom } : {}),
      },
    ],
  }
  if (codigoDeTeste) corpo.test_event_code = codigoDeTeste
  return corpo
}

async function enviar(e: EventoDoServidor): Promise<void> {
  const pixelId = lerPixelId(process.env.META_PIXEL_ID)
  const segredo = process.env.META_CAPI_ACCESS_TOKEN?.trim()
  if (!pixelId || !segredo) return

  const versao = process.env.META_GRAPH_VERSION?.trim() || VERSAO_PADRAO_DA_GRAPH
  const corpo = { ...montarCorpo(e, process.env.META_TEST_EVENT_CODE?.trim() || undefined), access_token: segredo }

  try {
    const resposta = await fetch(`https://graph.facebook.com/${versao}/${pixelId}/events`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(corpo),
      signal: AbortSignal.timeout(LIMITE_DE_ESPERA_MS),
    })
    if (!resposta.ok) {
      // O corpo de erro da Meta descreve o problema e não repete o segredo; mesmo assim só o status e o texto saem no log.
      const detalhe = (await resposta.text().catch(() => '')).slice(0, 300)
      console.warn(`[meta] API de Conversões recusou ${e.nome} (HTTP ${resposta.status}): ${detalhe}`)
    }
  } catch (erro) {
    console.warn(`[meta] API de Conversões indisponível para ${e.nome}:`, erro instanceof Error ? erro.name : 'erro')
  }
}

/**
 * Agenda o envio e devolve na hora. `after()` só existe dentro de uma requisição do Next; fora dela (testes, scripts) cai
 * para o envio direto sem esperar.
 */
export function enviarEventoDoServidor(e: EventoDoServidor): void {
  try {
    after(() => enviar(e))
  } catch {
    void enviar(e)
  }
}
