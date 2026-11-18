import { describe, expect, it } from 'vitest'

import { mascararChavePix, mascararEmail } from './mascara'

describe('máscara do e-mail', () => {
  it('mostra a primeira letra e o domínio, e mais nada', () => {
    expect(mascararEmail('maria.silva@gmail.com')).toBe('m***@gmail.com')
    expect(mascararEmail('  a@x.com.br ')).toBe('a***@x.com.br')
  })

  it('sem arroba não há o que mostrar', () => {
    expect(mascararEmail('semarroba')).toBe('***')
    expect(mascararEmail('@dominio.com')).toBe('***')
  })

  it('nunca devolve o endereço inteiro', () => {
    for (const e of ['maria.silva@gmail.com', 'rogeriopena@testeaurea.com.br']) {
      expect(mascararEmail(e)).not.toContain(e.split('@')[0])
    }
  })
})

describe('máscara da chave Pix', () => {
  it('CPF, telefone e chave aleatória mostram só os quatro últimos caracteres', () => {
    expect(mascararChavePix('123.456.789-09')).toBe('terminada em 8909')
    expect(mascararChavePix('+55 (11) 91234-5678')).toBe('terminada em 5678')
    expect(mascararChavePix('3f2504e0-4f89-11d3-9a0c-0305e82c3301')).toBe('terminada em 3301')
  })

  it('chave que é e-mail usa a máscara do e-mail', () => {
    expect(mascararChavePix('maria@exemplo.com')).toBe('m***@exemplo.com')
  })

  it('chave curta demais vira asteriscos: mostrar 4 de 4 seria mostrar tudo', () => {
    expect(mascararChavePix('1234')).toBe('***')
    expect(mascararChavePix('12')).toBe('***')
  })

  it('a chave inteira nunca aparece no resultado', () => {
    for (const chave of ['123.456.789-09', '11912345678', '3f2504e0-4f89-11d3-9a0c-0305e82c3301']) {
      const m = mascararChavePix(chave)
      expect(m).not.toContain(chave)
      expect(m.replace(/\D/g, '').length).toBeLessThanOrEqual(4)
    }
  })
})
