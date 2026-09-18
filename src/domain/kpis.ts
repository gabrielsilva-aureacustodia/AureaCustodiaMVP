/**
 * Indicadores do negócio — a aba KPIs da Central de Resultados (frente C, C1; plano do
 * Admin, seção 1.6, com os acréscimos da seção 6 do plano de finalizações).
 *
 * NÃO É PORT. O monolito não calculava indicador nenhum. É um módulo PURO e SÍNCRONO,
 * no mesmo desenho de `dre.ts`: recebe as fontes como argumento — o estado, as
 * retiradas, o período, o relógio e duas fontes opcionais — e devolve números. Assim
 * dá para testar sem banco e sem data do dia.
 *
 * TUDO EM INTEIROS. Dinheiro em `Cents`, tempo em milissegundos, proporção em pontos-base
 * (10000 = 100%). A tela é quem formata.
 *
 * O QUE DEPENDE DE OUTRA FRENTE, E COMO APARECE SOZINHO
 * -----------------------------------------------------
 *  - Comissão por lado (A1): a negociação pode trazer `feeComprador` e `feeVendedor`.
 *    Negociação antiga não traz, e vale a regra de leitura da A1: vendedor = `fee`,
 *    comprador = 0. Quando a A1 estiver na `main`, os dois lados aparecem sem mudar
 *    uma linha daqui.
 *  - Tempo até a execução da oferta (A2): vem do histórico da fila. `null` = a tabela
 *    ainda não existe, e a tela diz isso.
 *  - Planos anual × 24 meses (B2): vêm de `planosCustodia`. `null` = ainda não existem.
 *
 * O que este arquivo NÃO faz: receita oficial. A receita da empresa é a da DRE, lida do
 * livro-razão. Aqui "receita por tipo" é a comissão congelada em cada negociação — os
 * mesmos valores que o livro-razão lança —, para responder "qual moeda gera mais
 * comissão", não para fechar o mês.
 */

import { isInadimplente, verificarStatusFatura } from '@/domain/custody'
import type { Periodo } from '@/domain/dre'
import { tradeFee } from '@/domain/fees'
import { ETAPAS_ENVIO } from '@/domain/types'
import type { AppState, Cents, EtapaEnvio, Retirada, StatusRetirada, Timestamp, Trade } from '@/domain/types'

/* ---------- entradas ---------- */

/** Um evento do histórico da fila (tabela `ofertas_historico`, frente A). */
export interface EventoDaFilaKpi {
  ofertaId: string
  lado: 'venda' | 'compra'
  tipoMoeda: string
  evento: string
  createdAt: Timestamp
}

/** O que os KPIs leem de um plano de custódia (frente B, B2). */
export interface PlanoKpi {
  modalidade: string
  status: string
  quantidadeContratada: number
  moedaIds?: readonly string[]
}

export interface FontesKpi {
  state: AppState
  retiradas: readonly Retirada[]
  periodo: Periodo
  agora: Timestamp
  /** `null` = o histórico da fila não existe neste banco (A2 ainda não entrou). */
  historicoDaFila: readonly EventoDaFilaKpi[] | null
  /** `null` = não há planos de custódia neste estado (B2 ainda não entrou). */
  planos: readonly PlanoKpi[] | null
}

/* ---------- saídas ---------- */

export interface Media {
  /** Média em milissegundos, arredondada; `null` sem amostra. */
  mediaMs: number | null
  amostras: number
}

