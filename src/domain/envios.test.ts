import { describe, expect, it } from 'vitest'

import { cancelamentosDeNfse } from '@/domain/nfse/pedidos'
import type { AppState, Envio } from '@/domain/types'
import {
  DEVOLUCAO_AUTOMATICA_DO_PRIMEIRO_MES_VALE_PARA_ENVIO_CRIADO_A_PARTIR_DE,
  PRAZO_DESCARTE_ENVIO_MS,
  desconsiderarEnvio,
  envioCancelado,
  envioVenceuPrazoDePostagem,
  isEnvioDesconsiderado,
  prePostagemAtiva,
  prazoPostagemEnvio,
  primeiroMesEntraNaDevolucaoAutomatica,
  statusFaseEnvio,
  temPrimeiroMesADevolver,
  temPrimeiroMesPago,
} from './envios'

function makeEnvio(parciais: Partial<Envio> = {}): Envio {
  return {
    protocolo: 'RO-ENV-0001',
    userEmail: 'gabriel.silva@aureacustodia.com.br',
    tipoMoeda: 'Entrega da Bandeira Olímpica',
    ano: 2016,
    quantidade: 1,
    codigoRastreio: null,
    dataPostagem: null,
    dataRecebimento: null,
    etapaAtual: 'Protocolo gerado',
    createdAt: 1000000,
    codigosAtivosGerados: [],
    origem: 'envio_postal',
    ...parciais,
  }
}

describe('Domínio de Envios — Descarte em 3 dias', () => {
  it('envio recém-criado não está desconsiderado e calcula tempo restante', () => {
    const t0 = 1000000
    const envio = makeEnvio({ createdAt: t0 })

    expect(isEnvioDesconsiderado(envio, t0)).toBe(false)

    // 1 dia após criação (restam 2 dias)
    const t1 = t0 + 24 * 60 * 60 * 1000
    const prazo1 = prazoPostagemEnvio(envio, t1)
    expect(prazo1.expirado).toBe(false)
    expect(prazo1.diasRestantes).toBe(2)
    expect(prazo1.mensagemAlerta).toContain('Resta(m) 2 dia(s)')

    // 2 dias e meio após criação (restam 12 horas)
    const t2 = t0 + 60 * 60 * 60 * 1000
    const prazo2 = prazoPostagemEnvio(envio, t2)
    expect(prazo2.expirado).toBe(false)
    expect(prazo2.diasRestantes).toBe(0)
    expect(prazo2.horasRestantes).toBe(12)
    expect(prazo2.mensagemAlerta).toContain('Resta(m) menos de 12 hora(s)')
  })

  it('envio não postado é desconsiderado ao completar exatamente 3 dias ou mais', () => {
    const t0 = 1000000
    const envio = makeEnvio({ createdAt: t0 })

    // 1 segundo antes de 3 dias: ainda ativo
    const umSegundoAntes = t0 + PRAZO_DESCARTE_ENVIO_MS - 1000
    expect(isEnvioDesconsiderado(envio, umSegundoAntes)).toBe(false)
    expect(prazoPostagemEnvio(envio, umSegundoAntes).expirado).toBe(false)

    // Exatamente 3 dias: expirado
    const tresDias = t0 + PRAZO_DESCARTE_ENVIO_MS
    expect(isEnvioDesconsiderado(envio, tresDias)).toBe(true)
    expect(prazoPostagemEnvio(envio, tresDias).expirado).toBe(true)

    // 4 dias: expirado
    const quatroDias = t0 + 4 * 24 * 60 * 60 * 1000
    expect(isEnvioDesconsiderado(envio, quatroDias)).toBe(true)
  })

  it('envio já postado nunca é desconsiderado pelo prazo de postagem', () => {
    const t0 = 1000000
    const cincoDiasDepois = t0 + 5 * 24 * 60 * 60 * 1000
    const envioPostado = makeEnvio({
      createdAt: t0,
      codigoRastreio: 'SL123456789BR',
      dataPostagem: t0 + 10000,
      etapaAtual: 'Envio postado',
    })

    expect(isEnvioDesconsiderado(envioPostado, cincoDiasDepois)).toBe(false)
    expect(prazoPostagemEnvio(envioPostado, cincoDiasDepois).expirado).toBe(false)
  })

  it('cadastro sem envio não é desconsiderado pelo prazo postal', () => {
    const t0 = 1000000
    const dezDiasDepois = t0 + 10 * 24 * 60 * 60 * 1000
    const envioDireto = makeEnvio({
      createdAt: t0,
      origem: 'cadastro_sem_envio',
    })

    expect(isEnvioDesconsiderado(envioDireto, dezDiasDepois)).toBe(false)
  })

  it('envio explicitamente carimbado com desconsideradoEm é sempre desconsiderado', () => {
    const envio = makeEnvio({
      desconsideradoEm: Date.now(),
      motivoDesconsideracao: 'Cancelado a pedido do cliente.',
    })
    expect(isEnvioDesconsiderado(envio)).toBe(true)
    expect(prazoPostagemEnvio(envio).expirado).toBe(true)
  })
})

