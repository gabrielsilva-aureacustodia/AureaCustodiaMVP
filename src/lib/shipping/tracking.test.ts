import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { _resetTokenParaTestes } from './cws/cliente'
import { atualizarRastreiosEmLote, consultarRastreioCorreios, normalizarCodigoRastreio } from './tracking'

const ENV = {
  CORREIOS_USUARIO: 'u',
  CORREIOS_CODIGO_ACESSO: 'c',
  CORREIOS_CARTAO_POSTAGEM: '0080378641',
  CORREIOS_CONTRATO: '9912766936',
  CORREIOS_DR: '20',
}

const respostaToken = (): Response =>
  new Response(JSON.stringify({ token: 't', expiraEm: '2099-01-01T00:00:00' }), { status: 201 })

describe('Rastreamento SRO', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    _resetTokenParaTestes()
  })

  it('normaliza o código', () => {
    expect(normalizarCodigoRastreio(' ap647133258br ')).toBe('AP647133258BR')
  })

  it('sem contrato, devolve indisponível com o motivo — nunca evento inventado', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const r = await consultarRastreioCorreios('AP647133258BR')
    expect(r.statusAtual).toBe('indisponivel')
    expect(r.erro).toContain('não configurado')
    expect(r.eventos).toEqual([])
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('com contrato, chama /srorastro e devolve os eventos convertidos', async () => {
    for (const [k, v] of Object.entries(ENV)) vi.stubEnv(k, v)
    const urls: string[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        urls.push(url)
        if (url.includes('/token/')) return respostaToken()
        return new Response(
          JSON.stringify({
            objetos: [
              {
                codObjeto: 'AP647133258BR',
                eventos: [
                  {
                    codigo: 'BDE',
                    tipo: '01',
                    dtHrCriado: '2026-10-24T14:00:00',
                    descricao: 'Objeto entregue ao destinatário',
                    unidade: { tipo: 'Unidade de Distribuição', endereco: { cidade: 'BELO HORIZONTE', uf: 'MG' } },
                  },
                  {
                    codigo: 'PO',
                    tipo: '01',
                    dtHrCriado: '2026-10-22T10:00:00',
                    descricao: 'Objeto postado',
                    unidade: { tipo: 'Agência dos Correios', endereco: { cidade: 'SAO PAULO', uf: 'SP' } },
                  },
                ],
              },
              { codObjeto: 'AA123456789BR', mensagem: 'SRO-009: Objeto não pertence ao contrato' },
            ],
          }),
        )
      }),
    )

    const r = await atualizarRastreiosEmLote(['AP647133258BR', 'aa123456789br', 'AP000000000BR'])
    expect(urls.some((u) => u.includes('/srorastro/v1/objetos'))).toBe(true)
    expect(r['AP647133258BR']).toMatchObject({ statusAtual: 'entregue', entregue: true })
    expect(r['AP647133258BR'].eventos).toHaveLength(2)
    expect(r['AA123456789BR'].statusAtual).toBe('nao_encontrado')
    // Código que os Correios não devolveram também volta no mapa.
    expect(r['AP000000000BR'].statusAtual).toBe('nao_encontrado')
  })

  it('com os Correios fora, todo código volta indisponível com o motivo', async () => {
    for (const [k, v] of Object.entries(ENV)) vi.stubEnv(k, v)
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) =>
        url.includes('/token/')
          ? respostaToken()
          : new Response(JSON.stringify({ msgs: ['Serviço indisponível'] }), { status: 503 }),
      ),
    )
    const r = await atualizarRastreiosEmLote(['AP647133258BR'])
    expect(r['AP647133258BR']).toMatchObject({ statusAtual: 'indisponivel', erro: 'Serviço indisponível' })
  })
})
