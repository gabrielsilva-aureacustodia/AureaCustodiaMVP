/**
 * Testes da migration 002 — pagamentos e rastreio — contra um Postgres real
 * embutido (PGlite), a mesma técnica de `db.test.ts`.
 *
 * O QUE ESTES TESTES PRECISAM PROVAR
 * ----------------------------------
 * O RA-07 não se paga com um `Map` que esquece tudo a cada cold start: ele se
 * paga com uma chave única no banco. Aqui a prova é direta — a segunda
 * reivindicação do mesmo evento não volta, e a segunda reivindicação da mesma
 * intenção também não. Se um dia alguém trocar o `ON CONFLICT DO NOTHING` por
 * um "consulta e depois insere", estes testes quebram.
 */

import { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { aplicarMigrations } from './migrar'
import {
  anotarPagamentoNaIntencao,
  buscarEvento,
  buscarIntencao,
  concluirEventoNoBanco,
  concluirIntencao,
  devolverIntencaoParaPendente,
  falharEventoNoBanco,
  inserirIntencao,
  recusarIntencao,
  reivindicarEvento,
  reivindicarIntencao,
  type IntencaoDeposito,
} from './repositories/payments'
import { carregarRastreios, salvarRastreio } from './repositories/rastreios'
import type { Consulta, Executor } from './sql'

const SCHEMA = 'aurea'
const GATEWAY = 'mercadopago'
const EMAIL = 'gabrielsilva@testeaurea.com.br'
const PROTOCOLO = 'RO-ENV-9001'

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

function intencao(ref: string, valor = 50_000): IntencaoDeposito {
  const agora = Date.now()
  return {
    externalReference: ref,
    userEmail: EMAIL,
    valor,
    metodo: 'pix',
    status: 'pendente',
    paymentId: null,
    motivoRecusa: null,
    createdAt: agora,
    updatedAt: agora,
  }
}

describe('migration 002 — pagamentos e rastreio', () => {
  let db: PGlite
  let executar: Executor

  beforeAll(async () => {
    process.env.AUREA_DB_SCHEMA = SCHEMA
    db = new PGlite()
    await db.waitReady
    executar = executorPGlite(db)
    await aplicarMigrations(executar)

    // As três tabelas novas têm chave estrangeira para `users` e `envios`; sem
    // as duas linhas abaixo nenhum INSERT passaria, e é assim que deve ser.
    await executar(async (tx) => {
      await tx.query(
        `INSERT INTO ${SCHEMA}.users (email, name, balance) VALUES ($1, $2, $3)
         ON CONFLICT (email) DO NOTHING`,
        [EMAIL, 'Gabriel Silva', 0],
      )
      await tx.query(
        `INSERT INTO ${SCHEMA}.envios
           (protocolo, user_email, tipo_moeda, ano, quantidade, etapa_atual, created_at)
         VALUES ($1, $2, 'Entrega da Bandeira Olímpica', 2016, 1, 'Envio postado', $3)
         ON CONFLICT (protocolo) DO NOTHING`,
        [PROTOCOLO, EMAIL, Date.now()],
      )
    })
  })

  afterAll(async () => {
    await db.close()
    delete process.env.AUREA_DB_SCHEMA
  })

  beforeEach(async () => {
    await executar(async (tx) => {
      await tx.query(`TRUNCATE ${SCHEMA}.payment_events, ${SCHEMA}.payment_intents, ${SCHEMA}.rastreios`)
    })
  })

  it('as três tabelas nascem no schema aurea, com RLS e nada em public', async () => {
    const { rows: emPublic } = await executar((tx) =>
      tx.query<{ table_name: string }>(
        `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`,
      ),
    )
    expect(emPublic).toEqual([])

    const { rows } = await executar((tx) =>
      tx.query<{ relname: string; relrowsecurity: boolean }>(
        `SELECT c.relname, c.relrowsecurity
           FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE n.nspname = $1 AND c.relkind = 'r'
            AND c.relname IN ('payment_events', 'payment_intents', 'rastreios')
          ORDER BY c.relname`,
        [SCHEMA],
      ),
    )
    expect(rows.map((r) => r.relname)).toEqual(['payment_events', 'payment_intents', 'rastreios'])
    expect(rows.every((r) => r.relrowsecurity)).toBe(true)
  })

  it('RA-07: o mesmo evento só é reivindicado UMA vez, por mais que o gateway reenvie', async () => {
    const evento = 'evt-777'
    const primeira = await executar((tx) =>
      reivindicarEvento(tx, GATEWAY, evento, 'payment', '777', Date.now()),
    )
    const segunda = await executar((tx) =>
      reivindicarEvento(tx, GATEWAY, evento, 'payment', '777', Date.now()),
    )
    const terceira = await executar((tx) =>
      reivindicarEvento(tx, GATEWAY, evento, 'payment', '777', Date.now()),
    )

    expect([primeira, segunda, terceira]).toEqual([true, false, false])

    const registro = await executar((tx) => buscarEvento(tx, GATEWAY, evento))
    expect(registro?.status).toBe('em_processamento')
    expect(registro?.paymentId).toBe('777')
  })

  it('reivindicações simultâneas do mesmo evento: uma só vence', async () => {
    const evento = 'evt-simultaneo'
    const tentativas = await Promise.all(
      [1, 2, 3, 4].map(() =>
        executar((tx) => reivindicarEvento(tx, GATEWAY, evento, 'payment', null, Date.now())),
      ),
    )
    expect(tentativas.filter(Boolean)).toHaveLength(1)
  })

  it('concluir grava o resultado; falhar com liberação apaga a linha e permite a retentativa', async () => {
    const evento = 'evt-ciclo'
    await executar((tx) => reivindicarEvento(tx, GATEWAY, evento, 'payment', '1', Date.now()))
    await executar((tx) => concluirEventoNoBanco(tx, GATEWAY, evento, { creditado: true }, Date.now()))

    const concluido = await executar((tx) => buscarEvento(tx, GATEWAY, evento))
    expect(concluido?.status).toBe('processado')
    expect(concluido?.resultado).toEqual({ creditado: true })

    await executar((tx) => falharEventoNoBanco(tx, GATEWAY, evento, true, Date.now()))
    expect(await executar((tx) => buscarEvento(tx, GATEWAY, evento))).toBeNull()

    const podeDeNovo = await executar((tx) =>
      reivindicarEvento(tx, GATEWAY, evento, 'payment', '1', Date.now()),
    )
    expect(podeDeNovo).toBe(true)
  })

  it('a intenção de depósito só é reivindicada uma vez, e guarda a quem creditar', async () => {
    const ref = 'DEP-abc'
    await executar((tx) => inserirIntencao(tx, intencao(ref)))

    const primeira = await executar((tx) => reivindicarIntencao(tx, ref, Date.now()))
    const segunda = await executar((tx) => reivindicarIntencao(tx, ref, Date.now()))

    expect(primeira?.userEmail).toBe(EMAIL)
    expect(primeira?.valor).toBe(50_000)
    expect(segunda).toBeNull()

    await executar((tx) => concluirIntencao(tx, ref, '999', Date.now()))
    const final = await executar((tx) => buscarIntencao(tx, ref))
    expect(final?.status).toBe('creditado')
    expect(final?.paymentId).toBe('999')
  })

  it('reivindicações simultâneas da mesma intenção: uma só recebe a linha', async () => {
    const ref = 'DEP-corrida'
    await executar((tx) => inserirIntencao(tx, intencao(ref)))
    const tentativas = await Promise.all(
      [1, 2, 3].map(() => executar((tx) => reivindicarIntencao(tx, ref, Date.now()))),
    )
    expect(tentativas.filter((t) => t !== null)).toHaveLength(1)
  })

  it('intenção devolvida para pendente pode ser reivindicada de novo', async () => {
    const ref = 'DEP-devolve'
    await executar((tx) => inserirIntencao(tx, intencao(ref)))
    await executar((tx) => reivindicarIntencao(tx, ref, Date.now()))
    await executar((tx) => devolverIntencaoParaPendente(tx, ref, Date.now()))

    const denovo = await executar((tx) => reivindicarIntencao(tx, ref, Date.now()))
    expect(denovo?.externalReference).toBe(ref)
  })

  it('recusa guarda o motivo, e o id do pagamento é anotado sem mudar o status', async () => {
    const ref = 'DEP-recusa'
    await executar((tx) => inserirIntencao(tx, intencao(ref)))
    await executar((tx) => anotarPagamentoNaIntencao(tx, ref, 'pay-1', Date.now()))

    const anotada = await executar((tx) => buscarIntencao(tx, ref))
    expect(anotada?.paymentId).toBe('pay-1')
    expect(anotada?.status).toBe('pendente')

    await executar((tx) => recusarIntencao(tx, ref, 'valor divergente', Date.now()))
    const recusada = await executar((tx) => buscarIntencao(tx, ref))
    expect(recusada?.status).toBe('recusado')
    expect(recusada?.motivoRecusa).toBe('valor divergente')
    // Depois de recusada, ninguém credita.
    expect(await executar((tx) => reivindicarIntencao(tx, ref, Date.now()))).toBeNull()
  })

  it('o rastreio é upsert: rodar o job de novo atualiza em vez de duplicar', async () => {
    const base = {
      codigoRastreio: 'BR123456789BR',
      protocolo: PROTOCOLO,
      statusAtual: 'em_transito' as const,
      etapaDescricao: 'Objeto em trânsito',
      entregue: false,
      dataUltimaAtualizacao: 1_700_000_000_000,
      eventos: [],
    }
    await executar((tx) => salvarRastreio(tx, base))
    await executar((tx) =>
      salvarRastreio(tx, {
        ...base,
        statusAtual: 'entregue',
        etapaDescricao: 'Objeto entregue ao destinatário',
        entregue: true,
        dataUltimaAtualizacao: 1_700_000_900_000,
      }),
    )

    const linhas = await executar((tx) => carregarRastreios(tx))
    expect(linhas).toHaveLength(1)
    expect(linhas[0]).toMatchObject({
      codigoRastreio: 'BR123456789BR',
      protocolo: PROTOCOLO,
      statusAtual: 'entregue',
      entregue: true,
    })
  })
})