describe('Domínio de Envios — Fases do ciclo de vida', () => {
  const t0 = 1000000

  it('fase: ainda não postado', () => {
    const envio = makeEnvio({ createdAt: t0 })
    const status = statusFaseEnvio(envio, null, t0)
    expect(status.fase).toBe('nao_postado')
    expect(status.rotulo).toBe('Ainda não postado')
    expect(status.descricao).toContain('ainda não postado')
  })

  it('fase: desconsiderado', () => {
    const envio = makeEnvio({ createdAt: t0 })
    const quatroDias = t0 + 4 * 24 * 60 * 60 * 1000
    const status = statusFaseEnvio(envio, null, quatroDias)
    expect(status.fase).toBe('desconsiderado')
    expect(status.rotulo).toBe('Desconsiderado')
    expect(status.badgeVariant).toBe('danger')
  })

  it('fase: postado vs em trânsito', () => {
    const envio = makeEnvio({
      createdAt: t0,
      codigoRastreio: 'SL123456789BR',
      dataPostagem: t0 + 1000,
      etapaAtual: 'Envio postado',
    })

    // Sem dados dos Correios ainda
    const s1 = statusFaseEnvio(envio, null, t0 + 2000)
    expect(s1.fase).toBe('postado')
    expect(s1.rotulo).toBe('Postado')

    // Correios indicam em trânsito
    const s2 = statusFaseEnvio(
      envio,
      { statusAtual: 'em_transito', etapaDescricao: 'Encaminhado para CTE Cajamar' },
      t0 + 2000,
    )
    expect(s2.fase).toBe('em_transito')
    expect(s2.rotulo).toBe('Em trânsito')
    expect(s2.descricao).toBe('Encaminhado para CTE Cajamar')
  })

  it('fase: recebido pela custódia', () => {
    const envio = makeEnvio({
      etapaAtual: 'Recebido pela custódia',
      dataRecebimento: t0 + 5000,
    })
    const s = statusFaseEnvio(envio)
    expect(s.fase).toBe('recebido')
    expect(s.rotulo).toBe('Recebido pela custódia')
  })

  it('fase: em análise física', () => {
    const envio = makeEnvio({
      etapaAtual: 'Em análise física',
    })
    const s = statusFaseEnvio(envio)
    expect(s.fase).toBe('em_analise')
    expect(s.rotulo).toBe('Em análise física')
  })

  it('fase: analisado / concluído', () => {
    const envio = makeEnvio({
      etapaAtual: 'Recibo emitido',
      codigosAtivosGerados: ['RO-BAN-0001'],
    })
    const s = statusFaseEnvio(envio)
    expect(s.fase).toBe('analisado')
    expect(s.rotulo).toBe('Analisado / Concluído')
    expect(s.descricao).toContain('RO-BAN-0001')
    expect(s.badgeVariant).toBe('success')
  })
})

