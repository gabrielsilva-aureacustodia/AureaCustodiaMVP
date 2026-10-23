/**
 * O pedido de cancelamento de uma NFS-e (evento 101101) — Anexo II v1.01 e XSD `tiposEventos_v1.01`.
 *
 * Nota emitida não se edita: corrige-se cancelando (ou substituindo). O caso que trouxe isto (23/10/2026)
 * é a tarifa de saque: ela é cobrada — e a nota sai — quando o cliente pede o saque, porque é o dia em
 * que o dinheiro se move (contador, 23/10/2026); se a equipe recusa o saque, a tarifa volta ao saldo e
 * o serviço não foi prestado (motivo 2). Em BH o cancelamento direto vale até 730 dias da emissão
 * (Portaria SMFA 75/2025); depois disso, só por análise fiscal.
 *
 * REGRA PURA. Quem assina (o `infPedReg`, como a DPS) e envia é src/server/nfse/.
 */

import type { Timestamp } from '@/domain/types'

import { EMISSOR } from './codigos'
import { NAMESPACE_NFSE, dataHoraBrasilia, textoFiscal } from './dps'

export const EVENTO_CANCELAMENTO = '101101'

/** 1 = erro na emissão; 2 = serviço não prestado; 9 = outros. */
export type MotivoCancelamento = '1' | '2' | '9'

/** Id do pedido: "PRE" + chave de acesso (50) + código do evento (6) — 59 posições. */
export function idDoPedidoDeEvento(chaveAcesso: string, evento: string = EVENTO_CANCELAMENTO): string {
  return `PRE${chaveAcesso}${evento}`
}

export function montarCancelamento(p: {
  chaveAcesso: string
  tpAmb: 1 | 2
  motivo: MotivoCancelamento
  /** 15 a 255 caracteres. */
  justificativa: string
  emitidoEm: Timestamp
  verAplic: string
}): { id: string; xml: string } {
  const id = idDoPedidoDeEvento(p.chaveAcesso)
  let justificativa = textoFiscal(p.justificativa, 255)
  if (justificativa.length < 15) justificativa = `${justificativa} - CANCELAMENTO`.slice(0, 255)
  const xml =
    `<pedRegEvento xmlns="${NAMESPACE_NFSE}" versao="1.01"><infPedReg Id="${id}">` +
    `<tpAmb>${p.tpAmb}</tpAmb>` +
    `<verAplic>${p.verAplic.slice(0, 20)}</verAplic>` +
    `<dhEvento>${dataHoraBrasilia(p.emitidoEm)}</dhEvento>` +
    `<CNPJAutor>${EMISSOR.cnpj}</CNPJAutor>` +
    `<chNFSe>${p.chaveAcesso}</chNFSe>` +
    `<e101101><xDesc>Cancelamento de NFS-e</xDesc><cMotivo>${p.motivo}</cMotivo><xMotivo>${justificativa}</xMotivo></e101101>` +
    `</infPedReg></pedRegEvento>`
  return { id, xml }
}
