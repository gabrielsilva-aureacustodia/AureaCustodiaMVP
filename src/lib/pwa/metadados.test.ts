/**
 * As metatags do iPhone que o layout raiz declara (src/lib/pwa/metadados.ts). O que sai de fato no <head> do build de
 * produção está conferido em docs/pwa/DIAGNOSTICO_PWA.md; aqui fica a regra que não pode voltar atrás em silêncio.
 */

import { describe, expect, it } from 'vitest'

import { METADADOS_DO_PWA } from './metadados'

describe('metatags do PWA para o iPhone', () => {
  it('declara `apple-mobile-web-app-capable`, que o Next 15.5 não emite sozinho (só emite a versão sem prefixo)', () => {
    expect(METADADOS_DO_PWA.other).toEqual({ 'apple-mobile-web-app-capable': 'yes' })
  })

  it('mantém a versão sem prefixo, que o Next gera a partir de `appleWebApp.capable`', () => {
    expect(METADADOS_DO_PWA.appleWebApp).toMatchObject({ capable: true })
  })

  it('nome do ícone e da aplicação são a marca Real Olímpico', () => {
    expect(METADADOS_DO_PWA.applicationName).toBe('Real Olímpico')
    expect(METADADOS_DO_PWA.appleWebApp).toMatchObject({ title: 'Real Olímpico' })
  })

  it('barra de status preta: o app começa abaixo dela e não exige tratar safe-area (decisão D10)', () => {
    expect(METADADOS_DO_PWA.appleWebApp).toMatchObject({ statusBarStyle: 'black' })
  })
})
