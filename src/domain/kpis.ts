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
 *  - Planos de custódia (B2): vêm de `planosCustodia`. `null` = ainda não existem.
 *
 * O que este arquivo NÃO faz: receita oficial. A receita da empresa é a da DRE, lida do
 * livro-razão. Aqui "receita por tipo" é a comissão congelada em cada negociação — os
 * mesmos valores que o livro-razão lança —, para responder "qual moeda gera mais
 * comissão", não para fechar o mês.
 */

import type { EstadoDoCaso } from '@/domain/atendimento/casos'
import { isInadimplente, verificarStatusFatura } from '@/domain/custody'
import type { Periodo } from '@/domain/dre'
import { tradeFee } from '@/domain/fees'
import { diaDeBrasilia } from '@/domain/financeiro/controle'
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

/* ====================================================================================
 * AQUISIÇÃO E ATENDIMENTO — os KPIs do conselho (frente J, 18/11/2026)
 *
 * Pedido do Rogério (item 7 da manutenção): a proposta de KPIs indicada pelo conselho, calculada
 * dentro do sistema. A fonte é o slide "3.1 Cronograma, Números e Metrificação" (CAC diário e
 * semanal, análise analógica e digital, atendimento semanal); a lista final do WhatsApp de 3/11
 * ainda não chegou (D2) e entra na tabela de `docs/kpis/PROPOSTA_DE_KPIS.md`.
 *
 * A REGRA DESTE BLOCO É A DO ARQUIVO: sem fonte, o resultado é `null` — nunca zero. Zero diria "não
 * houve", e o certo é dizer "ninguém informou". Por isso o CAC de uma janela sem gasto informado é
 * `null`, e o número de cadastros sem banco também.
 *
 * TUDO NO DIA DE BRASÍLIA. Cadastro, ativação, gasto e caso são contados por 'AAAA-MM-DD' (UTC−3),
 * o dia em que a equipe vive. As janelas do painel não usam `Periodo` (que nasce no fuso do servidor)
 * porque um dia de diferença na borda do mês trocaria o CAC.
 *
 * O GASTO DE MÍDIA VEM DE FORA e é digitado pela equipe: um valor por canal e por INTERVALO de dias
 * (um dia, uma semana, um mês). Dentro do intervalo ele se reparte em partes iguais pelos dias —
 * conta que o Rogério refaz na calculadora —, e a janela que pega só um pedaço do intervalo é marcada
 * `aproximado`: o número é uma estimativa, e a tela diz isso.
 * ==================================================================================*/

export type NaturezaDoCanal = 'digital' | 'analogico' | 'geral'

/**
 * Onde o dinheiro de marketing é gasto. "Serviço" é a mensalidade de quem cuida da campanha (R$ 3.600,00 no
 * slide do conselho): entra no CAC completo, mas não no CAC "só de mídia", e não é digital nem analógico.
 */
export const CANAIS_DE_MARKETING = [
  { chave: 'meta', rotulo: 'Meta (Instagram e Facebook)', natureza: 'digital' },
  { chave: 'google', rotulo: 'Google', natureza: 'digital' },
  { chave: 'outro_digital', rotulo: 'Outro canal digital', natureza: 'digital' },
  { chave: 'evento', rotulo: 'Evento ou ação presencial', natureza: 'analogico' },
  { chave: 'impresso', rotulo: 'Material impresso', natureza: 'analogico' },
  { chave: 'outro_analogico', rotulo: 'Outro canal analógico', natureza: 'analogico' },
  { chave: 'servico', rotulo: 'Serviço de marketing (mensalidade)', natureza: 'geral' },
] as const

export type CanalDeMarketing = (typeof CANAIS_DE_MARKETING)[number]['chave']

export const ROTULO_NATUREZA: Readonly<Record<NaturezaDoCanal, string>> = {
  digital: 'Digital',
  analogico: 'Analógico',
  geral: 'Geral (serviço)',
}

export function ehCanalDeMarketing(x: unknown): x is CanalDeMarketing {
  return CANAIS_DE_MARKETING.some((c) => c.chave === x)
}

export function naturezaDoCanal(canal: CanalDeMarketing): NaturezaDoCanal {
  return CANAIS_DE_MARKETING.find((c) => c.chave === canal)!.natureza
}

export function rotuloDoCanal(canal: string): string {
  return CANAIS_DE_MARKETING.find((c) => c.chave === canal)?.rotulo ?? canal
}

