import { describe, expect, it } from 'vitest'

import { explicarAjuste, JANELA_DA_EXPLICACAO_MS, type EntradaDeTrilhaParaAjuste } from './explicar-ajustes'

const GERAIS = 'geraisseguros@gmail.com'
const T = 1_792_604_514_003

function admin(acao: string, quando: number, motivo: unknown, afetados: string[] = [GERAIS]): EntradaDeTrilhaParaAjuste {
  return { createdAt: quando, acao, usuariosAfetados: afetados, detalhes: motivo === undefined ? {} : { motivo } }
}

describe('explicarAjuste — o motivo do ajuste, tirado da trilha do painel', () => {
  it('o ajuste manual do Gabriel é explicado pelo motivo que ele escreveu', () => {
    const trilha = [admin('admin.usuarios.ajustar_saldo', T - 84, 'Cobrança retroativa de custódia não paga')]
    expect(explicarAjuste({ userEmail: GERAIS, createdAt: T }, trilha)).toBe('Cobrança retroativa de custódia não paga')
  })

  it('a regularização da custódia explica o ajuste que desfaz o primeiro', () => {
    const trilha = [
      admin('admin.usuarios.ajustar_saldo', T - 90_000, 'Cobrança retroativa de custódia não paga'),
      admin('admin.custodia.regularizar_compra', T + 900, 'Custódia do 1º mês da RO-000011 registrada como fatura paga'),
    ]
    expect(explicarAjuste({ userEmail: GERAIS, createdAt: T }, trilha)).toBe('Custódia do 1º mês da RO-000011 registrada como fatura paga')
  })

  it('sem ação do painel por perto, não inventa explicação', () => {
    expect(explicarAjuste({ userEmail: GERAIS, createdAt: T }, [])).toBeNull()
    expect(explicarAjuste({ userEmail: GERAIS, createdAt: T }, [admin('admin.usuarios.ajustar_saldo', T - JANELA_DA_EXPLICACAO_MS - 1, 'longe demais')])).toBeNull()
  })

  it('só vale ação da EQUIPE: negociação e depósito não são motivo de ajuste', () => {
    expect(explicarAjuste({ userEmail: GERAIS, createdAt: T }, [admin('negociacao', T, 'texto qualquer')])).toBeNull()
  })

  it('só vale ação sobre a MESMA conta', () => {
    const trilha = [admin('admin.usuarios.ajustar_saldo', T, 'ajuste de outra pessoa', ['outra@exemplo.com'])]
    expect(explicarAjuste({ userEmail: GERAIS, createdAt: T }, trilha)).toBeNull()
  })

  it('ação sem motivo escrito não explica', () => {
    expect(explicarAjuste({ userEmail: GERAIS, createdAt: T }, [admin('admin.usuarios.ajustar_saldo', T, '   ')])).toBeNull()
    expect(explicarAjuste({ userEmail: GERAIS, createdAt: T }, [admin('admin.usuarios.ajustar_saldo', T, undefined)])).toBeNull()
  })
})
