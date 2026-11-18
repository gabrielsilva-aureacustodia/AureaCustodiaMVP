/**
 * "A sessão nasceu de um link do e-mail, agora há pouco?" — RA-50, frente A, 17/11/2026.
 *
 * É o que separa a sessão do link de redefinição (que pode trocar a senha sem a atual) de uma
 * sessão comum, inclusive roubada. O teste fixa: qual método vale, por quanto tempo, e que na
 * dúvida a resposta é "não" — errar para o lado do bloqueio só custa um link novo.
 */

import { describe, expect, it } from 'vitest'

import { JANELA_DO_LINK_DE_RECUPERACAO_MS } from './reautenticacao-config'
import { metodosDeAcessoDoToken, sessaoVeioDeLinkDeEmailRecente } from './sessao-de-recuperacao'

const AGORA = 1_763_400_000_000 // ms
const emSegundos = (ms: number): number => Math.floor(ms / 1000)

function emBase64Url(o: unknown): string {
  return Buffer.from(JSON.stringify(o)).toString('base64url')
}

/** Token de mentira só com `amr`; a assinatura não importa (quem valida é o Supabase, antes). */
function tokenCom(amr: unknown): string {
  return `${emBase64Url({ alg: 'HS256', typ: 'JWT' })}.${emBase64Url({ sub: 'u1', amr })}.assinatura`
}

describe('metodosDeAcessoDoToken', () => {
  it('lê os métodos e converte o timestamp de segundos para milissegundos', () => {
    const token = tokenCom([
      { method: 'password', timestamp: 1_763_390_000 },
      { method: 'recovery', timestamp: 1_763_399_900 },
    ])

    expect(metodosDeAcessoDoToken(token)).toEqual([
      { metodo: 'password', usadoEm: 1_763_390_000_000 },
      { metodo: 'recovery', usadoEm: 1_763_399_900_000 },
    ])
  })

  it('ausente, ilegível, sem amr ou com amr malformado: lista vazia, sem lançar', () => {
    expect(metodosDeAcessoDoToken(undefined)).toEqual([])
    expect(metodosDeAcessoDoToken(null)).toEqual([])
    expect(metodosDeAcessoDoToken('')).toEqual([])
    expect(metodosDeAcessoDoToken('isto-nao-e-um-jwt')).toEqual([])
    expect(metodosDeAcessoDoToken('a.b.c')).toEqual([])
    expect(metodosDeAcessoDoToken(`x.${Buffer.from('{}').toString('base64url')}.y`)).toEqual([])
    expect(metodosDeAcessoDoToken(tokenCom('password'))).toEqual([])
    expect(metodosDeAcessoDoToken(tokenCom({ method: 'recovery' }))).toEqual([])
  })

  it('ignora entradas sem método de texto ou sem timestamp numérico, e fica com as boas', () => {
    const token = tokenCom([
      null,
      'recovery',
      { method: 'recovery' },
      { method: 7, timestamp: 1 },
      { method: 'otp', timestamp: '1763399900' },
      { method: 'otp', timestamp: 1_763_399_900 },
    ])

    expect(metodosDeAcessoDoToken(token)).toEqual([{ metodo: 'otp', usadoEm: 1_763_399_900_000 }])
  })
})

describe('sessaoVeioDeLinkDeEmailRecente', () => {
  const haMs = (ms: number): number => emSegundos(AGORA - ms)

  it('link de redefinição aberto há 1 minuto: vale', () => {
    expect(sessaoVeioDeLinkDeEmailRecente(tokenCom([{ method: 'recovery', timestamp: haMs(60_000) }]), AGORA)).toBe(true)
  })

  it('os três nomes de "abri um link do e-mail" valem: recovery, otp e magiclink', () => {
    for (const metodo of ['recovery', 'otp', 'magiclink']) {
      expect(sessaoVeioDeLinkDeEmailRecente(tokenCom([{ method: metodo, timestamp: haMs(60_000) }]), AGORA), metodo).toBe(true)
    }
  })

  it('sessão comum — senha, Google, cadastro, token renovado — NÃO vale, por mais recente que seja', () => {
    for (const metodo of ['password', 'oauth', 'email/signup', 'invite', 'token_refresh', 'totp', 'anonymous']) {
      expect(sessaoVeioDeLinkDeEmailRecente(tokenCom([{ method: metodo, timestamp: haMs(1_000) }]), AGORA), metodo).toBe(false)
    }
  })

  it('o prazo é a janela configurada: dentro vale, passou não vale', () => {
    const dentro = tokenCom([{ method: 'recovery', timestamp: haMs(JANELA_DO_LINK_DE_RECUPERACAO_MS - 5_000) }])
    const fora = tokenCom([{ method: 'recovery', timestamp: haMs(JANELA_DO_LINK_DE_RECUPERACAO_MS + 5_000) }])

    expect(sessaoVeioDeLinkDeEmailRecente(dentro, AGORA)).toBe(true)
    expect(sessaoVeioDeLinkDeEmailRecente(fora, AGORA)).toBe(false)
  })

  it('link antigo + senha nova: o método do link velho não vale, mas um link novo na mesma lista vale', () => {
    const velho = tokenCom([
      { method: 'recovery', timestamp: haMs(24 * 3_600_000) },
      { method: 'password', timestamp: haMs(60_000) },
    ])
    const comLinkNovo = tokenCom([
      { method: 'password', timestamp: haMs(3_600_000) },
      { method: 'recovery', timestamp: haMs(60_000) },
    ])

    expect(sessaoVeioDeLinkDeEmailRecente(velho, AGORA)).toBe(false)
    expect(sessaoVeioDeLinkDeEmailRecente(comLinkNovo, AGORA)).toBe(true)
  })

  it('relógio do Supabase um pouco adiantado é tolerado; muito adiantado (timestamp no futuro) não', () => {
    expect(sessaoVeioDeLinkDeEmailRecente(tokenCom([{ method: 'recovery', timestamp: emSegundos(AGORA + 30_000) }]), AGORA)).toBe(true)
    expect(sessaoVeioDeLinkDeEmailRecente(tokenCom([{ method: 'recovery', timestamp: emSegundos(AGORA + 3_600_000) }]), AGORA)).toBe(false)
  })

  it('na dúvida, bloqueia: token ausente, ilegível ou sem amr', () => {
    expect(sessaoVeioDeLinkDeEmailRecente(undefined, AGORA)).toBe(false)
    expect(sessaoVeioDeLinkDeEmailRecente(null, AGORA)).toBe(false)
    expect(sessaoVeioDeLinkDeEmailRecente('lixo', AGORA)).toBe(false)
    expect(sessaoVeioDeLinkDeEmailRecente(tokenCom(undefined), AGORA)).toBe(false)
  })
})
