import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { _resetTokenParaTestes, chamarCws, ErroCorreios } from './cliente'
import { correiosConfigurado, lerConfigCorreios } from './config'
import { cotarServico, reaisParaCents } from './preco-prazo'
import { baixarRotuloPdf, corpoDaPrePostagem, criarPrePostagem, separarTelefone } from './prepostagem'
import { converterObjeto, rastrearObjetos, statusDoEvento } from './rastro'

const ENV = {
  CORREIOS_USUARIO: '68071452000106',
  CORREIOS_CODIGO_ACESSO: 'codigo-de-teste',
  CORREIOS_CARTAO_POSTAGEM: '0080378641',
  CORREIOS_CONTRATO: '9912766936',
  CORREIOS_DR: '20',
}

function json(corpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(corpo), { status, headers: { 'Content-Type': 'application/json' } })
}

/** Token que vence daqui a 24h, no formato dos Correios (sem fuso, com zoneOffset ao lado). */
function respostaToken(token = 'tk-1'): Response {
  const amanha = new Date(Date.now() + 24 * 3600 * 1000 - 3 * 3600 * 1000).toISOString().slice(0, 19)
  return json({ token, expiraEm: amanha, zoneOffset: '-03:00' }, 201)
}

describe('CWS — configuração', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('só está configurado com as cinco variáveis', () => {
    for (const [k, v] of Object.entries(ENV)) vi.stubEnv(k, v)
    expect(correiosConfigurado()).toBe(true)
    expect(lerConfigCorreios()?.dr).toBe(20)
    vi.stubEnv('CORREIOS_CODIGO_ACESSO', '')
    expect(correiosConfigurado()).toBe(false)
  })
})

