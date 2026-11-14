/**
 * Testes do rastreamento da Meta: normalização e hash (o ponto onde um espaço a mais faz o cadastro sumir da campanha),
 * montagem do pedido à API de Conversões e a regra de "rastreamento nunca derruba o produto".
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import {
  COOKIE_EVENTO_PENDENTE,
  lerEventoPendente,
  lerPixelId,
  parametrosDoCadastro,
  serializarEventoPendente,
} from '@/lib/meta/eventos'

import {
  contextoDaRequisicao,
  enviarEventoDoServidor,
  montarCorpo,
  montarUserData,
} from './conversions-api'
import { hashEmail, hashNomes, hashPais, sha256 } from './normalizacao'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('normalização para a Meta', () => {
  it('e-mail: tira espaços e maiúsculas antes do hash (vetor oficial da Meta)', () => {
    expect(hashEmail('  John_Smith@gmail.com ')).toBe(sha256('john_smith@gmail.com'))
    // SHA-256 conhecido de "john_smith@gmail.com" — se a normalização mudar, este valor quebra.
    expect(hashEmail('John_Smith@gmail.com')).toBe(
      '62a14e44f765419d10fea99367361a727c12365e2520f32218d505ed9aa0f62f',
    )
  })

  it('e-mail vazio não vira hash', () => {
    expect(hashEmail('   ')).toBeUndefined()
  })

  it('nome: primeiro e último, minúsculas, sem pontuação, acento preservado', () => {
    const { fn, ln } = hashNomes('  Maria  da Silva-Júnior. ')
    expect(fn).toBe(sha256('maria'))
    expect(ln).toBe(sha256('silvajúnior'))
  })

  it('nome de uma palavra só não tem sobrenome', () => {
    const { fn, ln } = hashNomes('Madonna')
    expect(fn).toBe(sha256('madonna'))
    expect(ln).toBeUndefined()
  })

  it('país: br em minúsculas', () => {
    expect(hashPais(' BR ')).toBe(sha256('br'))
  })
})

describe('user_data', () => {
  it('manda hash onde se exige hash e texto puro onde se exige texto puro', () => {
    const u = montarUserData({
      email: 'Ana@Exemplo.com',
      nomeCompleto: 'Ana Souza',
      ip: '200.1.2.3',
      userAgent: 'Mozilla/5.0',
      fbp: 'fb.1.1558571054389.1098115397',
      fbc: 'fb.1.1554763741205.AbCdEf',
    })
    expect(u.em).toEqual([sha256('ana@exemplo.com')])
    expect(u.fn).toEqual([sha256('ana')])
    expect(u.ln).toEqual([sha256('souza')])
    expect(u.country).toEqual([sha256('br')])
    // Nunca em hash:
    expect(u.client_ip_address).toBe('200.1.2.3')
    expect(u.client_user_agent).toBe('Mozilla/5.0')
    expect(u.fbp).toBe('fb.1.1558571054389.1098115397')
    expect(u.fbc).toBe('fb.1.1554763741205.AbCdEf')
  })

  it('o e-mail em texto puro nunca aparece no pedido', () => {
    const corpo = JSON.stringify(
      montarCorpo({
        nome: 'CompleteRegistration',
        eventId: 'abc-12345678',
        urlDaOrigem: 'https://realolimpico.com.br/cadastrar',
        usuario: { email: 'ana@exemplo.com', nomeCompleto: 'Ana Souza' },
      }),
    )
    expect(corpo).not.toContain('ana@exemplo.com')
    expect(corpo).not.toContain('Souza')
  })
})

describe('pedido à API de Conversões', () => {
  it('leva o que a Meta exige: nome, tempo, ID, URL, action_source website e user_data', () => {
    const corpo = montarCorpo(
      {
        nome: 'CompleteRegistration',
        eventId: 'abc-12345678',
        urlDaOrigem: 'https://realolimpico.com.br/cadastrar',
        usuario: { email: 'ana@exemplo.com' },
        dadosCustom: parametrosDoCadastro('cadastro_email'),
      },
      'TEST123',
    ) as { data: Record<string, unknown>[]; test_event_code?: string }
    const evento = corpo.data[0]
    expect(evento).toMatchObject({
      event_name: 'CompleteRegistration',
      event_id: 'abc-12345678',
      event_source_url: 'https://realolimpico.com.br/cadastrar',
      action_source: 'website',
      custom_data: { status: true, content_name: 'cadastro_email' },
    })
    expect(typeof evento.event_time).toBe('number')
    expect(corpo.test_event_code).toBe('TEST123')
  })

  it('sem código de teste, o campo não existe (evento de produção)', () => {
    const corpo = montarCorpo({
      nome: 'CompleteRegistration',
      eventId: 'abc-12345678',
      urlDaOrigem: 'https://realolimpico.com.br/',
      usuario: {},
    })
    expect(corpo).not.toHaveProperty('test_event_code')
  })

  it('sem META_PIXEL_ID e sem chave, não faz requisição nenhuma', async () => {
    vi.stubEnv('META_PIXEL_ID', '')
    vi.stubEnv('META_CAPI_ACCESS_TOKEN', '')
    const fetchFalso = vi.fn()
    vi.stubGlobal('fetch', fetchFalso)
    enviarEventoDoServidor({ nome: 'CompleteRegistration', eventId: 'x', urlDaOrigem: 'u', usuario: {} })
    await new Promise((r) => setTimeout(r, 10))
    expect(fetchFalso).not.toHaveBeenCalled()
  })

  it('com tudo configurado, envia ao endereço do Pixel', async () => {
    vi.stubEnv('META_PIXEL_ID', '1234567890123456')
    vi.stubEnv('META_CAPI_ACCESS_TOKEN', 'segredo-de-teste')
    const fetchFalso = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchFalso)
    enviarEventoDoServidor({ nome: 'CompleteRegistration', eventId: 'x', urlDaOrigem: 'u', usuario: {} })
    await vi.waitFor(() => expect(fetchFalso).toHaveBeenCalledTimes(1))
    const [url, init] = fetchFalso.mock.calls[0] as [string, { method: string; body: string }]
    expect(url).toBe('https://graph.facebook.com/v27.0/1234567890123456/events')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body).access_token).toBe('segredo-de-teste')
  })

  it('falha da Meta (rede caiu) nunca propaga erro para o cadastro e não vaza o segredo no log', async () => {
    vi.stubEnv('META_PIXEL_ID', '1234567890123456')
    vi.stubEnv('META_CAPI_ACCESS_TOKEN', 'segredo-de-teste')
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('rede caiu segredo-de-teste')))
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    expect(() =>
      enviarEventoDoServidor({ nome: 'CompleteRegistration', eventId: 'x', urlDaOrigem: 'u', usuario: {} }),
    ).not.toThrow()
    await vi.waitFor(() => expect(aviso).toHaveBeenCalled())
    expect(JSON.stringify(aviso.mock.calls)).not.toContain('segredo-de-teste')
    aviso.mockRestore()
  })
})

describe('contexto da requisição', () => {
  it('extrai IP, navegador e cookies do Pixel', () => {
    const h = new Headers({
      'x-forwarded-for': '200.1.2.3, 10.0.0.1',
      'user-agent': 'UA',
      cookie: 'a=1; _fbp=fb.1.111.222; _fbc=fb.1.333.clique',
      referer: 'https://realolimpico.com.br/cadastrar',
    })
    expect(contextoDaRequisicao(h, 'https://padrao')).toEqual({
      ip: '200.1.2.3',
      userAgent: 'UA',
      fbp: 'fb.1.111.222',
      fbc: 'fb.1.333.clique',
      url: 'https://realolimpico.com.br/cadastrar',
    })
  })

  it('sem cabeçalhos usa a página padrão', () => {
    expect(contextoDaRequisicao(new Headers(), 'https://padrao').url).toBe('https://padrao')
  })
})

describe('contrato compartilhado', () => {
  it('só aceita ID de Pixel numérico (o valor entra num <script>)', () => {
    expect(lerPixelId('1234567890123456')).toBe('1234567890123456')
    expect(lerPixelId(' 1234567890123456 ')).toBe('1234567890123456')
    expect(lerPixelId("1');alert(1);//")).toBeNull()
    expect(lerPixelId('')).toBeNull()
    expect(lerPixelId(undefined)).toBeNull()
  })

  it('o evento pendente do cookie vai e volta, e rejeita lixo', () => {
    const cru = serializarEventoPendente({
      nome: 'CompleteRegistration',
      eventId: '3f2b1c9a-1111-4222-8333-444455556666',
      metodo: 'cadastro_google',
    })
    expect(lerEventoPendente(cru)).toEqual({
      nome: 'CompleteRegistration',
      eventId: '3f2b1c9a-1111-4222-8333-444455556666',
      metodo: 'cadastro_google',
    })
    expect(lerEventoPendente('Purchase.abc12345.cadastro_google')).toBeNull()
    expect(lerEventoPendente('CompleteRegistration.<img>.cadastro_google')).toBeNull()
    expect(lerEventoPendente('CompleteRegistration.abc12345.outro')).toBeNull()
    expect(lerEventoPendente(null)).toBeNull()
    expect(COOKIE_EVENTO_PENDENTE).toBe('ro_meta_evt')
  })
})
