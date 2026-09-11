import { describe, expect, it } from 'vitest'

import {
  descreverDadosBancarios,
  formatarCep,
  formatarCpf,
  formatarTelefone,
  temCadastroCompleto,
  temDadosBancarios,
} from './cadastro'
import type { Cadastro, DadosBancarios, User } from './types'

describe('cadastro domain', () => {
  const mockCadastroValido: Cadastro = {
    cpf: '12345678909',
    nomeCompleto: 'Fulano de Tal',
    dataNascimento: '1985-06-15',
    telefone: '11987654321',
    endereco: {
      logradouro: 'Rua das Moedas',
      numero: '100',
      bairro: 'Centro',
      cidade: 'São Paulo',
      uf: 'SP',
      cep: '01310100',
    },
    dadosBancarios: {
      chavePix: '12345678909',
      tipoChavePix: 'cpf',
    },
    completadoEm: 1700000000000,
    confirmadoEm: 1700000000000,
  }

  describe('temCadastroCompleto', () => {
    it('retorna false para usuário sem cadastro ou indefinido', () => {
      expect(temCadastroCompleto(null)).toBe(false)
      expect(temCadastroCompleto(undefined)).toBe(false)
      expect(temCadastroCompleto({} as User)).toBe(false)
    })

    it('retorna true para cadastro preenchido com Pix', () => {
      const u: { cadastro?: Cadastro } = { cadastro: mockCadastroValido }
      expect(temCadastroCompleto(u)).toBe(true)
    })

    it('retorna true para cadastro preenchido com Conta Bancária', () => {
      const u: { cadastro?: Cadastro } = {
        cadastro: {
          ...mockCadastroValido,
          dadosBancarios: {
            banco: 'Banco do Brasil',
            agencia: '1234-5',
            conta: '98765-4',
            tipoConta: 'corrente',
          },
        },
      }
      expect(temCadastroCompleto(u)).toBe(true)
    })

    it('retorna false se CPF, nome, data ou telefone forem inválidos/ausentes', () => {
      expect(
        temCadastroCompleto({
          cadastro: { ...mockCadastroValido, cpf: '' },
        }),
      ).toBe(false)

      expect(
        temCadastroCompleto({
          cadastro: { ...mockCadastroValido, nomeCompleto: 'AB' },
        }),
      ).toBe(false)

      expect(
        temCadastroCompleto({
          cadastro: { ...mockCadastroValido, dataNascimento: '15/06/1985' },
        }),
      ).toBe(false)

      expect(
        temCadastroCompleto({
          cadastro: { ...mockCadastroValido, telefone: '12345' },
        }),
      ).toBe(false)
    })

    it('retorna false se endereço estiver incompleto', () => {
      expect(
        temCadastroCompleto({
          cadastro: {
            ...mockCadastroValido,
            endereco: { ...mockCadastroValido.endereco, logradouro: '' },
          },
        }),
      ).toBe(false)

      expect(
        temCadastroCompleto({
          cadastro: {
            ...mockCadastroValido,
            endereco: { ...mockCadastroValido.endereco, cep: '123' },
          },
        }),
      ).toBe(false)

      expect(
        temCadastroCompleto({
          cadastro: {
            ...mockCadastroValido,
            endereco: { ...mockCadastroValido.endereco, uf: 'SAO PAULO' },
          },
        }),
      ).toBe(false)
    })

    it('retorna false se dados bancários estiverem ausentes', () => {
      expect(
        temCadastroCompleto({
          cadastro: {
            ...mockCadastroValido,
            dadosBancarios: {},
          },
        }),
      ).toBe(false)
    })
  })

  describe('temDadosBancarios', () => {
    it('reconhece chave Pix válida', () => {
      expect(
        temDadosBancarios({
          cadastro: {
            ...mockCadastroValido,
            dadosBancarios: { chavePix: '123', tipoChavePix: 'cpf' },
          },
        }),
      ).toBe(true)
    })

    it('rejeita chave Pix sem tipo', () => {
      expect(
        temDadosBancarios({
          cadastro: {
            ...mockCadastroValido,
            dadosBancarios: { chavePix: '123' },
          },
        }),
      ).toBe(false)
    })

    it('reconhece conta bancária completa', () => {
      expect(
        temDadosBancarios({
          cadastro: {
            ...mockCadastroValido,
            dadosBancarios: {
              banco: 'Bradesco',
              agencia: '0001',
              conta: '12345-6',
              tipoConta: 'corrente',
            },
          },
        }),
      ).toBe(true)
    })

    it('rejeita conta bancária sem agência ou conta', () => {
      expect(
        temDadosBancarios({
          cadastro: {
            ...mockCadastroValido,
            dadosBancarios: { banco: 'Bradesco', tipoConta: 'corrente' },
          },
        }),
      ).toBe(false)
    })
  })

  describe('formatadores de exibição', () => {
    it('formata CPF corretamente', () => {
      expect(formatarCpf('12345678909')).toBe('123.456.789-09')
      expect(formatarCpf('123')).toBe('123')
      expect(formatarCpf('123456')).toBe('123.456')
    })

    it('formata CEP corretamente', () => {
      expect(formatarCep('01310100')).toBe('01310-100')
      expect(formatarCep('01310')).toBe('01310')
    })

    it('formata telefone com DDD', () => {
      expect(formatarTelefone('11987654321')).toBe('(11) 98765-4321')
      expect(formatarTelefone('1131000000')).toBe('(11) 3100-0000')
    })

    it('descreve dados bancários de forma legível', () => {
      const dbPix: DadosBancarios = { chavePix: 'fulano@teste.com', tipoChavePix: 'email' }
      expect(descreverDadosBancarios(dbPix)).toBe('Pix (E-mail): fulano@teste.com')

      const dbConta: DadosBancarios = {
        banco: 'Itaú',
        agencia: '1234',
        conta: '56789-0',
        tipoConta: 'corrente',
      }
      expect(descreverDadosBancarios(dbConta)).toBe('Itaú · Ag. 1234 · C/C 56789-0')

      expect(descreverDadosBancarios(undefined)).toBe('Nenhum dado cadastrado')
    })
  })
})