describe('CWS — cliente e token', () => {
  const fetchMock = vi.fn()
  beforeEach(() => {
    for (const [k, v] of Object.entries(ENV)) vi.stubEnv(k, v)
    _resetTokenParaTestes()
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('pede o token uma vez, por cartão de postagem, e o reaproveita', async () => {
    fetchMock.mockImplementation(async (url: string) =>
      url.includes('/token/') ? respostaToken() : json({ ok: true }),
    )
    await chamarCws('/x/v1/a')
    await chamarCws('/x/v1/b')
    const pedidosDeToken = fetchMock.mock.calls.filter(([u]) => String(u).includes('/token/'))
    expect(pedidosDeToken).toHaveLength(1)
    expect(String(pedidosDeToken[0][0])).toContain('/token/v1/autentica/cartaopostagem')
    const corpo = JSON.parse(pedidosDeToken[0][1].body)
    expect(corpo).toEqual({ numero: '0080378641', contrato: '9912766936', dr: 20 })
  })

  it('renova o token e repete UMA vez quando os Correios respondem 401', async () => {
    let tokens = 0
    let chamadas = 0
    fetchMock.mockImplementation(async (url: string) => {
      if (url.includes('/token/')) return respostaToken(`tk-${++tokens}`)
      chamadas += 1
      return chamadas === 1 ? json({ msgs: ['expirado'] }, 401) : json({ ok: true })
    })
    await expect(chamarCws('/x/v1/a')).resolves.toEqual({ ok: true })
    expect(tokens).toBe(2)
  })

  it('erro dos Correios sobe como ErroCorreios com as mensagens deles', async () => {
    fetchMock.mockImplementation(async (url: string) =>
      url.includes('/token/') ? respostaToken() : json({ msgs: ['ERP-054: Serviço adicional 019 nao pode'] }, 400),
    )
    const erro = await chamarCws('/preco/v1/nacional/03298').catch((e: unknown) => e)
    expect(erro).toBeInstanceOf(ErroCorreios)
    expect((erro as ErroCorreios).mensagens[0]).toContain('ERP-054')
  })

  it('sem contrato configurado, recusa antes de chamar a rede', async () => {
    vi.stubEnv('CORREIOS_CODIGO_ACESSO', '')
    await expect(chamarCws('/x')).rejects.toBeInstanceOf(ErroCorreios)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('cota com vírgula decimal e o adicional de valor declarado certo para cada serviço', async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (url.includes('/token/')) return respostaToken()
      if (url.includes('/preco/')) return json({ pcFinal: '21,14', pcProduto: '18,40', pcTotalServicosAdicionais: '2,74' })
      return json({ prazoEntrega: 5, dataMaxima: '2026-10-29T23:59:59' })
    })
    const c = await cotarServico({
      codigoServico: '03301',
      modalidade: 'PAC',
      cepOrigem: '01310100',
      cepDestino: '30315970',
      dimensoes: { pesoGramas: 300, comprimentoCm: 16, larguraCm: 11, alturaCm: 6 },
      valorDeclaradoCents: 30000,
    })
    expect(c).toMatchObject({ precoTotalCents: 2114, precoServicoCents: 1840, precoAdicionaisCents: 274, prazoDiasUteis: 5 })
    const urlPreco = String(fetchMock.mock.calls.find(([u]) => String(u).includes('/preco/'))?.[0])
    expect(urlPreco).toContain('servicosAdicionais=064')
    expect(urlPreco).toContain('vlDeclarado=300.00')
    expect(urlPreco).toContain('nuContrato=9912766936')
  })

  it('cria a pré-postagem e devolve id e código do objeto', async () => {
    fetchMock.mockImplementation(async (url: string) =>
      url.includes('/token/')
        ? respostaToken()
        : json({ id: 'PRIabc', codigoObjeto: 'AP647133258BR', statusAtual: 7, prazoPostagem: '2027-01-20' }),
    )
    const r = await criarPrePostagem({
      codigoServico: '03301',
      modalidade: 'PAC',
      remetente: { nome: 'Ana Cliente', cpfCnpj: '123.456.789-09', email: 'ana@x.com', endereco: { cep: '01310-100', logradouro: 'Av Paulista', numero: '1000', bairro: 'Bela Vista', cidade: 'São Paulo', uf: 'SP' } },
      destinatario: { nome: 'AUREA CUSTODIA LTDA', endereco: { cep: '30315-970', logradouro: 'Caixa Postal 7990', numero: 'S/N', bairro: 'Comiteco', cidade: 'Belo Horizonte', uf: 'MG' } },
      dimensoes: { pesoGramas: 300, comprimentoCm: 16, larguraCm: 11, alturaCm: 6 },
      valorDeclaradoCents: 15000,
      itens: [{ conteudo: 'Moeda comemorativa / colecionável', quantidade: 1, valorUnitarioCents: 15000 }],
      logisticaReversa: true,
    })
    expect(r).toEqual({ id: 'PRIabc', codigoObjeto: 'AP647133258BR', statusAtual: 7, prazoPostagem: '2027-01-20' })
  })

  it('baixa o rótulo depois que os Correios terminam de gerar', async () => {
    let downloads = 0
    fetchMock.mockImplementation(async (url: string) => {
      if (url.includes('/token/')) return respostaToken()
      if (url.endsWith('/rotulo/assincrono/pdf')) return json({ idRecibo: 'rec1' })
      downloads += 1
      return downloads < 2 ? json({ msgs: ['em processamento'] }, 404) : json({ dados: Buffer.from('%PDF-1.4').toString('base64') })
    })
    const pdf = await baixarRotuloPdf(['AP647133258BR'], { intervaloMs: 1 })
    expect(pdf.toString()).toBe('%PDF-1.4')
    expect(downloads).toBe(2)
  })

  it('etiqueta pedida com a pré-postagem ainda Pendente (PPN-288): pede recibo NOVO em vez de esperar o preso', async () => {
    const recibos: string[] = []
    fetchMock.mockImplementation(async (url: string) => {
      if (url.includes('/token/')) return respostaToken()
      if (url.endsWith('/rotulo/assincrono/pdf')) {
        recibos.push(`rec${recibos.length + 1}`)
        return json({ idRecibo: recibos[recibos.length - 1] })
      }
      // O primeiro recibo nasceu com a pré-postagem pendente e fica preso no PPN-288 (HTTP 200).
      if (url.endsWith('/rec1')) {
        return json({ mensagem: 'PPN-288: Não é permitido imprimir rótulo de pré-postagem com status igual a Pendente.' })
      }
      return json({ dados: Buffer.from('%PDF-1.4').toString('base64') })
    })
    const pdf = await baixarRotuloPdf(['AP647133258BR'], { intervaloMs: 1 })
    expect(pdf.toString()).toBe('%PDF-1.4')
    expect(recibos).toEqual(['rec1', 'rec2'])
  })

  it('PDF ainda em geração (PPN-291): consulta o MESMO recibo de novo até ficar pronto', async () => {
    const recibos: string[] = []
    let consultas = 0
    fetchMock.mockImplementation(async (url: string) => {
      if (url.includes('/token/')) return respostaToken()
      if (url.endsWith('/rotulo/assincrono/pdf')) {
        recibos.push('rec1')
        return json({ idRecibo: 'rec1' })
      }
      consultas += 1
      return consultas < 3
        ? json({ mensagem: 'PPN-291: O rótulo ainda não foi gerado. Por favor, consulte novamente.' })
        : json({ dados: Buffer.from('%PDF-1.4').toString('base64') })
    })
    const pdf = await baixarRotuloPdf(['AE061097728BR'], { intervaloMs: 1 })
    expect(pdf.toString()).toBe('%PDF-1.4')
    expect(recibos).toEqual(['rec1'])
    expect(consultas).toBe(3)
  })

  it('recibo travado em PPN-291: depois de 4 consultas, pede outro recibo', async () => {
    const recibos: string[] = []
    fetchMock.mockImplementation(async (url: string) => {
      if (url.includes('/token/')) return respostaToken()
      if (url.endsWith('/rotulo/assincrono/pdf')) {
        recibos.push(`rec${recibos.length + 1}`)
        return json({ idRecibo: recibos[recibos.length - 1] })
      }
      return url.endsWith('/rec1')
        ? json({ mensagem: 'PPN-291: O rótulo ainda não foi gerado. Por favor, consulte novamente.' })
        : json({ dados: Buffer.from('%PDF-1.4').toString('base64') })
    })
    const pdf = await baixarRotuloPdf(['AE061097728BR'], { intervaloMs: 1 })
    expect(pdf.toString()).toBe('%PDF-1.4')
    expect(recibos).toEqual(['rec1', 'rec2'])
  })

  it('outra mensagem dos Correios no lugar do PDF sobe na hora, com o texto deles', async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (url.includes('/token/')) return respostaToken()
      if (url.endsWith('/rotulo/assincrono/pdf')) return json({ idRecibo: 'rec1' })
      return json({ mensagem: 'PPN-999: Objeto cancelado.' })
    })
    await expect(baixarRotuloPdf(['AP1'], { intervaloMs: 1 })).rejects.toThrow('PPN-999')
  })

  it('manda Accept-Language pt-BR (o SRO recusa o "*" que o fetch do Node põe sozinho)', async () => {
    fetchMock.mockImplementation(async (url: string) => (url.includes('/token/') ? respostaToken() : json({ ok: true })))
    await chamarCws('/srorastro/v1/objetos')
    const chamada = fetchMock.mock.calls.find(([u]) => String(u).includes('/srorastro/'))
    expect(chamada?.[1].headers['Accept-Language']).toBe('pt-BR')
  })

  it('rastreia em lotes de 50 e não perde código fora do contrato', async () => {
    const lotes: string[][] = []
    fetchMock.mockImplementation(async (url: string) => {
      if (url.includes('/token/')) return respostaToken()
      const codigos = new URL(url).searchParams.getAll('codigosObjetos')
      lotes.push(codigos)
      return json({
        objetos: codigos.map((c) => ({
          codObjeto: c,
          eventos: [{ codigo: 'PO', tipo: '01', dtHrCriado: '2026-10-22T10:00:00', descricao: 'Objeto postado', unidade: { tipo: 'Agência dos Correios', endereco: { cidade: 'SAO PAULO', uf: 'SP' } } }],
        })),
      })
    })
    const codigos = Array.from({ length: 51 }, (_, i) => `AP${String(i).padStart(9, '0')}BR`)
    const r = await rastrearObjetos(codigos)
    expect(lotes.map((l) => l.length)).toEqual([50, 1])
    expect(Object.keys(r)).toHaveLength(51)
    expect(r[codigos[0]].statusAtual).toBe('postado')
  })
})

