/**
 * `contaDesativada` — a pergunta que as portas de entrada vão fazer. O que se testa é o lado
 * seguro de cada dúvida: sem banco, com banco falhando e para quem é da equipe, a resposta é
 * "ativa". A leitura da tabela está testada em banco.test.ts.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const m = vi.hoisted(() => ({
  bancoConfigurado: vi.fn(),
  executarNoBanco: vi.fn(),
  situacaoDaConta: vi.fn(),
  podeAbrirPainelAdmin: vi.fn(),
}))
vi.mock('@/server/db/client', () => ({ bancoConfigurado: m.bancoConfigurado, executarNoBanco: m.executarNoBanco }))
vi.mock('@/server/db/repositories/admin-usuarios', () => ({ situacaoDaConta: m.situacaoDaConta }))
vi.mock('./acesso', () => ({ podeAbrirPainelAdmin: m.podeAbrirPainelAdmin }))

import { contaDesativada } from './situacao'

const DESATIVADA = { ativa: false, motivo: 'pedido do titular', autor: 'gabriel@exemplo.com.br', em: 1 }

beforeEach(() => {
  for (const fn of Object.values(m)) fn.mockReset()
  m.bancoConfigurado.mockReturnValue(true)
  m.executarNoBanco.mockImplementation((fn: (tx: unknown) => unknown) => fn({}))
  m.podeAbrirPainelAdmin.mockResolvedValue(false)
})

describe('contaDesativada', () => {
  it('conta desativada pelo painel responde sim, com o e-mail normalizado', async () => {
    m.situacaoDaConta.mockResolvedValue(DESATIVADA)
    expect(await contaDesativada(' Cliente@Exemplo.com.br ')).toBe(true)
    expect(m.situacaoDaConta.mock.calls[0][1]).toBe('cliente@exemplo.com.br')
  })

  it('sem registro, reativada, sem banco ou sem e-mail: não', async () => {
    m.situacaoDaConta.mockResolvedValue(null)
    expect(await contaDesativada('cliente@exemplo.com.br')).toBe(false)
    m.situacaoDaConta.mockResolvedValue({ ...DESATIVADA, ativa: true })
    expect(await contaDesativada('cliente@exemplo.com.br')).toBe(false)
    m.bancoConfigurado.mockReturnValue(false)
    expect(await contaDesativada('cliente@exemplo.com.br')).toBe(false)
    expect(await contaDesativada(null)).toBe(false)
  })

  it('banco falhando e conta da equipe nunca contam como desativada', async () => {
    m.situacaoDaConta.mockRejectedValue(new Error('conexão caiu'))
    const erro = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    expect(await contaDesativada('cliente@exemplo.com.br')).toBe(false)
    erro.mockRestore()

    m.situacaoDaConta.mockResolvedValue(DESATIVADA)
    m.podeAbrirPainelAdmin.mockResolvedValue(true)
    expect(await contaDesativada('gabriel.silva@aureacustodia.com.br')).toBe(false)
  })
})
