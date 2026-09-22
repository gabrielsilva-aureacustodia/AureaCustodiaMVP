import { describe, expect, it } from 'vitest'

import {
  DOCUMENTOS_VIGENTES,
  hashDoDocumento,
  PARAMETROS_LEGAIS,
  TERMOS_DE_USO_V1,
  textoCanonico,
} from './index'

describe('Documentos Legais · Canonicidade e Hashes Criptográficos', () => {
  it('gera texto canônico dos Termos de Uso v1.0 sem placeholders em branco', () => {
    const texto = textoCanonico(TERMOS_DE_USO_V1)

    // Invariante: Nenhum "X (x por extenso)" ou "XX/XX/XXXX" restou no texto
    expect(texto).not.toMatch(/XX\/XX\/XXXX/)
    expect(texto).not.toMatch(/X \(x por extenso\)/i)
    expect(texto).not.toMatch(/X \(X por extenso\)/i)

    // Invariante: Parâmetros provisórios foram injetados corretamente
    expect(texto).toContain(`Data de entrada em vigor: ${PARAMETROS_LEGAIS.vigencia}`)
    expect(texto).toContain(PARAMETROS_LEGAIS.prazoValidacaoCustodia)
    expect(texto).toContain(PARAMETROS_LEGAIS.prazoRecebimentoVenda)
    expect(texto).toContain(PARAMETROS_LEGAIS.prazoDisponibilizacaoDeposito)

    // Invariante: Menções a Tabela de Taxas e SAC estão presentes
    expect(texto).toContain('Tabela de Taxas')
    expect(texto).toContain('SAC')
  })

  it('o Capítulo 14.4 (Acordo de Arbitragem) está inteiramente marcado em negrito', () => {
    const cap14 = TERMOS_DE_USO_V1.capitulos.find((c) => c.numero === 14)
    expect(cap14).toBeDefined()

    const pArbitragem = cap14?.paragrafos.find((p) => p.numero === '14.4')
    expect(pArbitragem?.negrito).toBe(true)

    const pAcordo = cap14?.paragrafos.find((p) => p.numero === '14.5')
    expect(pAcordo?.negrito).toBe(true)
    expect(pAcordo?.alineas?.every((a) => a.negrito)).toBe(true)
  })

  it('todos os 17 capítulos dos Termos de Uso estão presentes e ordenados', () => {
    expect(TERMOS_DE_USO_V1.capitulos).toHaveLength(17)
    TERMOS_DE_USO_V1.capitulos.forEach((cap, idx) => {
      expect(cap.numero).toBe(idx + 1)
      expect(cap.titulo.trim().length).toBeGreaterThan(0)
      expect(cap.paragrafos.length).toBeGreaterThan(0)
    })
  })

  it('DOCUMENTOS_VIGENTES contém os 4 documentos oficiais com hashes válidos de 64 caracteres', () => {
    const chaves = ['termos_de_uso', 'politica_privacidade', 'tabela_de_taxas', 'clausula_arbitragem'] as const
    for (const chave of chaves) {
      const doc = DOCUMENTOS_VIGENTES[chave]
      expect(doc).toBeDefined()
      // Cada documento anda no seu próprio ritmo: a privacidade não muda desde a
      // 2.0, e a Tabela de Taxas foi para a 2.2 quando a cláusula de depósito
      // voltou a dizer "sem taxa". Versão é por documento, nunca do conjunto.
      const esperada =
        chave === 'politica_privacidade' ? '2.0' : chave === 'tabela_de_taxas' ? '2.3' : '2.1'
      expect(doc.versao).toBe(esperada)
      expect(doc.vigenteDesde).toBe(PARAMETROS_LEGAIS.vigencia)
      expect(doc.hash).toMatch(/^[0-9a-f]{64}$/)
      expect(doc.textoCanonico.length).toBeGreaterThan(100)
      expect(hashDoDocumento(doc.documento)).toBe(doc.hash)
    }
  })

  it('vetor congelado de hash dos Termos de Uso v2.1', () => {
    const doc = DOCUMENTOS_VIGENTES.termos_de_uso
    // Congelamento do hash: se alguém alterar qualquer caractere do texto,
    // o hash muda e este teste exige atualização explícita com justificativa.
    expect(doc.hash).toBe('2cf7ee937b92f3242ce13c46bd1b9b1865da569fceb60c18c8dcecaaf53f2ac6')
    expect(hashDoDocumento(TERMOS_DE_USO_V1)).toBe(
      '2cf7ee937b92f3242ce13c46bd1b9b1865da569fceb60c18c8dcecaaf53f2ac6',
    )
  })
})



