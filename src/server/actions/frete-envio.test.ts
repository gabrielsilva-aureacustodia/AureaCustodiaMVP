/**
 * Frete do envio pago no site (22/10/2026) — as Server Actions de src/server/actions/custody.ts e a
 * varredura de envios vencidos de src/server/shipping/frete-envio.ts.
 *
 * Os Correios entram por dublê (cotação, pré-postagem, consulta e cancelamento): o que se prova é a
 * regra — valor sempre do servidor, dono conferido, dinheiro antes da etiqueta, falha dos Correios
 * sem desfazer pagamento, frete devolvido quando o envio cai —, não a rede.
 *
 * DESDE 17/11/2026 (frente B, D4) o pagamento do envio é UM só: frete + 1º mês de custódia das moedas
 * declaradas, por saldo, Pix ou cartão. O mês é quantidade × tabela vigente (aqui, 2 moedas × R$ 2,00 = `MES`),
 * a fatura de contratação do envio nasce paga na mesma transação e se acha pelo protocolo. Os testes de cima
 * conferem que o frete segue o mesmo de antes; o bloco do fim é o do mês.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getSessionEmailMock, mutateStateMock, getStateMock } = vi.hoisted(() => ({
  getSessionEmailMock: vi.fn(),
  mutateStateMock: vi.fn(),
  getStateMock: vi.fn(),
}))

const correios = vi.hoisted(() => ({
  correiosConfigurado: vi.fn(() => true),
  cotarServico: vi.fn(),
  criarPrePostagem: vi.fn(),
  cancelarPrePostagem: vi.fn(),
  consultarPrePostagem: vi.fn(),
  criarCobrancaPix: vi.fn(),
  criarCobrancaCartao: vi.fn(),
  criarIntencao: vi.fn(),
}))

// A tabela vigente do painel: `undefined` = a do código (R$ 2,00); o teste do mês a muda para provar que o
// valor vem da tabela e não de um número fixo.
const tabela = vi.hoisted(() => ({ custodiaMensalPorMoeda: undefined as number | undefined }))

vi.mock('server-only', () => ({}))
vi.mock('@/server/session', () => ({ getSessionEmail: getSessionEmailMock }))
vi.mock('@/server/state', () => ({ mutateState: mutateStateMock, getState: getStateMock }))
vi.mock('@/server/config/carregar', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/server/config/carregar')>()
  return {
    ...original,
    carregarRegrasDoMercado: vi.fn(async () => {
      const base = await original.carregarRegrasDoMercado()
      return tabela.custodiaMensalPorMoeda === undefined
        ? base
        : { ...base, taxas: { ...base.taxas, custodiaMensalPorMoeda: tabela.custodiaMensalPorMoeda } }
    }),
  }
})
vi.mock('@/lib/shipping/cws/config', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/shipping/cws/config')>()
  return { ...original, correiosConfigurado: correios.correiosConfigurado }
})
vi.mock('@/lib/shipping/cws/preco-prazo', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/shipping/cws/preco-prazo')>()
  return { ...original, cotarServico: correios.cotarServico }
})
vi.mock('@/lib/shipping/cws/prepostagem', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/shipping/cws/prepostagem')>()
  return {
    ...original,
    criarPrePostagem: correios.criarPrePostagem,
    cancelarPrePostagem: correios.cancelarPrePostagem,
    consultarPrePostagem: correios.consultarPrePostagem,
  }
})
vi.mock('@/lib/payments/cobranca', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/payments/cobranca')>()
  return { ...original, criarCobrancaPix: correios.criarCobrancaPix, criarCobrancaCartao: correios.criarCobrancaCartao }
})
vi.mock('@/server/payments/repositorios', () => ({
  repositorioIntencoes: () => ({ criar: correios.criarIntencao, anotarPagamento: vi.fn() }),
}))

import { PRAZO_DESCARTE_ENVIO_MS } from '@/domain/envios'
import { faturasDoEnvio, primeiroMesDoEnvio } from '@/domain/primeiro-mes-do-envio'
import { seedState } from '@/domain/seed'
import type { AppState, Envio } from '@/domain/types'
import { derivarLancamentos } from '@/server/db/derivar'
import { planejarDiff } from '@/server/db/diff'
import { desconsiderarEnviosVencidos } from '@/server/shipping/frete-envio'
import {
  cotarFreteDoEnvio,
  emitirEtiquetaDoEnvio,
  iniciarCartaoFrete,
  iniciarPixFrete,
  markPosted,
  pagarFreteComSaldo,
} from './custody'

const EMAIL = 'rogeriopena@testeaurea.com.br'
const OUTRO = 'alex@testeaurea.com.br'
const PROTOCOLO = 'RO-ENV-7001'

/** O 1º mês das 2 moedas do envio de teste, a R$ 2,00 (tabela padrão): vai no mesmo pagamento do frete. */
const MES = 400

