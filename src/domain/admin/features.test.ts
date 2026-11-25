import { describe, expect, it } from 'vitest'

import { chaveNoBanco, cssDasFeatures, DEFINICOES_FEATURES, featuresPadrao, featuresVigentes } from './features'

describe('features da superadmin', () => {
  it('a confirmação de negociação nasce DESLIGADA e o resto nasce ligado', () => {
    const p = featuresPadrao()
    expect(p.confirmacaoNegociacao).toBe(false)
    expect(p.animacoes).toBe(true)
    expect(p.botaoTutorial).toBe(true)
    expect(p.botaoAtendimento).toBe(true)
  })

  it('chaves são únicas e o nome no banco leva o prefixo "feature."', () => {
    const chaves = DEFINICOES_FEATURES.map((d) => d.chave)
    expect(new Set(chaves).size).toBe(chaves.length)
    expect(chaveNoBanco('animacoes')).toBe('feature.animacoes')
  })

  it('o gravado vence o padrão; valor estranho é ignorado', () => {
    const v = featuresVigentes({ 'feature.confirmacaoNegociacao': 1, 'feature.animacoes': 0, 'feature.botaoTutorial': 'talvez' })
    expect(v.confirmacaoNegociacao).toBe(true)
    expect(v.animacoes).toBe(false)
    expect(v.botaoTutorial).toBe(true)
  })

  it('só gera CSS para o que está desligado', () => {
    expect(cssDasFeatures(featuresPadrao())).toBe('')
    const css = cssDasFeatures({ ...featuresPadrao(), animacoes: false, botaoTutorial: false, botaoAtendimento: false })
    expect(css).toContain('animation:none')
    expect(css).toContain('.tutorial-link')
    expect(css).toContain('.atd-fab')
  })
})
