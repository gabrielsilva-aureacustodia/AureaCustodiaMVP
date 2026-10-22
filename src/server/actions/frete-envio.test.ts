/**
 * Frete do envio pago no site (22/10/2026) — as Server Actions de src/server/actions/custody.ts e a
 * varredura de envios vencidos de src/server/shipping/frete-envio.ts.
 *
 * Os Correios entram por dublê (cotação, pré-postagem, consulta e cancelamento): o que se prova é a
 * regra — valor sempre do servidor, dono conferido, dinheiro antes da etiqueta, falha dos Correios
 * sem desfazer pagamento, frete devolvido quando o envio cai —, não a rede.
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
  criarIntencao: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('@/server/session', () => ({ getSessionEmail: getSessionEmailMock }))
vi.mock('@/server/state', () => ({ mutateState: mutateStateMock, getState: getStateMock }))
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
  return { ...original, criarCobrancaPix: correios.criarCobrancaPix }
})
vi.mock('@/server/payments/repositorios', () => ({
  repositorioIntencoes: () => ({ criar: correios.criarIntencao, anotarPagamento: vi.fn() }),
}))

import { PRAZO_DESCARTE_ENVIO_MS } from '@/domain/envios'
import { seedState } from '@/domain/seed'
import type { AppState, Envio } from '@/domain/types'
import { derivarLancamentos } from '@/server/db/derivar'
import { desconsiderarEnviosVencidos } from '@/server/shipping/frete-envio'
import {
  cotarFreteDoEnvio,
  emitirEtiquetaDoEnvio,
  iniciarPixFrete,
  markPosted,
  pagarFreteComSaldo,
} from './custody'

const EMAIL = 'rogeriopena@testeaurea.com.br'
const OUTRO = 'alex@testeaurea.com.br'
const PROTOCOLO = 'RO-ENV-7001'

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
    expect(state.users[EMAIL].balance).toBe(10_000 - 2_114)
    expect(envio().frete).toMatchObject({ status: 'pago', forma: 'saldo' })
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

    // O ledger fecha sem ajuste: o débito é explicado pelo lançamento `frete`.
    const d = derivarLancamentos({ antes, depois: state, ops: [], semeadura: false, agora: Date.now(), hashAnterior: 'h' })
    expect(d.ajustes).toEqual([])
    expect(d.lancamentos.map((l) => l.tipo)).toEqual(['frete'])
  })

  it('pagar de novo não cobra duas vezes', async () => {
    await cotarFreteDoEnvio(PROTOCOLO, 'PAC')
    await pagarFreteComSaldo(PROTOCOLO)
    const r = await pagarFreteComSaldo(PROTOCOLO)
    expect(r.ok).toBe(false)
    expect(state.users[EMAIL].balance).toBe(10_000 - 2_114)
    expect(correios.criarPrePostagem).toHaveBeenCalledTimes(1)
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
    expect(intencao).toMatchObject({ tipoOperacao: 'frete_envio', valor: 3_159, metadata: { protocolo: PROTOCOLO } })
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
    expect(state.users[EMAIL].balance).toBe(10_000)
    expect(envio().frete?.status).toBe('estornado')
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
    expect(state.users[EMAIL].balance).toBe(10_000)
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
    expect(state.users[EMAIL].balance).toBe(10_000)
  })
})
