import { describe, expect, it } from 'vitest'

import {
  normalizarNome,
  validarChavePix,
  validarNascimento,
  validarNomeCompleto,
  validarNomeDeExibicao,
  validarTelefone,
} from './validacao-cadastro'

const AGORA = new Date('2026-11-22T15:00:00Z')

describe('nome completo (A16, as regras do relatório)', () => {
  it('normaliza espaços', () => {
    expect(normalizarNome('  Ana   Clara ')).toBe('Ana Clara')
  })
  it.each(['Ana Clara Souza', "Maria D'Ávila", 'Ana-Clara Lima', 'José da Silva', 'João de Souza e Silva'])('aceita %s', (n) => {
    expect(validarNomeCompleto(n)).toBeNull()
  })
  it.each(['a', 'a a a', 'Ana', 'Ana B', 'Ana B1ra', 'Ana @Silva', 'Aaa Silva', 'de da', '  ', 'X'.repeat(130) + ' Y'])(
    'recusa %j',
    (n) => {
      expect(validarNomeCompleto(n)).not.toBeNull()
    },
  )
  it('nome de exibição: mínimo 2 caracteres e sem número', () => {
    expect(validarNomeDeExibicao('a')).not.toBeNull()
    expect(validarNomeDeExibicao('Bi')).toBeNull()
    expect(validarNomeDeExibicao('Gabriel 2')).not.toBeNull()
  })
})

describe('nascimento (B03)', () => {
  it('recusa data futura, como 14/04/2027', () => {
    expect(validarNascimento('2027-04-14', AGORA)).toMatch(/futura/)
  })
  it('recusa menor de 18, aceita quem faz 18 hoje', () => {
    expect(validarNascimento('2008-11-23', AGORA)).toMatch(/18/)
    expect(validarNascimento('2008-11-22', AGORA)).toBeNull()
  })
  it('recusa data inexistente e formato errado', () => {
    expect(validarNascimento('2000-02-31', AGORA)).not.toBeNull()
    expect(validarNascimento('14/04/1990', AGORA)).not.toBeNull()
    expect(validarNascimento('1850-01-01', AGORA)).not.toBeNull()
  })
  it('usa o dia de Brasília: às 01:00 UTC de 23/11 ainda é 22/11 aqui', () => {
    expect(validarNascimento('2008-11-23', new Date('2026-11-23T01:00:00Z'))).toMatch(/18/)
  })
})

describe('telefone (B03)', () => {
  it('recusa (11) 11111-1111 e números sem DDD', () => {
    expect(validarTelefone('(11) 11111-1111')).not.toBeNull()
    expect(validarTelefone('91234-5678')).not.toBeNull()
  })
  it('recusa DDD inexistente e celular que não começa em 9', () => {
    expect(validarTelefone('(10) 91234-5678')).not.toBeNull()
    expect(validarTelefone('(11) 81234-5678')).not.toBeNull()
  })
  it('aceita celular, fixo e +55', () => {
    expect(validarTelefone('(11) 91234-5678')).toBeNull()
    expect(validarTelefone('(21) 3234-5678')).toBeNull()
    expect(validarTelefone('+55 11 91234-5678')).toBeNull()
  })
})

describe('chave Pix pelo tipo (B03)', () => {
  it('recusa "123123123123123" como e-mail', () => {
    expect(validarChavePix('email', '123123123123123')).not.toBeNull()
  })
  it('e-mail com @ e domínio', () => {
    expect(validarChavePix('email', 'nome@exemplo.com.br')).toBeNull()
    expect(validarChavePix('email', 'nome@exemplo')).not.toBeNull()
  })
  it('CPF com dígito verificador', () => {
    expect(validarChavePix('cpf', '529.982.247-25')).toBeNull()
    expect(validarChavePix('cpf', '123.456.789-00')).not.toBeNull()
  })
  it('telefone com DDD', () => {
    expect(validarChavePix('telefone', '+5511912345678')).toBeNull()
    expect(validarChavePix('telefone', '11111111111')).not.toBeNull()
  })
  it('aleatória no formato UUID', () => {
    expect(validarChavePix('aleatoria', '123e4567-e89b-12d3-a456-426614174000')).toBeNull()
    expect(validarChavePix('aleatoria', 'abc')).not.toBeNull()
  })
  it('sem tipo', () => {
    expect(validarChavePix(undefined, 'x')).not.toBeNull()
  })
})
