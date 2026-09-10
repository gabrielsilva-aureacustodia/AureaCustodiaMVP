/**
 * O VETOR CONGELADO da análise.
 *
 * Este arquivo é o que impede a fórmula do hash de mudar por acidente. Os dois
 * hashes abaixo estão escritos à mão, em hexadecimal, e foram conferidos
 * contra o `node:crypto` — não são o resultado do próprio código sob teste.
 *
 * SE UM DESTES TESTES FALHAR, a pergunta não é "qual o valor novo?". É:
 * alguém mexeu em CAMPOS_DA_ANALISE, na ordem dela, ou na forma canônica de um
 * campo. Recibo já emitido deixou de conferir. Reverta, ou escreva a migration
 * que recalcula a cadeia inteira e registra a troca.
 *
 * OS DOIS HASHES MUDARAM UMA VEZ, em 10/09/2026, e a razão fica registrada
 * aqui para que ninguém tome isso por precedente. A fórmula NÃO mudou: o que
 * mudou foi a ENTRADA — `codigoRecibo` passou de 'NFT-000042' para
 * 'REC-000042' (D-4), e `codigoRecibo` é um dos campos da fórmula. Nenhum
 * recibo gravado deixou de conferir, porque `STORE_KEY` subiu para
 * `aurea-market-v7` no mesmo commit e o banco recomeçou do seed. Os valores
 * abaixo foram recalculados com `node:crypto`, não copiados da saída do código
 * sob teste.
 */

import { describe, expect, it } from 'vitest'

import {
  CAMPOS_DA_ANALISE,
  conferirCadeia,
  encadearAnalise,
  hashDaAnalise,
  nextAnaliseCode,
  ultimoHashDeAnalise,
  type AnalisePendente,
} from '@/domain/analise'
import { GENESIS } from '@/domain/hash'
import type { Analise, Seq } from '@/domain/types'

const APROVADA: AnalisePendente = {
  protocolo: 'RO-ANL-0001',
  protocoloEnvio: 'RO-ENV-0001',
  codigoMoeda: 'RO-000042',
  codigoRecibo: 'REC-000042',
  tipoMoeda: 'Entrega da Bandeira Olímpica',
  ano: 2016,
  pesoMg: 27000,
  veredito: 'aprovada',
  motivoRecusa: null,
  operador: 'gabriel.silva@aureacustodia.com.br',
  aprovador: 'gabriel.silva@aureacustodia.com.br',
  caixa: 'EB-001',
  posicao: 7,
  validadoEm: 1757520000000,
  caminhoVideo: 'analises/RO-000042/RO-ANL-0001.webm',
}

const RECUSADA: AnalisePendente = {
  protocolo: 'RO-ANL-0002',
  protocoloEnvio: 'RO-ENV-0001',
  codigoMoeda: null,
  codigoRecibo: null,
  tipoMoeda: 'Direitos Humanos',
  ano: 1998,
  pesoMg: 26800,
  veredito: 'recusada',
  motivoRecusa: 'Peso fora da tolerância',
  operador: 'gabriel.silva@aureacustodia.com.br',
  aprovador: 'gabriel.silva@aureacustodia.com.br',
  caixa: null,
  posicao: null,
  validadoEm: 1757520060000,
  caminhoVideo: null,
}

const HASH_1 = '641be50c7b9aca325ea7ce9df9c07abe35b51f1e01cf5685bd50b265bc9d4802'
const HASH_2 = '911c01355b01a35498db4482a2525f24cc20dacd87004cfa545bcc8ce2690f33'

describe('a fórmula do hash da análise', () => {
  it('produz o hash congelado para a análise aprovada', () => {
    expect(hashDaAnalise(APROVADA, GENESIS)).toBe(HASH_1)
  })

  it('encadeia a segunda análise na primeira', () => {
    expect(hashDaAnalise(RECUSADA, HASH_1)).toBe(HASH_2)
  })

  it('é determinística: a mesma entrada dá o mesmo hash toda vez', () => {
    expect(hashDaAnalise(APROVADA, GENESIS)).toBe(hashDaAnalise({ ...APROVADA }, GENESIS))
  })

  it('a ordem dos campos é a que está congelada', () => {
    expect([...CAMPOS_DA_ANALISE]).toEqual([
      'protocolo',
      'protocoloEnvio',
      'codigoMoeda',
      'codigoRecibo',
      'tipoMoeda',
      'ano',
      'pesoMg',
      'veredito',
      'motivoRecusa',
      'operador',
      'aprovador',
      'caixa',
      'posicao',
      'validadoEm',
      'caminhoVideo',
    ])
  })

  it('um miligrama a mais muda o hash', () => {
    expect(hashDaAnalise({ ...APROVADA, pesoMg: 27001 }, GENESIS)).not.toBe(HASH_1)
  })

  it('trocar o operador muda o hash', () => {
    expect(hashDaAnalise({ ...APROVADA, operador: 'outro@aureacustodia.com.br' }, GENESIS)).not.toBe(
      HASH_1,
    )
  })

  it('campo nulo e string vazia produzem o mesmo texto canônico — e é por isso que o motivo da recusa nunca é string vazia', () => {
    const comNulo = hashDaAnalise({ ...RECUSADA, caixa: null }, HASH_1)
    const comVazio = hashDaAnalise({ ...RECUSADA, caixa: '' }, HASH_1)
    expect(comNulo).toBe(comVazio)
  })
})

describe('a corrente', () => {
  const cadeia: Analise[] = [
    encadearAnalise(APROVADA, GENESIS),
    encadearAnalise(RECUSADA, HASH_1),
  ]

  it('encadeada do genesis, está íntegra', () => {
    expect(conferirCadeia(cadeia, GENESIS)).toBe(-1)
  })

  it('devolve o hash da última análise', () => {
    expect(ultimoHashDeAnalise(cadeia)).toBe(HASH_2)
    expect(ultimoHashDeAnalise([])).toBeNull()
  })

  it('alterar um registro antigo quebra a corrente de forma detectável', () => {
    const adulterada: Analise[] = [{ ...cadeia[0], pesoMg: 99000 }, cadeia[1]]
    expect(conferirCadeia(adulterada, GENESIS)).toBe(0)
  })

  it('alterar o registro do meio acusa no próprio registro', () => {
    const tres: Analise[] = [
      cadeia[0],
      { ...cadeia[1], motivoRecusa: 'outro motivo' },
      encadearAnalise({ ...APROVADA, protocolo: 'RO-ANL-0003' }, HASH_2),
    ]
    expect(conferirCadeia(tres, GENESIS)).toBe(1)
  })
})

describe('nextAnaliseCode', () => {
  it('começa em RO-ANL-0001 e incrementa o contador', () => {
    const seq: Seq = { coin: 0, envio: 0 }
    expect(nextAnaliseCode(seq)).toBe('RO-ANL-0001')
    expect(nextAnaliseCode(seq)).toBe('RO-ANL-0002')
    expect(seq.analise).toBe(2)
  })

  it('continua de onde o contador parou', () => {
    const seq: Seq = { coin: 0, envio: 0, analise: 41 }
    expect(nextAnaliseCode(seq)).toBe('RO-ANL-0042')
  })
})
