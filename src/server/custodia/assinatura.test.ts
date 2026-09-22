import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const { atualizarAssinaturaRecorrente, cancelarAssinaturaRecorrente } = vi.hoisted(() => ({
  atualizarAssinaturaRecorrente: vi.fn(),
  cancelarAssinaturaRecorrente: vi.fn(),
}))

vi.mock('@/lib/payments', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/payments')>()
  return {
    ...original,
    atualizarAssinaturaRecorrente,
    cancelarAssinaturaRecorrente,
  }
})

import { sincronizarAssinaturaCustodia } from './assinatura'
import { getState, mutateState } from '@/server/state'
import type { Coin } from '@/domain/types'

const EMAIL_TESTE = 'cliente_assinatura@testeaurea.com.br'

function criarMoeda(id: string): Coin {
  return {
    id,
    tipoMoeda: 'Entrega da Bandeira Olímpica',
    ano: 2016,
    entrada: '14/09/2026',
    statusFisico: 'Armazenado',
    statusDigital: 'Validado',
    valorEstimado: 20000,
    protocolo: 'RO-ENV-0001',
    recibo: {
      codigo: `REC-${id}`,
      hash: 'hash-fake',
      dataEmissao: '14/09/2026',
      status: 'Ativo',
    },
  }
}

describe('sincronizarAssinaturaCustodia', () => {
  beforeEach(async () => {
    atualizarAssinaturaRecorrente.mockReset()
    cancelarAssinaturaRecorrente.mockReset()

    await mutateState((s) => {
      s.users[EMAIL_TESTE] = {
        name: 'Cliente Assinatura',
        balance: 10000,
        coins: [criarMoeda('MOE-01'), criarMoeda('MOE-02')],
      }
      s.planosCustodia = [
        {
          id: 'PLC-ASS-01',
          userEmail: EMAIL_TESTE,
          protocoloEnvio: 'RO-ENV-0001',
          modalidade: 'mensal',
          quantidadeContratada: 2,
          moedaIds: ['MOE-01', 'MOE-02'],
          valorPorMoedaCents: 200,
          valorTotalCents: 400,
          parcelasMax: 1,
          inicioCompetencia: '2026-09',
          pagoAteCompetencia: '2026-09',
          status: 'vigente',
          formaPagamento: 'cartao',
          paymentIntentRef: null,
          assinaturaId: 'preapp_123456',
          estornadoCents: 0,
          criadoEm: Date.now(),
          atualizadoEm: Date.now(),
        },
      ]
      s.faturasCustodia = []
    })
  })

  it('retorna sem_assinatura_ativa se usuário não tem plano com assinaturaId', async () => {
    const res = await sincronizarAssinaturaCustodia('outro@teste.com')
    expect(res.sincronizado).toBe(false)
    expect(res.motivo).toBe('usuario_nao_encontrado')

    await mutateState((s) => {
      if (s.planosCustodia && s.planosCustodia[0]) {
        s.planosCustodia[0].assinaturaId = null
      }
    })
    const res2 = await sincronizarAssinaturaCustodia(EMAIL_TESTE)
    expect(res2.sincronizado).toBe(false)
    expect(res2.motivo).toBe('sem_assinatura_ativa')
  })

  it('não altera gateway se o número de moedas não mudou', async () => {
    const res = await sincronizarAssinaturaCustodia(EMAIL_TESTE)
    expect(res.sincronizado).toBe(true)
    expect(res.motivo).toBe('valor_inalterado')
    expect(atualizarAssinaturaRecorrente).not.toHaveBeenCalled()
    expect(cancelarAssinaturaRecorrente).not.toHaveBeenCalled()
  })

  it('aumenta valor da assinatura quando cliente adiciona moeda (+ R$ 2,00)', async () => {
    await mutateState((s) => {
      s.users[EMAIL_TESTE].coins.push(criarMoeda('MOE-03'))
    })
    atualizarAssinaturaRecorrente.mockResolvedValueOnce({ ok: true })

    const res = await sincronizarAssinaturaCustodia(EMAIL_TESTE)
    expect(res.sincronizado).toBe(true)
    expect(res.motivo).toBe('assinatura_atualizada')
    expect(atualizarAssinaturaRecorrente).toHaveBeenCalledWith('preapp_123456', 600) // 3 moedas * 200 = 600

    const s = await getState()
    const p = (s.planosCustodia ?? []).find((x) => x.id === 'PLC-ASS-01')
    expect(p?.quantidadeContratada).toBe(3)
    expect(p?.valorTotalCents).toBe(600)
    expect(p?.moedaIds).toEqual(['MOE-01', 'MOE-02', 'MOE-03'])
  })

  it('diminui valor da assinatura quando cliente vende ou retira moeda (- R$ 2,00)', async () => {
    await mutateState((s) => {
      s.users[EMAIL_TESTE].coins = [criarMoeda('MOE-01')]
    })
    atualizarAssinaturaRecorrente.mockResolvedValueOnce({ ok: true })

    const res = await sincronizarAssinaturaCustodia(EMAIL_TESTE)
    expect(res.sincronizado).toBe(true)
    expect(res.motivo).toBe('assinatura_atualizada')
    expect(atualizarAssinaturaRecorrente).toHaveBeenCalledWith('preapp_123456', 200) // 1 moeda * 200 = 200

    const s = await getState()
    const p = (s.planosCustodia ?? []).find((x) => x.id === 'PLC-ASS-01')
    expect(p?.quantidadeContratada).toBe(1)
    expect(p?.valorTotalCents).toBe(200)
  })

  it('cancela assinatura no Mercado Pago quando moedas ativas chegam a zero', async () => {
    await mutateState((s) => {
      s.users[EMAIL_TESTE].coins = []
    })
    cancelarAssinaturaRecorrente.mockResolvedValueOnce({ ok: true })

    const res = await sincronizarAssinaturaCustodia(EMAIL_TESTE)
    expect(res.sincronizado).toBe(true)
    expect(res.motivo).toBe('assinatura_cancelada')
    expect(cancelarAssinaturaRecorrente).toHaveBeenCalledWith('preapp_123456')

    const s = await getState()
    const p = (s.planosCustodia ?? []).find((x) => x.id === 'PLC-ASS-01')
    expect(p?.status).toBe('encerrado')
    expect(p?.moedaIds).toHaveLength(0)
  })

  it('trata falha de cancelamento no gateway sem quebrar o estado', async () => {
    await mutateState((s) => {
      s.users[EMAIL_TESTE].coins = []
    })
    cancelarAssinaturaRecorrente.mockResolvedValueOnce({ ok: false, error: 'Mercado Pago indisponível' })

    const res = await sincronizarAssinaturaCustodia(EMAIL_TESTE)
    expect(res.sincronizado).toBe(false)
    expect(res.motivo).toContain('Mercado Pago indisponível')
  })
})
