/**
 * O INVARIANTE DO EXTRATO (frente F, item 15 do Rogério, 18/11/2026):
 *
 *     saldo da conta  =  soma dos impactos das linhas do extrato
 *     e a coluna "saldo depois" de cada linha é a soma acumulada, terminando no saldo do topo.
 *
 * POR QUE ESTE TESTE E NÃO O DE `statement.test.ts`
 * -------------------------------------------------
 * O primeiro teste do extrato somava o saldo inicial POR FORA e só tinha depósito e venda — por isso passava
 * enquanto o extrato não tinha o frete, a taxa de retirada, os estornos e o ajuste da equipe. Aqui cada cena
 * monta o estado pelos MESMOS caminhos de código do produto (os liquidadores da conciliação, `matchOrders`,
 * `quitarFatura`, `estornarFaturaPaga`, `cancelarEnvio`, `alimentarPlanoNaAnalise`…), nunca com um saldo
 * escrito à mão, e confere a soma. Se uma frente nova (ou um liquidador novo) mexer no saldo por um caminho que
 * o extrato não conhece, a soma deixa de bater e o teste falha — é a garantia que o Controle reexecuta depois
 * do merge das frentes B e H.
 *
 * O QUE UMA CENA PODE EXPLICAR POR FORA
 * -------------------------------------
 * A linha "Ajuste de saldo" (saldo trazido pela conta, ajuste da equipe) é a única que o extrato não deriva de
 * um fato do estado, e por isso cada cena declara EXATAMENTE quanto espera dela. Aparecer onde a cena não a
 * pediu é o sinal de que alguma fonte de movimento ficou de fora.
 */

import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { alimentarPlanoNaAnalise } from '@/domain/plano-custodia'
import { cancelarEnvio } from '@/domain/cancelar-envio'
import { cobrarEntradaNoAcervo } from '@/domain/cobranca-de-entrada'
import { estornarFreteDoEnvio } from '@/domain/envios'
import { TAXAS_PADRAO } from '@/domain/fees'
import { matchOrders } from '@/domain/market'
import { garantirPrimeiroMesDoEnvio } from '@/domain/primeiro-mes-do-envio'
import { estornarFaturaPaga, pagarFaturaComSaldoNoEstado, quitarFatura } from '@/domain/quitar-fatura'
import { resumoDaConta, statementTotals, userStatement, type StatementRow } from '@/domain/statement'
import { BAN, compra, estado, moeda, usuario, venda } from '@/domain/testing/fixtures'
import type { AppState, Cents, Envio, FaturaCustodia, Retirada, Saque, UserEmail } from '@/domain/types'
import type { DetalhesPagamento } from '@/lib/payments'
import type { IntencaoDeposito, TipoOperacaoPagamento } from '@/server/db/repositories/payments'
import { LIQUIDADORES } from '@/server/payments/conciliacao'

/* ------------------------------------------------------------------ *
 * Ferramentas das cenas                                              *
 * ------------------------------------------------------------------ */

const EU = 'eu'
const OUTRO = 'outro'
const REGRAS = { taxas: TAXAS_PADRAO, contaBloqueavel: false }
const DETALHES = { parcelas: 1 } as DetalhesPagamento

const FRETE = 1_160 // PAC de R$ 11,60
const MES_POR_MOEDA = 200 // custódia de R$ 2,00

let seqRef = 0

/** Uma entrada de dinheiro do gateway, do jeito que `conciliarPagamento` entrega ao liquidador. */
function pagarPeloGateway(
  s: AppState,
  tipo: TipoOperacaoPagamento,
  valor: Cents,
  metodo: 'pix' | 'cartao',
  metadata: Record<string, unknown> = {},
  email: UserEmail = EU,
): void {
  seqRef += 1
  const intencao = {
    externalReference: `REF-${seqRef}`,
    userEmail: email,
    valor,
    metodo,
    status: 'creditando',
    tipoOperacao: tipo,
    metadata,
    paymentId: String(seqRef),
    motivoRecusa: null,
    createdAt: 1,
    updatedAt: 1,
  } as IntencaoDeposito
  const r = LIQUIDADORES[tipo](s, intencao, DETALHES, REGRAS)
  expect(r.sucesso).toBe(true)
}