let state: AppState

function envioNovo(parciais: Partial<Envio> = {}): Envio {
  return {
    protocolo: PROTOCOLO,
    userEmail: EMAIL,
    tipoMoeda: 'Entrega da Bandeira Olímpica',
    ano: 2016,
    quantidade: 2,
    codigoRastreio: null,
    dataPostagem: null,
    dataRecebimento: null,
    etapaAtual: 'Protocolo gerado',
    createdAt: Date.now(),
    codigosAtivosGerados: [],
    origem: 'envio_postal',
    ...parciais,
  }
}

const envio = (): Envio => state.envios.find((e) => e.protocolo === PROTOCOLO)!

beforeEach(() => {
  state = seedState()
  state.users[EMAIL].balance = 10_000
  state.users[EMAIL].cadastro = {
    cpf: '529.982.247-25',
    nomeCompleto: 'Rogério Pena',
    dataNascimento: '1970-01-01',
    telefone: '(11) 98888-7777',
    endereco: { logradouro: 'Rua A', numero: '10', bairro: 'Centro', cidade: 'São Paulo', uf: 'SP', cep: '01001-000' },
    dadosBancarios: { chavePix: '52998224725', tipoChavePix: 'cpf' },
    completadoEm: 1,
  }
  state.envios.push(envioNovo())

  for (const f of Object.values(correios)) f.mockReset()
  tabela.custodiaMensalPorMoeda = undefined
  correios.correiosConfigurado.mockReturnValue(true)
  correios.cotarServico.mockImplementation(async (i: { codigoServico: string }) => ({
    codigoServico: i.codigoServico,
    precoTotalCents: i.codigoServico === '03301' ? 2_114 : 3_159,
    precoServicoCents: 2_000,
    precoAdicionaisCents: 114,
    prazoDiasUteis: i.codigoServico === '03301' ? 5 : 1,
    dataMaximaEntrega: null,
  }))
  correios.criarPrePostagem.mockResolvedValue({ id: 'PRI1', codigoObjeto: 'AP123456789BR', prazoPostagem: null, statusAtual: 2 })
  correios.cancelarPrePostagem.mockResolvedValue(undefined)
  correios.criarIntencao.mockResolvedValue(undefined)
  correios.criarCobrancaPix.mockImplementation(async (p: { externalReference: string; valorCents: number }) => ({
    externalReference: p.externalReference,
    paymentId: 'pay-1',
    qrCode: 'pix',
    qrCodeBase64: '',
    valorCents: p.valorCents,
  }))

  getSessionEmailMock.mockReset().mockResolvedValue(EMAIL)
  mutateStateMock.mockReset().mockImplementation(async (fn: (s: AppState) => unknown) => ({ state, result: await fn(state) }))
  getStateMock.mockReset().mockImplementation(async () => state)
})

describe('cotarFreteDoEnvio', () => {
  it('grava a cotação do serviço REVERSO do contrato, com o valor do servidor', async () => {
    const r = await cotarFreteDoEnvio(PROTOCOLO, 'PAC')

    expect(r).toMatchObject({ ok: true, data: { valorCents: 2_114, prazoDiasUteis: 5, origem: 'correios' } })
    expect(envio().frete).toMatchObject({ status: 'cotado', codigoServico: '03301', valorCents: 2_114, valorDeclaradoCents: 30_000 })
    expect(correios.cotarServico.mock.calls[0][0]).toMatchObject({ codigoServico: '03301', cepDestino: '30315970' })
  })

  it('protocolo de outra conta é "não encontrado"', async () => {
    getSessionEmailMock.mockResolvedValue(OUTRO)
    const r = await cotarFreteDoEnvio(PROTOCOLO, 'PAC')
    expect(r).toMatchObject({ ok: false, error: 'Protocolo não encontrado.' })
    expect(envio().frete).toBeUndefined()
  })

  it('sem contrato: devolve a estimativa local e NÃO grava frete para pagar', async () => {
    correios.correiosConfigurado.mockReturnValue(false)
    const r = await cotarFreteDoEnvio(PROTOCOLO, 'SEDEX')
    expect(r.ok).toBe(true)
    expect(r.data?.origem).toBe('tabela')
    expect(envio().frete).toBeUndefined()
  })
})

