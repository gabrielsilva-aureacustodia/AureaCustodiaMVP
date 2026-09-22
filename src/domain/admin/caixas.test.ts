import { describe, expect, it } from 'vitest'

import { encadearAnalise, type AnalisePendente } from '@/domain/analise'
import { GENESIS } from '@/domain/hash'
import { BAN, estado, moeda, usuario } from '@/domain/testing/fixtures'
import type { AppState, Retirada } from '@/domain/types'

import {
  caixaCorrente,
  chaveDeCaixa,
  codigoDeCaixaParaGravar,
  ocupacaoDasCaixas,
  ocupantesDoCofre,
  posicoesJaOcupadas,
  proximasPosicoesDaCaixa,
  validarCaixa,
  type CaixaCadastrada,
  type OcupacaoDaCaixa,
} from './caixas'

function analise(n: number, codigoMoeda: string | null, caixa: string | null, posicao: number | null, anterior = GENESIS) {
  const p: AnalisePendente = {
    protocolo: `RO-ANL-000${n}`,
    protocoloEnvio: 'RO-ENV-0001',
    codigoMoeda,
    codigoRecibo: codigoMoeda ? codigoMoeda.replace('RO-', 'REC-') : null,
    tipoMoeda: BAN,
    ano: 2012,
    pesoMg: 7000,
    veredito: codigoMoeda ? 'aprovada' : 'recusada',
    motivoRecusa: codigoMoeda ? null : 'Peso fora',
    operador: 'op@aureacustodia.com.br',
    aprovador: 'op@aureacustodia.com.br',
    caixa,
    posicao,
    validadoEm: 1_757_520_000_000 + n,
    caminhoVideo: null,
  }
  return encadearAnalise(p, anterior)
}

function retirada(coinId: string, status: Retirada['status']): Retirada {
  return {
    id: `RET-${coinId}`,
    coinId,
    reciboCodigo: coinId.replace('RO-', 'REC-'),
    userEmail: 'a@x.com',
    modalidade: 'comum',
    status,
    valorTaxaCents: 5000,
    endereco: { nome: 'A', cpfOuCnpj: '1', logradouro: 'R', numero: '1', bairro: 'B', cidade: 'C', uf: 'SP', cep: '0', telefone: '1' },
    solicitadoEm: 1,
    dataLimiteD30: 2,
    historico: [],
  }
}

function cofre(): AppState & { retiradas: Retirada[] } {
  const s = estado({
    'a@x.com': usuario('A', 0, [moeda('RO-000001', BAN), moeda('RO-000002', BAN)]),
    'b@x.com': usuario('B', 0, [moeda('RO-000003', BAN)]),
  })
  const a1 = analise(1, 'RO-000001', 'EB-001', 7)
  const a2 = analise(2, 'RO-000002', 'eb 001', 8, a1.hash)
  const a3 = analise(3, null, 'EB-001', 9, a2.hash)
  const a4 = analise(4, 'RO-000003', 'EB-002', null, a3.hash)
  s.analises = [a1, a2, a3, a4]
  return { ...s, retiradas: [] }
}

const CAIXAS: CaixaCadastrada[] = [
  { codigo: 'EB-001', rotulo: 'Bandeira 1', local: 'Cofre A', capacidade: 2, ativa: true, criadoEm: 1 },
  { codigo: 'DH-001', rotulo: '', local: '', capacidade: null, ativa: true, criadoEm: 2 },
]

describe('códigos de caixa', () => {
  it('a comparação ignora caixa, espaço, hífen e acento', () => {
    expect(chaveDeCaixa(' eb 001 ')).toBe('EB001')
    expect(chaveDeCaixa('Éb-001')).toBe('EB001')
  })

  it('a bancada web grava o código cadastrado quando o digitado bate com ele', () => {
    expect(codigoDeCaixaParaGravar('eb 001', CAIXAS)).toBe('EB-001')
    expect(codigoDeCaixaParaGravar('  XX-9 ', CAIXAS)).toBe('XX-9')
    expect(codigoDeCaixaParaGravar('   ', CAIXAS)).toBeNull()
  })

  it('validação do cadastro de caixa', () => {
    expect(validarCaixa({ codigo: 'EB-001', rotulo: 'x', local: '', capacidade: '40', ativa: true })).toEqual({
      ok: true,
      caixa: { codigo: 'EB-001', rotulo: 'x', local: '', capacidade: 40, ativa: true },
    })
    expect(validarCaixa({ codigo: 'EB/001', rotulo: '', local: '', capacidade: null, ativa: true }).ok).toBe(false)
    expect(validarCaixa({ codigo: 'EB-001', rotulo: '', local: '', capacidade: '2,5', ativa: true }).ok).toBe(false)
    expect(validarCaixa({ codigo: 'EB-001', rotulo: '', local: '', capacidade: '', ativa: false })).toMatchObject({ ok: true, caixa: { capacidade: null, ativa: false } })
  })
})

