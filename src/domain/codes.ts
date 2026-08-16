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

/** Próximo código de ativo: 'RO-000042'. Incrementa `seq.coin` (ver nota do topo). */
export function nextCoinCode(seq: Seq): string {
  seq.coin += 1
  return 'RO-' + String(seq.coin).padStart(6, '0')
}

/**
 * Código do recibo derivado do código do ativo: 'RO-000042' -> 'NFT-000042'.
 *
 * Deriva em vez de ter contador próprio porque a relação moeda:recibo é 1:1 —
 * assim os dois números nunca saem de sincronia.
 */
export function nextNftCode(coinCode: string): string {
  return 'NFT-' + coinCode.split('-')[1]
}

/** Próximo protocolo de envio: 'RO-ENV-0001'. Incrementa `seq.envio`. */
export function nextEnvioCode(seq: Seq): string {
  seq.envio += 1
  return 'RO-ENV-' + String(seq.envio).padStart(4, '0')
}

/**
 * Iniciais do nome para o avatar: 'Rogério Pena' -> 'RP'.
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