export interface Kpis {
  mercado: {
    negociacoes: number
    moedasNegociadas: number
    volume: Cents
    ticketMedio: Cents | null
    comissaoTotal: Cents
    comissaoMedia: { total: Cents | null; comprador: Cents | null; vendedor: Cents | null }
    /** true quando alguma negociação do período cobrou comissão do comprador (A1). */
    doisLados: boolean
    receitaPorTipo: Array<{ tipoMoeda: string; negociacoes: number; moedas: number; volume: Cents; comissoes: Cents }>
  }
  acervo: {
    moedasEmCustodia: number
    porTipo: Array<{ tipoMoeda: string; moedas: number }>
    porCaixa: Array<{ caixa: string; moedas: number }>
    porStatusFisico: { recebido: number; armazenado: number }
    retiradasPorStatus: Record<StatusRetirada, number>
    /** Retiradas pedidas e ainda não entregues nem canceladas. */
    emRetirada: number
  }
  contas: {
    total: number
    comSaldo: number
    comMoeda: number
    ativas30d: number
    comCadastro: number
    saldoTotal: Cents
  }
  envios: {
    criados: number
    /** Envios criados no período que chegaram PELO MENOS a cada etapa. */
    funil: Array<{ etapa: EtapaEnvio; envios: number }>
    concluidos: number
    moedasDeclaradas: number
    moedasAprovadas: number
    moedasRecusadas: number
    taxaAprovacaoBp: number | null
    recusasPorMotivo: Array<{ motivo: string; moedas: number; bp: number }>
  }
  tempos: {
    postagemAteRecebimento: Media
    recebimentoAteLaudo: Media
    postagemAteLaudo: Media
  }
  faturas: {
    emitidasNoPeriodo: number
    valorEmitido: Cents
    valorPago: Cents
    /** Hoje: pendentes e atrasadas, de qualquer competência. */
    emAberto: { quantidade: number; valor: Cents }
    /** Hoje: só as atrasadas. */
    atrasadas: { quantidade: number; valor: Cents }
    /** Das emitidas no período, quanto está atrasado hoje, sobre o emitido. */
    taxaInadimplenciaBp: number | null
    contasInadimplentes: number
  }
  fila: {
    porTipo: Array<{
      tipoMoeda: string
      ofertasVenda: number
      ordensCompra: number
      moedasCompra: number
      melhorVenda: Cents | null
      melhorCompra: Cents | null
    }>
    /** `null` = sem histórico da fila neste banco (A2). */
    tempoAteExecucao: { venda: Media; compra: Media } | null
  }
  /** `null` = sem planos de custódia neste estado (B2). */
  planos: {
    anual: { vigentes: number; moedas: number }
    bienal: { vigentes: number; moedas: number }
    aguardandoPagamento: number
    cancelados: number
  } | null
}

/* ---------- utilitários ---------- */

const DIA_MS = 24 * 60 * 60 * 1000
export const SEM_CAIXA = 'Sem caixa registrada'
const SEM_MOTIVO = 'Sem motivo registrado'

function noPeriodo(ts: Timestamp | null | undefined, p: Periodo): boolean {
  return typeof ts === 'number' && ts >= p.inicio && ts < p.fim
}

/** parte / total em pontos-base; `null` sem total. */
export function bp(parte: number, total: number): number | null {
  return total > 0 ? Math.round((parte * 10000) / total) : null
}

function media(amostras: readonly number[]): Media {
  if (!amostras.length) return { mediaMs: null, amostras: 0 }
  return { mediaMs: Math.round(amostras.reduce((s, x) => s + x, 0) / amostras.length), amostras: amostras.length }
}

/**
 * Os dois lados da comissão de UMA negociação, com a regra de leitura da A1:
 * vendedor = `feeVendedor` ?? `fee` ?? recalculado; comprador = `feeComprador` ?? 0.
 * Recalcular só acontece com estado que não passou pelo banco (`npm run dev` sem
 * POSTGRES_URL) — todo Trade gravado carrega a comissão congelada.
 */
export function ladosDaComissao(t: Trade): { comprador: Cents; vendedor: Cents } {
  const comLados = t as Trade & { feeComprador?: Cents; feeVendedor?: Cents }
  const qtd = t.qty || 1
  return {
    comprador: comLados.feeComprador ?? 0,
    vendedor: comLados.feeVendedor ?? t.fee ?? tradeFee(t.price) * qtd,
  }
}

function contarPor<T>(itens: readonly T[], chave: (x: T) => string): Map<string, number> {
  const m = new Map<string, number>()
  for (const x of itens) m.set(chave(x), (m.get(chave(x)) ?? 0) + 1)
  return m
}

/* ---------- o cálculo ---------- */

