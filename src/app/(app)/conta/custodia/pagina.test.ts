/**
 * A página "Minha custódia" renderizada de verdade, em HTML.
 *
 * Mesma razão do teste do `ResumoDaCustodia`: o build prova que compila, não
 * que monta. Aqui interessam o extrato — a lista de faturas PAGAS, que é o que
 * o Gabriel apontou como faltando — e o aviso de que cancelar o plano não
 * encerra a guarda.
 *
 * `pagina.test.ts` e não `page.test.ts` porque o App Router trataria um
 * `page.*` dentro da pasta da rota como a própria rota.
 */

import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { brl } from '@/domain/money'
import type { AppState, Coin, FaturaCustodia, PlanoCustodia, User } from '@/domain/types'

const { useAppMock } = vi.hoisted(() => ({ useAppMock: vi.fn() }))
vi.mock('@/components/providers/AppProvider', () => ({ useApp: useAppMock }))
vi.mock('@/server/actions/plano-custodia', () => ({
  cancelarMinhaAssinaturaCustodia: vi.fn(),
}))

import MinhaCustodiaPage from './page'

const DONO = 'dono@exemplo.com.br'
const DIA = 86_400_000
const AGORA = Date.now()

function moeda(id: string): Coin {
  return {
    id,
    tipoMoeda: 'Direitos Humanos',
    ano: 1998,
    entrada: '25/09/2026',
    statusFisico: 'Armazenado',
    statusDigital: 'Validado',
    valorEstimado: 45000,
    protocolo: 'RO-DIR-0001',
    recibo: { codigo: `REC-${id}`, hash: 'h', dataEmissao: '25/09/2026', status: 'Ativo' },
  }
}

function plano(status: PlanoCustodia['status']): PlanoCustodia {
  return {
    id: 'PLC-000008',
    userEmail: DONO,
    protocoloEnvio: 'RO-ENV-0004',
    modalidade: 'mensal',
    quantidadeContratada: 1,
    moedaIds: ['RO-000001'],
    valorPorMoedaCents: 200,
    valorTotalCents: 200,
    parcelasMax: 1,
    inicioCompetencia: '2026-09',
    pagoAteCompetencia: '2026-09',
    status,
    formaPagamento: 'saldo',
    paymentIntentRef: null,
    assinaturaId: null,
    estornadoCents: 0,
    criadoEm: AGORA,
    atualizadoEm: AGORA,
  }
}

function montar(moedas: Coin[], faturas: FaturaCustodia[], planos: PlanoCustodia[] = []): string {
  const user: User = { name: 'Dono', balance: 0, coins: moedas, inadimplente: false }
  const state: AppState = {
    users: { [DONO]: user },
    sellOffers: [],
    buyOrders: [],
    trades: [],
    envios: [],
    seq: { coin: 0, envio: 0 },
    deposits: [],
    analises: [],
    faturasCustodia: faturas,
    planosCustodia: planos,
  }
  useAppMock.mockReturnValue({
    state,
    session: DONO,
    taxas: { custodiaMensalPorMoeda: 200 },
    run: vi.fn(),
  })
  return renderToStaticMarkup(createElement(MinhaCustodiaPage))
}

beforeEach(() => useAppMock.mockReset())

describe('Minha custódia', () => {
  it('responde as três perguntas: preço por mês, próximo pagamento e total pago', () => {
    const html = montar(
      [moeda('RO-000001'), moeda('RO-000002')],
      [
        {
          id: 'F-PAGA',
          userEmail: DONO,
          competencia: '2026-08',
          quantidadeMoedas: 2,
          moedaIds: ['RO-000001', 'RO-000002'],
          valorCents: 400,
          status: 'paga',
          dataEmissao: AGORA - 35 * DIA,
          dataVencimento: AGORA - 25 * DIA,
          dataPagamento: AGORA - 30 * DIA,
          formaPagamento: 'pix',
          origem: 'ciclo_mensal',
        },
      ],
    )

    expect(html).toContain('Preço por moeda')
    expect(html).toContain('Mensalidade do acervo')
    expect(html).toContain('Próximo pagamento')
    expect(html).toContain('Já pago em custódia')
    expect(html).toContain(brl(400))
  })

  it('o extrato mostra data, origem em português, forma e total pago', () => {
    const html = montar(
      [moeda('RO-000001')],
      [
        {
          id: 'F-ENTRADA',
          userEmail: DONO,
          competencia: '2026-09',
          quantidadeMoedas: 1,
          moedaIds: ['RO-000001'],
          valorCents: 200,
          status: 'paga',
          dataEmissao: AGORA - DIA,
          dataVencimento: AGORA + 9 * DIA,
          dataPagamento: AGORA - DIA,
          formaPagamento: 'saldo',
          origem: 'entrada_no_acervo',
        },
      ],
    )

    expect(html).toContain('Extrato de pagamentos da custódia')
    expect(html).toContain('Entrada de moeda na custódia')
    expect(html).toContain('Saldo em conta')
    expect(html).toContain('Total pago')
  })

  it('plano vigente oferece o cancelamento da assinatura', () => {
    const html = montar([moeda('RO-000001')], [], [plano('vigente')])

    expect(html).toContain('PLC-000008')
    expect(html).toContain('Cancelar assinatura deste plano')
  })

  it('plano cancelado permanece no histórico, sem botão de cancelar', () => {
    const html = montar([moeda('RO-000001')], [], [plano('cancelado')])

    expect(html).toContain('PLC-000008')
    expect(html).toContain('Cancelado')
    expect(html).not.toContain('Cancelar assinatura deste plano')
  })

  it('sem plano, explica que a guarda continua cobrada mês a mês', () => {
    const html = montar([moeda('RO-000001')], [])

    expect(html).toContain('Você não tem plano de custódia contratado')
    expect(html).toContain('cobradas mês a mês')
  })
})
