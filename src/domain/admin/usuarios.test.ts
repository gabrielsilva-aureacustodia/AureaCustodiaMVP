import { describe, expect, it } from 'vitest'

import { seedState } from '@/domain/seed'
import type { AppState, Cadastro } from '@/domain/types'

import {
  filtrarUsuarios,
  inicioDoDiaEmBrasilia,
  lerFiltroUsuarios,
  linhasDeUsuarios,
  montarCadastroDoPainel,
  montarDadosBancarios,
  validarAjusteDeSaldo,
  validarNovoUsuario,
  type FiltroUsuarios,
} from './usuarios'

const AGORA = Date.UTC(2026, 8, 14, 15, 0, 0)
const SEM_FILTRO: FiltroUsuarios = { busca: '', cadastro: null, inadimplente: false, comSaldo: false, comMoeda: false, criadoDe: null, criadoAte: null }

const CADASTRO: Cadastro = {
  cpf: '52998224725',
  nomeCompleto: 'Alex da Silva',
  dataNascimento: '1990-05-10',
  telefone: '11999998888',
  endereco: { logradouro: 'Rua A', numero: '10', bairro: 'Centro', cidade: 'São Paulo', uf: 'SP', cep: '01001000' },
  dadosBancarios: { chavePix: 'alex@exemplo.com.br', tipoChavePix: 'email' },
  completadoEm: 1_700_000_000_000,
}

function estado(): AppState {
  const s = seedState()
  s.users['alex@testeaurea.com.br'].cadastro = structuredClone(CADASTRO)
  s.users['pegge@testeaurea.com.br'].inadimplente = true
  s.users['rozane@testeaurea.com.br'].balance = 0
  s.users['rozane@testeaurea.com.br'].coins = []
  return s
}

describe('lista de usuários', () => {
  it('lê o filtro da URL e ignora data malformada', () => {
    expect(lerFiltroUsuarios({ busca: ' ana ', cadastro: 'sem', inadimplente: '1', saldo: '1', moeda: '0', de: '2026-09-01', ate: '01/09/2026' })).toEqual({
      busca: 'ana',
      cadastro: 'sem',
      inadimplente: true,
      comSaldo: true,
      comMoeda: false,
      criadoDe: '2026-09-01',
      criadoAte: null,
    })
  })

  it('busca por nome, e-mail e dígitos do CPF; filtros de cadastro, inadimplência, saldo e moeda', () => {
    const linhas = linhasDeUsuarios(estado(), {}, new Set(), AGORA)
    const emails = (f: Partial<FiltroUsuarios>) => filtrarUsuarios(linhas, { ...SEM_FILTRO, ...f }).map((l) => l.email)

    expect(emails({ busca: 'ALEX' })).toEqual(['alex@testeaurea.com.br'])
    expect(emails({ busca: '529.982' })).toEqual(['alex@testeaurea.com.br'])
    expect(emails({ cadastro: 'com' })).toEqual(['alex@testeaurea.com.br'])
    expect(emails({ cadastro: 'sem' })).not.toContain('alex@testeaurea.com.br')
    expect(emails({ inadimplente: true })).toEqual(['pegge@testeaurea.com.br'])
    expect(emails({ comSaldo: true })).not.toContain('rozane@testeaurea.com.br')
    expect(emails({ comMoeda: true })).not.toContain('rozane@testeaurea.com.br')
  })

  it('período de criação usa o dia de Brasília, e conta sem data conhecida não some', () => {
    const inicio = inicioDoDiaEmBrasilia('2026-09-10')!
    const linhas = linhasDeUsuarios(estado(), { 'alex@testeaurea.com.br': inicio + 1000, 'pegge@testeaurea.com.br': inicio - 1000 }, new Set(), AGORA)
    const emails = filtrarUsuarios(linhas, { ...SEM_FILTRO, criadoDe: '2026-09-10', criadoAte: '2026-09-10' }).map((l) => l.email)
    expect(emails).toContain('alex@testeaurea.com.br')
    expect(emails).not.toContain('pegge@testeaurea.com.br')
    expect(emails).toContain('gabrielsilva@testeaurea.com.br')
  })

  it('o dia começa às 03:00 UTC, e data inexistente é recusada', () => {
    expect(inicioDoDiaEmBrasilia('2026-09-14')).toBe(Date.UTC(2026, 8, 14, 3, 0, 0))
    expect(inicioDoDiaEmBrasilia('2026-02-31')).toBeNull()
  })
})

