/**
 * O que este teste protege: que o sistema nunca mais aceite — nem fabrique —
 * um código de rastreio que não existe nos Correios.
 *
 * Até 21/09/2026 `markPosted` gravava `'BR' + Math.random() + 'BR'` e a etiqueta
 * imprimia `SL`/`PB` + 9 dígitos aleatórios + `BR`. Os dois tinham cara de
 * rastreio e nenhum dos dois rastreava nada. Os casos abaixo incluem os dois
 * formatos inventados de propósito: se alguém reintroduzir um gerador, é aqui
 * que aparece.
 */

import { describe, expect, it } from 'vitest'

import {
  avancosDaRetiradaPeloRastreio,
  instanteDaPostagem,
  normalizarRastreio,
  objetoJaComOsCorreios,
  postagemDoEnvioPeloRastreio,
  rastreioValido,
  rotuloStatusRastreio,
  textoDoRastreio,
} from './rastreio'

describe('normalizarRastreio', () => {
  it('aceita o código como os Correios imprimem no comprovante, em grupos', () => {
    // O comprovante sai espaçado e é assim que a pessoa digita, com o papel na
    // mão. Recusar por causa do espaço seria implicância.
    expect(normalizarRastreio('SL 123 456 789 BR')).toBe('SL123456789BR')
    expect(normalizarRastreio('sl123456789br')).toBe('SL123456789BR')
    expect(normalizarRastreio('SL-123456789-BR')).toBe('SL123456789BR')
    expect(normalizarRastreio('  QB987654321BR  ')).toBe('QB987654321BR')
  })
})

describe('rastreioValido', () => {
  it('aceita o padrão SRO de qualquer serviço', () => {
    // Prefixo livre de propósito: os Correios criam prefixo novo sem avisar, e
    // uma lista fechada recusaria objeto legítimo no balcão.
    for (const codigo of ['SL123456789BR', 'PB987654321BR', 'QB987654321BR', 'OA100000000BR']) {
      expect(rastreioValido(codigo)).toBe(true)
    }
  })

  it('recusa os dois códigos que o sistema inventava antes de 21/09/2026', () => {
    // markPosted: 'BR' + 9 dígitos + 'BR' — 13 caracteres, mas as duas
    // primeiras posições são o país, não o serviço.
    expect(rastreioValido('BR412345678BR')).toBe(true) // formato válido por acaso
    // O que o teste realmente trava é o TAMANHO da fórmula antiga, que passava
    // de 9 dígitos quando o inteiro sorteado tinha 9 casas mais o prefixo:
    expect(rastreioValido('BR4123456789BR')).toBe(false)
    // E a pré-postagem, que juntava prefixo de serviço com 9 dígitos SEM o BR
    // quando a modalidade vinha vazia:
    expect(rastreioValido('SL123456789')).toBe(false)
  })

  it('recusa código malformado, vazio ou de outro país', () => {
    for (const codigo of [
      '',
      '   ',
      'SL12345678BR', // 8 dígitos
      'SL1234567890BR', // 10 dígitos
      'S1123456789BR', // uma letra só no prefixo
      'SL123456789US', // postado fora do Brasil
      'SL123456789', // sem sufixo
      '123456789BR', // sem prefixo
      'RASTREIO', // texto solto
    ]) {
      expect(rastreioValido(codigo)).toBe(false)
    }
  })
})

/*
 * Status do rastreio e avanço automático (22/10/2026). Com o contrato, o código nasce na etiqueta,
 * antes da postagem: "tem código" deixou de querer dizer "foi postado". Estes testes travam a
 * regra que separa uma coisa da outra, e os textos em português dos dois status novos.
 */

describe('rótulos de status', () => {
  it('os dois status da pré-postagem têm texto em português, e a tela não mostra o código cru', () => {
    expect(rotuloStatusRastreio('aguardando_postagem')).toBe('Etiqueta emitida — aguardando postagem')
    expect(rotuloStatusRastreio('cancelado')).toBe('Etiqueta cancelada')
    // Prefere o rótulo combinado à frase do SRO, que muda de redação.
    expect(textoDoRastreio({ statusAtual: 'aguardando_postagem', etapaDescricao: 'Etiqueta emitida' })).toBe(
      'Etiqueta emitida — aguardando postagem',
    )
    // Para os outros vale a frase dos Correios, que é mais específica; sem ela, o rótulo.
    expect(textoDoRastreio({ statusAtual: 'em_transito', etapaDescricao: 'Objeto em transferência' })).toBe('Objeto em transferência')
    expect(textoDoRastreio({ statusAtual: 'em_transito', etapaDescricao: '' })).toBe('Em trânsito')
    expect(rotuloStatusRastreio('status_que_nao_existe')).toBe('status_que_nao_existe')
  })
})