describe('Domínio de Envios — frete pago e etiqueta oficial (22/10/2026)', () => {
  const PRE = {
    id: 'PRI1',
    codigoObjeto: 'AP123456789BR',
    codigoServico: '03301',
    criadaEm: 1000000,
    prazoPostagem: null,
    canceladaEm: null,
  }
  const FRETE = {
    modalidade: 'PAC' as const,
    codigoServico: '03301',
    valorCents: 2114,
    valorDeclaradoCents: 15000,
    prazoDiasUteis: 5,
    cotadoEm: 1000000,
    status: 'pago' as const,
    pagoEm: 1000000,
    forma: 'saldo' as const,
  }
  const vencido = 1000000 + PRAZO_DESCARTE_ENVIO_MS + 1

  it('envio com etiqueta vencido NÃO cai na leitura: quem decide é o servidor, depois de perguntar aos Correios', () => {
    const envio = makeEnvio({ prePostagem: PRE, frete: FRETE })
    expect(isEnvioDesconsiderado(envio, vencido)).toBe(false)
    expect(envioVenceuPrazoDePostagem(envio, vencido)).toBe(true)
    const prazo = prazoPostagemEnvio(envio, vencido)
    expect(prazo.expirado).toBe(false)
    expect(prazo.mensagemAlerta).toContain('frete volta ao seu saldo')
  })

  it('etiqueta cancelada volta à regra comum dos 3 dias', () => {
    const envio = makeEnvio({ prePostagem: { ...PRE, canceladaEm: 2 } })
    expect(prePostagemAtiva(envio)).toBeNull()
    expect(isEnvioDesconsiderado(envio, vencido)).toBe(true)
  })

  it('desconsiderar com frete pago devolve o frete ao saldo uma vez só', () => {
    const envio = makeEnvio({ frete: { ...FRETE }, prePostagem: PRE })
    const state = { users: { [envio.userEmail]: { balance: 500 } }, envios: [envio] } as unknown as AppState

    const r1 = desconsiderarEnvio(state, envio, vencido)
    expect(r1.freteEstornadoCents).toBe(2114)
    expect(r1.prePostagemACancelar?.id).toBe('PRI1')
    expect(state.users[envio.userEmail].balance).toBe(2614)
    expect(envio.frete?.status).toBe('estornado')
    expect(envio.desconsideradoEm).toBe(vencido)

    const r2 = desconsiderarEnvio(state, envio, vencido + 1)
    expect(r2.freteEstornadoCents).toBe(0)
    expect(state.users[envio.userEmail].balance).toBe(2614)
  })

  it('desconsiderar sem frete pago não mexe em saldo', () => {
    const envio = makeEnvio({ frete: { ...FRETE, status: 'cotado' } })
    const state = { users: { [envio.userEmail]: { balance: 500 } }, envios: [envio] } as unknown as AppState
    expect(desconsiderarEnvio(state, envio, vencido).freteEstornadoCents).toBe(0)
    expect(state.users[envio.userEmail].balance).toBe(500)
    expect(envio.frete?.status).toBe('cotado')
  })
})

