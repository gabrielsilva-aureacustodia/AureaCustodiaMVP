import { describe, expect, it } from 'vitest'

import {
  estadoDepoisDe,
  lerFiltroDeCasos,
  paginaDeOrigemSegura,
  tituloDoRelato,
  validarAnexo,
  validarTexto,
} from './casos'

describe('estado do caso', () => {
  it('mensagem do cliente devolve qualquer caso a aberto', () => {
    for (const e of ['aberto', 'em_andamento', 'resolvido', 'nao_resolvido'] as const) expect(estadoDepoisDe(e, 'cliente_escreveu')).toBe('aberto')
  })
  it('resposta da equipe tira de aberto, mas não reabre caso encerrado', () => {
    expect(estadoDepoisDe('aberto', 'equipe_respondeu')).toBe('em_andamento')
    expect(estadoDepoisDe('resolvido', 'equipe_respondeu')).toBe('resolvido')
    expect(estadoDepoisDe('nao_resolvido', 'equipe_respondeu')).toBe('nao_resolvido')
  })
  it('só o gesto explícito encerra ou reabre', () => {
    expect(estadoDepoisDe('aberto', 'marcar_resolvido')).toBe('resolvido')
    expect(estadoDepoisDe('em_andamento', 'marcar_nao_resolvido')).toBe('nao_resolvido')
    expect(estadoDepoisDe('resolvido', 'reabrir')).toBe('em_andamento')
  })
})

describe('página de origem', () => {
  it('guarda só o caminho', () => {
    expect(paginaDeOrigemSegura('/vender?email=a@b.com#x')).toBe('/vender')
  })
  it('recusa o que não é caminho do próprio site', () => {
    expect(paginaDeOrigemSegura('https://outro.com/x')).toBeNull()
    expect(paginaDeOrigemSegura('//outro.com')).toBeNull()
    expect(paginaDeOrigemSegura(42)).toBeNull()
  })
})

describe('texto e título', () => {
  it('recusa vazio e excesso', () => {
    expect(validarTexto('   ').ok).toBe(false)
    expect(validarTexto('a'.repeat(4001)).ok).toBe(false)
    expect(validarTexto(' olá ')).toEqual({ ok: true, valor: 'olá' })
  })
  it('título corta em 80 com reticências', () => {
    const t = tituloDoRelato('palavra '.repeat(30))
    expect(t.length).toBeLessThanOrEqual(80)
    expect(t.endsWith('…')).toBe(true)
  })
})

describe('anexo', () => {
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0])
  it('aceita PNG pela assinatura, ignorando o que o navegador alegou', () => {
    const r = validarAnexo('foto.exe', png)
    expect(r.ok && r.valor.tipoMime).toBe('image/png')
  })
  it('recusa o que não é imagem, vazio e grande demais', () => {
    expect(validarAnexo('a.png', new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8])).ok).toBe(false)
    expect(validarAnexo('a.png', new Uint8Array()).ok).toBe(false)
    const grande = new Uint8Array(2 * 1024 * 1024 + 1)
    grande.set(png)
    expect(validarAnexo('a.png', grande).ok).toBe(false)
  })
})

describe('filtro da lista', () => {
  it('ignora valor desconhecido', () => {
    expect(lerFiltroDeCasos({ estado: 'xx', tipo: 'erro', q: ' oi ' })).toEqual({ estado: 'todos', tipo: 'erro', busca: 'oi' })
  })
})
