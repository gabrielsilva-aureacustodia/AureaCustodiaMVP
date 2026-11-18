/**
 * Da diferença entre dois estados aos e-mails a enviar — função PURA, sem I/O.
 *
 * É a peça que decide "o que aconteceu nesta mutação que o cliente precisa saber". Roda dentro de
 * `mutarEstado` (src/server/db/estado.ts), com o `antes` travado e o `depois` já mutado, no mesmo ponto em que o
 * ledger e os pedidos de NFS-e nascem — e pelo mesmo motivo: o que não aconteceu (mutação desfeita) não vira
 * aviso, e o que aconteceu não depende de alguém lembrar de pedir o e-mail dentro de cada Server Action.
 *
 * LÊ `antes`/`depois`, NÃO a lista de operações do diff: as operações só dizem que algo mudou, e aqui precisamos
 * do valor de antes (a etapa do envio, o status da fatura, a chave Pix). Quem chama usa `ops.length > 0` e
 * `!semeadura` como porteiro, igual ao NFS-e.
 *
 * TRÊS FATOS DO MODELO QUE ESTE ARQUIVO RESPEITA
 * ----------------------------------------------
 *  1. `Trade` e `Deposit` NÃO têm id. A chave do evento vem da posição na lista (`antes.trades.length + i`),
 *     estável porque a lista é append-only — `caudaNova` (db/diff.ts) lança se ela encolher.
 *  2. O casamento é "uma unidade por volta": comprar 5 moedas são 5 `Trade`. Mandar 5 e-mails seria ruído, então
 *     os trades da MESMA mutação se agrupam por comprador (um aviso de compra) e por vendedor (um de venda).
 *  3. Retirada e saque NÃO saem daqui. A retirada vive em `aurea.retiradas` e nunca está no estado carregado
 *     (por isso `avisarRetiradaPostada` é chamada pelo código que a move); os três e-mails de saque seguem em
 *     `src/server/saques/avisos.ts`.
 *
 * A preferência do cliente é decidida AQUI (`deveEnviar`): evento que o cliente desligou nem entra na fila.
 */

import type { AppState, Envio, FaturaCustodia, Trade } from '@/domain/types'
import { ETAPAS_ENVIO } from '@/domain/types'
import { normalizarTrade } from '@/server/db/diff'

import { deveEnviar } from './catalogo'
import { mascararChavePix } from './mascara'
import type { DadosPorTipo, EventoDeEmail, TipoDeEmail } from './tipos'

function primeiroNome(estado: AppState, email: string): string | null {
  const nome = estado.users[email]?.name?.trim().split(/\s+/)[0]
  return nome || null
}

/** Tipos diferentes numa mesma compra são raros, mas possíveis: juntamos sem repetir. */
function tiposJuntos(tipos: readonly string[]): string {
  return [...new Set(tipos)].join(' e ')
}

function emFatura(f: FaturaCustodia, antes: Map<string, FaturaCustodia>): 'nova' | 'passou_a_paga' | 'sem_mudanca' {
  const a = antes.get(f.id)
  if (!a) return 'nova'
  return a.status !== 'paga' && f.status === 'paga' ? 'passou_a_paga' : 'sem_mudanca'
}

/** Compra e venda: um aviso por comprador e um por vendedor, por mutação. */
function eventosDeNegociacao(antes: AppState, depois: AppState, quando: number): EventoDeEmail[] {
  const base = antes.trades.length
  const novos = depois.trades.slice(base)
  if (novos.length === 0) return []

  // O primeiro mês de custódia que a compra embute vira uma fatura paga `origem: 'compra'` na MESMA mutação.
  const faturasAntes = new Map((antes.faturasCustodia ?? []).map((f) => [f.id, f]))
  const custodiaDaCompra = new Map<string, number>()
  for (const f of depois.faturasCustodia ?? []) {
    if (f.origem !== 'compra' || f.status !== 'paga' || faturasAntes.has(f.id)) continue
    custodiaDaCompra.set(f.userEmail, (custodiaDaCompra.get(f.userEmail) ?? 0) + f.valorCents)
  }

  interface Grupo {
    indice: number
    trades: ReturnType<typeof normalizarTrade>[]
  }
  const porComprador = new Map<string, Grupo>()
  const porVendedor = new Map<string, Grupo>()
  novos.forEach((t: Trade, i) => {
    const reg = normalizarTrade(t)
    for (const [mapa, quem] of [
      [porComprador, reg.buyer],
      [porVendedor, reg.seller],
    ] as const) {
      const g = mapa.get(quem) ?? { indice: base + i, trades: [] }
      g.trades.push(reg)
      mapa.set(quem, g)
    }
  })

  const eventos: EventoDeEmail[] = []
  const unidades = (g: Grupo) => g.trades.reduce((s, t) => s + (t.qty || 1), 0)
  const soma = (g: Grupo, campo: (t: Grupo['trades'][number]) => number) => g.trades.reduce((s, t) => s + campo(t), 0)

  for (const [email, g] of porComprador) {
    const valor = soma(g, (t) => t.price * (t.qty || 1))
    const comissao = soma(g, (t) => t.feeComprador)
    const custodia = custodiaDaCompra.get(email) ?? 0
    eventos.push({
      chave: `compra:${email}:${g.indice}`,
      tipo: 'compra',
      para: email,
      dados: {
        nome: primeiroNome(depois, email),
        quantidade: unidades(g),
        tipoMoeda: tiposJuntos(g.trades.map((t) => t.tipoMoeda)),
        valorMoedasCents: valor,
        comissaoCents: comissao,
        custodiaCents: custodia,
        totalCents: valor + comissao + custodia,
        data: quando,
      },
    })
  }
  for (const [email, g] of porVendedor) {
    const valor = soma(g, (t) => t.price * (t.qty || 1))
    const comissao = soma(g, (t) => t.feeVendedor)
    eventos.push({
      chave: `venda:${email}:${g.indice}`,
      tipo: 'venda',
      para: email,
      dados: {
        nome: primeiroNome(depois, email),
        quantidade: unidades(g),
        tipoMoeda: tiposJuntos(g.trades.map((t) => t.tipoMoeda)),
        valorCents: valor,
        comissaoCents: comissao,
        liquidoCents: valor - comissao,
        data: quando,
      },
    })
  }
  return eventos
}

