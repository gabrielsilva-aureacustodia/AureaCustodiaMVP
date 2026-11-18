/**
 * A fila de e-mails e o gancho de `mutarEstado`, contra um Postgres de verdade (PGlite, sem Docker, sem rede).
 *
 * Cobre o que o aceite da frente C pede e que só um banco prova: o e-mail nasce NA transação da mutação (e some
 * com ela), reprocessar não manda duas vezes, o despacho é de melhor esforço (falha vira registro, nunca exceção),
 * a preferência do cliente vale, e — a rede de segurança — a falta da migration 053 não derruba a mutação.
 *
 * UMA instância de PGlite para o arquivo inteiro (README de src/server/db/: várias derrubam workers do Vitest).
 * O `.env.local` com a POSTGRES_URL do banco real NÃO é lido aqui: a suíte nunca toca o banco de produção.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { MensagemDeEmail, ResultadoDeEnvio } from '@/lib/email/tipos'
import type { FaturaCustodia } from '@/domain/types'
import { bancoDeTeste, type BancoDeTeste } from '@/server/admin/testing/pglite'
import { lerEstado, mutarEstado } from '@/server/db/estado'

import { despacharAgora, despacharPendentes, esquecerChavesEmMemoria } from './despachar'
import { buscarPorChave, enfileirarEmails, ESPERA_APOS_FALHA_MS, TENTATIVAS_MAXIMAS, VALIDADE_MS } from './fila'
import { pedirEmailsDaMutacao } from './gancho'
import type { EventoDeEmail } from './tipos'

let banco: BancoDeTeste
let comprador: string
let vendedor: string
let terceiro: string

const MINUTO = 60_000

/** Um "provedor" que só anota o que recebeu. */
function provedorFalso(resposta: (m: MensagemDeEmail, n: number) => ResultadoDeEnvio | Promise<ResultadoDeEnvio> = () => ({ ok: true, id: 'msg_1' })) {
  const recebidas: MensagemDeEmail[] = []
  return {
    recebidas,
    enviar: async (m: MensagemDeEmail): Promise<ResultadoDeEnvio> => {
      recebidas.push(m)
      return resposta(m, recebidas.length)
    },
  }
}

const linhas = () =>
  banco.executar(async (tx) => (await tx.query('SELECT chave, tipo, para, status, tentativas FROM aurea.emails_pendentes ORDER BY id')).rows)

function evento(chave: string, over: Partial<EventoDeEmail> = {}): EventoDeEmail {
  return {
    chave,
    tipo: 'deposito',
    para: comprador,
    dados: { nome: 'Maria', valorCents: 10_000, metodo: 'pix', data: Date.UTC(2026, 10, 17, 15, 0) },
    ...over,
  } as EventoDeEmail
}

function trade(over: Partial<{ buyer: string; seller: string }> = {}) {
  return {
    price: 20_000,
    qty: 1,
    date: Date.now(),
    buyer: over.buyer ?? comprador,
    seller: over.seller ?? vendedor,
    feeComprador: 200,
    feeVendedor: 200,
    fee: 400,
    tipoMoeda: 'Direitos Humanos',
  }
}

function fatura(usuario: string, id: string, over: Partial<FaturaCustodia> = {}): FaturaCustodia {
  return {
    id,
    userEmail: usuario,
    competencia: '2026-11',
    quantidadeMoedas: 1,
    moedaIds: ['RO-000001'],
    valorCents: 200,
    status: 'pendente',
    dataEmissao: Date.now(),
    dataVencimento: Date.now() + 30 * 86_400_000,
    ...over,
  }
}

