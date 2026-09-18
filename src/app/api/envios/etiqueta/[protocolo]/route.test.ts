import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const { getSessionEmail } = vi.hoisted(() => ({ getSessionEmail: vi.fn() }))
vi.mock('@/server/session', () => ({ getSessionEmail }))

const { getState } = vi.hoisted(() => ({ getState: vi.fn() }))
vi.mock('@/server/state', () => ({ getState }))

const { carregarMembro } = vi.hoisted(() => ({ carregarMembro: vi.fn() }))
vi.mock('@/server/admin/acesso', () => ({ carregarMembro }))

import { GET } from './route'

const EMAIL = 'cliente@teste.com'
const PROTOCOLO = 'ENV-2026-0001'

function estadoComEnvio(): unknown {
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
      },
    ],
  }
}

async function pegarEtiqueta(): Promise<string> {
  const req = new NextRequest(`http://localhost:3000/api/envios/etiqueta/${PROTOCOLO}`)
  const res = await GET(req, { params: Promise.resolve({ protocolo: PROTOCOLO }) })
  return res.text()
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
})