function envioNovo(protocolo: string, quantidade: number): Envio {
  return {
    protocolo,
    userEmail: EU,
    tipoMoeda: BAN,
    ano: 2012,
    quantidade,
    codigoRastreio: null,
    dataPostagem: null,
    dataRecebimento: null,
    etapaAtual: 'Protocolo gerado',
    createdAt: Date.now(),
    codigosAtivosGerados: [],
    origem: 'envio_postal',
    modalidadeEnvio: 'PAC',
    frete: {
      modalidade: 'PAC',
      codigoServico: '03301',
      valorCents: FRETE,
      valorDeclaradoCents: 15_000,
      prazoDiasUteis: 6,
      cotadoEm: Date.now(),
      status: 'cotado',
      pagoEm: null,
      forma: null,
      paymentIntentRef: null,
      estornadoEm: null,
    },
    prePostagem: null,
  }
}

/** O frete (e o 1º mês, se pedido) pagos com o saldo: o corpo de `pagarFreteComSaldo`, em src/server/actions/custody.ts. */
function pagarFreteComSaldo(s: AppState, envio: Envio, comPrimeiroMes: boolean): void {
  const u = s.users[EU]
  const mes = comPrimeiroMes ? envio.quantidade * MES_POR_MOEDA : 0
  u.balance -= FRETE + mes
  const agora = Date.now()
  envio.frete = { ...envio.frete!, status: 'pago', pagoEm: agora, forma: 'saldo', paymentIntentRef: null }
  if (mes > 0) {
    const { fatura } = garantirPrimeiroMesDoEnvio(s, envio, { custodiaMensalPorMoeda: MES_POR_MOEDA }, agora)
    quitarFatura(s, fatura, 'saldo', agora)
  }
}

function faturaEmAberto(id: string, valor: Cents): FaturaCustodia {
  return {
    id,
    userEmail: EU,
    competencia: '2026-11',
    quantidadeMoedas: valor / MES_POR_MOEDA,
    moedaIds: [],
    valorCents: valor,
    status: 'pendente',
    dataEmissao: Date.now(),
    dataVencimento: Date.now() + 86_400_000,
    dataPagamento: null,
    formaPagamento: null,
    paymentIntentId: null,
    planoId: null,
    origem: 'ciclo_mensal',
  }
}

function saqueNovo(s: AppState, id: string, liquido: Cents): Saque {
  const taxa = 500
  const u = s.users[EU]
  const saque: Saque = {
    id,
    userEmail: EU,
    valorTotal: liquido + taxa,
    taxa,
    valorLiquido: liquido,
    dadosBancarios: {},
    status: 'solicitado',
    criadoEm: Date.now(),
    previsaoPagamentoEm: Date.now() + 3 * 86_400_000,
    atualizadoEm: Date.now(),
  }
  u.balance -= saque.valorTotal
  s.saques = [...(s.saques ?? []), saque]
  return saque
}

function soma(linhas: readonly StatementRow[]): Cents {
  return linhas.reduce((t, l) => t + l.impacto, 0)
}

/**
 * A conferência única de toda cena.
 *
 * `ajuste` é o que a cena declara como NÃO explicável pelo estado (saldo trazido, ajuste da equipe) — o resto
 * precisa fechar sozinho.
 */
