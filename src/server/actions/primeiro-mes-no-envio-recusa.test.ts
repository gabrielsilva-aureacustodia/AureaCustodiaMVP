/**
 * Moeda recusada na análise devolve o 1º mês DAQUELA moeda (frente B, T4 — 17/11/2026).
 *
 * O caminho completo, pelas Server Actions e pelo serviço da bancada de verdade: o cliente paga o envio
 * (frete + 1º mês, saldo), as moedas chegam, a análise fecha com aprovadas e recusadas — e o que se confere é
 *
 *   1. o mês das RECUSADAS volta ao saldo (`PlanoCustodia.estornadoCents`), no valor que o cliente PAGOU — mesmo
 *      que a tabela de preços tenha mudado depois;
 *   2. o mês das APROVADAS continua pago: a fatura de contratação cobre o primeiro ciclo delas, a moeda nasce
 *      negociável e a entrada no acervo NÃO emite uma segunda fatura;
 *   3. o ledger fecha sem `ajuste`: o dinheiro que voltou é um lançamento `estorno` com descrição própria
 *      (contrato B→F: todo movimento de saldo tem evento que o extrato mostra).
 *
 * O estorno por moeda já existia em `alimentarPlanoNaAnalise` (plano-custodia.ts) desde a análise B2.5; o que
 * faltava era prová-lo no fluxo novo, em que o pagamento do envio quita a fatura do mês junto com o frete.
 *
 * O QUE ESTE ARQUIVO NÃO DECIDE — perguntas ao contador (registro-B.md): a NFS-e do mês foi emitida no
 * pagamento; o estorno devolve o dinheiro e o ledger o registra, mas a nota não é cancelada nem ajustada aqui
 * (decisão fiscal, não de B). Na recusa total a fatura continua `paga` com o plano `cancelado`.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const { getSessionEmail } = vi.hoisted(() => ({ getSessionEmail: vi.fn() }))
vi.mock('@/server/session', () => ({ getSessionEmail }))

const correios = vi.hoisted(() => ({
  correiosConfigurado: vi.fn(() => true),
  cotarServico: vi.fn(),
  criarPrePostagem: vi.fn(),
}))
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
  return { ...original, criarPrePostagem: correios.criarPrePostagem }
})

// A tabela do painel, mutável: o teste do preço pago troca o valor entre o pagamento e a análise.
const tabela = vi.hoisted(() => ({ custodiaMensalPorMoeda: undefined as number | undefined }))
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

import { custodiaImpedeNegociar } from '@/domain/custodia-da-moeda'
import { faturasDoEnvio, primeiroMesDoEnvio } from '@/domain/primeiro-mes-do-envio'
import { cadastroCompleto } from '@/domain/testing/fixtures'
import type { AppState, Envio } from '@/domain/types'
import { derivarLancamentos } from '@/server/db/derivar'
import { planejarDiff } from '@/server/db/diff'
import { fecharAnalise } from '@/server/estacao/analise'
import { getState, mutateState } from '@/server/state'

import { cotarFreteDoEnvio, pagarFreteComSaldo } from './custody'

const CLIENTE = 'gabrielsilva@testeaurea.com.br'
const OPERADOR = 'gabriel.silva@aureacustodia.com.br'
const FRETE = 2_114
const SALDO_INICIAL = 100_000

let contador = 0
let protocolo: string

type Veredito = 'aprovada' | 'recusada'

/**
 * Cliente com 3 moedas declaradas, envio pago com saldo (frete + mês) e pacote já na bancada. `custodiaNoPagamento`
 * troca a tabela de custódia SÓ durante o pagamento; ao voltar do preparo a tabela é a padrão de novo.
 */
