/**
 * O aviso de custódia diz a verdade sobre o que está travado (12/10/2026).
 *
 * Antes ele prometia que pagar "mantém os recibos livres para negociar", como se a moeda já negociasse.
 * Desde que moeda com custódia nunca paga não se vende, o cliente precisa ler, ANTES de tentar, quantas
 * moedas estão presas e o que as solta. Renderizado de verdade, sem JSX, como o do `ResumoDaCustodia`.
 */

import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { AppState, Coin, FaturaCustodia, User } from '@/domain/types'

const { useAppMock } = vi.hoisted(() => ({ useAppMock: vi.fn() }))
vi.mock('@/components/providers/AppProvider', () => ({ useApp: useAppMock }))
vi.mock('@/components/tutorial/contexto', () => ({ useTutorial: () => ({ exemplo: null }) }))

import { AvisoDebitoCustodia } from '@/components/custody/AvisoDebitoCustodia'

const DONO = 'dono@exemplo.com.br'
const DIA = 86_400_000

function moeda(id: string): Coin {
  return {
    id,
    tipoMoeda: 'Entrega da Bandeira Olímpica',
    ano: 2012,
    entrada: '06/10/2026',
    statusFisico: 'Armazenado',
    statusDigital: 'Validado',
    valorEstimado: 28000,
    protocolo: 'RO-ENV-0009',
    recibo: { codigo: `REC-${id}`, hash: 'h', dataEmissao: '06/10/2026', status: 'Ativo' },
  }
}

function fatura(p: Partial<FaturaCustodia> & Pick<FaturaCustodia, 'id' | 'status'>): FaturaCustodia {
  return {
    userEmail: DONO,
    competencia: '2026-10',
    quantidadeMoedas: 1,
    moedaIds: [],
    valorCents: 200,
    dataEmissao: Date.now() - DIA,
    dataVencimento: Date.now() + 25 * DIA,
    origem: 'entrada_no_acervo',
    ...p,
  }
}

function montar(moedas: Coin[], faturas: FaturaCustodia[]): string {
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
    planosCustodia: [],
  }
  useAppMock.mockReturnValue({ state, session: DONO })
  return renderToStaticMarkup(createElement(AvisoDebitoCustodia))
}

beforeEach(() => useAppMock.mockReset())

describe('AvisoDebitoCustodia', () => {
  it('moeda com a fatura de entrada ainda aberta: diz que NÃO pode ser vendida e o que a solta', () => {
    const html = montar([moeda('RO-000128'), moeda('RO-000129')], [
      fatura({ id: 'F1', status: 'pendente', quantidadeMoedas: 2, moedaIds: ['RO-000128', 'RO-000129'], valorCents: 400 }),
    ])

    expect(html).toContain('2 moedas suas não podem')
    expect(html).toContain('ser vendidas')
    expect(html).toContain('pagar')
    expect(html).toContain('R$')
    expect(html).not.toContain('mantém os recibos livres')
  })

  it('uma moeda só: singular', () => {
    const html = montar([moeda('RO-000128')], [fatura({ id: 'F1', status: 'pendente', moedaIds: ['RO-000128'] })])
    expect(html).toContain('1 moeda sua não pode')
    expect(html).toContain('ser vendida')
  })

  it('cobertura paga e fatura do próximo ciclo ainda no prazo: não está presa, o texto é de lembrete', () => {
    const paga = fatura({
      id: 'FP',
      status: 'paga',
      moedaIds: ['RO-000128'],
      dataPagamento: Date.now() - 10 * DIA,
      coberturaAte: Date.now() + 5 * DIA,
    })
    const nova = fatura({ id: 'FN', status: 'pendente', origem: 'ciclo_mensal', moedaIds: ['RO-000128'] })
    const html = montar([moeda('RO-000128')], [paga, nova])

    expect(html).not.toContain('não pode')
    expect(html).toContain('Pague até o vencimento')
  })

  it('tudo pago e coberto: o aviso fica em silêncio', () => {
    const paga = fatura({
      id: 'FP',
      status: 'paga',
      moedaIds: ['RO-000128'],
      dataPagamento: Date.now() - DIA,
      coberturaAte: Date.now() + 20 * DIA,
    })
    expect(montar([moeda('RO-000128')], [paga])).toBe('')
  })

  it('cobertura vencida sem fatura emitida: o aviso aparece mesmo assim, sem valor', () => {
    const lapsada = fatura({
      id: 'FP',
      status: 'paga',
      moedaIds: ['RO-000128'],
      dataPagamento: Date.now() - 40 * DIA,
      coberturaAte: Date.now() - 5 * DIA,
    })
    const html = montar([moeda('RO-000128')], [lapsada])

    expect(html).toContain('1 moeda sua não pode')
    expect(html).not.toContain(' — R$')
  })
})
