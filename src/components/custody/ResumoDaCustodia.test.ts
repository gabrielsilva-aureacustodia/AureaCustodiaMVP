/**
 * O cartão de custódia renderizado de verdade, em HTML.
 *
 * O build prova que o JSX compila; não prova que ele não estoura ao montar nem
 * que os números certos chegam à tela. Aqui o componente passa por
 * `renderToStaticMarkup` com um estado de mentira no lugar do `useApp`, e o que
 * se confere é o texto que o cliente lê.
 *
 * É um `.ts` e não `.tsx` porque a suíte inclui `src/**​/*.test.ts` — e os
 * elementos são criados com `createElement`, sem JSX, pelo mesmo motivo.
 */

import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { brl } from '@/domain/money'
import type { AppState, Coin, FaturaCustodia, User } from '@/domain/types'

const { useAppMock } = vi.hoisted(() => ({ useAppMock: vi.fn() }))
vi.mock('@/components/providers/AppProvider', () => ({ useApp: useAppMock }))

import { ResumoDaCustodia } from '@/components/custody/ResumoDaCustodia'

const DONO = 'dono@exemplo.com.br'
const DIA = 86_400_000

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

function montar(moedas: Coin[], faturas: FaturaCustodia[] = []): string {
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
  useAppMock.mockReturnValue({ state, session: DONO, taxas: { custodiaMensalPorMoeda: 200 } })
  return renderToStaticMarkup(createElement(ResumoDaCustodia))
}

beforeEach(() => useAppMock.mockReset())

describe('ResumoDaCustodia', () => {
  it('mostra o acervo, a mensalidade e o preço por moeda', () => {
    const html = montar([moeda('RO-000001'), moeda('RO-000002'), moeda('RO-000003')])

    expect(html).toContain('Minha custódia')
    expect(html).toContain('Moedas sob guarda')
    expect(html).toContain(brl(600))
    expect(html).toContain(brl(200))
    expect(html).toContain('Ver plano e extrato')
  })

  it('quem está em dia vê o selo verde e nenhum botão de pagar', () => {
    const html = montar([moeda('RO-000001')])

    expect(html).toContain('Em dia')
    expect(html).not.toContain('Pagar ')
    expect(html).toContain('Próxima cobrança')
  })

  it('com fatura em aberto, oferece o pagamento pelo valor devido', () => {
    const agora = Date.now()
    const html = montar(
      [moeda('RO-000001'), moeda('RO-000002')],
      [
        {
          id: 'F1',
          userEmail: DONO,
          competencia: '2026-09',
          quantidadeMoedas: 2,
          moedaIds: ['RO-000001', 'RO-000002'],
          valorCents: 400,
          status: 'pendente',
          dataEmissao: agora - DIA,
          dataVencimento: agora + 5 * DIA,
          origem: 'entrada_no_acervo',
        },
      ],
    )

    expect(html).toContain('A pagar')
    expect(html).toContain(`Pagar ${brl(400)}`)
    expect(html).toContain('/conta/faturas')
  })

  it('fatura vencida avisa do bloqueio de venda e retirada', () => {
    const agora = Date.now()
    const html = montar(
      [moeda('RO-000001')],
      [
        {
          id: 'F1',
          userEmail: DONO,
          competencia: '2026-08',
          quantidadeMoedas: 1,
          moedaIds: ['RO-000001'],
          valorCents: 200,
          status: 'atrasada',
          dataEmissao: agora - 40 * DIA,
          dataVencimento: agora - 30 * DIA,
          origem: 'ciclo_mensal',
        },
      ],
    )

    expect(html).toContain('Vencida')
    expect(html).toContain('bloqueados para venda')
  })

  it('conta sem acervo e sem fatura não renderiza nada — bloco vazio vira paisagem', () => {
    expect(montar([])).toBe('')
  })
})
