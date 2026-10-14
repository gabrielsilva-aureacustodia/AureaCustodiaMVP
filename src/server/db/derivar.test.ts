import { describe, expect, it } from 'vitest'

import { seedState } from '@/domain/seed'
import type { AppState, Saque } from '@/domain/types'
import { derivarLancamentos } from './derivar'

describe('derivarLancamentos — Saques e Invariante do Ledger', () => {
  it('gera lançamentos de saque e taxa_saque e fecha com zero centavos de ajuste', () => {
    const antes: AppState = seedState()
    const depois: AppState = structuredClone(antes)

    const email = 'gabrielsilva@testeaurea.com.br'
    const saldoAntes = antes.users[email].balance
    const valorSaque = 10_000 // R$ 100,00
    const taxa = 500 // R$ 5,00
    const valorLiquido = 9_500 // R$ 95,00

    // Simula a mutação do saque no estado
    depois.users[email].balance -= valorSaque

    const novoSaque: Saque = {
      id: 'SAQ-TEST-99',
      userEmail: email,
      valorTotal: valorSaque,
      taxa,
      valorLiquido,
      dadosBancarios: { chavePix: '52998224725', tipoChavePix: 'cpf' as const },
      status: 'solicitado',
      criadoEm: Date.now(),
      previsaoPagamentoEm: Date.now() + 3 * 86400000,
      atualizadoEm: Date.now(),
    }
    depois.saques = [novoSaque]

    const derivado = derivarLancamentos({
      antes,
      depois,
      ops: [],
      semeadura: false,
      agora: Date.now(),
      hashAnterior: 'hash_anterior_seed',
    })

    // Deve gerar exatamente 2 lançamentos (saque e taxa_saque)
    expect(derivado.lancamentos).toHaveLength(2)

    const lSaque = derivado.lancamentos.find((l) => l.tipo === 'saque')
    expect(lSaque).toBeDefined()
    expect(lSaque?.valor).toBe(valorLiquido)
    expect(lSaque?.sinal).toBe(-1)
    expect(lSaque?.saldoApos).toBe(saldoAntes - valorLiquido)
    expect(lSaque?.refInterna).toBe('SAQ-TEST-99')

    const lTaxa = derivado.lancamentos.find((l) => l.tipo === 'taxa_saque')
    expect(lTaxa).toBeDefined()
    expect(lTaxa?.valor).toBe(taxa)
    expect(lTaxa?.sinal).toBe(-1)
    expect(lTaxa?.saldoApos).toBe(saldoAntes - valorSaque)
    expect(lTaxa?.refInterna).toBe('SAQ-TEST-99')

    // INVARIANTE: Nenhum lançamento de ajuste espúrio deve ser gerado
    expect(derivado.ajustes).toHaveLength(0)
  })
})

describe('derivarLancamentos — saque recusado', () => {
  const email = 'gabrielsilva@testeaurea.com.br'

  function comSaque(status: Saque['status']): AppState {
    const s: AppState = seedState()
    s.saques = [
      {
        id: 'SAQ-REC-1',
        userEmail: email,
        valorTotal: 10_000,
        taxa: 500,
        valorLiquido: 9_500,
        dadosBancarios: { chavePix: '52998224725', tipoChavePix: 'cpf' as const },
        status,
        criadoEm: 1,
        previsaoPagamentoEm: 2,
        atualizadoEm: 1,
      },
    ]
    return s
  }

  it('recusar devolve o valor total como `estorno` — e não como um `ajuste` sem explicação', () => {
    const antes = comSaque('solicitado')
    const depois = structuredClone(antes)
    depois.saques![0].status = 'falhou'
    depois.saques![0].motivoFalha = 'Chave Pix de outra titularidade'
    depois.users[email].balance += 10_000

    const derivado = derivarLancamentos({ antes, depois, ops: [], semeadura: false, agora: 5, hashAnterior: 'h' })

    expect(derivado.lancamentos).toHaveLength(1)
    const l = derivado.lancamentos[0]
    expect(l.tipo).toBe('estorno')
    expect(l.valor).toBe(10_000)
    expect(l.sinal).toBe(1)
    expect(l.refInterna).toBe('SAQ-REC-1')
    expect(l.descricao).toContain('Chave Pix de outra titularidade')
    expect(derivado.ajustes).toHaveLength(0)
  })

  it('só a TRANSIÇÃO para falhou estorna: um saque já recusado e regravado não gera outro lançamento', () => {
    const antes = comSaque('falhou')
    const depois = structuredClone(antes)
    depois.saques![0].atualizadoEm = 99
    const derivado = derivarLancamentos({ antes, depois, ops: [], semeadura: false, agora: 5, hashAnterior: 'h' })
    expect(derivado.lancamentos).toHaveLength(0)
  })

  it('pagar o saque não mexe no ledger (o dinheiro já tinha saído do saldo no pedido)', () => {
    const antes = comSaque('solicitado')
    const depois = structuredClone(antes)
    depois.saques![0].status = 'pago'
    const derivado = derivarLancamentos({ antes, depois, ops: [], semeadura: false, agora: 5, hashAnterior: 'h' })
    expect(derivado.lancamentos).toHaveLength(0)
    expect(derivado.ajustes).toHaveLength(0)
  })
})