async function prepararEnvioPagoNaBancada(quantidade = 3, custodiaNoPagamento?: number): Promise<void> {
  contador += 1
  protocolo = `RO-ENV-71${String(contador).padStart(2, '0')}`
  getSessionEmail.mockReset()
  getSessionEmail.mockResolvedValue(CLIENTE)
  tabela.custodiaMensalPorMoeda = undefined
  correios.cotarServico.mockReset()
  correios.criarPrePostagem.mockReset()
  correios.cotarServico.mockImplementation(async (i: { codigoServico: string }) => ({
    codigoServico: i.codigoServico,
    precoTotalCents: FRETE,
    precoServicoCents: 2_000,
    precoAdicionaisCents: 114,
    prazoDiasUteis: 5,
    dataMaximaEntrega: null,
  }))
  correios.criarPrePostagem.mockResolvedValue({ id: `PRI${contador}`, codigoObjeto: `AP00000000${contador}BR`, prazoPostagem: null, statusAtual: 2 })

  await mutateState((s) => {
    s.users[CLIENTE]!.balance = SALDO_INICIAL
    s.users[CLIENTE]!.cadastro = cadastroCompleto()
    s.users[CLIENTE]!.coins = []
    s.planosCustodia = []
    s.faturasCustodia = []
    s.analises = []
    s.envios = [
      {
        protocolo,
        userEmail: CLIENTE,
        tipoMoeda: 'Entrega da Bandeira Olímpica',
        ano: 2016,
        quantidade,
        codigoRastreio: null,
        dataPostagem: null,
        dataRecebimento: null,
        etapaAtual: 'Protocolo gerado',
        createdAt: Date.now(),
        codigosAtivosGerados: [],
        origem: 'envio_postal',
      } satisfies Envio,
    ]
  })

  // O pagamento do envio pelas ações de verdade: cotação (grava o valor) e depois o saldo cobra frete + mês.
  tabela.custodiaMensalPorMoeda = custodiaNoPagamento
  expect((await cotarFreteDoEnvio(protocolo, 'SEDEX')).ok).toBe(true)
  const pago = await pagarFreteComSaldo(protocolo)
  expect(pago.ok).toBe(true)
  tabela.custodiaMensalPorMoeda = undefined

  // As moedas chegam à bancada.
  await mutateState((s) => {
    const e = s.envios.find((x) => x.protocolo === protocolo)!
    e.etapaAtual = 'Recebido pela custódia'
    e.dataPostagem = Date.now()
    e.dataRecebimento = Date.now()
  })
}

async function saldo(): Promise<number> {
  return (await getState()).users[CLIENTE]!.balance
}

function vereditos(...v: Veredito[]) {
  return v.map((veredito) =>
    veredito === 'aprovada'
      ? { pesoMg: 27_000, veredito }
      : { pesoMg: 24_000, veredito, motivoRecusa: 'Defeito físico' },
  )
}

async function ledgerDoFechamento(antes: AppState) {
  const depois = await getState()
  return derivarLancamentos({
    antes,
    depois,
    ops: planejarDiff(antes, depois),
    semeadura: false,
    agora: Date.now(),
    hashAnterior: 'h',
  })
}