describe('pagarFreteComSaldo', () => {
  it('debita o saldo, marca o frete pago e emite a etiqueta de logística reversa', async () => {
    await cotarFreteDoEnvio(PROTOCOLO, 'PAC')
    const antes = structuredClone(state)

    const r = await pagarFreteComSaldo(PROTOCOLO)

    expect(r.ok).toBe(true)
    expect(r.data?.codigoRastreio).toBe('AP123456789BR')
    // Um pagamento só: o frete e o 1º mês de custódia das 2 moedas.
    expect(state.users[EMAIL].balance).toBe(10_000 - 2_114 - MES)
    expect(envio().frete).toMatchObject({ status: 'pago', forma: 'saldo' })
    // O frete continua sendo só o frete (é o que os Correios cobram); o mês é a fatura de contratação.
    expect(envio().frete?.valorCents).toBe(2_114)
    expect(envio().prePostagem).toMatchObject({ id: 'PRI1', codigoObjeto: 'AP123456789BR', codigoServico: '03301' })
    expect(envio().codigoRastreio).toBe('AP123456789BR')
    expect(envio().etapaAtual).toBe('Protocolo gerado')
    expect(envio().dataPostagem).toBeNull()

    const pedido = correios.criarPrePostagem.mock.calls[0][0]
    expect(pedido).toMatchObject({
      logisticaReversa: true,
      observacao: PROTOCOLO,
      valorDeclaradoCents: 30_000,
      remetente: { nome: 'Rogério Pena', email: EMAIL, cpfCnpj: '529.982.247-25' },
      destinatario: { nome: 'AUREA CUSTODIA LTDA', endereco: { cep: '30315970', logradouro: 'Caixa Postal 7990', numero: 'S/N', bairro: 'Comiteco' } },
    })
    expect(pedido.itens).toEqual([{ conteudo: 'Moeda comemorativa / colecionável', quantidade: 2, valorUnitarioCents: 15_000 }])

    // O ledger fecha sem ajuste: o débito do frete é o lançamento `frete` e o do mês, o lançamento `custodia`
    // (a fatura de contratação passou a paga na mesma mutação). As operações vêm do diff, como no `mutarEstado`.
    const d = derivarLancamentos({
      antes,
      depois: state,
      ops: planejarDiff(antes, state),
      semeadura: false,
      agora: Date.now(),
      hashAnterior: 'h',
    })
    expect(d.ajustes).toEqual([])
    expect(d.lancamentos.map((l) => l.tipo).sort()).toEqual(['custodia', 'frete'])
  })

  it('pagar de novo não cobra duas vezes', async () => {
    await cotarFreteDoEnvio(PROTOCOLO, 'PAC')
    await pagarFreteComSaldo(PROTOCOLO)
    const r = await pagarFreteComSaldo(PROTOCOLO)
    expect(r.ok).toBe(false)
    expect(state.users[EMAIL].balance).toBe(10_000 - 2_114 - MES)
    expect(correios.criarPrePostagem).toHaveBeenCalledTimes(1)
    // E o mês tampouco: uma fatura de contratação só.
    expect(faturasDoEnvio(state, PROTOCOLO)).toHaveLength(1)
  })

  it('saldo insuficiente recusa sem tocar em nada', async () => {
    await cotarFreteDoEnvio(PROTOCOLO, 'PAC')
    state.users[EMAIL].balance = 100
    const r = await pagarFreteComSaldo(PROTOCOLO)
    expect(r.ok).toBe(false)
    expect(r.error).toContain('Saldo insuficiente')
    expect(envio().frete?.status).toBe('cotado')
    expect(correios.criarPrePostagem).not.toHaveBeenCalled()
  })

  it('falha dos Correios depois do pagamento não devolve o dinheiro: a etiqueta é pedida de novo', async () => {
    await cotarFreteDoEnvio(PROTOCOLO, 'PAC')
    correios.criarPrePostagem.mockRejectedValueOnce(new Error('Correios fora do ar'))

    const r = await pagarFreteComSaldo(PROTOCOLO)
    expect(r.ok).toBe(true)
    expect(r.data?.codigoRastreio).toBeNull()
    expect(envio().frete?.status).toBe('pago')
    expect(envio().prePostagem ?? null).toBeNull()

    const de = await emitirEtiquetaDoEnvio(PROTOCOLO)
    expect(de).toMatchObject({ ok: true, data: { codigoRastreio: 'AP123456789BR' } })
    // Idempotente: a segunda vez devolve a mesma, sem outra chamada.
    await emitirEtiquetaDoEnvio(PROTOCOLO)
    expect(correios.criarPrePostagem).toHaveBeenCalledTimes(2)
  })

  it('cotação com mais de 24 h é refeita; preço diferente recusa e mostra o valor novo', async () => {
    await cotarFreteDoEnvio(PROTOCOLO, 'PAC')
    envio().frete!.cotadoEm = Date.now() - 25 * 3600 * 1000
    correios.cotarServico.mockResolvedValueOnce({
      codigoServico: '03301',
      precoTotalCents: 2_300,
      precoServicoCents: 2_200,
      precoAdicionaisCents: 100,
      prazoDiasUteis: 5,
      dataMaximaEntrega: null,
    })

    const r = await pagarFreteComSaldo(PROTOCOLO)
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/R\$\s23,00/)
    expect(envio().frete).toMatchObject({ status: 'cotado', valorCents: 2_300 })
    expect(state.users[EMAIL].balance).toBe(10_000)
  })

  it('sem contrato configurado, o frete não se paga no site', async () => {
    await cotarFreteDoEnvio(PROTOCOLO, 'PAC')
    correios.correiosConfigurado.mockReturnValue(false)
    const r = await pagarFreteComSaldo(PROTOCOLO)
    expect(r.ok).toBe(false)
    expect(state.users[EMAIL].balance).toBe(10_000)
  })
})

