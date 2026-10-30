/**
 * Expedição da retirada pelo painel (22/10/2026): emitir e cancelar a etiqueta oficial dos Correios e,
 * sem contrato, marcar a postagem feita no balcão.
 *
 * Os Correios, o acesso e o repositório são dublês — nenhuma chamada sai para a API real. O que se
 * testa: a permissão vem antes de tudo, o pedido de pré-postagem sai com o remetente, o serviço e o
 * valor certos, a retirada vai só até `separacao` (quem marca `postada` é o rastreio), o duplo clique
 * não deixa pré-postagem órfã nos Correios e cada ação grava a sua linha `admin.logistica.<verbo>`.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { AppState, Retirada } from '@/domain/types'

vi.mock('server-only', () => ({}))

const m = vi.hoisted(() => {
  class ErroCorreios extends Error {
    constructor(
      message: string,
      readonly status: number,
      readonly mensagens: string[] = [],
    ) {
      super(message)
    }
  }
  return {
    permissaoParaAcao: vi.fn(),
    bancoConfigurado: vi.fn(),
    executarNoBanco: vi.fn(),
    registrarAcaoAdmin: vi.fn(),
    criarPrePostagem: vi.fn(),
    cancelarPrePostagem: vi.fn(),
    correiosConfigurado: vi.fn(),
    atualizarRastreiosPendentes: vi.fn(),
    banco: new Map<string, Retirada>(),
    estado: { users: {}, sellOffers: [], trades: [], retiradas: [] } as unknown as AppState,
    ErroCorreios,
  }
})

vi.mock('@/server/admin/acesso', () => ({ permissaoParaAcao: m.permissaoParaAcao }))
vi.mock('@/server/db/client', () => ({ bancoConfigurado: m.bancoConfigurado, executarNoBanco: m.executarNoBanco }))
vi.mock('@/server/admin/auditar', () => ({ registrarAcaoAdmin: m.registrarAcaoAdmin }))
vi.mock('@/lib/shipping/cws', () => ({
  criarPrePostagem: m.criarPrePostagem,
  cancelarPrePostagem: m.cancelarPrePostagem,
  correiosConfigurado: m.correiosConfigurado,
  ErroCorreios: m.ErroCorreios,
  SERVICOS_CORREIOS: { entrada: { PAC: '03301', SEDEX: '03247' }, saida: { PAC: '03298', SEDEX: '03220' } },
}))
vi.mock('@/server/shipping/retiradas', () => ({
  repositorioRetiradas: () => ({
    buscarPorId: async (id: string) => (m.banco.has(id) ? structuredClone(m.banco.get(id)) : null),
    atualizar: async (r: Retirada) => {
      m.banco.set(r.id, structuredClone(r))
    },
  }),
}))
vi.mock('@/server/shipping/rastreios', () => ({ atualizarRastreiosPendentes: m.atualizarRastreiosPendentes }))
vi.mock('@/server/state', () => ({
  getState: async () => m.estado,
  mutateState: async (fn: (s: AppState) => unknown) => ({ state: m.estado, result: await fn(m.estado) }),
}))

import { atualizarRastreiosAgora, cancelarEtiquetaRetirada, emitirEtiquetaRetirada, marcarRetiradaPostadaManual } from './logistica'

const MEMBRO = { email: 'operador@aureacustodia.com.br', nome: 'Operador' }
const NEGADO = { ok: false as const, status: 403 as const, erro: 'Esta área é restrita à equipe do Real Olímpico.' }
const DONO = 'cliente@teste.com'

function retirada(extra: Partial<Retirada> = {}): Retirada {
  return {
    id: 'RET-000001',
    coinId: 'RO-000042',
    reciboCodigo: 'REC-000042',
    userEmail: DONO,
    modalidade: 'comum',
    status: 'paga',
    valorTaxaCents: 5000,
    endereco: {
      nome: 'Cliente Teste',
      cpfOuCnpj: '123.456.789-09',
      logradouro: 'Rua A',
      numero: '10',
      bairro: 'Centro',
      cidade: 'Belo Horizonte',
      uf: 'MG',
      cep: '30110-000',
      telefone: '(31) 99999-9999',
    },
    solicitadoEm: 1,
    pagoEm: 2,
    dataLimiteD30: 3,
    historico: [{ de: 'solicitada', para: 'paga', data: 2 }],
    ...extra,
  }
}

function guardar(r: Retirada): void {
  m.banco.set(r.id, structuredClone(r))
  m.estado.retiradas = [structuredClone(r)]
}

const CRIADA = { id: 'PRI0001', codigoObjeto: 'AP123456789BR', prazoPostagem: '2026-11-21', statusAtual: 2 }

function verbosAuditados(): string[] {
  return m.registrarAcaoAdmin.mock.calls.map(([, a]) => `admin.${a.area}.${a.verbo}`)
}

describe('ações de expedição da retirada no painel', () => {
  beforeEach(() => {
    for (const f of [m.permissaoParaAcao, m.bancoConfigurado, m.executarNoBanco, m.registrarAcaoAdmin, m.criarPrePostagem, m.cancelarPrePostagem, m.correiosConfigurado, m.atualizarRastreiosPendentes]) f.mockReset()
    m.banco.clear()
    m.estado = { users: {}, sellOffers: [], trades: [], retiradas: [] } as unknown as AppState
    m.permissaoParaAcao.mockResolvedValue({ ok: true, membro: MEMBRO })
    m.correiosConfigurado.mockReturnValue(true)
    m.bancoConfigurado.mockReturnValue(true)
    m.executarNoBanco.mockImplementation(async (fn: (tx: unknown) => unknown) => fn({}))
    m.criarPrePostagem.mockResolvedValue(CRIADA)
    m.cancelarPrePostagem.mockResolvedValue(undefined)
  })

  const ACOES: Array<[string, () => Promise<{ ok: boolean; error?: string }>]> = [
    ['emitirEtiquetaRetirada', () => emitirEtiquetaRetirada('RET-000001')],
    ['cancelarEtiquetaRetirada', () => cancelarEtiquetaRetirada('RET-000001')],
    ['marcarRetiradaPostadaManual', () => marcarRetiradaPostadaManual('RET-000001', 'BR123456789BR')],
  ]

  it.each(ACOES)('%s pede logistica.expedir e, recusada, não toca em nada', async (_n, chamar) => {
    guardar(retirada({ prePostagem: { id: 'PRI9', codigoObjeto: 'AP999999999BR', codigoServico: '03298', criadaEm: 1, prazoPostagem: null } }))
    m.permissaoParaAcao.mockResolvedValue(NEGADO)
    const r = await chamar()
    expect(r.ok).toBe(false)
    expect(m.permissaoParaAcao).toHaveBeenCalledWith('logistica.expedir')
    expect(m.criarPrePostagem).not.toHaveBeenCalled()
    expect(m.cancelarPrePostagem).not.toHaveBeenCalled()
    expect(m.banco.get('RET-000001')?.status).toBe('paga')
  })

  describe('emitirEtiquetaRetirada', () => {
    it('comum: PAC de saída do contrato, remetente AUREA na caixa postal, sem AR, R$ 150 sem mercado', async () => {
      guardar(retirada())
      const r = await emitirEtiquetaRetirada('RET-000001')
      expect(r.ok).toBe(true)
      const pedido = m.criarPrePostagem.mock.calls[0][0]
      expect(pedido.codigoServico).toBe('03298')
      expect(pedido.modalidade).toBe('PAC')
      expect(pedido.logisticaReversa).toBe(false)
      expect(pedido.avisoRecebimento).toBe(false)
      expect(pedido.remetente).toMatchObject({
        nome: 'AUREA CUSTODIA LTDA',
        cpfCnpj: '68071452000106',
        email: 'custodia@aureacustodia.com.br',
        endereco: { cep: '30315970', logradouro: 'Caixa Postal 7990', numero: 'S/N', bairro: 'Comiteco', cidade: 'Belo Horizonte', uf: 'MG' },
      })
      expect(pedido.destinatario).toMatchObject({ nome: 'Cliente Teste', cpfCnpj: '123.456.789-09', endereco: { cep: '30110-000', numero: '10' } })
      expect(pedido.valorDeclaradoCents).toBe(15000)
      expect(pedido.itens).toEqual([{ conteudo: 'Moeda comemorativa / colecionável', quantidade: 1, valorUnitarioCents: 15000 }])
      expect(pedido.observacao).toBe('RET-000001')
    })

    it('segura: SEDEX com aviso de recebimento, valor declarado = mediana do tipo', async () => {
      guardar(retirada({ modalidade: 'segura' }))
      m.estado = {
        users: { [DONO]: { coins: [{ id: 'RO-000042', tipoMoeda: 'Direitos Humanos' }] } },
        sellOffers: [
          { tipoMoeda: 'Direitos Humanos', price: 40000, createdAt: Date.now() },
          { tipoMoeda: 'Direitos Humanos', price: 30000, createdAt: Date.now() },
          { tipoMoeda: 'Outra', price: 99999, createdAt: Date.now() },
        ],
        trades: [],
        retiradas: [],
      } as unknown as AppState
      await emitirEtiquetaRetirada('RET-000001')
      const pedido = m.criarPrePostagem.mock.calls[0][0]
      expect(pedido.codigoServico).toBe('03220')
      expect(pedido.modalidade).toBe('SEDEX')
      expect(pedido.avisoRecebimento).toBe(true)
      expect(pedido.valorDeclaradoCents).toBe(35000)
    })

    it('grava pré-postagem e código, leva paga → separacao (não postada) nos dois lugares e audita', async () => {
      guardar(retirada())
      await emitirEtiquetaRetirada('RET-000001')
      const gravada = m.banco.get('RET-000001')
      expect(gravada?.status).toBe('separacao')
      expect(gravada?.codigoRastreio).toBe('AP123456789BR')
      expect(gravada?.prePostagem).toMatchObject({ id: 'PRI0001', codigoObjeto: 'AP123456789BR', codigoServico: '03298', prazoPostagem: '2026-11-21' })
      expect(gravada?.historico.at(-1)).toMatchObject({ de: 'paga', para: 'separacao', autor: MEMBRO.email })
      expect(m.estado.retiradas?.[0].status).toBe('separacao')
      expect(m.estado.retiradas?.[0].codigoRastreio).toBe('AP123456789BR')
      expect(verbosAuditados()).toEqual(['admin.logistica.emitir_etiqueta'])
    })

    it('em separacao, só grava a etiqueta e anota no histórico', async () => {
      guardar(retirada({ status: 'separacao' }))
      const r = await emitirEtiquetaRetirada('RET-000001')
      expect(r.ok).toBe(true)
      const gravada = m.banco.get('RET-000001')
      expect(gravada?.status).toBe('separacao')
      expect(gravada?.historico.at(-1)).toMatchObject({ de: 'separacao', para: 'separacao' })
    })

    it.each(['solicitada', 'postada', 'entregue', 'cancelada'] as const)('recusa retirada %s sem chamar os Correios', async (status) => {
      guardar(retirada({ status }))
      const r = await emitirEtiquetaRetirada('RET-000001')
      expect(r.ok).toBe(false)
      expect(m.criarPrePostagem).not.toHaveBeenCalled()
    })

    it('recusa quando já há etiqueta ativa', async () => {
      guardar(retirada({ status: 'separacao', prePostagem: { id: 'PRI9', codigoObjeto: 'AP999999999BR', codigoServico: '03298', criadaEm: 1, prazoPostagem: null } }))
      const r = await emitirEtiquetaRetirada('RET-000001')
      expect(r.ok).toBe(false)
      expect(r.error).toContain('AP999999999BR')
      expect(m.criarPrePostagem).not.toHaveBeenCalled()
    })

    it('sem contrato configurado, não chama a API e manda postar no balcão', async () => {
      guardar(retirada())
      m.correiosConfigurado.mockReturnValue(false)
      const r = await emitirEtiquetaRetirada('RET-000001')
      expect(r.ok).toBe(false)
      expect(r.error).toContain('balcão')
      expect(m.criarPrePostagem).not.toHaveBeenCalled()
    })

    it('recusa dos Correios chega ao operador com a mensagem deles e não muda a retirada', async () => {
      guardar(retirada())
      m.criarPrePostagem.mockRejectedValue(new m.ErroCorreios('erro', 400, ['ERP-054: Serviço adicional nao pode ser prestado']))
      const r = await emitirEtiquetaRetirada('RET-000001')
      expect(r.ok).toBe(false)
      expect(r.error).toContain('ERP-054')
      expect(m.banco.get('RET-000001')?.status).toBe('paga')
      expect(m.registrarAcaoAdmin.mock.calls[0][1]).toMatchObject({ verbo: 'emitir_etiqueta', detalhes: { ok: false } })
    })

    it('duplo clique: quem chega depois encontra a etiqueta gravada e cancela a sua nos Correios', async () => {
      guardar(retirada())
      m.criarPrePostagem.mockImplementation(async () => {
        // Enquanto a API responde, o outro operador grava a dele.
        m.banco.set('RET-000001', {
          ...retirada({ status: 'separacao' }),
          prePostagem: { id: 'PRI-OUTRA', codigoObjeto: 'AP000000001BR', codigoServico: '03298', criadaEm: 1, prazoPostagem: null },
          codigoRastreio: 'AP000000001BR',
        })
        return CRIADA
      })
      const r = await emitirEtiquetaRetirada('RET-000001')
      expect(r.ok).toBe(false)
      expect(m.cancelarPrePostagem).toHaveBeenCalledWith('PRI0001')
      expect(m.banco.get('RET-000001')?.codigoRastreio).toBe('AP000000001BR')
    })
  })

  describe('cancelarEtiquetaRetirada', () => {
    const ETIQUETA = { id: 'PRI0001', codigoObjeto: 'AP123456789BR', codigoServico: '03298', criadaEm: 1, prazoPostagem: null }

    it('cancela nos Correios, limpa pré-postagem e código, fica em separacao e audita', async () => {
      guardar(retirada({ status: 'separacao', prePostagem: ETIQUETA, codigoRastreio: 'AP123456789BR' }))
      const r = await cancelarEtiquetaRetirada('RET-000001')
      expect(r.ok).toBe(true)
      expect(m.cancelarPrePostagem).toHaveBeenCalledWith('PRI0001')
      const gravada = m.banco.get('RET-000001')
      expect(gravada?.prePostagem).toBeNull()
      expect(gravada?.codigoRastreio).toBeUndefined()
      expect(gravada?.status).toBe('separacao')
      expect(gravada?.historico.at(-1)?.motivo).toContain('AP123456789BR')
      expect(m.estado.retiradas?.[0].prePostagem).toBeNull()
      expect(verbosAuditados()).toEqual(['admin.logistica.cancelar_etiqueta'])
    })

    it('se os Correios recusam, a etiqueta continua gravada', async () => {
      guardar(retirada({ status: 'separacao', prePostagem: ETIQUETA, codigoRastreio: 'AP123456789BR' }))
      m.cancelarPrePostagem.mockRejectedValue(new m.ErroCorreios('erro', 400, ['Objeto já postado']))
      const r = await cancelarEtiquetaRetirada('RET-000001')
      expect(r.ok).toBe(false)
      expect(r.error).toContain('Objeto já postado')
      expect(m.banco.get('RET-000001')?.prePostagem?.id).toBe('PRI0001')
    })

    it('sem etiqueta ativa, recusa sem chamar os Correios', async () => {
      guardar(retirada({ status: 'separacao' }))
      const r = await cancelarEtiquetaRetirada('RET-000001')
      expect(r.ok).toBe(false)
      expect(m.cancelarPrePostagem).not.toHaveBeenCalled()
    })
  })

  describe('marcarRetiradaPostadaManual', () => {
    it('paga → separacao → postada com o código normalizado, e audita', async () => {
      guardar(retirada())
      const r = await marcarRetiradaPostadaManual('RET-000001', 'br 123 456 789 br')
      expect(r.ok).toBe(true)
      const gravada = m.banco.get('RET-000001')
      expect(gravada?.status).toBe('postada')
      expect(gravada?.codigoRastreio).toBe('BR123456789BR')
      expect(gravada?.historico.map((h) => h.para)).toEqual(['paga', 'separacao', 'postada'])
      expect(m.estado.retiradas?.[0].status).toBe('postada')
      expect(verbosAuditados()).toEqual(['admin.logistica.postar_manual'])
    })

    it('recusa código fora do formato dos Correios', async () => {
      guardar(retirada())
      const r = await marcarRetiradaPostadaManual('RET-000001', '12345')
      expect(r.ok).toBe(false)
      expect(m.banco.get('RET-000001')?.status).toBe('paga')
    })

    it('recusa quando há etiqueta do contrato emitida (seriam dois códigos para a mesma moeda)', async () => {
      guardar(retirada({ status: 'separacao', prePostagem: { id: 'PRI1', codigoObjeto: 'AP123456789BR', codigoServico: '03298', criadaEm: 1, prazoPostagem: null } }))
      const r = await marcarRetiradaPostadaManual('RET-000001', 'BR123456789BR')
      expect(r.ok).toBe(false)
      expect(m.banco.get('RET-000001')?.status).toBe('separacao')
    })
  })
})

// 27/10/2026: o botão "Atualizar rastreio agora" roda na hora a rodada do job diário.
describe('atualizarRastreiosAgora', () => {
  const RODADA = {
    verificados: 2, gravados: 2, persistido: true, codigos: ['AE075129743BR'], retiradasVerificadas: 1, retiradasGravadas: 1,
    retratosPreservados: 0, enviosPostados: 1, enviosRecebidos: 0, retiradasPostadas: 0, retiradasEntregues: 1,
  }

  beforeEach(() => {
    for (const f of [m.permissaoParaAcao, m.bancoConfigurado, m.executarNoBanco, m.registrarAcaoAdmin, m.atualizarRastreiosPendentes]) f.mockReset()
    m.permissaoParaAcao.mockResolvedValue({ ok: true, membro: MEMBRO })
    m.bancoConfigurado.mockReturnValue(true)
    m.executarNoBanco.mockImplementation(async (fn: (tx: unknown) => unknown) => fn({}))
    m.atualizarRastreiosPendentes.mockResolvedValue(RODADA)
  })

  it('sem logistica.expedir não consulta os Correios nem grava nada', async () => {
    m.permissaoParaAcao.mockResolvedValue(NEGADO)
    const r = await atualizarRastreiosAgora()
    expect(r.ok).toBe(false)
    expect(m.permissaoParaAcao).toHaveBeenCalledWith('logistica.expedir')
    expect(m.atualizarRastreiosPendentes).not.toHaveBeenCalled()
    expect(m.registrarAcaoAdmin).not.toHaveBeenCalled()
  })

  it('roda a rodada do job e grava admin.logistica.atualizar_rastreio só com contagens', async () => {
    const r = await atualizarRastreiosAgora()
    expect(r).toMatchObject({ ok: true, data: { verificados: 3, enviosPostados: 1, retiradasPostadas: 0, retiradasEntregues: 1 } })
    expect(r.ok && r.message).toContain('3 objeto(s) consultado(s)')
    expect(m.registrarAcaoAdmin).toHaveBeenCalledTimes(1)
    const [, acao] = m.registrarAcaoAdmin.mock.calls[0]!
    expect(acao).toMatchObject({ ator: MEMBRO.email, area: 'logistica', verbo: 'atualizar_rastreio' })
    expect(JSON.stringify(acao)).not.toContain('AE075129743BR')
  })

  it('sem nada em trânsito, diz isso', async () => {
    m.atualizarRastreiosPendentes.mockResolvedValue({ ...RODADA, verificados: 0, retiradasVerificadas: 0, enviosPostados: 0, retiradasEntregues: 0 })
    const r = await atualizarRastreiosAgora()
    expect(r.ok && r.message).toBe('Nenhum objeto em trânsito para consultar nos Correios.')
  })
})
