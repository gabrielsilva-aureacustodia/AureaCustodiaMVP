/**
 * Testes do registro de uso: o que o servidor aceita do navegador e o que a tela de
 * Uso calcula a partir disso.
 *
 * O que protege, em linguagem de sócio: nenhum e-mail ou código de cliente vai parar
 * na tabela de uso por causa de um endereço de página; o horário de pico é o de
 * Brasília; e a "jornada até a primeira venda" só conta o que aconteceu antes da venda.
 */

import { describe, expect, it } from 'vitest'

import { mediana, normalizarRota, plataformaResumida, primeirasVendasDe, resumirUso, validarLoteDeEventos, type EventoDeUso } from './uso'

const AGORA = Date.UTC(2026, 8, 14, 15, 0, 0) // 14/09/2026 12:00 em Brasília

describe('normalizarRota', () => {
  it('troca identificador e e-mail por [id] e tira a query string', () => {
    expect(normalizarRota('/recibos/RO-000042?x=1#topo')).toBe('/recibos/[id]')
    expect(normalizarRota('/admin/usuarios/fulano%40exemplo.com.br')).toBe('/admin/usuarios/[id]')
    expect(normalizarRota('/admin/usuarios/fulano@exemplo.com.br/financeiro')).toBe('/admin/usuarios/[id]/financeiro')
    expect(normalizarRota('/envios/RO-ENV-0001')).toBe('/envios/[id]')
    expect(normalizarRota('/conta/aceites/123')).toBe('/conta/aceites/[id]')
    expect(normalizarRota('/mercado')).toBe('/mercado')
    expect(normalizarRota('/')).toBe('/')
  })

  it('recusa o que não é caminho da própria aplicação', () => {
    expect(normalizarRota('https://outro.site/mercado')).toBeNull()
    expect(normalizarRota('//outro.site')).toBeNull()
    expect(normalizarRota('/<script>')).toBeNull()
    expect(normalizarRota(42)).toBeNull()
  })
})

describe('validarLoteDeEventos', () => {
  it('corpo sem a forma de lote vira null', () => {
    expect(validarLoteDeEventos(null, AGORA)).toBeNull()
    expect(validarLoteDeEventos({ eventos: 'x' }, AGORA)).toBeNull()
    expect(validarLoteDeEventos([1, 2], AGORA)).toBeNull()
  })

  it('descarta evento inválido sem derrubar o lote, e limita o tamanho', () => {
    const lote = validarLoteDeEventos(
      {
        sessao: 'abc12345-def6',
        eventos: [
          { tipo: 'pagina', rota: '/mercado', em: AGORA - 1000 },
          { tipo: 'clique', rota: '/mercado' },
          { tipo: 'pagina', rota: 'mercado' },
          { tipo: 'acao', rota: '/vender', alvo: '  publicar-anuncio  ', detalhes: { qtd: 2, texto: 'ok', email: 'a@b.com', 'chave inválida': 1 } },
        ],
      },
      AGORA,
    )
    expect(lote?.sessao).toBe('abc12345-def6')
    expect(lote?.eventos).toEqual([
      { tipo: 'pagina', rota: '/mercado', alvo: null, detalhes: {}, createdAt: AGORA - 1000 },
      { tipo: 'acao', rota: '/vender', alvo: 'publicar-anuncio', detalhes: { qtd: 2, texto: 'ok' }, createdAt: AGORA },
    ])
    const grande = validarLoteDeEventos({ eventos: Array.from({ length: 80 }, () => ({ tipo: 'pagina', rota: '/inicio' })) }, AGORA)
    expect(grande?.eventos).toHaveLength(50)
    expect(grande?.sessao).toBeNull()
  })

  it('relógio do cliente fora da tolerância vira o relógio do servidor', () => {
    const lote = validarLoteDeEventos(
      { eventos: [{ tipo: 'pagina', rota: '/a', em: AGORA - 11 * 60 * 1000 }, { tipo: 'pagina', rota: '/b', em: AGORA + 2 * 60 * 1000 }] },
      AGORA,
    )
    expect(lote?.eventos.map((e) => e.createdAt)).toEqual([AGORA, AGORA])
  })

  it('alvo com arroba não entra: alvo é nome de elemento, nunca texto digitado', () => {
    const lote = validarLoteDeEventos({ eventos: [{ tipo: 'acao', rota: '/conta', alvo: 'fulano@exemplo.com.br' }] }, AGORA)
    expect(lote?.eventos[0].alvo).toBeNull()
  })
})