describe('iniciarPixFrete', () => {
  it('abre a intenção frete_envio com o valor gravado e a referência FRT-', async () => {
    await cotarFreteDoEnvio(PROTOCOLO, 'SEDEX')
    const r = await iniciarPixFrete(PROTOCOLO)

    expect(r.ok).toBe(true)
    const intencao = correios.criarIntencao.mock.calls[0][0]
    // A cobrança é UMA: frete (R$ 31,59) + o 1º mês das 2 moedas, que fica congelado na intenção.
    expect(intencao).toMatchObject({
      tipoOperacao: 'frete_envio',
      valor: 3_159 + MES,
      metadata: { protocolo: PROTOCOLO, primeiroMesCents: MES },
    })
    expect(intencao.externalReference).toMatch(/^FRT-/)
    expect(envio().frete).toMatchObject({ status: 'cotado', forma: 'pix', paymentIntentRef: intencao.externalReference })
  })
})

describe('markPosted com etiqueta oficial', () => {
  it('envio com pré-postagem não aceita código digitado', async () => {
    await cotarFreteDoEnvio(PROTOCOLO, 'PAC')
    await pagarFreteComSaldo(PROTOCOLO)
    const r = await markPosted(PROTOCOLO, 'AA123456789BR')
    expect(r.ok).toBe(false)
    expect(envio().dataPostagem).toBeNull()
  })

  it('envio vencido com frete pago e sem etiqueta: desconsidera e devolve o frete', async () => {
    await cotarFreteDoEnvio(PROTOCOLO, 'PAC')
    correios.criarPrePostagem.mockRejectedValueOnce(new Error('fora do ar'))
    await pagarFreteComSaldo(PROTOCOLO)
    envio().createdAt = Date.now() - PRAZO_DESCARTE_ENVIO_MS - 1

    const r = await markPosted(PROTOCOLO, 'AA123456789BR')
    expect(r.ok).toBe(false)
    expect(r.error).toContain('voltou ao seu saldo')
    // O frete volta; o 1º mês pago NÃO — devolvê-lo (e cancelar a nota dele) é do cancelamento de envio, que é da
    // frente H. O mês continua achável pelo protocolo: `faturasDoEnvio`.
    expect(state.users[EMAIL].balance).toBe(10_000 - MES)
    expect(envio().frete?.status).toBe('estornado')
    expect(faturasDoEnvio(state, PROTOCOLO).map((f) => f.status)).toEqual(['paga'])
  })
})