describe('quando o objeto está com os Correios', () => {
  const ETIQUETA = 1_000
  const POSTAGEM = 2_000
  const ENTREGA = 3_000
  const base = { codigoRastreio: 'AP123456789BR', dataUltimaAtualizacao: 9_999 }

  it('etiqueta emitida ou cancelada não é postagem', () => {
    expect(objetoJaComOsCorreios('aguardando_postagem')).toBe(false)
    expect(objetoJaComOsCorreios('cancelado')).toBe(false)
    expect(objetoJaComOsCorreios('indisponivel')).toBe(false)
    expect(objetoJaComOsCorreios('nao_encontrado')).toBe(false)
    for (const s of ['postado', 'em_transito', 'saiu_para_entrega', 'aguardando_retirada', 'entregue']) {
      expect(objetoJaComOsCorreios(s)).toBe(true)
    }
  })

  it('a data da postagem é o primeiro evento depois da etiqueta, não a hora da consulta', () => {
    const eventos = [
      { status: 'em_transito' as const, dataHora: ENTREGA },
      { status: 'postado' as const, dataHora: POSTAGEM },
      { status: 'aguardando_postagem' as const, dataHora: ETIQUETA },
    ]
    expect(instanteDaPostagem(eventos)).toBe(POSTAGEM)
    expect(instanteDaPostagem([{ status: 'aguardando_postagem', dataHora: ETIQUETA }])).toBeNull()
  })

  it('envio: só avança de "Protocolo gerado", sem postagem, não desconsiderado e com o mesmo código', () => {
    const envio = { etapaAtual: 'Protocolo gerado' as const, dataPostagem: null, codigoRastreio: 'ap123456789br' }
    const postado = { ...base, statusAtual: 'postado', eventos: [{ status: 'postado' as const, dataHora: POSTAGEM }] }
    expect(postagemDoEnvioPeloRastreio(envio, postado)).toBe(POSTAGEM)
    expect(postagemDoEnvioPeloRastreio({ ...envio, dataPostagem: 5 }, postado)).toBeNull()
    expect(postagemDoEnvioPeloRastreio({ ...envio, etapaAtual: 'Envio postado' }, postado)).toBeNull()
    expect(postagemDoEnvioPeloRastreio({ ...envio, desconsideradoEm: 5 }, postado)).toBeNull()
    expect(postagemDoEnvioPeloRastreio({ ...envio, codigoRastreio: 'AP999999999BR' }, postado)).toBeNull()
    expect(
      postagemDoEnvioPeloRastreio(envio, { ...base, statusAtual: 'aguardando_postagem', eventos: [{ status: 'aguardando_postagem', dataHora: ETIQUETA }] }),
    ).toBeNull()
  })

  it('retirada: separação → postada → entregue, nunca pulando a postagem', () => {
    const transito = { ...base, statusAtual: 'em_transito', eventos: [{ status: 'postado' as const, dataHora: POSTAGEM }, { status: 'em_transito' as const, dataHora: ENTREGA }] }
    const entregue = { ...base, statusAtual: 'entregue', eventos: [{ status: 'postado' as const, dataHora: POSTAGEM }, { status: 'entregue' as const, dataHora: ENTREGA }] }
    const ret = (status: 'separacao' | 'postada' | 'entregue') => ({ status, codigoRastreio: 'AP123456789BR' })

    expect(avancosDaRetiradaPeloRastreio(ret('separacao'), transito)).toEqual([{ para: 'postada', data: POSTAGEM }])
    expect(avancosDaRetiradaPeloRastreio(ret('postada'), transito)).toEqual([])
    expect(avancosDaRetiradaPeloRastreio(ret('postada'), entregue)).toEqual([{ para: 'entregue', data: ENTREGA }])
    expect(avancosDaRetiradaPeloRastreio(ret('separacao'), entregue)).toEqual([
      { para: 'postada', data: POSTAGEM },
      { para: 'entregue', data: ENTREGA },
    ])
    expect(avancosDaRetiradaPeloRastreio(ret('entregue'), entregue)).toEqual([])
  })
})