export function montarKpis({ state, retiradas, periodo, agora, historicoDaFila, planos }: FontesKpi): Kpis {
  const usuarios = Object.entries(state.users)

  /* mercado */
  const negociacoes = state.trades.filter((t) => noPeriodo(t.date, periodo))
  const porTipo = new Map<string, { negociacoes: number; moedas: number; volume: Cents; comissoes: Cents }>()
  let volume = 0
  let moedasNegociadas = 0
  let somaComprador = 0
  let somaVendedor = 0
  for (const t of negociacoes) {
    const qtd = t.qty || 1
    const lados = ladosDaComissao(t)
    volume += t.price * qtd
    moedasNegociadas += qtd
    somaComprador += lados.comprador
    somaVendedor += lados.vendedor
    const linha = porTipo.get(t.tipoMoeda) ?? { negociacoes: 0, moedas: 0, volume: 0, comissoes: 0 }
    linha.negociacoes += 1
    linha.moedas += qtd
    linha.volume += t.price * qtd
    linha.comissoes += lados.comprador + lados.vendedor
    porTipo.set(t.tipoMoeda, linha)
  }
  const n = negociacoes.length
  const porNegociacao = (soma: Cents): Cents | null => (n ? Math.round(soma / n) : null)

  /* acervo */
  const caixaDaMoeda = new Map<string, string>()
  for (const a of state.analises) {
    if (a.veredito === 'aprovada' && a.codigoMoeda && a.caixa) caixaDaMoeda.set(a.codigoMoeda, a.caixa)
  }
  const emCustodia = usuarios.flatMap(([, u]) => u.coins.filter((c) => c.recibo.status !== 'Extinto'))
  const porCaixa = contarPor(emCustodia, (c) => caixaDaMoeda.get(c.id) ?? SEM_CAIXA)
  const retiradasPorStatus: Record<StatusRetirada, number> = { solicitada: 0, paga: 0, separacao: 0, postada: 0, entregue: 0, cancelada: 0 }
  for (const r of retiradas) retiradasPorStatus[r.status] = (retiradasPorStatus[r.status] ?? 0) + 1

  /* envios, na coorte dos criados no período */
  const envios = state.envios.filter((e) => noPeriodo(e.createdAt, periodo))
  const concluidos = envios.filter((e) => e.etapaAtual === 'Recibo emitido')
  const declaradas = concluidos.reduce((s, e) => s + e.quantidade, 0)
  const aprovadas = concluidos.reduce((s, e) => s + e.codigosAtivosGerados.length, 0)
  const recusadas = concluidos.reduce((s, e) => s + Math.max(0, e.quantidade - e.codigosAtivosGerados.length), 0)

  const recusasNoPeriodo = state.analises.filter((a) => a.veredito === 'recusada' && noPeriodo(a.validadoEm, periodo))
  const porMotivo = contarPor(recusasNoPeriodo, (a) => a.motivoRecusa?.trim() || SEM_MOTIVO)

  /* tempos: o laudo de um envio é a primeira análise dele */
  const laudoDoEnvio = new Map<string, Timestamp>()
  for (const a of state.analises) {
    const atual = laudoDoEnvio.get(a.protocoloEnvio)
    if (atual === undefined || a.validadoEm < atual) laudoDoEnvio.set(a.protocoloEnvio, a.validadoEm)
  }
  const postagemRecebimento: number[] = []
  const recebimentoLaudo: number[] = []
  const postagemLaudo: number[] = []
  for (const e of state.envios) {
    if (e.dataPostagem !== null && e.dataRecebimento !== null && noPeriodo(e.dataRecebimento, periodo) && e.dataRecebimento >= e.dataPostagem) {
      postagemRecebimento.push(e.dataRecebimento - e.dataPostagem)
    }
    const laudo = laudoDoEnvio.get(e.protocolo)
    if (laudo === undefined || !noPeriodo(laudo, periodo)) continue
    if (e.dataRecebimento !== null && laudo >= e.dataRecebimento) recebimentoLaudo.push(laudo - e.dataRecebimento)
    if (e.dataPostagem !== null && laudo >= e.dataPostagem) postagemLaudo.push(laudo - e.dataPostagem)
  }

  /* faturas */
  const faturas = state.faturasCustodia ?? []
  const emitidas = faturas.filter((f) => f.status !== 'cancelada' && noPeriodo(f.dataEmissao, periodo))
  const situacaoHoje = new Map(faturas.map((f) => [f.id, verificarStatusFatura(f, agora)]))
  const abertas = faturas.filter((f) => ['pendente', 'atrasada'].includes(situacaoHoje.get(f.id) ?? ''))
  const atrasadas = faturas.filter((f) => situacaoHoje.get(f.id) === 'atrasada')
  const valorEmitido = emitidas.reduce((s, f) => s + f.valorCents, 0)
  const valorAtrasadoDasEmitidas = emitidas.filter((f) => situacaoHoje.get(f.id) === 'atrasada').reduce((s, f) => s + f.valorCents, 0)
  const faturasPorConta = new Map<string, typeof faturas>()
  for (const f of faturas) faturasPorConta.set(f.userEmail, [...(faturasPorConta.get(f.userEmail) ?? []), f])

  /* fila de ofertas, agora */
  const tiposDaFila = new Set([...state.sellOffers.map((o) => o.tipoMoeda), ...state.buyOrders.map((b) => b.tipoMoeda)])
  const fila = [...tiposDaFila]
    .map((tipoMoeda) => {
      const vendas = state.sellOffers.filter((o) => o.tipoMoeda === tipoMoeda)
      const compras = state.buyOrders.filter((b) => b.tipoMoeda === tipoMoeda)
      return {
        tipoMoeda,
        ofertasVenda: vendas.length,
        ordensCompra: compras.length,
        moedasCompra: compras.reduce((s, b) => s + b.qty, 0),
        melhorVenda: vendas.length ? Math.min(...vendas.map((o) => o.price)) : null,
        melhorCompra: compras.length ? Math.max(...compras.map((b) => b.price)) : null,
      }
    })
    .sort((a, b) => b.ofertasVenda + b.moedasCompra - (a.ofertasVenda + a.moedasCompra) || a.tipoMoeda.localeCompare(b.tipoMoeda))

  let tempoAteExecucao: Kpis['fila']['tempoAteExecucao'] = null
  if (historicoDaFila) {
    const publicada = new Map<string, Timestamp>()
    const executada = new Map<string, { em: Timestamp; lado: 'venda' | 'compra' }>()
    for (const ev of historicoDaFila) {
      if (ev.evento === 'publicada' && !publicada.has(ev.ofertaId)) publicada.set(ev.ofertaId, ev.createdAt)
      if (ev.evento === 'executada' && !executada.has(ev.ofertaId)) executada.set(ev.ofertaId, { em: ev.createdAt, lado: ev.lado })
    }
    const venda: number[] = []
    const compra: number[] = []
    for (const [id, ex] of executada) {
      const pub = publicada.get(id)
      if (pub === undefined || !noPeriodo(ex.em, periodo) || ex.em < pub) continue
      ;(ex.lado === 'compra' ? compra : venda).push(ex.em - pub)
    }
    tempoAteExecucao = { venda: media(venda), compra: media(compra) }
  }

  /* planos de custódia */
  let resumoPlanos: Kpis['planos'] = null
  if (planos) {
    const moedasDo = (p: PlanoKpi): number => (p.moedaIds && p.moedaIds.length ? p.moedaIds.length : p.quantidadeContratada)
    const vigentes = (modalidade: string): { vigentes: number; moedas: number } => {
      const lista = planos.filter((p) => p.status === 'vigente' && p.modalidade === modalidade)
      return { vigentes: lista.length, moedas: lista.reduce((s, p) => s + moedasDo(p), 0) }
    }
    resumoPlanos = {
      anual: vigentes('anual'),
      bienal: vigentes('bienal'),
      aguardandoPagamento: planos.filter((p) => p.status === 'aguardando_pagamento').length,
      cancelados: planos.filter((p) => p.status === 'cancelado').length,
    }
  }

  return {
    mercado: {
      negociacoes: n,
      moedasNegociadas,
      volume,
      ticketMedio: porNegociacao(volume),
      comissaoTotal: somaComprador + somaVendedor,
      comissaoMedia: { total: porNegociacao(somaComprador + somaVendedor), comprador: porNegociacao(somaComprador), vendedor: porNegociacao(somaVendedor) },
      doisLados: somaComprador > 0,
      receitaPorTipo: [...porTipo.entries()]
        .map(([tipoMoeda, v]) => ({ tipoMoeda, ...v }))
        .sort((a, b) => b.comissoes - a.comissoes || a.tipoMoeda.localeCompare(b.tipoMoeda)),
    },
    acervo: {
      moedasEmCustodia: emCustodia.length,
      porTipo: [...contarPor(emCustodia, (c) => c.tipoMoeda).entries()]
        .map(([tipoMoeda, moedas]) => ({ tipoMoeda, moedas }))
        .sort((a, b) => b.moedas - a.moedas || a.tipoMoeda.localeCompare(b.tipoMoeda)),
      porCaixa: [...porCaixa.entries()]
        .map(([caixa, moedas]) => ({ caixa, moedas }))
        .sort((a, b) => (a.caixa === SEM_CAIXA ? 1 : b.caixa === SEM_CAIXA ? -1 : a.caixa.localeCompare(b.caixa))),
      porStatusFisico: {
        recebido: emCustodia.filter((c) => c.statusFisico === 'Recebido').length,
        armazenado: emCustodia.filter((c) => c.statusFisico === 'Armazenado').length,
      },
      retiradasPorStatus,
      emRetirada: retiradasPorStatus.solicitada + retiradasPorStatus.paga + retiradasPorStatus.separacao + retiradasPorStatus.postada,
    },
    contas: {
      total: usuarios.length,
      comSaldo: usuarios.filter(([, u]) => u.balance > 0).length,
      comMoeda: usuarios.filter(([, u]) => u.coins.some((c) => c.recibo.status !== 'Extinto')).length,
      ativas30d: usuarios.filter(([, u]) => typeof u.lastAccess === 'number' && u.lastAccess >= agora - 30 * DIA_MS).length,
      comCadastro: usuarios.filter(([, u]) => Boolean(u.cadastro)).length,
      saldoTotal: usuarios.reduce((s, [, u]) => s + u.balance, 0),
    },
    envios: {
      criados: envios.length,
      funil: ETAPAS_ENVIO.map((etapa, i) => ({ etapa, envios: envios.filter((e) => ETAPAS_ENVIO.indexOf(e.etapaAtual) >= i).length })),
      concluidos: concluidos.length,
      moedasDeclaradas: declaradas,
      moedasAprovadas: aprovadas,
      moedasRecusadas: recusadas,
      taxaAprovacaoBp: bp(aprovadas, declaradas),
      recusasPorMotivo: [...porMotivo.entries()]
        .map(([motivo, moedas]) => ({ motivo, moedas, bp: bp(moedas, recusasNoPeriodo.length) ?? 0 }))
        .sort((a, b) => b.moedas - a.moedas || a.motivo.localeCompare(b.motivo)),
    },
    tempos: {
      postagemAteRecebimento: media(postagemRecebimento),
      recebimentoAteLaudo: media(recebimentoLaudo),
      postagemAteLaudo: media(postagemLaudo),
    },
    faturas: {
      emitidasNoPeriodo: emitidas.length,
      valorEmitido,
      valorPago: emitidas.filter((f) => f.status === 'paga').reduce((s, f) => s + f.valorCents, 0),
      emAberto: { quantidade: abertas.length, valor: abertas.reduce((s, f) => s + f.valorCents, 0) },
      atrasadas: { quantidade: atrasadas.length, valor: atrasadas.reduce((s, f) => s + f.valorCents, 0) },
      taxaInadimplenciaBp: bp(valorAtrasadoDasEmitidas, valorEmitido),
      contasInadimplentes: usuarios.filter(([email, u]) => isInadimplente(u, faturasPorConta.get(email) ?? [], agora) || Boolean(u.inadimplente)).length,
    },
    fila: { porTipo: fila, tempoAteExecucao },
    planos: resumoPlanos,
  }
}
