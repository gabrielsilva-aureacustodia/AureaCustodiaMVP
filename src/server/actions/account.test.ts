import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const { getSessionEmail, setSession } = vi.hoisted(() => ({
  getSessionEmail: vi.fn(),
  setSession: vi.fn(),
}))
vi.mock('@/server/session', () => ({ getSessionEmail, setSession }))

import { obterCadastro, salvarCadastro, updatePersonal, verificarTrocaEmail, type CadastroInput } from './account'

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

describe('Server Actions de Dados Pessoais e Troca de E-mail (account.ts)', () => {
  beforeEach(() => {
    getSessionEmail.mockReset()
    setSession.mockReset()
    getSessionEmail.mockResolvedValue('cliente@teste.com')
  })

  it('rejeita chamada sem sessão autenticada', async () => {
    getSessionEmail.mockResolvedValue(null)
    const res = await updatePersonal('Novo Nome')
    expect(res).toEqual({ ok: false, error: 'Sessão expirada.' })
  })

  it('rejeita nome com menos de 2 caracteres', async () => {
    const res = await updatePersonal('A')
    expect(res).toEqual({ ok: false, error: 'Informe um nome válido.' })
  })

  it('rejeita troca de e-mail se a conta atual for protegida da equipe', async () => {
    getSessionEmail.mockResolvedValue('gabrielsilva@testeaurea.com.br')
    const res = await updatePersonal('Gabriel', 'novo@gmail.com')
    expect(res).toEqual({ ok: false, error: 'Este e-mail é protegido e não pode ser alterado.' })

    const check = await verificarTrocaEmail('novo@gmail.com')
    expect(check).toEqual({ ok: false, error: 'Este e-mail é protegido e não pode ser alterado.' })
  })

  it('rejeita troca de e-mail se o novo e-mail for inválido', async () => {
    const res = await updatePersonal('Cliente', 'invalido')
    expect(res).toEqual({ ok: false, error: 'Informe um e-mail válido.' })

    const check = await verificarTrocaEmail('invalido')
    expect(check).toEqual({ ok: false, error: 'Informe um e-mail válido.' })
  })

  it('rejeita troca se o novo e-mail for do domínio institucional reservado', async () => {
    const res = await updatePersonal('Cliente', 'novo@testeaurea.com.br')
    expect(res).toEqual({
      ok: false,
      error: 'Este e-mail é reservado para uso institucional da plataforma.',
    })

    const check = await verificarTrocaEmail('novo@testeaurea.com.br')
    expect(check).toEqual({
      ok: false,
      error: 'Este e-mail é reservado para uso institucional da plataforma.',
    })
  })

  it('verificarTrocaEmail retorna requerSenha: false quando o e-mail não muda', async () => {
    const check = await verificarTrocaEmail('cliente@teste.com')
    expect(check).toEqual({ ok: true, data: { requerSenha: false } })
  })

  it('exige senha mínima de 8 caracteres para conta que usava Google', async () => {
    // Conta criada sem senha (como as de login com Google)
    const res = await updatePersonal('Cliente', 'novo.email@gmail.com')
    expect(res).toEqual({
      ok: false,
      error: 'A nova senha precisa de pelo menos 8 caracteres.',
    })
  })
})

