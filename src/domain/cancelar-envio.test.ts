/**
 * Cancelar envio (frente H, 17/11/2026): o caso do Rogério — R$ 30,00 de 1º mês e a nota dele presos num
 * envio de 15 moedas que nunca foi postado.
 *
 * O estado vem do `seedState()` para que o `derivarLancamentos` (o ledger) leia o mesmo retrato que lê em
 * produção. O que se prova, cenário a cenário: o que volta ao saldo, o que NÃO volta, qual nota é cancelada,
 * que cancelar duas vezes não devolve duas vezes e que o saldo fecha com os lançamentos (nenhum `ajuste`,
 * nenhum estorno em dobro).
 */

import { describe, expect, it } from 'vitest'

import { CAMPOS_DA_ANALISE, conferirCadeia, encadearAnalise, type AnalisePendente } from '@/domain/analise'
import { GENESIS } from '@/domain/hash'
import { cancelamentosDeNfse, pedidosDeNfse } from '@/domain/nfse/pedidos'
import { seedState } from '@/domain/seed'
import type { AppState, Envio, FaturaCustodia, FreteEnvio, PlanoCustodia } from '@/domain/types'
import { derivarLancamentos } from '@/server/db/derivar'
import { planejarDiff } from '@/server/db/diff'

import {
  cancelarEnvio,
  DEVOLUCAO_AUTOMATICA_DO_PRIMEIRO_MES_VALE_PARA_ENVIO_CRIADO_A_PARTIR_DE,
  DEVOLVE_FRETE_DE_ENVIO_JA_POSTADO,
  JA_POSTADO_PARA_O_CLIENTE,
  MOEDA_JA_ACEITA,
  motivoValido,
  primeiroMesEntraNaDevolucaoAutomatica,
  recusaDoCancelamento,
} from './cancelar-envio'
import { envioCancelado, isEnvioDesconsiderado, prePostagemAtiva, statusFaseEnvio } from './envios'

const PROTOCOLO = 'RO-ENV-0017'
const FRETE_CENTS = 2_114
const PRIMEIRO_MES_CENTS = 3_000 // 15 moedas × R$ 2,00 — o caso do Rogério
const SALDO_INICIAL = 10_000
const MOTIVO = 'Não enviei as 15 moedas; cancelar o serviço, o envio e a nota.'

/** 17/11/2026 12:00 em Brasília. */
const AGORA = Date.UTC(2026, 10, 17, 15, 0, 0)
/** 10/11/2026: o 1º mês foi pago no mesmo mês do cancelamento. */
const PAGO_EM_NOVEMBRO = Date.UTC(2026, 10, 10, 15, 0, 0)
const PAGO_EM_OUTUBRO = Date.UTC(2026, 9, 28, 15, 0, 0)

const FRETE_PAGO: FreteEnvio = {
  modalidade: 'PAC',
  codigoServico: '03301',
  valorCents: FRETE_CENTS,
  valorDeclaradoCents: 15_000 * 15,
  prazoDiasUteis: 6,
  cotadoEm: 1,
  status: 'pago',
  pagoEm: 2,
  forma: 'saldo',
  paymentIntentRef: null,
  estornadoEm: null,
}

interface Opcoes {
  envio?: Partial<Envio>
  /** `null` = envio sem 1º mês nenhum (só frete). */
  fatura?: Partial<FaturaCustodia> | null
  plano?: Partial<PlanoCustodia>
}

