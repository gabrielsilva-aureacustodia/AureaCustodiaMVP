import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const { getSessionEmail } = vi.hoisted(() => ({ getSessionEmail: vi.fn() }))
vi.mock('@/server/session', () => ({ getSessionEmail }))

import { obterCadastro, salvarCadastro, type CadastroInput } from './account'

describe('Server Actions de Cadastro (account.ts)', () => {
  beforeEach(() => {
    getSessionEmail.mockReset()
    getSessionEmail.mockResolvedValue('gabrielsilva@testeaurea.com.br')
  })

  const inputValido: CadastroInput = {
    cpf: '529.982.247-25',
    nomeCompleto: 'Gabriel Silva Santos',
    dataNascimento: '1990-08-20',
    telefone: '(11) 98765-4321',
    endereco: {
      logradouro: 'Rua das Moedas',
      numero: '100',
      complemento: 'Sala 4',
      bairro: 'Centro',
      cidade: 'São Paulo',
      uf: 'SP',
      cep: '01001-000',
    },
    dadosBancarios: {
      chavePix: '52998224725',
      tipoChavePix: 'cpf',
    },
  }

  it('rejeita chamada sem sessão autenticada', async () => {
    getSessionEmail.mockResolvedValue(null)
    const res = await salvarCadastro(inputValido)
    expect(res).toEqual({ ok: false, error: 'Sessão expirada.' })
  })

  it('rejeita CPF inválido', async () => {
    const res = await salvarCadastro({ ...inputValido, cpf: '123.456.789-00' })
    expect(res).toEqual({ ok: false, error: 'CPF inválido.' })
  })

  it('rejeita nome completo com menos de 3 caracteres', async () => {
    const res = await salvarCadastro({ ...inputValido, nomeCompleto: 'Ga' })
    expect(res).toEqual({ ok: false, error: 'Informe seu nome completo.' })
  })

  it('rejeita data de nascimento fora do padrão AAAA-MM-DD', async () => {
    const res = await salvarCadastro({ ...inputValido, dataNascimento: '20/08/1990' })
    expect(res).toEqual({
      ok: false,
      error: 'Data de nascimento inválida (use o formato AAAA-MM-DD).',
    })
  })

  it('rejeita telefone sem DDD ou com tamanho inválido', async () => {
    const res = await salvarCadastro({ ...inputValido, telefone: '98765432' })
    expect(res).toEqual({
      ok: false,
      error: 'Informe um telefone válido com DDD (10 ou 11 dígitos).',
    })
  })

  it('rejeita endereço com campo obrigatório em branco', async () => {
    const res = await salvarCadastro({
      ...inputValido,
      endereco: { ...inputValido.endereco, logradouro: '' },
    })
    expect(res).toEqual({
      ok: false,
      error: 'Endereço incompleto. Preencha todos os campos obrigatórios.',
    })
  })

  it('rejeita CEP que não contenha 8 dígitos', async () => {
    const res = await salvarCadastro({
      ...inputValido,
      endereco: { ...inputValido.endereco, cep: '12345' },
    })
    expect(res).toEqual({
      ok: false,
      error: 'CEP inválido (deve conter 8 dígitos).',
    })
  })

  it('rejeita se não tiver nem Pix nem conta bancária', async () => {
    const res = await salvarCadastro({
      ...inputValido,
      dadosBancarios: {},
    })
    expect(res).toEqual({
      ok: false,
      error: 'Informe uma chave Pix válida ou os dados bancários completos para recebimento.',
    })
  })

  it('salva com sucesso quando fornecido Pix válido e permite consultar via obterCadastro', async () => {
    const res = await salvarCadastro(inputValido)
    expect(res.ok).toBe(true)
    expect(res.message).toBe('Cadastro concluído com sucesso.')

    const consulta = await obterCadastro()
    expect(consulta.ok).toBe(true)
    expect(consulta.data).toBeDefined()
    expect(consulta.data?.cpf).toBe('52998224725') // limpo
    expect(consulta.data?.nomeCompleto).toBe('Gabriel Silva Santos')
    expect(consulta.data?.endereco.cep).toBe('01001000') // limpo
    expect(consulta.data?.dadosBancarios.chavePix).toBe('52998224725')
  })

  it('salva com sucesso quando fornecida conta bancária tradicional em vez de Pix', async () => {
    const comBanco: CadastroInput = {
      ...inputValido,
      dadosBancarios: {
        banco: '341',
        agencia: '0123',
        conta: '45678-9',
        tipoConta: 'corrente',
      },
    }
    const res = await salvarCadastro(comBanco)
    expect(res.ok).toBe(true)

    const consulta = await obterCadastro()
    expect(consulta.ok).toBe(true)
    expect(consulta.data?.dadosBancarios.banco).toBe('341')
    expect(consulta.data?.dadosBancarios.conta).toBe('45678-9')
  })
})
