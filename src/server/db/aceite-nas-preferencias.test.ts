/**
 * Testes de persistência do aceite legal nas preferências (P-C2-09).
 *
 * Prova que `settings.legalAcceptance` sobrevive à ida e volta no Postgres,
 * com chaves em ordem fixa para não disparar atualizações espúrias no diff
 * nem poluir a trilha de auditoria.
 */

import { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { TODOS_OS_BLOCOS_IDS } from '@/domain/legal'
import { seedState } from '@/domain/seed'
import type { LegalBlockAcceptance, User, UserSettings } from '@/domain/types'
import { normalizarUser, planejarDiff } from './diff'
import { lerEstado, mutarEstado } from './estado'
import { aplicarMigrations } from './migrar'
import type { Consulta, Executor } from './sql'

const SCHEMA = 'aurea'

function executorPGlite(db: PGlite): Executor {
  return (fn) =>
    db.transaction(async (tx) => {
      const consulta: Consulta = {
        async query<R extends Record<string, unknown>>(texto: string, valores?: readonly unknown[]) {
          if (!valores || valores.length === 0) {
            const resultados = await tx.exec(texto)
            const ultimo = resultados[resultados.length - 1]
            return { rows: (ultimo?.rows ?? []) as R[] }
          }
          const r = await tx.query<R>(texto, [...valores])
          return { rows: r.rows }
        },
      }
      return fn(consulta)
    })
}

describe('aceite legal nas preferências (P-C2-09)', () => {
  let pglite: PGlite
  let executar: Executor

  beforeAll(async () => {
    process.env.AUREA_DB_SCHEMA = SCHEMA
    pglite = new PGlite()
    await pglite.waitReady
    executar = executorPGlite(pglite)
    await aplicarMigrations(executar)
  }, 60_000)

  afterAll(async () => {
    await pglite?.close()
    delete process.env.AUREA_DB_SCHEMA
  })

  it('normalizarUser guarda o aceite em ordem fixa de chaves', () => {
    const aceiteCanonica: LegalBlockAcceptance = {
      termsVersion: '1.0-2026-09-10',
      privacyVersion: '1.0-2026-09-10',
      acceptedAt: '2026-09-15T12:00:00.000Z',
      blocks: [...TODOS_OS_BLOCOS_IDS],
    }

    const aceiteEmbaralhada = {
      blocks: [...TODOS_OS_BLOCOS_IDS],
      acceptedAt: '2026-09-15T12:00:00.000Z',
      privacyVersion: '1.0-2026-09-10',
      termsVersion: '1.0-2026-09-10',
    } as unknown as LegalBlockAcceptance

    const u1: User = {
      name: 'User 1',
      balance: 1000,
      coins: [],
      settings: {
        twoFA: false,
        notifEnvios: true,
        notifNegociacoes: true,
        notifNovidades: false,
        legalAcceptance: aceiteCanonica,
      },
    }

    const u2: User = {
      name: 'User 2',
      balance: 1000,
      coins: [],
      settings: {
        twoFA: false,
        notifEnvios: true,
        notifNegociacoes: true,
        notifNovidades: false,
        legalAcceptance: aceiteEmbaralhada,
      },
    }

    const norm1 = normalizarUser(u1)
    const norm2 = normalizarUser(u2)

    expect(JSON.stringify(norm2.settings?.legalAcceptance)).toBe(
      JSON.stringify(norm1.settings?.legalAcceptance),
    )
  })

  it('conta sem aceite não ganha a chave legalAcceptance', () => {
    const u: User = {
      name: 'User Sem Aceite',
      balance: 1000,
      coins: [],
      settings: {
        twoFA: false,
        notifEnvios: true,
        notifNegociacoes: true,
        notifNovidades: false,
      },
    }

    const norm = normalizarUser(u)
    expect(norm.settings).toBeDefined()
    expect('legalAcceptance' in (norm.settings ?? {})).toBe(false)
  })

  it('gravar o aceite vira uma única atualização do usuário', () => {
    const antes = seedState()
    const depois = structuredClone(antes)
    const [email] = Object.keys(depois.users)

    const acceptance: LegalBlockAcceptance = {
      termsVersion: '1.0',
      privacyVersion: '1.0',
      acceptedAt: '2026-09-15T12:00:00.000Z',
      blocks: [...TODOS_OS_BLOCOS_IDS],
    }

    depois.users[email].settings = {
      ...(depois.users[email].settings ?? {
        twoFA: false,
        notifEnvios: true,
        notifNegociacoes: true,
        notifNovidades: false,
      }),
      legalAcceptance: acceptance,
    }

    const ops = planejarDiff(antes, depois)
    expect(ops.map((o) => o.tipo)).toEqual(['user.atualizar'])
    expect(ops[0]).toMatchObject({
      tipo: 'user.atualizar',
      email,
      user: {
        settings: {
          legalAcceptance: acceptance,
        },
      },
    })
  })

  it('o aceite sobrevive à ida e volta no Postgres', async () => {
    await lerEstado(executar)

    const acceptance1: LegalBlockAcceptance = {
      termsVersion: '1.0-2026-09-10',
      privacyVersion: '1.0-2026-09-10',
      acceptedAt: '2026-09-15T10:00:00.000Z',
      blocks: [TODOS_OS_BLOCOS_IDS[0], TODOS_OS_BLOCOS_IDS[1]],
    }

    const acceptance2: LegalBlockAcceptance = {
      termsVersion: '1.0-2026-09-10',
      privacyVersion: '1.0-2026-09-10',
      acceptedAt: '2026-09-15T11:00:00.000Z',
      blocks: [...TODOS_OS_BLOCOS_IDS],
    }

    let emailSemPref = ''
    let emailComPref = ''
    let esperadoSemPref: unknown
    let esperadoComPref: unknown

    await mutarEstado(executar, (s) => {
      const emails = Object.keys(s.users)
      emailSemPref = emails[0]
      emailComPref = emails[1]

      s.users[emailSemPref].settings = {
        legalAcceptance: acceptance1,
      } as unknown as UserSettings

      s.users[emailComPref].settings = {
        twoFA: true,
        notifEnvios: false,
        notifNegociacoes: true,
        notifNovidades: false,
        legalAcceptance: acceptance2,
      }

      esperadoSemPref = structuredClone(s.users[emailSemPref].settings)
      esperadoComPref = structuredClone(s.users[emailComPref].settings)
    })

    const lido = await lerEstado(executar)
    expect(lido.users[emailSemPref].settings).toEqual(esperadoSemPref)
    expect(lido.users[emailComPref].settings).toEqual(esperadoComPref)
  })

  it('gravação sem mudança depois do aceite não gera atualização nem linha de auditoria', async () => {
    const { rows: antes } = await executar((tx) =>
      tx.query<{ count: string }>(`SELECT count(*)::text as count FROM aurea.audit_log`),
    )

    await mutarEstado(executar, () => undefined)

    const { rows: depois } = await executar((tx) =>
      tx.query<{ count: string }>(`SELECT count(*)::text as count FROM aurea.audit_log`),
    )

    expect(depois[0].count).toBe(antes[0].count)
  })
})