describe('desconsiderarEnviosVencidos', () => {
  async function envioPagoComEtiqueta(): Promise<void> {
    await cotarFreteDoEnvio(PROTOCOLO, 'PAC')
    await pagarFreteComSaldo(PROTOCOLO)
    envio().createdAt = Date.now() - PRAZO_DESCARTE_ENVIO_MS - 1
  }

  it('não postado nos Correios: desconsidera, devolve o frete e cancela a pré-postagem', async () => {
    await envioPagoComEtiqueta()
    correios.consultarPrePostagem.mockResolvedValue({ id: 'PRI1', codigoObjeto: 'AP123456789BR', statusAtual: 2, descricao: 'Pré-postado' })
    const antes = structuredClone(state)

    const r = await desconsiderarEnviosVencidos()

    expect(r.desconsiderados).toEqual([PROTOCOLO])
    expect(r.fretesEstornadosCents).toBe(2_114)
    expect(r.prePostagensCanceladas).toEqual([PROTOCOLO])
    // Só o frete volta (o 1º mês pago é da frente H — ver o teste acima).
    expect(state.users[EMAIL].balance).toBe(10_000 - MES)
    expect(envio().frete?.status).toBe('estornado')
    expect(envio().desconsideradoEm).toBeTruthy()
    expect(envio().prePostagem?.canceladaEm).toBeTruthy()
    expect(correios.cancelarPrePostagem).toHaveBeenCalledWith('PRI1')

    const d = derivarLancamentos({ antes, depois: state, ops: [], semeadura: false, agora: Date.now(), hashAnterior: 'h' })
    expect(d.ajustes).toEqual([])
    expect(d.lancamentos.map((l) => l.tipo)).toEqual(['estorno'])
  })

  it('postado nos Correios (rastreio atrasado): NÃO desconsidera nem devolve', async () => {
    await envioPagoComEtiqueta()
    correios.consultarPrePostagem.mockResolvedValue({ id: 'PRI1', codigoObjeto: 'AP123456789BR', statusAtual: 3, descricao: 'Postado' })

    const r = await desconsiderarEnviosVencidos()

    expect(r.desconsiderados).toEqual([])
    expect(r.aguardandoCorreios).toEqual([PROTOCOLO])
    expect(envio().frete?.status).toBe('pago')
    expect(envio().desconsideradoEm ?? null).toBeNull()
    expect(correios.cancelarPrePostagem).not.toHaveBeenCalled()
  })

  it('Correios sem resposta: na dúvida, não desfaz o envio', async () => {
    await envioPagoComEtiqueta()
    correios.consultarPrePostagem.mockRejectedValue(new Error('timeout'))
    const r = await desconsiderarEnviosVencidos()
    expect(r.desconsiderados).toEqual([])
    expect(envio().frete?.status).toBe('pago')
  })

  it('cancelamento que falha fica para a próxima volta, sem estornar de novo', async () => {
    await envioPagoComEtiqueta()
    correios.consultarPrePostagem.mockResolvedValue({ id: 'PRI1', codigoObjeto: 'AP123456789BR', statusAtual: 2, descricao: '' })
    correios.cancelarPrePostagem.mockRejectedValueOnce(new Error('fora'))

    const r1 = await desconsiderarEnviosVencidos()
    expect(r1.prePostagensCanceladas).toEqual([])
    expect(envio().prePostagem?.canceladaEm ?? null).toBeNull()

    const r2 = await desconsiderarEnviosVencidos()
    expect(r2.desconsiderados).toEqual([])
    expect(r2.prePostagensCanceladas).toEqual([PROTOCOLO])
    expect(state.users[EMAIL].balance).toBe(10_000 - MES)
  })
})

/* ------------------------------------------------------------------ *
 * O 1º mês de custódia no pagamento do envio (frente B, D4)           *
 * ------------------------------------------------------------------ */

