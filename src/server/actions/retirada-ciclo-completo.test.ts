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
  solicitarRetirada,
} from './custody'
import { NextRequest } from 'next/server'
import { publishOffer } from './sell'
import { GET as etiquetaRoute } from '@/app/api/retiradas/etiqueta/[id]/route'

let state: AppState

const CLIENTE = 'gabrielsilva@testeaurea.com.br'
const OPERADOR = 'alex@testeaurea.com.br'

const ENDERECO_COMPLETO: EnderecoEntrega = {
  nome: 'Gabriel Silva',
  cpfOuCnpj: '111.222.333-44',
  logradouro: 'Rua Rio de Janeiro',
  numero: '1000',
  complemento: 'Apto 1201',
  bairro: 'Centro',
  cidade: 'Belo Horizonte',
  uf: 'MG',
  cep: '30160-041',
  telefone: '(31) 99999-8888',
}

beforeEach(() => {
  state = seedState()
  _limparRetiradasMemoriaParaTestes()
  getSessionEmailMock.mockReset()
  mutateStateMock.mockReset()
  getStateMock.mockReset()

  getSessionEmailMock.mockResolvedValue(CLIENTE)
  mutateStateMock.mockImplementation(async (mutator: (current: AppState) => unknown) => {
    const result = await mutator(state)
    return { state, result }
  })
  getStateMock.mockImplementation(async () => state)
})