describe('Domínio de Envios — o desconsiderar de 3 dias devolve também o 1º mês e a nota (17/11/2026, T6)', () => {
  // Envio NOVO: criado no instante do corte D-H5 (ver o describe do corte, mais abaixo).
  const CRIADO = DEVOLUCAO_AUTOMATICA_DO_PRIMEIRO_MES_VALE_PARA_ENVIO_CRIADO_A_PARTIR_DE
  const vencido = CRIADO + PRAZO_DESCARTE_ENVIO_MS + 1
  const FRETE = {
    modalidade: 'PAC' as const,
    codigoServico: '03301',
    valorCents: 2114,
    valorDeclaradoCents: 15000,
    prazoDiasUteis: 5,
    cotadoEm: 1000000,
    status: 'pago' as const,
    pagoEm: 1000000,
    forma: 'saldo' as const,
  }

  function comPrimeiroMes(statusFatura: 'paga' | 'pendente', extra: Partial<Envio> = {}) {
    const envio = makeEnvio({ createdAt: CRIADO, ...extra })
    const state = {
      users: { [envio.userEmail]: { name: 'Rogério', balance: 500, coins: [] } },
      envios: [envio],
      trades: [],
      planosCustodia: [
        {
          id: 'PLC-000010',
          userEmail: envio.userEmail,
          protocoloEnvio: envio.protocolo,
          modalidade: 'mensal',
          quantidadeContratada: 15,
          moedaIds: [],
          valorPorMoedaCents: 200,
          valorTotalCents: 3000,
          parcelasMax: 1,
          inicioCompetencia: '2026-11',
          pagoAteCompetencia: statusFatura === 'paga' ? '2026-11' : null,
          status: statusFatura === 'paga' ? 'vigente' : 'aguardando_pagamento',
          formaPagamento: null,
          paymentIntentRef: null,
          assinaturaId: null,
          estornadoCents: 0,
          criadoEm: 1,
          atualizadoEm: 1,
        },
      ],
      faturasCustodia: [
        {
          id: 'FAT-2026-11-rogerio-1',
          userEmail: envio.userEmail,
          competencia: '2026-11',
          quantidadeMoedas: 15,
          moedaIds: [],
          valorCents: 3000,
          status: statusFatura,
          dataEmissao: 1,
          dataVencimento: 2,
          dataPagamento: statusFatura === 'paga' ? 5 : null,
          formaPagamento: statusFatura === 'paga' ? 'saldo' : null,
          planoId: 'PLC-000010',
          origem: 'contratacao',
        },
      ],
    } as unknown as AppState
    return { envio, state }
  }

  it('1º mês pago e nenhum frete (o caso do Rogério): volta ao saldo, a fatura é cancelada e o plano também', () => {
    const { envio, state } = comPrimeiroMes('paga')
    const r = desconsiderarEnvio(state, envio, vencido)

    expect(r.freteEstornadoCents).toBe(0)
    expect(r.primeiroMes).toMatchObject({ estornadoCents: 3000, faturaIds: ['FAT-2026-11-rogerio-1'], planoIds: ['PLC-000010'] })
    expect(state.users[envio.userEmail].balance).toBe(3500)
    expect(state.faturasCustodia![0]!.status).toBe('cancelada')
    expect(state.planosCustodia![0]!.status).toBe('cancelado')
    expect(state.planosCustodia![0]!.estornadoCents).toBe(0)
  })

  it('frete e 1º mês voltam juntos, cada um uma vez', () => {
    const { envio, state } = comPrimeiroMes('paga', { frete: { ...FRETE } })
    const r = desconsiderarEnvio(state, envio, vencido)
    expect(r.freteEstornadoCents).toBe(2114)
    expect(r.primeiroMes.estornadoCents).toBe(3000)
    expect(state.users[envio.userEmail].balance).toBe(500 + 2114 + 3000)

    const de2 = desconsiderarEnvio(state, envio, vencido + 1)
    expect(de2).toMatchObject({ freteEstornadoCents: 0, primeiroMes: { estornadoCents: 0 } })
    expect(state.users[envio.userEmail].balance).toBe(500 + 2114 + 3000)
  })

  it('1º mês em aberto: só cancela a fatura e o plano, sem dinheiro algum', () => {
    const { envio, state } = comPrimeiroMes('pendente')
    const r = desconsiderarEnvio(state, envio, vencido)
    expect(r.primeiroMes).toMatchObject({ estornadoCents: 0, canceladoCents: 3000 })
    expect(state.users[envio.userEmail].balance).toBe(500)
    expect(state.faturasCustodia![0]!.status).toBe('cancelada')
    expect(state.planosCustodia![0]!.status).toBe('cancelado')
  })

  it('a varredura enxerga o envio cujo único dinheiro é o 1º mês; e não enxerga quando já foi devolvido', () => {
    const { envio, state } = comPrimeiroMes('paga')
    expect(temPrimeiroMesPago(state, envio)).toBe(true)
    expect(temPrimeiroMesADevolver(state, envio)).toBe(true)
    desconsiderarEnvio(state, envio, vencido)
    expect(temPrimeiroMesPago(state, envio)).toBe(false)
    expect(temPrimeiroMesADevolver(state, envio)).toBe(false)
  })

  it('envio sem plano nenhum não é candidato', () => {
    const envio = makeEnvio()
    const state = { users: {}, envios: [envio] } as unknown as AppState
    expect(temPrimeiroMesADevolver(state, envio)).toBe(false)
  })
})

