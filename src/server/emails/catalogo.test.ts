import { describe, expect, it } from 'vitest'

import type { UserSettings } from '@/domain/types'

import { CATALOGO, COBERTOS_POR_OUTRO_MODULO, deveEnviar } from './catalogo'
import type { TipoDeEmail } from './tipos'

const TUDO_DESLIGADO: UserSettings = { twoFA: false, notifEnvios: false, notifNegociacoes: false, notifNovidades: false }
const TUDO_LIGADO: UserSettings = { twoFA: false, notifEnvios: true, notifNegociacoes: true, notifNovidades: true }

const SEMPRE: TipoDeEmail[] = ['compra', 'venda', 'deposito', 'seguranca_senha', 'seguranca_email', 'seguranca_pix']
const OPCIONAIS: TipoDeEmail[] = ['envio_postado', 'envio_recebido', 'moeda_aceita', 'moeda_recusada', 'fatura_paga', 'retirada_postada']

describe('catálogo da D7', () => {
  it('lista exatamente as movimentações do pedido, nem mais nem menos', () => {
    expect(Object.keys(CATALOGO).sort()).toEqual([...SEMPRE, ...OPCIONAIS].sort())
  })

  it('compra, venda, depósito e segurança saem SEMPRE, mesmo com tudo desligado', () => {
    for (const t of SEMPRE) expect(deveEnviar(t, TUDO_DESLIGADO), t).toBe(true)
  })

  it('os avisos opcionais respeitam a chave de preferência do cliente', () => {
    for (const t of OPCIONAIS) {
      expect(deveEnviar(t, TUDO_DESLIGADO), `${t} desligado`).toBe(false)
      expect(deveEnviar(t, TUDO_LIGADO), `${t} ligado`).toBe(true)
    }
  })

  it('cada opcional é governado por UMA chave, e desligar a outra não o afeta', () => {
    const semEnvios: UserSettings = { ...TUDO_LIGADO, notifEnvios: false }
    const semNegociacoes: UserSettings = { ...TUDO_LIGADO, notifNegociacoes: false }
    for (const t of OPCIONAIS) {
      const chave = CATALOGO[t].preferencia
      expect(chave, t).not.toBeNull()
      expect(deveEnviar(t, chave === 'notifEnvios' ? semNegociacoes : semEnvios), `${t} com a OUTRA chave desligada`).toBe(true)
      expect(deveEnviar(t, chave === 'notifEnvios' ? semEnvios : semNegociacoes), `${t} com a PRÓPRIA chave desligada`).toBe(false)
    }
  })

  it('conta sem preferências gravadas vale como o padrão do produto: avisos ligados', () => {
    for (const t of OPCIONAIS) expect(deveEnviar(t, undefined)).toBe(true)
  })

  it('a novidade da plataforma (marketing) não governa nenhum e-mail de movimentação', () => {
    for (const regra of Object.values(CATALOGO)) expect(regra.preferencia).not.toBe('notifNovidades')
  })

  it('os três e-mails de saque ficam declarados como cobertos por saques/avisos.ts e fora do catálogo', () => {
    expect(COBERTOS_POR_OUTRO_MODULO).toEqual({
      saque_pedido: 'src/server/saques/avisos.ts',
      saque_pago: 'src/server/saques/avisos.ts',
      saque_recusado: 'src/server/saques/avisos.ts',
    })
    for (const t of Object.keys(CATALOGO)) expect(t.startsWith('saque')).toBe(false)
  })
})
