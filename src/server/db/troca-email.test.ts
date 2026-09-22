/**
 * Testes da transação de renomeação de e-mail e cascata de chaves estrangeiras.
 *
 * Exerce `renomearEmailUsuarioNoBanco` contra um Postgres real (PGlite embutido)
 * com moedas, faturas, envios, depósitos, saques e ordens associadas ao usuário.
 */

import { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { ehEmailProtegido } from '@/domain/admin/permissoes'
import type { AppState, User } from '@/domain/types'
import { aplicarMigrations } from './migrar'
import { renomearEmailNoAppState, renomearEmailUsuarioNoBanco } from './repositories/users'
import type { Consulta, Executor } from './sql'

function executorDe(db: PGlite): Executor {
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

describe('Renomeação de e-mail no banco de dados (PGlite)', () => {
  let pg: PGlite
  let executar: Executor

  beforeAll(async () => {
    pg = new PGlite()
    executar = executorDe(pg)
    await aplicarMigrations(executar)
  })

  afterAll(async () => {
    await pg.close()
  })

  it('renomeia e-mail em transação com moedas, faturas e envios sem violar FK', async () => {
    const antigo = 'cliente.original@teste.com'
    const novo = 'cliente.atualizado@teste.com'

    // 1. Popula usuário inicial
    await executar(async (tx) => {
      await tx.query(
        `INSERT INTO aurea.users (email, name, balance, pass)
         VALUES ($1, $2, $3, $4)`,
        [antigo, 'Cliente Original', 100000, null],
      )

      // Moeda
      await tx.query(
        `INSERT INTO aurea.coins (id, owner_email, posicao, tipo_moeda, ano, entrada, status_fisico, status_digital, valor_estimado, protocolo)
         VALUES ($1, $2, 1, 'Entrega da Bandeira Olímpica', 2012, 'compra', 'Custodiada', 'Ativo', 28500, 'RO-ENV-0001')`,
        ['RO-000001', antigo],
      )

      // Recibo da moeda
      await tx.query(
        `INSERT INTO aurea.recibos (coin_id, codigo, hash, data_emissao, status)
         VALUES ($1, 'REC-000001', 'hash123', '20/09/2026', 'Ativo')`,
        ['RO-000001'],
      )

      // Envio
      await tx.query(
        `INSERT INTO aurea.envios (protocolo, user_email, tipo_moeda, ano, quantidade, etapa_atual, created_at)
         VALUES ($1, $2, 'Entrega da Bandeira Olímpica', 2012, 1, 'Protocolo gerado', $3)`,
        ['RO-ENV-0001', antigo, Date.now()],
      )

      // Fatura de custódia
      await tx.query(
        `INSERT INTO aurea.faturas_custodia (id, user_email, competencia, quantidade_moedas, moeda_ids, valor_cents, status, data_emissao, data_vencimento)
         VALUES ($1, $2, '2026-09', 1, ARRAY['RO-000001'], 300, 'pendente', $3, $4)`,
        ['FAT-0001', antigo, Date.now(), Date.now() + 86400000],
      )

      // Depósito
      await tx.query(
        `INSERT INTO aurea.deposits (user_email, valor, date)
         VALUES ($1, 100000, $2)`,
        [antigo, Date.now()],
      )

      // Saque
      await tx.query(
        `INSERT INTO aurea.saques (id, user_email, valor_total, taxa, valor_liquido, dados_bancarios, status, previsao_pagamento_em, criado_em, atualizado_em)
         VALUES ($1, $2, 5000, 500, 4500, '{"chavePix":"123"}'::jsonb, 'solicitado', $3, $3, $3)`,
        ['SAQ-0001', antigo, Date.now()],
      )

      // Ledger entry
      await tx.query(
        `INSERT INTO aurea.ledger_entries (created_at, user_email, tipo, valor, sinal, saldo_apos, descricao, hash_anterior, hash)
         VALUES ($1, $2, 'deposito', 100000, 1, 100000, 'Depósito inicial', 'GENESIS', 'hash_ledger_1')`,
        [Date.now(), antigo],
      )
    })

    // 2. Executa a renomeação em transação
    await executar(async (tx) => {
      await renomearEmailUsuarioNoBanco(tx, antigo, novo, 'Cliente Novo', 'senhaForte123')
    })

    // 3. Valida se o antigo não existe mais e o novo tem os dados
    await executar(async (tx) => {
      const { rows: uAntigo } = await tx.query('SELECT email FROM aurea.users WHERE email = $1', [antigo])
      expect(uAntigo).toHaveLength(0)

      const { rows: uNovo } = await tx.query<{ email: string; name: string; pass: string; balance: string }>(
        'SELECT email, name, pass, balance FROM aurea.users WHERE email = $1',
        [novo],
      )
      expect(uNovo).toHaveLength(1)
      expect(uNovo[0].email).toBe(novo)
      expect(uNovo[0].name).toBe('Cliente Novo')
      expect(uNovo[0].pass).toBe('senhaForte123')
      expect(Number(uNovo[0].balance)).toBe(100000)

      // Confere moedas
      const { rows: coins } = await tx.query<{ owner_email: string }>(
        'SELECT owner_email FROM aurea.coins WHERE id = $1',
        ['RO-000001'],
      )
      expect(coins[0].owner_email).toBe(novo)

      // Confere envios
      const { rows: envios } = await tx.query<{ user_email: string }>(
        'SELECT user_email FROM aurea.envios WHERE protocolo = $1',
        ['RO-ENV-0001'],
      )
      expect(envios[0].user_email).toBe(novo)

      // Confere faturas
      const { rows: faturas } = await tx.query<{ user_email: string }>(
        'SELECT user_email FROM aurea.faturas_custodia WHERE id = $1',
        ['FAT-0001'],
      )
      expect(faturas[0].user_email).toBe(novo)

      // Confere depósitos
      const { rows: deposits } = await tx.query<{ user_email: string }>(
        'SELECT user_email FROM aurea.deposits WHERE user_email = $1',
        [novo],
      )
      expect(deposits).toHaveLength(1)

      // Confere saques
      const { rows: saques } = await tx.query<{ user_email: string }>(
        'SELECT user_email FROM aurea.saques WHERE id = $1',
        ['SAQ-0001'],
      )
      expect(saques[0].user_email).toBe(novo)

      // Confere ledger
      const { rows: ledger } = await tx.query<{ user_email: string }>(
        'SELECT user_email FROM aurea.ledger_entries WHERE hash = $1',
        ['hash_ledger_1'],
      )
      expect(ledger[0].user_email).toBe(novo)

      // Confere audit log
      const { rows: audit } = await tx.query<{ acao: string; entidade: string }>(
        "SELECT acao, entidade FROM aurea.audit_log WHERE acao = 'usuario.trocar_email'",
      )
      expect(audit.length).toBeGreaterThanOrEqual(1)
    })
  })

  it('rejeita renomeação se o e-mail de destino já existir', async () => {
    await executar(async (tx) => {
      await tx.query(
        `INSERT INTO aurea.users (email, name, balance) VALUES ($1, $2, $3)`,
        ['existente@teste.com', 'Existente', 0],
      )
    })

    await expect(
      executar(async (tx) => {
        await renomearEmailUsuarioNoBanco(
          tx,
          'cliente.atualizado@teste.com',
          'existente@teste.com',
        )
      }),
    ).rejects.toThrow('Já existe uma conta com este e-mail.')
  })
})

describe('Proteção de e-mails institucionais e de equipe', () => {
  it('impede alteração dos e-mails de bootstrap @testeaurea.com.br e institucional', () => {
    expect(ehEmailProtegido('rogeriopena@testeaurea.com.br')).toBe(true)
    expect(ehEmailProtegido('gabrielsilva@testeaurea.com.br')).toBe(true)
    expect(ehEmailProtegido('qualquer@testeaurea.com.br')).toBe(true)
    expect(ehEmailProtegido('gabriel.silva@aureacustodia.com.br')).toBe(true)

    // Clientes normais
    expect(ehEmailProtegido('cliente@gmail.com')).toBe(false)
    expect(ehEmailProtegido('investidor@outlook.com')).toBe(false)
  })
})

describe('Renomeação em memória (renomearEmailNoAppState)', () => {
  it('atualiza todas as entidades do AppState mantendo consistência', () => {
    const antigo = 'antigo@cliente.com'
    const novo = 'novo@cliente.com'

    const user: User = {
      name: 'Cliente Antigo',
      balance: 50000,
      coins: [
        {
          id: 'RO-000002',
          tipoMoeda: 'Entrega da Bandeira Olímpica',
          ano: 2012,
          entrada: '20/09/2026',
          statusFisico: 'Armazenado',
          statusDigital: 'Validado',
          valorEstimado: 28500,
          protocolo: 'RO-ENV-0002',
          recibo: {
            codigo: 'REC-000002',
            hash: '0x1234',
            dataEmissao: '20/09/2026',
            status: 'Ativo',
          },
        },
      ],
      settings: { twoFA: false, notifEnvios: true, notifNegociacoes: true, notifNovidades: false },
    }

    const state: AppState = {
      users: { [antigo]: user },
      sellOffers: [
        {
          id: 'SO-1',
          seller: antigo,
          coinId: 'RO-000002',
          price: 30000,
          obs: '',
          lotId: 'LOT-1',
          createdAt: 1000,
          tipoMoeda: 'Entrega da Bandeira Olímpica',
        },
      ],
      buyOrders: [
        {
          id: 'BO-1',
          buyer: antigo,
          price: 25000,
          qty: 1,
          createdAt: 1000,
          tipoMoeda: 'Entrega da Bandeira Olímpica',
        },
      ],
      trades: [
        {
          price: 28500,
          qty: 1,
          date: 1000,
          buyer: antigo,
          seller: 'outro@teste.com',
          tipoMoeda: 'Entrega da Bandeira Olímpica',
        },
      ],
      envios: [
        {
          protocolo: 'RO-ENV-0002',
          userEmail: antigo,
          tipoMoeda: 'Entrega da Bandeira Olímpica',
          ano: 2012,
          quantidade: 1,
          codigoRastreio: null,
          dataPostagem: null,
          dataRecebimento: null,
          etapaAtual: 'Protocolo gerado',
          createdAt: 1000,
          codigosAtivosGerados: [],
        },
      ],
      seq: { coin: 2, envio: 2 },
      deposits: [],
      analises: [],
      faturasCustodia: [
        {
          id: 'FAT-1',
          userEmail: antigo,
          competencia: '2026-09',
          valorCents: 300,
          quantidadeMoedas: 1,
          moedaIds: ['RO-000002'],
          status: 'pendente',
          dataEmissao: 1000,
          dataVencimento: 2000,
        },
      ],
    }

    renomearEmailNoAppState(state, antigo, novo, 'Cliente Novo', 'senha123')

    expect(state.users[antigo]).toBeUndefined()
    expect(state.users[novo]).toBeDefined()
    expect(state.users[novo].name).toBe('Cliente Novo')
    expect(state.users[novo].pass).toBe('senha123')
    expect(state.users[novo].coins[0].id).toBe('RO-000002')
    expect(state.sellOffers[0].seller).toBe(novo)
    expect(state.buyOrders[0].buyer).toBe(novo)
    expect(state.trades[0].buyer).toBe(novo)
    expect(state.envios[0].userEmail).toBe(novo)
    expect(state.faturasCustodia![0].userEmail).toBe(novo)
  })
})
