/**
 * O registro de uso da plataforma — a regra pura (plano do Admin, seções 1.5 e 1.6).
 *
 * DUAS METADES:
 *
 *  1. O que ENTRA. O navegador manda um lote de eventos (página aberta, clique em
 *     elemento marcado com `data-uso`). Tudo que vem do navegador é suspeito: aqui o
 *     lote é limpo antes de chegar ao banco — tipo conhecido, rota normalizada sem
 *     identificador nem e-mail, texto curto, relógio do cliente só quando plausível.
 *     Nada de IP e nada de user agent completo: o servidor passa o user agent por
 *     `plataformaResumida` e o descarta.
 *
 *  2. O que SAI. A tela de Uso lê os eventos e a trilha de auditoria juntos e mostra
 *     páginas mais abertas, horário de pico, ações por conta e a jornada até a
 *     primeira venda. Os agregados são calculados aqui, puros, para poderem ser
 *     testados sem banco.
 *
 * O registro de uso NUNCA interrompe navegação: quem chama descarta o que não passa,
 * em silêncio, e segue.
 */

import type { Timestamp } from '@/domain/types'

/* ---------- 1. o que entra ---------- */

export type TipoEvento = 'pagina' | 'acao'

export const TIPOS_EVENTO: readonly TipoEvento[] = ['pagina', 'acao']

/** Eventos por lote. O navegador manda a cada 5 s; mais que isto é defeito ou abuso. */
export const LOTE_MAX = 50
const ROTA_MAX = 200
const ALVO_MAX = 120
const DETALHES_MAX_CHAVES = 10
/** Relógio do cliente vale se estiver até 10 min atrás ou 1 min à frente do servidor. */
const TOLERANCIA_PASSADO_MS = 10 * 60 * 1000
const TOLERANCIA_FUTURO_MS = 60 * 1000

export interface EventoValidado {
  tipo: TipoEvento
  rota: string
  alvo: string | null
  detalhes: Record<string, string | number | boolean>
  createdAt: Timestamp
}

export interface LoteValidado {
  /** Identificador aleatório da aba; `null` quando não veio ou veio malformado. */
  sessao: string | null
  eventos: EventoValidado[]
}

/**
 * Segmento de caminho que identifica uma coisa específica em vez de uma tela: código
 * de moeda, recibo, envio, retirada, fatura ou lote; número; UUID; e-mail; e qualquer
 * sequência longa com cara de chave. Vira `[id]`.
 *
 * É o que impede `/admin/usuarios/fulano@exemplo.com.br` de gravar o e-mail de um
 * cliente na tabela de uso — e o que faz `/recibos/RO-000001` e `/recibos/RO-000002`
 * contarem como a mesma tela.
 */
function segmentoEhIdentificador(seg: string): boolean {
  if (seg.includes('@')) return true
  if (/^\d+$/.test(seg)) return true
  if (/^(RO|REC|RET|FAT|PLC|LOT|ENV|ANL|TRADE|DEP)-[A-Za-z0-9_-]+$/i.test(seg)) return true
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(seg)) return true
  if (/^[A-Za-z0-9_-]{24,}$/.test(seg) && /\d/.test(seg)) return true
  return false
}

