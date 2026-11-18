/**
 * As notas como o cliente as vê (frente G, 18/11/2026): os cinco estados, o que cada um mostra e o que
 * nunca sai da tela (justificativa livre do cancelamento, número de DPS, tentativas).
 */

import { describe, expect, it } from 'vitest'

import {
  competenciaParaTela,
  estadoDaNota,
  formatoDeNotaValido,
  motivoDoCancelamentoParaOCliente,
  ordenarNotasDoCliente,
  paraNotaDoCliente,
  type LinhaDaNota,
} from './notas-do-cliente'

function linha(sobre: Partial<LinhaDaNota> = {}): LinhaDaNota {
  return {
    id: 1,
    servico: 'custodia',
    refFato: 'FAT-2026-11-TESTE-1',
    valorCents: 200,
    ocorridoEm: Date.UTC(2026, 10, 16, 18, 0, 0),
    competencia: '2026-11-16',
    descricao: 'CUSTODIA MENSAL - 16/11/2026 A 16/12/2026 - 1 MOEDA - REF FAT-2026-11-TESTE-1',
    quantidadeMoedas: 1,
    status: 'autorizada',
    ambiente: 'producao',
    numeroNfse: '54',
    chaveAcesso: '31062002268071452000106000000000005426110748266219',
    autorizadaEm: Date.UTC(2026, 10, 16, 18, 15, 56),
    canceladaEm: null,
    motivoCancelamento: null,
    codigoDoErro: null,
    temXml: true,
    ...sobre,
  }
}

describe('estadoDaNota', () => {
  it('autorizada em produção, com XML, é emitida', () => {
    expect(estadoDaNota(linha())).toBe('emitida')
  })

  it('autorizada só na produção restrita (nota de teste) ainda é "em preparação" — nunca se mostra nota de teste', () => {
    expect(estadoDaNota(linha({ ambiente: 'restrita' }))).toBe('em_preparacao')
    expect(estadoDaNota(linha({ temXml: false }))).toBe('em_preparacao')
  })

  it('o que ainda não saiu da fila é "em preparação", sem prometer prazo', () => {
    for (const status of ['pendente', 'processando', 'erro']) {
      expect(estadoDaNota(linha({ status, ambiente: null, temXml: false }))).toBe('em_preparacao')
    }
  })

  it('recusa por cadastro incompleto é a única que a tela explica; outra recusa é "em preparação"', () => {
    expect(estadoDaNota(linha({ status: 'rejeitada', ambiente: null, temXml: false, codigoDoErro: 'CADASTRO' }))).toBe('falta_cadastro')
    expect(estadoDaNota(linha({ status: 'rejeitada', ambiente: null, temXml: false, codigoDoErro: 'E0187' }))).toBe('em_preparacao')
  })

  it('cancelando e cancelada seguem listadas', () => {
    expect(estadoDaNota(linha({ status: 'cancelando' }))).toBe('cancelando')
    expect(estadoDaNota(linha({ status: 'cancelada' }))).toBe('cancelada')
  })

  it('um status que a fila ganhe no futuro cai em "em preparação", não some', () => {
    expect(estadoDaNota(linha({ status: 'inventado' }))).toBe('em_preparacao')
  })
})

