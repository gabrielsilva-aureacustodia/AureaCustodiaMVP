import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { PARAMETROS_VAZIOS } from '@/domain/dre'
import { seedState } from '@/domain/seed'
import type { AppState, Saque } from '@/domain/types'
import { montarRelatorio, NOMES_RELATORIOS, type Fontes } from './dados'

function criarFontes(state: AppState): Fontes {
  return {
    state,
    ledger: [],
    auditoria: [],
    manuaisTodos: [],
    manuaisVigentes: [],
    parametros: { ...PARAMETROS_VAZIOS },
    parametrosLista: [],
    saldosLedger: {},
    exportacoes: [],
    // A frente C tornou este campo obrigatório em `Fontes`; o relatório de
    // saques não o usa, mas o tipo exige.
    retiradas: [],
    semBanco: true,
  }
}

describe('Relatório de Saques (dados.ts)', () => {
  it('inclui "saques" na lista oficial de nomes de relatórios', () => {
    expect(NOMES_RELATORIOS).toContain('saques')
  })

  it('monta o relatório de saques vazio quando não há saques no estado', () => {
    const state = seedState()
    state.saques = []
    const rel = montarRelatorio('saques', criarFontes(state))

    expect(rel.nome).toBe('saques')
    expect(rel.titulo).toBe('Solicitações de saque')
    expect(rel.linhas).toHaveLength(0)
    expect(rel.colunas).toEqual([
      'Id',
      'Data_Solicitacao',
      'Email_Usuario',
      'Nome_Usuario',
      'Valor_Total',
      'Taxa',
      'Valor_Liquido',
      'Forma_Recebimento',
      'Status',
      'Previsao_Pagamento',
      'Data_Pagamento',
      'Comprovante_Ref',
      'Motivo_Falha',
    ])
  })

  it('monta as linhas do relatório com valores convertidos para reais e dados bancários formatados', () => {
    const state = seedState()
    const email = 'gabrielsilva@testeaurea.com.br'
    state.users[email]!.cadastro = {
      cpf: '529.982.247-25',
      nomeCompleto: 'Gabriel Silva Santos',
      dataNascimento: '1990-08-20',
      telefone: '(11) 98765-4321',
      endereco: {
        logradouro: 'Rua das Moedas',
        numero: '100',
        bairro: 'Centro',
        cidade: 'São Paulo',
        uf: 'SP',
        cep: '01001-000',
      },
      dadosBancarios: {
        chavePix: '52998224725',
        tipoChavePix: 'cpf',
      },
      completadoEm: Date.now(),
    }

    const saqueExemplo: Saque = {
      id: 'SAQ-TEST-001',
      userEmail: email,
      valorTotal: 10_000, // R$ 100,00
      taxa: 500, // R$ 5,00
      valorLiquido: 9_500, // R$ 95,00
      dadosBancarios: state.users[email]!.cadastro!.dadosBancarios,
      status: 'solicitado',
      criadoEm: new Date('2026-09-11T12:00:00.000Z').getTime(),
      previsaoPagamentoEm: new Date('2026-09-16T12:00:00.000Z').getTime(),
      atualizadoEm: new Date('2026-09-11T12:00:00.000Z').getTime(),
    }

    state.saques = [saqueExemplo]

    const rel = montarRelatorio('saques', criarFontes(state))
    expect(rel.linhas).toHaveLength(1)

    const linha = rel.linhas[0]
    expect(linha.Id).toBe('SAQ-TEST-001')
    expect(linha.Email_Usuario).toBe(email)
    expect(linha.Nome_Usuario).toBe('Gabriel Silva')
    expect(linha.Valor_Total).toBe(100.0)
    expect(linha.Taxa).toBe(5.0)
    expect(linha.Valor_Liquido).toBe(95.0)
    expect(linha.Status).toBe('solicitado')
    expect(linha.Forma_Recebimento).toContain('Pix (CPF): 52998224725')
    expect(linha.Previsao_Pagamento).toContain('2026')
    expect(linha.Data_Pagamento).toBe('')
    expect(linha.Comprovante_Ref).toBe('')
    expect(linha.Motivo_Falha).toBe('')
  })
})
