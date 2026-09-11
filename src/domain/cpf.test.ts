import { describe, expect, it } from 'vitest'
import { formatarCpf, limparCpf, validarCpf } from './cpf'

describe('Validação de CPF no domínio (validarCpf)', () => {
  it('aceita CPFs válidos conhecidos com e sem pontuação', () => {
    expect(validarCpf('52998224725')).toBe(true)
    expect(validarCpf('529.982.247-25')).toBe(true)
    expect(validarCpf('12345678909')).toBe(true)
    expect(validarCpf('123.456.789-09')).toBe(true)
    expect(validarCpf('11144477735')).toBe(true)
    expect(validarCpf('111.444.777-35')).toBe(true)
  })

  it('rejeita sequências com todos os dígitos iguais mesmo se passassem no cálculo', () => {
    const iguais = [
      '000.000.000-00',
      '111.111.111-11',
      '222.222.222-22',
      '333.333.333-33',
      '444.444.444-44',
      '555.555.555-55',
      '666.666.666-66',
      '777.777.777-77',
      '888.888.888-88',
      '999.999.999-99',
      '00000000000',
      '11111111111',
    ]
    for (const cpf of iguais) {
      expect(validarCpf(cpf)).toBe(false)
    }
  })

  it('rejeita CPFs com primeiro dígito verificador incorreto', () => {
    // 529982247-25 -> 529982247-15
    expect(validarCpf('52998224715')).toBe(false)
    expect(validarCpf('529.982.247-15')).toBe(false)
  })

  it('rejeita CPFs com segundo dígito verificador incorreto', () => {
    // 529982247-25 -> 529982247-24
    expect(validarCpf('52998224724')).toBe(false)
    expect(validarCpf('529.982.247-24')).toBe(false)
  })

  it('rejeita entradas com tamanho incorreto ou vazias', () => {
    expect(validarCpf('')).toBe(false)
    expect(validarCpf(null)).toBe(false)
    expect(validarCpf(undefined)).toBe(false)
    expect(validarCpf('123')).toBe(false)
    expect(validarCpf('1234567890')).toBe(false) // 10 dígitos
    expect(validarCpf('123456789012')).toBe(false) // 12 dígitos
    expect(validarCpf('abc.def.ghi-jk')).toBe(false)
  })

  it('limparCpf remove caracteres não numéricos', () => {
    expect(limparCpf('529.982.247-25')).toBe('52998224725')
    expect(limparCpf('  123 456-78  ')).toBe('12345678')
    expect(limparCpf('texto')).toBe('')
  })

  it('formatarCpf formata 11 dígitos corretamente', () => {
    expect(formatarCpf('52998224725')).toBe('529.982.247-25')
    expect(formatarCpf('529.982.247-25')).toBe('529.982.247-25')
    expect(formatarCpf('123')).toBe('123') // não altera se inválido
  })
})