describe('CWS — conversões puras', () => {
  it('reaisParaCents lê vírgula decimal e milhar', () => {
    expect(reaisParaCents('31,59')).toBe(3159)
    expect(reaisParaCents('1.234,56')).toBe(123456)
    expect(reaisParaCents('25.63')).toBe(2563)
    expect(reaisParaCents(undefined)).toBe(0)
  })

  it('separarTelefone aceita celular, fixo e +55', () => {
    expect(separarTelefone('(31) 99999-8888')).toEqual({ ddd: '31', celular: '999998888' })
    expect(separarTelefone('+55 31 3421-1525')).toEqual({ ddd: '31', fixo: '34211525' })
    expect(separarTelefone('123')).toEqual({})
  })

  it('o corpo da pré-postagem corta os campos nos limites da API e usa o VD do serviço', () => {
    const corpo = corpoDaPrePostagem({
      codigoServico: '03247',
      modalidade: 'SEDEX',
      remetente: {
        nome: 'Nome muito comprido que passa dos cinquenta caracteres permitidos',
        cpfCnpj: '123.456.789-09',
        telefone: '31999998888',
        endereco: { cep: '01310-100', logradouro: 'Avenida Paulista', numero: '1000000', complemento: 'Conjunto 101 bloco B torre norte andar 12', bairro: 'Bela Vista', cidade: 'São Paulo', uf: 'sp' },
      },
      destinatario: { nome: 'AUREA CUSTODIA LTDA', endereco: { cep: '30315970', logradouro: 'Caixa Postal 7990', numero: 'S/N', bairro: 'Comiteco', cidade: 'Belo Horizonte', uf: 'MG' } },
      dimensoes: { pesoGramas: 330, comprimentoCm: 16, larguraCm: 11, alturaCm: 6 },
      valorDeclaradoCents: 1000,
      itens: [{ conteudo: 'Moeda comemorativa / colecionável', quantidade: 2, valorUnitarioCents: 15000 }],
      logisticaReversa: true,
    }) as {
      remetente: { nome: string; cpfCnpj: string; endereco: Record<string, string> } & Record<string, unknown>
      listaServicoAdicional: unknown
      itensDeclaracaoConteudo: unknown
      logisticaReversa: string
    }
    expect(corpo.remetente.nome).toHaveLength(50)
    expect(corpo.remetente.cpfCnpj).toBe('12345678909')
    expect(corpo.remetente.endereco.numero).toHaveLength(6)
    expect(corpo.remetente.endereco.complemento).toHaveLength(30)
    expect(corpo.remetente.endereco.uf).toBe('SP')
    expect(corpo.remetente).toMatchObject({ dddCelular: '31', celular: '999998888' })
    // VD abaixo do mínimo sobe para R$ 24,50; SEDEX usa o adicional 019.
    expect(corpo.listaServicoAdicional).toEqual([{ codigoServicoAdicional: '019', valorDeclarado: '24.50' }])
    expect(corpo.itensDeclaracaoConteudo).toEqual([{ conteudo: 'Moeda comemorativa / colecionável', quantidade: '2', valor: '150.00' }])
    expect(corpo.logisticaReversa).toBe('S')
  })

  it('o status sai do código do evento, não da frase', () => {
    expect(statusDoEvento({ codigo: 'BDE', tipo: '01', descricao: 'Objeto entregue ao destinatário' })).toBe('entregue')
    expect(statusDoEvento({ codigo: 'BDE', tipo: '23', descricao: 'Objeto devolvido' })).toBe('devolvido')
    expect(statusDoEvento({ codigo: 'FC', tipo: '82', descricao: 'Etiqueta emitida' })).toBe('aguardando_postagem')
    expect(statusDoEvento({ codigo: 'FC', tipo: '84', descricao: 'Etiqueta cancelada pelo emissor' })).toBe('cancelado')
    expect(statusDoEvento({ codigo: 'XYZ', tipo: '01', descricao: 'Objeto não entregue - endereço incorreto' })).toBe('em_transito')
  })

  it('objeto fora do contrato vira nao_encontrado com a mensagem dos Correios', () => {
    const r = converterObjeto({ codObjeto: 'AA123456789BR', mensagem: 'SRO-009: Objeto não pertence ao contrato' })
    expect(r.statusAtual).toBe('nao_encontrado')
    expect(r.erro).toContain('SRO-009')
  })

  it('a hora do SRO é de Brasília', () => {
    const r = converterObjeto({
      codObjeto: 'AP1',
      eventos: [{ codigo: 'PO', tipo: '01', dtHrCriado: '2026-10-22T12:37:08', descricao: 'Objeto postado' }],
    })
    expect(new Date(r.dataUltimaAtualizacao).toISOString()).toBe('2026-10-22T15:37:08.000Z')
  })
})
