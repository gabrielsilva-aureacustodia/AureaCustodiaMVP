/**
 * A ORDEM do cancelamento de envio (17/11/2026): consultar os Correios → cancelar a etiqueta (a prova de "não
 * postado") → cancelar o cartão → UMA transação que estorna. Os Correios, o Mercado Pago e o estado são dublês —
 * nenhuma chamada real.
 *
 * A regra de dinheiro está provada em src/domain/cancelar-envio.test.ts; aqui se prova o que só o servidor
 * faz: a consulta que decide pelo status (2 e 7 apagam; 4 e 5 só anotam; o resto recusa), o DELETE que vem ANTES
 * do dinheiro, a falha do gateway ou dos Correios que não deixa nada pela metade, a nova tentativa que não
 * estorna duas vezes, e a varredura diária (com o corte D-H5 do 1º mês).
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { DEVOLUCAO_AUTOMATICA_DO_PRIMEIRO_MES_VALE_PARA_ENVIO_CRIADO_A_PARTIR_DE, PRAZO_DESCARTE_ENVIO_MS } from '@/domain/envios'
import { cancelamentosDeNfse } from '@/domain/nfse/pedidos'
import { seedState } from '@/domain/seed'
import type { AppState, Envio, PrePostagemRegistro } from '@/domain/types'

vi.mock('server-only', () => ({}))

const m = vi.hoisted(() => ({
  consultarPrePostagem: vi.fn(),
  cancelarPrePostagem: vi.fn(),
  correiosConfigurado: vi.fn(),
  cancelarAssinaturaRecorrente: vi.fn(),
  estado: null as unknown as AppState,
}))

vi.mock('@/lib/shipping/cws/prepostagem', () => ({
  consultarPrePostagem: m.consultarPrePostagem,
  cancelarPrePostagem: m.cancelarPrePostagem,
  criarPrePostagem: vi.fn(),
}))
vi.mock('@/lib/shipping/cws/config', () => ({
  correiosConfigurado: m.correiosConfigurado,
  SERVICOS_CORREIOS: { entrada: { PAC: '03301', SEDEX: '03247' }, saida: { PAC: '03298', SEDEX: '03220' } },
}))
vi.mock('@/lib/shipping/correios', () => ({ calcularFreteCorreios: vi.fn() }))
vi.mock('@/lib/payments', () => ({ cancelarAssinaturaRecorrente: m.cancelarAssinaturaRecorrente }))
vi.mock('@/server/state', () => ({
  getState: async () => m.estado,
  mutateState: async (fn: (s: AppState) => unknown) => ({ state: m.estado, result: await fn(m.estado) }),
}))

import { cancelarEnvioNoServidor } from './cancelar-envio'
import { cancelarAssinaturasDeEnviosEncerrados, desconsiderarEnviosVencidos } from './frete-envio'

const PROTOCOLO = 'RO-ENV-0017'
const MOTIVO = 'Não enviei as 15 moedas; cancelar o serviço, o envio e a nota.'
const SALDO = 10_000
const FRETE = 2_114
const PRIMEIRO_MES = 3_000
const ETIQUETA: PrePostagemRegistro = {
  id: 'PRI0001',
  codigoObjeto: 'AP123456789BR',
  codigoServico: '03301',
  criadaEm: 3,
  prazoPostagem: null,
  canceladaEm: null,
}

function montar(o: { envio?: Partial<Envio>; assinaturaId?: string | null; planoStatus?: 'vigente' | 'cancelado'; criadoEm?: number } = {}): string {
  const s = seedState()
  const email = Object.keys(s.users)[0]!
  s.users[email]!.balance = SALDO
  s.analises = []
  s.envios = [
    {
      protocolo: PROTOCOLO,
      userEmail: email,
      tipoMoeda: 'Entrega da Bandeira Olímpica',
      ano: 2016,
      quantidade: 15,
      codigoRastreio: ETIQUETA.codigoObjeto,
      dataPostagem: null,
      dataRecebimento: null,
      etapaAtual: 'Protocolo gerado',
      createdAt: o.criadoEm ?? Date.now(),
      codigosAtivosGerados: [],
      origem: 'envio_postal',
      modalidadeEnvio: 'PAC',
      frete: {
        modalidade: 'PAC',
        codigoServico: '03301',
        valorCents: FRETE,
        valorDeclaradoCents: 225_000,
        prazoDiasUteis: 6,
        cotadoEm: 1,
        status: 'pago',
        pagoEm: 2,
        forma: 'saldo',
        paymentIntentRef: null,
        estornadoEm: null,
      },
      prePostagem: { ...ETIQUETA },
      ...o.envio,
    },
  ]
  s.planosCustodia = [
    {
      id: 'PLC-000010',
      userEmail: email,
      protocoloEnvio: PROTOCOLO,
      modalidade: 'mensal',
      quantidadeContratada: 15,
      moedaIds: [],
      valorPorMoedaCents: 200,
      valorTotalCents: PRIMEIRO_MES,
      parcelasMax: 1,
      inicioCompetencia: '2026-11',
      pagoAteCompetencia: '2026-11',
      status: o.planoStatus ?? 'vigente',
      formaPagamento: 'cartao',
      paymentIntentRef: null,
      assinaturaId: o.assinaturaId ?? null,
      estornadoCents: 0,
      criadoEm: 1,
      atualizadoEm: 1,
    },
  ]
  s.faturasCustodia = [
    {
      id: 'FAT-2026-11-rogerio-1',
      userEmail: email,
      competencia: '2026-11',
      quantidadeMoedas: 15,
      moedaIds: [],
      valorCents: PRIMEIRO_MES,
      status: o.planoStatus === 'cancelado' ? 'cancelada' : 'paga',
      dataEmissao: 1,
      dataVencimento: 2,
      dataPagamento: Date.now(),
      formaPagamento: 'cartao',
      planoId: 'PLC-000010',
      origem: 'contratacao',
    },
  ]
  m.estado = s
  return email
}

const pedirComoCliente = (email: string) => cancelarEnvioNoServidor({ protocolo: PROTOCOLO, por: 'cliente', motivo: MOTIVO, donoEsperado: email })

describe('cancelarEnvioNoServidor — a ordem com os Correios e o cartão', () => {
  beforeEach(() => {
    for (const f of [m.consultarPrePostagem, m.cancelarPrePostagem, m.correiosConfigurado, m.cancelarAssinaturaRecorrente]) f.mockReset()
    m.correiosConfigurado.mockReturnValue(true)
    m.consultarPrePostagem.mockResolvedValue({ id: 'PRI0001', codigoObjeto: ETIQUETA.codigoObjeto, statusAtual: 2, descricao: 'Pré-postado' })
    m.cancelarPrePostagem.mockResolvedValue(undefined)
    m.cancelarAssinaturaRecorrente.mockResolvedValue({ ok: true })
  })

  it('com etiqueta não postada: cancela a etiqueta nos Correios ANTES do dinheiro, devolve tudo ao saldo e anota o cancelamento dela', async () => {
    const email = montar()
    const saldoNoDelete: number[] = []
    m.cancelarPrePostagem.mockImplementation(async () => {
      saldoNoDelete.push(m.estado.users[email]!.balance)
    })

    const r = await pedirComoCliente(email)

    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.etiqueta).toBe('cancelada')
    expect(r.resumo).toMatchObject({ freteEstornadoCents: FRETE, primeiroMesEstornadoCents: PRIMEIRO_MES })
    expect(m.cancelarPrePostagem).toHaveBeenCalledTimes(1)
    expect(m.cancelarPrePostagem).toHaveBeenCalledWith('PRI0001')
    // A ordem: quando o DELETE rodou, o saldo ainda era o de antes — nenhuma janela de "dinheiro devolvido e etiqueta viva".
    expect(saldoNoDelete).toEqual([SALDO])
    expect(m.estado.users[email]!.balance).toBe(SALDO + FRETE + PRIMEIRO_MES)
    expect(m.estado.envios[0]!.prePostagem?.canceladaEm).toEqual(expect.any(Number))
    expect(m.estado.envios[0]).toMatchObject({ canceladoPor: 'cliente', motivoCancelamento: MOTIVO })
    expect(r.mensagem).toContain('A etiqueta dos Correios foi cancelada')
  })

  it.each([
    [1, 'pré-atendido (o cliente está no balcão)'],
    [3, 'postado'],
    [6, 'estornado'],
  ])('status %i nos Correios (%s): recusa e NADA muda — na dúvida não se desfaz envio que pode estar a caminho', async (status) => {
    const email = montar()
    m.consultarPrePostagem.mockResolvedValue({ id: 'PRI0001', codigoObjeto: ETIQUETA.codigoObjeto, statusAtual: status, descricao: '' })
    const antes = structuredClone(m.estado)

    const r = await pedirComoCliente(email)

    expect(r.ok).toBe(false)
    expect(m.estado).toEqual(antes)
    expect(m.cancelarPrePostagem).not.toHaveBeenCalled()
  })

  it('os Correios sem resposta (erro ou nenhum registro): recusa e nada muda', async () => {
    const email = montar()
    const antes = structuredClone(m.estado)

    m.consultarPrePostagem.mockRejectedValue(new Error('timeout'))
    expect((await pedirComoCliente(email)).ok).toBe(false)

    m.consultarPrePostagem.mockResolvedValue(null)
    expect((await pedirComoCliente(email)).ok).toBe(false)

    m.correiosConfigurado.mockReturnValue(false)
    expect((await pedirComoCliente(email)).ok).toBe(false)

    expect(m.estado).toEqual(antes)
  })

  it('status 7 (pendente) também apaga a etiqueta: DELETE e depois o estorno', async () => {
    const email = montar()
    m.consultarPrePostagem.mockResolvedValue({ id: 'PRI0001', codigoObjeto: ETIQUETA.codigoObjeto, statusAtual: 7, descricao: 'Pendente' })

    const r = await pedirComoCliente(email)

    expect(r.ok && r.etiqueta).toBe('cancelada')
    expect(m.cancelarPrePostagem).toHaveBeenCalledTimes(1)
    expect(m.estado.users[email]!.balance).toBe(SALDO + FRETE + PRIMEIRO_MES)
  })

  it.each([
    [4, 'expirado'],
    [5, 'cancelado'],
  ])('status %i (%s) nos Correios: NÃO chama o DELETE, estorna e grava o canceladaEm na mesma transação', async (status) => {
    const email = montar()
    m.consultarPrePostagem.mockResolvedValue({ id: 'PRI0001', codigoObjeto: ETIQUETA.codigoObjeto, statusAtual: status, descricao: '' })

    const r = await pedirComoCliente(email)

    expect(r.ok && r.etiqueta).toBe('cancelada')
    expect(m.cancelarPrePostagem).not.toHaveBeenCalled()
    expect(m.estado.users[email]!.balance).toBe(SALDO + FRETE + PRIMEIRO_MES)
    expect(m.estado.envios[0]!.prePostagem?.canceladaEm).toEqual(expect.any(Number))
  })

  it('o DELETE FALHA: o envio NÃO é cancelado, nada é devolvido — e a nova tentativa, com a etiqueta cancelada, estorna uma vez só', async () => {
    const email = montar()
    m.cancelarPrePostagem.mockRejectedValue(new Error('Correios fora do ar'))
    const antes = structuredClone(m.estado)

    const r = await pedirComoCliente(email)

    expect(r.ok).toBe(false)
    expect(m.estado).toEqual(antes)

    // Voltou ao ar: a consulta agora diz 5 (o DELETE anterior tinha passado de fato) — vai direto ao estorno.
    m.consultarPrePostagem.mockResolvedValue({ id: 'PRI0001', codigoObjeto: ETIQUETA.codigoObjeto, statusAtual: 5, descricao: 'Cancelado' })
    m.cancelarPrePostagem.mockReset()
    const r2 = await pedirComoCliente(email)

    expect(r2.ok).toBe(true)
    expect(m.cancelarPrePostagem).not.toHaveBeenCalled()
    expect(m.estado.users[email]!.balance).toBe(SALDO + FRETE + PRIMEIRO_MES)

    // E uma terceira chamada (duplo clique tardio) não devolve de novo.
    await pedirComoCliente(email)
    expect(m.estado.users[email]!.balance).toBe(SALDO + FRETE + PRIMEIRO_MES)
  })

  it('o DELETE passou mas o cartão falhou: nada é estornado, e a nova tentativa consulta (status 5) e conclui sem novo DELETE', async () => {
    const email = montar({ assinaturaId: 'PRE-123' })
    m.cancelarAssinaturaRecorrente.mockResolvedValueOnce({ ok: false, error: 'gateway fora' })
    const antes = structuredClone(m.estado)

    const r = await pedirComoCliente(email)

    expect(r.ok).toBe(false)
    expect(m.cancelarPrePostagem).toHaveBeenCalledTimes(1)
    expect(m.estado).toEqual(antes) // o estado nosso não mudou: o envio e o dinheiro seguem como estavam

    m.consultarPrePostagem.mockResolvedValue({ id: 'PRI0001', codigoObjeto: ETIQUETA.codigoObjeto, statusAtual: 5, descricao: 'Cancelado' })
    const r2 = await pedirComoCliente(email)

    expect(r2.ok).toBe(true)
    expect(m.cancelarPrePostagem).toHaveBeenCalledTimes(1) // continua 1: sem novo DELETE
    expect(m.estado.users[email]!.balance).toBe(SALDO + FRETE + PRIMEIRO_MES)
    expect(m.estado.planosCustodia![0]!.assinaturaId).toBeNull()
  })

  it('exceção de rede na CONSULTA: estado incerto — recusa, nada muda, nenhum DELETE', async () => {
    const email = montar()
    m.consultarPrePostagem.mockRejectedValue(new Error('ETIMEDOUT'))
    const antes = structuredClone(m.estado)

    const r = await pedirComoCliente(email)

    expect(r.ok).toBe(false)
    expect(m.estado).toEqual(antes)
    expect(m.cancelarPrePostagem).not.toHaveBeenCalled()
  })

  it('envio SEM etiqueta ativa: pula a consulta e o DELETE, só estorna', async () => {
    const email = montar({ envio: { prePostagem: null, codigoRastreio: null } })

    const r = await pedirComoCliente(email)

    expect(r.ok && r.etiqueta).toBe('nao_havia')
    expect(m.consultarPrePostagem).not.toHaveBeenCalled()
    expect(m.cancelarPrePostagem).not.toHaveBeenCalled()
    expect(m.estado.users[email]!.balance).toBe(SALDO + FRETE + PRIMEIRO_MES)
  })

  it('duplo clique: a segunda chamada responde "já cancelado" sem devolver nem cancelar nada de novo', async () => {
    const email = montar()
    await pedirComoCliente(email)
    const saldo = m.estado.users[email]!.balance

    const segunda = await pedirComoCliente(email)

    expect(segunda.ok && segunda.jaCancelado).toBe(true)
    expect(m.estado.users[email]!.balance).toBe(saldo)
    expect(m.cancelarPrePostagem).toHaveBeenCalledTimes(1)
    expect(m.consultarPrePostagem).toHaveBeenCalledTimes(1)
  })

  it('1º mês no cartão recorrente: cancela a assinatura ANTES de gravar e tira o id do plano', async () => {
    const email = montar({ assinaturaId: 'PRE-123' })
    const ordem: string[] = []
    m.cancelarAssinaturaRecorrente.mockImplementation(async () => {
      ordem.push(`gateway; saldo ainda ${m.estado.users[email]!.balance}`)
      return { ok: true }
    })

    const r = await pedirComoCliente(email)

    expect(r.ok).toBe(true)
    expect(ordem).toEqual([`gateway; saldo ainda ${SALDO}`])
    expect(m.cancelarAssinaturaRecorrente).toHaveBeenCalledWith('PRE-123')
    expect(m.estado.planosCustodia![0]!.assinaturaId).toBeNull()
  })

  it('o Mercado Pago recusa cancelar o cartão: nada é alterado no estado (senão o cartão seguiria sendo debitado)', async () => {
    const email = montar({ assinaturaId: 'PRE-123' })
    m.cancelarAssinaturaRecorrente.mockResolvedValue({ ok: false, error: 'gateway fora' })
    const antes = structuredClone(m.estado)

    const r = await pedirComoCliente(email)

    expect(r.ok).toBe(false)
    expect(m.estado).toEqual(antes)
  })

  it('a equipe cancela envio já postado: sem consulta aos Correios, frete retido, 1º mês devolvido', async () => {
    const email = montar({ envio: { etapaAtual: 'Envio postado', dataPostagem: Date.now() } })

    const r = await cancelarEnvioNoServidor({ protocolo: PROTOCOLO, por: 'equipe', motivo: MOTIVO })

    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(m.consultarPrePostagem).not.toHaveBeenCalled()
    expect(m.cancelarPrePostagem).not.toHaveBeenCalled()
    expect(r.etiqueta).toBe('nao_havia')
    expect(r.titular).toBe(email)
    expect(r.resumo).toMatchObject({ freteEstornadoCents: 0, freteRetidoCents: FRETE, primeiroMesEstornadoCents: PRIMEIRO_MES })
    expect(m.estado.users[email]!.balance).toBe(SALDO + PRIMEIRO_MES)
  })

  it('o cliente não cancela envio já postado, e a recusa não passa pelos Correios', async () => {
    const email = montar({ envio: { etapaAtual: 'Envio postado', dataPostagem: Date.now() } })
    const antes = structuredClone(m.estado)
    const r = await pedirComoCliente(email)
    expect(r.ok).toBe(false)
    expect(m.estado).toEqual(antes)
    expect(m.consultarPrePostagem).not.toHaveBeenCalled()
  })

  it('motivo curto e dono errado são recusados antes de qualquer chamada externa', async () => {
    const email = montar()
    const antes = structuredClone(m.estado)
    expect((await cancelarEnvioNoServidor({ protocolo: PROTOCOLO, por: 'cliente', motivo: 'curto', donoEsperado: email })).ok).toBe(false)
    expect((await cancelarEnvioNoServidor({ protocolo: PROTOCOLO, por: 'cliente', motivo: MOTIVO, donoEsperado: 'outra@conta.com' })).ok).toBe(false)
    expect(m.estado).toEqual(antes)
    expect(m.consultarPrePostagem).not.toHaveBeenCalled()
  })
})

describe('desconsiderarEnviosVencidos — varredura diária com o 1º mês e o corte D-H5 (T6)', () => {
  // As datas vêm do corte, não do relógio: o teste não pode depender do dia em que roda. Envio NOVO = criado no
  // instante do corte; envio ANTIGO = um dia antes. `AGORA` é um instante passado de 4 dias depois do envio novo.
  const CORTE = DEVOLUCAO_AUTOMATICA_DO_PRIMEIRO_MES_VALE_PARA_ENVIO_CRIADO_A_PARTIR_DE
  const DIA = 24 * 60 * 60 * 1000
  const HA_QUATRO_DIAS = CORTE
  const ANTIGO = CORTE - DIA
  const AGORA = CORTE + PRAZO_DESCARTE_ENVIO_MS + DIA

  beforeEach(() => {
    for (const f of [m.consultarPrePostagem, m.cancelarPrePostagem, m.correiosConfigurado, m.cancelarAssinaturaRecorrente]) f.mockReset()
    m.correiosConfigurado.mockReturnValue(true)
    m.cancelarAssinaturaRecorrente.mockResolvedValue({ ok: true })
  })

  it('envio vencido ANTIGO (criado antes do corte), com 1º mês pago e frete pago: volta só o frete; fatura, plano e nota não são tocados', async () => {
    const email = montar({ criadoEm: ANTIGO })
    m.consultarPrePostagem.mockResolvedValue({ id: 'PRI0001', codigoObjeto: ETIQUETA.codigoObjeto, statusAtual: 2, descricao: '' })
    m.cancelarPrePostagem.mockResolvedValue(undefined)
    const antes = structuredClone(m.estado)

    const r = await desconsiderarEnviosVencidos(AGORA)

    expect(r).toMatchObject({ desconsiderados: [PROTOCOLO], fretesEstornadosCents: FRETE, primeirosMesesEstornadosCents: 0 })
    expect(m.estado.users[email]!.balance).toBe(SALDO + FRETE)
    expect(m.estado.faturasCustodia![0]!.status).toBe('paga')
    expect(m.estado.planosCustodia![0]!.status).toBe('vigente')
    expect(cancelamentosDeNfse(antes, m.estado)).toEqual([])
    // O que o cliente lê: o frete voltou, e o 1º mês só sai pelo cancelamento com a equipe.
    expect(m.estado.envios[0]!.motivoDesconsideracao).toContain('O frete pago voltou ao saldo.')
    expect(m.estado.envios[0]!.motivoDesconsideracao).toContain('peça o cancelamento à equipe do Real Olímpico')
    expect(m.estado.envios[0]!.motivoDesconsideracao).not.toContain('voltou ao saldo e a nota fiscal')
  })

  it('envio vencido ANTIGO cujo ÚNICO dinheiro é o 1º mês (o RO-ENV-0017): nem é candidato — nada é devolvido', async () => {
    const email = montar({ criadoEm: ANTIGO, envio: { frete: null, prePostagem: null, codigoRastreio: null } })

    const r = await desconsiderarEnviosVencidos(AGORA)

    expect(r.desconsiderados).toEqual([])
    expect(r.primeirosMesesEstornadosCents).toBe(0)
    expect(m.estado.users[email]!.balance).toBe(SALDO)
    expect(m.estado.faturasCustodia![0]!.status).toBe('paga')
  })

  it('envio vencido NOVO (criado a partir do corte): devolve frete + 1º mês e a nota do 1º mês entra em cancelamentosDeNfse', async () => {
    const email = montar({ criadoEm: CORTE })
    m.consultarPrePostagem.mockResolvedValue({ id: 'PRI0001', codigoObjeto: ETIQUETA.codigoObjeto, statusAtual: 2, descricao: '' })
    m.cancelarPrePostagem.mockResolvedValue(undefined)
    const antes = structuredClone(m.estado)

    const r = await desconsiderarEnviosVencidos(AGORA)

    expect(r).toMatchObject({ fretesEstornadosCents: FRETE, primeirosMesesEstornadosCents: PRIMEIRO_MES })
    expect(m.estado.users[email]!.balance).toBe(SALDO + FRETE + PRIMEIRO_MES)
    expect(cancelamentosDeNfse(antes, m.estado)).toEqual([expect.objectContaining({ chave: 'custodia:FAT-2026-11-rogerio-1' })])
  })

  it('a varredura refaz a etiqueta de envio já desconsiderado CONSULTANDO antes: 5 e 4 só anotam, 2 apaga, 3 e 1 esperam', async () => {
    montar({ envio: { desconsideradoEm: 6 } })
    for (const [status, deleteChamado, anotada] of [
      [5, false, true],
      [4, false, true],
      [2, true, true],
      [3, false, false],
      [1, false, false],
    ] as const) {
      m.estado.envios[0]!.prePostagem = { ...ETIQUETA, canceladaEm: null }
      m.consultarPrePostagem.mockReset()
      m.cancelarPrePostagem.mockReset()
      m.consultarPrePostagem.mockResolvedValue({ id: 'PRI0001', codigoObjeto: ETIQUETA.codigoObjeto, statusAtual: status, descricao: '' })
      m.cancelarPrePostagem.mockResolvedValue(undefined)

      const r = await desconsiderarEnviosVencidos(AGORA)

      expect(m.consultarPrePostagem, `status ${status}: consulta antes de qualquer DELETE`).toHaveBeenCalledTimes(1)
      expect(m.cancelarPrePostagem.mock.calls.length > 0, `status ${status}: DELETE`).toBe(deleteChamado)
      expect(Boolean(m.estado.envios[0]!.prePostagem?.canceladaEm), `status ${status}: canceladaEm`).toBe(anotada)
      if (!anotada) expect(r.aguardandoCorreios).toContain(PROTOCOLO)
    }
  })

  it('a consulta da etiqueta falha na varredura (rede): não mexe nela e tenta na próxima volta', async () => {
    montar({ envio: { desconsideradoEm: 6 } })
    m.consultarPrePostagem.mockRejectedValue(new Error('ETIMEDOUT'))

    await desconsiderarEnviosVencidos(AGORA)

    expect(m.cancelarPrePostagem).not.toHaveBeenCalled()
    expect(m.estado.envios[0]!.prePostagem?.canceladaEm).toBeNull()
  })

  it('envio vencido cujo ÚNICO dinheiro é o 1º mês, criado a partir do corte, passa a ser desconsiderado e devolvido', async () => {
    const email = montar({ criadoEm: HA_QUATRO_DIAS, envio: { frete: null, prePostagem: null, codigoRastreio: null } })

    const r = await desconsiderarEnviosVencidos(AGORA)

    expect(r.desconsiderados).toEqual([PROTOCOLO])
    expect(r.primeirosMesesEstornadosCents).toBe(PRIMEIRO_MES)
    expect(r.fretesEstornadosCents).toBe(0)
    expect(m.estado.users[email]!.balance).toBe(SALDO + PRIMEIRO_MES)
    expect(m.estado.faturasCustodia![0]!.status).toBe('cancelada')
    expect(m.estado.planosCustodia![0]!.status).toBe('cancelado')
    expect(m.estado.envios[0]!.motivoDesconsideracao).toContain('1º mês de custódia pago voltou ao saldo')
  })

  it('frete + 1º mês vencidos e sem postagem: voltam os dois, e a etiqueta é cancelada', async () => {
    const email = montar({ criadoEm: HA_QUATRO_DIAS })
    m.consultarPrePostagem.mockResolvedValue({ id: 'PRI0001', codigoObjeto: ETIQUETA.codigoObjeto, statusAtual: 2, descricao: '' })
    m.cancelarPrePostagem.mockResolvedValue(undefined)

    const r = await desconsiderarEnviosVencidos(AGORA)

    expect(r).toMatchObject({ desconsiderados: [PROTOCOLO], fretesEstornadosCents: FRETE, primeirosMesesEstornadosCents: PRIMEIRO_MES, prePostagensCanceladas: [PROTOCOLO] })
    expect(m.estado.users[email]!.balance).toBe(SALDO + FRETE + PRIMEIRO_MES)
  })

  it('rodar de novo não devolve de novo', async () => {
    const email = montar({ criadoEm: HA_QUATRO_DIAS, envio: { frete: null, prePostagem: null, codigoRastreio: null } })
    await desconsiderarEnviosVencidos(AGORA)
    const saldo = m.estado.users[email]!.balance

    const r2 = await desconsiderarEnviosVencidos(AGORA)

    expect(r2.desconsiderados).toEqual([])
    expect(m.estado.users[email]!.balance).toBe(saldo)
  })

  it('envio ainda dentro do prazo de 3 dias não é tocado', async () => {
    const email = montar({ criadoEm: CORTE, envio: { frete: null, prePostagem: null, codigoRastreio: null } })
    const r = await desconsiderarEnviosVencidos(CORTE + DIA)
    expect(r.desconsiderados).toEqual([])
    expect(m.estado.users[email]!.balance).toBe(SALDO)
  })

  it('não tenta cancelar nos Correios a etiqueta de envio JÁ POSTADO e cancelado pela equipe', async () => {
    montar({ envio: { etapaAtual: 'Envio postado', dataPostagem: 5, desconsideradoEm: 6, canceladoEm: 6, canceladoPor: 'equipe', motivoCancelamento: MOTIVO } })
    await desconsiderarEnviosVencidos()
    expect(m.cancelarPrePostagem).not.toHaveBeenCalled()
  })

  it('cancela no gateway o cartão de plano cancelado de envio encerrado e tira o id do plano', async () => {
    montar({ planoStatus: 'cancelado', assinaturaId: 'PRE-9', envio: { desconsideradoEm: 6, prePostagem: null } })

    const canceladas = await cancelarAssinaturasDeEnviosEncerrados()

    expect(canceladas).toEqual(['PRE-9'])
    expect(m.cancelarAssinaturaRecorrente).toHaveBeenCalledWith('PRE-9')
    expect(m.estado.planosCustodia![0]!.assinaturaId).toBeNull()
  })

  it('o gateway falha: o id do plano fica para a próxima volta', async () => {
    montar({ planoStatus: 'cancelado', assinaturaId: 'PRE-9', envio: { desconsideradoEm: 6, prePostagem: null } })
    m.cancelarAssinaturaRecorrente.mockResolvedValue({ ok: false, error: 'fora do ar' })

    expect(await cancelarAssinaturasDeEnviosEncerrados()).toEqual([])
    expect(m.estado.planosCustodia![0]!.assinaturaId).toBe('PRE-9')
  })

  it('plano VIGENTE de envio vivo nunca tem a assinatura mexida pela varredura', async () => {
    montar({ planoStatus: 'vigente', assinaturaId: 'PRE-9' })
    expect(await cancelarAssinaturasDeEnviosEncerrados()).toEqual([])
    expect(m.cancelarAssinaturaRecorrente).not.toHaveBeenCalled()
  })
})
