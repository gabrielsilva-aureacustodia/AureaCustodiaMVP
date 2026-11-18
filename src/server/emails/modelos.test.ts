/**
 * Os textos dos e-mails: cada tipo monta, o tom é o da marca, nada proibido e nada sensível sai.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { brl } from '@/domain/money'

import { CATALOGO } from './catalogo'
import { montarEmail } from './modelos'
import type { DadosPorTipo, TipoDeEmail } from './tipos'

// Quinta-feira 18/11/2026, 01:30 UTC = quarta-feira 17/11/2026, 22:30 em Brasília.
const QUANDO = Date.UTC(2026, 10, 18, 1, 30)

const AMOSTRAS: { [K in TipoDeEmail]: DadosPorTipo[K] } = {
  compra: { nome: 'Maria', quantidade: 2, tipoMoeda: 'Direitos Humanos', valorMoedasCents: 40_000, comissaoCents: 400, custodiaCents: 400, totalCents: 40_800, data: QUANDO },
  venda: { nome: 'Maria', quantidade: 1, tipoMoeda: 'Direitos Humanos', valorCents: 20_000, comissaoCents: 200, liquidoCents: 19_800, data: QUANDO },
  deposito: { nome: 'Maria', valorCents: 50_000, metodo: 'pix', data: QUANDO },
  envio_postado: { nome: 'Maria', protocolo: 'RO-ENV-0007', quantidade: 3, tipoMoeda: 'Direitos Humanos', codigoRastreio: 'AP123456789BR' },
  envio_recebido: { nome: 'Maria', protocolo: 'RO-ENV-0007', quantidade: 3, tipoMoeda: 'Direitos Humanos' },
  moeda_aceita: { nome: 'Maria', protocoloEnvio: 'RO-ENV-0007', quantidade: 2, tipoMoeda: 'Direitos Humanos', codigos: ['RO-000900', 'RO-000901'], primeiroMesPago: true },
  moeda_recusada: { nome: 'Maria', protocoloEnvio: 'RO-ENV-0007', quantidade: 1, tipoMoeda: 'Direitos Humanos', motivos: ['Peso fora da tolerância'] },
  fatura_paga: { nome: 'Maria', faturaId: 'FAT-1', valorCents: 600, quantidadeMoedas: 3, competencia: '2026-11', forma: 'saldo', data: QUANDO },
  retirada_postada: { nome: 'Maria', retiradaId: 'RET-000007', coinId: 'RO-000900', codigoRastreio: 'AP987654321BR' },
  seguranca_senha: { nome: 'Maria', quando: QUANDO },
  seguranca_email: { nome: 'Maria', quando: QUANDO },
  seguranca_pix: { nome: 'Maria', quando: QUANDO, chaveMascarada: 'terminada em 8909' },
}

const TODOS = Object.keys(AMOSTRAS) as TipoDeEmail[]

/** O que o jurídico proibiu em texto de cliente (memória terminologia-juridica-aurea). */
const PROIBIDAS = /\b(token\w*|nft\w*|cripto\w*|ativos? digita\w+|investiment\w+|rentabilidade)\b/i

const montar = <K extends TipoDeEmail>(t: K) => montarEmail(t, AMOSTRAS[t])

let guardado: string | undefined
beforeEach(() => {
  guardado = process.env.NEXT_PUBLIC_APP_URL
  process.env.NEXT_PUBLIC_APP_URL = 'https://realolimpico.com.br'
})
afterEach(() => {
  if (guardado === undefined) delete process.env.NEXT_PUBLIC_APP_URL
  else process.env.NEXT_PUBLIC_APP_URL = guardado
})

describe('os doze e-mails', () => {
  it.each(TODOS)('%s: monta assunto e texto, com saudação, assinatura e link do site', (tipo) => {
    const { assunto, texto } = montar(tipo)
    expect(assunto.length).toBeGreaterThan(5)
    expect(assunto.length).toBeLessThanOrEqual(80)
    expect(texto.startsWith('Olá, Maria.')).toBe(true)
    expect(texto).toContain('Real Olímpico')
    expect(texto).toContain('https://realolimpico.com.br/')
  })

  it.each(TODOS)('%s: nenhuma palavra que o jurídico proibiu, nem no assunto nem no texto', (tipo) => {
    const { assunto, texto } = montar(tipo)
    expect(`${assunto}\n${texto}`).not.toMatch(PROIBIDAS)
  })

  it.each(TODOS)('%s: curto (cabe numa tela de celular sem rolar muito)', (tipo) => {
    expect(montar(tipo).texto.split('\n').length).toBeLessThanOrEqual(16)
  })

  it('só os avisos opcionais oferecem o caminho para escolher quais receber', () => {
    for (const tipo of TODOS) {
      const tem = montar(tipo).texto.includes('/conta/configuracoes')
      expect(tem, tipo).toBe(!CATALOGO[tipo].sempre)
    }
  })

  it('sem nome na conta, a saudação cai em "Olá." sem quebrar', () => {
    const { texto } = montarEmail('deposito', { ...AMOSTRAS.deposito, nome: null })
    expect(texto.startsWith('Olá.')).toBe(true)
  })

  it('tipo desconhecido falha com mensagem clara (o despacho trata como falha registrada)', () => {
    expect(() => montarEmail('nao_existe' as TipoDeEmail, {} as never)).toThrow(/desconhecido/)
  })
})

