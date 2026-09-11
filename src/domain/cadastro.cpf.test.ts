/**
 * O dígito verificador do CPF (D-7, 11/09/2026).
 *
 * Esta é a única barreira de CPF que existe hoje. Ela não prova que o número
 * existe na Receita nem que é do titular — prova que é internamente
 * consistente, o que pega erro de digitação. A consulta oficial (Serpro) entra
 * quando houver contrato, e não substitui esta: nenhuma chamada de rede deve
 * sair para um número que já se sabe inválido.
 */

import { describe, expect, it } from 'vitest'

import { cpfValido } from '@/domain/cadastro'

describe('cpfValido', () => {
  it('aceita CPFs válidos, com e sem pontuação', () => {
    // Números de teste de domínio público, com dígitos verificadores corretos.
    for (const cpf of ['529.982.247-25', '52998224725', '111.444.777-35']) {
      expect(cpfValido(cpf)).toBe(true)
    }
  })

  it('recusa quando o dígito verificador não fecha', () => {
    expect(cpfValido('529.982.247-26')).toBe(false)
    expect(cpfValido('111.444.777-30')).toBe(false)
  })

  it('recusa sequências de um dígito só, que passam na aritmética', () => {
    for (let n = 0; n <= 9; n += 1) {
      expect(cpfValido(String(n).repeat(11))).toBe(false)
    }
  })

  it('recusa tamanho errado, vazio e lixo', () => {
    for (const cpf of ['', '   ', '123', '5299822472', '529982247250', 'abcdefghijk']) {
      expect(cpfValido(cpf)).toBe(false)
    }
  })

  it('ignora pontuação de qualquer formato', () => {
    expect(cpfValido('529 982 247 25')).toBe(true)
    expect(cpfValido('529-982-247.25')).toBe(true)
  })
})