function cenario(o: Opcoes = {}): { state: AppState; email: string } {
  const state = seedState()
  const email = Object.keys(state.users)[0]!
  state.users[email]!.balance = SALDO_INICIAL
  state.analises = []

  state.envios = [
    {
      protocolo: PROTOCOLO,
      userEmail: email,
      tipoMoeda: 'Entrega da Bandeira Olímpica',
      ano: 2016,
      quantidade: 15,
      codigoRastreio: null,
      dataPostagem: null,
      dataRecebimento: null,
      etapaAtual: 'Protocolo gerado',
      createdAt: Date.UTC(2026, 10, 9, 15, 0, 0),
      codigosAtivosGerados: [],
      origem: 'envio_postal',
      modalidadeEnvio: 'PAC',
      frete: { ...FRETE_PAGO },
      prePostagem: null,
      ...o.envio,
    },
  ]

  state.planosCustodia = []
  state.faturasCustodia = []
  if (o.fatura !== null) {
    state.planosCustodia = [
      {
        id: 'PLC-000010',
        userEmail: email,
        protocoloEnvio: PROTOCOLO,
        modalidade: 'mensal',
        quantidadeContratada: 15,
        moedaIds: [],
        valorPorMoedaCents: 200,
        valorTotalCents: PRIMEIRO_MES_CENTS,
        parcelasMax: 1,
        inicioCompetencia: '2026-11',
        pagoAteCompetencia: '2026-11',
        status: 'vigente',
        formaPagamento: 'saldo',
        paymentIntentRef: null,
        assinaturaId: null,
        estornadoCents: 0,
        criadoEm: 1,
        atualizadoEm: 1,
        ...o.plano,
      },
    ]
    state.faturasCustodia = [
      {
        id: 'FAT-2026-11-rogerio-1',
        userEmail: email,
        competencia: '2026-11',
        quantidadeMoedas: 15,
        moedaIds: [],
        valorCents: PRIMEIRO_MES_CENTS,
        status: 'paga',
        dataEmissao: 1,
        dataVencimento: 2,
        dataPagamento: PAGO_EM_NOVEMBRO,
        formaPagamento: 'saldo',
        planoId: 'PLC-000010',
        origem: 'contratacao',
        ...o.fatura,
      },
    ]
  }
  return { state, email }
}

const etiqueta = { id: 'PRI0001', codigoObjeto: 'AP123456789BR', codigoServico: '03301', criadaEm: 3, prazoPostagem: '2026-11-21', canceladaEm: null }

function cancelarComoEquipe(state: AppState, motivo = MOTIVO) {
  return cancelarEnvio(state, PROTOCOLO, { agora: AGORA, por: 'equipe', motivo })
}
function cancelarComoCliente(state: AppState, email: string, motivo = MOTIVO) {
  return cancelarEnvio(state, PROTOCOLO, { agora: AGORA, por: 'cliente', motivo, donoEsperado: email })
}

describe('cancelarEnvio — só o frete (envio sem 1º mês)', () => {
  it('devolve o frete inteiro ao saldo, marca o envio cancelado e desconsiderado, e não toca em fatura', () => {
    const { state, email } = cenario({ fatura: null })
    const r = cancelarComoCliente(state, email)

    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.jaCancelado).toBe(false)
    expect(r.resumo).toMatchObject({ freteEstornadoCents: FRETE_CENTS, primeiroMesEstornadoCents: 0, totalAoSaldoCents: FRETE_CENTS })
    expect(state.users[email]!.balance).toBe(SALDO_INICIAL + FRETE_CENTS)

    const envio = state.envios[0]!
    expect(envio.frete).toMatchObject({ status: 'estornado', estornadoEm: AGORA })
    expect(envio).toMatchObject({ canceladoEm: AGORA, canceladoPor: 'cliente', motivoCancelamento: MOTIVO, desconsideradoEm: AGORA })
    expect(envioCancelado(envio)).toBe(true)
    // As guardas antigas passam a valer sem edição: o envio cancelado sai das listas e do rastreio.
    expect(isEnvioDesconsiderado(envio)).toBe(true)
    expect(statusFaseEnvio(envio, null, AGORA)).toMatchObject({ fase: 'cancelado', rotulo: 'Cancelado' })
    expect(r.mensagem).toContain('Envio RO-ENV-0017 cancelado')
  })

  it('o frete devolvido é o TOTAL cobrado, inclusive o acréscimo da frente K (contrato H→K)', () => {
    const { state, email } = cenario({ fatura: null, envio: { frete: { ...FRETE_PAGO, valorCents: FRETE_CENTS + 350 } } })
    const r = cancelarComoCliente(state, email)
    expect(r.ok && r.resumo.freteEstornadoCents).toBe(FRETE_CENTS + 350)
    expect(state.users[email]!.balance).toBe(SALDO_INICIAL + FRETE_CENTS + 350)
  })

  it('frete só cotado (nunca pago) não devolve nada', () => {
    const { state, email } = cenario({ fatura: null, envio: { frete: { ...FRETE_PAGO, status: 'cotado', pagoEm: null } } })
    const r = cancelarComoCliente(state, email)
    expect(r.ok && r.resumo.totalAoSaldoCents).toBe(0)
    expect(state.users[email]!.balance).toBe(SALDO_INICIAL)
    expect(state.envios[0]!.frete?.status).toBe('cotado')
  })
})

