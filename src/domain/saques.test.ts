import { describe, expect, it } from 'vitest'

import {
  aplicarResultadoDoPayout,
  chaveParaMercadoPago,
  descricaoDoPayout,
  filaDeSaques,
  referenciaDoPayout,
  resumirFila,
  valorEmReais,
  vereditoDoPayout,
} from '@/domain/saques'
import type { Saque } from '@/domain/types'

function saque(p: Partial<Saque> = {}): Saque {
  return {
    id: 'SAQ-1',
    userEmail: 'c@x.com',
    valorTotal: 19_600,
    taxa: 500,
    valorLiquido: 19_100,
    dadosBancarios: { chavePix: '10419977600', tipoChavePix: 'cpf' },
    status: 'solicitado',
    criadoEm: 1_000,
    previsaoPagamentoEm: 5_000,
    atualizadoEm: 1_000,
    ...p,
  }
}

describe('chave Pix no formato do Mercado Pago', () => {
  it('CPF digitado só com números sai formatado; 14 dígitos viram CNPJ', () => {
    expect(chaveParaMercadoPago({ chavePix: '10419977600', tipoChavePix: 'cpf' })).toEqual({ tipo: 'CPF', valor: '104.199.776-00' })
    expect(chaveParaMercadoPago({ chavePix: '104.199.776-00', tipoChavePix: 'cpf' })).toEqual({ tipo: 'CPF', valor: '104.199.776-00' })
    expect(chaveParaMercadoPago({ chavePix: '11222333000181', tipoChavePix: 'cpf' })).toEqual({ tipo: 'CNPJ', valor: '11.222.333/0001-81' })
  })

  it('e-mail em minúsculas; telefone em E.164 com +55', () => {
    expect(chaveParaMercadoPago({ chavePix: ' Fulano@Exemplo.COM ', tipoChavePix: 'email' })).toEqual({ tipo: 'EMAIL', valor: 'fulano@exemplo.com' })
    expect(chaveParaMercadoPago({ chavePix: '(11) 98765-4321', tipoChavePix: 'telefone' })).toEqual({ tipo: 'PHONE', valor: '+5511987654321' })
    expect(chaveParaMercadoPago({ chavePix: '+55 11 98765-4321', tipoChavePix: 'telefone' })).toEqual({ tipo: 'PHONE', valor: '+5511987654321' })
  })

  it('chave aleatória é UUID', () => {
    expect(chaveParaMercadoPago({ chavePix: '123E4567-E89B-12D3-A456-426614174000', tipoChavePix: 'aleatoria' })).toEqual({
      tipo: 'PIX_CODE',
      valor: '123e4567-e89b-12d3-a456-426614174000',
    })
  })

  it('chave que não bate com o tipo — ou ausente — vira null, nunca um palpite', () => {
    expect(chaveParaMercadoPago({ chavePix: '123', tipoChavePix: 'cpf' })).toBeNull()
    expect(chaveParaMercadoPago({ chavePix: 'sem-arroba', tipoChavePix: 'email' })).toBeNull()
    expect(chaveParaMercadoPago({ chavePix: '12345', tipoChavePix: 'telefone' })).toBeNull()
    expect(chaveParaMercadoPago({ chavePix: 'abc', tipoChavePix: 'aleatoria' })).toBeNull()
    expect(chaveParaMercadoPago({ chavePix: '', tipoChavePix: 'cpf' })).toBeNull()
    expect(chaveParaMercadoPago({ chavePix: '10419977600' })).toBeNull()
  })
})