/** Só o depósito em conta. As outras entradas (`origem` de pagamento de custódia, compra…) já têm o aviso do que pagaram. */
function eventosDeDeposito(antes: AppState, depois: AppState, quando: number): EventoDeEmail[] {
  const base = antes.deposits.length
  const eventos: EventoDeEmail[] = []
  depois.deposits.slice(base).forEach((d, i) => {
    if (d.origem !== 'deposito' || d.valor <= 0) return
    eventos.push({
      chave: `deposito:${base + i}`,
      tipo: 'deposito',
      para: d.userEmail,
      dados: { nome: primeiroNome(depois, d.userEmail), valorCents: d.valor, metodo: d.metodo ?? null, data: d.date || quando },
    })
  })
  return eventos
}

/** Envio postado e envio recebido: a etapa mudou. Cadastro sem envio e envio desconsiderado não têm postagem a avisar. */
function eventosDeEnvio(antes: AppState, depois: AppState): EventoDeEmail[] {
  const eventos: EventoDeEmail[] = []
  const enviosAntes = new Map(antes.envios.map((e) => [e.protocolo, e]))
  for (const e of depois.envios) {
    const a = enviosAntes.get(e.protocolo)
    if (!a || e.origem === 'cadastro_sem_envio' || e.desconsideradoEm) continue
    const de = ETAPAS_ENVIO.indexOf(a.etapaAtual)
    const para = ETAPAS_ENVIO.indexOf(e.etapaAtual)
    const nome = primeiroNome(depois, e.userEmail)
    if (de < 1 && para === 1) {
      eventos.push({
        chave: `envio-postado:${e.protocolo}`,
        tipo: 'envio_postado',
        para: e.userEmail,
        dados: { nome, protocolo: e.protocolo, quantidade: e.quantidade, tipoMoeda: e.tipoMoeda, codigoRastreio: e.codigoRastreio },
      })
    }
    // De "Protocolo gerado" direto para "Recebido" (entrega registrada pelos Correios no mesmo job) só avisa o recebimento.
    if (de < 2 && para >= 2) {
      eventos.push({
        chave: `envio-recebido:${e.protocolo}`,
        tipo: 'envio_recebido',
        para: e.userEmail,
        dados: { nome, protocolo: e.protocolo, quantidade: e.quantidade, tipoMoeda: e.tipoMoeda },
      })
    }
  }
  return eventos
}

/** Dono de uma moeda aprovada: o inventário onde ela está agora. */
function donoDaMoeda(depois: AppState, codigo: string | null): string | null {
  if (!codigo) return null
  for (const [email, u] of Object.entries(depois.users)) {
    if (u.coins.some((c) => c.id === codigo)) return email
  }
  return null
}

/**
 * Moeda aceita ou recusada. A bancada fecha uma moeda por vez, então o agrupamento (por envio e veredito, dentro
 * da mutação) só junta o que um cadastro direto em lote grava de uma vez; um envio de 5 moedas analisado na bancada
 * gera um aviso por moeda, que é o que o pedido do Rogério descreve.
 */
