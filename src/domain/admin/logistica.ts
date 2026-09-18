/**
 * A logística de todas as contas — envios para a custódia e retiradas físicas, com o prazo
 * estourado em destaque (frente C, C3 — plano do Admin, 3.6).
 *
 * OS PRAZOS DESTE ARQUIVO SÃO ALERTA DE TELA, NÃO REGRA. Nada aqui muda uma etapa, cobra ou
 * bloqueia: eles só decidem que linha aparece em vermelho. Por isso vêm por parâmetro, com o
 * padrão abaixo, e a aba Operacional da configuração pode mudá-los sem tocar em fluxo nenhum.
 *
 *  - Validação na bancada: 2 dias úteis depois do recebimento — é o prazo que os Termos de Uso
 *    prometem (cláusula 7.2.5, RA-25).
 *  - Trânsito do envio: 15 dias corridos entre a postagem e a chegada. Passou disso, o pacote
 *    provavelmente se perdeu e alguém precisa abrir reclamação nos Correios.
 *  - Retirada: o D+30 gravado na própria retirada (`dataLimiteD30`), que é regra da frente B.
 *
 * "Dia útil" aqui é segunda a sexta no calendário de Brasília, sem feriado — o alerta pode
 * acender um dia antes num feriado. Tabela de feriados é custo que um alerta de tela não paga.
 *
 * Regra pura: o relógio entra por parâmetro.
 */

import type { Envio, EventoHistoricoRetirada, ModalidadeRetirada, Retirada, StatusRetirada } from '@/domain/types'

export interface PrazosLogistica {
  validacaoDiasUteis: number
  transitoEnvioDias: number
}

export const PRAZOS_LOGISTICA_PADRAO: PrazosLogistica = { validacaoDiasUteis: 2, transitoEnvioDias: 15 }

const DIA_MS = 24 * 60 * 60 * 1000
/** Brasília não tem horário de verão desde 2019: o deslocamento é fixo. */
const BRASILIA_MS = -3 * 60 * 60 * 1000

function diaDeBrasilia(ts: number): number {
  return Math.floor((ts + BRASILIA_MS) / DIA_MS)
}

/** Dias úteis (segunda a sexta) depois do dia de `inicio`, até o dia de `fim`, inclusive. */
export function diasUteisEntre(inicio: number, fim: number): number {
  const a = diaDeBrasilia(inicio)
  const b = diaDeBrasilia(fim)
  let n = 0
  for (let d = a + 1; d <= b; d++) {
    // O dia 0 da época Unix foi uma quinta-feira: (d + 4) % 7 dá 0 no domingo e 6 no sábado.
    const semana = (d + 4) % 7
    if (semana !== 0 && semana !== 6) n += 1
  }
  return n
}

export function diasCorridosEntre(inicio: number, fim: number): number {
  return Math.max(0, diaDeBrasilia(fim) - diaDeBrasilia(inicio))
}

export interface LinhaEnvio {
  protocolo: string
  email: string
  nome: string
  tipoMoeda: string
  ano: number
  quantidade: number
  etapaAtual: string
  codigoRastreio: string | null
  modalidadeEnvio: string | null
  createdAt: number
  dataPostagem: number | null
  dataRecebimento: number | null
  aberto: boolean
  atrasado: boolean
  /** Frase do alerta, pronta para a tela. */
  alerta: string | null
}

export interface LinhaRetirada {
  id: string
  coinId: string
  reciboCodigo: string
  email: string
  nome: string
  modalidade: ModalidadeRetirada
  status: StatusRetirada
  valorTaxaCents: number
  formaPagamento: string | null
  parcelas: number
  solicitadoEm: number
  pagoEm: number | null
  dataLimiteD30: number
  codigoRastreio: string | null
  historico: EventoHistoricoRetirada[]
  aberta: boolean
  atrasada: boolean
  alerta: string | null
}

const ULTIMA_ETAPA_ENVIO = 'Recibo emitido'
const RETIRADA_ENCERRADA: readonly StatusRetirada[] = ['entregue', 'cancelada']