describe('Domínio de Envios — o corte D-H5: a devolução AUTOMÁTICA do 1º mês só vale para envio novo', () => {
  const CORTE = DEVOLUCAO_AUTOMATICA_DO_PRIMEIRO_MES_VALE_PARA_ENVIO_CRIADO_A_PARTIR_DE
  const FRETE = {
    modalidade: 'PAC' as const,
    codigoServico: '03301',
    valorCents: 2114,
    valorDeclaradoCents: 15000,
    prazoDiasUteis: 5,
    cotadoEm: 1,
    status: 'pago' as const,
    pagoEm: 1,
    forma: 'saldo' as const,
  }

  function cenario(createdAt: number) {
    const envio = makeEnvio({ createdAt, frete: { ...FRETE } })
    const state = {
      users: { [envio.userEmail]: { name: 'Rogério', balance: 500, coins: [] } },
      envios: [envio],
      trades: [],
      planosCustodia: [
        {
          id: 'PLC-000010', userEmail: envio.userEmail, protocoloEnvio: envio.protocolo, modalidade: 'mensal',
          quantidadeContratada: 15, moedaIds: [], valorPorMoedaCents: 200, valorTotalCents: 3000, parcelasMax: 1,
          inicioCompetencia: '2026-11', pagoAteCompetencia: '2026-11', status: 'vigente', formaPagamento: null,
          paymentIntentRef: null, assinaturaId: null, estornadoCents: 0, criadoEm: 1, atualizadoEm: 1,
        },
      ],
      faturasCustodia: [
        {
          id: 'FAT-2026-11-rogerio-1', userEmail: envio.userEmail, competencia: '2026-11', quantidadeMoedas: 15,
          moedaIds: [], valorCents: 3000, status: 'paga', dataEmissao: 1, dataVencimento: 2, dataPagamento: 5,
          formaPagamento: 'saldo', planoId: 'PLC-000010', origem: 'contratacao',
        },
      ],
    } as unknown as AppState
    return { envio, state }
  }

  it('o corte é o instante em que o fluxo novo da B foi ao ar (17/11/2026 23:00:50.154 em Brasília); 0 liga o retroativo', () => {
    // Se este número mudar, o teste diz o que mudou: é decisão de cobrança do Gabriel, não um detalhe de código.
    expect(CORTE).toBe(1794967250154)
    expect(new Date(CORTE).toISOString()).toBe('2026-11-18T02:00:50.154Z')
  })

  it('envio ANTIGO desconsiderado com 1º mês ligado a ele: o motivo diz que o cancelamento é com a equipe; o NOVO não diz', () => {
    const antigo = cenario(CORTE - 1)
    desconsiderarEnvio(antigo.state, antigo.envio, CORTE + PRAZO_DESCARTE_ENVIO_MS, 'Prazo limite de 3 dias para postagem expirado.')
    expect(antigo.envio.motivoDesconsideracao).toContain('peça o cancelamento à equipe do Real Olímpico')

    const novo = cenario(CORTE)
    desconsiderarEnvio(novo.state, novo.envio, CORTE + PRAZO_DESCARTE_ENVIO_MS, 'Prazo limite de 3 dias para postagem expirado.')
    expect(novo.envio.motivoDesconsideracao).toBe('Prazo limite de 3 dias para postagem expirado.')

    // Envio antigo SEM 1º mês ligado a ele não ganha aviso nenhum.
    const semMes = makeEnvio({ createdAt: CORTE - 1 })
    const estado = { users: {}, envios: [semMes] } as unknown as AppState
    desconsiderarEnvio(estado, semMes, CORTE + PRAZO_DESCARTE_ENVIO_MS, 'Prazo limite de 3 dias para postagem expirado.')
    expect(semMes.motivoDesconsideracao).toBe('Prazo limite de 3 dias para postagem expirado.')
  })

  it('a função do corte compara a data de criação do envio, exatamente no instante do corte', () => {
    const antes = cenario(CORTE - 1)
    const no = cenario(CORTE)
    expect(primeiroMesEntraNaDevolucaoAutomatica(antes.state, antes.envio)).toBe(false)
    expect(primeiroMesEntraNaDevolucaoAutomatica(no.state, no.envio)).toBe(true)
  })

  it('sem 1º mês a devolver, nem o envio novo entra', () => {
    const envio = makeEnvio({ createdAt: CORTE + 1 })
    const state = { users: {}, envios: [envio] } as unknown as AppState
    expect(primeiroMesEntraNaDevolucaoAutomatica(state, envio)).toBe(false)
  })

  it('envio criado ANTES do corte: a regra dos 3 dias devolve só o frete — fatura, plano e nota ficam como estão', () => {
    const { envio, state } = cenario(CORTE - 1)
    const antes = structuredClone(state)

    const r = desconsiderarEnvio(state, envio, CORTE + PRAZO_DESCARTE_ENVIO_MS)

    expect(r.freteEstornadoCents).toBe(2114)
    expect(r.primeiroMes).toMatchObject({ estornadoCents: 0, canceladoCents: 0, faturaIds: [], planoIds: [], assinaturaIds: [] })
    expect(state.users[envio.userEmail].balance).toBe(500 + 2114)
    expect(state.faturasCustodia![0]!.status).toBe('paga')
    expect(state.planosCustodia![0]!.status).toBe('vigente')
    expect(cancelamentosDeNfse(antes, state)).toEqual([])
  })

  it('envio criado A PARTIR do corte: devolve frete + 1º mês, e a nota do 1º mês entra no cancelamento', () => {
    const { envio, state } = cenario(CORTE)
    const antes = structuredClone(state)

    const r = desconsiderarEnvio(state, envio, CORTE + PRAZO_DESCARTE_ENVIO_MS)

    expect(r.freteEstornadoCents).toBe(2114)
    expect(r.primeiroMes.estornadoCents).toBe(3000)
    expect(state.users[envio.userEmail].balance).toBe(500 + 2114 + 3000)
    expect(state.faturasCustodia![0]!.status).toBe('cancelada')
    expect(cancelamentosDeNfse(antes, state)).toEqual([
      expect.objectContaining({ chave: 'custodia:FAT-2026-11-rogerio-1' }),
    ])
  })
})