describe('paraNotaDoCliente', () => {
  it('nota emitida mostra número, chave, data de emissão e pode baixar', () => {
    const n = paraNotaDoCliente(linha())
    expect(n).toMatchObject({
      estado: 'emitida',
      rotuloDoServico: 'Custódia',
      numero: '54',
      chaveAcesso: '31062002268071452000106000000000005426110748266219',
      podeBaixar: true,
      faturaId: 'FAT-2026-11-TESTE-1',
      canceladaEm: null,
    })
    expect(n.emitidaEm).toBe(Date.UTC(2026, 10, 16, 18, 15, 56))
  })

  it('cancelada continua com número e arquivo, com a data e o motivo em palavras — sem a justificativa livre', () => {
    const n = paraNotaDoCliente(
      linha({
        status: 'cancelada',
        canceladaEm: Date.UTC(2026, 10, 14, 22, 41, 0),
        motivoCancelamento: '2|Custodia FAT-2026-11-TESTE-1 cobrada por engano: valor devolvido ao saldo do cliente, servico nao prestado',
      }),
    )
    expect(n.estado).toBe('cancelada')
    expect(n.numero).toBe('54')
    expect(n.canceladaEm).toBe(Date.UTC(2026, 10, 14, 22, 41, 0))
    expect(n.motivoDoCancelamento).toBe('Serviço não prestado')
    expect(n.podeBaixar).toBe(true)
    expect(JSON.stringify(n)).not.toContain('engano')
  })

  it('cancelada ainda na fila (nunca emitida) não tem número nem arquivo', () => {
    const n = paraNotaDoCliente(
      linha({ status: 'cancelada', ambiente: null, numeroNfse: null, chaveAcesso: null, autorizadaEm: null, temXml: false, canceladaEm: 5, motivoCancelamento: '2|x' }),
    )
    expect(n.estado).toBe('cancelada')
    expect(n.numero).toBeNull()
    expect(n.podeBaixar).toBe(false)
  })

  it('em preparação não mostra número, chave nem data de emissão, mesmo que a linha traga lixo', () => {
    const n = paraNotaDoCliente(linha({ status: 'pendente', ambiente: 'restrita', temXml: true }))
    expect(n.estado).toBe('em_preparacao')
    expect(n.numero).toBeNull()
    expect(n.chaveAcesso).toBeNull()
    expect(n.emitidaEm).toBeNull()
    expect(n.podeBaixar).toBe(false)
  })

  it('só custódia aponta para uma fatura', () => {
    expect(paraNotaDoCliente(linha({ servico: 'intermediacao_compra', refFato: 'TRADE-12' })).faturaId).toBeNull()
    expect(paraNotaDoCliente(linha({ servico: 'tarifa_saque', refFato: 'SAQ-1' })).rotuloDoServico).toBe('Tarifa de saque')
  })

  it('não carrega nenhum dado interno da fila (e-mail, número de DPS, tentativas)', () => {
    const chaves = Object.keys(paraNotaDoCliente(linha()))
    for (const proibida of ['tomadorEmail', 'nDps', 'idDps', 'tentativas', 'erros', 'xml', 'refFato', 'codigoDoErro']) {
      expect(chaves).not.toContain(proibida)
    }
  })
})

describe('apoios da tela', () => {
  it('traduz o código do motivo do cancelamento e ignora o que não conhece', () => {
    expect(motivoDoCancelamentoParaOCliente('1|x')).toBe('Erro na emissão')
    expect(motivoDoCancelamentoParaOCliente('9|x')).toBe('Outro motivo')
    expect(motivoDoCancelamentoParaOCliente('7|x')).toBeNull()
    expect(motivoDoCancelamentoParaOCliente(null)).toBeNull()
  })

  it('ordena a mais recente primeiro', () => {
    const a = paraNotaDoCliente(linha({ id: 1, ocorridoEm: 100 }))
    const b = paraNotaDoCliente(linha({ id: 2, ocorridoEm: 300 }))
    const c = paraNotaDoCliente(linha({ id: 3, ocorridoEm: 300 }))
    expect(ordenarNotasDoCliente([a, b, c]).map((n) => n.id)).toEqual([3, 2, 1])
  })

  it('mostra a competência sem passar pelo fuso do navegador', () => {
    expect(competenciaParaTela('2026-11-16')).toBe('16/11/2026')
    expect(competenciaParaTela('sem formato')).toBe('sem formato')
  })

  it('só aceita xml e pdf como formato de download', () => {
    expect(formatoDeNotaValido('xml')).toBe(true)
    expect(formatoDeNotaValido('pdf')).toBe(true)
    expect(formatoDeNotaValido('zip')).toBe(false)
    expect(formatoDeNotaValido(undefined)).toBe(false)
  })
})
