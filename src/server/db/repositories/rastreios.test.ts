/**
 * A falha momentânea dos Correios não apaga o retrato bom (22/10/2026).
 *
 * O job grava `indisponivel` quando a API não responde. Antes desta regra, uma queda de minutos na
 * hora da rodada diária trocava o "Saiu para entrega" do cliente por "não foi possível consultar" e
 * apagava a linha do tempo inteira. A proteção está na própria SQL do upsert, e é contra um Postgres
 * de verdade (PGlite, a técnica de `../payments.test.ts`) que ela precisa ser provada.
 */

import { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { aplicarMigrations } from '../migrar'
import type { Consulta, Executor } from '../sql'
import { carregarRastreios, salvarRastreio, salvarRastreioDeRetirada, type RastreioGravado } from './rastreios'

const SCHEMA = 'aurea'
const EMAIL = 'gabrielsilva@testeaurea.com.br'
const PROTOCOLO = 'RO-ENV-9101'
const COIN_ID = 'RO-9101'
const RET_ID = 'RET-9101'

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

const BOM: RastreioGravado = {
  codigoRastreio: 'AP123456789BR',
  protocolo: PROTOCOLO,
  statusAtual: 'saiu_para_entrega',
  etapaDescricao: 'Objeto saiu para entrega ao destinatário',
  entregue: false,
  dataUltimaAtualizacao: 1_700_000_000_000,
  eventos: [
    {
      dataHora: 1_700_000_000_000,
      status: 'saiu_para_entrega',
      descricao: 'Objeto saiu para entrega ao destinatário',
      unidadeLocal: 'CDD',
      cidade: 'Belo Horizonte',
      uf: 'MG',
    },
  ],
}

const FALHA = {
  statusAtual: 'indisponivel' as const,
  etapaDescricao: 'Não foi possível consultar os Correios agora',
  dataUltimaAtualizacao: 1_700_000_900_000,
  eventos: [],
  erro: 'timeout',
}

describe('aurea.rastreios — indisponível não sobrescreve retrato bom', () => {
  let db: PGlite
  let executar: Executor

  beforeAll(async () => {
    process.env.AUREA_DB_SCHEMA = SCHEMA
    db = new PGlite()
    await db.waitReady
    executar = executorPGlite(db)
    await aplicarMigrations(executar)
    // As chaves estrangeiras de `rastreios` apontam para `envios` e `retiradas`.
    await executar(async (tx) => {
      const agora = Date.now()
      await tx.query(`INSERT INTO ${SCHEMA}.users (email, name, balance) VALUES ($1, $2, 0) ON CONFLICT (email) DO NOTHING`, [EMAIL, 'Gabriel Silva'])
      await tx.query(
        `INSERT INTO ${SCHEMA}.envios (protocolo, user_email, tipo_moeda, ano, quantidade, etapa_atual, created_at)
         VALUES ($1, $2, 'Entrega da Bandeira Olímpica', 2016, 1, 'Envio postado', $3) ON CONFLICT (protocolo) DO NOTHING`,
        [PROTOCOLO, EMAIL, agora],
      )
      await tx.query(
        `INSERT INTO ${SCHEMA}.coins (id, owner_email, posicao, tipo_moeda, ano, entrada, status_fisico, status_digital, valor_estimado, protocolo)
         VALUES ($1, $2, 1, 'Entrega da Bandeira Olímpica', 2016, '01/01/2026', 'Armazenado', 'Validado', 20000, $3) ON CONFLICT (id) DO NOTHING`,
        [COIN_ID, EMAIL, PROTOCOLO],
      )
      await tx.query(
        `INSERT INTO ${SCHEMA}.retiradas (id, coin_id, recibo_codigo, user_email, modalidade, status, valor_taxa_cents, endereco, solicitado_em, data_limite_d30, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 'comum', 'postada', 5000, '{}'::jsonb, $5, $5, $5, $5) ON CONFLICT (id) DO NOTHING`,
        [RET_ID, COIN_ID, `REC-${COIN_ID}`, EMAIL, agora],
      )
    })
  }, 60_000)

  afterAll(async () => {
    await db.close()
    delete process.env.AUREA_DB_SCHEMA
  })

  beforeEach(async () => {
    await executar((tx) => tx.query(`TRUNCATE ${SCHEMA}.rastreios`))
  })

  it('envio: a falha não regrava o retrato bom, e o próximo retrato bom regrava', async () => {
    expect(await executar((tx) => salvarRastreio(tx, BOM))).toBe(true)
    expect(await executar((tx) => salvarRastreio(tx, { ...BOM, ...FALHA }))).toBe(false)

    let linha = (await executar((tx) => carregarRastreios(tx)))[0]
    expect(linha.statusAtual).toBe('saiu_para_entrega')
    expect(linha.eventos).toHaveLength(1)

    expect(
      await executar((tx) => salvarRastreio(tx, { ...BOM, statusAtual: 'entregue', entregue: true, dataUltimaAtualizacao: 1_700_001_000_000 })),
    ).toBe(true)
    linha = (await executar((tx) => carregarRastreios(tx)))[0]
    expect(linha.statusAtual).toBe('entregue')
  })

  it('sem retrato anterior, a falha grava: a tela precisa dizer por que não há rastreio', async () => {
    expect(await executar((tx) => salvarRastreio(tx, { ...BOM, ...FALHA }))).toBe(true)
    expect((await executar((tx) => carregarRastreios(tx)))[0].statusAtual).toBe('indisponivel')
  })

  it('retirada: a mesma proteção', async () => {
    const daRetirada = { ...BOM, retiradaId: RET_ID }
    expect(await executar((tx) => salvarRastreioDeRetirada(tx, daRetirada))).toBe(true)
    expect(await executar((tx) => salvarRastreioDeRetirada(tx, { ...daRetirada, ...FALHA }))).toBe(false)
    const linha = (await executar((tx) => carregarRastreios(tx)))[0]
    expect(linha.statusAtual).toBe('saiu_para_entrega')
    expect(linha.retiradaId).toBe(RET_ID)
  })
})
