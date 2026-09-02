import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import {
  _resetIdempotenciaParaTestes,
  concluirEvento,
  executarComIdempotencia,
  tentarRegistrarEvento,
  verificarEventoJaProcessado,
} from './idempotencia'

describe('Controle de Idempotência — Webhooks e Depósitos (RA-07)', () => {
  beforeEach(() => {
    _resetIdempotenciaParaTestes()
  })

  it('permite registrar um novo evento pela primeira vez', async () => {
    const eventoId = 'evt-teste-001'
    const { podeProcessar, registro } = await tentarRegistrarEvento(eventoId, 'payment')

    expect(podeProcessar).toBe(true)
    expect(registro?.status).toBe('em_processamento')
  })

  it('recusa evento duplicado reenviado em sequência', async () => {
    const eventoId = 'evt-teste-002'

    // 1ª tentativa
    const r1 = await tentarRegistrarEvento(eventoId, 'payment')
    expect(r1.podeProcessar).toBe(true)
    await concluirEvento(eventoId, { valor: 5000 })

    // 2ª tentativa (reenvio do webhook pelo gateway)
    const r2 = await tentarRegistrarEvento(eventoId, 'payment')
    expect(r2.podeProcessar).toBe(false)
    expect(r2.registro?.status).toBe('processado')

    // 3ª tentativa
    const r3 = await tentarRegistrarEvento(eventoId, 'payment')
    expect(r3.podeProcessar).toBe(false)
  })

  it('CRITÉRIO RA-07: Webhook reenviado 3 vezes executa a função de crédito EXATAMENTE UMA VEZ', async () => {
    const eventoId = 'evt-webhook-triplo-003'
    let contadorCredito = 0

    const acaoCredito = async () => {
      contadorCredito++
      return { creditado: true, saldoNovo: 10000 }
    }

    // 1º envio do gateway
    const res1 = await executarComIdempotencia(eventoId, 'payment', acaoCredito)
    expect(res1.processado).toBe(true)
    expect(res1.jaExecutado).toBe(false)
    expect(res1.resultado).toEqual({ creditado: true, saldoNovo: 10000 })

    // 2º envio (retentativa de timeout)
    const res2 = await executarComIdempotencia(eventoId, 'payment', acaoCredito)
    expect(res2.processado).toBe(false)
    expect(res2.jaExecutado).toBe(true)
    expect(res2.resultado).toEqual({ creditado: true, saldoNovo: 10000 })

    // 3º envio (retentativa de rede)
    const res3 = await executarComIdempotencia(eventoId, 'payment', acaoCredito)
    expect(res3.processado).toBe(false)
    expect(res3.jaExecutado).toBe(true)

    // O efeito colateral (crédito) ocorreu RIGOROSAMENTE UMA ÚNICA VEZ
    expect(contadorCredito).toBe(1)
  })

  it('verifica corretamente se o evento já foi processado', async () => {
    const eventoId = 'evt-teste-004'
    expect(await verificarEventoJaProcessado(eventoId)).toBe(false)

    await tentarRegistrarEvento(eventoId, 'payment')
    expect(await verificarEventoJaProcessado(eventoId)).toBe(true)

    await concluirEvento(eventoId)
    expect(await verificarEventoJaProcessado(eventoId)).toBe(true)
  })
})