describe('criar usuário', () => {
  it('normaliza o e-mail, recusa duplicado e nome curto, e deixa a senha para o Supabase validar', () => {
    const existentes = { 'alex@testeaurea.com.br': {} }
    expect(validarNovoUsuario({ email: 'nao-e-email', nome: 'Ana', senha: '', demonstracao: false }, existentes).ok).toBe(false)
    expect(validarNovoUsuario({ email: ' ALEX@testeaurea.com.br ', nome: 'Alex', senha: 'x', demonstracao: false }, existentes)).toEqual({
      ok: false,
      erro: 'Já existe uma conta com este e-mail.',
    })
    expect(validarNovoUsuario({ email: 'ana@exemplo.com.br', nome: 'A', senha: '', demonstracao: false }, existentes).ok).toBe(false)
    expect(validarNovoUsuario({ email: 'Ana@Exemplo.com.br', nome: ' Ana Lima ', senha: '123', demonstracao: true }, existentes)).toEqual({
      ok: true,
      valor: { email: 'ana@exemplo.com.br', nome: 'Ana Lima', senha: '123', demonstracao: true },
    })
  })
})

describe('editar cadastro', () => {
  const entrada = {
    nome: 'Alex',
    cpf: '529.982.247-25',
    nomeCompleto: 'Alex da Silva',
    dataNascimento: '1990-05-10',
    telefone: '(11) 99999-8888',
    endereco: { logradouro: 'Rua B', numero: '20', bairro: 'Centro', cidade: 'São Paulo', uf: 'sp', cep: '01001-000' },
  }

  it('grava o cadastro inteiro, preserva dados bancários e a data de conclusão', () => {
    const r = montarCadastroDoPainel(entrada, CADASTRO, AGORA)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.valor.cadastro).toMatchObject({ cpf: '52998224725', telefone: '11999998888', completadoEm: CADASTRO.completadoEm, dadosBancarios: CADASTRO.dadosBancarios })
    expect(r.valor.cadastro.endereco).toMatchObject({ uf: 'SP', cep: '01001000', logradouro: 'Rua B' })
    expect(r.valor.avisos).toEqual([])
  })

  it('CPF que não confere é gravado com aviso; campo obrigatório vazio é recusado', () => {
    const comCpfRuim = montarCadastroDoPainel({ ...entrada, cpf: '111.111.111-11' }, CADASTRO, AGORA)
    expect(comCpfRuim.ok && comCpfRuim.valor.avisos).toContain('o CPF não confere com os dígitos verificadores')
    expect(montarCadastroDoPainel({ ...entrada, telefone: '' }, CADASTRO, AGORA).ok).toBe(false)
  })

  it('dados bancários: chave Pix pede o tipo; conta vazia limpa', () => {
    expect(montarDadosBancarios({ chavePix: 'x@y.com' }).ok).toBe(false)
    expect(montarDadosBancarios({ chavePix: ' x@y.com ', tipoChavePix: 'email', banco: '', tipoConta: 'corrente' })).toEqual({
      ok: true,
      valor: { chavePix: 'x@y.com', tipoChavePix: 'email' },
    })
  })
})

describe('ajuste de saldo', () => {
  it('credita e debita com motivo; débito não passa do saldo', () => {
    expect(validarAjusteDeSaldo(10_000, 2_500, 'credito', 'Estorno de tarifa')).toEqual({ ok: true, valor: { delta: 2_500, saldoDepois: 12_500, motivo: 'Estorno de tarifa' } })
    expect(validarAjusteDeSaldo(10_000, 10_000, 'debito', 'Correção')).toEqual({ ok: true, valor: { delta: -10_000, saldoDepois: 0, motivo: 'Correção' } })
    expect(validarAjusteDeSaldo(10_000, 10_001, 'debito', 'Correção')).toEqual({ ok: false, erro: 'O débito deixaria o saldo negativo.' })
    expect(validarAjusteDeSaldo(10_000, 100, 'credito', ' ').ok).toBe(false)
    expect(validarAjusteDeSaldo(10_000, 1.5, 'credito', 'Correção').ok).toBe(false)
    expect(validarAjusteDeSaldo(10_000, 100, 'outro', 'Correção').ok).toBe(false)
  })
})
