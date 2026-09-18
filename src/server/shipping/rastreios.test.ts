/**
 * O job de rastreio também acompanha a retirada postada (E8).
 *
 * Até aqui ele só olhava o que CHEGA à custódia. O código de rastreio de uma retirada era gravado
 * quando a moeda era postada e nunca mais consultado — o painel de logística mostrava a retirada
 * sem nenhuma informação de onde o objeto estava.
 *
 * Estes testes usam o caminho sem banco (`bancoConfigurado()` falso), que é o que a suíte tem por
 * padrão: eles provam a SELEÇÃO — quais retiradas entram na consulta e quais ficam de fora — e a
 * resiliência do job. A gravação com `retirada_id` é provada no `payments.test.ts`, que sobe o
 * Postgres embutido com a migration 030 aplicada.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const { atualizarRastreiosEmLote, repositorioRetiradas } = vi.hoisted(() => ({
  atualizarRastreiosEmLote: vi.fn(),
  repositorioRetiradas: vi.fn(),
}))

vi.mock('@/lib/shipping', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/shipping')>()),
  atualizarRastreiosEmLote,
}))
vi.mock('@/server/shipping/retiradas', () => ({ repositorioRetiradas }))

import type { Retirada, StatusRetirada } from '@/domain/types'
import { mutateState } from '@/server/state'

import { atualizarRastreiosPendentes } from './rastreios'

function retirada(id: string, status: StatusRetirada, codigo: string | null): Retirada {
  const agora = Date.now()
  return {
    id,
    coinId: `RO-${id}`,
    reciboCodigo: `REC-${id}`,
    userEmail: 'gabrielsilva@testeaurea.com.br',
    modalidade: 'comum',
    status,
    valorTaxaCents: 5_000,
    endereco: ENDERECO,
    solicitadoEm: agora,
    dataLimiteD30: agora + 30 * 86_400_000,
    historico: [],
    updatedAt: agora,
    ...(codigo ? { codigoRastreio: codigo } : {}),
  }
}

const ENDERECO = {
  nome: 'Gabriel Silva',
  cpfOuCnpj: '529.982.247-25',
  telefone: '(11) 98765-4321',
  logradouro: 'Rua das Moedas',
  numero: '10',
  complemento: '',
  bairro: 'Centro',
  cidade: 'São Paulo',
  uf: 'SP',
  cep: '01001-000',
}

function listandoRetiradas(lista: Retirada[]) {
  repositorioRetiradas.mockReturnValue({
    listarTodas: vi.fn().mockResolvedValue(lista),
  })
}

describe('atualizarRastreiosPendentes acompanha envios e retiradas (E8)', () => {
  beforeEach(async () => {
    atualizarRastreiosEmLote.mockReset()
    atualizarRastreiosEmLote.mockResolvedValue({})
    repositorioRetiradas.mockReset()
    listandoRetiradas([])
    // Sem envios no estado: o foco destes testes é a seleção das retiradas.
    await mutateState((s) => {
      s.envios = []
    })
  })

  it('consulta a retirada postada com código', async () => {
    listandoRetiradas([retirada('RET-1', 'postada', 'BR123456789BR')])

    const r = await atualizarRastreiosPendentes()

    expect(atualizarRastreiosEmLote).toHaveBeenCalledWith(['BR123456789BR'])
    expect(r.retiradasVerificadas).toBe(1)
  })

  it('não consulta retirada sem código, nem entregue, nem cancelada', async () => {
    listandoRetiradas([
      retirada('RET-2', 'postada', null),
      retirada('RET-3', 'entregue', 'BR999999999BR'),
      retirada('RET-4', 'cancelada', 'BR888888888BR'),
      retirada('RET-5', 'solicitada', 'BR777777777BR'),
      retirada('RET-6', 'paga', 'BR666666666BR'),
    ])

    const r = await atualizarRastreiosPendentes()

    expect(r.retiradasVerificadas).toBe(0)
    expect(atualizarRastreiosEmLote).not.toHaveBeenCalled()
  })

  it('uma chamada só aos Correios para envios e retiradas', async () => {
    await mutateState((s) => {
      s.envios = [
        {
          protocolo: 'RO-ENV-1',
          userEmail: 'gabrielsilva@testeaurea.com.br',
          etapaAtual: 'Em trânsito',
          codigoRastreio: 'BR111111111BR',
        } as never,
      ]
    })
    listandoRetiradas([retirada('RET-7', 'postada', 'BR222222222BR')])

    await atualizarRastreiosPendentes()

    expect(atualizarRastreiosEmLote).toHaveBeenCalledTimes(1)
    expect(atualizarRastreiosEmLote).toHaveBeenCalledWith([
      'BR111111111BR',
      'BR222222222BR',
    ])
  })

  it('repositório de retiradas indisponível não derruba o job dos envios', async () => {
    repositorioRetiradas.mockReturnValue({
      listarTodas: vi.fn().mockRejectedValue(new Error('banco fora do ar')),
    })
    await mutateState((s) => {
      s.envios = [
        {
          protocolo: 'RO-ENV-2',
          userEmail: 'gabrielsilva@testeaurea.com.br',
          etapaAtual: 'Em trânsito',
          codigoRastreio: 'BR333333333BR',
        } as never,
      ]
    })

    const r = await atualizarRastreiosPendentes()

    expect(atualizarRastreiosEmLote).toHaveBeenCalledWith(['BR333333333BR'])
    expect(r.verificados).toBe(1)
    expect(r.retiradasVerificadas).toBe(0)
  })

  it('sem envio e sem retirada, devolve zerado sem chamar os Correios', async () => {
    const r = await atualizarRastreiosPendentes()

    expect(atualizarRastreiosEmLote).not.toHaveBeenCalled()
    expect(r.verificados).toBe(0)
    expect(r.retiradasVerificadas).toBe(0)
    expect(r.retiradasGravadas).toBe(0)
  })
})