describe('o conteúdo de cada e-mail', () => {
  it('compra: mostra moedas, comissão, custódia do primeiro mês e o total', () => {
    const { assunto, texto } = montar('compra')
    expect(assunto).toBe('Compra concluída: 2 moedas')
    expect(texto).toContain(brl(40_000))
    expect(texto).toContain(`Comissão do Real Olímpico: ${brl(400)}`)
    expect(texto).toContain(`Custódia do primeiro mês: ${brl(400)}`)
    expect(texto).toContain(`Total pago: ${brl(40_800)}`)
  })

  it('compra sem custódia embutida não inventa a linha', () => {
    const { texto } = montarEmail('compra', { ...AMOSTRAS.compra, custodiaCents: 0, totalCents: 40_400 })
    expect(texto).not.toContain('Custódia do primeiro mês')
  })

  it('venda: mostra o líquido recebido', () => {
    const { assunto, texto } = montar('venda')
    expect(assunto).toBe('Venda concluída: 1 moeda')
    expect(texto).toContain(`Você recebeu: ${brl(19_800)}`)
  })

  it('a data sai no horário de Brasília, não no do servidor (UTC)', () => {
    expect(montar('compra').texto).toContain('17/11/2026 às 22:30')
    expect(montar('seguranca_senha').texto).toContain('17/11/2026 às 22:30')
  })

  it('depósito: valor e método', () => {
    expect(montar('deposito').texto).toContain(`${brl(50_000)} por Pix`)
    expect(montarEmail('deposito', { ...AMOSTRAS.deposito, metodo: 'cartao' }).texto).toContain('no cartão')
    expect(montarEmail('deposito', { ...AMOSTRAS.deposito, metodo: null }).texto).not.toMatch(/por Pix|no cartão/)
  })

  it('envio postado: protocolo e rastreio; sem rastreio não inventa a linha', () => {
    const { assunto, texto } = montar('envio_postado')
    expect(assunto).toBe('Seu envio RO-ENV-0007 foi postado')
    expect(texto).toContain('AP123456789BR')
    expect(montarEmail('envio_postado', { ...AMOSTRAS.envio_postado, codigoRastreio: null }).texto).not.toContain('Código de rastreio')
  })

  it('moeda aprovada: os códigos e, quando é o caso, o primeiro mês pago', () => {
    const { assunto, texto } = montar('moeda_aceita')
    expect(assunto).toBe('2 moedas aprovadas')
    expect(texto).toContain('RO-000900, RO-000901')
    expect(texto).toContain('O primeiro mês de custódia já está pago.')
    expect(montarEmail('moeda_aceita', { ...AMOSTRAS.moeda_aceita, primeiroMesPago: false }).texto).not.toContain('primeiro mês')
  })

  it('moeda recusada: o motivo', () => {
    const { assunto, texto } = montar('moeda_recusada')
    expect(assunto).toBe('Uma moeda não foi aprovada')
    expect(texto).toContain('Motivo: Peso fora da tolerância')
  })

  it('fatura paga: valor, competência e forma de pagamento', () => {
    const { assunto, texto } = montar('fatura_paga')
    expect(assunto).toBe(`Pagamento da custódia confirmado: ${brl(600)}`)
    expect(texto).toContain('referente a 11/2026')
    expect(texto).toContain('saldo da conta')
  })

  it('retirada postada: a retirada, a moeda e o rastreio', () => {
    const { assunto, texto } = montar('retirada_postada')
    expect(assunto).toBe('Sua retirada RET-000007 foi postada')
    expect(texto).toContain('RO-000900')
    expect(texto).toContain('AP987654321BR')
  })

  it('segurança: todos dizem o que fazer se NÃO foi o cliente', () => {
    for (const tipo of ['seguranca_senha', 'seguranca_email', 'seguranca_pix'] as const) {
      expect(montar(tipo).texto, tipo).toContain('Se não foi, fale agora com o nosso atendimento')
    }
  })

  it('troca de e-mail avisa que o aviso vai para o endereço anterior', () => {
    expect(montar('seguranca_email').texto).toContain('endereço anterior')
  })
})

describe('nada sensível sai por e-mail', () => {
  it('a chave Pix aparece só mascarada, nunca inteira', () => {
    const texto = montar('seguranca_pix').texto
    expect(texto).toContain('terminada em 8909')
    expect(texto).not.toMatch(/\d{3}\.\d{3}\.\d{3}-\d{2}/)
  })

  it('nenhum link carrega token ou dado do cliente: só o endereço da tela', () => {
    for (const tipo of TODOS) {
      const links = montar(tipo).texto.match(/https?:\/\/\S+/g) ?? []
      for (const l of links) {
        expect(l, tipo).not.toMatch(/[?&=]|token|senha=|@/i)
      }
    }
  })

  it('sem NEXT_PUBLIC_APP_URL o link cai no endereço local, sem barra duplicada', () => {
    delete process.env.NEXT_PUBLIC_APP_URL
    expect(montar('deposito').texto).toContain('http://localhost:3000/conta/extrato')
    process.env.NEXT_PUBLIC_APP_URL = 'https://realolimpico.com.br/'
    expect(montar('deposito').texto).toContain('https://realolimpico.com.br/conta/extrato')
    expect(montar('deposito').texto).not.toContain('br//conta')
  })
})