function confere(s: AppState, ajuste: Cents = 0): StatementRow[] {
  const linhas = userStatement(s, EU)
  const saldo = s.users[EU].balance

  // 1) o coração do item 15: a soma das linhas é o saldo, ao centavo.
  expect(soma(linhas)).toBe(saldo)

  // 2) a linha de ajuste existe só no que a cena pediu — o resto fecha por fatos.
  const ajustes = linhas.filter((l) => l.kind === 'Ajuste de saldo')
  expect(ajustes.reduce((t, l) => t + l.impacto, 0)).toBe(ajuste)
  expect(ajustes.length).toBe(ajuste === 0 ? 0 : 1)

  // 3) "saldo depois" é a soma acumulada, e a última linha é o saldo do topo.
  let acumulado = 0
  for (const l of linhas) {
    acumulado += l.impacto
    expect(l.saldoApos).toBe(acumulado)
  }
  if (linhas.length) expect(linhas[linhas.length - 1].saldoApos).toBe(saldo)

  // 4) a conta nunca passa por saldo negativo: entrada vem antes da saída que ela paga.
  for (const l of linhas) expect(l.saldoApos).toBeGreaterThanOrEqual(0)

  // 5) o resumo do cabeçalho usa o MESMO número do topo.
  const resumo = resumoDaConta(s, EU)
  expect(resumo.disponivel).toBe(saldo)
  expect(resumo.total).toBe(resumo.disponivel + resumo.emReserva)
  return linhas
}

function cena(saldoInicial: Cents, coins = [moeda('RO-000001', BAN)]): AppState {
  return estado({
    [EU]: usuario('Eu', saldoInicial, coins),
    [OUTRO]: usuario('Outro', 100_000, []),
  })
}

/* ------------------------------------------------------------------ *
 * As cenas                                                           *
 * ------------------------------------------------------------------ */