describe('cancelarEnvio — frete + 1º mês pago (o caso do Rogério)', () => {
  it('devolve o 1º mês pelo caminho de estornarFaturaPaga e cancela fatura e plano', () => {
    const { state, email } = cenario()
    const r = cancelarComoEquipe(state)

    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.resumo).toMatchObject({
      freteEstornadoCents: FRETE_CENTS,
      primeiroMesEstornadoCents: PRIMEIRO_MES_CENTS,
      totalAoSaldoCents: FRETE_CENTS + PRIMEIRO_MES_CENTS,
      faturaIds: ['FAT-2026-11-rogerio-1'],
      planoIds: ['PLC-000010'],
    })
    expect(state.users[email]!.balance).toBe(SALDO_INICIAL + FRETE_CENTS + PRIMEIRO_MES_CENTS)
    expect(state.faturasCustodia![0]!.status).toBe('cancelada')
    expect(state.planosCustodia![0]!.status).toBe('cancelado')
    // O estorno do plano é só o da moeda recusada na análise: tocar nele estornaria duas vezes no ledger.
    expect(state.planosCustodia![0]!.estornadoCents).toBe(0)
    // A equipe precisa saber que a nota NÃO sai na hora (a fila pula nota marcada há menos de 60 s) e como apressar.
    expect(r.mensagem).toContain('A nota fiscal do 1º mês foi marcada para cancelamento')
    expect(r.mensagem).toContain('Enviar fila agora')
  })

  it('para o cliente, a mensagem fala só da nota cancelada, sem jargão da fila interna', () => {
    const { state, email } = cenario()
    const r = cancelarComoCliente(state, email)
    expect(r.ok && r.mensagem).toContain('A nota fiscal do 1º mês será cancelada')
    expect(r.ok && r.mensagem).not.toContain('Enviar fila agora')
  })

  it('pede o cancelamento da NFS-e da fatura do 1º mês, e nenhuma nota nova', () => {
    const { state } = cenario()
    const antes = structuredClone(state)
    cancelarComoEquipe(state)

    expect(cancelamentosDeNfse(antes, state)).toEqual([
      expect.objectContaining({ chave: 'custodia:FAT-2026-11-rogerio-1', motivo: '2' }),
    ])
    expect(pedidosDeNfse(antes, state, AGORA)).toEqual([])
  })

  it('1º mês em aberto: só cancela a fatura — nada volta ao saldo e nenhuma nota é cancelada', () => {
    const { state, email } = cenario({
      fatura: { status: 'pendente', dataPagamento: null, formaPagamento: null },
      plano: { status: 'aguardando_pagamento', pagoAteCompetencia: null, formaPagamento: null },
    })
    const antes = structuredClone(state)
    const r = cancelarComoEquipe(state)

    expect(r.ok && r.resumo).toMatchObject({ primeiroMesEstornadoCents: 0, primeiroMesCanceladoCents: PRIMEIRO_MES_CENTS, totalAoSaldoCents: FRETE_CENTS })
    expect(state.users[email]!.balance).toBe(SALDO_INICIAL + FRETE_CENTS)
    expect(state.faturasCustodia![0]!.status).toBe('cancelada')
    expect(state.planosCustodia![0]!.status).toBe('cancelado')
    expect(cancelamentosDeNfse(antes, state)).toEqual([])
  })

  it('o cliente tinha cancelado a assinatura (plano cancelado) mas a fatura paga continua: o 1º mês ainda volta', () => {
    const { state, email } = cenario({ plano: { status: 'cancelado' } })
    const r = cancelarComoEquipe(state)
    expect(r.ok && r.resumo.primeiroMesEstornadoCents).toBe(PRIMEIRO_MES_CENTS)
    expect(state.users[email]!.balance).toBe(SALDO_INICIAL + FRETE_CENTS + PRIMEIRO_MES_CENTS)
  })

  it('devolve ao servidor as assinaturas no cartão que ainda estão ativas (I/O fora da transação)', () => {
    const { state } = cenario({ plano: { assinaturaId: 'PRE-123' } })
    const r = cancelarComoEquipe(state)
    expect(r.ok && r.resumo.assinaturaIds).toEqual(['PRE-123'])
  })
})

