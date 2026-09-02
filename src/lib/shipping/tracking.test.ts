import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import {
  _resetCacheRastreioParaTestes,
  atualizarRastreiosEmLote,
  consultarRastreioCorreios,
  normalizarCodigoRastreio,
} from './tracking'

describe('Correios — Rastreamento de Encomendas (SRO)', () => {
  beforeEach(() => {
    _resetCacheRastreioParaTestes()
  })

  it('normaliza o código de rastreamento para maiúsculas e sem espaços', () => {
    expect(normalizarCodigoRastreio(' sl123456789br ')).toBe('SL123456789BR')
    expect(normalizarCodigoRastreio('pb987654321br')).toBe('PB987654321BR')
  })

  it('consulta status de rastreamento de encomenda', async () => {
    const res = await consultarRastreioCorreios('SL123456789BR')

    expect(res.codigoRastreio).toBe('SL123456789BR')
    expect(res.statusAtual).toBeDefined()
    expect(res.eventos.length).toBeGreaterThan(0)
    expect(res.eventos[0].cidade).toBeDefined()
  })

  it('armazena resultado em cache evitando requisições redundantes', async () => {
    const res1 = await consultarRastreioCorreios('PB112233445BR')
    const res2 = await consultarRastreioCorreios('PB112233445BR')

    expect(res1.codigoRastreio).toBe(res2.codigoRastreio)
    expect(res1.dataUltimaAtualizacao).toBe(res2.dataUltimaAtualizacao)
  })

  it('executa atualização de rastreamento em lote (suporte a Cron Job)', async () => {
    const codigos = ['SL111111111BR', 'PB222222222BR', 'SL333333333BR']
    const resultados = await atualizarRastreiosEmLote(codigos)

    expect(Object.keys(resultados).length).toBe(3)
    expect(resultados['SL111111111BR']).toBeDefined()
    expect(resultados['PB222222222BR']).toBeDefined()
    expect(resultados['SL333333333BR']).toBeDefined()
  })
})
