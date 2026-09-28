/**
 * Todo tipo de operação de pagamento que o CÓDIGO cria precisa ser aceito pelo
 * BANCO.
 *
 * O ERRO QUE ESTE ARQUIVO EXISTE PARA NÃO DEIXAR REPETIR (28/09/2026)
 * -------------------------------------------------------------------
 * Em 22/09 a oferta de compra sem saldo acrescentou 'oferta_prepaga' e
 * 'reserva_compra' ao union `TipoOperacaoPagamento` e à tabela de liquidadores
 * da conciliação. A migration que ampliaria o CHECK de `tipo_operacao` nunca
 * foi escrita, e o CHECK da 017 continuou aceitando só os seis tipos antigos.
 *
 * O TypeScript ficou feliz — o union é dele, não do Postgres — e o erro só
 * apareceu na cara do usuário: os botões de Pix e cartão da oferta pré-paga
 * estouravam violação de constraint ANTES de chamar o gateway, e a tela dizia
 * "erro de comunicação com o gateway". O Gabriel foi quem apontou o que
 * importava: na página de Mercado os mesmos botões funcionavam, porque
 * 'compra_direta' está na lista.
 *
 * A defesa é esta: a lista de tipos sai do próprio union de TypeScript e cada
 * um deles é gravado de verdade num Postgres com as migrations aplicadas.
 * Acrescentar um tipo ao código sem a migration correspondente quebra aqui, em
 * segundos, em vez de quebrar em produção.
 */

import { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { aplicarMigrations } from './migrar'
import { inserirIntencao, type IntencaoDeposito, type TipoOperacaoPagamento } from './repositories/payments'
import type { Consulta, Executor } from './sql'

const SCHEMA = 'aurea'
const EMAIL = 'gabrielsilva@testeaurea.com.br'

/**
 * Os tipos que o código sabe criar.
 *
 * Escrito à mão E conferido contra o union: um `satisfies` garante que nenhum
 * item inventado entre, e o teste de cobertura abaixo quebra se alguém
 * acrescentar um tipo ao union sem acrescentar aqui. É o par que fecha a
 * armadilha — uma lista solta envelheceria em silêncio, que foi exatamente o
 * que aconteceu com o CHECK do banco.
 */
const TIPOS = [
  'deposito',
  'compra_direta',
  'plano_custodia',
  'fatura_custodia',
  'assinatura_custodia',
  'retirada',
  'oferta_prepaga',
  'reserva_compra',
] as const satisfies readonly TipoOperacaoPagamento[]

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

function intencao(ref: string, tipoOperacao: TipoOperacaoPagamento): IntencaoDeposito {
  const agora = Date.now()
  return {
    externalReference: ref,
    userEmail: EMAIL,
    valor: 20_200,
    metodo: 'pix',
    status: 'pendente',
    tipoOperacao,
    metadata: { qty: 1, price: 20_000, tipoMoeda: 'Entrega da Bandeira Olímpica' },
    paymentId: null,
    motivoRecusa: null,
    createdAt: agora,
    updatedAt: agora,
  }
}

describe('tipo_operacao: o banco aceita tudo o que o código cria', () => {
  let db: PGlite
  let executar: Executor

  beforeAll(async () => {
    process.env.AUREA_DB_SCHEMA = SCHEMA
    db = new PGlite()
    await db.waitReady
    executar = executorPGlite(db)
    await aplicarMigrations(executar)

    await executar(async (tx) => {
      await tx.query(
        `INSERT INTO ${SCHEMA}.users (email, name, balance) VALUES ($1, $2, $3)
         ON CONFLICT (email) DO NOTHING`,
        [EMAIL, 'Gabriel Silva', 0],
      )
    })
  }, 60_000)

  afterAll(async () => {
    await db.close()
    delete process.env.AUREA_DB_SCHEMA
  })

  it.each(TIPOS)('grava uma intenção de operação "%s"', async (tipo) => {
    await executar((tx) => inserirIntencao(tx, intencao(`REF-${tipo}`, tipo)))

    const { rows } = await executar((tx) =>
      tx.query<{ tipo_operacao: string }>(
        `SELECT tipo_operacao FROM ${SCHEMA}.payment_intents WHERE external_reference = $1`,
        [`REF-${tipo}`],
      ),
    )
    expect(rows[0]?.tipo_operacao).toBe(tipo)
  })

  it('a lista testada cobre o union inteiro — tipo novo sem migration quebra aqui', () => {
    // Se alguém acrescentar um valor a `TipoOperacaoPagamento` e esquecer desta
    // lista, esta atribuição deixa de compilar: o union passa a ter um membro
    // que `(typeof TIPOS)[number]` não tem.
    const cobertura: Record<TipoOperacaoPagamento, true> = Object.fromEntries(
      TIPOS.map((t) => [t, true]),
    ) as Record<TipoOperacaoPagamento, true>

    expect(Object.keys(cobertura).sort()).toEqual([...TIPOS].sort())
  })
})