describe('cancelarEnvio — o contador exige cancelar nota dentro do mês', () => {
  it('nota do mesmo mês do cancelamento: sem aviso', () => {
    const { state } = cenario()
    const r = cancelarComoEquipe(state)
    expect(r.ok && r.resumo.avisoDoMes).toBeNull()
  })

  it('nota de outro mês: cancela mesmo assim, mas avisa a equipe com os dois meses', () => {
    const { state } = cenario({ fatura: { dataPagamento: PAGO_EM_OUTUBRO } })
    const r = cancelarComoEquipe(state)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.resumo.primeiroMesEstornadoCents).toBe(PRIMEIRO_MES_CENTS)
    expect(r.resumo.avisoDoMes).toContain('10/2026')
    expect(r.resumo.avisoDoMes).toContain('11/2026')
    expect(r.mensagem).toContain('dentro do mês da nota')
  })
})

describe('cancelarEnvio — com etiqueta dos Correios', () => {
  it('diz qual etiqueta cancelar (I/O) e não a marca como cancelada: quem grava é o servidor, depois', () => {
    const { state, email } = cenario({ envio: { prePostagem: etiqueta, codigoRastreio: etiqueta.codigoObjeto } })
    const r = cancelarComoCliente(state, email)

    expect(r.ok && r.resumo.prePostagemACancelar).toEqual(etiqueta)
    expect(state.envios[0]!.prePostagem?.canceladaEm).toBeNull()
    expect(prePostagemAtiva(state.envios[0]!)).not.toBeNull()
  })
})

describe('cancelarEnvio — envio já postado', () => {
  const postado: Partial<Envio> = {
    etapaAtual: 'Envio postado',
    dataPostagem: Date.UTC(2026, 10, 11, 15, 0, 0),
    prePostagem: etiqueta,
    codigoRastreio: etiqueta.codigoObjeto,
  }

  it('o cliente é recusado e NADA muda', () => {
    const { state, email } = cenario({ envio: postado })
    const antes = structuredClone(state)
    const r = cancelarComoCliente(state, email)

    expect(r).toEqual({ ok: false, codigo: 'ja_postado', erro: JA_POSTADO_PARA_O_CLIENTE })
    expect(state).toEqual(antes)
  })

  it('a regra do frete de envio postado está TRAVADA em "não devolve" (decisão D-H1, do Gabriel)', () => {
    // Se este teste falhar porque alguém trocou a constante, é decisão de cobrança: confirmar com o Gabriel.
    expect(DEVOLVE_FRETE_DE_ENVIO_JA_POSTADO).toBe(false)
  })

  it('a equipe cancela: 1º mês e nota voltam, o frete NÃO volta, e a etiqueta nem é tocada', () => {
    const { state, email } = cenario({ envio: postado })
    const antes = structuredClone(state)
    const r = cancelarComoEquipe(state)

    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.resumo).toMatchObject({
      jaPostado: true,
      freteEstornadoCents: 0,
      freteRetidoCents: FRETE_CENTS,
      primeiroMesEstornadoCents: PRIMEIRO_MES_CENTS,
      totalAoSaldoCents: PRIMEIRO_MES_CENTS,
      prePostagemACancelar: null,
    })
    expect(state.users[email]!.balance).toBe(SALDO_INICIAL + PRIMEIRO_MES_CENTS)
    expect(state.envios[0]!.frete?.status).toBe('pago')
    expect(cancelamentosDeNfse(antes, state)).toHaveLength(1)
    expect(r.mensagem).toContain('NÃO voltou')
  })
})

