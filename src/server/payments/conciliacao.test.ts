/**
 * Testes da conciliação — o ponto onde um pagamento externo vira saldo.
 *
 * É o teste que o critério de aceite do M5 pede em uma frase: **webhook
 * reenviado três vezes credita uma vez.** Aqui isso é exercitado de verdade,
 * contra o estado real da plataforma (store em memória) e com o gateway
 * substituído por um dublê — porque o que se quer provar é a regra, não a rede.
 *
 * O `vi.mock('server-only')` é o mesmo truque de `route.test.ts`: o pacote
 * estoura fora do contexto de servidor do Next, e a barreira continua valendo
 * no build de verdade.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

// `vi.hoisted` é obrigatório aqui: a fábrica do `vi.mock` sobe para o topo do
// arquivo, e uma variável declarada depois dela ainda não existiria.
const { consultarPagamentoMercadoPago } = vi.hoisted(() => ({
  consultarPagamentoMercadoPago: vi.fn(),
}))

vi.mock('@/lib/payments', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/payments')>()
  return { ...original, consultarPagamentoMercadoPago }
})

import { conciliarPagamento } from './conciliacao'
import { _limparRecebimentosEmMemoria, buscarRecebimentoPorPaymentId } from './recebimentos'
import { _limparRepositoriosEmMemoria, repositorioIntencoes } from './repositorios'
import { getState, mutateState } from '@/server/state'

const EMAIL = 'gabrielsilva@testeaurea.com.br'

/** Resposta do gateway para um pagamento aprovado de `valor` centavos. */
function aprovado(ref: string, valor: number) {
  const agora = Date.now()
  return {
    id: 'pay-1',
    status: 'approved',
    valorCents: valor,
    valorLiquidoCents: valor,
    tarifaCents: 0,
    totalPagoCents: valor,
    parcelas: 1,
    valorParcelaCents: valor,
    dataLiberacao: agora,
    externalReference: ref,
    paymentMethodId: 'pix',
    paymentTypeId: 'bank_transfer',
    dateApproved: agora,
    dateCreated: agora,
    payerEmail: 'quem-pagou@exemplo.com',
  }
}

async function criarIntencao(ref: string, valor: number): Promise<void> {
  const agora = Date.now()
  await repositorioIntencoes().criar({
    externalReference: ref,
    userEmail: EMAIL,
    valor,
    metodo: 'pix',
    status: 'pendente',
    tipoOperacao: 'deposito',
    metadata: null,
    paymentId: null,
    motivoRecusa: null,
    createdAt: agora,
    updatedAt: agora,
  })
}

async function criarIntencaoCompraDireta(
  ref: string,
  valor: number,
  lotId: string,
  qty: number,
  tipoMoeda: string,
): Promise<void> {
  const agora = Date.now()
  await repositorioIntencoes().criar({
    externalReference: ref,
    userEmail: EMAIL,
    valor,
    metodo: 'pix',
    status: 'pendente',
    tipoOperacao: 'compra_direta',
    metadata: { lotId, qty, tipoMoeda },
    paymentId: null,
    motivoRecusa: null,
    createdAt: agora,
    updatedAt: agora,
  })
}

async function saldo(): Promise<number> {
  const s = await getState()
  return s.users[EMAIL].balance
}