describe('fila de e-mails (aurea.emails_pendentes)', () => {
  beforeAll(async () => {
    banco = await bancoDeTeste()
    const estado = await lerEstado(banco.executar) // semeia as contas
    ;[comprador, vendedor, terceiro] = Object.keys(estado.users)
  }, 120_000)

  afterAll(async () => {
    await banco.fechar()
  })

  it('a semeadura não pede e-mail nenhum', async () => {
    expect(await linhas()).toEqual([])
  })

  it('negociação nova enfileira a compra e a venda NA mesma transação', async () => {
    const r = await mutarEstado(banco.executar, (s) => {
      s.trades.push(trade())
    })
    expect(r.emailsPedidos).toBe(2)
    const fila = await linhas()
    expect(fila.map((l) => [l.tipo, l.para, l.status])).toEqual([
      ['compra', comprador, 'pendente'],
      ['venda', vendedor, 'pendente'],
    ])
  })

  it('mutação que não muda nada de importante não pede e-mail', async () => {
    const r = await mutarEstado(banco.executar, (s) => {
      s.users[terceiro].lastAccess = Date.now()
    })
    expect(r.emailsPedidos).toBe(0)
    expect(await linhas()).toHaveLength(2)
  })

  it('mutação que DESFAZ (lança) não deixa e-mail na fila: nada de aviso de coisa que não aconteceu', async () => {
    await expect(
      mutarEstado(banco.executar, (s) => {
        s.trades.push(trade({ buyer: terceiro }))
        throw new Error('regra de negócio recusou')
      }),
    ).rejects.toThrow('recusou')
    expect(await linhas()).toHaveLength(2)
  })

  it('reprocessar o mesmo evento não cria segunda linha (chave única)', async () => {
    const antes = await lerEstado(banco.executar)
    const depois = structuredClone(antes)
    // A negociação acima já está gravada; derivar "a mesma" duas vezes sobre um antes sem ela repete as chaves.
    const semEla = structuredClone(antes)
    semEla.trades = semEla.trades.slice(0, -1)
    const entraram = await banco.executar((tx) => pedirEmailsDaMutacao(tx, semEla, depois, Date.now()))
    expect(entraram).toBe(0)
    expect(await linhas()).toHaveLength(2)
  })

  it('o depósito enfileira; com a preferência desligada, o aviso opcional não entra mas o "sempre" entra', async () => {
    await mutarEstado(banco.executar, (s) => {
      s.users[terceiro].settings = { twoFA: false, notifEnvios: false, notifNegociacoes: false, notifNovidades: false }
    })
    const r = await mutarEstado(banco.executar, (s) => {
      s.deposits.push({ userEmail: terceiro, valor: 5_000, date: Date.now(), origem: 'deposito', metodo: 'pix' })
      // Fatura de custódia paga: aviso OPCIONAL, que este cliente desligou.
      s.faturasCustodia = [...(s.faturasCustodia ?? []), fatura(terceiro, 'FAT-PREF', { status: 'paga', dataPagamento: Date.now(), formaPagamento: 'saldo' })]
    })
    expect(r.emailsPedidos).toBe(1)
    const fila = await linhas()
    expect(fila.filter((l) => l.para === terceiro).map((l) => l.tipo)).toEqual(['deposito'])
  })

  it('o despacho manda cada linha uma vez, com a chave do evento no cabeçalho de idempotência, e marca como enviada', async () => {
    const p = provedorFalso()
    const resumo = await despacharPendentes(banco.executar, p.enviar)
    expect(resumo).toEqual({ enviados: 3, simulados: 0, falhas: 0, expirados: 0 })
    expect(p.recebidas.map((m) => m.para).sort()).toEqual([comprador, vendedor, terceiro].sort())
    expect(p.recebidas.every((m) => m.idempotencyKey?.length)).toBe(true)
    expect(p.recebidas.find((m) => m.para === comprador)?.assunto).toBe('Compra concluída: 1 moeda')
    expect((await linhas()).every((l) => l.status === 'enviado')).toBe(true)

    // Chamar de novo (a mutação seguinte, o cron) não reenvia nada.
    const p2 = provedorFalso()
    expect(await despacharPendentes(banco.executar, p2.enviar)).toEqual({ enviados: 0, simulados: 0, falhas: 0, expirados: 0 })
    expect(p2.recebidas).toHaveLength(0)
  })

  it('provedor que RECUSA: a falha vira registro, a linha espera e volta; depois de cinco, desiste — e nada lança', async () => {
    await banco.executar((tx) => enfileirarEmails(tx, [evento('teste:falha')], Date.now()))
    const p = provedorFalso(() => ({ ok: false, erro: 'HTTP 503: provedor fora do ar' }))

    const agora = Date.now()
    const r1 = await despacharPendentes(banco.executar, p.enviar, { agora })
    expect(r1.falhas).toBe(1)
    let linha = await banco.executar((tx) => buscarPorChave(tx, 'teste:falha'))
    expect(linha).toMatchObject({ status: 'pendente', tentativas: 1, ultimoErro: 'HTTP 503: provedor fora do ar' })

    // Logo em seguida, ainda dentro da espera: a linha não é tentada de novo.
    const aindaEsperando = await despacharPendentes(banco.executar, p.enviar, { agora: agora + MINUTO })
    expect(aindaEsperando.falhas).toBe(0)
    expect(p.recebidas).toHaveLength(1)

    // Passada a espera, tenta; na quinta tentativa desiste.
    for (let i = 2; i <= TENTATIVAS_MAXIMAS; i++) {
      await despacharPendentes(banco.executar, p.enviar, { agora: agora + i * (ESPERA_APOS_FALHA_MS + MINUTO) })
    }
    linha = await banco.executar((tx) => buscarPorChave(tx, 'teste:falha'))
    expect(linha).toMatchObject({ status: 'desistido', tentativas: TENTATIVAS_MAXIMAS })
    expect(p.recebidas).toHaveLength(TENTATIVAS_MAXIMAS)
  })

  it('provedor que LANÇA exceção também não derruba o despacho: vira falha registrada', async () => {
    await banco.executar((tx) => enfileirarEmails(tx, [evento('teste:excecao')], Date.now()))
    const resumo = await despacharPendentes(banco.executar, async () => {
      throw new Error('socket hang up')
    })
    expect(resumo.falhas).toBe(1)
    expect(await banco.executar((tx) => buscarPorChave(tx, 'teste:excecao'))).toMatchObject({ status: 'pendente', ultimoErro: 'socket hang up' })
  })

  it('linha com dados malformados vira falha registrada, e as outras linhas seguem', async () => {
    await banco.executar((tx) =>
      enfileirarEmails(tx, [{ chave: 'teste:ruim', tipo: 'compra', para: comprador, dados: null } as unknown as EventoDeEmail, evento('teste:boa')], Date.now()),
    )
    const p = provedorFalso()
    const resumo = await despacharPendentes(banco.executar, p.enviar)
    expect(resumo.enviados).toBe(1)
    expect(await banco.executar((tx) => buscarPorChave(tx, 'teste:boa'))).toMatchObject({ status: 'enviado' })
    expect((await banco.executar((tx) => buscarPorChave(tx, 'teste:ruim')))?.ultimoErro).toBeTruthy()
  })

  it('sem provedor configurado (resposta simulada), a linha fica "simulado" e NÃO é reenviada depois', async () => {
    await banco.executar((tx) => enfileirarEmails(tx, [evento('teste:simulado')], Date.now()))
    const p = provedorFalso(() => ({ ok: true, simulado: true }))
    const resumo = await despacharPendentes(banco.executar, p.enviar)
    expect(resumo.simulados).toBe(1)
    expect(await banco.executar((tx) => buscarPorChave(tx, 'teste:simulado'))).toMatchObject({ status: 'simulado' })
    const p2 = provedorFalso()
    await despacharPendentes(banco.executar, p2.enviar)
    expect(p2.recebidas).toHaveLength(0)
  })

  it('e-mail pendente há mais de 24 h expira e nunca é enviado', async () => {
    const velho = Date.now() - VALIDADE_MS - MINUTO
    await banco.executar((tx) => enfileirarEmails(tx, [evento('teste:velho')], velho))
    const p = provedorFalso()
    const resumo = await despacharPendentes(banco.executar, p.enviar)
    expect(resumo.expirados).toBe(1)
    expect(p.recebidas).toHaveLength(0)
    expect(await banco.executar((tx) => buscarPorChave(tx, 'teste:velho'))).toMatchObject({ status: 'expirado' })
  })

  it('dois despachos ao mesmo tempo não mandam a mesma linha duas vezes (reserva atômica)', async () => {
    await banco.executar((tx) => enfileirarEmails(tx, [evento('teste:corrida-1'), evento('teste:corrida-2')], Date.now()))
    const p = provedorFalso(async () => {
      await new Promise((r) => setTimeout(r, 20))
      return { ok: true, id: 'x' }
    })
    await Promise.all([despacharPendentes(banco.executar, p.enviar), despacharPendentes(banco.executar, p.enviar)])
    const chaves = p.recebidas.map((m) => m.idempotencyKey)
    expect(chaves.filter((c) => c === 'teste:corrida-1')).toHaveLength(1)
    expect(chaves.filter((c) => c === 'teste:corrida-2')).toHaveLength(1)
  })

  it('a fila guarda só fatos já mascarados: a chave Pix nunca entra inteira no banco', async () => {
    await mutarEstado(banco.executar, (s) => {
      s.users[vendedor].cadastro = {
        // O banco só devolve o cadastro quando CPF, nome, nascimento e telefone existem: valores de teste, de ninguém.
        cpf: '12345678909', nomeCompleto: 'Vendedor de Teste', dataNascimento: '1990-01-01', telefone: '11999990000',
        endereco: { logradouro: 'Rua A', numero: '1', bairro: 'Centro', cidade: 'São Paulo', uf: 'SP', cep: '01000000' },
        dadosBancarios: { chavePix: '111.222.333-44', tipoChavePix: 'cpf' },
        completadoEm: Date.now(),
      }
    })
    const r = await mutarEstado(banco.executar, (s) => {
      const c = s.users[vendedor].cadastro
      if (c) c.dadosBancarios.chavePix = '555.666.777-88'
    })
    expect(r.emailsPedidos).toBe(1)
    const todas = await banco.executar(async (tx) => (await tx.query('SELECT dados::text AS dados FROM aurea.emails_pendentes')).rows)
    const tudo = JSON.stringify(todas)
    expect(tudo).toContain('terminada em 7788')
    expect(tudo).not.toContain('555.666.777-88')
    expect(tudo).not.toContain('111.222.333-44')
  })

  // Por ÚLTIMO neste bloco: derruba a tabela. Uma instância só de PGlite no arquivo inteiro.
  it('a falta da migration 053 não derruba a operação: a negociação e o ledger commitam e o aviso é só pulado', async () => {
    await banco.executar((tx) => tx.query('DROP TABLE aurea.emails_pendentes'))
    const antes = await lerEstado(banco.executar)

    const r = await mutarEstado(banco.executar, (s) => {
      s.trades.push(trade({ buyer: vendedor, seller: terceiro }))
    })
    expect(r.emailsPedidos).toBe(0)

    const depois = await lerEstado(banco.executar)
    expect(depois.trades.length).toBe(antes.trades.length + 1)
  })
})

describe('sem banco (ramo de desenvolvimento): envio direto', () => {
  it('manda cada evento uma vez e lembra a chave', async () => {
    esquecerChavesEmMemoria()
    const p = provedorFalso()
    const e = evento('dev:1', { para: 'a@x.com' })
    expect(await despacharAgora([e, e, evento('dev:2', { para: 'b@x.com' })], p.enviar)).toBe(2)
    expect(await despacharAgora([e], p.enviar)).toBe(0)
    expect(p.recebidas).toHaveLength(2)
  })

  it('provedor que falha ou lança nunca derruba quem chamou', async () => {
    esquecerChavesEmMemoria()
    const falha = provedorFalso(() => ({ ok: false, erro: 'HTTP 500' }))
    await expect(despacharAgora([evento('dev:3')], falha.enviar)).resolves.toBe(0)
    await expect(
      despacharAgora([evento('dev:4')], async () => {
        throw new Error('rede caiu')
      }),
    ).resolves.toBe(0)
  })
})