describe('cancelarEnvio — análise aberta na bancada (cancelar validação)', () => {
  const naBancada: Partial<Envio> = {
    etapaAtual: 'Em análise física',
    dataPostagem: Date.UTC(2026, 10, 11, 15, 0, 0),
    dataRecebimento: Date.UTC(2026, 10, 13, 15, 0, 0),
  }

  function analiseDe(n: number): AnalisePendente {
    return {
      protocolo: `RO-ANL-000${n}`,
      protocoloEnvio: `RO-ENV-001${n}`,
      codigoMoeda: `RO-00000${n}`,
      codigoRecibo: `REC-00000${n}`,
      tipoMoeda: 'Entrega da Bandeira Olímpica',
      ano: 2016,
      pesoMg: 27_000 + n,
      veredito: 'aprovada',
      motivoRecusa: null,
      operador: 'operador@aureacustodia.com.br',
      aprovador: 'operador@aureacustodia.com.br',
      caixa: 'EB-001',
      posicao: n,
      validadoEm: n * 1000,
      caminhoVideo: null,
      origem: 'bancada',
      observacao: null,
    }
  }

  it('encerra a validação sem criar moeda e SEM TOCAR na corrente de hash', () => {
    const { state, email } = cenario({ envio: naBancada })
    const a1 = encadearAnalise(analiseDe(1), GENESIS)
    const a2 = encadearAnalise(analiseDe(2), a1.hash)
    state.analises = [a1, a2]
    const analisesAntes = structuredClone(state.analises)
    const moedasAntes = state.users[email]!.coins.length

    const r = cancelarComoEquipe(state)

    expect(r.ok).toBe(true)
    expect(state.analises).toEqual(analisesAntes)
    expect(conferirCadeia(state.analises, GENESIS)).toBe(-1)
    expect(state.users[email]!.coins).toHaveLength(moedasAntes)
    expect(state.envios[0]!.codigosAtivosGerados).toEqual([])
    expect(state.envios[0]!.etapaAtual).toBe('Em análise física')
    expect(r.ok && r.resumo.primeiroMesEstornadoCents).toBe(PRIMEIRO_MES_CENTS)
  })

  it('a fórmula do hash não mudou: continuam os quinze campos, na mesma ordem', () => {
    expect([...CAMPOS_DA_ANALISE]).toEqual([
      'protocolo',
      'protocoloEnvio',
      'codigoMoeda',
      'codigoRecibo',
      'tipoMoeda',
      'ano',
      'pesoMg',
      'veredito',
      'motivoRecusa',
      'operador',
      'aprovador',
      'caixa',
      'posicao',
      'validadoEm',
      'caminhoVideo',
    ])
  })
})

describe('cancelarEnvio — moeda já aceita não cancela', () => {
  it.each([
    ['com moeda gerada', { codigosAtivosGerados: ['RO-000042'], etapaAtual: 'Recibo emitido' as const }],
    ['só com a etapa final', { etapaAtual: 'Recibo emitido' as const }],
  ])('recusa %s, para o cliente e para a equipe, e orienta a retirada', (_nome, envio) => {
    for (const quem of ['cliente', 'equipe'] as const) {
      const { state, email } = cenario({ envio })
      const antes = structuredClone(state)
      const r = cancelarEnvio(state, PROTOCOLO, { agora: AGORA, por: quem, motivo: MOTIVO, donoEsperado: quem === 'cliente' ? email : undefined })
      expect(r).toEqual({ ok: false, codigo: 'moeda_aceita', erro: MOEDA_JA_ACEITA })
      expect(state).toEqual(antes)
    }
    expect(MOEDA_JA_ACEITA).toContain('retirada')
  })

  it('o teste da tela e o do núcleo concordam', () => {
    const { state } = cenario({ envio: { etapaAtual: 'Recibo emitido' } })
    expect(recusaDoCancelamento(state.envios[0]!, 'equipe')?.codigo).toBe('moeda_aceita')
  })
})

