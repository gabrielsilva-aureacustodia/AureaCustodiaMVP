import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const { getSessionEmail } = vi.hoisted(() => ({ getSessionEmail: vi.fn() }))
vi.mock('@/server/session', () => ({ getSessionEmail }))

const { getState } = vi.hoisted(() => ({ getState: vi.fn() }))
vi.mock('@/server/state', () => ({ getState }))

const { carregarMembro } = vi.hoisted(() => ({ carregarMembro: vi.fn() }))
vi.mock('@/server/admin/acesso', () => ({ carregarMembro }))

const { baixarRotuloPdf, correiosConfigurado } = vi.hoisted(() => ({
  baixarRotuloPdf: vi.fn(),
  correiosConfigurado: vi.fn(),
}))
vi.mock('@/lib/shipping/cws', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/shipping/cws')>()
  return { ...original, baixarRotuloPdf, correiosConfigurado }
})

import { GET } from './route'

const EMAIL = 'cliente@teste.com'
const PROTOCOLO = 'ENV-2026-0001'

function estadoComEnvio(extra: Record<string, unknown> = {}): unknown {
  return {
    users: { [EMAIL]: { name: 'Cliente Teste', balance: 0, coins: [] } },
    envios: [
      {
        protocolo: PROTOCOLO,
        userEmail: EMAIL,
        tipoMoeda: 'Entrega da Bandeira Olímpica',
        ano: 2016,
        quantidade: 2,
        codigoRastreio: null,
        ...extra,
      },
    ],
  }
}

const PRE_POSTAGEM = {
  id: 'PRI123',
  codigoObjeto: 'AP123456789BR',
  codigoServico: '03301',
  criadaEm: 1,
  prazoPostagem: null,
  canceladaEm: null,
}

async function pedirEtiqueta(): Promise<Response> {
  const req = new NextRequest(`http://localhost:3000/api/envios/etiqueta/${PROTOCOLO}`)
  return GET(req, { params: Promise.resolve({ protocolo: PROTOCOLO }) })
}

async function pegarEtiqueta(): Promise<string> {
  return (await pedirEtiqueta()).text()
}

describe('Label Route — GET /api/envios/etiqueta/[protocolo]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    carregarMembro.mockResolvedValue(null)
  })

  it('rejeita com 401 se o usuário não estiver autenticado', async () => {
    getSessionEmail.mockResolvedValue(null)
    const req = new NextRequest('http://localhost:3000/api/envios/etiqueta/ENV-2026-0001')
    const res = await GET(req, { params: Promise.resolve({ protocolo: 'ENV-2026-0001' }) })
    expect(res.status).toBe(401)
  })

  /**
   * Pedido do Gabriel em 18/09/2026: a etiqueta mostra do destino só a caixa postal e
   * o CEP. O endereço detalhado da central (agência, avenida, bairro, cidade) não vai
   * colado do lado de fora de uma encomenda de moeda.
   */
  it('imprime só a caixa postal e o CEP do destinatário', async () => {
    getSessionEmail.mockResolvedValue(EMAIL)
    getState.mockResolvedValue(estadoComEnvio())

    const html = await pegarEtiqueta()

    expect(html).toContain('AUREA CUSTODIA LTDA<')
    expect(html).toContain('Caixa Postal 7990')
    expect(html).toContain('30315-970')

    expect(html).not.toContain('Bandeirantes')
    expect(html).not.toContain('Mangabeiras')
    expect(html).not.toContain('Belo Horizonte')
    expect(html).not.toContain('Cidade / UF')
  })

  /**
   * Desde 22/10/2026 o envio com frete pago tem pré-postagem nos Correios, e a etiqueta é o rótulo
   * oficial deles, em PDF. A rota só BAIXA o rótulo — nunca cria pré-postagem.
   */
  it('com pré-postagem, devolve o PDF oficial dos Correios', async () => {
    getSessionEmail.mockResolvedValue(EMAIL)
    getState.mockResolvedValue(estadoComEnvio({ codigoRastreio: 'AP123456789BR', prePostagem: PRE_POSTAGEM }))
    correiosConfigurado.mockReturnValue(true)
    baixarRotuloPdf.mockResolvedValue(Buffer.from('%PDF-1.4 rotulo'))

    const res = await pedirEtiqueta()

    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('application/pdf')
    expect(res.headers.get('Content-Disposition')).toContain('inline')
    expect(baixarRotuloPdf).toHaveBeenCalledWith(['AP123456789BR'])
    expect(Buffer.from(await res.arrayBuffer()).toString()).toBe('%PDF-1.4 rotulo')
  })

  it('sem pré-postagem, mantém a etiqueta HTML e não chama os Correios', async () => {
    getSessionEmail.mockResolvedValue(EMAIL)
    getState.mockResolvedValue(estadoComEnvio())
    correiosConfigurado.mockReturnValue(true)

    const res = await pedirEtiqueta()

    expect(res.headers.get('Content-Type')).toContain('text/html')
    expect(baixarRotuloPdf).not.toHaveBeenCalled()
  })

  it('pré-postagem cancelada (envio desconsiderado) não imprime etiqueta', async () => {
    getSessionEmail.mockResolvedValue(EMAIL)
    getState.mockResolvedValue(estadoComEnvio({ prePostagem: { ...PRE_POSTAGEM, canceladaEm: 2 } }))
    correiosConfigurado.mockReturnValue(true)

    const res = await pedirEtiqueta()

    expect(res.status).toBe(410)
    expect(baixarRotuloPdf).not.toHaveBeenCalled()
  })

  it('falha dos Correios ao gerar o rótulo vira erro explicado, não 500 calado', async () => {
    getSessionEmail.mockResolvedValue(EMAIL)
    getState.mockResolvedValue(estadoComEnvio({ prePostagem: PRE_POSTAGEM }))
    correiosConfigurado.mockReturnValue(true)
    baixarRotuloPdf.mockRejectedValue(new Error('O rótulo dos Correios ainda não ficou pronto.'))

    const res = await pedirEtiqueta()

    expect(res.status).toBe(502)
    expect(((await res.json()) as { error: string }).error).toContain('rótulo')
  })

  it('protocolo de outra conta continua "não encontrado" para quem não é da equipe', async () => {
    getSessionEmail.mockResolvedValue('outra@teste.com')
    getState.mockResolvedValue(estadoComEnvio({ prePostagem: PRE_POSTAGEM }))

    const res = await pedirEtiqueta()

    expect(res.status).toBe(404)
    expect(baixarRotuloPdf).not.toHaveBeenCalled()
  })
})
