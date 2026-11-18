/**
 * `cancelarMeuEnvio` — a porta do cliente. A regra de dinheiro está em src/domain/cancelar-envio.test.ts e a
 * ordem com Correios e cartão em src/server/shipping/cancelar-envio.test.ts; aqui se prova só o que esta
 * Server Action tem de seu: QUEM está pedindo (a sessão), que o cliente nunca se passa por "equipe", e o que
 * a tela recebe de volta.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const m = vi.hoisted(() => ({ getSessionEmail: vi.fn(), cancelarEnvioNoServidor: vi.fn() }))
vi.mock('@/server/session', () => ({ getSessionEmail: m.getSessionEmail }))
vi.mock('@/server/shipping/cancelar-envio', () => ({ cancelarEnvioNoServidor: m.cancelarEnvioNoServidor }))

import { cancelarMeuEnvio } from './cancelar-envio'

const MOTIVO = 'Não vou mais enviar estas moedas.'

const RESUMO = {
  protocolo: 'RO-ENV-0017',
  por: 'cliente' as const,
  motivo: MOTIVO,
  jaPostado: false,
  freteEstornadoCents: 2_114,
  freteRetidoCents: 0,
  primeiroMesEstornadoCents: 3_000,
  primeiroMesCanceladoCents: 0,
  totalAoSaldoCents: 5_114,
  faturaIds: ['FAT-1'],
  planoIds: ['PLC-1'],
  assinaturaIds: [],
  prePostagemACancelar: null,
  avisoDoMes: null,
}

describe('cancelarMeuEnvio', () => {
  beforeEach(() => {
    m.getSessionEmail.mockReset()
    m.cancelarEnvioNoServidor.mockReset()
  })

  it('sem sessão: recusa e não chama o cancelamento', async () => {
    m.getSessionEmail.mockResolvedValue(null)

    const r = await cancelarMeuEnvio('RO-ENV-0017', MOTIVO)

    expect(r).toEqual({ ok: false, error: 'Sessão expirada.' })
    expect(m.cancelarEnvioNoServidor).not.toHaveBeenCalled()
  })

  it('protocolo vazio: recusa antes de qualquer coisa', async () => {
    m.getSessionEmail.mockResolvedValue('rogerio@exemplo.com')
    expect((await cancelarMeuEnvio('   ', MOTIVO)).ok).toBe(false)
    expect(m.cancelarEnvioNoServidor).not.toHaveBeenCalled()
  })

  it('passa a SESSÃO como dono esperado e "cliente" como quem cancela', async () => {
    m.getSessionEmail.mockResolvedValue('rogerio@exemplo.com')
    m.cancelarEnvioNoServidor.mockResolvedValue({ ok: true, jaCancelado: false, resumo: RESUMO, mensagem: 'Envio cancelado.', etiqueta: 'cancelada', titular: 'rogerio@exemplo.com' })

    await cancelarMeuEnvio(' RO-ENV-0017 ', MOTIVO)

    expect(m.cancelarEnvioNoServidor).toHaveBeenCalledWith({
      protocolo: 'RO-ENV-0017',
      por: 'cliente',
      motivo: MOTIVO,
      donoEsperado: 'rogerio@exemplo.com',
    })
  })

  it('o cliente não consegue se passar pela equipe nem trocar o dono por argumento extra', async () => {
    m.getSessionEmail.mockResolvedValue('rogerio@exemplo.com')
    m.cancelarEnvioNoServidor.mockResolvedValue({ ok: false, erro: 'Envio não encontrado.' })

    const forjada = cancelarMeuEnvio as unknown as (...args: unknown[]) => Promise<unknown>
    await forjada('RO-ENV-0017', MOTIVO, 'equipe', 'outra@conta.com')

    const pedido = m.cancelarEnvioNoServidor.mock.calls[0]![0]
    expect(pedido.por).toBe('cliente')
    expect(pedido.donoEsperado).toBe('rogerio@exemplo.com')
  })

  it('recusa do domínio (já postado, moeda aceita, motivo curto…) chega à tela como erro', async () => {
    m.getSessionEmail.mockResolvedValue('rogerio@exemplo.com')
    m.cancelarEnvioNoServidor.mockResolvedValue({ ok: false, erro: 'Este envio já foi postado nos Correios e não pode mais ser cancelado por aqui.' })

    const r = await cancelarMeuEnvio('RO-ENV-0017', MOTIVO)

    expect(r).toEqual({ ok: false, error: 'Este envio já foi postado nos Correios e não pode mais ser cancelado por aqui.' })
  })

  it('sucesso: a mensagem pronta para o toast e o que voltou ao saldo', async () => {
    m.getSessionEmail.mockResolvedValue('rogerio@exemplo.com')
    m.cancelarEnvioNoServidor.mockResolvedValue({ ok: true, jaCancelado: false, resumo: RESUMO, mensagem: 'Envio cancelado. R$ 51,14 voltaram ao saldo.', etiqueta: 'cancelada', titular: 'rogerio@exemplo.com' })

    const r = await cancelarMeuEnvio('RO-ENV-0017', MOTIVO)

    expect(r).toEqual({
      ok: true,
      message: 'Envio cancelado. R$ 51,14 voltaram ao saldo.',
      data: {
        protocolo: 'RO-ENV-0017',
        freteEstornadoCents: 2_114,
        primeiroMesEstornadoCents: 3_000,
        totalAoSaldoCents: 5_114,
        etiqueta: 'cancelada',
        jaCancelado: false,
      },
    })
  })

  it('duplo clique: a segunda resposta diz que já estava cancelado', async () => {
    m.getSessionEmail.mockResolvedValue('rogerio@exemplo.com')
    m.cancelarEnvioNoServidor.mockResolvedValue({ ok: true, jaCancelado: true, resumo: RESUMO, mensagem: 'Este envio já estava cancelado.', etiqueta: 'nao_havia', titular: 'rogerio@exemplo.com' })

    const r = await cancelarMeuEnvio('RO-ENV-0017', MOTIVO)

    expect(r.ok && r.data?.jaCancelado).toBe(true)
  })
})
