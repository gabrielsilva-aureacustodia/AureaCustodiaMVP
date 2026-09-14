import { describe, expect, it } from 'vitest'

import { digitosDaBusca, lerFiltroConversas, slugDeEtiqueta, statusAvanca, validarTexto, validarUrlDeMidia } from './cs'

describe('statusAvanca — webhook fora de ordem não rebaixa mensagem', () => {
  it('só anda para a frente', () => {
    expect(statusAvanca('enviada', 'entregue')).toBe(true)
    expect(statusAvanca('entregue', 'lida')).toBe(true)
    expect(statusAvanca('lida', 'entregue')).toBe(false)
    expect(statusAvanca('entregue', 'enviada')).toBe(false)
    expect(statusAvanca('lida', 'lida')).toBe(false)
  })

  it('falha só vale antes de chegar ao aparelho; registrada nunca muda', () => {
    expect(statusAvanca('enviada', 'falhou')).toBe(true)
    expect(statusAvanca('entregue', 'falhou')).toBe(false)
    expect(statusAvanca('falhou', 'entregue')).toBe(false)
    expect(statusAvanca('registrada', 'entregue')).toBe(false)
  })
})

describe('entradas do atendente', () => {
  it('texto vazio e texto enorme são recusados com a mensagem do campo', () => {
    expect(validarTexto('  olá  ', 'a resposta')).toEqual({ ok: true, valor: 'olá' })
    expect(validarTexto('   ', 'a resposta')).toEqual({ ok: false, erro: 'Escreva a resposta.' })
    expect(validarTexto('x'.repeat(4001), 'a nota').ok).toBe(false)
  })

  it('mídia só por endereço http(s)', () => {
    expect(validarUrlDeMidia('https://aureacustodia.com.br/taxas.pdf').ok).toBe(true)
    expect(validarUrlDeMidia('file:///c:/foto.png').ok).toBe(false)
    expect(validarUrlDeMidia('foto.png').ok).toBe(false)
  })

  it('etiqueta vira slug sem acento', () => {
    expect(slugDeEtiqueta('Retirada — Urgente')).toBe('retirada-urgente')
    expect(slugDeEtiqueta('Cobrança')).toBe('cobranca')
    expect(slugDeEtiqueta('!!')).toBeNull()
  })
})

describe('lerFiltroConversas', () => {
  it('lê só o que é válido da URL', () => {
    expect(lerFiltroConversas({ status: 'pendente', responsavel: ' Ana@Aurea.com ', etiqueta: 'cobranca', busca: ' 11 9999 ', naolidas: '1' })).toEqual({
      status: 'pendente',
      responsavel: 'ana@aurea.com',
      etiqueta: 'cobranca',
      busca: '11 9999',
      soNaoLidas: true,
    })
    expect(lerFiltroConversas({ status: 'qualquer', etiqueta: 'DROP TABLE' })).toMatchObject({ status: null, etiqueta: null, soNaoLidas: false })
  })

  it('busca por telefone só com 4 dígitos ou mais', () => {
    expect(digitosDaBusca('(11) 9999')).toBe('119999')
    expect(digitosDaBusca('Ana 12')).toBeNull()
  })
})