function eventosDeAnalise(antes: AppState, depois: AppState): EventoDeEmail[] {
  const novas = (depois.analises ?? []).slice((antes.analises ?? []).length)
  if (novas.length === 0) return []

  const faturasAntes = new Map((antes.faturasCustodia ?? []).map((f) => [f.id, f]))
  const entradasPagas = (depois.faturasCustodia ?? []).filter(
    (f) => f.origem === 'entrada_no_acervo' && f.status === 'paga' && !faturasAntes.has(f.id),
  )

  const grupos = new Map<string, typeof novas>()
  for (const a of novas) {
    const k = `${a.protocoloEnvio}|${a.veredito}`
    grupos.set(k, [...(grupos.get(k) ?? []), a])
  }

  const eventos: EventoDeEmail[] = []
  for (const analises of grupos.values()) {
    const primeira = analises[0]
    const envio: Envio | undefined = depois.envios.find((e) => e.protocolo === primeira.protocoloEnvio)
    const para = envio?.userEmail ?? analises.map((a) => donoDaMoeda(depois, a.codigoMoeda)).find((e): e is string => e !== null) ?? null
    if (!para) continue
    const nome = primeiroNome(depois, para)
    const tipoMoeda = tiposJuntos(analises.map((a) => a.tipoMoeda))

    if (primeira.veredito === 'aprovada') {
      const codigos = analises.map((a) => a.codigoMoeda).filter((c): c is string => c !== null)
      eventos.push({
        chave: `analise:${primeira.protocolo}`,
        tipo: 'moeda_aceita',
        para,
        dados: {
          nome,
          protocoloEnvio: primeira.protocoloEnvio,
          quantidade: analises.length,
          tipoMoeda,
          codigos,
          primeiroMesPago: entradasPagas.some((f) => f.userEmail === para && f.moedaIds.some((id) => codigos.includes(id))),
        },
      })
    } else {
      eventos.push({
        chave: `analise:${primeira.protocolo}`,
        tipo: 'moeda_recusada',
        para,
        dados: {
          nome,
          protocoloEnvio: primeira.protocoloEnvio,
          quantidade: analises.length,
          tipoMoeda,
          motivos: [...new Set(analises.map((a) => a.motivoRecusa).filter((m): m is string => Boolean(m)))],
        },
      })
    }
  }
  return eventos
}

/**
 * Fatura de custódia paga. Fatura que NASCE já paga com origem `compra` (o mês embutido na compra) ou
 * `entrada_no_acervo` (mês pago fora do sistema) fica sem aviso próprio: já está dito no e-mail da compra e no da
 * moeda aceita. Todas as outras — ciclo, contratação, entrada paga depois pelo cliente — avisam.
 */
function eventosDeFatura(antes: AppState, depois: AppState, quando: number): EventoDeEmail[] {
  const faturasAntes = new Map((antes.faturasCustodia ?? []).map((f) => [f.id, f]))
  const eventos: EventoDeEmail[] = []
  for (const f of depois.faturasCustodia ?? []) {
    if (f.status !== 'paga' || f.valorCents <= 0) continue
    const mudanca = emFatura(f, faturasAntes)
    if (mudanca === 'sem_mudanca') continue
    if (mudanca === 'nova' && (f.origem === 'compra' || f.origem === 'entrada_no_acervo')) continue
    eventos.push({
      chave: `fatura-paga:${f.id}`,
      tipo: 'fatura_paga',
      para: f.userEmail,
      dados: {
        nome: primeiroNome(depois, f.userEmail),
        faturaId: f.id,
        valorCents: f.valorCents,
        quantidadeMoedas: f.quantidadeMoedas,
        competencia: f.competencia,
        forma: f.formaPagamento ?? null,
        data: f.dataPagamento ?? quando,
      },
    })
  }
  return eventos
}

/**
 * Troca da chave Pix: vem do estado (`cadastro.dadosBancarios.chavePix`), então a frente A NÃO precisa chamar
 * `avisarSeguranca` para o Pix — se chamasse, o cliente receberia dois e-mails. A PRIMEIRA gravação (não havia
 * chave) não é troca e não avisa.
 */
function eventosDeSegurancaPix(antes: AppState, depois: AppState, quando: number): EventoDeEmail[] {
  const eventos: EventoDeEmail[] = []
  for (const [email, u] of Object.entries(depois.users)) {
    const era = antes.users[email]?.cadastro?.dadosBancarios?.chavePix?.trim()
    const agora = u.cadastro?.dadosBancarios?.chavePix?.trim()
    if (!era || !agora || era === agora) continue
    eventos.push({
      chave: `seguranca-pix:${email}:${quando}`,
      tipo: 'seguranca_pix',
      para: email,
      dados: { nome: primeiroNome(depois, email), quando, chaveMascarada: mascararChavePix(agora) },
    })
  }
  return eventos
}

/**
 * Os e-mails que esta mutação pede, já filtrados pela preferência de cada cliente.
 * Pura: mesma entrada, mesmo resultado — é o que a suíte confere com fixtures.
 */
export function eventosDeEmail(antes: AppState, depois: AppState, quando: number): EventoDeEmail[] {
  const todos = [
    ...eventosDeNegociacao(antes, depois, quando),
    ...eventosDeDeposito(antes, depois, quando),
    ...eventosDeEnvio(antes, depois),
    ...eventosDeAnalise(antes, depois),
    ...eventosDeFatura(antes, depois, quando),
    ...eventosDeSegurancaPix(antes, depois, quando),
  ]
  return todos.filter((e) => {
    const conta = depois.users[e.para]
    // Destinatário que não está mais no estado (conta removida) não recebe nada: não há preferência a consultar.
    return conta !== undefined && deveEnviar(e.tipo, conta.settings)
  })
}

/** Útil a quem monta um evento fora do diff (avisos.ts) com o mesmo formato. */
export type EventoDe<K extends TipoDeEmail> = Extract<EventoDeEmail, { tipo: K }> & { dados: DadosPorTipo[K] }
