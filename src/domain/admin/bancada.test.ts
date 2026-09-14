import { describe, expect, it } from 'vitest'

import { PESO_MAX_MG, PESO_MIN_MG, gramasParaMg, lerPosicao, nomeDoArquivoDeVideo, validarMoedasDaBancada, type MoedaDigitada } from './bancada'

function aprovada(gramas: string, caixa = 'EB-001', posicao = '7'): MoedaDigitada {
  return { veredito: 'aprovada', gramas, caixa, posicao, motivoRecusa: '' }
}

describe('peso digitado na bancada web', () => {
  it('as faixas são as mesmas da rota da estação (1 g a 100 g, em miligramas)', () => {
    expect(PESO_MIN_MG).toBe(1000)
    expect(PESO_MAX_MG).toBe(100000)
  })

  it('vírgula, ponto e espaço viram miligramas inteiros, arredondados uma vez', () => {
    expect(gramasParaMg('27,05')).toBe(27050)
    expect(gramasParaMg(' 27.05 ')).toBe(27050)
    expect(gramasParaMg('7')).toBe(7000)
    expect(gramasParaMg('7,8449')).toBe(7845)
    expect(gramasParaMg('')).toBeNull()
    expect(gramasParaMg('27,0,5')).toBeNull()
    expect(gramasParaMg('-3')).toBeNull()
    expect(gramasParaMg('abc')).toBeNull()
  })

  it('posição vazia é nula; posição que não é inteiro positivo é erro', () => {
    expect(lerPosicao('')).toEqual({ ok: true, posicao: null })
    expect(lerPosicao(' 12 ')).toEqual({ ok: true, posicao: 12 })
    expect(lerPosicao('0').ok).toBe(false)
    expect(lerPosicao('7,5').ok).toBe(false)
  })
})

describe('validação do envio inteiro', () => {
  it('monta os vereditos no formato do serviço da análise, com o vídeo em todas as moedas', () => {
    const r = validarMoedasDaBancada(
      [aprovada('27,05'), { veredito: 'recusada', gramas: '26,8', caixa: 'EB-001', posicao: '8', motivoRecusa: ' Peso fora da tolerância ' }],
      2,
      'RO-ENV-0001/RO-ENV-0001-2.webm',
    )
    expect(r).toEqual({
      ok: true,
      vereditos: [
        { pesoMg: 27050, veredito: 'aprovada', motivoRecusa: null, caixa: 'EB-001', posicao: 7, caminhoVideo: 'RO-ENV-0001/RO-ENV-0001-2.webm' },
        // Recusada não guarda caixa nem posição, como na estação: a moeda volta ao cliente.
        { pesoMg: 26800, veredito: 'recusada', motivoRecusa: 'Peso fora da tolerância', caixa: null, posicao: null, caminhoVideo: 'RO-ENV-0001/RO-ENV-0001-2.webm' },
      ],
    })
  })

  it('o envio inteiro de uma vez: quantidade diferente é recusada', () => {
    const r = validarMoedasDaBancada([aprovada('27')], 2, null)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.erros[0]).toContain('2 moeda(s) e vieram 1')
  })

  it('recusa sem motivo, peso em miligramas e posição repetida no mesmo envio', () => {
    const r = validarMoedasDaBancada(
      [
        { veredito: 'recusada', gramas: '27', caixa: '', posicao: '', motivoRecusa: '  ' },
        aprovada('27000', 'EB-001', '9'),
        aprovada('27', 'eb 001', '7'),
        aprovada('27', 'EB-001', '7'),
      ],
      4,
      null,
    )
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.erros).toContain('Moeda 1: escreva o motivo da recusa.')
      expect(r.erros.some((e) => e.startsWith('Moeda 2:') && e.includes('fora do esperado'))).toBe(true)
      // "EB-001" e "eb 001" são a mesma caixa para a ocupação.
      expect(r.erros.some((e) => e.startsWith('Moedas 3 e 4:'))).toBe(true)
    }
  })

  it('caixa e vídeo são opcionais — a análise fecha sem eles (RA-22, RA-23)', () => {
    const r = validarMoedasDaBancada([aprovada('7,84', '', '')], 1, '  ')
    expect(r).toEqual({ ok: true, vereditos: [{ pesoMg: 7840, veredito: 'aprovada', motivoRecusa: null, caixa: null, posicao: null, caminhoVideo: null }] })
  })

  it('o nome do arquivo segue o da estação e acompanha o formato gravado', () => {
    expect(nomeDoArquivoDeVideo('RO-ENV-0001', 2, 'webm')).toBe('RO-ENV-0001-2.webm')
    expect(nomeDoArquivoDeVideo('RO-ENV-0001', 1, 'mp4')).toBe('RO-ENV-0001-1.mp4')
    expect(nomeDoArquivoDeVideo('RO-ENV-0001', 1, 'ogg')).toBe('RO-ENV-0001-1.webm')
  })
})