describe('Domínio de Envios — envio cancelado a pedido', () => {
  it('a fase é "Cancelado", com quem cancelou e por quê — e não o texto de "3 dias"', () => {
    const envio = makeEnvio({
      desconsideradoEm: 5,
      canceladoEm: 5,
      canceladoPor: 'equipe',
      motivoCancelamento: 'Pedido do Rogério: as moedas não foram enviadas.',
    })
    const s = statusFaseEnvio(envio)
    expect(s.fase).toBe('cancelado')
    expect(s.rotulo).toBe('Cancelado')
    expect(s.descricao).toContain('pela equipe do Real Olímpico')
    expect(s.descricao).toContain('Pedido do Rogério')
    expect(s.descricao).not.toContain('3 dias')
    expect(envioCancelado(envio)).toBe(true)
  })

  it('o prazo de postagem de envio cancelado diz "cancelado", não "expirado em 3 dias"', () => {
    const envio = makeEnvio({ desconsideradoEm: 5, canceladoEm: 5, canceladoPor: 'cliente' })
    expect(prazoPostagemEnvio(envio).mensagemAlerta).toBe('Envio cancelado.')
  })

  it('envio nunca cancelado não é cancelado', () => {
    expect(envioCancelado(makeEnvio())).toBe(false)
    expect(envioCancelado(makeEnvio({ canceladoEm: null }))).toBe(false)
  })
})
