import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getSessionEmailMock, mutateStateMock, getStateMock } = vi.hoisted(() => ({
  getSessionEmailMock: vi.fn(),
  mutateStateMock: vi.fn(),
  getStateMock: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('@/server/session', () => ({ getSessionEmail: getSessionEmailMock }))
vi.mock('@/server/state', () => ({ mutateState: mutateStateMock, getState: getStateMock }))

import { seedState } from '@/domain/seed'
import type { AppState, EnderecoEntrega } from '@/domain/types'
import { GENESIS } from '@/domain/hash'
import { verificarCadeia } from '@/domain/ledger'
import { derivarLancamentos, resumirParaAuditoria } from '@/server/db/derivar'
import { planejarDiff } from '@/server/db/diff'
import { gerarRelatorio } from '@/server/relatorios/dados'
import { _limparRetiradasMemoriaParaTestes } from '@/server/shipping/retiradas'
import {
  avancarStatusRetirada,
  bloquearReciboPorDebito,
  desbloquearRecibo,
  obterMinhasRetiradas,
  obterRetiradaPorCoin,
  solicitarRetirada,
} from './custody'

let state: AppState

const USER_EMAIL = 'gabrielsilva@testeaurea.com.br'
const OUTRO_USER = 'alex@testeaurea.com.br'

const ENDERECO_VALIDO: EnderecoEntrega = {
  nome: 'Gabriel Silva',
  cpfOuCnpj: '123.456.789-00',
  logradouro: 'Avenida Raja Gabaglia',
  numero: '2000',
  complemento: 'Sala 501',
  bairro: 'Estoril',
  cidade: 'Belo Horizonte',
  uf: 'MG',
  cep: '30494-170',
  telefone: '(31) 98888-7777',
}

beforeEach(() => {
  state = seedState()
  _limparRetiradasMemoriaParaTestes()
  getSessionEmailMock.mockReset()
  mutateStateMock.mockReset()
  getStateMock.mockReset()

  getSessionEmailMock.mockResolvedValue(USER_EMAIL)
  mutateStateMock.mockImplementation(async (mutator: (current: AppState) => unknown) => {
    const result = await mutator(state)
    return { state, result }
  })
  getStateMock.mockImplementation(async () => state)
})

describe('solicitarRetirada — Validações e Trava de Endereço (Trava 2)', () => {
  it('recusa se o usuário não estiver autenticado', async () => {
    getSessionEmailMock.mockResolvedValue(null)
    const res = await solicitarRetirada('RO-000001', 'comum', ENDERECO_VALIDO)
    expect(res.ok).toBe(false)
    expect(res.error).toBe('Sessão expirada.')
  })

  it('recusa se o endereço estiver incompleto (Trava 2 — o prazo não começa)', async () => {
    const enderecoIncompleto = { ...ENDERECO_VALIDO, logradouro: '', cep: '123' }
    const res = await solicitarRetirada('RO-000001', 'comum', enderecoIncompleto)
    expect(res.ok).toBe(false)
    expect(res.error).toContain('Endereço de entrega incompleto')
    expect(res.error).toContain('Sem endereço completo e confirmado o prazo D+30 não começa')
  })

  it('recusa se a modalidade for inválida', async () => {
    // @ts-expect-error teste de valor inválido
    const res = await solicitarRetirada('RO-000001', 'expresso_invalido', ENDERECO_VALIDO)
    expect(res.ok).toBe(false)
    expect(res.error).toContain('Modalidade de retirada inválida')
  })
})

describe('solicitarRetirada — Regras de Negócio e Máquina de Estados (Bloco 10)', () => {
  it('recusa se a moeda não pertencer ao usuário', async () => {
    const moedaOutro = state.users[OUTRO_USER].coins[0].id
    const res = await solicitarRetirada(moedaOutro, 'comum', ENDERECO_VALIDO)
    expect(res.ok).toBe(false)
    expect(res.error).toContain('Moeda não encontrada no seu acervo')
  })

  it('recusa se a moeda estiver anunciada em oferta de venda aberta', async () => {
    const moeda = state.users[USER_EMAIL].coins[0]
    state.sellOffers.push({
      id: 'OFFER-TEST',
      lotId: 'LOT-TEST',
      coinId: moeda.id,
      seller: USER_EMAIL,
      price: 30000,
      tipoMoeda: moeda.tipoMoeda,
      createdAt: Date.now(),
      obs: '',
    })

    const res = await solicitarRetirada(moeda.id, 'comum', ENDERECO_VALIDO)
    expect(res.ok).toBe(false)
    expect(res.error).toContain('Esta moeda está anunciada no mercado')
  })

  it('recusa se o recibo já estiver extinto', async () => {
    const moeda = state.users[USER_EMAIL].coins[0]
    moeda.recibo.status = 'Extinto'

    const res = await solicitarRetirada(moeda.id, 'comum', ENDERECO_VALIDO)
    expect(res.ok).toBe(false)
    expect(res.error).toContain('O recibo desta moeda já está extinto')
  })

  it('recusa se o saldo for insuficiente para a taxa', async () => {
    const moeda = state.users[USER_EMAIL].coins[0]
    state.users[USER_EMAIL].balance = 4000 // R$ 40,00 (menor que R$ 50,00 da comum)

    const res = await solicitarRetirada(moeda.id, 'comum', ENDERECO_VALIDO)
    expect(res.ok).toBe(false)
    expect(res.error).toContain('Saldo insuficiente para a taxa de retirada')
  })

  it('sucesso modalidade comum (D-1 R$ 50,00): debita saldo, extingue recibo e cria retirada com D+30', async () => {
    const moeda = state.users[USER_EMAIL].coins[0]
    const saldoAntes = state.users[USER_EMAIL].balance
    expect(moeda.recibo.status).toBe('Ativo')

    const res = await solicitarRetirada(moeda.id, 'comum', ENDERECO_VALIDO)
    expect(res.ok).toBe(true)
    expect(res.data?.retiradaId).toBeDefined()
    expect(res.data?.reciboCodigo).toBe(moeda.recibo.codigo)

    // Extinção imediata do recibo (Regra inegociável)
    expect(moeda.recibo.status).toBe('Extinto')

    // Saldo debitado em exatamente 5000 centavos (R$ 50,00)
    expect(state.users[USER_EMAIL].balance).toBe(saldoAntes - 5000)

    // Consulta retirada gravada
    const consulta = await obterRetiradaPorCoin(moeda.id)
    expect(consulta.ok).toBe(true)
    expect(consulta.data).not.toBeNull()
    expect(consulta.data?.modalidade).toBe('comum')
    expect(consulta.data?.valorTaxaCents).toBe(5000)
    expect(consulta.data?.status).toBe('paga')
    expect(consulta.data?.pagoEm).toBeTypeOf('number')
  })

  it('sucesso modalidade segura (D-1 R$ 180,00): debita saldo e extingue recibo', async () => {
    const moeda = state.users[USER_EMAIL].coins[1]
    state.users[USER_EMAIL].balance = 20000
    const saldoAntes = state.users[USER_EMAIL].balance

    const res = await solicitarRetirada(moeda.id, 'segura', ENDERECO_VALIDO)
    expect(res.ok).toBe(true)

    // Extinção imediata
    expect(moeda.recibo.status).toBe('Extinto')

    // Saldo debitado em R$ 180,00
    expect(state.users[USER_EMAIL].balance).toBe(saldoAntes - 18000)

    const consulta = await obterRetiradaPorCoin(moeda.id)
    expect(consulta.ok).toBe(true)
    expect(consulta.data?.modalidade).toBe('segura')
    expect(consulta.data?.valorTaxaCents).toBe(18000)
  })

  it('dois pedidos seguidos para a mesma moeda: o segundo é bloqueado por recibo extinto', async () => {
    const moeda = state.users[USER_EMAIL].coins[0]
    const p1 = await solicitarRetirada(moeda.id, 'comum', ENDERECO_VALIDO)
    expect(p1.ok).toBe(true)

    const p2 = await solicitarRetirada(moeda.id, 'comum', ENDERECO_VALIDO)
    expect(p2.ok).toBe(false)
    expect(p2.error).toContain('O recibo desta moeda já está extinto')
  })
})

describe('Consultas e Relatórios de Retiradas (Bloco 13)', () => {
  it('obterMinhasRetiradas lista as retiradas do usuário autenticado', async () => {
    const moeda = state.users[USER_EMAIL].coins[0]
    await solicitarRetirada(moeda.id, 'comum', ENDERECO_VALIDO)

    const minhas = await obterMinhasRetiradas()
    expect(minhas.ok).toBe(true)
    expect(minhas.data).toHaveLength(1)
    expect(minhas.data?.[0].coinId).toBe(moeda.id)
  })

  it('obterRetiradaPorCoin impede acesso a retirada de outro usuário', async () => {
    const moedaAlex = state.users[OUTRO_USER].coins[0]
    getSessionEmailMock.mockResolvedValue(OUTRO_USER)
    await solicitarRetirada(moedaAlex.id, 'comum', ENDERECO_VALIDO)

    // Gabriel tenta consultar retirada de Alex
    getSessionEmailMock.mockResolvedValue(USER_EMAIL)
    const consulta = await obterRetiradaPorCoin(moedaAlex.id)
    expect(consulta.ok).toBe(false)
    expect(consulta.error).toContain('não autorizado')
  })

  it('gerarRelatorio(retiradas) devolve tabela pronta para o Painel de Custódia e Auditoria', async () => {
    const moeda = state.users[USER_EMAIL].coins[0]
    await solicitarRetirada(moeda.id, 'comum', ENDERECO_VALIDO)

    const relatorio = await gerarRelatorio('retiradas')
    expect(relatorio.nome).toBe('retiradas')
    expect(relatorio.titulo).toBe('Retiradas físicas de custódia')
    expect(relatorio.linhas.length).toBeGreaterThanOrEqual(1)

    const linha = relatorio.linhas.find((l) => l.Coin_Id === moeda.id)
    expect(linha).toBeDefined()
    expect(linha?.Valor_Taxa).toBe(50) // R$ 50,00 convertido em reais
    expect(linha?.Modalidade).toBe('comum')
    expect(linha?.Status).toBe('paga')
    expect(linha?.Destinatario_Cidade).toBe('Belo Horizonte')
    expect(linha?.Destinatario_UF).toBe('MG')
  })

  it('prova que a mutação de retirada física gera lançamento no ledger com tipo taxa_retirada e auditoria acao retirada.solicitar', async () => {
    const antes = seedState()
    const depois = structuredClone(antes)
    const moeda = depois.users[USER_EMAIL].coins[0]
    const saldoAntes = depois.users[USER_EMAIL].balance

    // Mutação efetuada por solicitarRetirada
    moeda.recibo.status = 'Extinto'
    depois.users[USER_EMAIL].balance = saldoAntes - 5000 // débito R$ 50,00

    const ops = planejarDiff(antes, depois)
    expect(ops.some((o) => o.tipo === 'coin.atualizar')).toBe(true)
    expect(ops.some((o) => o.tipo === 'user.atualizar')).toBe(true)

    const agora = Date.now()
    const { lancamentos, ajustes } = derivarLancamentos({
      antes,
      depois,
      ops,
      semeadura: false,
      agora,
      hashAnterior: GENESIS,
    })

    // Não gera ajustes espúrios — o débito foi perfeitamente explicado
    expect(ajustes).toHaveLength(0)

    // Lançamento com tipo taxa_retirada e sinal negativo
    const lancamentoRetirada = lancamentos.find((l) => l.tipo === 'taxa_retirada')
    expect(lancamentoRetirada).toBeDefined()
    expect(lancamentoRetirada?.userEmail).toBe(USER_EMAIL)
    expect(lancamentoRetirada?.valor).toBe(5000)
    expect(lancamentoRetirada?.sinal).toBe(-1)
    expect(lancamentoRetirada?.saldoApos).toBe(saldoAntes - 5000)
    expect(lancamentoRetirada?.refInterna).toBe(moeda.id)

    // Hash encadeado válido
    expect(verificarCadeia(lancamentos, GENESIS).ok).toBe(true)

    // Resumo de auditoria
    const resumo = resumirParaAuditoria(ops, false, ajustes)
    expect(resumo.acao).toBe('retirada.solicitar')
    expect(resumo.usuariosAfetados).toContain(USER_EMAIL)
  })

  describe('avancarStatusRetirada', () => {
    it('avança o fluxo operacional: paga -> separacao -> postada -> entregue', async () => {
      const moeda = state.users[USER_EMAIL].coins[0]
      const criacao = await solicitarRetirada(moeda.id, 'comum', ENDERECO_VALIDO)
      expect(criacao.ok).toBe(true)
      const retiradaId = criacao.data!.retiradaId

      // 1. Avançar para separacao
      const emSeparacao = await avancarStatusRetirada(retiradaId, 'separacao')
      expect(emSeparacao.ok).toBe(true)
      expect(emSeparacao.data?.status).toBe('separacao')

      // 2. Rejeita postada sem código de rastreio
      const postadaSemRastreio = await avancarStatusRetirada(retiradaId, 'postada')
      expect(postadaSemRastreio.ok).toBe(false)
      expect(postadaSemRastreio.error).toContain('rastreamento')

      // 3. Avança para postada com código de rastreio
      const postada = await avancarStatusRetirada(retiradaId, 'postada', 'SL123456789BR')
      expect(postada.ok).toBe(true)
      expect(postada.data?.status).toBe('postada')
      expect(postada.data?.codigoRastreio).toBe('SL123456789BR')

      // 4. Avança para entregue
      const entregue = await avancarStatusRetirada(retiradaId, 'entregue')
      expect(entregue.ok).toBe(true)
      expect(entregue.data?.status).toBe('entregue')
    })

    it('rejeita avanço se a retirada não existir', async () => {
      const res = await avancarStatusRetirada('RET-INEXISTENTE', 'separacao')
      expect(res.ok).toBe(false)
      expect(res.error).toContain('não encontrada')
    })
  })

  describe('bloquearReciboPorDebito e desbloquearRecibo (C-5 / B-5)', () => {
    it('bloqueia o recibo, cancela oferta no mercado e impede retirada física', async () => {
      const moeda = state.users[USER_EMAIL].coins[0]

      // Simula oferta aberta para essa moeda
      state.sellOffers.push({
        id: 'OF-TEST-BLOQUEIO',
        lotId: 'LOT-TEST-BLOQUEIO',
        coinId: moeda.id,
        seller: USER_EMAIL,
        price: 35000,
        obs: 'Teste',
        createdAt: Date.now(),
        tipoMoeda: moeda.tipoMoeda,
      })

      // 1. Bloquear recibo
      const resBloqueio = await bloquearReciboPorDebito(moeda.id)
      expect(resBloqueio.ok).toBe(true)
      expect(resBloqueio.data?.status).toBe('Bloqueado')
      expect(moeda.recibo.status).toBe('Bloqueado')

      // Oferta foi cancelada e retirada do livro de ofertas
      expect(state.sellOffers.some((o) => o.coinId === moeda.id)).toBe(false)

      // 2. Tentativa de solicitar retirada com recibo bloqueado é recusada
      const resRetirada = await solicitarRetirada(moeda.id, 'comum', ENDERECO_VALIDO)
      expect(resRetirada.ok).toBe(false)
      expect(resRetirada.error).toContain('bloqueado por pendência administrativa ou financeira')

      // 3. Desbloquear recibo
      const resDesbloqueio = await desbloquearRecibo(moeda.id)
      expect(resDesbloqueio.ok).toBe(true)
      expect(resDesbloqueio.data?.status).toBe('Ativo')
      expect(moeda.recibo.status).toBe('Ativo')

      // 4. Agora a retirada é permitida
      const resRetirada2 = await solicitarRetirada(moeda.id, 'comum', ENDERECO_VALIDO)
      expect(resRetirada2.ok).toBe(true)
    })

    it('rejeita bloqueio ou desbloqueio de recibo já extinto', async () => {
      const moeda = state.users[USER_EMAIL].coins[0]
      moeda.recibo.status = 'Extinto'

      const bloq = await bloquearReciboPorDebito(moeda.id)
      expect(bloq.ok).toBe(false)
      expect(bloq.error).toContain('recibo já extinto')

      const desbloq = await desbloquearRecibo(moeda.id)
      expect(desbloq.ok).toBe(false)
      expect(desbloq.error).toContain('recibo já extinto')
    })
  })
})