/** Uma entrada de gasto, como a equipe digitou (`aurea.marketing_gastos`). Dias em 'AAAA-MM-DD' de Brasília, inclusive. */
export interface GastoDeMarketing {
  id: number
  canal: CanalDeMarketing
  de: string
  ate: string
  valor: Cents
  /** Visitas ao site no intervalo, lidas pela equipe do gerenciador de anúncios; opcional. */
  visitas: number | null
}

/** Um recorte de dias de Brasília, extremos incluídos. */
export interface JanelaDeDias {
  rotulo: string
  de: string
  ate: string
}

/** Um caso de atendimento, só com o que os KPIs leem (`aurea.casos` + a 1ª resposta da equipe em `casos_mensagens`). */
export interface CasoParaKpi {
  estado: EstadoDoCaso
  criadoEm: Timestamp
  fechadoEm: Timestamp | null
  primeiraRespostaDaEquipeEm: Timestamp | null
}

export interface FontesAquisicao {
  state: AppState
  /**
   * E-mail → instante em que a conta nasceu (o `saldo_inicial` do ledger). `null` = sem banco: não há data de
   * cadastro, e os números que dependem dela ficam `null`.
   */
  criadasEm: Readonly<Record<string, Timestamp>> | null
  /** `null` = a tabela de gastos não existe neste banco (migration 057 não aplicada). */
  gastos: readonly GastoDeMarketing[] | null
  /** `null` = sem banco ou sem permissão para ver o atendimento (`cs.ver`). */
  casos: readonly CasoParaKpi[] | null
  /** As janelas do quadro de CAC: hoje, últimos 7 dias, mês corrente… */
  janelas: readonly JanelaDeDias[]
  /** O período escolhido na tela: vale para o funil, o gasto por canal e o atendimento. */
  periodo: JanelaDeDias
  agora: Timestamp
  /** Contas que não são cliente captado (equipe e teste): não entram em cadastro nem em ativação. */
  ignorar: ReadonlySet<string>
}

export interface CacDaJanela {
  rotulo: string
  de: string
  ate: string
  /** Contas criadas nos dias da janela. `null` sem banco. */
  cadastros: number | null
  /** Contas cuja 1ª transação caiu nos dias da janela. */
  ativados: number
  /** Gasto informado que cai na janela, todos os canais. `null` = ninguém informou. */
  gasto: Cents | null
  /** O mesmo sem o canal "serviço": só a mídia. */
  gastoMidia: Cents | null
  /** true quando alguma entrada de gasto cobre mais dias que a janela (o valor é uma estimativa). */
  aproximado: boolean
  /** gasto ÷ ativados. `null` sem gasto ou sem ativado (dividir por zero não é zero). */
  cac: Cents | null
  cacMidia: Cents | null
  /** gasto ÷ cadastros. */
  custoPorCadastro: Cents | null
}

export interface KpisAquisicao {
  porJanela: CacDaJanela[]
  /** No período escolhido. Visitas → cadastros → ativados (dos cadastrados no período, até hoje). */
  funil: {
    visitas: number | null
    visitasEstimadas: boolean
    cadastros: number | null
    ativadosDosCadastrados: number | null
    visitaParaCadastroBp: number | null
    cadastroParaAtivacaoBp: number | null
  }
  gastoPorCanal: Array<{ canal: CanalDeMarketing; natureza: NaturezaDoCanal; valor: Cents }>
  gastoPorNatureza: { digital: Cents | null; analogico: Cents | null; geral: Cents | null }
  gastoAproximado: boolean
  /**
   * Origem do cadastro (analógico × digital): o cadastro NÃO tem o campo, então não há como dizer de onde veio
   * cada cliente. `null` até a proposta de `docs/kpis/PROPOSTA_DE_KPIS.md` ser decidida — não se inventa.
   */
  origemDoCadastro: null
  /** `null` = sem fonte de atendimento (sem banco ou sem `cs.ver`). */
  atendimento: {
    /** Esperando a equipe (estado `aberto`), de qualquer data. */
    abertosAgora: number
    emAndamentoAgora: number
    criadosNoPeriodo: number
    /** Dos criados no período, os que a equipe ainda não respondeu. */
    semRespostaDaEquipe: number
    resolvidosNoPeriodo: number
    /** Do caso criado no período até a 1ª mensagem da equipe. */
    tempoAtePrimeiraResposta: Media
  } | null
}

/* ---------- dias de Brasília ---------- */

function indiceDoDia(dia: string): number {
  const [a, m, d] = dia.split('-').map(Number)
  return Math.round(Date.UTC(a!, m! - 1, d!) / DIA_MS)
}

