/**
 * A capacidade e o tipo da caixa valem de verdade na entrada da moeda (05/10/2026).
 *
 * O Rogério registrou mais de 100 moedas na EB-001 e pôs Bandeira na caixa dos Direitos Humanos, e
 * nada barrou. Aqui o caminho INTEIRO é exercitado — fechar a análise e o cadastro direto —, com o
 * catálogo de caixas simulado: a moeda que não cabe é MOVIDA para a próxima caixa do tipo, e o que
 * não tem onde ficar volta com erro SEM gravar nada pela metade.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mutateStateMock, getStateMock, caixasMock } = vi.hoisted(() => ({
  mutateStateMock: vi.fn(),
  getStateMock: vi.fn(),
  caixasMock: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('@/server/state', () => ({ mutateState: mutateStateMock, getState: getStateMock }))
vi.mock('./caixas', () => ({ carregarCaixasParaAlocar: caixasMock }))

import type { CaixaCadastrada } from '@/domain/admin/caixas'
import { seedState } from '@/domain/seed'
import type { Analise, AppState, Envio } from '@/domain/types'

import { fecharAnalise } from './analise'
import { cadastrarMoedasDiretamente } from './cadastro-direto'

const BANDEIRA = 'Entrega da Bandeira Olímpica'
const DH = 'Direitos Humanos'
const DONO = 'rogeriopena@testeaurea.com.br'
const OPERADOR = 'gabriel.silva@aureacustodia.com.br'

const CATALOGO: CaixaCadastrada[] = [
  { codigo: 'DH-001', rotulo: '', local: '', capacidade: 100, ativa: true, criadoEm: 1, tipoMoeda: DH },
  { codigo: 'EB-001', rotulo: '', local: '', capacidade: 100, ativa: true, criadoEm: 1, tipoMoeda: BANDEIRA },
  { codigo: 'EB-002', rotulo: '', local: '', capacidade: 100, ativa: true, criadoEm: 1, tipoMoeda: BANDEIRA },
]

let state: AppState

/** Põe `n` moedas já guardadas na caixa, com análise e dono, como o cofre real as enxerga. */
function encher(caixa: string, tipo: string, n: number): void {
  for (let i = 1; i <= n; i++) {
    const id = `RO-${caixa}-${String(i).padStart(3, '0')}`
    state.users[DONO]!.coins.push({
      id,
      tipoMoeda: tipo,
      ano: 2012,
      entrada: '21/09/2026',
      statusFisico: 'Armazenado',
      statusDigital: 'Validado',
      valorEstimado: 28000,
      protocolo: 'RO-ENV-0000',
      recibo: { codigo: `REC-${id}`, hash: 'h', dataEmissao: '21/09/2026', status: 'Ativo' },
    })
    state.analises.push({
      protocolo: `RO-ANL-${caixa}-${i}`,
      protocoloEnvio: 'RO-ENV-0000',
      codigoMoeda: id,
      codigoRecibo: `REC-${id}`,
      tipoMoeda: tipo,
      veredito: 'aprovada',
      caixa,
      posicao: i,
      hash: 'h',
    } as unknown as Analise)
  }
}

function envio(parcial: Partial<Envio> = {}): Envio {
  return {
    protocolo: 'RO-ENV-9001',
    userEmail: DONO,
    tipoMoeda: BANDEIRA,
    ano: 2012,
    quantidade: 3,
    codigoRastreio: null,
    dataPostagem: null,
    dataRecebimento: 1,
    etapaAtual: 'Recebido pela custódia',
    createdAt: 1,
    codigosAtivosGerados: [],
    ...parcial,
  }
}

const aprovada = (caixa: string | null, posicao: number | null) => ({ pesoMg: 7000, veredito: 'aprovada' as const, caixa, posicao })

beforeEach(() => {
  state = seedState()
  state.analises = []
  mutateStateMock.mockReset()
  getStateMock.mockReset()
  caixasMock.mockReset()
  caixasMock.mockResolvedValue(CATALOGO)
  mutateStateMock.mockImplementation(async (mutator: (current: AppState) => unknown) => ({ state, result: await mutator(state) }))
  getStateMock.mockImplementation(async () => state)
})

