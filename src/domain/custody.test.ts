import { describe, expect, it } from 'vitest'
import {
  calcularVencimentoFatura,
  competenciaAtual,
  DIAS_TOLERANCIA_FATURA,
  gerarFaturaParaUsuario,
  isInadimplente,
  verificarStatusFatura,
} from './custody'
import type { FaturaCustodia, User } from './types'

describe('domain/custody', () => {
  describe('competenciaAtual', () => {
    it('formata ano e mês corretamente', () => {
      const data = new Date(Date.UTC(2026, 8, 11)) // 2026-09-11
      expect(competenciaAtual(data)).toBe('2026-09')
      expect(competenciaAtual(new Date(Date.UTC(2026, 0, 1)))).toBe('2026-01')
      expect(competenciaAtual(new Date(Date.UTC(2026, 11, 31)))).toBe('2026-12')
    })
  })

  describe('calcularVencimentoFatura', () => {
    it('adiciona dias de tolerância ao timestamp de emissão', () => {
      const emissao = 1726000000000
      const vencimento = calcularVencimentoFatura(emissao, 10)
      const esperado = emissao + 10 * 24 * 60 * 60 * 1000
      expect(vencimento).toBe(esperado)
    })
  })

  describe('gerarFaturaParaUsuario', () => {
    it('retorna null se o usuário não possuir moedas ativas', () => {
      const user: User = { name: 'Sem Moeda', balance: 1000, coins: [] }
      const fatura = gerarFaturaParaUsuario(user, 'sem@teste.com', '2026-09', 1000)
      expect(fatura).toBeNull()
    })

    it('ignora moedas transferidas/alienadas no cálculo', () => {
      const user: User = {
        name: 'Cliente',
        balance: 1000,
        coins: [
          {
            id: 'RO-000001',
            tipoMoeda: 'Entrega da Bandeira Olímpica',
            ano: 2024,
            entrada: '10/01/2026',
            statusFisico: 'Armazenado',
            statusDigital: 'Validado',
            valorEstimado: 250000,
            protocolo: 'RO-ENV-0001',
            transferido: true,
            recibo: { codigo: 'REC-000001', hash: 'h1', dataEmissao: '10/01/2026', status: 'Ativo' },
          },
          {
            id: 'RO-000002',
            tipoMoeda: 'Entrega da Bandeira Olímpica',
            ano: 2024,
            entrada: '10/01/2026',
            statusFisico: 'Armazenado',
            statusDigital: 'Validado',
            valorEstimado: 250000,
            protocolo: 'RO-ENV-0001',
            recibo: { codigo: 'REC-000002', hash: 'h2', dataEmissao: '10/01/2026', status: 'Ativo' },
          },
        ],
      }
      const fatura = gerarFaturaParaUsuario(user, 'cli@teste.com', '2026-09', 1000)
      expect(fatura).not.toBeNull()
      expect(fatura?.quantidadeMoedas).toBe(1)
      expect(fatura?.valorCents).toBe(200) // R$ 2,00 para 1 moeda
      expect(fatura?.moedaIds).toEqual(['RO-000002'])
      expect(fatura?.status).toBe('pendente')
      expect(fatura?.dataVencimento).toBe(1000 + DIAS_TOLERANCIA_FATURA * 86400000)
    })

    it('calcula valor correto para múltiplas moedas (R$ 2,00 cada)', () => {
      const user: User = {
        name: 'Investidor',
        balance: 5000,
        coins: [
          {
            id: 'RO-000001',
            tipoMoeda: 'Entrega da Bandeira Olímpica',
            ano: 2024,
            entrada: '10/01/2026',
            statusFisico: 'Armazenado',
            statusDigital: 'Validado',
            valorEstimado: 250000,
            protocolo: 'RO-ENV-0001',
            recibo: { codigo: 'REC-000001', hash: 'h1', dataEmissao: '10/01/2026', status: 'Ativo' },
          },
          {
            id: 'RO-000002',
            tipoMoeda: 'Entrega da Bandeira Olímpica',
            ano: 2024,
            entrada: '10/01/2026',
            statusFisico: 'Armazenado',
            statusDigital: 'Validado',
            valorEstimado: 250000,
            protocolo: 'RO-ENV-0001',
            recibo: { codigo: 'REC-000002', hash: 'h2', dataEmissao: '10/01/2026', status: 'Ativo' },
          },
          {
            id: 'RO-000003',
            tipoMoeda: 'Entrega da Bandeira Olímpica',
            ano: 2024,
            entrada: '10/01/2026',
            statusFisico: 'Armazenado',
            statusDigital: 'Validado',
            valorEstimado: 250000,
            protocolo: 'RO-ENV-0001',
            recibo: { codigo: 'REC-000003', hash: 'h3', dataEmissao: '10/01/2026', status: 'Ativo' },
          },
        ],
      }
      const fatura = gerarFaturaParaUsuario(user, 'inv@teste.com', '2026-09', 5000)
      expect(fatura).not.toBeNull()
      expect(fatura?.quantidadeMoedas).toBe(3)
      expect(fatura?.valorCents).toBe(600) // 3 * R$ 2,00 = R$ 6,00
    })
  })

  describe('verificarStatusFatura', () => {
    const faturaBase: FaturaCustodia = {
      id: 'FAT-1',
      userEmail: 'u@teste.com',
      competencia: '2026-09',
      quantidadeMoedas: 2,
      moedaIds: ['RO-1', 'RO-2'],
      valorCents: 400,
      status: 'pendente',
      dataEmissao: 1000,
      dataVencimento: 2000,
      dataPagamento: null,
      formaPagamento: null,
      paymentIntentId: null,
    }

    it('mantém status paga se já paga', () => {
      expect(verificarStatusFatura({ ...faturaBase, status: 'paga' }, 3000)).toBe('paga')
    })

    it('mantém status pendente antes do vencimento', () => {
      expect(verificarStatusFatura(faturaBase, 1500)).toBe('pendente')
    })

    it('identifica como atrasada se passou do vencimento', () => {
      expect(verificarStatusFatura(faturaBase, 2001)).toBe('atrasada')
    })
  })

  describe('isInadimplente', () => {
    const userNormal: User = { name: 'Normal', balance: 0, coins: [] }
    const faturaVencida: FaturaCustodia = {
      id: 'FAT-2',
      userEmail: 'u@teste.com',
      competencia: '2026-09',
      quantidadeMoedas: 1,
      moedaIds: ['RO-1'],
      valorCents: 200,
      status: 'pendente',
      dataEmissao: 1000,
      dataVencimento: 2000,
      dataPagamento: null,
      formaPagamento: null,
      paymentIntentId: null,
    }

    it('retorna true se flag inadimplente estiver ativa no user', () => {
      expect(isInadimplente({ ...userNormal, inadimplente: true })).toBe(true)
    })

    it('retorna true se houver fatura vencida', () => {
      expect(isInadimplente(userNormal, [faturaVencida], 2050)).toBe(true)
    })

    it('retorna false se fatura estiver dentro do prazo', () => {
      expect(isInadimplente(userNormal, [faturaVencida], 1500)).toBe(false)
    })

    it('retorna false se fatura foi paga mesmo após a data de vencimento', () => {
      expect(isInadimplente(userNormal, [{ ...faturaVencida, status: 'paga' }], 3000)).toBe(false)
    })
  })
})