describe('conciliarPagamento', () => {
  beforeEach(() => {
    _limparRepositoriosEmMemoria()
    _limparRecebimentosEmMemoria()
    consultarPagamentoMercadoPago.mockReset()
  })

  it('CRITÉRIO M5: três entregas do mesmo pagamento creditam UMA vez', async () => {
    const ref = 'DEP-tres-entregas'
    await criarIntencao(ref, 25_000)
    consultarPagamentoMercadoPago.mockResolvedValue(aprovado(ref, 25_000))

    const antes = await saldo()
    const r1 = await conciliarPagamento('pay-1')
    const r2 = await conciliarPagamento('pay-1')
    const r3 = await conciliarPagamento('pay-1')

    expect(r1.creditado).toBe(true)
    expect(r2.creditado).toBe(false)
    expect(r3.creditado).toBe(false)
    expect(await saldo()).toBe(antes + 25_000)
  })

  it('o depósito entra no extrato uma única vez', async () => {
    const ref = 'DEP-extrato'
    await criarIntencao(ref, 10_000)
    consultarPagamentoMercadoPago.mockResolvedValue(aprovado(ref, 10_000))

    const antes = (await getState()).deposits.length
    await conciliarPagamento('pay-1')
    await conciliarPagamento('pay-1')

    const depois = (await getState()).deposits
    expect(depois).toHaveLength(antes + 1)
    expect(depois[depois.length - 1]).toMatchObject({ userEmail: EMAIL, valor: 10_000 })
  })

  it('pagamento não aprovado não credita nada', async () => {
    const ref = 'DEP-pendente'
    await criarIntencao(ref, 30_000)
    consultarPagamentoMercadoPago.mockResolvedValue({ ...aprovado(ref, 30_000), status: 'pending' })

    const antes = await saldo()
    const r = await conciliarPagamento('pay-1')

    expect(r.creditado).toBe(false)
    expect(r.motivo).toContain('pending')
    expect(await saldo()).toBe(antes)
  })

  it('valor cobrado diferente do pedido é RECUSADO, com o motivo gravado', async () => {
    const ref = 'DEP-divergente'
    await criarIntencao(ref, 100_000)
    // Pagou R$ 1,00 numa cobrança de R$ 1.000,00.
    consultarPagamentoMercadoPago.mockResolvedValue(aprovado(ref, 100))

    const antes = await saldo()
    const r = await conciliarPagamento('pay-1')

    expect(r.creditado).toBe(false)
    expect(r.motivo).toContain('valor divergente')
    expect(await saldo()).toBe(antes)

    const intencao = await repositorioIntencoes().buscar(ref)
    expect(intencao?.status).toBe('recusado')
    expect(intencao?.motivoRecusa).toContain('valor divergente')
  })

  it('pagamento sem intenção conhecida não credita ninguém', async () => {
    consultarPagamentoMercadoPago.mockResolvedValue(aprovado('DEP-que-nao-existe', 5_000))
    const antes = await saldo()
    const r = await conciliarPagamento('pay-1')

    expect(r.creditado).toBe(false)
    expect(r.motivo).toContain('nenhuma intenção')
    expect(await saldo()).toBe(antes)
  })

  it('a intenção fica creditada, e com o id do pagamento, depois do sucesso', async () => {
    const ref = 'DEP-final'
    await criarIntencao(ref, 7_500)
    consultarPagamentoMercadoPago.mockResolvedValue(aprovado(ref, 7_500))

    await conciliarPagamento('pay-99')
    const intencao = await repositorioIntencoes().buscar(ref)
    expect(intencao?.status).toBe('creditado')
    expect(intencao?.paymentId).toBe('pay-99')
  })

  it('compra direta via webhook: transfere moeda, credita vendedor menos taxa e mantém saldo líquido do comprador', async () => {
    const ref = 'CMP-sucesso-1'
    const sellerEmail = 'alex@testeaurea.com.br'
    const lotId = 'LOT-compra-direta-1'
    const coinId = 'RO-999999'
    const precoUnitario = 20_000 // R$ 200,00

    // Configura o estado com um lote à venda pelo Alex
    await mutateState((s) => {
      const seller = s.users[sellerEmail]
      if (!seller) throw new Error('Seller não encontrado no seed')
      seller.coins.push({
        id: coinId,
        tipoMoeda: 'Entrega da Bandeira Olímpica',
        ano: 2016,
        entrada: '01/01/2026',
        statusFisico: 'Armazenado',
        statusDigital: 'Validado',
        valorEstimado: precoUnitario,
        protocolo: 'RO-ENV-9999',
        recibo: {
          codigo: 'REC-999999',
          dataEmissao: '01/01/2026',
          hash: 'def',
          status: 'Ativo',
        },
      })
      s.sellOffers.push({
        id: 'OFFER-compra-1',
        coinId,
        seller: sellerEmail,
        price: precoUnitario,
        obs: 'Lote teste compra direta',
        lotId,
        createdAt: Date.now(),
        tipoMoeda: 'Entrega da Bandeira Olímpica',
      })
    })

    await criarIntencaoCompraDireta(ref, precoUnitario, lotId, 1, 'Entrega da Bandeira Olímpica')
    consultarPagamentoMercadoPago.mockResolvedValue(aprovado(ref, precoUnitario))

    const saldoCompradorAntes = await saldo()
    const stateAntes = await getState()
    const saldoVendedorAntes = stateAntes.users[sellerEmail].balance

    const res = await conciliarPagamento('pay-compra-1')

    expect(res.creditado).toBe(true)
    expect(res.tipoOperacao).toBe('compra_direta')
    expect(res.compraConcluida).toBe(true)

    const stateDepois = await getState()
    // Saldo do comprador continua inalterado (dinheiro veio de fora e cobriu a compra)
    expect(stateDepois.users[EMAIL].balance).toBe(saldoCompradorAntes)

    // Moeda transferida para o comprador
    const moedaNoComprador = stateDepois.users[EMAIL].coins.find((c) => c.id === coinId)
    expect(moedaNoComprador).toBeDefined()

    // Vendedor recebeu o valor líquido: preço - comissão (R$ 200 - R$ 2 = R$ 198)
    const taxaEsperada = 100 + Math.round(precoUnitario * 0.005) // tradeFee(20_000) = 200
    expect(stateDepois.users[sellerEmail].balance).toBe(
      saldoVendedorAntes + precoUnitario - taxaEsperada,
    )

    // Oferta removida do livro
    expect(stateDepois.sellOffers.find((o) => o.lotId === lotId)).toBeUndefined()

    // Trade registrado
    const trade = stateDepois.trades[stateDepois.trades.length - 1]
    expect(trade).toMatchObject({
      buyer: EMAIL,
      seller: sellerEmail,
      price: precoUnitario,
      qty: 1,
    })

    // Reenvio do webhook não credita novamente (idempotência)
    const res2 = await conciliarPagamento('pay-compra-1')
    expect(res2.creditado).toBe(false)
  })

  it('compra direta quando o lote não está mais disponível: credita o dinheiro no saldo do comprador para evitar perda', async () => {
    const ref = 'CMP-lote-sumiu'
    const valor = 15_000

    await criarIntencaoCompraDireta(ref, valor, 'LOT-que-nao-existe', 1, 'Entrega da Bandeira Olímpica')
    consultarPagamentoMercadoPago.mockResolvedValue(aprovado(ref, valor))

    const saldoAntes = await saldo()
    const res = await conciliarPagamento('pay-corrida-1')

    expect(res.creditado).toBe(true)
    expect(res.tipoOperacao).toBe('compra_direta')
    expect(res.compraConcluida).toBe(false)
    expect(res.motivo).toBe('lote_indisponivel_creditado_em_saldo')

    // Dinheiro seguro na conta do comprador
    expect(await saldo()).toBe(saldoAntes + valor)
  })

  it('grava a separação financeira em recebimentos_gateway com tarifa e líquido', async () => {
    const ref = 'DEP-com-tarifa'
    const valor = 50_000
    const tarifa = 1_500
    const liquido = valor - tarifa

    await criarIntencao(ref, valor)
    consultarPagamentoMercadoPago.mockResolvedValue({
      ...aprovado(ref, valor),
      id: 'pay-separacao-1',
      tarifaCents: tarifa,
      valorLiquidoCents: liquido,
      totalPagoCents: valor,
      parcelas: 1,
      paymentMethodId: 'pix',
    })

    const res = await conciliarPagamento('pay-separacao-1')
    expect(res.creditado).toBe(true)

    const recebimento = await buscarRecebimentoPorPaymentId('pay-separacao-1')
    expect(recebimento).not.toBeNull()
    expect(recebimento).toMatchObject({
      paymentId: 'pay-separacao-1',
      externalReference: ref,
      tipoOperacao: 'deposito',
      userEmail: EMAIL,
      valorBruto: valor,
      tarifaGateway: tarifa,
      valorLiquido: liquido,
      parcelas: 1,
    })
    expect(recebimento?.competencia).toMatch(/^\d{4}-\d{2}$/)
  })

  it('despachante: operações ainda em construção (ex: plano_custodia, retirada) creditam em saldo como salvaguarda', async () => {
    const ref = 'PLN-custodia-teste'
    const valor = 4_000

    await repositorioIntencoes().criar({
      externalReference: ref,
      userEmail: EMAIL,
      valor,
      metodo: 'pix',
      status: 'pendente',
      tipoOperacao: 'plano_custodia',
      metadata: null,
      paymentId: null,
      motivoRecusa: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })

    consultarPagamentoMercadoPago.mockResolvedValue({
      ...aprovado(ref, valor),
      id: 'pay-plano-1',
    })

    const saldoAntes = await saldo()
    const res = await conciliarPagamento('pay-plano-1')

    expect(res.creditado).toBe(true)
    expect(res.tipoOperacao).toBe('plano_custodia')
    expect(res.motivo).toBe('fatura_custodia_creditada_saldo')
    expect(await saldo()).toBe(saldoAntes + valor)

    const rec = await buscarRecebimentoPorPaymentId('pay-plano-1')
    expect(rec?.tipoOperacao).toBe('plano_custodia')
  })

  it('despachante: assinatura_custodia atualiza plano.assinaturaId e avanca pagoAteCompetencia', async () => {
    // Cria plano no estado
    await mutateState((s) => {
      s.planosCustodia = [
        {
          id: 'PLC-ASS-01',
          userEmail: EMAIL,
          protocoloEnvio: 'RO-ENV-ASS',
          modalidade: 'anual',
          quantidadeContratada: 1,
          moedaIds: ['RO-000001'],
          valorPorMoedaCents: 2400,
          valorTotalCents: 2400,
          parcelasMax: 12,
          inicioCompetencia: '2026-09',
          pagoAteCompetencia: '2026-09',
          status: 'vigente',
          formaPagamento: 'cartao',
          paymentIntentRef: null,
          assinaturaId: null,
          estornadoCents: 0,
          criadoEm: Date.now(),
          atualizadoEm: Date.now(),
        },
      ]
      s.faturasCustodia = [
        {
          id: 'FAT-2026-10-ASS',
          userEmail: EMAIL,
          competencia: '2026-10',
          quantidadeMoedas: 1,
          moedaIds: ['RO-000001'],
          valorCents: 200,
          status: 'pendente',
          dataEmissao: Date.now(),
          dataVencimento: Date.now() + 10 * 86400000,
          dataPagamento: null,
          formaPagamento: null,
          paymentIntentId: null,
          planoId: 'PLC-ASS-01',
          origem: 'ciclo_mensal',
        },
      ]
    })

    const ref = 'ASS-PLC-ASS-01'
    const valor = 200

    await repositorioIntencoes().criar({
      externalReference: ref,
      userEmail: EMAIL,
      valor,
      metodo: 'checkout_pro',
      status: 'pendente',
      tipoOperacao: 'assinatura_custodia',
      metadata: { planoId: 'PLC-ASS-01', assinaturaId: 'preapp-rec-999' },
      paymentId: null,
      motivoRecusa: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })

    consultarPagamentoMercadoPago.mockResolvedValue({
      ...aprovado(ref, valor),
      id: 'pay-assinatura-1',
      paymentMethodId: 'credit_card',
      paymentTypeId: 'credit_card',
    })

    const res = await conciliarPagamento('pay-assinatura-1')
    expect(res.creditado).toBe(true)
    expect(res.motivo).toBe('assinatura_custodia_liquidada')

    const st = await getState()
    const plano = st.planosCustodia?.find((p) => p.id === 'PLC-ASS-01')
    expect(plano?.assinaturaId).toBe('preapp-rec-999')
    expect(plano?.pagoAteCompetencia).toBe('2026-10')

    const fatura = st.faturasCustodia?.find((f) => f.id === 'FAT-2026-10-ASS')
    expect(fatura?.status).toBe('paga')
    expect(fatura?.formaPagamento).toBe('cartao')
  })

  it('liquida taxa de retirada paga via Pix com extinção de recibo e recálculo D+30', async () => {
    let moedaId = ''
    await mutateState((s) => {
      const u = s.users[EMAIL]
      const moeda = u.coins[0]
      moedaId = moeda.id
      moeda.recibo.status = 'Ativo'

      s.retiradas = [
        {
          id: 'RET-TESTE-PIX',
          coinId: moeda.id,
          userEmail: EMAIL,
          modalidade: 'comum',
          status: 'solicitada',
          valorTaxaCents: 5000,
          formaPagamento: 'pix',
          paymentIntentRef: 'RET-INTENT-PIX-1',
          reciboCodigo: moeda.recibo.codigo,
          dataLimiteD30: Date.now() + 30 * 86400000,
          solicitadoEm: Date.now() - 10000,
          endereco: {
            nome: 'Gabriel Silva',
            cpfOuCnpj: '111.222.333-44',
            logradouro: 'Rua Rio de Janeiro',
            numero: '1000',
            complemento: 'Apto 1201',
            bairro: 'Centro',
            cidade: 'Belo Horizonte',
            uf: 'MG',
            cep: '30160-041',
            telefone: '(31) 99999-8888',
          },
          historico: [
            {
              de: null,
              para: 'solicitada',
              data: Date.now() - 10000,
              motivo: 'Solicitação criada',
              autor: EMAIL,
            },
          ],
          createdAt: Date.now() - 10000,
          updatedAt: Date.now() - 10000,
        },
      ]
    })

    const ref = 'RET-INTENT-PIX-1'
    const valor = 5000

    await repositorioIntencoes().criar({
      externalReference: ref,
      userEmail: EMAIL,
      valor,
      metodo: 'pix',
      status: 'pendente',
      tipoOperacao: 'retirada',
      metadata: { retiradaId: 'RET-TESTE-PIX', coinId: moedaId },
      paymentId: null,
      motivoRecusa: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })

    consultarPagamentoMercadoPago.mockResolvedValue({
      ...aprovado(ref, valor),
      id: 'pay-retirada-pix-1',
      tarifaCents: 150,
      valorLiquidoCents: 4850,
      paymentMethodId: 'pix',
      paymentTypeId: 'bank_transfer',
    })

    const res = await conciliarPagamento('pay-retirada-pix-1')
    expect(res.creditado).toBe(true)
    expect(res.motivo).toBe('retirada_liquidada')

    const st = await getState()
    const ret = st.retiradas?.find((r) => r.id === 'RET-TESTE-PIX')
    expect(ret?.status).toBe('paga')
    expect(ret?.formaPagamento).toBe('pix')
    expect(ret?.pagoEm).toBeDefined()

    // Recibo foi extinto
    const coin = st.users[EMAIL].coins.find((c) => c.id === moedaId)
    expect(coin?.recibo.status).toBe('Extinto')

    // D+30 recalculado da data de pagamento
    const trintaDiasMs = 30 * 24 * 60 * 60 * 1000
    expect(ret?.dataLimiteD30).toBeGreaterThanOrEqual(Date.now() + trintaDiasMs - 5000)

    // Recebimento gateway gravado
    const rec = await buscarRecebimentoPorPaymentId('pay-retirada-pix-1')
    expect(rec).toBeDefined()
    expect(rec?.valorBruto).toBe(5000)
    expect(rec?.tarifaGateway).toBe(150)
    expect(rec?.valorLiquido).toBe(4850)

    // Idempotência: reenvio não altera status ou recria recebimento
    const resRepetido = await conciliarPagamento('pay-retirada-pix-1')
    expect(resRepetido.creditado).toBe(false)
    expect(resRepetido.motivo).toContain('já estava com status')
  })
})


