/**
 * O laço do diálogo de confirmação, sem React (frente A, 17/11/2026).
 *
 * O que a tela garante ao cliente quando uma ação sensível pede a senha:
 *  - só pergunta quando o servidor pediu (sucesso, recusa de regra e sessão vencida passam direto);
 *  - a ação é reenviada UMA vez, depois que a pessoa confirma, e o resultado final é o da segunda chamada;
 *  - desistir não é falha: volta `{ ok:false }` sem texto e a ação não é chamada de novo;
 *  - nunca abre um segundo diálogo em laço.
 *
 * A parte visual (foco, Esc, 44 px, claro e escuro) não se prova em vitest de nó: fica para a conferência de tela
 * depois do deploy (regra de 17/11/2026 — sem servidor local).
 */

import { describe, expect, it, vi } from 'vitest'

import type { ActionResult } from '@/domain/types'

import {
  CONFIRMACAO_NAO_RECONHECIDA,
  executarComConfirmacao,
  pedeConfirmacao,
  type BloqueioDeConfirmacao,
} from './confirmacao'

const PEDE_SENHA: BloqueioDeConfirmacao = { ok: false, precisaSenha: true, nivel: 'sempre', metodo: 'senha' }

describe('pedeConfirmacao — reconhece o pedido do servidor', () => {
  it('reconhece os quatro formatos válidos', () => {
    for (const nivel of ['sempre', 'janela'] as const) {
      for (const metodo of ['senha', 'codigo'] as const) {
        expect(pedeConfirmacao({ ok: false, precisaSenha: true, nivel, metodo })).toBe(true)
      }
    }
  })

  it('não confunde com sucesso, erro comum nem sessão vencida', () => {
    expect(pedeConfirmacao({ ok: true })).toBe(false)
    expect(pedeConfirmacao({ ok: false, error: 'Saldo insuficiente.' })).toBe(false)
    expect(pedeConfirmacao({ ok: false, error: 'Sessão expirada.' })).toBe(false)
  })

  it('recusa pedido mal formado (nível ou método desconhecido, ok verdadeiro, lixo)', () => {
    expect(pedeConfirmacao({ ok: false, precisaSenha: true, nivel: 'sempre' })).toBe(false)
    expect(pedeConfirmacao({ ok: false, precisaSenha: true, nivel: 'sempre', metodo: 'biometria' })).toBe(false)
    expect(pedeConfirmacao({ ok: false, precisaSenha: true, nivel: 'nunca', metodo: 'senha' })).toBe(false)
    expect(pedeConfirmacao({ ok: true, precisaSenha: true, nivel: 'sempre', metodo: 'senha' })).toBe(false)
    expect(pedeConfirmacao({ ok: false, precisaSenha: 'sim', nivel: 'sempre', metodo: 'senha' })).toBe(false)
    expect(pedeConfirmacao(null)).toBe(false)
    expect(pedeConfirmacao(undefined)).toBe(false)
    expect(pedeConfirmacao('precisaSenha')).toBe(false)
  })
})

describe('executarComConfirmacao — chama, pergunta, reenvia', () => {
  it('ação que não pede confirmação: o resultado passa direto e ninguém é perguntado', async () => {
    const acao = vi.fn().mockResolvedValue({ ok: true, message: 'Feito.' })
    const perguntar = vi.fn()

    const res = await executarComConfirmacao(acao, perguntar)

    expect(res).toEqual({ ok: true, message: 'Feito.' })
    expect(acao).toHaveBeenCalledTimes(1)
    expect(perguntar).not.toHaveBeenCalled()
  })

  it('recusa de regra de negócio e sessão vencida também passam direto (não abrem diálogo)', async () => {
    const perguntar = vi.fn()
    for (const recusa of [{ ok: false, error: 'Saldo insuficiente.' }, { ok: false, error: 'Sessão expirada.' }]) {
      const acao = vi.fn().mockResolvedValue(recusa)
      expect(await executarComConfirmacao(acao, perguntar)).toEqual(recusa)
      expect(acao).toHaveBeenCalledTimes(1)
    }
    expect(perguntar).not.toHaveBeenCalled()
  })

  it('pede confirmação: pergunta com o nível e o método do servidor e reenvia a MESMA ação uma vez', async () => {
    const acao = vi
      .fn<() => Promise<ActionResult<{ saqueId: string }>>>()
      .mockResolvedValueOnce({ ...PEDE_SENHA })
      .mockResolvedValueOnce({ ok: true, data: { saqueId: 'SAQ-1' } })
    const perguntar = vi.fn().mockResolvedValue(true)

    const res = await executarComConfirmacao(acao, perguntar)

    expect(perguntar).toHaveBeenCalledTimes(1)
    expect(perguntar).toHaveBeenCalledWith('sempre', 'senha')
    expect(acao).toHaveBeenCalledTimes(2)
    expect(res).toEqual({ ok: true, data: { saqueId: 'SAQ-1' } })
  })

  it('conta só Google: o método "codigo" chega ao diálogo', async () => {
    const acao = vi
      .fn<() => Promise<ActionResult>>()
      .mockResolvedValueOnce({ ok: false, precisaSenha: true, nivel: 'janela', metodo: 'codigo' } as BloqueioDeConfirmacao)
      .mockResolvedValueOnce({ ok: true })
    const perguntar = vi.fn().mockResolvedValue(true)

    await executarComConfirmacao(acao, perguntar)

    expect(perguntar).toHaveBeenCalledWith('janela', 'codigo')
  })

  it('o resultado final é o da SEGUNDA chamada, mesmo quando ela é uma recusa de regra', async () => {
    const acao = vi
      .fn<() => Promise<ActionResult>>()
      .mockResolvedValueOnce({ ...PEDE_SENHA })
      .mockResolvedValueOnce({ ok: false, error: 'Saldo insuficiente para saque.' })

    const res = await executarComConfirmacao(acao, vi.fn().mockResolvedValue(true))

    expect(res).toEqual({ ok: false, error: 'Saldo insuficiente para saque.' })
  })

  it('desistir NÃO é falha: devolve { ok:false } sem texto e a ação não é chamada de novo', async () => {
    const acao = vi.fn<() => Promise<ActionResult>>().mockResolvedValue({ ...PEDE_SENHA })
    const perguntar = vi.fn().mockResolvedValue(false)

    const res = await executarComConfirmacao(acao, perguntar)

    expect(res).toEqual({ ok: false })
    expect(res.error).toBeUndefined()
    expect(res.message).toBeUndefined()
    expect(acao).toHaveBeenCalledTimes(1)
  })

  it('se a ação AINDA pede confirmação depois de confirmada, devolve erro e não abre outro diálogo', async () => {
    const acao = vi.fn<() => Promise<ActionResult>>().mockResolvedValue({ ...PEDE_SENHA })
    const perguntar = vi.fn().mockResolvedValue(true)

    const res = await executarComConfirmacao(acao, perguntar)

    expect(res).toEqual({ ok: false, error: CONFIRMACAO_NAO_RECONHECIDA })
    expect(perguntar).toHaveBeenCalledTimes(1)
    expect(acao).toHaveBeenCalledTimes(2)
  })

  it('erro de rede na ação não é engolido (quem chama, como o run(), trata)', async () => {
    const acao = vi.fn().mockRejectedValue(new Error('rede fora do ar'))

    await expect(executarComConfirmacao(acao, vi.fn())).rejects.toThrow('rede fora do ar')
  })
})
