import { describe, expect, it } from 'vitest'

import { encadearAnalise, type AnalisePendente } from '@/domain/analise'
import { GENESIS } from '@/domain/hash'
import { encadear, lancamentoDeSaldoInicial } from '@/domain/ledger'
import { BAN, DH, estado, moeda, usuario, venda } from '@/domain/testing/fixtures'
import type { Analise, AppState, Retirada } from '@/domain/types'

import { filtrarMoedas, FILTRO_MOEDAS_PADRAO, lerFiltroMoedas, linhasDoAcervo, resumirAcervo, verificarAcervo } from './moedas'

function aprovar(n: number, codigo: string, anterior: string, video: string | null = 'RO-ENV-0001/RO-ENV-0001-1.webm'): Analise {
  const p: AnalisePendente = {
    protocolo: `RO-ANL-000${n}`,
    protocoloEnvio: 'RO-ENV-0001',
    codigoMoeda: codigo,
    codigoRecibo: codigo.replace('RO-', 'REC-'),
    tipoMoeda: BAN,
    ano: 2012,
    pesoMg: 7000 + n,
    veredito: 'aprovada',
    motivoRecusa: null,
    operador: 'op@aureacustodia.com.br',
    aprovador: 'op@aureacustodia.com.br',
    caixa: 'EB-001',
    posicao: n,
    validadoEm: 1_757_520_000_000 + n,
    caminhoVideo: video,
  }
  return encadearAnalise(p, anterior)
}

function retirada(coinId: string, status: Retirada['status'], solicitadoEm: number): Retirada {
  return {
    id: `RET-${solicitadoEm}`,
    coinId,
    reciboCodigo: coinId.replace('RO-', 'REC-'),
    userEmail: 'a@x.com',
    modalidade: 'comum',
    status,
    valorTaxaCents: 5000,
    endereco: { nome: 'A', cpfOuCnpj: '1', logradouro: 'R', numero: '1', bairro: 'B', cidade: 'C', uf: 'SP', cep: '0', telefone: '1' },
    solicitadoEm,
    dataLimiteD30: solicitadoEm + 1,
    historico: [],
  }
}

function acervo(): AppState {
  const s = estado({
    'a@x.com': usuario('Alex', 0, [moeda('RO-000002', BAN), moeda('RO-000001', BAN)]),
    'b@x.com': usuario('Bia', 0, [moeda('RO-000003', DH)]),
  })
  const a1 = aprovar(1, 'RO-000001', GENESIS)
  const a2 = aprovar(2, 'RO-000002', a1.hash, null)
  s.analises = [a1, a2]
  // O recibo de uma moeda que passou pela bancada carrega o hash da análise.
  s.users['a@x.com'].coins[1].recibo.hash = a1.hash
  s.users['a@x.com'].coins[0].recibo.hash = a2.hash
  s.sellOffers = [venda('V1', 'RO-000003', 'b@x.com', 40000, DH, 1)]
  return s
}

describe('linhas do acervo', () => {
  it('uma linha por moeda, em ordem de código, com a análise de origem e a situação', () => {
    const s = acervo()
    const linhas = linhasDoAcervo(s, [retirada('RO-000001', 'cancelada', 1), retirada('RO-000001', 'paga', 2), retirada('RO-000003', 'entregue', 3)])
    expect(linhas.map((l) => [l.codigo, l.dono, l.situacao, l.caixa, l.posicao, l.hashConfere, l.negociando])).toEqual([
      // A cancelada não esconde o pedido novo, que ainda não tirou a moeda do cofre.
      ['RO-000001', 'a@x.com', 'em_retirada', 'EB-001', 1, true, false],
      ['RO-000002', 'a@x.com', 'custodiada', 'EB-001', 2, true, false],
      // Moeda sem análise (seed): hash simulado declarado, não divergente.
      ['RO-000003', 'b@x.com', 'retirada', null, null, null, true],
    ])
    expect(linhas[0].analise).toMatchObject({ protocolo: 'RO-ANL-0001', pesoMg: 7001, operador: 'op@aureacustodia.com.br' })
  })

  it('resumo conta vídeo faltando e hash divergente', () => {
    const s = acervo()
    s.users['a@x.com'].coins[0].recibo.hash = 'adulterado'
    expect(resumirAcervo(linhasDoAcervo(s, []))).toEqual({ total: 3, custodiadas: 3, emRetirada: 0, retiradas: 0, comAnalise: 2, semVideo: 1, hashDivergente: 1 })
  })

  it('filtro pela URL, com valores fora da lista ignorados', () => {
    expect(lerFiltroMoedas({ situacao: 'roubada', analise: 'com', busca: '  rec-0001 ', caixa: 'eb 001' })).toEqual({
      busca: 'rec-0001',
      tipo: '',
      situacao: 'todas',
      analise: 'com',
      caixa: 'eb 001',
    })
    const linhas = linhasDoAcervo(acervo(), [])
    expect(filtrarMoedas(linhas, { ...FILTRO_MOEDAS_PADRAO, busca: 'rec-000001' }).map((l) => l.codigo)).toEqual(['RO-000001'])
    expect(filtrarMoedas(linhas, { ...FILTRO_MOEDAS_PADRAO, analise: 'sem' }).map((l) => l.codigo)).toEqual(['RO-000003'])
    expect(filtrarMoedas(linhas, { ...FILTRO_MOEDAS_PADRAO, caixa: 'eb 001' })).toHaveLength(2)
    expect(filtrarMoedas(linhas, { ...FILTRO_MOEDAS_PADRAO, tipo: DH }).map((l) => l.codigo)).toEqual(['RO-000003'])
  })
})

function livro() {
  const pendentes = [lancamentoDeSaldoInicial('a@x.com', 1000, 1, 'seed'), lancamentoDeSaldoInicial('b@x.com', 2000, 2, 'seed')]
  return encadear(pendentes, {}, GENESIS).lancamentos
}

describe('verificar corrente', () => {
  it('íntegro: as três conferências passam', () => {
    const s = acervo()
    const [l1, l2] = livro()
    const v = verificarAcervo(s, [{ ...l1, id: 1 }, { ...l2, id: 2 }], GENESIS)
    expect(v).toEqual({
      analises: { total: 2, integra: true, primeiraQuebra: null, protocolo: null },
      ledger: { total: 2, integra: true, primeiraQuebra: null, motivo: null, id: null },
      recibos: { conferidos: 2, divergentes: [] },
    })
  })

  it('aponta a primeira análise adulterada, a linha do livro e o recibo que não bate', () => {
    const s = acervo()
    s.analises[0] = { ...s.analises[0], pesoMg: 9999 }
    s.users['a@x.com'].coins[0].recibo.hash = 'outro'
    const [l1, l2] = livro()
    const v = verificarAcervo(s, [{ ...l1, id: 10 }, { ...l2, valor: 1, id: 11 }], GENESIS)
    expect(v.analises).toEqual({ total: 2, integra: false, primeiraQuebra: 0, protocolo: 'RO-ANL-0001' })
    expect(v.ledger).toMatchObject({ integra: false, primeiraQuebra: 1, id: 11 })
    expect(v.recibos.divergentes).toEqual([{ codigo: 'RO-000002', analise: 'RO-ANL-0002' }])
  })

  it('sem livro-razão (ambiente sem banco), a conferência do ledger volta nula', () => {
    expect(verificarAcervo(acervo(), null, GENESIS).ledger).toBeNull()
  })
})
