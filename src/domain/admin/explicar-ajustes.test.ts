import { describe, expect, it } from 'vitest'

import { ACAO_DE_ANOTACAO, explicarAjuste, JANELA_DA_EXPLICACAO_MS, type EntradaDeTrilhaParaAjuste } from './explicar-ajustes'

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

  describe('anotação explícita — o jeito de explicar, depois, um lançamento já gravado', () => {
    const anotacao = (lancamentoId: number, motivo: string, quando = T + 86_400_000): EntradaDeTrilhaParaAjuste => ({
      createdAt: quando,
      acao: ACAO_DE_ANOTACAO,
      usuariosAfetados: [GERAIS],
      detalhes: { lancamentoId, motivo },
    })

    it('vale em qualquer data, pelo número do lançamento, e vence a ação do painel que nasceu junto', () => {
      const trilha = [admin('admin.usuarios.ajustar_saldo', T - 84, 'texto antigo'), anotacao(308, 'Cobrança retroativa de custódia não cobrada por instabilidade sistêmica')]
      expect(explicarAjuste({ id: 308, userEmail: GERAIS, createdAt: T }, trilha)).toBe('Cobrança retroativa de custódia não cobrada por instabilidade sistêmica')
    })

    it('só vale para o lançamento a que aponta', () => {
      expect(explicarAjuste({ id: 310, userEmail: GERAIS, createdAt: T }, [anotacao(308, 'é do 308')])).toBeNull()
    })

    it('anotar de novo corrige o texto: a mais recente vence', () => {
      const trilha = [anotacao(308, 'primeira versão', T + 1000), anotacao(308, 'versão corrigida', T + 2000)]
      expect(explicarAjuste({ id: 308, userEmail: GERAIS, createdAt: T }, trilha)).toBe('versão corrigida')
    })
  })
})