describe('fecharAnalise respeita capacidade e tipo da caixa', () => {
  it('a moeda que não cabe na EB-001 vai para a EB-002; a que cabe fica onde o operador pôs', async () => {
    encher('EB-001', BANDEIRA, 99)
    state.envios = [envio({ quantidade: 3 })]

    const r = await fecharAnalise({
      protocolo: 'RO-ENV-9001',
      operador: OPERADOR,
      moedas: [aprovada('EB-001', 100), aprovada('EB-001', 101), aprovada('EB-001', 102)],
    })

    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.dados.realocadas).toBe(2)
    const novas = state.analises.slice(-3)
    expect(novas.map((a) => `${a.caixa}:${a.posicao}`)).toEqual(['EB-001:100', 'EB-002:1', 'EB-002:2'])
  })

  it('Bandeira digitada na caixa dos Direitos Humanos vai para a da Bandeira', async () => {
    state.envios = [envio({ quantidade: 1 })]

    const r = await fecharAnalise({ protocolo: 'RO-ENV-9001', operador: OPERADOR, moedas: [aprovada('DH-001', 5)] })

    expect(r.ok && r.dados.realocadas).toBe(1)
    expect(state.analises.at(-1)).toMatchObject({ caixa: 'EB-001', posicao: 1 })
  })

  it('sem vaga em nenhuma caixa do tipo: erro, e NADA é gravado pela metade', async () => {
    encher('EB-001', BANDEIRA, 100)
    encher('EB-002', BANDEIRA, 99)
    state.envios = [envio({ quantidade: 3 })]
    const analisesAntes = state.analises.length
    const moedasAntes = state.users[DONO]!.coins.length

    const r = await fecharAnalise({
      protocolo: 'RO-ENV-9001',
      operador: OPERADOR,
      moedas: [aprovada('EB-002', 100), aprovada('EB-002', 101), aprovada('EB-002', 102)],
    })

    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.status).toBe(409)
    expect(r.erro).toContain('Não há vaga')
    expect(state.analises).toHaveLength(analisesAntes)
    expect(state.users[DONO]!.coins).toHaveLength(moedasAntes)
    expect(state.envios[0]!.etapaAtual).toBe('Recebido pela custódia')
  })

  it('sem catálogo de caixas, vale o que o operador digitou — como sempre valeu', async () => {
    caixasMock.mockResolvedValue([])
    state.envios = [envio({ quantidade: 1 })]

    const r = await fecharAnalise({ protocolo: 'RO-ENV-9001', operador: OPERADOR, moedas: [aprovada('QUALQUER-1', 7)] })

    expect(r.ok && r.dados.realocadas).toBe(0)
    expect(state.analises.at(-1)).toMatchObject({ caixa: 'QUALQUER-1', posicao: 7 })
  })

  it('moeda recusada não ocupa caixa nenhuma', async () => {
    state.envios = [envio({ quantidade: 2 })]

    const r = await fecharAnalise({
      protocolo: 'RO-ENV-9001',
      operador: OPERADOR,
      moedas: [aprovada('EB-001', 1), { pesoMg: 7000, veredito: 'recusada', motivoRecusa: 'rachada', caixa: 'EB-001', posicao: 2 }],
    })

    expect(r.ok).toBe(true)
    const [boa, ruim] = state.analises.slice(-2)
    expect(boa).toMatchObject({ caixa: 'EB-001', posicao: 1 })
    expect(ruim).toMatchObject({ caixa: null, posicao: null })
  })
})

describe('cadastrarMoedasDiretamente respeita capacidade e tipo da caixa', () => {
  it('o lote que passa das 100 da EB-001 continua na EB-002, e a posição segue a ordem', async () => {
    encher('EB-001', BANDEIRA, 98)

    const r = await cadastrarMoedasDiretamente({
      userEmail: DONO,
      tipoMoeda: BANDEIRA,
      ano: 2012,
      quantidade: 5,
      operador: OPERADOR,
      caixa: 'EB-001',
    })

    expect(r.tipo).toBe('ok')
    if (r.tipo !== 'ok') return
    expect(r.realocadas).toBe(3)
    expect(state.analises.slice(-5).map((a) => `${a.caixa}:${a.posicao}`)).toEqual([
      'EB-001:99',
      'EB-001:100',
      'EB-002:1',
      'EB-002:2',
      'EB-002:3',
    ])
  })

  it('Direitos Humanos digitado na caixa da Bandeira vai para a DH-001', async () => {
    const r = await cadastrarMoedasDiretamente({
      userEmail: DONO,
      tipoMoeda: DH,
      ano: 1998,
      quantidade: 2,
      operador: OPERADOR,
      caixa: 'EB-001',
    })

    expect(r.tipo === 'ok' && r.realocadas).toBe(2)
    expect(state.analises.slice(-2).map((a) => `${a.caixa}:${a.posicao}`)).toEqual(['DH-001:1', 'DH-001:2'])
  })

  it('sem vaga: devolve o erro e não registra moeda nenhuma', async () => {
    encher('EB-001', BANDEIRA, 100)
    encher('EB-002', BANDEIRA, 100)
    const moedasAntes = state.users[DONO]!.coins.length

    const r = await cadastrarMoedasDiretamente({ userEmail: DONO, tipoMoeda: BANDEIRA, ano: 2012, quantidade: 2, operador: OPERADOR, caixa: 'EB-001' })

    expect(r.tipo).toBe('sem-vaga')
    expect(state.users[DONO]!.coins).toHaveLength(moedasAntes)
  })
})