function diaDoIndice(i: number): string {
  return new Date(i * DIA_MS).toISOString().slice(0, 10)
}

/** A data `n` dias depois (ou antes, com `n` negativo) de 'AAAA-MM-DD'. */
export function somarDias(dia: string, n: number): string {
  return diaDoIndice(indiceDoDia(dia) + n)
}

/** Quantos dias o intervalo tem, extremos incluídos. */
export function diasDoIntervalo(de: string, ate: string): number {
  return indiceDoDia(ate) - indiceDoDia(de) + 1
}

export function ehDiaDeBrasilia(s: unknown): s is string {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
  const [a, m, d] = s.split('-').map(Number)
  const dt = new Date(Date.UTC(a!, m! - 1, d!))
  return dt.getUTCFullYear() === a && dt.getUTCMonth() === m! - 1 && dt.getUTCDate() === d
}

const naJanela = (ts: Timestamp | null | undefined, j: JanelaDeDias): boolean => {
  if (typeof ts !== 'number') return false
  const dia = diaDeBrasilia(ts)
  return dia >= j.de && dia <= j.ate
}

/**
 * As três janelas fixas do quadro de CAC, relativas ao dia de `agora`: o dia, os 7 dias que terminam nele e o mês
 * corrente até ele. É o "diário e semanal" do slide do conselho, mais o mês.
 */
export function janelasDeReferencia(agora: Timestamp): JanelaDeDias[] {
  const hoje = diaDeBrasilia(agora)
  return [
    { rotulo: 'Hoje', de: hoje, ate: hoje },
    { rotulo: 'Últimos 7 dias', de: somarDias(hoje, -6), ate: hoje },
    { rotulo: 'Mês até hoje', de: `${hoje.slice(0, 8)}01`, ate: hoje },
  ]
}

/** O período da tela (`?ano=&mes=&trimestre=`) em dias de Brasília. Sem mês nem trimestre, o ano inteiro. */
export function janelaDoPeriodo(p: { ano: number; mes: number | null; trimestre: number | null }, rotulo: string): JanelaDeDias {
  const primeiroMes = p.mes ?? (p.trimestre ? (p.trimestre - 1) * 3 + 1 : 1)
  const ultimoMes = p.mes ?? (p.trimestre ? p.trimestre * 3 : 12)
  const dd = (n: number): string => String(n).padStart(2, '0')
  const ultimoDia = new Date(Date.UTC(p.ano, ultimoMes, 0)).getUTCDate()
  return { rotulo, de: `${p.ano}-${dd(primeiroMes)}-01`, ate: `${p.ano}-${dd(ultimoMes)}-${dd(ultimoDia)}` }
}

/* ---------- gasto: repartir um intervalo pelos dias da janela ---------- */

interface ParteDoGasto {
  /** Soma das partes que caem na janela, em centavos. */
  valor: number
  /** true quando alguma entrada tem mais dias que a janela, ou a janela só pega um pedaço dela. */
  aproximado: boolean
  /** false = nenhuma entrada toca a janela (e o resultado é `null`, não zero). */
  houve: boolean
}

function repartir(entradas: ReadonlyArray<{ de: string; ate: string; quantia: number }>, j: JanelaDeDias): ParteDoGasto {
  const jIni = indiceDoDia(j.de)
  const jFim = indiceDoDia(j.ate)
  let soma = 0
  let aproximado = false
  let houve = false
  for (const e of entradas) {
    const eIni = indiceDoDia(e.de)
    const eFim = indiceDoDia(e.ate)
    const dias = eFim - eIni + 1
    const dentro = Math.min(eFim, jFim) - Math.max(eIni, jIni) + 1
    if (dentro <= 0 || dias <= 0) continue
    houve = true
    soma += (e.quantia * dentro) / dias
    if (dentro < dias) aproximado = true
  }
  return { valor: Math.round(soma), aproximado, houve }
}

/* ---------- ativação ---------- */

/**
 * O instante da 1ª transação de cada conta — o que a torna "ativada".
 *
 * TRANSAÇÃO = dinheiro ou moeda que de fato se mexeu por ato do cliente: a primeira entrada de dinheiro
 * confirmada (Pix ou cartão, de qualquer finalidade: depósito, frete, custódia, compra) ou a primeira compra ou
 * venda. Fica de fora a `custodia_recebida_fora`, que é a EQUIPE registrando o que o cliente pagou em mãos, e
 * ficam de fora as contas em `ignorar` (equipe e teste). Só conta quem existe em `state.users`.
 */
