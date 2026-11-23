/**
 * CSP em modo bloqueante (QA do Davi, 22/11/2026): garante que a política cobre o que o site usa no navegador
 * (Meta, Supabase, Mercado Pago) e que o cabeçalho que sai do next.config é o que BLOQUEIA, não o de relatório.
 */

import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { politicaDeSeguranca } from './csp.mjs'

function diretiva(politica: string, nome: string): string[] {
  const linha = politica.split('; ').find((d) => d.startsWith(`${nome} `))
  return linha ? linha.split(' ').slice(1) : []
}

describe('politicaDeSeguranca', () => {
  const prod = politicaDeSeguranca(true)

  it('cobre o Pixel da Meta: script, beacon de imagem e conexão', () => {
    expect(diretiva(prod, 'script-src')).toContain('https://connect.facebook.net')
    expect(diretiva(prod, 'img-src')).toContain('https://www.facebook.com')
    expect(diretiva(prod, 'connect-src')).toContain('https://*.facebook.com')
  })

  it('cobre o Supabase (API, tempo real e vídeos assinados) e o Mercado Pago', () => {
    expect(diretiva(prod, 'connect-src')).toEqual(expect.arrayContaining(['https://*.supabase.co', 'wss://*.supabase.co']))
    expect(diretiva(prod, 'media-src')).toContain('https://*.supabase.co')
    expect(diretiva(prod, 'img-src')).toEqual(expect.arrayContaining(['https://*.mercadopago.com', 'https://*.mlstatic.com']))
    expect(diretiva(prod, 'frame-src')).toContain('https://*.mercadopago.com')
  })

  it('mantém o que o site precisa do próprio domínio: PWA, vídeo gravado na bancada e planilhas', () => {
    expect(diretiva(prod, 'worker-src')).toEqual(expect.arrayContaining(["'self'", 'blob:']))
    expect(diretiva(prod, 'manifest-src')).toContain("'self'")
    expect(diretiva(prod, 'media-src')).toContain('blob:')
    expect(diretiva(prod, 'img-src')).toEqual(expect.arrayContaining(['data:', 'blob:']))
  })

  it('fecha o resto: nada de objeto, frame de terceiro mandando no site, base alheia ou origem curinga', () => {
    expect(diretiva(prod, 'object-src')).toEqual(["'none'"])
    expect(diretiva(prod, 'frame-ancestors')).toEqual(["'none'"])
    expect(diretiva(prod, 'base-uri')).toEqual(["'self'"])
    expect(diretiva(prod, 'default-src')).toEqual(["'self'"])
    for (const d of prod.split('; ')) expect(d.split(' ').slice(1)).not.toContain('*')
  })

  it('não bloqueia o login pelo Google (sem form-action) e não usa eval em produção', () => {
    expect(prod).not.toContain('form-action')
    expect(diretiva(prod, 'script-src')).not.toContain("'unsafe-eval'")
    expect(diretiva(politicaDeSeguranca(false), 'script-src')).toContain("'unsafe-eval'")
  })

  it('o next.config envia o cabeçalho que BLOQUEIA, não só o de relatório', () => {
    const config = readFileSync('next.config.mjs', 'utf8')
    expect(config).toContain("key: 'Content-Security-Policy'")
    expect(config).not.toContain('Report-Only')
    expect(config).toContain('politicaDeSeguranca(')
  })
})
