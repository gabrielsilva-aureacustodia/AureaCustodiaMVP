/**
 * Geradores de código e hash.
 *
 * Port fiel de aurea-mvp-teste.html (linhas 795-801 e 921).
 *
 * ATENÇÃO: `nextCoinCode` e `nextEnvioCode` MUTAM o objeto `seq` recebido.
 * Isso é proposital e o sistema inteiro depende disso — o contador vive dentro
 * do estado persistido (`state.seq`), então incrementá-lo ao emitir o código é
 * o que garante que nenhum RO-000042 nasça duas vezes. Quem chama já está
 * dentro de uma transação de escrita do estado.
 */

import type { Seq } from '@/domain/types'

/**
 * Hash curto de recibo, no formato '0xA1B2...C3D4'.
 *
 * SIMULADO: não há blockchain por trás. Existe para o recibo ter a cara de um
 * registro on-chain na interface e no PDF.
 */
export function genHash(): string {
  const hex = (): string =>
    Math.floor(Math.random() * 65536)
      .toString(16)
      .toUpperCase()
      .padStart(4, '0')
  return '0x' + hex() + '...' + hex()
}

/** Próximo código de moeda: 'RO-000042'. Incrementa `seq.coin` (ver nota do topo). */
export function nextCoinCode(seq: Seq): string {
  seq.coin += 1
  return 'RO-' + String(seq.coin).padStart(6, '0')
}

/**
 * Código do recibo derivado do código da moeda: 'RO-000042' -> 'REC-000042'.
 *
 * Deriva em vez de ter contador próprio porque a relação moeda:recibo é 1:1 —
 * assim os dois números nunca saem de sincronia.
 *
 * O prefixo era 'NFT-' até 10/09/2026 (D-4). Ele aparecia no certificado, no
 * PDF baixado, na tabela de auditoria e nos relatórios do contador — era a
 * palavra proibida mais visível do produto inteiro. A troca só é possível de
 * graça porque `STORE_KEY` subiu para `aurea-market-v7` no mesmo commit e o
 * banco recomeça do seed; código já gravado não é reescrito por ninguém.
 */
export function nextCodigoRecibo(coinCode: string): string {
  return 'REC-' + coinCode.split('-')[1]
}

/** Próximo protocolo de envio: 'RO-ENV-0001'. Incrementa `seq.envio`. */
export function nextEnvioCode(seq: Seq): string {
  seq.envio += 1
  return 'RO-ENV-' + String(seq.envio).padStart(4, '0')
}

/** Próximo código de plano de custódia: 'PLC-000001'. Incrementa `seq.planoCustodia`. */
export function nextPlanoCode(seq: Seq): string {
  seq.planoCustodia = (seq.planoCustodia || 0) + 1
  return 'PLC-' + String(seq.planoCustodia).padStart(6, '0')
}

/**
 * Iniciais do nome para o avatar: 'Rogério Siqueira' -> 'RS'.
 * No máximo duas letras, porque é o que cabe no círculo.
 */
export function initials(n: string): string {
  return n
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

/**
 * Id de oferta de compra, no formato da linha 1720 do monolito.
 *
 * Mora aqui, e não em `server/actions/market.ts`, desde 28/09/2026: três
 * lugares criam ordem de compra agora — a publicação comum, a publicação
 * pré-paga com saldo e o liquidador da conciliação, que cria a ordem quando o
 * gateway confirma o pagamento. Um arquivo `'use server'` só exporta função
 * assíncrona, então a cópia privada de lá não podia ser compartilhada.
 */
export function novoBidId(): string {
  return 'BID-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6)
}
