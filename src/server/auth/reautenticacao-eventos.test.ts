/**
 * Os eventos de segurança em `audit_log` — frente A, T5, 17/11/2026 (contrato A → C).
 *
 * O que se prova aqui, sem Postgres (o banco entra por um duplo):
 *  - o nome da ação é sempre `seguranca.<tipo>`, o prefixo que a frente C filtra;
 *  - a linha usa o e-mail ANTES da troca como ator e como entidade, e lista as duas contas na troca de e-mail;
 *  - sem banco configurado nada é gravado (store em memória/Redis não tem `audit_log`);
 *  - com banco, grava UM INSERT em `audit_log` na transação;
 *  - falha na gravação NUNCA lança: a troca de senha/e-mail/Pix já aconteceu e não pode ser desfeita por causa da trilha;
 *  - `camposBancariosAlterados` devolve NOMES de campo (nunca valores) e compara no mesmo formato nas duas pontas.
 *
 * Que as ações chamam o módulo no lugar certo e sem vazar segredo: `actions/reautenticacao-acoes.test.ts`
 * (comportamento) e `auth/reautenticacao-guardas.test.ts` (varredura do código).
 */

import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest'

const { bancoConfigurado, executarNoBanco } = vi.hoisted(() => ({
  bancoConfigurado: vi.fn(),
  executarNoBanco: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('@/server/db/client', () => ({ bancoConfigurado, executarNoBanco }))

import {
  camposBancariosAlterados,
  montarEventoDeSeguranca,
  nomeDoEventoDeSeguranca,
  PREFIXO_DOS_EVENTOS_DE_SEGURANCA,
  registrarEventoDeSeguranca,
  type TipoDeEventoDeSeguranca,
} from './reautenticacao-eventos'

const AGORA = 1_763_400_000_000

describe('nomeDoEventoDeSeguranca', () => {
  it('todo evento começa pelo prefixo que a frente C filtra', () => {
    const tipos: TipoDeEventoDeSeguranca[] = ['senha_alterada', 'email_alterado', 'pix_alterado']
    expect(tipos.map(nomeDoEventoDeSeguranca)).toEqual([
      'seguranca.senha_alterada',
      'seguranca.email_alterado',
      'seguranca.pix_alterado',
    ])
    for (const tipo of tipos) expect(nomeDoEventoDeSeguranca(tipo).startsWith(PREFIXO_DOS_EVENTOS_DE_SEGURANCA)).toBe(true)
  })
})

describe('montarEventoDeSeguranca', () => {
  it('troca de senha: ator e entidade são a própria conta, com o e-mail normalizado', () => {
    const linha = montarEventoDeSeguranca({ tipo: 'senha_alterada', conta: '  Rogeriopena@TesteAurea.com.br ' }, AGORA)

    expect(linha).toEqual({
      createdAt: AGORA,
      ator: 'rogeriopena@testeaurea.com.br',
      acao: 'seguranca.senha_alterada',
      entidade: 'conta',
      entidadeId: 'rogeriopena@testeaurea.com.br',
      usuariosAfetados: ['rogeriopena@testeaurea.com.br'],
      detalhes: {},
    })
  })

  it('troca de e-mail: a conta é o e-mail ANTIGO e as duas contas ficam em usuariosAfetados', () => {
    const linha = montarEventoDeSeguranca(
      {
        tipo: 'email_alterado',
        conta: 'antigo@exemplo.com.br',
        tambemAfeta: ['Novo@Exemplo.com.br'],
        detalhes: { de: 'antigo@exemplo.com.br', para: 'novo@exemplo.com.br', senhaDefinida: false, googleDesvinculado: false },
      },
      AGORA,
    )

    expect(linha.ator).toBe('antigo@exemplo.com.br')
    expect(linha.entidadeId).toBe('antigo@exemplo.com.br')
    expect(linha.usuariosAfetados).toEqual(['antigo@exemplo.com.br', 'novo@exemplo.com.br'])
    expect(linha.detalhes).toEqual({
      de: 'antigo@exemplo.com.br',
      para: 'novo@exemplo.com.br',
      senhaDefinida: false,
      googleDesvinculado: false,
    })
  })

  it('não repete a mesma conta em usuariosAfetados', () => {
    const linha = montarEventoDeSeguranca(
      { tipo: 'email_alterado', conta: 'a@exemplo.com.br', tambemAfeta: ['A@exemplo.com.br', 'b@exemplo.com.br', 'b@exemplo.com.br'] },
      AGORA,
    )

    expect(linha.usuariosAfetados).toEqual(['a@exemplo.com.br', 'b@exemplo.com.br'])
  })

  it('copia os detalhes: mexer na linha depois não altera o que a ação passou', () => {
    const detalhes = { campos: ['chavePix'] }
    const linha = montarEventoDeSeguranca({ tipo: 'pix_alterado', conta: 'a@exemplo.com.br', detalhes }, AGORA)

    ;(linha.detalhes as { campos: string[] }).campos = []

    expect(detalhes.campos).toEqual(['chavePix'])
  })
})

describe('registrarEventoDeSeguranca', () => {
  const consultas: Array<{ texto: string; valores: readonly unknown[] | undefined }> = []
  let aviso: MockInstance<typeof console.warn>

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(AGORA)
    consultas.length = 0
    bancoConfigurado.mockReset()
    executarNoBanco.mockReset()
    executarNoBanco.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        query: async (texto: string, valores?: readonly unknown[]) => {
          consultas.push({ texto, valores })
          return { rows: [] }
        },
      }),
    )
    aviso = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.useRealTimers()
    aviso.mockRestore()
  })

  it('sem Postgres não grava nada (o store em memória e o Redis não têm audit_log)', async () => {
    bancoConfigurado.mockReturnValue(false)

    await registrarEventoDeSeguranca({ tipo: 'senha_alterada', conta: 'a@exemplo.com.br' })

    expect(executarNoBanco).not.toHaveBeenCalled()
    expect(consultas).toHaveLength(0)
  })

  it('com Postgres grava UM INSERT em audit_log com a linha montada', async () => {
    bancoConfigurado.mockReturnValue(true)

    await registrarEventoDeSeguranca({
      tipo: 'pix_alterado',
      conta: 'a@exemplo.com.br',
      detalhes: { primeiroCadastro: false, campos: ['chavePix', 'tipoChavePix'] },
    })

    expect(executarNoBanco).toHaveBeenCalledTimes(1)
    expect(consultas).toHaveLength(1)
    expect(consultas[0]!.texto).toContain('.audit_log')
    expect(consultas[0]!.texto).toMatch(/INSERT INTO/)
    expect(consultas[0]!.valores).toEqual([
      AGORA,
      'a@exemplo.com.br',
      'seguranca.pix_alterado',
      'conta',
      'a@exemplo.com.br',
      ['a@exemplo.com.br'],
      JSON.stringify({ primeiroCadastro: false, campos: ['chavePix', 'tipoChavePix'] }),
    ])
  })

  it('falha do banco NÃO lança: vira aviso no log do servidor e a troca segue', async () => {
    bancoConfigurado.mockReturnValue(true)
    executarNoBanco.mockRejectedValue(new Error('conexão recusada'))

    await expect(registrarEventoDeSeguranca({ tipo: 'senha_alterada', conta: 'a@exemplo.com.br' })).resolves.toBeUndefined()

    expect(aviso).toHaveBeenCalledTimes(1)
    expect(String(aviso.mock.calls[0]![0])).toContain('seguranca.senha_alterada')
    expect(aviso.mock.calls[0]![1]).toBe('conexão recusada')
  })

  it('falha dentro da consulta também não lança', async () => {
    bancoConfigurado.mockReturnValue(true)
    executarNoBanco.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        query: async () => {
          throw new Error('relation audit_log does not exist')
        },
      }),
    )

    await expect(registrarEventoDeSeguranca({ tipo: 'email_alterado', conta: 'a@exemplo.com.br' })).resolves.toBeUndefined()
    expect(aviso).toHaveBeenCalledTimes(1)
  })
})

