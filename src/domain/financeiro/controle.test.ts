import { describe, expect, it } from 'vitest'

import { PLANO_DE_CONTAS } from '@/domain/dre'

import {
  contasDoTipo,
  descricaoDaOcorrencia,
  diaDeBrasilia,
  meioDiaDeBrasilia,
  ocorrenciasAte,
  ocorrenciasEntre,
  proximaOcorrencia,
  somarMeses,
  validarNomeDeSetor,
  validarRecorrente,
  valorMensalizado,
  vigente,
} from './controle'

const base = { inicio: '2026-01-31', fim: null, periodicidade: 'mensal' as const, ativo: true }

describe('datas no dia de Brasília', () => {
  it('21 h de Brasília ainda é o mesmo dia, mesmo já sendo o seguinte em UTC', () => {
    expect(diaDeBrasilia(Date.UTC(2026, 9, 6, 0, 30))).toBe('2026-10-05')
    expect(diaDeBrasilia(Date.UTC(2026, 9, 6, 3, 0))).toBe('2026-10-06')
  })
  it('o lançamento vai ao meio-dia de Brasília, que é o mesmo dia em UTC', () => {
    expect(new Date(meioDiaDeBrasilia('2026-10-05')).toISOString()).toBe('2026-10-05T15:00:00.000Z')
  })
  it('dia 31 cai no último dia do mês curto e volta ao 31 depois', () => {
    expect(somarMeses('2026-01-31', 1)).toBe('2026-02-28')
    expect(somarMeses('2026-01-31', 2)).toBe('2026-03-31')
    expect(somarMeses('2026-11-15', 3)).toBe('2027-02-15')
  })
})

describe('ocorrências', () => {
  it('mensal: todo mês no mesmo dia, até hoje', () => {
    expect(ocorrenciasAte(base, '2026-04-30')).toEqual(['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30'])
  })
  it('respeita o fim e o início no futuro', () => {
    expect(ocorrenciasAte({ ...base, fim: '2026-03-01' }, '2026-12-31')).toEqual(['2026-01-31', '2026-02-28'])
    expect(ocorrenciasAte(base, '2025-12-31')).toEqual([])
  })
  it('anual e única', () => {
    expect(ocorrenciasAte({ ...base, inicio: '2025-06-10', periodicidade: 'anual' }, '2027-06-10')).toEqual(['2025-06-10', '2026-06-10', '2027-06-10'])
    expect(ocorrenciasAte({ ...base, inicio: '2026-05-02', periodicidade: 'unica' }, '2027-01-01')).toEqual(['2026-05-02'])
  })
  it('próxima ocorrência e janela de vencimentos', () => {
    expect(proximaOcorrencia({ ...base, inicio: '2026-01-05' }, '2026-10-06')).toBe('2026-11-05')
    expect(proximaOcorrencia({ ...base, inicio: '2026-01-05' }, '2026-10-05')).toBe('2026-10-05')
    expect(proximaOcorrencia({ ...base, ativo: false }, '2026-10-05')).toBeNull()
    expect(proximaOcorrencia({ ...base, inicio: '2026-01-05', periodicidade: 'unica' }, '2026-02-01')).toBeNull()
    expect(ocorrenciasEntre({ ...base, inicio: '2026-01-05' }, '2026-10-06', '2026-11-05')).toEqual(['2026-11-05'])
  })
})

describe('peso mensal e vigência', () => {
  it('anual de R$ 1.200 pesa R$ 100 por mês; única não é custo fixo', () => {
    expect(valorMensalizado({ valor: 120_000, periodicidade: 'anual' })).toBe(10_000)
    expect(valorMensalizado({ valor: 9_990, periodicidade: 'mensal' })).toBe(9_990)
    expect(valorMensalizado({ valor: 50_000, periodicidade: 'unica' })).toBe(0)
  })
  it('vigente = ativo e sem fim no passado', () => {
    expect(vigente({ ativo: true, fim: null }, '2026-10-05')).toBe(true)
    expect(vigente({ ativo: true, fim: '2026-10-04' }, '2026-10-05')).toBe(false)
    expect(vigente({ ativo: false, fim: null }, '2026-10-05')).toBe(false)
  })
})

describe('validação', () => {
  const ok = {
    tipo: 'custo',
    descricao: '  Hospedagem   HostGator ',
    fornecedor: 'HostGator',
    contaCodigo: '4.1.04',
    setorId: 3,
    valorCents: 4_990,
    periodicidade: 'mensal',
    inicio: '2026-10-05',
    fim: '',
    observacao: '',
  }
  it('aceita e normaliza', () => {
    const r = validarRecorrente(ok)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.valor).toMatchObject({ descricao: 'Hospedagem HostGator', fim: null, observacao: null, setorId: 3 })
  })
  it('custo só em despesa manual; receita só em receita manual; conta automática nunca', () => {
    expect(validarRecorrente({ ...ok, contaCodigo: '3.1.99' }).ok).toBe(false)
    expect(validarRecorrente({ ...ok, contaCodigo: '4.1.07' }).ok).toBe(false)
    expect(validarRecorrente({ ...ok, tipo: 'receita', contaCodigo: '3.1.99' }).ok).toBe(true)
    expect(validarRecorrente({ ...ok, tipo: 'receita', contaCodigo: '3.1.01' }).ok).toBe(false)
  })
  it('recusa valor, data, término e periodicidade inválidos', () => {
    expect(validarRecorrente({ ...ok, valorCents: 0 }).ok).toBe(false)
    expect(validarRecorrente({ ...ok, valorCents: Number.NaN }).ok).toBe(false)
    expect(validarRecorrente({ ...ok, inicio: '2026-02-31' }).ok).toBe(false)
    expect(validarRecorrente({ ...ok, fim: '2026-01-01' }).ok).toBe(false)
    expect(validarRecorrente({ ...ok, periodicidade: 'diaria' }).ok).toBe(false)
    expect(validarRecorrente({ ...ok, setorId: -1 }).ok).toBe(false)
  })
  it('contas oferecidas por tipo', () => {
    expect(contasDoTipo(PLANO_DE_CONTAS, 'receita').map((c) => c.codigo)).toEqual(['3.1.99'])
    expect(contasDoTipo(PLANO_DE_CONTAS, 'custo').map((c) => c.codigo)).not.toContain('4.1.07')
  })
  it('setor e descrição da ocorrência', () => {
    expect(validarNomeDeSetor(' x ').ok).toBe(false)
    expect(validarNomeDeSetor('Marketing').ok).toBe(true)
    expect(descricaoDaOcorrencia({ descricao: 'Assinatura Claude', fornecedor: 'Anthropic' }, '2026-10-05')).toBe('Assinatura Claude — Anthropic (10/2026)')
  })
})