describe('o 1º mês de custódia vai no mesmo pagamento do envio', () => {
  it('a cotação já traz o mês e o total que o SERVIDOR calculou', async () => {
    const r = await cotarFreteDoEnvio(PROTOCOLO, 'PAC')
    expect(r.data).toMatchObject({
      valorCents: 2_114,
      primeiroMesCents: MES,
      primeiroMesJaPago: false,
      totalCents: 2_114 + MES,
    })
    // Só calcular não cria plano nem fatura: quem cria é a transação que paga.
    expect(faturasDoEnvio(state, PROTOCOLO)).toEqual([])
  })

  it('saldo: nasce o plano e a fatura de contratação PAGA, ligados ao protocolo, no valor da tabela', async () => {
    await cotarFreteDoEnvio(PROTOCOLO, 'PAC')
    const r = await pagarFreteComSaldo(PROTOCOLO)
    expect(r.ok).toBe(true)
    expect(r.message).toContain('1º mês de custódia')

    // A ligação que a frente H usa: protocolo → plano (`protocoloEnvio`) → fatura (`planoId`).
    const achado = primeiroMesDoEnvio(state, PROTOCOLO)
    expect(achado?.plano).toMatchObject({ protocoloEnvio: PROTOCOLO, userEmail: EMAIL, status: 'vigente', formaPagamento: 'saldo' })
    expect(achado?.fatura).toMatchObject({
      origem: 'contratacao',
      status: 'paga',
      formaPagamento: 'saldo',
      valorCents: MES,
      quantidadeMoedas: 2,
      planoId: achado?.plano.id,
      userEmail: EMAIL,
    })
    expect(achado?.fatura?.dataPagamento).not.toBeNull()
    expect(faturasDoEnvio(state, PROTOCOLO)).toHaveLength(1)
  })

  it('o valor do mês é o da TABELA VIGENTE, nunca um número fixo', async () => {
    tabela.custodiaMensalPorMoeda = 350 // o painel mudou a custódia para R$ 3,50
    const cot = await cotarFreteDoEnvio(PROTOCOLO, 'PAC')
    expect(cot.data).toMatchObject({ primeiroMesCents: 700, totalCents: 2_114 + 700 })

    await pagarFreteComSaldo(PROTOCOLO)

    expect(state.users[EMAIL].balance).toBe(10_000 - 2_114 - 700)
    expect(primeiroMesDoEnvio(state, PROTOCOLO)?.fatura).toMatchObject({ valorCents: 700, status: 'paga' })
    expect(primeiroMesDoEnvio(state, PROTOCOLO)?.plano).toMatchObject({ valorPorMoedaCents: 350, valorTotalCents: 700 })
  })

  it('saldo que cobre só o frete NÃO paga: nada é cobrado e nenhum plano fica para trás', async () => {
    await cotarFreteDoEnvio(PROTOCOLO, 'PAC')
    state.users[EMAIL].balance = 2_200 // cobre o frete (R$ 21,14), não o frete + mês (R$ 25,14)
    const r = await pagarFreteComSaldo(PROTOCOLO)

    expect(r.ok).toBe(false)
    expect(r.error).toContain('Saldo insuficiente')
    expect(r.error).toContain('1º mês de custódia')
    expect(state.users[EMAIL].balance).toBe(2_200)
    expect(envio().frete?.status).toBe('cotado')
    expect(faturasDoEnvio(state, PROTOCOLO)).toEqual([])
    expect(correios.criarPrePostagem).not.toHaveBeenCalled()
  })

  it('quem já pagou o plano do envio (fluxo antigo) paga só o frete: o mês não se cobra duas vezes', async () => {
    // O passo 3 antigo: plano + fatura de contratação, paga à parte, antes do frete.
    state.users[EMAIL].balance = 10_000 - MES
    state.planosCustodia = [
      {
        id: 'PLC-000001',
        userEmail: EMAIL,
        protocoloEnvio: PROTOCOLO,
        modalidade: 'mensal',
        quantidadeContratada: 2,
        moedaIds: [],
        valorPorMoedaCents: 200,
        valorTotalCents: MES,
        parcelasMax: 1,
        inicioCompetencia: '2026-11',
        pagoAteCompetencia: '2026-11',
        status: 'vigente',
        formaPagamento: 'saldo',
        paymentIntentRef: null,
        assinaturaId: null,
        estornadoCents: 0,
        criadoEm: Date.now(),
        atualizadoEm: Date.now(),
      },
    ]
    state.faturasCustodia = [
      {
        id: 'FAT-2026-11-ROGERIO-1',
        userEmail: EMAIL,
        competencia: '2026-11',
        quantidadeMoedas: 2,
        moedaIds: [],
        valorCents: MES,
        status: 'paga',
        dataEmissao: Date.now(),
        dataVencimento: Date.now() + 864_000_000,
        dataPagamento: Date.now(),
        formaPagamento: 'saldo',
        paymentIntentId: null,
        planoId: 'PLC-000001',
        origem: 'contratacao',
      },
    ]

    const cot = await cotarFreteDoEnvio(PROTOCOLO, 'PAC')
    expect(cot.data).toMatchObject({ primeiroMesCents: 0, primeiroMesJaPago: true, totalCents: 2_114 })

    const r = await pagarFreteComSaldo(PROTOCOLO)
    expect(r.ok).toBe(true)
    expect(state.users[EMAIL].balance).toBe(10_000 - MES - 2_114) // só o frete saiu
    expect(faturasDoEnvio(state, PROTOCOLO)).toHaveLength(1)
  })

  it('quem passou pelo passo do plano (fatura pendente) paga a fatura de sempre, e ela é quitada — sem duplicar', async () => {
    const { contratarPlanoCustodia } = await import('./plano-custodia')
    const contr = await contratarPlanoCustodia(PROTOCOLO, 'mensal')
    expect(contr.ok).toBe(true)
    expect(primeiroMesDoEnvio(state, PROTOCOLO)?.fatura?.status).toBe('pendente')

    await cotarFreteDoEnvio(PROTOCOLO, 'PAC')
    const r = await pagarFreteComSaldo(PROTOCOLO)

    expect(r.ok).toBe(true)
    expect(faturasDoEnvio(state, PROTOCOLO)).toHaveLength(1)
    expect(faturasDoEnvio(state, PROTOCOLO)[0]).toMatchObject({ id: contr.data!.faturaId, status: 'paga', valorCents: MES })
    expect(state.users[EMAIL].balance).toBe(10_000 - 2_114 - MES)
  })

  it('Pix: UMA cobrança com frete + mês, e o valor do mês congelado na intenção', async () => {
    tabela.custodiaMensalPorMoeda = 350
    await cotarFreteDoEnvio(PROTOCOLO, 'SEDEX')
    const r = await iniciarPixFrete(PROTOCOLO)

    expect(r.ok).toBe(true)
    expect(correios.criarIntencao).toHaveBeenCalledTimes(1)
    expect(correios.criarIntencao.mock.calls[0][0]).toMatchObject({
      tipoOperacao: 'frete_envio',
      metodo: 'pix',
      valor: 3_159 + 700,
      metadata: { protocolo: PROTOCOLO, primeiroMesCents: 700 },
    })
    expect(correios.criarCobrancaPix.mock.calls[0][0]).toMatchObject({ valorCents: 3_159 + 700 })
    expect(correios.criarCobrancaPix.mock.calls[0][0].titulo).toContain('1º mês de custódia')
    // Abrir a cobrança não cria fatura: ela nasce quando o gateway confirma (conciliacao.test.ts).
    expect(faturasDoEnvio(state, PROTOCOLO)).toEqual([])
  })

  it('cartão: o mesmo total do Pix, à vista', async () => {
    correios.criarCobrancaCartao.mockImplementation(async (p: { externalReference: string; valorCents: number }) => ({
      id: 'pref-1',
      initPoint: 'https://mp.test/checkout',
      sandboxInitPoint: 'https://mp.test/checkout',
      externalReference: p.externalReference,
      valorCents: p.valorCents,
      parcelasMax: 1,
      createdAt: Date.now(),
    }))
    await cotarFreteDoEnvio(PROTOCOLO, 'SEDEX')
    const r = await iniciarCartaoFrete(PROTOCOLO)

    expect(r.ok).toBe(true)
    expect(correios.criarIntencao.mock.calls[0][0]).toMatchObject({
      tipoOperacao: 'frete_envio',
      metodo: 'checkout_pro',
      valor: 3_159 + MES,
      metadata: { protocolo: PROTOCOLO, primeiroMesCents: MES },
      parcelasMax: 1,
    })
    expect(correios.criarCobrancaCartao.mock.calls[0][0]).toMatchObject({ valorCents: 3_159 + MES, parcelasMax: 1 })
  })

  it('o mês já pago (fluxo antigo) não entra na cobrança do Pix', async () => {
    const { contratarPlanoCustodia } = await import('./plano-custodia')
    const { pagarFaturaComSaldo } = await import('./plano-custodia')
    const contr = await contratarPlanoCustodia(PROTOCOLO, 'mensal')
    await pagarFaturaComSaldo(contr.data!.faturaId)

    await cotarFreteDoEnvio(PROTOCOLO, 'SEDEX')
    await iniciarPixFrete(PROTOCOLO)

    expect(correios.criarIntencao.mock.calls[0][0]).toMatchObject({
      valor: 3_159,
      metadata: { protocolo: PROTOCOLO, primeiroMesCents: 0 },
    })
  })
})