describe('cancelarEnvio — idempotência', () => {
  it('duplo clique: o segundo responde ok, "já cancelado", e não devolve de novo', () => {
    const { state, email } = cenario()
    const primeiro = cancelarComoCliente(state, email)
    const saldoDepoisDoPrimeiro = state.users[email]!.balance
    const fotografia = structuredClone(state)

    const segundo = cancelarComoCliente(state, email)

    expect(primeiro.ok && primeiro.jaCancelado).toBe(false)
    expect(segundo.ok && segundo.jaCancelado).toBe(true)
    expect(segundo.ok && segundo.resumo.totalAoSaldoCents).toBe(0)
    expect(state.users[email]!.balance).toBe(saldoDepoisDoPrimeiro)
    expect(state).toEqual(fotografia)
  })

  it('cliente e equipe cancelando juntos: o motivo e o instante do primeiro ficam', () => {
    const { state } = cenario()
    cancelarEnvio(state, PROTOCOLO, { agora: AGORA, por: 'equipe', motivo: 'Pedido do cliente por telefone (Rogério).' })
    cancelarEnvio(state, PROTOCOLO, { agora: AGORA + 5_000, por: 'cliente', motivo: MOTIVO })
    expect(state.envios[0]).toMatchObject({ canceladoPor: 'equipe', canceladoEm: AGORA, motivoCancelamento: 'Pedido do cliente por telefone (Rogério).' })
  })

  it('envio desconsiderado pelo prazo de 3 dias ANTES desta frente, com o 1º mês ainda pago: o cancelamento completa a devolução sem estornar o frete de novo', () => {
    const { state, email } = cenario({
      envio: { desconsideradoEm: 99, motivoDesconsideracao: 'Prazo limite de 3 dias para postagem expirado.', frete: { ...FRETE_PAGO, status: 'estornado', estornadoEm: 99 } },
    })
    const saldo = state.users[email]!.balance
    const r = cancelarComoEquipe(state)

    expect(r.ok && r.resumo).toMatchObject({ freteEstornadoCents: 0, primeiroMesEstornadoCents: PRIMEIRO_MES_CENTS })
    expect(state.users[email]!.balance).toBe(saldo + PRIMEIRO_MES_CENTS)
    // Mantém o instante do fato original; só acrescenta o cancelamento.
    expect(state.envios[0]).toMatchObject({ desconsideradoEm: 99, canceladoEm: AGORA })
  })
})

describe('cancelarEnvio — o ledger fecha (sem estorno duplicado e sem ajuste)', () => {
  it('soma dos lançamentos da conta = variação do saldo; um estorno do frete e um da fatura, cada um uma vez', () => {
    const { state: antes, email } = cenario()
    const depois = structuredClone(antes)
    expect(cancelarComoEquipe(depois).ok).toBe(true)

    const derivado = derivarLancamentos({
      antes,
      depois,
      ops: planejarDiff(antes, depois),
      semeadura: false,
      agora: AGORA,
      hashAnterior: 'h',
    })

    const daConta = derivado.lancamentos.filter((l) => l.userEmail === email)
    const variacao = depois.users[email]!.balance - antes.users[email]!.balance
    expect(daConta.reduce((s, l) => s + l.valor * l.sinal, 0)).toBe(variacao)
    expect(variacao).toBe(FRETE_CENTS + PRIMEIRO_MES_CENTS)
    expect(derivado.ajustes).toEqual([])
    expect(derivado.lancamentos.some((l) => l.tipo === 'ajuste')).toBe(false)

    const estornos = daConta.filter((l) => l.tipo === 'estorno')
    expect(estornos.map((l) => [l.refInterna, l.valor]).sort()).toEqual(
      [
        [PROTOCOLO, FRETE_CENTS],
        ['FAT-2026-11-rogerio-1', PRIMEIRO_MES_CENTS],
      ].sort(),
    )
  })

  it('cancelar duas vezes (a segunda sobre o estado já gravado) não lança nada novo', () => {
    const { state: inicio } = cenario()
    const primeiro = structuredClone(inicio)
    cancelarComoEquipe(primeiro)
    const segundo = structuredClone(primeiro)
    cancelarComoEquipe(segundo)

    const derivado = derivarLancamentos({ antes: primeiro, depois: segundo, ops: planejarDiff(primeiro, segundo), semeadura: false, agora: AGORA + 1, hashAnterior: 'h' })
    expect(derivado.lancamentos).toEqual([])
    expect(derivado.ajustes).toEqual([])
  })
})

