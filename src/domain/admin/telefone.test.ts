import { describe, expect, it } from 'vitest'

import { contaDoTelefone, digitosParaEnvio, formatarTelefoneE164, mesmoTelefone, normalizarTelefone, telefoneDoJid } from './telefone'

describe('contaDoTelefone', () => {
  const contas = [
    { email: 'ana@exemplo.com.br', telefone: '11999998888' },
    { email: 'bia@exemplo.com.br', telefone: '21988887777' },
    { email: 'casal1@exemplo.com.br', telefone: '31977776666' },
    { email: 'casal2@exemplo.com.br', telefone: '(31) 97777-6666' },
  ]

  it('acha a conta pelo cadastro, mesmo com o WhatsApp sem o nono dígito', () => {
    expect(contaDoTelefone(contas, '+551199998888')).toBe('ana@exemplo.com.br')
    expect(contaDoTelefone(contas, '+5521988887777')).toBe('bia@exemplo.com.br')
  })

  it('número de ninguém e número de duas contas não vinculam', () => {
    expect(contaDoTelefone(contas, '+5511911112222')).toBeNull()
    expect(contaDoTelefone(contas, '+5531977776666')).toBeNull()
  })
})

describe('normalizarTelefone', () => {
  it('o celular do cadastro, o do WhatsApp e o do WhatsApp antigo são o mesmo número', () => {
    expect(normalizarTelefone('11999998888')).toBe('+5511999998888')
    expect(normalizarTelefone('(11) 99999-8888')).toBe('+5511999998888')
    expect(normalizarTelefone('+55 11 99999-8888')).toBe('+5511999998888')
    // Sem o nono dígito, como o WhatsApp entrega conta criada antes de 2016.
    expect(normalizarTelefone('+551199998888')).toBe('+5511999998888')
    expect(normalizarTelefone('551199998888')).toBe('+5511999998888')
  })

  it('fixo brasileiro não ganha dígito, e estrangeiro com + fica como veio', () => {
    expect(normalizarTelefone('1133334444')).toBe('+551133334444')
    expect(normalizarTelefone('+351 912 345 678')).toBe('+351912345678')
  })

  it('número sem DDD, texto e vazio não viram telefone', () => {
    expect(normalizarTelefone('99998888')).toBeNull()
    expect(normalizarTelefone('abc')).toBeNull()
    expect(normalizarTelefone('')).toBeNull()
    expect(normalizarTelefone(null)).toBeNull()
    expect(normalizarTelefone('+1234567890123456')).toBeNull()
  })
})

describe('telefoneDoJid', () => {
  it('conversa de uma pessoa vira telefone canônico; grupo e status não', () => {
    expect(telefoneDoJid('5511999998888@s.whatsapp.net')).toBe('+5511999998888')
    expect(telefoneDoJid('551199998888@s.whatsapp.net')).toBe('+5511999998888')
    expect(telefoneDoJid('5511999998888:12@s.whatsapp.net')).toBe('+5511999998888')
    expect(telefoneDoJid('120363041234567890@g.us')).toBeNull()
    expect(telefoneDoJid('status@broadcast')).toBeNull()
    expect(telefoneDoJid('123456789@lid')).toBeNull()
  })
})

describe('formatação e comparação', () => {
  it('formata para leitura e manda só dígitos ao provedor', () => {
    expect(formatarTelefoneE164('+5511999998888')).toBe('+55 (11) 99999-8888')
    expect(formatarTelefoneE164('+551133334444')).toBe('+55 (11) 3333-4444')
    expect(formatarTelefoneE164('+351912345678')).toBe('+351912345678')
    expect(digitosParaEnvio('+5511999998888')).toBe('5511999998888')
    expect(mesmoTelefone('11 99999-8888', '551199998888@s.whatsapp.net'.split('@')[0])).toBe(true)
    expect(mesmoTelefone('11999998888', '11999997777')).toBe(false)
  })
})
