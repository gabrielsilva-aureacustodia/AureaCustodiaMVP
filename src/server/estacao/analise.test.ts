import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mutateStateMock, getStateMock } = vi.hoisted(() => ({
  mutateStateMock: vi.fn(),
  getStateMock: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('@/server/state', () => ({ mutateState: mutateStateMock, getState: getStateMock }))

import { conferirCadeia } from '@/domain/analise'
import { GENESIS } from '@/domain/hash'
import { seedState } from '@/domain/seed'
import type { AppState, Envio } from '@/domain/types'

import { abrirAnalise, fecharAnalise, filaDeAnalise } from './analise'

let state: AppState

const CLIENTE = 'rogeriopena@testeaurea.com.br'
const OPERADOR = 'gabriel.silva@aureacustodia.com.br'

function envio(parcial: Partial<Envio> = {}): Envio {
  return {
    protocolo: 'RO-ENV-0001',
    userEmail: CLIENTE,
    tipoMoeda: 'Entrega da Bandeira Olímpica',
    ano: 2016,
    quantidade: 2,
    codigoRastreio: 'BR123456789BR',
    dataPostagem: 1757000000000,
    dataRecebimento: 1757400000000,
    etapaAtual: 'Recebido pela custódia',
    createdAt: 1756900000000,
    codigosAtivosGerados: [],
    ...parcial,
  }
}

beforeEach(() => {
  state = seedState()
  mutateStateMock.mockReset()
  getStateMock.mockReset()
  mutateStateMock.mockImplementation(async (mutator: (current: AppState) => unknown) => ({
    state,
    result: await mutator(state),
  }))
  getStateMock.mockImplementation(async () => state)
})

describe('filaDeAnalise', () => {
  it('mostra o que está recebido e o que já está em análise, e ignora o resto', async () => {
    state.envios = [
      envio({ protocolo: 'RO-ENV-0001', etapaAtual: 'Recebido pela custódia' }),
      envio({ protocolo: 'RO-ENV-0002', etapaAtual: 'Em análise física' }),
      envio({ protocolo: 'RO-ENV-0003', etapaAtual: 'Envio postado' }),
      envio({ protocolo: 'RO-ENV-0004', etapaAtual: 'Recibo emitido' }),
    ]
    const fila = await filaDeAnalise()
    expect(fila.map((f) => f.protocolo)).toEqual(['RO-ENV-0001', 'RO-ENV-0002'])
  })

  it('traz o nome do cliente, não só o e-mail — é o que o operador confere no pacote', async () => {
    state.envios = [envio()]
    const [item] = await filaDeAnalise()
    expect(item.cliente).toBe('Rogério Pena')
    expect(item.quantidade).toBe(2)
  })
})

describe('abrirAnalise', () => {
  it('move o envio para "Em análise física"', async () => {
    state.envios = [envio()]
    expect(await abrirAnalise('RO-ENV-0001')).toEqual({ ok: true })
    expect(state.envios[0].etapaAtual).toBe('Em análise física')
  })

  it('é idempotente: o reenvio da fila offline não pode virar erro', async () => {
    state.envios = [envio({ etapaAtual: 'Em análise física' })]
    expect(await abrirAnalise('RO-ENV-0001')).toEqual({ ok: true })
  })

  it('recusa envio que ainda nem foi postado', async () => {
    state.envios = [envio({ etapaAtual: 'Protocolo gerado' })]
    const r = await abrirAnalise('RO-ENV-0001')
    expect(r).toMatchObject({ ok: false, status: 409 })
  })

  it('recusa protocolo inexistente', async () => {
    state.envios = []
    expect(await abrirAnalise('RO-ENV-9999')).toMatchObject({ ok: false, status: 404 })
  })
})

describe('fecharAnalise', () => {
  it('cria uma moeda por veredito aprovado, com recibo e o hash REAL da análise', async () => {
    state.envios = [envio({ quantidade: 2 })]
    const antes = state.users[CLIENTE].coins.length

    const r = await fecharAnalise({
      protocolo: 'RO-ENV-0001',
      operador: OPERADOR,
      moedas: [
        { pesoMg: 27000, veredito: 'aprovada', caixa: 'EB-001', posicao: 1 },
        { pesoMg: 27020, veredito: 'aprovada', caixa: 'EB-001', posicao: 2 },
      ],
    })

    expect(r.ok).toBe(true)
    expect(state.users[CLIENTE].coins).toHaveLength(antes + 2)

    const novas = state.users[CLIENTE].coins.slice(antes)
    for (const coin of novas) {
      // 64 hexadecimais: SHA-256 de verdade, não o '0xA1B2...C3D4' de genHash().
      expect(coin.nft.hash).toMatch(/^[0-9a-f]{64}$/)
      expect(coin.protocolo).toBe('RO-ENV-0001')
      expect(coin.statusFisico).toBe('Recebido')
    }
    expect(state.envios[0].etapaAtual).toBe('Recibo emitido')
    expect(state.envios[0].codigosAtivosGerados).toEqual(novas.map((c) => c.id))
  })

  it('o hash do recibo é o hash da análise que aprovou a moeda', async () => {
    state.envios = [envio({ quantidade: 1 })]
    const antes = state.users[CLIENTE].coins.length

    await fecharAnalise({
      protocolo: 'RO-ENV-0001',
      operador: OPERADOR,
      moedas: [{ pesoMg: 27000, veredito: 'aprovada', caixa: 'EB-001', posicao: 1 }],
    })

    const coin = state.users[CLIENTE].coins[antes]
    const analise = state.analises.find((a) => a.codigoMoeda === coin.id)
    expect(analise).toBeDefined()
    expect(coin.nft.hash).toBe(analise?.hash)
    expect(analise?.codigoRecibo).toBe(coin.nft.codigo)
  })

  it('moeda recusada NÃO vira ativo, mas deixa registro com o motivo', async () => {
    state.envios = [envio({ quantidade: 2 })]
    const antes = state.users[CLIENTE].coins.length

    const r = await fecharAnalise({
      protocolo: 'RO-ENV-0001',
      operador: OPERADOR,
      moedas: [
        { pesoMg: 27000, veredito: 'aprovada', caixa: 'EB-001', posicao: 1 },
        { pesoMg: 24000, veredito: 'recusada', motivoRecusa: 'Peso fora da tolerância' },
      ],
    })

    expect(r).toMatchObject({ ok: true, dados: { aprovadas: 1, recusadas: 1 } })
    expect(state.users[CLIENTE].coins).toHaveLength(antes + 1)

    const recusa = state.analises.find((a) => a.veredito === 'recusada')
    expect(recusa?.codigoMoeda).toBeNull()
    expect(recusa?.motivoRecusa).toBe('Peso fora da tolerância')
    // Sem caixa: o que foi recusado volta para o cliente, não entra no cofre.
    expect(recusa?.caixa).toBeNull()
  })

  it('a corrente de hashes fica íntegra e encadeada do genesis', async () => {
    state.envios = [envio({ quantidade: 3 })]
    await fecharAnalise({
      protocolo: 'RO-ENV-0001',
      operador: OPERADOR,
      moedas: [
        { pesoMg: 27000, veredito: 'aprovada', caixa: 'EB-001', posicao: 1 },
        { pesoMg: 24000, veredito: 'recusada', motivoRecusa: 'Moeda danificada' },
        { pesoMg: 27010, veredito: 'aprovada', caixa: 'EB-001', posicao: 2 },
      ],
    })

    expect(state.analises).toHaveLength(3)
    expect(state.analises[0].hashAnterior).toBe(GENESIS)
    expect(conferirCadeia(state.analises, GENESIS)).toBe(-1)
  })

  it('alterar um registro gravado quebra a corrente de forma detectável', async () => {
    state.envios = [envio({ quantidade: 2 })]
    await fecharAnalise({
      protocolo: 'RO-ENV-0001',
      operador: OPERADOR,
      moedas: [
        { pesoMg: 27000, veredito: 'aprovada', caixa: 'EB-001', posicao: 1 },
        { pesoMg: 27010, veredito: 'aprovada', caixa: 'EB-001', posicao: 2 },
      ],
    })

    state.analises[0].pesoMg = 99000
    expect(conferirCadeia(state.analises, GENESIS)).toBe(0)
  })

  it('o protocolo da análise tem identidade própria, distinta do código da moeda', async () => {
    state.envios = [envio({ quantidade: 1 })]
    await fecharAnalise({
      protocolo: 'RO-ENV-0001',
      operador: OPERADOR,
      moedas: [{ pesoMg: 27000, veredito: 'aprovada' }],
    })
    expect(state.analises[0].protocolo).toMatch(/^RO-ANL-\d{4}$/)
    expect(state.analises[0].protocolo).not.toBe(state.analises[0].codigoMoeda)
  })

  it('recusa lista com tamanho diferente da quantidade do envio (D7b: o envio inteiro, de uma vez)', async () => {
    state.envios = [envio({ quantidade: 3 })]
    const r = await fecharAnalise({
      protocolo: 'RO-ENV-0001',
      operador: OPERADOR,
      moedas: [{ pesoMg: 27000, veredito: 'aprovada' }],
    })
    expect(r).toMatchObject({ ok: false, status: 422 })
    expect(state.analises).toHaveLength(0)
  })

  it('recusa fechar duas vezes — o segundo envio da fila offline não emite moeda de novo', async () => {
    state.envios = [envio({ quantidade: 1 })]
    const moedas = [{ pesoMg: 27000, veredito: 'aprovada' as const }]
    await fecharAnalise({ protocolo: 'RO-ENV-0001', operador: OPERADOR, moedas })
    const depoisDoPrimeiro = state.users[CLIENTE].coins.length

    const r = await fecharAnalise({ protocolo: 'RO-ENV-0001', operador: OPERADOR, moedas })
    expect(r).toMatchObject({ ok: false, status: 409 })
    expect(state.users[CLIENTE].coins).toHaveLength(depoisDoPrimeiro)
    expect(state.analises).toHaveLength(1)
  })

  it('recalcula a custódia pela faixa do acervo inteiro e a deixa pendente', async () => {
    state.envios = [envio({ quantidade: 1 })]
    await fecharAnalise({
      protocolo: 'RO-ENV-0001',
      operador: OPERADOR,
      moedas: [{ pesoMg: 27000, veredito: 'aprovada' }],
    })
    const cobranca = state.custodyCharges[CLIENTE]
    expect(cobranca.totalMoedas).toBe(state.users[CLIENTE].coins.length)
    expect(cobranca.statusPagamento).toBe('Pendente')
  })

  it('envio 100% recusado não gera cobrança nova — não se cobra custódia do que voltou', async () => {
    state.envios = [envio({ quantidade: 1 })]
    const antes = { ...state.custodyCharges[CLIENTE] }
    await fecharAnalise({
      protocolo: 'RO-ENV-0001',
      operador: OPERADOR,
      moedas: [{ pesoMg: 24000, veredito: 'recusada', motivoRecusa: 'Não é a moeda declarada' }],
    })
    expect(state.custodyCharges[CLIENTE]).toEqual(antes)
    expect(state.envios[0].etapaAtual).toBe('Recibo emitido')
  })

  it('o aprovador repete o operador enquanto o papel for único (D7c)', async () => {
    state.envios = [envio({ quantidade: 1 })]
    await fecharAnalise({
      protocolo: 'RO-ENV-0001',
      operador: OPERADOR,
      moedas: [{ pesoMg: 27000, veredito: 'aprovada' }],
    })
    expect(state.analises[0].aprovador).toBe(OPERADOR)
    expect(state.analises[0].operador).toBe(OPERADOR)
  })

  it('o horário da validação é o do servidor, não o que a bancada mandar', async () => {
    state.envios = [envio({ quantidade: 1 })]
    const antes = Date.now()
    await fecharAnalise({
      protocolo: 'RO-ENV-0001',
      operador: OPERADOR,
      // Nenhum campo de horário existe na entrada — é essa a garantia.
      moedas: [{ pesoMg: 27000, veredito: 'aprovada' }],
    })
    expect(state.analises[0].validadoEm).toBeGreaterThanOrEqual(antes)
    expect(state.analises[0].validadoEm).toBeLessThanOrEqual(Date.now())
  })
})