describe('cancelarEnvio — recusas de entrada', () => {
  it('motivo curto ou ausente é recusado, e nada muda', () => {
    const { state, email } = cenario()
    const antes = structuredClone(state)
    for (const motivo of ['', '   ', 'curto', undefined as unknown as string]) {
      // Direto no núcleo: o auxiliar dos testes tem motivo padrão, e `undefined` cairia nele.
      const r = cancelarEnvio(state, PROTOCOLO, { agora: AGORA, por: 'cliente', motivo, donoEsperado: email })
      expect(r).toMatchObject({ ok: false, codigo: 'motivo_invalido' })
    }
    expect(state).toEqual(antes)
  })

  it('motivoValido limpa espaços e corta no máximo', () => {
    expect(motivoValido('  não   vou  mais enviar  ')).toBe('não vou mais enviar')
    expect(motivoValido('x'.repeat(500))?.length).toBe(300)
    expect(motivoValido(42)).toBeNull()
  })

  it('protocolo de outra conta responde "não encontrado", igual a um que não existe', () => {
    const { state } = cenario()
    const antes = structuredClone(state)
    expect(cancelarEnvio(state, PROTOCOLO, { agora: AGORA, por: 'cliente', motivo: MOTIVO, donoEsperado: 'outra@conta.com' })).toMatchObject({ ok: false, codigo: 'nao_encontrado' })
    expect(cancelarEnvio(state, 'RO-ENV-9999', { agora: AGORA, por: 'equipe', motivo: MOTIVO })).toMatchObject({ ok: false, codigo: 'nao_encontrado' })
    expect(state).toEqual(antes)
  })
})

// O CASO REAL, na ordem real (leitura de produção do Específico, 17/11/2026 — pesquisa/h-caso-rogerio.md):
// envio de 15 moedas criado em 09/11, frete PAC de R$ 41,61 e 1º mês de R$ 30,00 pagos por saldo; em 13/11 a regra dos
// 3 dias desconsiderou o envio, estornou SÓ o frete e cancelou a etiqueta; em 14/11 a equipe cancelou a fatura e a
// nota à mão. Quando o código novo chegar, o caso já estará resolvido: cancelar de novo não pode devolver nada outra
// vez, nem mexer na nota.
describe('cancelarEnvio — o caso do Rogério já resolvido em produção (a prova de que repetir é inofensivo)', () => {
  const FRETE_41_61 = 4_161
  const DESCONSIDERADO_EM = Date.UTC(2026, 10, 13, 9, 53, 0)

  function casoResolvido(): { state: AppState; email: string } {
    const { state, email } = cenario({
      envio: {
        frete: { ...FRETE_PAGO, valorCents: FRETE_41_61, status: 'estornado', estornadoEm: DESCONSIDERADO_EM },
        prePostagem: { ...etiqueta, canceladaEm: DESCONSIDERADO_EM },
        desconsideradoEm: DESCONSIDERADO_EM,
        motivoDesconsideracao: 'Prazo limite de 3 dias para postagem expirado sem postagem nos Correios. O frete pago voltou ao saldo.',
      },
      fatura: { status: 'cancelada' },
      plano: { status: 'cancelado' },
    })
    state.users[email]!.balance = 18_730
    return { state, email }
  }

  it('não devolve nada, não pede cancelamento de nota, não lança nada no ledger e só anota quem/por quê', () => {
    const { state: antes, email } = casoResolvido()
    const depois = structuredClone(antes)

    const r = cancelarComoEquipe(depois)

    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.jaCancelado).toBe(false) // a marca de "cancelado" ainda não existia: o envio só estava desconsiderado
    expect(r.resumo).toMatchObject({
      freteEstornadoCents: 0,
      freteRetidoCents: 0,
      primeiroMesEstornadoCents: 0,
      primeiroMesCanceladoCents: 0,
      totalAoSaldoCents: 0,
      prePostagemACancelar: null,
      assinaturaIds: [],
    })
    expect(depois.users[email]!.balance).toBe(18_730)
    expect(depois.faturasCustodia![0]).toMatchObject({ status: 'cancelada' })
    expect(cancelamentosDeNfse(antes, depois)).toEqual([])
    expect(pedidosDeNfse(antes, depois, AGORA)).toEqual([])

    const derivado = derivarLancamentos({ antes, depois, ops: planejarDiff(antes, depois), semeadura: false, agora: AGORA, hashAnterior: 'h' })
    expect(derivado.lancamentos).toEqual([])
    expect(derivado.ajustes).toEqual([])
    expect(depois.envios[0]).toMatchObject({ canceladoEm: AGORA, canceladoPor: 'equipe', desconsideradoEm: DESCONSIDERADO_EM })
  })

  it('o frete já estornado não volta de novo: o estorno é por transição, e a transição não se repete', () => {
    const { state, email } = casoResolvido()
    const saldo = state.users[email]!.balance
    cancelarComoEquipe(state)
    expect(state.users[email]!.balance).toBe(saldo)
    expect(state.envios[0]!.frete).toMatchObject({ status: 'estornado', estornadoEm: DESCONSIDERADO_EM })
  })

  // RO-ENV-0017 (mesmo cliente, 1 moeda): 1º mês de R$ 2,00 pago por saldo em 20/10, sem frete, sem etiqueta e SEM NOTA
  // (pago antes da emissão automática de 23/10), parado em "Protocolo gerado" há 32 dias.
  it('envio antigo sem frete, sem etiqueta e sem nota: o R$ 2,00 do 1º mês volta e não há nota a cancelar', () => {
    const { state, email } = cenario({
      envio: { quantidade: 1, frete: null, createdAt: Date.UTC(2026, 9, 16, 15, 0, 0) },
      fatura: { valorCents: 200, quantidadeMoedas: 1, competencia: '2026-10', dataPagamento: PAGO_EM_OUTUBRO },
      plano: { quantidadeContratada: 1, valorTotalCents: 200, inicioCompetencia: '2026-10', pagoAteCompetencia: '2026-10' },
    })
    const antes = structuredClone(state)

    const r = cancelarComoEquipe(state)

    expect(r.ok && r.resumo).toMatchObject({ freteEstornadoCents: 0, primeiroMesEstornadoCents: 200, totalAoSaldoCents: 200 })
    expect(state.users[email]!.balance).toBe(SALDO_INICIAL + 200)
    // A nota do R$ 2,00 nunca existiu: a transição `paga → cancelada` marcaria uma, e como não há linha na fila o
    // cancelamento fica sem efeito fiscal — o contrato é "não inventa nota", que é o que `pedidosDeNfse` garante.
    expect(pedidosDeNfse(antes, state, AGORA)).toEqual([])
    // O aviso do mês existe (a fatura é de outubro e o cancelamento é de novembro): o contador precisa saber.
    expect(r.ok && r.resumo.avisoDoMes).toContain('10/2026')
  })
})