describe('plataformaResumida', () => {
  it('reduz o user agent ao sistema operacional', () => {
    expect(plataformaResumida('Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36')).toBe('android')
    expect(plataformaResumida('Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X)')).toBe('ios')
    expect(plataformaResumida('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe('windows')
    expect(plataformaResumida('Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5)')).toBe('macos')
    expect(plataformaResumida('Mozilla/5.0 (X11; Linux x86_64)')).toBe('linux')
    expect(plataformaResumida(null)).toBe('outra')
  })
})

function ev(parcial: Partial<EventoDeUso> & { createdAt: number }): EventoDeUso {
  return { userEmail: 'a@x.com', sessao: 's1', tipo: 'pagina', rota: '/inicio', alvo: null, plataforma: 'windows', ...parcial }
}

describe('resumirUso', () => {
  const H = 60 * 60 * 1000

  it('conta páginas, sessões, contas e plataformas, e ordena as páginas mais abertas', () => {
    const r = resumirUso({
      eventos: [
        ev({ createdAt: AGORA, rota: '/mercado' }),
        ev({ createdAt: AGORA + 1, rota: '/mercado', userEmail: 'b@x.com', sessao: 's2', plataforma: 'android' }),
        ev({ createdAt: AGORA + 2, rota: '/inicio' }),
        ev({ createdAt: AGORA + 3, tipo: 'acao', alvo: 'menu' }),
      ],
      trilha: [],
      primeirasVendas: {},
    })
    expect(r).toMatchObject({ totalEventos: 4, paginasVistas: 3, acoesNaTela: 1, sessoes: 2, contas: 2 })
    expect(r.paginasMaisAbertas).toEqual([
      { rota: '/mercado', vezes: 2, contas: 2 },
      { rota: '/inicio', vezes: 1, contas: 1 },
    ])
    expect(r.plataformas).toEqual([
      { plataforma: 'windows', eventos: 3 },
      { plataforma: 'android', eventos: 1 },
    ])
  })

  it('horário de pico no fuso de Brasília; ações de sistema ficam de fora', () => {
    const r = resumirUso({
      eventos: [ev({ createdAt: AGORA })],
      trilha: [
        { createdAt: AGORA + H, ator: 'a@x.com', acao: 'negociacao' },
        { createdAt: AGORA + H, ator: 'cron:faturamento', acao: 'custodia.faturar' },
      ],
      primeirasVendas: {},
    })
    expect(r.porHora[12]).toBe(1)
    expect(r.porHora[13]).toBe(1)
    expect(r.porHora.reduce((s, n) => s + n, 0)).toBe(2)
    expect(r.acoesMaisFrequentes).toEqual([{ acao: 'negociacao', vezes: 1 }])
    expect(r.acoesPorConta).toEqual([{ email: 'a@x.com', paginas: 1, acoesNaTela: 0, acoesNoServidor: 1, ultimaAtividade: AGORA + H }])
  })

  it('jornada até a primeira venda: só o que veio antes da venda, e só de quem tem registro antes', () => {
    const r = resumirUso({
      eventos: [
        ev({ createdAt: AGORA, rota: '/inicio' }),
        ev({ createdAt: AGORA + 10 * 60000, rota: '/vender' }),
        ev({ createdAt: AGORA + 90 * 60000, rota: '/conta' }),
        ev({ createdAt: AGORA + 5, userEmail: 'b@x.com', rota: '/vender' }),
      ],
      trilha: [],
      primeirasVendas: { 'a@x.com': AGORA + 30 * 60000, 'b@x.com': AGORA - H, 'c@x.com': AGORA },
    })
    expect(r.jornadas).toMatchObject({ contasComVenda: 3, contasComJornada: 1, medianaMinutos: 30, mediaPaginasAntes: 2 })
    expect(r.jornadas.paginasAntesDaVenda).toEqual([
      { rota: '/inicio', contas: 1 },
      { rota: '/vender', contas: 1 },
    ])
  })

  it('mediana e primeirasVendasDe', () => {
    expect(mediana([])).toBeNull()
    expect(mediana([5, 1, 3])).toBe(3)
    expect(mediana([1, 2, 3, 4])).toBe(3)
    expect(primeirasVendasDe([{ seller: 'a', date: 5 }, { seller: 'a', date: 2 }, { seller: 'b', date: 9 }])).toEqual({ a: 2, b: 9 })
  })
})
