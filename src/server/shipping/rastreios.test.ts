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

import type { Envio, Retirada, StatusRetirada } from '@/domain/types'
import type { EventoRastreio, RastreioObjetoResult, StatusRastreioCorreios } from '@/lib/shipping'
import { getState, mutateState } from '@/server/state'

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

const atualizar = vi.fn()

function listandoRetiradas(lista: Retirada[]) {
  // O repositório dublê guarda o que o job grava, para o teste ler o resultado como o painel leria.
  const guardadas = new Map(lista.map((r) => [r.id, structuredClone(r)]))
  atualizar.mockReset()
  atualizar.mockImplementation(async (r: Retirada) => {
    guardadas.set(r.id, structuredClone(r))
  })
  repositorioRetiradas.mockReturnValue({
    listarTodas: vi.fn().mockResolvedValue(lista),
    buscarPorId: vi.fn(async (id: string) => structuredClone(guardadas.get(id) ?? null)),
    atualizar,
  })
  return guardadas
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

  it('consulta também a retirada em separação com código: o código nasce na etiqueta (22/10/2026)', async () => {
    listandoRetiradas([retirada('RET-8', 'separacao', 'AP123456789BR')])

    const r = await atualizarRastreiosPendentes()

    expect(atualizarRastreiosEmLote).toHaveBeenCalledWith(['AP123456789BR'])
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

/*
 * O AVANÇO AUTOMÁTICO (22/10/2026, acordo 3 do plano CWS).
 *
 * Com o contrato, o código de rastreio nasce na pré-postagem — o envio fica em "Protocolo gerado" e a
 * retirada em `separacao` já com o código. Quem descobre que o objeto foi postado é o rastreio. Os
 * testes provam que o job avança só quando os Correios atestam a postagem, com a data do evento dos
 * Correios e não a da rodada, e que nunca avança por cima do que alguém já mexeu.
 */

const DIA = 86_400_000
const ETIQUETA = Date.parse('2026-10-20T10:00:00-03:00')
const POSTAGEM = Date.parse('2026-10-21T09:30:00-03:00')
const TRANSITO = Date.parse('2026-10-22T08:00:00-03:00')
const ENTREGA = Date.parse('2026-10-23T14:00:00-03:00')

function evento(status: StatusRastreioCorreios, dataHora: number): EventoRastreio {
  return { status, dataHora, descricao: status, unidadeLocal: 'AGF', cidade: 'Belo Horizonte', uf: 'MG' }
}

function retrato(codigo: string, eventos: EventoRastreio[]): RastreioObjetoResult {
  const ordenados = [...eventos].sort((a, b) => b.dataHora - a.dataHora)
  return {
    codigoRastreio: codigo,
    statusAtual: ordenados[0].status,
    etapaDescricao: ordenados[0].descricao,
    dataUltimaAtualizacao: ordenados[0].dataHora,
    eventos: ordenados,
    entregue: ordenados.some((e) => e.status === 'entregue'),
  }
}

function indisponivel(codigo: string): RastreioObjetoResult {
  return {
    codigoRastreio: codigo,
    statusAtual: 'indisponivel',
    etapaDescricao: 'Não foi possível consultar os Correios agora',
    dataUltimaAtualizacao: Date.now(),
    eventos: [],
    entregue: false,
    erro: 'fora do ar',
  }
}

function envioPrePostado(protocolo: string, codigo: string, extra: Partial<Envio> = {}): Envio {
  return {
    protocolo,
    userEmail: 'gabrielsilva@testeaurea.com.br',
    tipoMoeda: 'Entrega da Bandeira Olímpica',
    ano: 2016,
    quantidade: 1,
    codigoRastreio: codigo,
    dataPostagem: null,
    dataRecebimento: null,
    etapaAtual: 'Protocolo gerado',
    createdAt: ETIQUETA - DIA,
    codigosAtivosGerados: [],
    ...extra,
  }
}

async function comEnvios(lista: Envio[]) {
  await mutateState((s) => {
    s.envios = lista
  })
}

async function envioNoEstado(protocolo: string): Promise<Envio | undefined> {
  return (await getState()).envios.find((e) => e.protocolo === protocolo)
}

describe('o job avança o envio quando os Correios registram a postagem', () => {
  beforeEach(async () => {
    atualizarRastreiosEmLote.mockReset()
    repositorioRetiradas.mockReset()
    listandoRetiradas([])
    await comEnvios([])
  })

  it('"Protocolo gerado" → "Envio postado", com a data do primeiro evento depois da etiqueta', async () => {
    await comEnvios([envioPrePostado('RO-ENV-A1', 'AP100000001BR')])
    atualizarRastreiosEmLote.mockResolvedValue({
      AP100000001BR: retrato('AP100000001BR', [
        evento('aguardando_postagem', ETIQUETA),
        evento('postado', POSTAGEM),
        evento('em_transito', TRANSITO),
      ]),
    })

    const r = await atualizarRastreiosPendentes()

    expect(r.enviosPostados).toBe(1)
    const envio = await envioNoEstado('RO-ENV-A1')
    expect(envio?.etapaAtual).toBe('Envio postado')
    // A data é a do evento dos Correios, não a hora em que o job rodou.
    expect(envio?.dataPostagem).toBe(POSTAGEM)
  })

  it('etiqueta emitida ainda não é postagem: o envio fica em "Protocolo gerado"', async () => {
    await comEnvios([envioPrePostado('RO-ENV-A2', 'AP100000002BR')])
    atualizarRastreiosEmLote.mockResolvedValue({
      AP100000002BR: retrato('AP100000002BR', [evento('aguardando_postagem', ETIQUETA)]),
    })

    const r = await atualizarRastreiosPendentes()

    expect(r.enviosPostados).toBe(0)
    expect((await envioNoEstado('RO-ENV-A2'))?.etapaAtual).toBe('Protocolo gerado')
  })

  it('etiqueta cancelada e Correios fora do ar também não avançam', async () => {
    await comEnvios([envioPrePostado('RO-ENV-A3', 'AP100000003BR'), envioPrePostado('RO-ENV-A4', 'AP100000004BR')])
    atualizarRastreiosEmLote.mockResolvedValue({
      AP100000003BR: retrato('AP100000003BR', [evento('aguardando_postagem', ETIQUETA), evento('cancelado', POSTAGEM)]),
      AP100000004BR: indisponivel('AP100000004BR'),
    })

    const r = await atualizarRastreiosPendentes()

    expect(r.enviosPostados).toBe(0)
    expect((await envioNoEstado('RO-ENV-A3'))?.etapaAtual).toBe('Protocolo gerado')
    expect((await envioNoEstado('RO-ENV-A4'))?.etapaAtual).toBe('Protocolo gerado')
  })

  it('não mexe em envio já postado à mão, nem em envio adiante na máquina de estados', async () => {
    const manual = Date.parse('2026-10-21T18:00:00-03:00')
    await comEnvios([
      envioPrePostado('RO-ENV-A5', 'AP100000005BR', { etapaAtual: 'Envio postado', dataPostagem: manual }),
      envioPrePostado('RO-ENV-A6', 'AP100000006BR', { etapaAtual: 'Recebido pela custódia', dataPostagem: manual }),
    ])
    atualizarRastreiosEmLote.mockResolvedValue({
      AP100000005BR: retrato('AP100000005BR', [evento('postado', POSTAGEM), evento('entregue', ENTREGA)]),
      AP100000006BR: retrato('AP100000006BR', [evento('postado', POSTAGEM), evento('entregue', ENTREGA)]),
    })

    const r = await atualizarRastreiosPendentes()

    expect(r.enviosPostados).toBe(0)
    expect((await envioNoEstado('RO-ENV-A5'))?.dataPostagem).toBe(manual)
    // "Recebido pela custódia" é da equipe: o "entregue" dos Correios não leva a lugar nenhum.
    expect((await envioNoEstado('RO-ENV-A6'))?.etapaAtual).toBe('Recebido pela custódia')
  })

  it('envio desconsiderado nem entra na consulta', async () => {
    await comEnvios([envioPrePostado('RO-ENV-A7', 'AP100000007BR', { desconsideradoEm: ETIQUETA + 3 * DIA })])

    const r = await atualizarRastreiosPendentes()

    expect(atualizarRastreiosEmLote).not.toHaveBeenCalled()
    expect(r.verificados).toBe(0)
  })
})

describe('o job avança a retirada pela máquina de estados', () => {
  beforeEach(async () => {
    atualizarRastreiosEmLote.mockReset()
    repositorioRetiradas.mockReset()
    await mutateState((s) => {
      s.envios = []
      s.retiradas = []
    })
  })

  it('separacao → postada, com autor "correios" e a data do evento', async () => {
    const guardadas = listandoRetiradas([retirada('RET-A1', 'separacao', 'AP200000001BR')])
    atualizarRastreiosEmLote.mockResolvedValue({
      AP200000001BR: retrato('AP200000001BR', [evento('aguardando_postagem', ETIQUETA), evento('postado', POSTAGEM)]),
    })

    const r = await atualizarRastreiosPendentes()

    expect(r.retiradasPostadas).toBe(1)
    expect(r.retiradasEntregues).toBe(0)
    const gravada = guardadas.get('RET-A1')
    expect(gravada?.status).toBe('postada')
    expect(gravada?.historico.at(-1)).toMatchObject({ de: 'separacao', para: 'postada', autor: 'correios', data: POSTAGEM })
  })

  it('postada → entregue quando os Correios entregam', async () => {
    const guardadas = listandoRetiradas([retirada('RET-A2', 'postada', 'AP200000002BR')])
    atualizarRastreiosEmLote.mockResolvedValue({
      AP200000002BR: retrato('AP200000002BR', [evento('postado', POSTAGEM), evento('entregue', ENTREGA)]),
    })

    const r = await atualizarRastreiosPendentes()

    expect(r.retiradasEntregues).toBe(1)
    expect(r.retiradasPostadas).toBe(0)
    expect(guardadas.get('RET-A2')?.historico.at(-1)).toMatchObject({ de: 'postada', para: 'entregue', autor: 'correios', data: ENTREGA })
  })

  it('postada e entregue entre duas rodadas: dá os dois passos, sem pular a máquina de estados', async () => {
    const guardadas = listandoRetiradas([retirada('RET-A3', 'separacao', 'AP200000003BR')])
    atualizarRastreiosEmLote.mockResolvedValue({
      AP200000003BR: retrato('AP200000003BR', [evento('postado', POSTAGEM), evento('entregue', ENTREGA)]),
    })

    const r = await atualizarRastreiosPendentes()

    expect(r.retiradasPostadas).toBe(1)
    expect(r.retiradasEntregues).toBe(1)
    expect(guardadas.get('RET-A3')?.historico.map((h) => h.para)).toEqual(['postada', 'entregue'])
  })

  it('postada sem entrega fica como está; em separação aguardando postagem também', async () => {
    listandoRetiradas([retirada('RET-A4', 'postada', 'AP200000004BR'), retirada('RET-A5', 'separacao', 'AP200000005BR')])
    atualizarRastreiosEmLote.mockResolvedValue({
      AP200000004BR: retrato('AP200000004BR', [evento('postado', POSTAGEM), evento('em_transito', TRANSITO)]),
      AP200000005BR: retrato('AP200000005BR', [evento('aguardando_postagem', ETIQUETA)]),
    })

    const r = await atualizarRastreiosPendentes()

    expect(r.retiradasPostadas).toBe(0)
    expect(r.retiradasEntregues).toBe(0)
    expect(atualizar).not.toHaveBeenCalled()
  })

  it('confere de novo no repositório: se a equipe já postou, o job não repete o passo', async () => {
    const lista = [retirada('RET-A6', 'separacao', 'AP200000006BR')]
    const guardadas = listandoRetiradas(lista)
    // Entre a listagem e a gravação, a equipe marcou a postagem pelo painel.
    guardadas.set('RET-A6', { ...lista[0], status: 'postada' })
    atualizarRastreiosEmLote.mockResolvedValue({
      AP200000006BR: retrato('AP200000006BR', [evento('postado', POSTAGEM), evento('em_transito', TRANSITO)]),
    })

    const r = await atualizarRastreiosPendentes()

    expect(r.retiradasPostadas).toBe(0)
    expect(atualizar).not.toHaveBeenCalled()
  })

  it('a retirada que também mora no estado recebe a mesma transição', async () => {
    const ret = retirada('RET-A7', 'separacao', 'AP200000007BR')
    listandoRetiradas([ret])
    await mutateState((s) => {
      s.retiradas = [structuredClone(ret)]
    })
    atualizarRastreiosEmLote.mockResolvedValue({
      AP200000007BR: retrato('AP200000007BR', [evento('postado', POSTAGEM)]),
    })

    await atualizarRastreiosPendentes()

    const noEstado = (await getState()).retiradas?.find((x) => x.id === 'RET-A7')
    expect(noEstado?.status).toBe('postada')
    expect(noEstado?.historico.at(-1)?.autor).toBe('correios')
  })
})