describe('Ciclo Completo de Retirada Física de Moedas (E2E Integration)', () => {
  it('executa a jornada ponta a ponta: solicitação -> extinção -> ledger -> etiqueta -> separação -> postagem com rastreio -> entrega', async () => {
    const usuario = state.users[CLIENTE]
    const moeda = usuario.coins[0]
    const saldoInicial = usuario.balance
    expect(saldoInicial).toBeGreaterThanOrEqual(5000)
    expect(moeda.recibo.status).toBe('Ativo')

    // -------------------------------------------------------------------------
    // Passo 1: Validações de segurança antes de prosseguir
    // -------------------------------------------------------------------------

    // 1a. Trava 2: Endereço incompleto impede início do prazo
    const enderecoIncompleto = { ...ENDERECO_COMPLETO, logradouro: '', cep: '' }
    const tentativaSemEndereco = await solicitarRetirada(moeda.id, 'comum', enderecoIncompleto)
    expect(tentativaSemEndereco.ok).toBe(false)
    expect(tentativaSemEndereco.error).toContain('Endereço de entrega incompleto')
    expect(tentativaSemEndereco.error).toContain('Sem endereço completo e confirmado o prazo D+30 não começa')

    // 1b. Bloqueio preventivo: Se o recibo estiver bloqueado por inadimplência, não sai
    await bloquearReciboPorDebito(moeda.id)
    expect(moeda.recibo.status).toBe('Bloqueado')
    const tentativaBloqueado = await solicitarRetirada(moeda.id, 'comum', ENDERECO_COMPLETO)
    expect(tentativaBloqueado.ok).toBe(false)
    expect(tentativaBloqueado.error).toContain('bloqueado por pendência')

    // Desbloqueia após regularização
    await desbloquearRecibo(moeda.id)
    expect(moeda.recibo.status).toBe('Ativo')

    // -------------------------------------------------------------------------
    // Passo 2: Solicitação confirmada e extinção imediata do recibo
    // -------------------------------------------------------------------------
    const resSolicitacao = await solicitarRetirada(moeda.id, 'comum', ENDERECO_COMPLETO)
    expect(resSolicitacao.ok).toBe(true)
    expect(resSolicitacao.data).toBeDefined()
    const { retiradaId, dataLimiteD30, reciboCodigo } = resSolicitacao.data!

    expect(retiradaId).toBeDefined()
    expect(reciboCodigo).toBe(moeda.recibo.codigo)
    // Prazo calculado em D+30
    const trintaDiasMs = 30 * 24 * 60 * 60 * 1000
    expect(dataLimiteD30).toBeGreaterThanOrEqual(Date.now() + trintaDiasMs - 5000)

    // Saldo debitado em exatamente R$ 50,00 (5000 centavos)
    expect(usuario.balance).toBe(saldoInicial - 5000)

    // O recibo foi extinto NO MESMO INSTANTE da confirmação
    expect(moeda.recibo.status).toBe('Extinto')

    // -------------------------------------------------------------------------
    // Passo 3: Invariantes do recibo extinto
    // -------------------------------------------------------------------------

    // 3a. Tentativa de solicitar segunda retirada para a mesma moeda falha
    const resSegundaTentativa = await solicitarRetirada(moeda.id, 'comum', ENDERECO_COMPLETO)
    expect(resSegundaTentativa.ok).toBe(false)
    expect(resSegundaTentativa.error).toContain('já está extinto')

    // 3b. Tentativa de colocar a moeda extinta à venda no marketplace falha
    const resVenda = await publishOffer([moeda.id], 50000, 'Tentativa de venda de moeda extinta')
    expect(resVenda.ok).toBe(false)
    expect(state.sellOffers.some((o) => o.coinId === moeda.id)).toBe(false)

    // -------------------------------------------------------------------------
    // Passo 4: Conferência contábil e auditoria no Ledger (sem ajustes espúrios)
    // -------------------------------------------------------------------------
    const antes = seedState()
    const depois = structuredClone(antes)
    depois.users[CLIENTE].coins[0].recibo.status = 'Extinto'
    depois.users[CLIENTE].balance -= 5000

    const ops = planejarDiff(antes, depois)
    const agora = Date.now()
    const { lancamentos, ajustes } = derivarLancamentos({
      antes,
      depois,
      ops,
      semeadura: false,
      agora,
      hashAnterior: GENESIS,
    })

    // Zero ajustes espúrios: a contabilidade bateu perfeitamente
    expect(ajustes).toHaveLength(0)

    const lancamentoRetirada = lancamentos.find((l) => l.tipo === 'taxa_retirada')
    expect(lancamentoRetirada).toBeDefined()
    expect(lancamentoRetirada?.valor).toBe(5000)
    expect(lancamentoRetirada?.sinal).toBe(-1)
    expect(verificarCadeia(lancamentos, GENESIS).ok).toBe(true)

    const auditoria = resumirParaAuditoria(ops, false, ajustes)
    expect(auditoria.acao).toBe('retirada.solicitar')

    // -------------------------------------------------------------------------
    // Passo 5: Geração da etiqueta postal oficial (Caixa Postal 7990 BH)
    // -------------------------------------------------------------------------
    // Chamada à rota como cliente
    const reqCliente = new NextRequest(`http://localhost/api/retiradas/etiqueta/${retiradaId}?format=json`)
    const resEtiqueta = await etiquetaRoute(reqCliente, { params: Promise.resolve({ id: retiradaId }) })
    expect(resEtiqueta.status).toBe(200)
    const dadosEtiqueta = await resEtiqueta.json()

    expect(dadosEtiqueta.ok).toBe(true)
    const { remetente, destinatario, modalidade } = dadosEtiqueta.data

    expect(remetente.nome).toContain('AUREA CUSTODIA LTDA')
    expect(remetente.logradouro).toContain('Caixa Postal 7990')
    expect(remetente.cep).toBe('30315-970')
    expect(remetente.cidade).toBe('Belo Horizonte')
    expect(remetente.uf).toBe('MG')

    expect(destinatario.nome).toBe(ENDERECO_COMPLETO.nome)
    expect(destinatario.cep).toBe(ENDERECO_COMPLETO.cep)
    expect(destinatario.cidade).toBe(ENDERECO_COMPLETO.cidade)
    expect(modalidade).toBe('comum')

    // -------------------------------------------------------------------------
    // Passo 6: Avanço da esteira de expedição pelo operador
    // -------------------------------------------------------------------------
    getSessionEmailMock.mockResolvedValue(OPERADOR)

    // 6a. Avanço para separação física
    const resSeparacao = await avancarStatusRetirada(retiradaId, 'separacao')
    expect(resSeparacao.ok).toBe(true)
    expect(resSeparacao.data?.status).toBe('separacao')

    // 6b. Postagem sem código de rastreio deve ser rejeitada
    const resPostagemInvalida = await avancarStatusRetirada(retiradaId, 'postada')
    expect(resPostagemInvalida.ok).toBe(false)
    expect(resPostagemInvalida.error).toContain('rastreamento postal é obrigatório')

    // 6c. Postagem com código de rastreio válido
    const CODIGO_RASTREIO = 'QB987654321BR'
    const resPostada = await avancarStatusRetirada(retiradaId, 'postada', CODIGO_RASTREIO)
    expect(resPostada.ok).toBe(true)
    expect(resPostada.data?.status).toBe('postada')
    expect(resPostada.data?.codigoRastreio).toBe(CODIGO_RASTREIO)

    // 6d. Confirmação de entrega final
    const resEntregue = await avancarStatusRetirada(retiradaId, 'entregue')
    expect(resEntregue.ok).toBe(true)
    expect(resEntregue.data?.status).toBe('entregue')

    // Histórico completo de transições auditado
    expect(resEntregue.data?.historico.length).toBeGreaterThanOrEqual(4)
    expect(resEntregue.data?.historico.some((h) => h.para === 'paga')).toBe(true)
    expect(resEntregue.data?.historico.some((h) => h.para === 'separacao')).toBe(true)
    expect(resEntregue.data?.historico.some((h) => h.para === 'postada')).toBe(true)
    expect(resEntregue.data?.historico.some((h) => h.para === 'entregue')).toBe(true)

    // -------------------------------------------------------------------------
    // Passo 7: Relatório consolidado para o Painel de Custódia
    // -------------------------------------------------------------------------
    const relatorio = await gerarRelatorio('retiradas')
    const linha = relatorio.linhas.find((l) => l.Id === retiradaId)
    expect(linha).toBeDefined()
    expect(linha?.Status).toBe('entregue')
    expect(linha?.Codigo_Rastreio).toBe(CODIGO_RASTREIO)
    expect(linha?.Valor_Taxa).toBe(50)
  })
})
