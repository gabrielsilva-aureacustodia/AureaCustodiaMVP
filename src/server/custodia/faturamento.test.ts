import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('server-only', () => ({}))

import type { AppState, FaturaCustodia } from '@/domain/types'

let estadoSimulado: AppState

vi.mock('@/server/state', () => ({
  mutateState: vi.fn(async (fn: (s: AppState) => unknown) => {
    const result = await fn(estadoSimulado)
    return { result, state: estadoSimulado }
  }),
  getState: vi.fn(async () => estadoSimulado),
}))

import { faturaBloqueia } from '@/domain/custody'

import { pagarFaturaCustodiaComSaldo, processarCicloFaturamento } from './faturamento'

/** 10/09/2026, 09:00 em Brasília — o dia em que as moedas do cenário foram aceitas. */
const AGORA = Date.UTC(2026, 8, 10, 12)
const DIA = 86_400_000

describe('server/custodia/faturamento', () => {
  beforeEach(() => {
    estadoSimulado = {
      users: {
        'com_saldo@teste.com': {
          name: 'Cliente Com Saldo',
          balance: 10_000, // R$ 100,00
          coins: [
            {
              id: 'RO-000001',
              tipoMoeda: 'Entrega da Bandeira Olímpica',
              ano: 2024,
              entrada: '10/09/2026',
              statusFisico: 'Armazenado',
              statusDigital: 'Validado',
              valorEstimado: 250000,
              protocolo: 'RO-ENV-0001',
              recibo: { codigo: 'REC-000001', hash: 'h1', dataEmissao: '01/01/2026', status: 'Ativo' },
            },
            {
              id: 'RO-000002',
              tipoMoeda: 'Entrega da Bandeira Olímpica',
              ano: 2024,
              entrada: '10/09/2026',
              statusFisico: 'Armazenado',
              statusDigital: 'Validado',
              valorEstimado: 250000,
              protocolo: 'RO-ENV-0001',
              recibo: { codigo: 'REC-000002', hash: 'h2', dataEmissao: '01/01/2026', status: 'Ativo' },
            },
          ],
        },
        'sem_saldo@teste.com': {
          name: 'Cliente Sem Saldo',
          balance: 100, // R$ 1,00 (menor que R$ 2,00)
          coins: [
            {
              id: 'RO-000003',
              tipoMoeda: 'Entrega da Bandeira Olímpica',
              ano: 2024,
              entrada: '10/09/2026',
              statusFisico: 'Armazenado',
              statusDigital: 'Validado',
              valorEstimado: 250000,
              protocolo: 'RO-ENV-0001',
              recibo: { codigo: 'REC-000003', hash: 'h3', dataEmissao: '01/01/2026', status: 'Ativo' },
            },
          ],
        },
        'sem_moeda@teste.com': {
          name: 'Cliente Sem Moeda',
          balance: 50_000,
          coins: [],
        },
      },
      sellOffers: [],
      buyOrders: [],
      trades: [],
      envios: [],
      seq: { coin: 3, envio: 1 },
      deposits: [],
      analises: [],
      saques: [],
      faturasCustodia: [],
      planosCustodia: [],
    }
  })

  it('debita automaticamente saldo se disponível e emite fatura paga', async () => {
    const rel = await processarCicloFaturamento(AGORA)

    expect(rel.competencia).toBe('2026-09')
    expect(rel.faturasGeradas).toBe(2)
    expect(rel.faturasLiquidadasComSaldo).toBe(1)
    expect(rel.faturasPendentes).toBe(1)

    // Cliente com saldo: 2 moedas = R$ 4,00 (400 cents)
    const userComSaldo = estadoSimulado.users['com_saldo@teste.com']
    expect(userComSaldo.balance).toBe(10_000 - 400) // 9600
    // Desde a E8 o ciclo não grava user.inadimplente: essa coluna é só a marca manual do painel.
    expect(userComSaldo.inadimplente).toBeFalsy()

    const faturaComSaldo = estadoSimulado.faturasCustodia?.find((f) => f.userEmail === 'com_saldo@teste.com')
    expect(faturaComSaldo).toBeDefined()
    expect(faturaComSaldo?.status).toBe('paga')
    expect(faturaComSaldo?.formaPagamento).toBe('saldo')
    expect(faturaComSaldo?.valorCents).toBe(400)

    // Cliente sem saldo: 1 moeda = R$ 2,00 (200 cents), saldo permanece 100
    const userSemSaldo = estadoSimulado.users['sem_saldo@teste.com']
    expect(userSemSaldo.balance).toBe(100)
    expect(userSemSaldo.inadimplente).toBeFalsy() // o ciclo não grava a coluna (E8)

    const faturaSemSaldo = estadoSimulado.faturasCustodia?.find((f) => f.userEmail === 'sem_saldo@teste.com')
    expect(faturaSemSaldo).toBeDefined()
    expect(faturaSemSaldo?.status).toBe('pendente')
    expect(faturaSemSaldo?.formaPagamento).toBeNull()
    expect(faturaSemSaldo?.valorCents).toBe(200)

    // Cliente sem moeda não ganha fatura
    const faturaSemMoeda = estadoSimulado.faturasCustodia?.find((f) => f.userEmail === 'sem_moeda@teste.com')
    expect(faturaSemMoeda).toBeUndefined()
  })

  it('é idempotente para a mesma competência', async () => {
    await processarCicloFaturamento(AGORA)
    const totalFaturas1 = estadoSimulado.faturasCustodia?.length

    const rel2 = await processarCicloFaturamento(AGORA)
    const totalFaturas2 = estadoSimulado.faturasCustodia?.length

    expect(rel2.faturasGeradas).toBe(0)
    expect(totalFaturas1).toBe(totalFaturas2)
  })

  it('marca fatura como atrasada e usuário como inadimplente quando passa da data de tolerância', async () => {
    // 1. Gera a fatura do primeiro ciclo
    await processarCicloFaturamento(AGORA)
    const fatura = estadoSimulado.faturasCustodia?.find((f) => f.userEmail === 'sem_saldo@teste.com')
    expect(fatura?.status).toBe('pendente')

    // 2. Roda o ciclo depois do vencimento, que é o próximo aniversário da moeda
    //    (10/10). O bloqueio ainda espera mais um dia de carência.
    const aposVencimento = AGORA + 32 * DIA
    const rel = await processarCicloFaturamento(aposVencimento)

    expect(fatura?.status).toBe('atrasada')
    // A fatura vencida NÃO grava mais a coluna (E8) — quem lê calcula a partir das faturas —, mas o
    // contador do relatório continua somando as duas origens.
    expect(estadoSimulado.users['sem_saldo@teste.com'].inadimplente).toBeFalsy()
    expect(rel.usuariosInadimplentes).toBe(1)
  })

  it('permite o usuário pagar fatura pendente com saldo posterior e preserva a marca manual', async () => {
    // Fatura atrasada existente
    const agora = 1726000000000
    const faturaAtrasada: FaturaCustodia = {
      id: 'FAT-2026-08-sem_saldo',
      userEmail: 'sem_saldo@teste.com',
      competencia: '2026-08',
      quantidadeMoedas: 1,
      moedaIds: ['RO-000003'],
      valorCents: 200,
      status: 'atrasada',
      dataEmissao: agora - 20 * 86400000,
      dataVencimento: agora - 10 * 86400000,
      dataPagamento: null,
      formaPagamento: null,
      paymentIntentId: null,
    }
    estadoSimulado.faturasCustodia = [faturaAtrasada]
    estadoSimulado.users['sem_saldo@teste.com'].inadimplente = true

    // Adiciona saldo para pagar
    estadoSimulado.users['sem_saldo@teste.com'].balance = 5_000

    const res = await pagarFaturaCustodiaComSaldo('FAT-2026-08-sem_saldo', 'sem_saldo@teste.com')
    expect(res.ok).toBe(true)
    expect(estadoSimulado.users['sem_saldo@teste.com'].balance).toBe(4_800)
    expect(faturaAtrasada.status).toBe('paga')
    expect(faturaAtrasada.formaPagamento).toBe('saldo')
    // A marca posta à mão no setup continua lá: pagar fatura não apaga marca da equipe (E8).
    // A inadimplência POR FATURA sumiu sozinha, porque a fatura está paga.
    expect(estadoSimulado.users['sem_saldo@teste.com'].inadimplente).toBe(true)
  })

  it('recusa pagamento com saldo se o usuário não possuir saldo suficiente', async () => {
    const faturaPendente: FaturaCustodia = {
      id: 'FAT-2026-09-sem_saldo',
      userEmail: 'sem_saldo@teste.com',
      competencia: '2026-09',
      quantidadeMoedas: 1,
      moedaIds: ['RO-000003'],
      valorCents: 200,
      status: 'pendente',
      dataEmissao: 1000,
      dataVencimento: 2000,
      dataPagamento: null,
      formaPagamento: null,
      paymentIntentId: null,
    }
    estadoSimulado.faturasCustodia = [faturaPendente]
    estadoSimulado.users['sem_saldo@teste.com'].balance = 50 // insuficiente

    const res = await pagarFaturaCustodiaComSaldo('FAT-2026-09-sem_saldo', 'sem_saldo@teste.com')
    expect(res.ok).toBe(false)
    expect(res.error).toMatch(/Saldo insuficiente/)
    expect(faturaPendente.status).toBe('pendente')
  })

  it('coexiste fatura de contratacao e ciclo_mensal na mesma competencia deduzindo moedas cobertas', async () => {
    // com_saldo@teste.com tem 2 moedas: RO-000001 e RO-000002.
    // Simula um plano cobrindo RO-000001 com fatura de contratacao paga na mesma competencia
    estadoSimulado.planosCustodia = [
      {
        id: 'PLC-000001',
        userEmail: 'com_saldo@teste.com',
        protocoloEnvio: 'RO-ENV-0001',
        modalidade: 'anual',
        quantidadeContratada: 1,
        moedaIds: ['RO-000001'],
        valorPorMoedaCents: 2400,
        valorTotalCents: 2400,
        parcelasMax: 12,
        inicioCompetencia: '2026-09',
        pagoAteCompetencia: '2027-08',
        status: 'vigente',
        formaPagamento: 'saldo',
        paymentIntentRef: null,
        assinaturaId: null,
        estornadoCents: 0,
        criadoEm: 1726000000000,
        atualizadoEm: 1726000000000,
      },
    ]
    estadoSimulado.faturasCustodia = [
      {
        id: 'FAT-2026-09-com_saldo-CONTRATACAO',
        userEmail: 'com_saldo@teste.com',
        competencia: '2026-09',
        quantidadeMoedas: 1,
        moedaIds: ['RO-000001'],
        valorCents: 200,
        status: 'paga',
        dataEmissao: 1726000000000,
        dataVencimento: 1726000000000 + 10 * 86400000,
        dataPagamento: 1726000000000,
        formaPagamento: 'saldo',
        paymentIntentId: null,
        planoId: 'PLC-000001',
        origem: 'contratacao',
      },
    ]

    // Roda o faturamento do ciclo de 10/09
    await processarCicloFaturamento(AGORA)

    // Deve ter a fatura de contratacao (200) E uma nova fatura de ciclo_mensal cobrindo apenas RO-000002 (300 cents)
    const faturasComSaldo = estadoSimulado.faturasCustodia!.filter((f) => f.userEmail === 'com_saldo@teste.com')
    expect(faturasComSaldo).toHaveLength(2)

    const faturaCiclo = faturasComSaldo.find((f) => f.origem === 'ciclo_mensal')
    expect(faturaCiclo).toBeDefined()
    expect(faturaCiclo?.quantidadeMoedas).toBe(1)
    expect(faturaCiclo?.moedaIds).toEqual(['RO-000002'])
    expect(faturaCiclo?.valorCents).toBe(200)
    expect(faturaCiclo?.status).toBe('paga') // debitada com saldo
  })

  it('plano anual pago nao gera fatura de ciclo_mensal durante os 12 meses', async () => {
    // Usuário tem 2 moedas, ambas cobertas por plano anual até 2027-08
    estadoSimulado.planosCustodia = [
      {
        id: 'PLC-000002',
        userEmail: 'com_saldo@teste.com',
        protocoloEnvio: 'RO-ENV-0001',
        modalidade: 'anual',
        quantidadeContratada: 2,
        moedaIds: ['RO-000001', 'RO-000002'],
        valorPorMoedaCents: 2400,
        valorTotalCents: 4800,
        parcelasMax: 12,
        inicioCompetencia: '2026-09',
        pagoAteCompetencia: '2027-08',
        status: 'vigente',
        formaPagamento: 'cartao',
        paymentIntentRef: null,
        assinaturaId: null,
        estornadoCents: 0,
        criadoEm: 1726000000000,
        atualizadoEm: 1726000000000,
      },
    ]

    await processarCicloFaturamento(Date.UTC(2026, 9, 15, 12))

    const faturaComSaldo = estadoSimulado.faturasCustodia?.find(
      (f) => f.userEmail === 'com_saldo@teste.com' && f.competencia === '2026-10',
    )
    expect(faturaComSaldo).toBeUndefined()
  })

  it('gera renovacao anual no 13º mes e liquida com saldo caso disponivel', async () => {
    // Plano anual cobriu de 2025-09 até 2026-08 (12 meses).
    // Na competência 2026-09 (13º mês), renovação anual é devida.
    estadoSimulado.planosCustodia = [
      {
        id: 'PLC-000003',
        userEmail: 'com_saldo@teste.com',
        protocoloEnvio: 'RO-ENV-0001',
        modalidade: 'anual',
        quantidadeContratada: 2,
        moedaIds: ['RO-000001', 'RO-000002'],
        valorPorMoedaCents: 2400,
        valorTotalCents: 4800,
        parcelasMax: 12,
        inicioCompetencia: '2025-09',
        pagoAteCompetencia: '2026-08',
        status: 'vigente',
        formaPagamento: 'saldo',
        paymentIntentRef: null,
        assinaturaId: null,
        estornadoCents: 0,
        criadoEm: 1725000000000,
        atualizadoEm: 1725000000000,
      },
    ]

    const saldoInicial = estadoSimulado.users['com_saldo@teste.com'].balance // 10000 (R$ 100,00)

    await processarCicloFaturamento(AGORA)

    const faturaRenovacao = estadoSimulado.faturasCustodia?.find(
      (f) => f.userEmail === 'com_saldo@teste.com' && f.origem === 'renovacao_anual',
    )
    expect(faturaRenovacao).toBeDefined()
    expect(faturaRenovacao?.valorCents).toBe(400) // 2 moedas * 200
    expect(faturaRenovacao?.status).toBe('paga')

    // Saldo debitado
    expect(estadoSimulado.users['com_saldo@teste.com'].balance).toBe(saldoInicial - 400)

    // Plano atualizado para o próximo mês: de 2026-08 para 2026-09
    const plano = estadoSimulado.planosCustodia[0]
    expect(plano.pagoAteCompetencia).toBe('2026-09')
  })

  describe('o ciclo é de cada moeda, não do mês-calendário (02/10/2026)', () => {
    // Aceita em 21/09, paga a guarda na entrada: é o caso do Rogério, que pagou em 25/09 e foi
    // cobrado de novo em 01/10.
    const ACEITE = '21/09/2026'
    const PAGA_NA_ENTRADA: FaturaCustodia = {
      id: 'FAT-2026-09-sem_saldo-ENT',
      userEmail: 'sem_saldo@teste.com',
      competencia: '2026-09',
      quantidadeMoedas: 1,
      moedaIds: ['RO-000003'],
      valorCents: 200,
      status: 'paga',
      dataEmissao: Date.UTC(2026, 8, 21, 12),
      dataVencimento: Date.UTC(2026, 9, 21, 3),
      dataPagamento: Date.UTC(2026, 8, 21, 12),
      formaPagamento: 'saldo',
      paymentIntentId: null,
      origem: 'entrada_no_acervo',
      coberturaAte: Date.UTC(2026, 9, 21, 3) - 1,
    }

    beforeEach(() => {
      estadoSimulado.users['sem_saldo@teste.com'].coins[0]!.entrada = ACEITE
      estadoSimulado.users['com_saldo@teste.com'].coins = []
      estadoSimulado.faturasCustodia = [{ ...PAGA_NA_ENTRADA }]
    })

    it('não cobra no dia 1º: quem pagou em 21/09 não é cobrado em 01/10', async () => {
      const rel = await processarCicloFaturamento(Date.UTC(2026, 9, 1, 8, 2))

      expect(rel.faturasGeradas).toBe(0)
      expect(estadoSimulado.faturasCustodia!).toHaveLength(1)
    })

    it('cobra no aniversário: 21/10, com vencimento em 21/11 e cobertura até 20/11', async () => {
      const aniversario = Date.UTC(2026, 9, 21, 8) // 05:00 em Brasília, o horário do cron
      const rel = await processarCicloFaturamento(aniversario)

      expect(rel.faturasGeradas).toBe(1)
      const nova = estadoSimulado.faturasCustodia!.find((f) => f.id !== PAGA_NA_ENTRADA.id)!
      expect(nova.competencia).toBe('2026-10')
      expect(nova.origem).toBe('ciclo_mensal')
      expect(nova.moedaIds).toEqual(['RO-000003'])
      expect(nova.status).toBe('pendente') // sem saldo
      expect(nova.dataVencimento).toBe(Date.UTC(2026, 10, 21, 3)) // 21/11, 00:00 de Brasília
      expect(nova.coberturaAte).toBe(Date.UTC(2026, 10, 21, 3) - 1) // até 20/11, 23:59

      // idempotente: a segunda passada do mesmo dia não encontra nada
      expect((await processarCicloFaturamento(aniversario + 3_600_000)).faturasGeradas).toBe(0)
    })

    it('só trava a moeda depois das 23:59 do dia do vencimento', async () => {
      await processarCicloFaturamento(Date.UTC(2026, 9, 21, 8))
      const nova = estadoSimulado.faturasCustodia!.find((f) => f.id !== PAGA_NA_ENTRADA.id)!

      const fimDoDia = Date.UTC(2026, 10, 22, 2, 59) // 21/11, 23:59 em Brasília
      const viradaDoDia = Date.UTC(2026, 10, 22, 3, 1) // 22/11, 00:01 em Brasília
      expect(faturaBloqueia(nova, fimDoDia)).toBe(false)
      expect(faturaBloqueia(nova, viradaDoDia)).toBe(true)
    })

    it('moedas aceitas em dias diferentes viram faturas diferentes, cada uma no seu dia', async () => {
      const u = estadoSimulado.users['sem_saldo@teste.com']
      u.coins.push({ ...u.coins[0]!, id: 'RO-000004', entrada: '28/09/2026' })
      estadoSimulado.faturasCustodia!.push({
        ...PAGA_NA_ENTRADA,
        id: 'FAT-2026-09-sem_saldo-ENT-2',
        moedaIds: ['RO-000004'],
      })

      // 21/10: vence só a moeda de 21/09
      await processarCicloFaturamento(Date.UTC(2026, 9, 21, 8))
      let abertas = estadoSimulado.faturasCustodia!.filter((f) => f.status === 'pendente')
      expect(abertas.map((f) => f.moedaIds)).toEqual([['RO-000003']])

      // 28/10: vence a outra, em fatura própria, na mesma competência
      await processarCicloFaturamento(Date.UTC(2026, 9, 28, 8))
      abertas = estadoSimulado.faturasCustodia!.filter((f) => f.status === 'pendente')
      expect(abertas.map((f) => f.moedaIds)).toEqual([['RO-000003'], ['RO-000004']])
      expect(new Set(abertas.map((f) => f.competencia))).toEqual(new Set(['2026-10']))
    })
  })
})