export function primeiraTransacaoPorConta(state: AppState, ignorar: ReadonlySet<string>): Map<string, Timestamp> {
  const primeira = new Map<string, Timestamp>()
  const marcar = (email: string, ts: Timestamp): void => {
    if (ignorar.has(email) || !state.users[email] || typeof ts !== 'number') return
    const atual = primeira.get(email)
    if (atual === undefined || ts < atual) primeira.set(email, ts)
  }
  for (const d of state.deposits) {
    if (d.origem === 'custodia_recebida_fora') continue
    marcar(d.userEmail, d.date)
  }
  for (const t of state.trades) {
    marcar(t.buyer, t.date)
    marcar(t.seller, t.date)
  }
  return primeira
}

/* ---------- o cálculo ---------- */

export function montarKpisDeAquisicao(f: FontesAquisicao): KpisAquisicao {
  const primeira = primeiraTransacaoPorConta(f.state, f.ignorar)
  const gastos = f.gastos
  const entradasDeGasto = (so: (g: GastoDeMarketing) => boolean): Array<{ de: string; ate: string; quantia: number }> =>
    (gastos ?? []).filter(so).map((g) => ({ de: g.de, ate: g.ate, quantia: g.valor }))
  const todas = entradasDeGasto(() => true)
  const soMidia = entradasDeGasto((g) => naturezaDoCanal(g.canal) !== 'geral')

  const contasCriadasNaJanela = (j: JanelaDeDias): string[] | null =>
    f.criadasEm === null
      ? null
      : Object.entries(f.criadasEm)
          .filter(([email, ts]) => !f.ignorar.has(email) && Boolean(f.state.users[email]) && naJanela(ts, j))
          .map(([email]) => email)

  const dividir = (valor: Cents | null, por: number | null): Cents | null => (valor !== null && por !== null && por > 0 ? Math.round(valor / por) : null)

  const porJanela: CacDaJanela[] = f.janelas.map((j) => {
    const cadastradas = contasCriadasNaJanela(j)
    const ativados = [...primeira.values()].filter((ts) => naJanela(ts, j)).length
    const gasto = repartir(todas, j)
    const midia = repartir(soMidia, j)
    const gastoCents = gasto.houve ? gasto.valor : null
    const midiaCents = midia.houve ? midia.valor : null
    return {
      rotulo: j.rotulo,
      de: j.de,
      ate: j.ate,
      cadastros: cadastradas === null ? null : cadastradas.length,
      ativados,
      gasto: gastoCents,
      gastoMidia: midiaCents,
      aproximado: gasto.aproximado || midia.aproximado,
      cac: dividir(gastoCents, ativados),
      cacMidia: dividir(midiaCents, ativados),
      custoPorCadastro: dividir(gastoCents, cadastradas === null ? null : cadastradas.length),
    }
  })

  /* funil e gasto por canal, no período escolhido */
  const cadastradasNoPeriodo = contasCriadasNaJanela(f.periodo)
  const comVisitas = (gastos ?? []).filter((g) => g.visitas !== null).map((g) => ({ de: g.de, ate: g.ate, quantia: g.visitas as number }))
  const visitas = repartir(comVisitas, f.periodo)
  const visitasNoPeriodo = visitas.houve ? visitas.valor : null
  const ativadosDosCadastrados = cadastradasNoPeriodo === null ? null : cadastradasNoPeriodo.filter((email) => primeira.has(email)).length

  const porCanal = new Map<CanalDeMarketing, number>()
  let gastoAproximado = false
  for (const c of CANAIS_DE_MARKETING) {
    const parte = repartir(entradasDeGasto((g) => g.canal === c.chave), f.periodo)
    if (!parte.houve) continue
    porCanal.set(c.chave, parte.valor)
    if (parte.aproximado) gastoAproximado = true
  }
  const gastoPorCanal = CANAIS_DE_MARKETING.filter((c) => porCanal.has(c.chave)).map((c) => ({ canal: c.chave, natureza: c.natureza, valor: porCanal.get(c.chave)! }))
  const somaDa = (n: NaturezaDoCanal): Cents | null => {
    const itens = gastoPorCanal.filter((g) => g.natureza === n)
    return itens.length ? itens.reduce((s, g) => s + g.valor, 0) : null
  }

  /* atendimento */
  let atendimento: KpisAquisicao['atendimento'] = null
  if (f.casos) {
    const criados = f.casos.filter((c) => naJanela(c.criadoEm, f.periodo))
    const esperas = criados.filter((c) => c.primeiraRespostaDaEquipeEm !== null && c.primeiraRespostaDaEquipeEm >= c.criadoEm).map((c) => (c.primeiraRespostaDaEquipeEm as number) - c.criadoEm)
    atendimento = {
      abertosAgora: f.casos.filter((c) => c.estado === 'aberto').length,
      emAndamentoAgora: f.casos.filter((c) => c.estado === 'em_andamento').length,
      criadosNoPeriodo: criados.length,
      semRespostaDaEquipe: criados.filter((c) => c.primeiraRespostaDaEquipeEm === null).length,
      resolvidosNoPeriodo: f.casos.filter((c) => c.estado === 'resolvido' && naJanela(c.fechadoEm, f.periodo)).length,
      tempoAtePrimeiraResposta: media(esperas),
    }
  }

  const cadastros = cadastradasNoPeriodo === null ? null : cadastradasNoPeriodo.length
  return {
    porJanela,
    funil: {
      visitas: visitasNoPeriodo,
      visitasEstimadas: visitas.aproximado,
      cadastros,
      ativadosDosCadastrados,
      visitaParaCadastroBp: visitasNoPeriodo !== null && cadastros !== null ? bp(cadastros, visitasNoPeriodo) : null,
      cadastroParaAtivacaoBp: cadastros !== null && ativadosDosCadastrados !== null ? bp(ativadosDosCadastrados, cadastros) : null,
    },
    gastoPorCanal,
    gastoPorNatureza: { digital: somaDa('digital'), analogico: somaDa('analogico'), geral: somaDa('geral') },
    gastoAproximado,
    origemDoCadastro: null,
    atendimento,
  }
}

