import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Retirada } from '@/domain/types'

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
    getSessionEmail: vi.fn(),
    buscarPorId: vi.fn(),
    carregarMembro: vi.fn(),
    baixarRotuloPdf: vi.fn(),
    ErroCorreios,
  }
})

vi.mock('@/server/session', () => ({ getSessionEmail: m.getSessionEmail }))
vi.mock('@/server/shipping/retiradas', () => ({ repositorioRetiradas: () => ({ buscarPorId: m.buscarPorId }) }))
vi.mock('@/server/admin/acesso', () => ({ carregarMembro: m.carregarMembro }))
vi.mock('@/server/relatorios/acesso', () => ({ ehAdmin: () => false }))
vi.mock('@/lib/shipping/cws', () => ({ baixarRotuloPdf: m.baixarRotuloPdf, ErroCorreios: m.ErroCorreios }))

import { GET } from './route'

const DONO = 'cliente@teste.com'

function retirada(extra: Partial<Retirada> = {}): Retirada {
  return {
    id: 'RET-000001',
    coinId: 'RO-000042',
    reciboCodigo: 'REC-000042',
    userEmail: DONO,
    modalidade: 'comum',
    status: 'separacao',
    valorTaxaCents: 5000,
    endereco: {
      nome: 'Cliente Teste',
      cpfOuCnpj: '12345678909',
      logradouro: 'Rua A',
      numero: '10',
      bairro: 'Centro',
      cidade: 'Belo Horizonte',
      uf: 'MG',
      cep: '30110000',
      telefone: '31999999999',
    },
    solicitadoEm: 1,
    dataLimiteD30: 2,
    historico: [],
    ...extra,
  }
}

const ETIQUETA = { id: 'PRI1', codigoObjeto: 'AP123456789BR', codigoServico: '03298', criadaEm: 1, prazoPostagem: null }

async function pedir(): Promise<Response> {
  const req = new NextRequest('http://localhost:3000/api/retiradas/etiqueta/RET-000001')
  return GET(req, { params: Promise.resolve({ id: 'RET-000001' }) })
}

describe('Outbound Label Route — GET /api/retiradas/etiqueta/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    m.carregarMembro.mockResolvedValue(null)
  })

  it('rejeita com 401 se o usuário não estiver autenticado', async () => {
    m.getSessionEmail.mockResolvedValue(null)
    const res = await pedir()
    expect(res.status).toBe(401)
  })

  it('recusa quem não é o dono nem tem logistica.etiquetas, sem chamar os Correios', async () => {
    m.getSessionEmail.mockResolvedValue('outro@teste.com')
    m.buscarPorId.mockResolvedValue(retirada({ prePostagem: ETIQUETA }))
    const res = await pedir()
    expect(res.status).toBe(403)
    expect(m.baixarRotuloPdf).not.toHaveBeenCalled()
  })

  it('com a pré-postagem emitida, devolve o rótulo oficial dos Correios em PDF', async () => {
    m.getSessionEmail.mockResolvedValue(DONO)
    m.buscarPorId.mockResolvedValue(retirada({ prePostagem: ETIQUETA, codigoRastreio: 'AP123456789BR' }))
    m.baixarRotuloPdf.mockResolvedValue(Buffer.from('%PDF-1.4 teste'))
    const res = await pedir()
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('application/pdf')
    expect(res.headers.get('Content-Disposition')).toContain('inline')
    expect(m.baixarRotuloPdf).toHaveBeenCalledWith(['AP123456789BR'])
    expect(Buffer.from(await res.arrayBuffer()).toString()).toBe('%PDF-1.4 teste')
  })

  it('rótulo indisponível nos Correios vira erro, e não a página HTML sem código de barras', async () => {
    m.getSessionEmail.mockResolvedValue(DONO)
    m.buscarPorId.mockResolvedValue(retirada({ prePostagem: ETIQUETA }))
    m.baixarRotuloPdf.mockRejectedValue(new m.ErroCorreios('ainda não ficou pronto', 504))
    const res = await pedir()
    expect(res.status).toBe(504)
    expect(res.headers.get('Content-Type')).toContain('application/json')
  })

  it('sem pré-postagem (ou com ela cancelada), mantém a etiqueta HTML de antes', async () => {
    m.getSessionEmail.mockResolvedValue(DONO)
    m.buscarPorId.mockResolvedValue(retirada({ prePostagem: { ...ETIQUETA, canceladaEm: 5 } }))
    const res = await pedir()
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toContain('text/html')
    expect(m.baixarRotuloPdf).not.toHaveBeenCalled()
  })
})
