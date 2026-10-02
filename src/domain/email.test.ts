import { describe, expect, it } from 'vitest'

import { chaveDeUsuario, normalizarEmail } from './email'

describe('normalizarEmail', () => {
  it('apara espaços e põe em minúscula', () => {
    expect(normalizarEmail('  Teste@X.COM \t')).toBe('teste@x.com')
  })
})

describe('chaveDeUsuario', () => {
  const users = { 'ana@x.com': 1, 'Legada@X.com': 2 }

  it('acha pela chave normalizada, qualquer que seja a grafia pedida', () => {
    expect(chaveDeUsuario(users, ' ANA@x.com ')).toBe('ana@x.com')
  })

  it('acha conta legada gravada com maiúscula, devolvendo a chave real', () => {
    expect(chaveDeUsuario(users, 'legada@x.com')).toBe('Legada@X.com')
  })

  it('devolve null quando a conta não existe e não confunde com propriedades herdadas', () => {
    expect(chaveDeUsuario(users, 'outra@x.com')).toBeNull()
    expect(chaveDeUsuario(users, 'constructor')).toBeNull()
  })
})
