/**
 * O frete que se PAGA nasce com o acréscimo (frente K, 18/11/2026): `Envio.frete.valorCents` é o TOTAL cobrado
 * — o número que o saldo, o Pix, o cartão, o ledger e o estorno da frente H leem — e o preço do contrato fica
 * gravado à parte, para o Rogério conferir com a fatura dos Correios. A soma em si está provada em
 * src/lib/shipping/correios.test.ts; aqui se prova o que o servidor grava a partir dela. Os Correios e o estado
 * são dublês: nenhuma chamada real.
 */

import { describe, expect, it, vi } from 'vitest'

import type { Envio } from '@/domain/types'

vi.mock('server-only', () => ({}))

const m = vi.hoisted(() => ({ calcularFreteCorreios: vi.fn() }))

vi.mock('@/lib/shipping/correios', () => ({ calcularFreteCorreios: m.calcularFreteCorreios }))
vi.mock('@/lib/shipping/cws/prepostagem', () => ({
  consultarPrePostagem: vi.fn(),
  cancelarPrePostagem: vi.fn(),
  criarPrePostagem: vi.fn(),
}))
vi.mock('@/lib/shipping/cws/config', () => ({
  correiosConfigurado: () => true,
  SERVICOS_CORREIOS: { entrada: { PAC: '03301', SEDEX: '03247' }, saida: { PAC: '03298', SEDEX: '03220' } },
}))
vi.mock('@/lib/payments', () => ({ cancelarAssinaturaRecorrente: vi.fn() }))
vi.mock('@/server/state', () => ({ getState: vi.fn(), mutateState: vi.fn() }))

import { cotarFreteDoServidor } from './frete-envio'

const ENVIO = { protocolo: 'RO-ENV-0042', quantidade: 3 } as Envio
const AGORA = Date.UTC(2026, 10, 18, 15, 0, 0)

/** A resposta de `calcularFreteCorreios` para um SEDEX reverso de R$ 31,59 no contrato. */
function cotacao(acrescimoCents: number) {
  return {
    modalidade: 'SEDEX' as const,
    prazoDiasUteis: 1,
    valorFreteCents: 2885,
    valorSeguroCents: 274,
    valorContratoCents: 3159,
    acrescimoCents,
    valorTotalCents: 3159 + acrescimoCents,
    avisoRecebimento: false,
    maoPropria: false,
    origem: 'correios' as const,
    codigoServico: '03247',
  }
}

describe('cotarFreteDoServidor — o frete gravado com o acréscimo (frente K)', () => {
  it('grava o TOTAL em valorCents e o contrato e o acréscimo à parte', async () => {
    m.calcularFreteCorreios.mockResolvedValueOnce(cotacao(400))
    const r = await cotarFreteDoServidor(ENVIO, '01310-100', 'SEDEX', AGORA)
    expect(r.origem).toBe('correios')
    expect(r.frete).toMatchObject({
      modalidade: 'SEDEX',
      codigoServico: '03247',
      valorCents: 3559,
      valorContratoCents: 3159,
      acrescimoCents: 400,
      status: 'cotado',
      cotadoEm: AGORA,
      pagoEm: null,
    })
    // As duas partes sempre fecham com o total cobrado.
    expect(r.frete.valorContratoCents! + r.frete.acrescimoCents!).toBe(r.frete.valorCents)
  })

  it('parâmetro zerado: o total é o contrato, como antes da frente K', async () => {
    m.calcularFreteCorreios.mockResolvedValueOnce(cotacao(0))
    const r = await cotarFreteDoServidor(ENVIO, '01310-100', 'SEDEX', AGORA)
    expect(r.frete).toMatchObject({ valorCents: 3159, valorContratoCents: 3159, acrescimoCents: 0 })
  })

  it('cota a ENTRADA (logística reversa) com o pacote da quantidade congelada no protocolo', async () => {
    m.calcularFreteCorreios.mockResolvedValueOnce(cotacao(400))
    await cotarFreteDoServidor(ENVIO, '01310-100', 'SEDEX', AGORA)
    expect(m.calcularFreteCorreios).toHaveBeenLastCalledWith(
      expect.objectContaining({ sentido: 'entrada', quantidade: 3, modalidade: 'SEDEX', cepOrigem: '01310-100' }),
    )
  })
})
