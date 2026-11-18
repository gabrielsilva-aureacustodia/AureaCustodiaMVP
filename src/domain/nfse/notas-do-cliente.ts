/**
 * As notas fiscais como o CLIENTE as vê (frente G, 18/11/2026 — item 9 do Rogério: "notas acessíveis
 * aos clientes").
 *
 * REGRA PURA: transforma uma linha da fila `aurea.nfse_emissoes` (src/server/db/repositories/nfse.ts)
 * no que a página `/conta/notas` mostra. Nada de rede nem de banco aqui; quem lê o banco, e só do dono,
 * é `src/server/nfse/consulta.ts`.
 *
 * O PORQUÊ DE CINCO ESTADOS E NÃO OS SETE DA FILA — a fila fala a língua da Sefin (pendente, processando,
 * erro, rejeitada…). O cliente só precisa saber uma de cinco coisas:
 *  - `emitida`: a nota existe de verdade (ambiente de PRODUÇÃO, com número e XML) — pode baixar;
 *  - `cancelando`: o cancelamento foi pedido e a Sefin ainda vai registrar — a nota ainda vale no governo;
 *  - `cancelada`: continua listada, com a data, porque sumir com ela esconderia o que aconteceu;
 *  - `falta_cadastro`: a nota foi recusada porque o cadastro do cliente não tem CPF e nome — é a única
 *    recusa que o cliente mesmo resolve, então é a única que a tela explica;
 *  - `em_preparacao`: o resto (na fila, em envio, erro de rede, recusa que só a equipe resolve). A tela NÃO
 *    promete prazo: o `erro` da fila pode voltar sozinho em minutos, e a `rejeitada` por outro motivo pode
 *    levar dias.
 *
 * Nota autorizada só na produção RESTRITA é nota de teste, "sem validade jurídica": para o cliente ela ainda
 * é `em_preparacao` (o envio em produção reemite — `reivindicarParaEnvio`).
 */

import type { Cents, Timestamp } from '@/domain/types'

import { ROTULO_DO_SERVICO, type ServicoNfse } from './codigos'

export type EstadoDaNota = 'emitida' | 'cancelando' | 'cancelada' | 'falta_cadastro' | 'em_preparacao'

/** O que o filtro de dono devolve do banco, já sem e-mail do tomador: ele é a conta logada e não precisa voltar. */
export interface LinhaDaNota {
  id: number
  servico: ServicoNfse
  refFato: string
  valorCents: Cents
  ocorridoEm: Timestamp
  /** 'AAAA-MM-DD', o dia de Brasília do fato. */
  competencia: string
  descricao: string
  quantidadeMoedas: number
  status: string
  ambiente: 'producao' | 'restrita' | null
  numeroNfse: string | null
  chaveAcesso: string | null
  autorizadaEm: Timestamp | null
  canceladaEm: Timestamp | null
  /** `<código>|<justificativa>` como o banco guarda (`marcarParaCancelar`). */
  motivoCancelamento: string | null
  /** O primeiro código de erro da última recusa, quando houve. */
  codigoDoErro: string | null
  temXml: boolean
}

/** A nota na tela: nada de dado interno (justificativa livre, e-mail, número de DPS, tentativas). */
export interface NotaDoCliente {
  id: number
  servico: ServicoNfse
  rotuloDoServico: string
  descricao: string
  valorCents: Cents
  /** 'AAAA-MM-DD'. */
  competencia: string
  ocorridoEm: Timestamp
  quantidadeMoedas: number
  estado: EstadoDaNota
  numero: string | null
  chaveAcesso: string | null
  emitidaEm: Timestamp | null
  canceladaEm: Timestamp | null
  /** Texto pronto para a tela, só quando cancelada. */
  motivoDoCancelamento: string | null
  /** O id da fatura de custódia, para a lista de faturas achar a nota dela. Só para o serviço `custodia`. */
  faturaId: string | null
  /** Pode baixar o XML (e, por ele, montar o PDF). */
  podeBaixar: boolean
}

export function estadoDaNota(l: Pick<LinhaDaNota, 'status' | 'ambiente' | 'temXml' | 'codigoDoErro'>): EstadoDaNota {
  switch (l.status) {
    case 'autorizada':
      return l.ambiente === 'producao' && l.temXml ? 'emitida' : 'em_preparacao'
    case 'cancelando':
      return 'cancelando'
    case 'cancelada':
      return 'cancelada'
    case 'rejeitada':
      return l.codigoDoErro === 'CADASTRO' ? 'falta_cadastro' : 'em_preparacao'
    default:
      // pendente, processando, erro e qualquer valor novo que a fila ganhe: ainda não saiu.
      return 'em_preparacao'
  }
}

/** Os códigos do evento 101101 (1 = erro na emissão; 2 = serviço não prestado; 9 = outros), em palavras. */
export function motivoDoCancelamentoParaOCliente(motivo: string | null): string | null {
  if (!motivo) return null
  const codigo = motivo.split('|')[0]?.trim()
  if (codigo === '1') return 'Erro na emissão'
  if (codigo === '2') return 'Serviço não prestado'
  if (codigo === '9') return 'Outro motivo'
  return null
}

export function paraNotaDoCliente(l: LinhaDaNota): NotaDoCliente {
  const estado = estadoDaNota(l)
  // Cancelada que nunca chegou a ser emitida (cancelada ainda na fila) não tem o que baixar.
  const podeBaixar = l.temXml && (estado === 'emitida' || estado === 'cancelando' || (estado === 'cancelada' && l.numeroNfse !== null))
  return {
    id: l.id,
    servico: l.servico,
    rotuloDoServico: ROTULO_DO_SERVICO[l.servico] ?? 'Serviço',
    descricao: l.descricao,
    valorCents: l.valorCents,
    competencia: l.competencia,
    ocorridoEm: l.ocorridoEm,
    quantidadeMoedas: l.quantidadeMoedas,
    estado,
    numero: estado === 'em_preparacao' || estado === 'falta_cadastro' ? null : l.numeroNfse,
    chaveAcesso: estado === 'em_preparacao' || estado === 'falta_cadastro' ? null : l.chaveAcesso,
    emitidaEm: estado === 'em_preparacao' || estado === 'falta_cadastro' ? null : l.autorizadaEm,
    canceladaEm: estado === 'cancelada' ? l.canceladaEm : null,
    motivoDoCancelamento: estado === 'cancelada' || estado === 'cancelando' ? motivoDoCancelamentoParaOCliente(l.motivoCancelamento) : null,
    faturaId: l.servico === 'custodia' ? l.refFato : null,
    podeBaixar,
  }
}

/** Ordem da página: a mais recente primeiro (o dia do fato, depois o id, que cresce com o pedido). */
export function ordenarNotasDoCliente(notas: readonly NotaDoCliente[]): NotaDoCliente[] {
  return [...notas].sort((a, b) => b.ocorridoEm - a.ocorridoEm || b.id - a.id)
}

/** 'AAAA-MM-DD' → 'DD/MM/AAAA', sem passar por `Date` (que mudaria o dia com o fuso do navegador). */
export function competenciaParaTela(competencia: string): string {
  const [ano, mes, dia] = competencia.split('-')
  return ano && mes && dia ? `${dia}/${mes}/${ano}` : competencia
}

export type FormatoDeNota = 'xml' | 'pdf'

export function formatoDeNotaValido(v: unknown): v is FormatoDeNota {
  return v === 'xml' || v === 'pdf'
}
