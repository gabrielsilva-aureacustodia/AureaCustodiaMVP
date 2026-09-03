/**
 * Testes de integração da camada de banco — contra um Postgres DE VERDADE.
 *
 * O `server-only` do CD-04 impedia testar qualquer coisa de src/server/ (RA-04).
 * A saída foi separar o que carrega segredo (client.ts, o único com a barreira)
 * do que orquestra (estado.ts, repositórios, diff), e parametrizar a
 * orquestração pelo `Executor`. Aqui o executor vem do PGlite — o Postgres
 * compilado para WebAssembly, rodando dentro do processo do Vitest, sem
 * Docker, sem instalação, sem rede. É Postgres mesmo: a migration é a mesma
 * SQL que vai para o Supabase, com schema, chaves estrangeiras, CHECKs e RLS.
 *
 * O que o PGlite NÃO prova: a fila de escrita sob concorrência real. Ele é
 * uma conexão só, e enfileira transações concorrentes por construção — os
 * testes "simultâneos" abaixo exercitam o caminho da recusa (a segunda
 * transação enxerga o commit da primeira), mas quem prova o `FOR UPDATE`
 * com duas conexões é o mesmo conjunto rodando contra um banco real:
 *
 *   AUREA_DB_TEST_URL="postgresql://..." npm test
 *
 * Com a variável definida, a suíte roda também contra esse banco, num schema
 * descartável `aurea_test` que ela mesma cria e apaga no fim. Sem a variável,
 * esse bloco é pulado.
 */

import { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { nextEnvioCode } from '@/domain/codes'
import { tradeFee } from '@/domain/fees'
import { matchOrders, transferCoin } from '@/domain/market'
import { mkCoin } from '@/domain/seed'
import type { Envio } from '@/domain/types'

import { diagnosticar } from '../../../scripts/db-check.mjs'

import { normalizarTrade } from './diff'
import { lerEstado, mutarEstado } from './estado'
import { aplicarMigrations } from './migrar'
import { carregarEstado, persistirEstado } from './repositories/state'
import type { Consulta, Executor } from './sql'

const BANDEIRA = 'Entrega da Bandeira Olímpica'

/* ---------- os dois executores ---------- */

/** PGlite: uma transação por chamada; instruções sem parâmetro podem ser várias (migrations). */
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

/** `pg` contra um banco real, com a mesma disciplina de client.ts. */
async function executorPg(url: string): Promise<{ executar: Executor; fechar: () => Promise<void> }> {
  const { Pool } = await import('pg')
  const pool = new Pool({ connectionString: url, ssl: { rejectUnauthorized: false }, max: 4 })
  const executar: Executor = async (fn, opcoes) => {
    const client = await pool.connect()
    try {
      await client.query(opcoes?.somenteLeitura ? 'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY' : 'BEGIN')
      const saida = await fn({
        async query<R extends Record<string, unknown>>(texto: string, valores?: readonly unknown[]) {
          const r = await client.query<R>(texto, valores ? [...valores] : undefined)
          return { rows: r.rows }
        },
      })
      await client.query('COMMIT')
      return saida
    } catch (err) {
      await client.query('ROLLBACK').catch(() => undefined)
      throw err
    } finally {
      client.release()
    }
  }
  return { executar, fechar: () => pool.end() }
}

/* ---------- a suíte, escrita uma vez, rodada por executor ---------- */

interface Alvo {
  nome: string
  schema: string
  preparar: () => Promise<Executor>
  encerrar: () => Promise<void>
}

function suite(alvo: Alvo): void {
  describe(`camada de banco — ${alvo.nome}`, () => {
    let executar: Executor

    beforeAll(async () => {
      process.env.AUREA_DB_SCHEMA = alvo.schema
      executar = await alvo.preparar()
      await aplicarMigrations(executar)
    })

    afterAll(async () => {
      await alvo.encerrar()
      delete process.env.AUREA_DB_SCHEMA
    })

    /** Zera as tabelas entre testes; a próxima leitura semeia de novo. */
    beforeEach(async () => {
      const S = alvo.schema
      await executar(async (tx) => {
        await tx.query(
          // As três tabelas da migration 002 apontam para `users` e `envios`, e
          // o Postgres recusa truncar uma tabela referenciada se quem a
          // referencia ficar de fora da mesma instrução.
          `TRUNCATE ${S}.payment_events, ${S}.payment_intents, ${S}.rastreios,
                    ${S}.trades, ${S}.deposits, ${S}.custody_charges, ${S}.envios,
                    ${S}.sell_offers, ${S}.buy_orders, ${S}.nfts, ${S}.coins, ${S}.users`,
        )
        await tx.query(`UPDATE ${S}.seq SET coin = 0, envio = 0 WHERE id = 1`)
      })
    })

    it('a migration cria tudo no schema certo, nada em public, RLS em todas as tabelas', async () => {
      const S = alvo.schema
      const { rows: emPublic } = await executar((tx) =>
        tx.query<{ table_name: string }>(
          `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`,
        ),
      )
      expect(emPublic).toEqual([])

      const { rows: tabelas } = await executar((tx) =>
        tx.query<{ relname: string; relrowsecurity: boolean }>(
          `SELECT c.relname, c.relrowsecurity
             FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = $1 AND c.relkind = 'r'
            ORDER BY c.relname`,
          [S],
        ),
      )
      expect(tabelas.map((t) => t.relname)).toEqual([
        'buy_orders',
        'coins',
        'custody_charges',
        'deposits',
        'envios',
        'nfts',
        // Migration 002 — pagamentos e rastreio (frente C).
        'payment_events',
        'payment_intents',
        'rastreios',
        'schema_migrations',
        'sell_offers',
        'seq',
        'trades',
        'users',
      ])
      expect(tabelas.every((t) => t.relrowsecurity)).toBe(true)
    })

    it('rodar a migration de novo não aplica nada', async () => {
      expect(await aplicarMigrations(executar)).toEqual([])
    })

    it('banco vazio semeia na primeira leitura, e a segunda leitura é idêntica à primeira', async () => {
      const primeira = await lerEstado(executar)
      expect(Object.keys(primeira.users)).toHaveLength(7)
      expect(primeira.trades).toHaveLength(32)
      expect(primeira.seq.coin).toBeGreaterThan(0)
      expect(primeira.seq.envio).toBe(primeira.seq.coin) // cada moeda do seed consome um protocolo

      const segunda = await lerEstado(executar)
      expect(segunda).toEqual(primeira)
    })

    it('ida e volta: o que sai do banco é o que entrou, com a comissão congelada nas negociações', async () => {
      const { state: semeado } = await mutarEstado(executar, (s) => s)
      const lido = await lerEstado(executar)

      expect(lido).toEqual({ ...semeado, trades: semeado.trades.map(normalizarTrade) })
      // toda negociação que sai do banco carrega a comissão que foi cobrada
      expect(lido.trades.every((t) => t.fee === tradeFee(t.price) * t.qty)).toBe(true)
    })

    it('depósito grava só o diff: uma atualização de usuário e um depósito', async () => {
      await lerEstado(executar)
      const ops = await executar(async (tx) => {
        const antes = await carregarEstado(tx, { travar: true })
        const depois = structuredClone(antes)
        const email = Object.keys(depois.users)[0]
        depois.users[email].balance += 5_000
        depois.deposits.push({ userEmail: email, valor: 5_000, date: Date.now() })
        return persistirEstado(tx, antes, depois)
      })
      expect(ops.map((o) => o.tipo)).toEqual(['user.atualizar', 'deposit.inserir'])

      const lido = await lerEstado(executar)
      expect(lido.deposits).toHaveLength(1)
      expect(lido.deposits[0].valor).toBe(5_000)
    })

    it('anúncio + bid casam pelo motor e a releitura bate com a memória', async () => {
      const semeado = await lerEstado(executar)
      const [vendedor, comprador] = Object.keys(semeado.users)
      const coinId = semeado.users[vendedor].coins.find((c) => c.tipoMoeda === BANDEIRA)!.id

      const { state: depoisDaCompra, result } = await mutarEstado(executar, (s) => {
        const now = Date.now()
        s.sellOffers.push({
          id: 'OF-1',
          coinId,
          seller: vendedor,
          price: 30_000,
          obs: 'teste',
          lotId: 'LOT-1',
          createdAt: now,
          tipoMoeda: BANDEIRA,
        })
        s.buyOrders.push({ id: 'BID-1', buyer: comprador, price: 30_000, qty: 1, createdAt: now, tipoMoeda: BANDEIRA })
        return matchOrders(s)
      })
      expect(result.matched).toBe(true)

      const lido = await lerEstado(executar)
      expect(lido).toEqual({ ...depoisDaCompra, trades: depoisDaCompra.trades.map(normalizarTrade) })
      expect(lido.sellOffers).toEqual([])
      expect(lido.buyOrders).toEqual([])
      expect(lido.users[comprador].coins.some((c) => c.id === coinId)).toBe(true)
      expect(lido.users[vendedor].coins.some((c) => c.id === coinId)).toBe(false)
      expect(lido.users[comprador].balance).toBe(semeado.users[comprador].balance - 30_000)
      expect(lido.users[vendedor].balance).toBe(semeado.users[vendedor].balance + 30_000 - tradeFee(30_000))
      expect(lido.trades).toHaveLength(33)
      expect(lido.trades[32]).toMatchObject({ price: 30_000, qty: 1, buyer: comprador, seller: vendedor, fee: tradeFee(30_000) })
    })

    it('duas compras simultâneas da mesma oferta: uma vence, a outra recebe recusa clara', async () => {
      const semeado = await lerEstado(executar)
      const [vendedor, c1, c2] = Object.keys(semeado.users)
      const coinId = semeado.users[vendedor].coins.find((c) => c.tipoMoeda === BANDEIRA)!.id
      await mutarEstado(executar, (s) => {
        s.sellOffers.push({
          id: 'OF-1',
          coinId,
          seller: vendedor,
          price: 30_000,
          obs: '',
          lotId: 'LOT-1',
          createdAt: Date.now(),
          tipoMoeda: BANDEIRA,
        })
      })

      // O mesmo molde de buyLot: revalida contra o estado carregado DENTRO da trava.
      const comprar = (comprador: string) =>
        mutarEstado(executar, (s) => {
          const offers = s.sellOffers.filter((o) => o.lotId === 'LOT-1')
          if (!offers.length) return 'Este anúncio não está mais disponível.'
          const o = offers[0]
          const buyer = s.users[comprador]
          const seller = s.users[o.seller]
          if (!transferCoin(seller, buyer, o.coinId)) return 'Este anúncio não está mais disponível.'
          buyer.balance -= o.price
          seller.balance += o.price - tradeFee(o.price)
          s.sellOffers = s.sellOffers.filter((x) => x.id !== o.id)
          s.trades.push({ price: o.price, qty: 1, date: Date.now(), buyer: comprador, seller: o.seller, tipoMoeda: BANDEIRA })
          return 'ok'
        }).then((r) => r.result)

      const resultados = await Promise.all([comprar(c1), comprar(c2)])
      expect([...resultados].sort()).toEqual(['Este anúncio não está mais disponível.', 'ok'])

      const lido = await lerEstado(executar)
      const donos = Object.entries(lido.users).filter(([, u]) => u.coins.some((c) => c.id === coinId))
      expect(donos).toHaveLength(1)
      expect([c1, c2]).toContain(donos[0][0])
      expect(lido.trades).toHaveLength(33)
      expect(lido.users[vendedor].balance).toBe(semeado.users[vendedor].balance + 30_000 - tradeFee(30_000))
    })

    it('dois envios simultâneos não recebem o mesmo protocolo', async () => {
      const semeado = await lerEstado(executar)
      const email = Object.keys(semeado.users)[0]
      const criar = () =>
        mutarEstado(executar, (s) => {
          const protocolo = nextEnvioCode(s.seq)
          s.envios.push({
            protocolo,
            userEmail: email,
            tipoMoeda: BANDEIRA,
            ano: 2016,
            quantidade: 1,
            codigoRastreio: null,
            dataPostagem: null,
            dataRecebimento: null,
            etapaAtual: 'Protocolo gerado',
            createdAt: Date.now(),
            codigosAtivosGerados: [],
          })
          return protocolo
        }).then((r) => r.result)

      const [a, b] = await Promise.all([criar(), criar()])
      expect(a).not.toBe(b)

      const lido = await lerEstado(executar)
      expect(lido.envios.map((e) => e.protocolo).sort()).toEqual([a, b].sort())
      expect(lido.seq.envio).toBe(semeado.seq.envio + 2)
    })

    it('wizard completo: postagem, recebimento e recibo emitido criam moedas e a cobrança pendente', async () => {
      const semeado = await lerEstado(executar)
      const email = Object.keys(semeado.users)[3]
      const moedasAntes = semeado.users[email].coins.length

      const { result: protocolo } = await mutarEstado(executar, (s) => {
        const p = nextEnvioCode(s.seq)
        const envio: Envio = {
          protocolo: p,
          userEmail: email,
          tipoMoeda: BANDEIRA,
          ano: 2016,
          quantidade: 2,
          codigoRastreio: null,
          dataPostagem: null,
          dataRecebimento: null,
          etapaAtual: 'Protocolo gerado',
          createdAt: Date.now(),
          codigosAtivosGerados: [],
        }
        s.envios.push(envio)
        return p
      })

      await mutarEstado(executar, (s) => {
        const e = s.envios.find((x) => x.protocolo === protocolo)!
        e.codigoRastreio = 'BR123BR'
        e.dataPostagem = Date.now()
        e.etapaAtual = 'Envio postado'
      })

      await mutarEstado(executar, (s) => {
        const e = s.envios.find((x) => x.protocolo === protocolo)!
        const u = s.users[email]
        e.etapaAtual = 'Recibo emitido'
        e.dataRecebimento = Date.now()
        for (let i = 0; i < e.quantidade; i++) {
          const coin = mkCoin(s.seq, BANDEIRA, 2016, '02/09/2026', 28_500)
          coin.protocolo = e.protocolo
          coin.statusFisico = 'Recebido'
          u.coins.push(coin)
          e.codigosAtivosGerados.push(coin.id)
        }
        s.custodyCharges[email] = {
          totalMoedas: u.coins.length,
          valorCobrado: 1500,
          dataCobranca: '02/09/2026',
          statusPagamento: 'Pendente',
        }
      })

      const lido = await lerEstado(executar)
      const e = lido.envios.find((x) => x.protocolo === protocolo)!
      expect(e.etapaAtual).toBe('Recibo emitido')
      expect(e.codigoRastreio).toBe('BR123BR')
      expect(e.codigosAtivosGerados).toHaveLength(2)
      expect(lido.users[email].coins).toHaveLength(moedasAntes + 2)
      expect(lido.users[email].coins.slice(-2).map((c) => c.id)).toEqual(e.codigosAtivosGerados)
      expect(lido.users[email].coins.slice(-2).every((c) => c.statusFisico === 'Recebido')).toBe(true)
      expect(lido.custodyCharges[email]).toMatchObject({ statusPagamento: 'Pendente', totalMoedas: moedasAntes + 2 })
    })

    it('editar e cancelar ordens: atualização e remoção chegam ao banco', async () => {
      const semeado = await lerEstado(executar)
      const [vendedor, comprador] = Object.keys(semeado.users)
      const coinId = semeado.users[vendedor].coins.find((c) => c.tipoMoeda === BANDEIRA)!.id

      await mutarEstado(executar, (s) => {
        s.sellOffers.push({
          id: 'OF-1',
          coinId,
          seller: vendedor,
          price: 50_000,
          obs: '',
          lotId: 'LOT-1',
          createdAt: Date.now(),
          tipoMoeda: BANDEIRA,
        })
        s.buyOrders.push({ id: 'BID-1', buyer: comprador, price: 10_000, qty: 2, createdAt: Date.now(), tipoMoeda: BANDEIRA })
      })
      await mutarEstado(executar, (s) => {
        s.sellOffers[0].price = 45_000
        s.buyOrders = s.buyOrders.filter((b) => b.id !== 'BID-1')
      })

      const lido = await lerEstado(executar)
      expect(lido.sellOffers).toHaveLength(1)
      expect(lido.sellOffers[0].price).toBe(45_000)
      expect(lido.buyOrders).toEqual([])
    })

    it('senha, acessos e preferências sobrevivem à ida e volta', async () => {
      const semeado = await lerEstado(executar)
      const email = Object.keys(semeado.users)[5]
      await mutarEstado(executar, (s) => {
        const u = s.users[email]
        u.pass = 'senhaNova123'
        u.prevAccess = u.lastAccess
        u.lastAccess = 1_700_000_000_000
        u.settings = { twoFA: true, notifEnvios: true, notifNegociacoes: false, notifNovidades: true }
      })
      const lido = await lerEstado(executar)
      expect(lido.users[email]).toMatchObject({
        pass: 'senhaNova123',
        lastAccess: 1_700_000_000_000,
        settings: { twoFA: true, notifNegociacoes: false },
      })
      expect('prevAccess' in lido.users[email]).toBe(false) // era undefined: fica ausente, não null
    })

    it('apagar histórico é erro, e a transação inteira volta atrás', async () => {
      const semeado = await lerEstado(executar)
      await expect(
        mutarEstado(executar, (s) => {
          s.users[Object.keys(s.users)[0]].balance += 1 // gravação que NÃO pode sobreviver
          s.trades.pop()
        }),
      ).rejects.toThrow(/append-only/)

      const lido = await lerEstado(executar)
      expect(lido).toEqual(semeado)
    })

    it('o diagnóstico do `npm run db:check` aprova um banco migrado', async () => {
      // O comando que decide se o cutover pode acontecer, rodando de verdade.
      // Sem isto, um erro de digitação na SQL dele só apareceria no cutover.
      const { achados, pronto } = await executar((tx) => diagnosticar(tx, alvo.schema))

      expect(achados.filter((a) => a.nivel === 'falha')).toEqual([])
      expect(pronto).toBe(true)
      expect(achados.map((a) => a.texto)).toEqual(
        expect.arrayContaining([
          expect.stringContaining('migrations aplicadas'),
          expect.stringContaining('tabelas do M1 existem'),
          expect.stringContaining('RLS ligada'),
          expect.stringContaining('nenhuma tabela em public'),
        ]),
      )
    })

    it('a lista de moedas é lida na ordem do array, e sellToBid vende as mesmas moedas de antes', async () => {
      const semeado = await lerEstado(executar)
      const [vendedor, comprador] = Object.keys(semeado.users)
      const primeiraLivre = semeado.users[vendedor].coins.find((c) => c.tipoMoeda === BANDEIRA)!.id

      await mutarEstado(executar, (s) => {
        // a "primeira disponível" vista pela mutação tem de ser a mesma do retrato lido
        const c = s.users[vendedor].coins.find((x) => x.tipoMoeda === BANDEIRA)!
        expect(c.id).toBe(primeiraLivre)
        transferCoin(s.users[vendedor], s.users[comprador], c.id)
      })

      const lido = await lerEstado(executar)
      const idsAntes = semeado.users[vendedor].coins.map((c) => c.id).filter((id) => id !== primeiraLivre)
      expect(lido.users[vendedor].coins.map((c) => c.id)).toEqual(idsAntes)
      expect(lido.users[comprador].coins[lido.users[comprador].coins.length - 1].id).toBe(primeiraLivre)
    })
  })
}

/* ---------- o outro lado do diagnóstico: banco sem migration ---------- */

describe('db:check — banco ainda não migrado', () => {
  /**
   * O caso que o comando existe para pegar, e que o cutover não pode viver sem:
   * publicar antes de aplicar a migration derruba o site inteiro, porque
   * `aurea.seq` não existe e toda requisição falha. Aqui o banco está vazio de
   * propósito, e o diagnóstico precisa RECUSAR.
   */
  it('recusa, dizendo qual comando resolve', async () => {
    const vazio = new PGlite()
    await vazio.waitReady
    try {
      const { achados, pronto } = await executorPGlite(vazio)((tx) => diagnosticar(tx, 'aurea'))
      expect(pronto).toBe(false)
      const falhas = achados.filter((a) => a.nivel === 'falha')
      expect(falhas).toHaveLength(1)
      expect(falhas[0].texto).toContain('migration NÃO aplicada')
      expect(falhas[0].texto).toContain('npm run db:migrate')
    } finally {
      await vazio.close()
    }
  })
})

/* ---------- PGlite: sempre ---------- */

let pglite: PGlite | null = null
suite({
  nome: 'PGlite (Postgres embutido)',
  schema: 'aurea',
  preparar: async () => {
    pglite = new PGlite()
    await pglite.waitReady
    return executorPGlite(pglite)
  },
  encerrar: async () => {
    await pglite?.close()
  },
})

/* ---------- banco real: só com AUREA_DB_TEST_URL ---------- */

const urlReal = process.env.AUREA_DB_TEST_URL
if (urlReal) {
  let conexao: Awaited<ReturnType<typeof executorPg>> | null = null
  suite({
    nome: 'Postgres real (AUREA_DB_TEST_URL)',
    schema: 'aurea_test',
    preparar: async () => {
      conexao = await executorPg(urlReal)
      await conexao.executar((tx) => tx.query('DROP SCHEMA IF EXISTS aurea_test CASCADE'))
      return conexao.executar
    },
    encerrar: async () => {
      await conexao?.executar((tx) => tx.query('DROP SCHEMA IF EXISTS aurea_test CASCADE'))
      await conexao?.fechar()
    },
  })
} else {
  describe.skip('camada de banco — Postgres real (defina AUREA_DB_TEST_URL para rodar)', () => {
    it('pulado', () => undefined)
  })
}
