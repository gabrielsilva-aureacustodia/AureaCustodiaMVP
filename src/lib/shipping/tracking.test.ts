import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import {
  _resetCacheRastreioParaTestes,
  atualizarRastreiosEmLote,
  consultarRastreioCorreios,
  normalizarCodigoRastreio,
} from './tracking'

describe('Correios — Rastreamento de Encomendas (SRO)', () => {
  const envOriginal = process.env.CORREIOS_TOKEN

  beforeEach(() => {
    _resetCacheRastreioParaTestes()
    process.env.CORREIOS_TOKEN = envOriginal
    vi.restoreAllMocks()
  })

  it('normaliza o código de rastreamento para maiúsculas e sem espaços', () => {
    expect(normalizarCodigoRastreio(' sl123456789br ')).toBe('SL123456789BR')
    expect(normalizarCodigoRastreio('pb987654321br')).toBe('PB987654321BR')
  })

  it('sem token configurado: retorna indisponivel sem inventar dados nem fingir que objeto não existe', async () => {
    delete process.env.CORREIOS_TOKEN
    const res = await consultarRastreioCorreios('SL123456789BR')

    expect(res.codigoRastreio).toBe('SL123456789BR')
    expect(res.statusAtual).toBe('indisponivel')
    expect(res.etapaDescricao).toBe('Não foi possível consultar os Correios agora')
    expect(res.eventos).toHaveLength(0)
    expect(res.erro).toContain('CORREIOS_TOKEN')
  })

  it('com token e resposta da API: mapeia eventos reais', async () => {
    process.env.CORREIOS_TOKEN = 'token_teste_123'
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        objetos: [
          {
            codObjeto: 'SL123456789BR',
            eventos: [
              {
                codigo: 'BDI',
                descricao: 'Objeto entregue ao destinatário',
                dtCriacao: '2026-09-21T14:30:00',
                unidade: { tipo: 'Agência dos Correios', endereco: { cidade: 'São Paulo', uf: 'SP' } },
              },
            ],
          },
        ],
      }),
    } as Response)

    const res = await consultarRastreioCorreios('SL123456789BR')

    expect(res.codigoRastreio).toBe('SL123456789BR')
    expect(res.statusAtual).toBe('entregue')
    expect(res.entregue).toBe(true)
    expect(res.eventos).toHaveLength(1)
    expect(res.eventos[0].cidade).toBe('São Paulo')
  })

  it('com token e 404: identifica que objeto ainda não consta na base dos Correios', async () => {
    process.env.CORREIOS_TOKEN = 'token_teste_123'
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    } as Response)

    const res = await consultarRastreioCorreios('NL999999999BR')

    expect(res.codigoRastreio).toBe('NL999999999BR')
    expect(res.statusAtual).toBe('nao_encontrado')
    expect(res.etapaDescricao).toContain('não consta na base de dados')
  })

  it('armazena resultado em cache evitando requisições redundantes', async () => {
    delete process.env.CORREIOS_TOKEN
    const res1 = await consultarRastreioCorreios('PB112233445BR')
    const res2 = await consultarRastreioCorreios('PB112233445BR')

    expect(res1.codigoRastreio).toBe(res2.codigoRastreio)
    expect(res1.dataUltimaAtualizacao).toBe(res2.dataUltimaAtualizacao)
  })

  it('executa atualização de rastreamento em lote (suporte a Cron Job)', async () => {
    delete process.env.CORREIOS_TOKEN
    const codigos = ['SL111111111BR', 'PB222222222BR', 'SL333333333BR']
    const resultados = await atualizarRastreiosEmLote(codigos)

    expect(Object.keys(resultados).length).toBe(3)
    expect(resultados['SL111111111BR']).toBeDefined()
    expect(resultados['PB222222222BR']).toBeDefined()
    expect(resultados['SL333333333BR']).toBeDefined()
  })
})