describe('identificadores e valores do envio', () => {
  it('a primeira tentativa usa o id do saque; as seguintes mudam a referência', () => {
    expect(referenciaDoPayout('SAQ-1791979630674-XLIP4J', 1)).toBe('SAQ-1791979630674-XLIP4J')
    expect(referenciaDoPayout('SAQ-1791979630674-XLIP4J', 2)).toBe('SAQ-1791979630674-XLIP4J-T2')
  })

  it('a referência respeita a regra do Mercado Pago: até 50 caracteres, só letras, números, - e _', () => {
    const ref = referenciaDoPayout('SAQ 1/2@3'.padEnd(80, 'x'), 3)
    expect(ref.length).toBeLessThanOrEqual(50)
    expect(ref).toMatch(/^[A-Za-z0-9_-]+$/)
  })

  it('centavos viram reais só na saída, sem erro de ponto flutuante', () => {
    expect(valorEmReais(19_100)).toBe(191)
    expect(valorEmReais(1)).toBe(0.01)
    expect(valorEmReais(10_005)).toBe(100.05)
  })

  it('a descrição não leva pontuação que a API rejeita', () => {
    expect(descricaoDoPayout('Saque (Real Olímpico) #1')).toBe('Saque Real Olimpico 1')
  })
})

describe('a fila', () => {
  it('só os em aberto, do mais antigo ao mais novo', () => {
    const fila = filaDeSaques([
      saque({ id: 'c', criadoEm: 30 }),
      saque({ id: 'pago', status: 'pago', criadoEm: 5 }),
      saque({ id: 'a', criadoEm: 10 }),
      saque({ id: 'proc', status: 'em_processamento', criadoEm: 20 }),
      saque({ id: 'rec', status: 'falhou', criadoEm: 1 }),
    ])
    expect(fila.map((s) => s.id)).toEqual(['a', 'proc', 'c'])
  })

  it('o resumo soma o líquido e conta quem passou do D+3', () => {
    const r = resumirFila([saque({ id: 'a', previsaoPagamentoEm: 100 }), saque({ id: 'b', previsaoPagamentoEm: 900, valorLiquido: 1_000 })], 500)
    expect(r.quantidade).toBe(2)
    expect(r.valorLiquido).toBe(20_100)
    expect(r.atrasados).toBe(1)
    expect(r.maisAntigoEm).toBe(1_000)
  })
})

describe('o que o Mercado Pago respondeu', () => {
  it('só `success` é dinheiro na conta; `canceled` e `error` são finais; o resto é "ainda não sei"', () => {
    expect(vereditoDoPayout({ statusTransacao: 'success' })).toBe('pago')
    expect(vereditoDoPayout({ statusTransacao: 'canceled' })).toBe('recusado')
    expect(vereditoDoPayout({ statusTransacao: 'error' })).toBe('recusado')
    for (const st of ['pending', 'in_process', 'created', 'approved', null, 'algo_novo']) {
      expect(vereditoDoPayout({ statusTransacao: st })).toBe('em_andamento')
    }
  })

  it('pago: fecha o saque com o comprovante', () => {
    const s = saque({ status: 'em_processamento', canal: 'mercadopago', payoutId: 'POP1' })
    aplicarResultadoDoPayout(s, { payoutId: 'POP1', transacaoId: 'TOP1', statusTransacao: 'success', statusDetalhe: 'accredited' }, 9_000)
    expect(s.status).toBe('pago')
    expect(s.pagoEm).toBe(9_000)
    expect(s.comprovanteRef).toBe('TOP1')
    expect(s.detalheGateway).toBe('success (accredited)')
  })

  it('recusado: volta para a fila e limpa a aprovação — não estorna', () => {
    const s = saque({ status: 'em_processamento', canal: 'mercadopago', payoutId: 'POP1', aprovadoPor: 'a@b.com', aprovadoEm: 1 })
    aplicarResultadoDoPayout(s, { payoutId: 'POP1', transacaoId: 'TOP1', statusTransacao: 'error', statusDetalhe: 'invalid_key' }, 9_000)
    expect(s.status).toBe('solicitado')
    expect(s.canal).toBeNull()
    expect(s.aprovadoPor).toBeNull()
  })

  it('saque já pago ou recusado nunca é reaberto por um aviso repetido', () => {
    for (const status of ['pago', 'falhou'] as const) {
      const s = saque({ status })
      aplicarResultadoDoPayout(s, { payoutId: 'P', transacaoId: 'T', statusTransacao: 'error', statusDetalhe: null }, 9_000)
      expect(s.status).toBe(status)
    }
  })
})