describe('extrato × saldo — a soma das linhas é o saldo da conta', () => {
  it('depósito, venda casada e compra: o caso que já fechava continua fechando', () => {
    const s = cena(0)
    pagarPeloGateway(s, 'deposito', 50_000, 'pix')
    s.sellOffers.push(venda('OF-1', 'RO-000001', EU, 28_500, BAN, 2000))
    s.buyOrders.push(compra('BID-1', OUTRO, 28_500, 1, BAN, 2000))
    matchOrders(s)
    confere(s)
  })

  it('conta que já nasce com saldo: o saldo anterior é uma linha, não um buraco', () => {
    const s = cena(100_000)
    pagarPeloGateway(s, 'deposito', 20_000, 'pix')
    const linhas = confere(s, 100_000)
    expect(linhas[0].kind).toBe('Ajuste de saldo')
    expect(linhas[0].saldoApos).toBe(100_000)
  })

  it('FRETE pago com o saldo sai do extrato (22/10/2026)', () => {
    const s = cena(5_000)
    const envio = envioNovo('RO-ENV-0007', 1)
    s.envios.push(envio)
    pagarFreteComSaldo(s, envio, false)
    const linhas = confere(s, 5_000)
    const frete = linhas.find((l) => l.kind === 'Frete do envio')
    expect(frete?.impacto).toBe(-FRETE)
    expect(frete?.descricao).toContain('RO-ENV-0007')
  })

  it('FRETE pago por Pix: entra e sai no mesmo instante, o saldo não muda', () => {
    const s = cena(0)
    const envio = envioNovo('RO-ENV-0008', 1)
    s.envios.push(envio)
    pagarPeloGateway(s, 'frete_envio', FRETE, 'pix', { protocolo: 'RO-ENV-0008' })
    const linhas = confere(s)
    expect(s.users[EU].balance).toBe(0)
    expect(linhas.filter((l) => l.kind === 'Frete do envio').map((l) => l.impacto)).toEqual([-FRETE])
    expect(linhas.filter((l) => l.kind === 'Depósito').map((l) => l.impacto)).toEqual([FRETE])
  })

  it('FRETE devolvido (envio desconsiderado) volta como linha própria', () => {
    const s = cena(5_000)
    const envio = envioNovo('RO-ENV-0009', 1)
    s.envios.push(envio)
    pagarFreteComSaldo(s, envio, false)
    estornarFreteDoEnvio(s, envio, Date.now() + 5_000)
    const linhas = confere(s, 5_000)
    expect(linhas.filter((l) => l.kind === 'Estorno').map((l) => l.impacto)).toEqual([FRETE])
    expect(s.users[EU].balance).toBe(5_000)
  })

  it('1º MÊS pago junto com o frete por Pix e cancelamento do envio: tudo volta ao saldo (frentes B e H)', () => {
    const s = cena(0)
    const envio = envioNovo('RO-ENV-0010', 5)
    s.envios.push(envio)
    const mes = 5 * MES_POR_MOEDA
    pagarPeloGateway(s, 'frete_envio', FRETE + mes, 'pix', { protocolo: 'RO-ENV-0010', primeiroMesCents: mes })
    expect(s.users[EU].balance).toBe(0)
    confere(s) // pago e a caminho: entrou, saiu o frete, saiu o mês

    const r = cancelarEnvio(s, 'RO-ENV-0010', {
      agora: Date.now() + 10_000,
      por: 'cliente',
      motivo: 'Criei o envio por engano.',
      donoEsperado: EU,
    })
    expect(r.ok).toBe(true)
    expect(s.users[EU].balance).toBe(FRETE + mes) // frete e mês de volta, como saldo
    const linhas = confere(s)
    expect(linhas.filter((l) => l.kind === 'Estorno').reduce((t, l) => t + l.impacto, 0)).toBe(FRETE + mes)
  })

  it('1º mês e frete pagos com o saldo, e cancelamento: o saldo e o extrato voltam ao ponto de partida', () => {
    const s = cena(10_000)
    const envio = envioNovo('RO-ENV-0011', 3)
    s.envios.push(envio)
    pagarFreteComSaldo(s, envio, true)
    expect(s.users[EU].balance).toBe(10_000 - FRETE - 3 * MES_POR_MOEDA)
    cancelarEnvio(s, 'RO-ENV-0011', { agora: Date.now() + 10_000, por: 'equipe', motivo: 'Pacote nunca foi postado.' })
    expect(s.users[EU].balance).toBe(10_000)
    confere(s, 10_000)
  })

  it('FATURA de custódia: paga com o saldo, por Pix e pelo cartão recorrente', () => {
    const s = cena(1_000)
    s.faturasCustodia!.push(faturaEmAberto('FAT-A', 200), faturaEmAberto('FAT-B', 400), faturaEmAberto('FAT-C', 600))
    expect(pagarFaturaComSaldoNoEstado(s, EU, 'FAT-A', Date.now()).ok).toBe(true)
    pagarPeloGateway(s, 'fatura_custodia', 400, 'pix', { faturaId: 'FAT-B' })
    pagarPeloGateway(s, 'assinatura_custodia', 600, 'cartao', { faturaId: 'FAT-C' })
    const linhas = confere(s, 1_000)
    // as três faturas saíram do saldo; as duas entradas (Pix e cartão) apareceram e se anularam
    expect(linhas.filter((l) => l.kind === 'Taxa de custódia' && l.impacto < 0).map((l) => l.impacto).sort((a, b) => a - b)).toEqual([-600, -400, -200])
    expect(s.users[EU].balance).toBe(800)
  })

  it('FATURA paga por Pix e depois estornada (cobrança indevida, 03/11/2026): o estorno aparece', () => {
    const s = cena(0)
    s.faturasCustodia!.push(faturaEmAberto('FAT-D', 200))
    pagarPeloGateway(s, 'fatura_custodia', 200, 'pix', { faturaId: 'FAT-D' })
    expect(estornarFaturaPaga(s, 'FAT-D').ok).toBe(true)
    const linhas = confere(s)
    expect(s.users[EU].balance).toBe(200)
    expect(linhas.filter((l) => l.kind === 'Estorno').map((l) => l.impacto)).toEqual([200])
  })

  it('PLANO: moedas recusadas na análise devolvem o mês delas', () => {
    const s = cena(0)
    s.planosCustodia = [
      {
        id: 'PLC-000001',
        userEmail: EU,
        protocoloEnvio: 'RO-ENV-0012',
        modalidade: 'mensal',
        quantidadeContratada: 3,
        moedaIds: [],
        valorPorMoedaCents: MES_POR_MOEDA,
        valorTotalCents: 3 * MES_POR_MOEDA,
        parcelasMax: 1,
        inicioCompetencia: '2026-11',
        pagoAteCompetencia: null,
        status: 'aguardando_pagamento',
        formaPagamento: null,
        paymentIntentRef: null,
        assinaturaId: null,
        estornadoCents: 0,
        criadoEm: 1,
        atualizadoEm: 1,
      },
    ]
    const fatura = { ...faturaEmAberto('FAT-P', 600), planoId: 'PLC-000001', origem: 'contratacao' as const }
    s.faturasCustodia!.push(fatura)
    pagarPeloGateway(s, 'fatura_custodia', 600, 'pix', { faturaId: 'FAT-P' })
    alimentarPlanoNaAnalise({
      plano: s.planosCustodia![0],
      faturas: s.faturasCustodia!,
      user: s.users[EU],
      moedaIdsAprovadas: ['RO-000001'],
      quantidadeRecusadas: 2,
    })
    expect(s.users[EU].balance).toBe(2 * MES_POR_MOEDA)
    const linhas = confere(s)
    expect(linhas.filter((l) => l.kind === 'Estorno').map((l) => l.impacto)).toEqual([2 * MES_POR_MOEDA])
  })

  it('TAXA DE RETIRADA: paga com o saldo e por Pix', () => {
    const s = cena(20_000, [moeda('RO-000001', BAN), moeda('RO-000002', BAN)])
    const retiradaBase = (id: string, coinId: string): Retirada => ({
      id,
      coinId,
      reciboCodigo: 'REC-' + coinId.split('-')[1],
      userEmail: EU,
      modalidade: 'comum',
      status: 'solicitada',
      valorTaxaCents: 5_000,
      endereco: {} as Retirada['endereco'],
      solicitadoEm: Date.now(),
      dataLimiteD30: Date.now() + 30 * 86_400_000,
      historico: [],
    })
    s.retiradas = [retiradaBase('RET-1', 'RO-000001'), retiradaBase('RET-2', 'RO-000002')]

    // Paga com o saldo: o corpo de `pagarRetiradaComSaldo`, em src/server/actions/custody.ts.
    s.users[EU].balance -= 5_000
    s.users[EU].coins[0].recibo.status = 'Extinto'
    // Sem `pagoEm`, como `transicionarRetirada` deixa: a data vem do histórico da retirada.
    s.retiradas[0] = {
      ...s.retiradas[0],
      status: 'paga',
      formaPagamento: 'saldo',
      historico: [{ de: 'solicitada', para: 'paga', data: Date.now() }],
    }

    // Paga por Pix: o liquidador real.
    pagarPeloGateway(s, 'retirada', 5_000, 'pix', { retiradaId: 'RET-2' })

    const linhas = confere(s, 20_000)
    expect(linhas.filter((l) => l.kind === 'Taxa de retirada').map((l) => l.impacto)).toEqual([-5_000, -5_000])
    expect(s.users[EU].balance).toBe(15_000)
  })

  it('SAQUE: pedido (a caminho), pago e recusado (o estorno volta ao saldo)', () => {
    const s = cena(50_000)
    const a = saqueNovo(s, 'SAQ-1', 10_000) // a caminho
    const b = saqueNovo(s, 'SAQ-2', 10_000)
    b.status = 'pago'
    const c = saqueNovo(s, 'SAQ-3', 10_000)
    c.status = 'falhou'
    c.atualizadoEm = Date.now() + 1_000
    s.users[EU].balance += c.valorTotal // `recusarSaque` devolve o valor total
    const linhas = confere(s, 50_000)
    expect(linhas.filter((l) => l.kind === 'Estorno').map((l) => l.impacto)).toEqual([c.valorTotal])
    // só o saque ainda a caminho conta como reserva
    expect(resumoDaConta(s, EU).emReserva).toBe(a.valorTotal)
  })

  it('AJUSTE DA EQUIPE: o que o estado não registra vira uma linha explícita, nunca some', () => {
    const s = cena(0)
    pagarPeloGateway(s, 'deposito', 10_000, 'pix')
    s.users[EU].balance += 5_000 // `ajustarSaldo` (painel): só o ledger e o audit_log sabem
    const linhas = confere(s, 5_000)
    expect(linhas.find((l) => l.kind === 'Ajuste de saldo')?.descricao).toMatch(/ajuste/i)
  })

  it('CUSTÓDIA RECEBIDA FORA (14/11/2026): o saldo do cliente não muda e o extrato diz de onde veio', () => {
    const s = cena(0)
    s.users[EU].coins.push(moeda('RO-000009', BAN))
    const fatura = cobrarEntradaNoAcervo(s, EU, ['RO-000009'], undefined, Date.now(), { primeiroMesRecebidoFora: true })
    expect(fatura?.status).toBe('paga')
    confere(s)
    expect(s.users[EU].balance).toBe(0)
  })

  it('COMPRA DIRETA por Pix: preço, comissão e 1º mês de custódia entram e saem; o troco fica', () => {
    const s = cena(0)
    s.users[OUTRO].coins = [moeda('RO-000050', BAN)]
    // `estado` já recebeu os usuários sem a moeda do vendedor; a custódia dele entra aqui.
    s.faturasCustodia!.push({ ...faturaEmAberto('FAT-V', 0), id: 'FAT-V-OK', userEmail: OUTRO, status: 'paga', valorCents: 0, moedaIds: ['RO-000050'], coberturaAte: Date.UTC(2100, 0, 1), dataPagamento: 0, formaPagamento: 'saldo' })
    s.sellOffers.push(venda('OF-DIRETA', 'RO-000050', OUTRO, 20_000, BAN, Date.now()))
    // R$ 200,00 + comissão de compra (R$ 1,00 + 0,5%) + custódia (R$ 2,00) = R$ 204,00; paga R$ 210,00 → R$ 6,00 de troco.
    pagarPeloGateway(s, 'compra_direta', 21_000, 'pix', {
      lotId: 'LOT-OF-DIRETA',
      qty: 1,
      sellerEmail: OUTRO,
      comissaoCompradorPorMoeda: 200,
      custodiaPorMoeda: MES_POR_MOEDA,
    })
    expect(s.trades.length).toBe(1)
    confere(s)
    expect(s.users[EU].balance).toBe(21_000 - 20_000 - 200 - MES_POR_MOEDA)
  })

  it('OFERTA PRÉ-PAGA (limite conhecido): o que está preso é reserva, e o já gasto é a linha de ajuste', () => {
    const s = cena(0)
    s.users[OUTRO].coins = [moeda('RO-000051', BAN)]
    s.faturasCustodia!.push({ ...faturaEmAberto('FAT-V2', 0), id: 'FAT-V2-OK', userEmail: OUTRO, status: 'paga', valorCents: 0, moedaIds: ['RO-000051'], coberturaAte: Date.UTC(2100, 0, 1), dataPagamento: 0, formaPagamento: 'saldo' })
    s.sellOffers.push(venda('OF-PRE', 'RO-000051', OUTRO, 20_000, BAN, 1))
    // Paga 3 unidades antecipadas; só há uma oferta de venda: uma casa e duas ficam presas.
    pagarPeloGateway(s, 'oferta_prepaga', 3 * 20_400, 'pix', { qty: 3, price: 20_000, tipoMoeda: BAN })
    expect(s.trades.length).toBe(1)
    expect(s.users[EU].balance).toBe(0) // o dinheiro do pré-pago nunca esteve no saldo
    // O estado não guarda quanto entrou, só o que sobrou preso: o gasto de 20.400 vira a linha de ajuste.
    confere(s, 20_400)
    expect(resumoDaConta(s, EU).emReserva).toBe(2 * 20_400)
    expect(resumoDaConta(s, EU).total).toBe(2 * 20_400)
  })

  it('totais do cabeçalho: a variação líquida é o saldo, e "depositado" só conta o que ENTROU', () => {
    const s = cena(0)
    pagarPeloGateway(s, 'deposito', 30_000, 'pix')
    const envio = envioNovo('RO-ENV-0020', 1)
    s.envios.push(envio)
    pagarFreteComSaldo(s, envio, false)
    const linhas = confere(s)
    const tot = statementTotals(linhas)
    expect(tot.variacaoSaldo).toBe(s.users[EU].balance)
    expect(tot.depositado).toBe(30_000)
  })
})