/* ---------- a entrada manual do gasto ---------- */

/** O que a tela manda: texto cru, que o servidor valida. */
export interface EntradaDeGasto {
  canal: unknown
  de: unknown
  ate: unknown
  valorCents: unknown
  visitas: unknown
  observacao: unknown
}

export interface GastoValidado {
  canal: CanalDeMarketing
  de: string
  ate: string
  valor: Cents
  visitas: number | null
  observacao: string
}

export type ValidacaoDeGasto = { ok: true; valor: GastoValidado } | { ok: false; erro: string }

/** R$ 1.000.000,00: acima disso é erro de digitação, não campanha. */
export const GASTO_MAXIMO: Cents = 100_000_000
export const GASTO_DIAS_MAXIMOS = 366
export const GASTO_DIA_MINIMO = '2024-01-01'

export function validarGastoDeMarketing(e: EntradaDeGasto): ValidacaoDeGasto {
  if (!ehCanalDeMarketing(e.canal)) return { ok: false, erro: 'Escolha o canal do gasto.' }
  if (!ehDiaDeBrasilia(e.de) || !ehDiaDeBrasilia(e.ate)) return { ok: false, erro: 'Informe o primeiro e o último dia do gasto.' }
  if (e.de < GASTO_DIA_MINIMO) return { ok: false, erro: 'O primeiro dia é anterior ao início das campanhas.' }
  if (e.ate < e.de) return { ok: false, erro: 'O último dia não pode ser antes do primeiro.' }
  if (diasDoIntervalo(e.de, e.ate) > GASTO_DIAS_MAXIMOS) return { ok: false, erro: 'O intervalo passa de um ano. Informe o gasto por mês.' }
  if (typeof e.valorCents !== 'number' || !Number.isInteger(e.valorCents) || e.valorCents <= 0) return { ok: false, erro: 'Informe o valor gasto, maior que zero.' }
  if (e.valorCents > GASTO_MAXIMO) return { ok: false, erro: 'Valor acima de R$ 1.000.000,00. Confira os zeros.' }
  let visitas: number | null = null
  if (e.visitas !== null && e.visitas !== undefined && e.visitas !== '') {
    if (typeof e.visitas !== 'number' || !Number.isInteger(e.visitas) || e.visitas < 0 || e.visitas > 100_000_000) {
      return { ok: false, erro: 'As visitas devem ser um número inteiro, de zero para cima.' }
    }
    visitas = e.visitas
  }
  const observacao = typeof e.observacao === 'string' ? e.observacao.trim() : ''
  if (observacao.length > 200) return { ok: false, erro: 'A observação passa de 200 caracteres.' }
  return { ok: true, valor: { canal: e.canal, de: e.de, ate: e.ate, valor: e.valorCents, visitas, observacao } }
}