// D-H5: o corte vale SÓ para a devolução automática (regra dos 3 dias). O cancelamento manual — cliente, equipe,
// bancada — não tem corte, porque é por ele que a equipe trata os envios antigos à mão.
describe('cancelarEnvio — o cancelamento MANUAL não tem o corte D-H5', () => {
  const CORTE = DEVOLUCAO_AUTOMATICA_DO_PRIMEIRO_MES_VALE_PARA_ENVIO_CRIADO_A_PARTIR_DE

  it('envio criado ANTES do corte: a devolução automática não o alcança, mas o cancelamento manual devolve o 1º mês e cancela a nota', () => {
    const { state, email } = cenario({ envio: { createdAt: CORTE - 24 * 60 * 60 * 1000 } })
    const antes = structuredClone(state)
    expect(primeiroMesEntraNaDevolucaoAutomatica(state, state.envios[0]!)).toBe(false)

    const r = cancelarComoEquipe(state)

    expect(r.ok && r.resumo).toMatchObject({ freteEstornadoCents: FRETE_CENTS, primeiroMesEstornadoCents: PRIMEIRO_MES_CENTS })
    expect(state.users[email]!.balance).toBe(SALDO_INICIAL + FRETE_CENTS + PRIMEIRO_MES_CENTS)
    expect(state.faturasCustodia![0]!.status).toBe('cancelada')
    expect(cancelamentosDeNfse(antes, state)).toEqual([expect.objectContaining({ chave: 'custodia:FAT-2026-11-rogerio-1' })])
  })

  it('o cliente também cancela o envio antigo e recebe o 1º mês de volta', () => {
    const { state, email } = cenario({ envio: { createdAt: CORTE - 30 * 24 * 60 * 60 * 1000 } })
    const r = cancelarComoCliente(state, email)
    expect(r.ok && r.resumo.primeiroMesEstornadoCents).toBe(PRIMEIRO_MES_CENTS)
  })
})