describe('moeda recusada na análise devolve o 1º mês dela (envio pago com frete + mês)', () => {
  beforeEach(async () => {
    await prepararEnvioPagoNaBancada()
  })

  it('o ponto de partida: o pagamento do envio levou frete + 3 meses e deixou a fatura do mês paga, ligada ao protocolo', async () => {
    expect(await saldo()).toBe(SALDO_INICIAL - FRETE - 3 * 200)
    const achado = primeiroMesDoEnvio(await getState(), protocolo)
    expect(achado?.plano).toMatchObject({ protocoloEnvio: protocolo, status: 'vigente', valorPorMoedaCents: 200 })
    expect(achado?.fatura).toMatchObject({ origem: 'contratacao', status: 'paga', valorCents: 600, formaPagamento: 'saldo' })
  })

  it('recusa parcial (1 de 3): R$ 2,00 voltam ao saldo, as 2 aceitas seguem pagas e negociáveis, sem segunda fatura', async () => {
    const saldoPago = await saldo()
    const antes = structuredClone(await getState())

    const r = await fecharAnalise({ protocolo, operador: OPERADOR, moedas: vereditos('aprovada', 'aprovada', 'recusada') })
    expect(r).toMatchObject({ ok: true })

    const s = await getState()
    // 1. O mês da moeda recusada voltou ao saldo.
    expect(await saldo()).toBe(saldoPago + 200)
    const { plano, fatura } = primeiroMesDoEnvio(s, protocolo)!
    expect(plano.estornadoCents).toBe(200)
    expect(plano.moedaIds).toHaveLength(2)

    // 2. O mês das aceitas continua pago, uma fatura só, e as duas moedas negociam.
    expect(fatura).toMatchObject({ status: 'paga', origem: 'contratacao', moedaIds: plano.moedaIds })
    expect(faturasDoEnvio(s, protocolo)).toHaveLength(1)
    expect(s.faturasCustodia?.filter((f) => f.userEmail === CLIENTE)).toHaveLength(1)
    const coins = s.users[CLIENTE]!.coins.filter((c) => c.protocolo === protocolo)
    expect(coins).toHaveLength(2)
    for (const c of coins) expect(custodiaImpedeNegociar(s, c.id)).toBe(false)
    expect(fatura?.coberturaAte ?? 0).toBeGreaterThan(Date.now())

    // 3. O ledger fecha: um `estorno` com descrição própria, nenhum `ajuste`.
    const d = await ledgerDoFechamento(antes)
    expect(d.ajustes).toEqual([])
    const estornos = d.lancamentos.filter((l) => l.tipo === 'estorno')
    expect(estornos).toHaveLength(1)
    expect(estornos[0]).toMatchObject({ valor: 200, sinal: 1, userEmail: CLIENTE, refInterna: plano.id })
    expect(estornos[0]!.descricao).toContain('recusadas')
  })

  it('recusa total (3 de 3): os 3 meses voltam ao saldo, o plano é cancelado e nenhuma moeda nem fatura nova nasce', async () => {
    const saldoPago = await saldo()
    const antes = structuredClone(await getState())

    const r = await fecharAnalise({ protocolo, operador: OPERADOR, moedas: vereditos('recusada', 'recusada', 'recusada') })
    expect(r).toMatchObject({ ok: true })

    const s = await getState()
    expect(await saldo()).toBe(saldoPago + 600)
    // `primeiroMesDoEnvio` só enxerga plano ATIVO; o cancelado se acha pelo protocolo, que é o contrato com a frente H.
    expect(primeiroMesDoEnvio(s, protocolo)).toBeNull()
    const plano = s.planosCustodia!.find((p) => p.protocoloEnvio === protocolo)!
    expect(plano).toMatchObject({ status: 'cancelado', estornadoCents: 600, moedaIds: [] })
    expect(s.users[CLIENTE]!.coins.filter((c) => c.protocolo === protocolo)).toHaveLength(0)
    expect(s.faturasCustodia?.filter((f) => f.userEmail === CLIENTE)).toHaveLength(1)

    const d = await ledgerDoFechamento(antes)
    expect(d.ajustes).toEqual([])
    expect(d.lancamentos.filter((l) => l.tipo === 'estorno').map((l) => l.valor)).toEqual([600])
  })

  it('nenhuma recusada: nada volta ao saldo e as 3 moedas nascem com o mês pago', async () => {
    const saldoPago = await saldo()
    const antes = structuredClone(await getState())

    await fecharAnalise({ protocolo, operador: OPERADOR, moedas: vereditos('aprovada', 'aprovada', 'aprovada') })

    const s = await getState()
    expect(await saldo()).toBe(saldoPago)
    expect(primeiroMesDoEnvio(s, protocolo)!.plano.estornadoCents).toBe(0)
    const coins = s.users[CLIENTE]!.coins.filter((c) => c.protocolo === protocolo)
    expect(coins).toHaveLength(3)
    for (const c of coins) expect(custodiaImpedeNegociar(s, c.id)).toBe(false)
    expect(faturasDoEnvio(s, protocolo)).toHaveLength(1)

    const d = await ledgerDoFechamento(antes)
    expect(d.ajustes).toEqual([])
    expect(d.lancamentos.filter((l) => l.tipo === 'estorno')).toEqual([])
  })
})

describe('a devolução é do preço PAGO, não do preço de hoje', () => {
  it('tabela a R$ 3,50 no pagamento e a R$ 2,00 na análise: a moeda recusada devolve R$ 3,50', async () => {
    await prepararEnvioPagoNaBancada(2, 350)
    expect(await saldo()).toBe(SALDO_INICIAL - FRETE - 2 * 350)

    // Entre o pagamento e a análise a tabela já voltou ao padrão (R$ 2,00).
    const saldoPago = await saldo()
    await fecharAnalise({ protocolo, operador: OPERADOR, moedas: vereditos('aprovada', 'recusada') })

    expect(await saldo()).toBe(saldoPago + 350)
    expect(primeiroMesDoEnvio(await getState(), protocolo)!.plano.estornadoCents).toBe(350)
    // E a aceita não foi cobrada de novo pela tabela nova.
    expect((await getState()).faturasCustodia?.filter((f) => f.userEmail === CLIENTE)).toHaveLength(1)
  })
})