/** Caminho da tela, sem query string, sem âncora, com identificadores trocados por `[id]`. */
export function normalizarRota(rota: unknown): string | null {
  if (typeof rota !== 'string') return null
  const semQuery = rota.split(/[?#]/)[0]
  if (!semQuery.startsWith('/') || semQuery.startsWith('//')) return null
  const segmentos = semQuery
    .split('/')
    .filter((s) => s.length > 0)
    .map((s) => {
      let decodificado = s
      try {
        decodificado = decodeURIComponent(s)
      } catch {
        // Segmento com % solto: fica como veio e passa pelo mesmo filtro.
      }
      return segmentoEhIdentificador(decodificado) ? '[id]' : decodificado
    })
  const normalizada = `/${segmentos.join('/')}`
  if (normalizada.length > ROTA_MAX || /[\s<>"'`]/.test(normalizada)) return null
  return normalizada
}

function textoCurto(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim().slice(0, max)
  // Texto com arroba não entra: alvo é um identificador de elemento escrito no código,
  // nunca o conteúdo que a pessoa digitou.
  if (!t || t.includes('@')) return null
  return t
}

function detalhesLimpos(v: unknown): Record<string, string | number | boolean> {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return {}
  const saida: Record<string, string | number | boolean> = {}
  for (const [k, valor] of Object.entries(v as Record<string, unknown>)) {
    if (Object.keys(saida).length >= DETALHES_MAX_CHAVES) break
    if (!/^[a-zA-Z_][a-zA-Z0-9_]{0,39}$/.test(k)) continue
    if (typeof valor === 'boolean') saida[k] = valor
    else if (typeof valor === 'number' && Number.isFinite(valor)) saida[k] = valor
    else {
      const t = textoCurto(valor, ALVO_MAX)
      if (t) saida[k] = t
    }
  }
  return saida
}

/**
 * Limpa o corpo do `POST /api/eventos`. Devolve `null` quando o corpo nem tem a forma
 * de um lote (a rota responde 400); evento individual inválido é só descartado.
 */
export function validarLoteDeEventos(corpo: unknown, agora: Timestamp): LoteValidado | null {
  if (!corpo || typeof corpo !== 'object' || Array.isArray(corpo)) return null
  const { sessao, eventos } = corpo as { sessao?: unknown; eventos?: unknown }
  if (!Array.isArray(eventos)) return null

  const validados: EventoValidado[] = []
  for (const bruto of eventos.slice(0, LOTE_MAX)) {
    if (!bruto || typeof bruto !== 'object') continue
    const e = bruto as Record<string, unknown>
    if (typeof e.tipo !== 'string' || !(TIPOS_EVENTO as readonly string[]).includes(e.tipo)) continue
    const rota = normalizarRota(e.rota)
    if (!rota) continue
    const em = typeof e.em === 'number' && Number.isFinite(e.em) ? Math.floor(e.em) : null
    const plausivel = em !== null && em >= agora - TOLERANCIA_PASSADO_MS && em <= agora + TOLERANCIA_FUTURO_MS
    validados.push({
      tipo: e.tipo as TipoEvento,
      rota,
      alvo: textoCurto(e.alvo, ALVO_MAX),
      detalhes: detalhesLimpos(e.detalhes),
      createdAt: plausivel ? (em as number) : agora,
    })
  }

  return {
    sessao: typeof sessao === 'string' && /^[a-z0-9-]{8,64}$/.test(sessao) ? sessao : null,
    eventos: validados,
  }
}

/**
 * O sistema operacional, e só ele. O user agent inteiro identifica o aparelho com
 * muito mais precisão do que o painel precisa, e por isso nunca é gravado.
 * A ordem importa: todo Android diz "Linux", e todo iPhone diz "Mac OS X".
 */
export function plataformaResumida(userAgent: string | null | undefined): string {
  const ua = userAgent ?? ''
  if (/android/i.test(ua)) return 'android'
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios'
  if (/windows/i.test(ua)) return 'windows'
  if (/cros/i.test(ua)) return 'chromeos'
  if (/macintosh|mac os x/i.test(ua)) return 'macos'
  if (/linux/i.test(ua)) return 'linux'
  return 'outra'
}

/* ---------- 2. o que sai ---------- */

export interface EventoDeUso {
  createdAt: Timestamp
  userEmail: string | null
  sessao: string | null
  tipo: TipoEvento
  rota: string | null
  alvo: string | null
  plataforma: string | null
}

/** Uma linha da trilha de auditoria, só com o que o resumo de uso precisa. */
export interface AcaoDaTrilha {
  createdAt: Timestamp
  ator: string
  acao: string
}

export interface EntradaResumoUso {
  eventos: readonly EventoDeUso[]
  trilha: readonly AcaoDaTrilha[]
  /** E-mail → momento da primeira venda da conta (de todo o histórico de negociações). */
  primeirasVendas: Readonly<Record<string, Timestamp>>
  /** Fuso para o horário de pico. Padrão: horário de Brasília. */
  fusoHorario?: string
}

export interface JornadaAtePrimeiraVenda {
  email: string
  primeiraVendaEm: Timestamp
  primeiroEventoEm: Timestamp
  paginasAntes: number
  minutos: number
}

export interface ResumoUso {
  totalEventos: number
  paginasVistas: number
  acoesNaTela: number
  sessoes: number
  contas: number
  paginasMaisAbertas: Array<{ rota: string; vezes: number; contas: number }>
  /** 24 posições, da 0h às 23h, eventos de tela e ações de pessoas na trilha. */
  porHora: number[]
  plataformas: Array<{ plataforma: string; eventos: number }>
  acoesPorConta: Array<{ email: string; paginas: number; acoesNaTela: number; acoesNoServidor: number; ultimaAtividade: Timestamp }>
  acoesMaisFrequentes: Array<{ acao: string; vezes: number }>
  jornadas: {
    contasComVenda: number
    contasComJornada: number
    medianaMinutos: number | null
    mediaPaginasAntes: number | null
    paginasAntesDaVenda: Array<{ rota: string; contas: number }>
    detalhes: JornadaAtePrimeiraVenda[]
  }
}

/** Ator de pessoa (e-mail), e não 'sistema', 'cron:…' ou 'webhook:…'. */
function ehPessoa(ator: string): boolean {
  return ator.includes('@')
}

export function mediana(valores: readonly number[]): number | null {
  if (!valores.length) return null
  const v = [...valores].sort((a, b) => a - b)
  const meio = Math.floor(v.length / 2)
  return v.length % 2 ? v[meio] : Math.round((v[meio - 1] + v[meio]) / 2)
}

function horaNoFuso(formatador: Intl.DateTimeFormat, ts: Timestamp): number {
  const parte = formatador.formatToParts(new Date(ts)).find((p) => p.type === 'hour')
  const h = parte ? Number(parte.value) : 0
  return h === 24 ? 0 : h
}

export function resumirUso({ eventos, trilha, primeirasVendas, fusoHorario = 'America/Sao_Paulo' }: EntradaResumoUso): ResumoUso {
  const formatador = new Intl.DateTimeFormat('pt-BR', { timeZone: fusoHorario, hour: '2-digit', hourCycle: 'h23' })
  const porHora = Array.from({ length: 24 }, () => 0)

  const sessoes = new Set<string>()
  const contas = new Set<string>()
  const rotas = new Map<string, { vezes: number; contas: Set<string> }>()
  const plataformas = new Map<string, number>()
  const porConta = new Map<string, { paginas: number; acoesNaTela: number; acoesNoServidor: number; ultimaAtividade: Timestamp }>()
  let paginasVistas = 0
  let acoesNaTela = 0

  const conta = (email: string): { paginas: number; acoesNaTela: number; acoesNoServidor: number; ultimaAtividade: Timestamp } => {
    let c = porConta.get(email)
    if (!c) {
      c = { paginas: 0, acoesNaTela: 0, acoesNoServidor: 0, ultimaAtividade: 0 }
      porConta.set(email, c)
    }
    return c
  }

  for (const e of eventos) {
    porHora[horaNoFuso(formatador, e.createdAt)] += 1
    if (e.sessao) sessoes.add(e.sessao)
    if (e.plataforma) plataformas.set(e.plataforma, (plataformas.get(e.plataforma) ?? 0) + 1)
    if (e.userEmail) {
      contas.add(e.userEmail)
      const c = conta(e.userEmail)
      c.ultimaAtividade = Math.max(c.ultimaAtividade, e.createdAt)
      if (e.tipo === 'pagina') c.paginas += 1
      else c.acoesNaTela += 1
    }
    if (e.tipo === 'pagina') {
      paginasVistas += 1
      if (e.rota) {
        const r = rotas.get(e.rota) ?? { vezes: 0, contas: new Set<string>() }
        r.vezes += 1
        if (e.userEmail) r.contas.add(e.userEmail)
        rotas.set(e.rota, r)
      }
    } else {
      acoesNaTela += 1
    }
  }

  const acoes = new Map<string, number>()
  for (const t of trilha) {
    if (!ehPessoa(t.ator)) continue
    porHora[horaNoFuso(formatador, t.createdAt)] += 1
    acoes.set(t.acao, (acoes.get(t.acao) ?? 0) + 1)
    const c = conta(t.ator)
    c.acoesNoServidor += 1
    c.ultimaAtividade = Math.max(c.ultimaAtividade, t.createdAt)
  }

  /* jornada até a primeira venda: só contas com evento de tela ANTES da venda */
  const eventosPorConta = new Map<string, EventoDeUso[]>()
  for (const e of eventos) {
    if (!e.userEmail) continue
    const lista = eventosPorConta.get(e.userEmail) ?? []
    lista.push(e)
    eventosPorConta.set(e.userEmail, lista)
  }
  const detalhes: JornadaAtePrimeiraVenda[] = []
  const rotasAntes = new Map<string, number>()
  for (const [email, vendaEm] of Object.entries(primeirasVendas)) {
    const antes = (eventosPorConta.get(email) ?? []).filter((e) => e.createdAt < vendaEm).sort((a, b) => a.createdAt - b.createdAt)
    if (!antes.length) continue
    const paginas = antes.filter((e) => e.tipo === 'pagina')
    detalhes.push({
      email,
      primeiraVendaEm: vendaEm,
      primeiroEventoEm: antes[0].createdAt,
      paginasAntes: paginas.length,
      minutos: Math.round((vendaEm - antes[0].createdAt) / 60000),
    })
    for (const rota of new Set(paginas.map((p) => p.rota).filter((r): r is string => Boolean(r)))) {
      rotasAntes.set(rota, (rotasAntes.get(rota) ?? 0) + 1)
    }
  }
  detalhes.sort((a, b) => a.primeiraVendaEm - b.primeiraVendaEm)

  return {
    totalEventos: eventos.length,
    paginasVistas,
    acoesNaTela,
    sessoes: sessoes.size,
    contas: contas.size,
    paginasMaisAbertas: [...rotas.entries()]
      .map(([rota, r]) => ({ rota, vezes: r.vezes, contas: r.contas.size }))
      .sort((a, b) => b.vezes - a.vezes || a.rota.localeCompare(b.rota))
      .slice(0, 15),
    porHora,
    plataformas: [...plataformas.entries()].map(([plataforma, n]) => ({ plataforma, eventos: n })).sort((a, b) => b.eventos - a.eventos),
    acoesPorConta: [...porConta.entries()]
      .map(([email, c]) => ({ email, ...c }))
      .sort((a, b) => b.paginas + b.acoesNaTela + b.acoesNoServidor - (a.paginas + a.acoesNaTela + a.acoesNoServidor) || a.email.localeCompare(b.email)),
    acoesMaisFrequentes: [...acoes.entries()].map(([acao, vezes]) => ({ acao, vezes })).sort((a, b) => b.vezes - a.vezes || a.acao.localeCompare(b.acao)).slice(0, 15),
    jornadas: {
      contasComVenda: Object.keys(primeirasVendas).length,
      contasComJornada: detalhes.length,
      medianaMinutos: mediana(detalhes.map((d) => d.minutos)),
      mediaPaginasAntes: detalhes.length ? Math.round((detalhes.reduce((s, d) => s + d.paginasAntes, 0) / detalhes.length) * 10) / 10 : null,
      paginasAntesDaVenda: [...rotasAntes.entries()].map(([rota, n]) => ({ rota, contas: n })).sort((a, b) => b.contas - a.contas || a.rota.localeCompare(b.rota)).slice(0, 8),
      detalhes,
    },
  }
}

/** E-mail → primeira venda, a partir das negociações (vendedor e data). */
export function primeirasVendasDe(negociacoes: ReadonlyArray<{ seller: string; date: Timestamp }>): Record<string, Timestamp> {
  const saida: Record<string, Timestamp> = {}
  for (const n of negociacoes) {
    if (saida[n.seller] === undefined || n.date < saida[n.seller]) saida[n.seller] = n.date
  }
  return saida
}