describe('camposBancariosAlterados — nomes de campo, nunca valores', () => {
  it('nada mudou: lista vazia', () => {
    expect(
      camposBancariosAlterados(
        { chavePix: '52998224725', tipoChavePix: 'cpf' },
        { chavePix: '52998224725', tipoChavePix: 'cpf' },
      ),
    ).toEqual([])
  })

  it('só a chave mudou (mesmo tipo): devolve só chavePix', () => {
    expect(
      camposBancariosAlterados(
        { chavePix: 'a@exemplo.com.br', tipoChavePix: 'email' },
        { chavePix: 'b@exemplo.com.br', tipoChavePix: 'email' },
      ),
    ).toEqual(['chavePix'])
  })

  it('trocar Pix de CPF para e-mail muda chave e tipo, na ordem fixa dos campos', () => {
    expect(
      camposBancariosAlterados(
        { chavePix: '52998224725', tipoChavePix: 'cpf' },
        { chavePix: 'novo@exemplo.com.br', tipoChavePix: 'email' },
      ),
    ).toEqual(['chavePix', 'tipoChavePix'])
  })

  it('espaço nas bordas e campo vazio contra ausente não contam como mudança', () => {
    expect(
      camposBancariosAlterados(
        { chavePix: '52998224725', tipoChavePix: 'cpf', banco: undefined },
        { chavePix: '  52998224725  ', tipoChavePix: 'cpf', banco: '' },
      ),
    ).toEqual([])
  })

  it('conta bancária: banco, agência, conta e tipo entram pelo nome', () => {
    expect(
      camposBancariosAlterados(
        { banco: '001', agencia: '1234', conta: '56789-0', tipoConta: 'corrente' },
        { banco: '237', agencia: '1234', conta: '99999-9', tipoConta: 'poupanca' },
      ),
    ).toEqual(['banco', 'conta', 'tipoConta'])
  })

  it('primeiro cadastro (antes ausente): lista só os campos que vieram preenchidos', () => {
    expect(camposBancariosAlterados(undefined, { chavePix: '52998224725', tipoChavePix: 'cpf' })).toEqual([
      'chavePix',
      'tipoChavePix',
    ])
  })

  it('o resultado nunca carrega o valor de nenhum campo', () => {
    const campos = camposBancariosAlterados({ chavePix: 'segredo-antigo' }, { chavePix: 'segredo-novo' })

    expect(JSON.stringify(campos)).not.toContain('segredo')
  })
})