export function linhaDeEnvio(e: Envio, nome: string, agora: number, prazos: PrazosLogistica = PRAZOS_LOGISTICA_PADRAO): LinhaEnvio {
  const aberto = e.etapaAtual !== ULTIMA_ETAPA_ENVIO
  let alerta: string | null = null
  let atrasado = false

  if (aberto && (e.etapaAtual === 'Recebido pela custódia' || e.etapaAtual === 'Em análise física') && e.dataRecebimento) {
    const uteis = diasUteisEntre(e.dataRecebimento, agora)
    if (uteis > prazos.validacaoDiasUteis) {
      atrasado = true
      alerta = `Recebido há ${uteis} dia(s) útil(eis) sem recibo — o prazo é de ${prazos.validacaoDiasUteis}.`
    }
  } else if (aberto && e.etapaAtual === 'Envio postado' && e.dataPostagem) {
    const dias = diasCorridosEntre(e.dataPostagem, agora)
    if (dias > prazos.transitoEnvioDias) {
      atrasado = true
      alerta = `Postado há ${dias} dias e ainda não chegou ao cofre.`
    }
  }

  return {
    protocolo: e.protocolo,
    email: e.userEmail,
    nome,
    tipoMoeda: e.tipoMoeda,
    ano: e.ano,
    quantidade: e.quantidade,
    etapaAtual: e.etapaAtual,
    codigoRastreio: e.codigoRastreio,
    modalidadeEnvio: e.modalidadeEnvio ?? null,
    createdAt: e.createdAt,
    dataPostagem: e.dataPostagem,
    dataRecebimento: e.dataRecebimento,
    aberto,
    atrasado,
    alerta,
  }
}

export function linhaDeRetirada(r: Retirada, nome: string, agora: number): LinhaRetirada {
  const aberta = !RETIRADA_ENCERRADA.includes(r.status)
  const atrasada = aberta && agora > r.dataLimiteD30
  return {
    id: r.id,
    coinId: r.coinId,
    reciboCodigo: r.reciboCodigo,
    email: r.userEmail,
    nome,
    modalidade: r.modalidade,
    status: r.status,
    valorTaxaCents: r.valorTaxaCents,
    formaPagamento: r.formaPagamento ?? null,
    parcelas: r.parcelas ?? 1,
    solicitadoEm: r.solicitadoEm,
    pagoEm: r.pagoEm ?? null,
    dataLimiteD30: r.dataLimiteD30,
    codigoRastreio: r.codigoRastreio ?? null,
    historico: r.historico ?? [],
    aberta,
    atrasada,
    alerta: atrasada ? `Passou do prazo de postagem de 30 dias há ${diasCorridosEntre(r.dataLimiteD30, agora)} dia(s).` : null,
  }
}

/* ---------- filtro ---------- */

export interface FiltroLogistica {
  /** O que listar. */
  ver: 'tudo' | 'envios' | 'retiradas'
  /** 'abertos' esconde o que já terminou; 'atrasados' mostra só o que estourou prazo. */
  situacao: 'abertos' | 'atrasados' | 'todos'
  busca: string
}

export const FILTRO_LOGISTICA_PADRAO: FiltroLogistica = { ver: 'tudo', situacao: 'abertos', busca: '' }

type Parametros = Record<string, string | string[] | undefined>

function um(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? ''
}

export function lerFiltroLogistica(p: Parametros): FiltroLogistica {
  const ver = um(p.ver)
  const situacao = um(p.situacao)
  return {
    ver: ver === 'envios' || ver === 'retiradas' ? ver : 'tudo',
    situacao: situacao === 'atrasados' || situacao === 'todos' ? situacao : 'abertos',
    busca: um(p.busca).trim().slice(0, 80),
  }
}

function casaBusca(textos: ReadonlyArray<string | null>, busca: string): boolean {
  if (!busca) return true
  const b = busca.toLowerCase()
  return textos.some((t) => (t ?? '').toLowerCase().includes(b))
}

export function filtrarEnvios(linhas: readonly LinhaEnvio[], f: FiltroLogistica): LinhaEnvio[] {
  if (f.ver === 'retiradas') return []
  return linhas
    .filter((l) => (f.situacao === 'abertos' ? l.aberto : f.situacao === 'atrasados' ? l.atrasado : true))
    .filter((l) => casaBusca([l.protocolo, l.email, l.nome, l.codigoRastreio, l.tipoMoeda], f.busca))
    .sort((a, b) => Number(b.atrasado) - Number(a.atrasado) || b.createdAt - a.createdAt)
}

export function filtrarRetiradas(linhas: readonly LinhaRetirada[], f: FiltroLogistica): LinhaRetirada[] {
  if (f.ver === 'envios') return []
  return linhas
    .filter((l) => (f.situacao === 'abertos' ? l.aberta : f.situacao === 'atrasados' ? l.atrasada : true))
    .filter((l) => casaBusca([l.id, l.coinId, l.reciboCodigo, l.email, l.nome, l.codigoRastreio], f.busca))
    .sort((a, b) => Number(b.atrasada) - Number(a.atrasada) || b.solicitadoEm - a.solicitadoEm)
}

export const ROTULO_STATUS_RETIRADA: Record<StatusRetirada, string> = {
  solicitada: 'Solicitada',
  paga: 'Paga',
  separacao: 'Em separação',
  postada: 'Postada',
  entregue: 'Entregue',
  cancelada: 'Cancelada',
}

export const ROTULO_FORMA_PAGAMENTO: Record<string, string> = { saldo: 'Saldo', pix: 'Pix', cartao: 'Cartão' }