describe('ocupação do cofre', () => {
  it('só moeda aprovada, que ainda existe e não saiu do cofre, ocupa posição', () => {
    const s = cofre()
    s.retiradas = [retirada('RO-000002', 'postada')]
    const ocupantes = ocupantesDoCofre(s)
    expect(ocupantes.map((o) => [o.codigoMoeda, o.caixa, o.posicao])).toEqual([
      ['RO-000001', 'EB-001', 7],
      ['RO-000003', 'EB-002', null],
    ])
  })

  it('retirada ainda não postada mantém a moeda na posição', () => {
    const s = cofre()
    s.retiradas = [retirada('RO-000002', 'separacao')]
    expect(ocupantesDoCofre(s).some((o) => o.codigoMoeda === 'RO-000002')).toBe(true)
  })

  it('recusa posição já ocupada, com a moeda que está lá', () => {
    const ocupantes = ocupantesDoCofre(cofre())
    expect(
      posicoesJaOcupadas(
        [
          { veredito: 'aprovada', caixa: 'EB 001', posicao: 8 },
          { veredito: 'aprovada', caixa: 'EB-001', posicao: 10 },
          { veredito: 'recusada', caixa: 'EB-001', posicao: 7 },
        ],
        ocupantes,
      ),
    ).toEqual(['Moeda 1: a posição 8 da caixa EB 001 já está ocupada pela moeda RO-000002.'])
  })

  it('o quadro mostra caixa cadastrada vazia, caixa cheia e caixa que só existe no texto da análise', () => {
    const quadro = ocupacaoDasCaixas(CAIXAS, ocupantesDoCofre(cofre()))
    expect(quadro.map((q) => [q.codigo, q.cadastrada, q.moedas.length, q.cheia, q.semPosicao])).toEqual([
      ['DH-001', true, 0, false, 0],
      ['EB-001', true, 2, true, 0],
      ['EB-002', false, 1, false, 1],
    ])
  })
})

describe('caixa corrente e próximas posições na bancada (AG5)', () => {
  it('caixa corrente: cofre vazio escolhe a primeira cadastrada e ativa', () => {
    const caixas: OcupacaoDaCaixa[] = [
      { codigo: 'EB-001', rotulo: '', local: '', capacidade: 50, ativa: true, cadastrada: true, moedas: [], semPosicao: 0, cheia: false },
      { codigo: 'EB-002', rotulo: '', local: '', capacidade: 50, ativa: true, cadastrada: true, moedas: [], semPosicao: 0, cheia: false },
    ]
    expect(caixaCorrente(caixas)).toBe('EB-001')
  })

  it('caixa corrente: seleciona a caixa onde a última moeda foi guardada se ainda houver vaga', () => {
    const caixas: OcupacaoDaCaixa[] = [
      {
        codigo: 'EB-001',
        rotulo: '',
        local: '',
        capacidade: 50,
        ativa: true,
        cadastrada: true,
        moedas: [{ caixa: 'EB-001', posicao: 1, codigoMoeda: 'RO-000001', tipoMoeda: BAN, dono: 'a@x.com', analise: 'RO-ANL-0001' }],
        semPosicao: 0,
        cheia: false,
      },
      { codigo: 'EB-002', rotulo: '', local: '', capacidade: 50, ativa: true, cadastrada: true, moedas: [], semPosicao: 0, cheia: false },
    ]
    expect(caixaCorrente(caixas)).toBe('EB-001')
  })

  it('caixa corrente: cheia, a seleção passa para a próxima cadastrada e ativa (EB-001 lotada -> EB-002)', () => {
    const moedasLotadas = Array.from({ length: 50 }, (_, i) => ({
      caixa: 'EB-001',
      posicao: i + 1,
      codigoMoeda: `RO-0000${String(i + 1).padStart(2, '0')}`,
      tipoMoeda: BAN,
      dono: 'a@x.com',
      analise: `RO-ANL-000${i + 1}`,
    }))
    const caixas: OcupacaoDaCaixa[] = [
      { codigo: 'EB-001', rotulo: '', local: '', capacidade: 50, ativa: true, cadastrada: true, moedas: moedasLotadas, semPosicao: 0, cheia: true },
      { codigo: 'EB-002', rotulo: '', local: '', capacidade: 50, ativa: true, cadastrada: true, moedas: [], semPosicao: 0, cheia: false },
    ]
    expect(caixaCorrente(caixas)).toBe('EB-002')
  })

  it('próximas posições: caixa com 50 moedas devolve 51..70 para 20 moedas', () => {
    const moedas = Array.from({ length: 50 }, (_, i) => ({
      caixa: 'EB-001',
      posicao: i + 1,
      codigoMoeda: `RO-0000${String(i + 1).padStart(2, '0')}`,
      tipoMoeda: BAN,
      dono: 'a@x.com',
      analise: `RO-ANL-000${i + 1}`,
    }))
    const caixa: OcupacaoDaCaixa = {
      codigo: 'EB-001',
      rotulo: '',
      local: '',
      capacidade: 100,
      ativa: true,
      cadastrada: true,
      moedas,
      semPosicao: 0,
      cheia: false,
    }
    const pos = proximasPosicoesDaCaixa(caixa, 20)
    expect(pos).toHaveLength(20)
    expect(pos[0]).toBe(51)
    expect(pos[19]).toBe(70)
    expect(pos).toEqual(Array.from({ length: 20 }, (_, i) => 51 + i))
  })

  it('próximas posições: caixa vazia começa em 1', () => {
    const pos = proximasPosicoesDaCaixa(undefined, 3)
    expect(pos).toEqual([1, 2, 3])
  })

  it('próximas posições: respeita posições ignoradas (ex.: editadas à mão)', () => {
    const caixa: OcupacaoDaCaixa = {
      codigo: 'EB-001',
      rotulo: '',
      local: '',
      capacidade: 50,
      ativa: true,
      cadastrada: true,
      moedas: [{ caixa: 'EB-001', posicao: 1, codigoMoeda: 'RO-000001', tipoMoeda: BAN, dono: 'a@x.com', analise: 'RO-ANL-0001' }],
      semPosicao: 0,
      cheia: false,
    }
    // Suponha que o operador digitou a posição 2 manualmente em outra moeda
    const ignorar = new Set([2])
    const pos = proximasPosicoesDaCaixa(caixa, 3, ignorar)
    expect(pos).toEqual([3, 4, 5])
  })
})

