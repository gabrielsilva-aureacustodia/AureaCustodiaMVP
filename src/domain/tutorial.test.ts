import { describe, expect, it } from 'vitest'

import { DIAS_TOLERANCIA_FATURA } from '@/domain/custody'
import { resumoDaCustodia } from '@/domain/custodia-do-cliente'
import { TAXAS_PADRAO } from '@/domain/fees'
import { estadoVazio } from '@/domain/estado-vazio'
import {
  ID_FATURA_DE_EXEMPLO,
  PAGINAS_COM_TUTORIAL,
  chaveContextual,
  chaveDaPagina,
  chaveDoTour,
  faturaDeExemplo,
  paginaDoTutorial,
  passosDoTour,
  pctDeBp,
  resumoComExemplo,
  textoDaComissao,
  tutorialDaPagina,
  tutoriaisContextuais,
} from '@/domain/tutorial'

const EMAIL = 'ana@testeaurea.com.br'

/** Texto que o jurídico proibiu em qualquer tela do produto (terminologia-juridica-aurea). */
const PROIBIDAS = /\b(token|tokens|nft|cripto|criptoativo|ativo digital|ativos|investimento|investidor|corretora|rentabilidade)\b/i

function todosOsTextos(): string[] {
  const textos: string[] = []
  for (const p of passosDoTour({ taxas: TAXAS_PADRAO, temMoedas: false })) textos.push(p.titulo, p.texto)
  for (const pg of PAGINAS_COM_TUTORIAL) {
    const t = tutorialDaPagina(pg, TAXAS_PADRAO)
    textos.push(t.titulo)
    for (const d of t.dicas) textos.push(d.titulo, d.texto)
  }
  for (const c of tutoriaisContextuais(TAXAS_PADRAO)) {
    textos.push(c.titulo)
    for (const d of c.dicas) textos.push(d.titulo, d.texto)
  }
  return textos
}

describe('rotas e chaves do tutorial', () => {
  it('reconhece só as telas do caminho principal, com ou sem barra final', () => {
    expect(paginaDoTutorial('/mercado')).toBe('/mercado')
    expect(paginaDoTutorial('/envios/')).toBe('/envios')
    expect(paginaDoTutorial('/conta/faturas')).toBeNull()
    expect(paginaDoTutorial('/admin')).toBeNull()
  })

  it('separa o progresso por conta e por assunto', () => {
    expect(chaveDoTour(EMAIL)).not.toBe(chaveDoTour('bia@testeaurea.com.br'))
    expect(chaveDaPagina(EMAIL, '/mercado')).not.toBe(chaveDaPagina(EMAIL, '/compras'))
    expect(chaveContextual(EMAIL, 'custodia-a-pagar')).toContain(EMAIL)
  })
})

describe('textos com número real', () => {
  it('formata a comissão da Tabela de Taxas', () => {
    expect(pctDeBp(50)).toBe('0,5%')
    expect(textoDaComissao(50, 100)).toMatch(/^0,5% \+ R\$\s1,00 por moeda$/)
  })

  it('o passo de custódia cita o preço e o prazo vigentes, e acompanha a tabela', () => {
    const base = passosDoTour({ taxas: TAXAS_PADRAO, temMoedas: false }).find((p) => p.id === 'custodia-valores')!
    expect(base.texto).toMatch(/R\$\s2,00/)
    expect(base.texto).toContain(`${DIAS_TOLERANCIA_FATURA} dias`)

    const alterada = passosDoTour({ taxas: { ...TAXAS_PADRAO, custodiaMensalPorMoeda: 350 }, temMoedas: false }).find(
      (p) => p.id === 'custodia-valores',
    )!
    expect(alterada.texto).toMatch(/R\$\s3,50/)
  })

  it('Vendas muda de texto conforme a conta já tenha moeda', () => {
    const sem = passosDoTour({ taxas: TAXAS_PADRAO, temMoedas: false }).find((p) => p.id === 'vender-proximo-passo')!
    const com = passosDoTour({ taxas: TAXAS_PADRAO, temMoedas: true }).find((p) => p.id === 'vender-proximo-passo')!
    expect(sem.texto).toContain('Envios')
    expect(sem.texto).toContain('ainda não tem moedas')
    expect(com.texto).not.toContain('ainda não tem moedas')
  })

  it('nenhum texto usa palavra proibida pelo jurídico nem jargão de programação', () => {
    for (const t of todosOsTextos()) {
      expect(t).not.toMatch(PROIBIDAS)
      expect(t).not.toMatch(/\b(API|gateway|state|estado da aplica|banco de dados|servidor|localStorage)\b/i)
    }
  })
})

describe('forma do tour', () => {
  const passos = passosDoTour({ taxas: TAXAS_PADRAO, temMoedas: false })

  it('tem boas-vindas e as cinco etapas, em ordem', () => {
    expect(passos[0]!.etapa).toBe(0)
    const etapas = [...new Set(passos.map((p) => p.etapa))]
    expect(etapas).toEqual([0, 1, 2, 3, 4, 5])
    expect(passos.map((p) => p.etapa)).toEqual([...passos.map((p) => p.etapa)].sort((a, b) => a - b))
  })

  it('segue a ordem Mercado, Compras, Vendas, Envios, Custódia', () => {
    const rotaPorEtapa = (e: number): string | null => passos.find((p) => p.etapa === e && p.rota)?.rota ?? null
    expect([1, 2, 3, 4, 5].map(rotaPorEtapa)).toEqual(['/mercado', '/compras', '/vender', '/envios', '/envios'])
  })

  it('só os passos de custódia ligam o exemplo', () => {
    for (const p of passos) expect(!!p.exemploDeCustodia).toBe(p.etapa === 5 && p.rota !== null)
  })

  it('ids são únicos', () => {
    expect(new Set(passos.map((p) => p.id)).size).toBe(passos.length)
  })

  it('toda página com tutorial tem dicas, com ids únicos', () => {
    for (const pg of PAGINAS_COM_TUTORIAL) {
      const t = tutorialDaPagina(pg, TAXAS_PADRAO)
      expect(t.dicas.length).toBeGreaterThan(0)
      expect(new Set(t.dicas.map((d) => d.id)).size).toBe(t.dicas.length)
    }
  })
})

describe('exemplo de custódia', () => {
  const agora = Date.UTC(2026, 9, 1, 12)

  it('é uma moeda pela tarifa vigente, com o prazo real de pagamento', () => {
    const f = faturaDeExemplo(EMAIL, TAXAS_PADRAO, agora)
    expect(f.id).toBe(ID_FATURA_DE_EXEMPLO)
    expect(f.valorCents).toBe(TAXAS_PADRAO.custodiaMensalPorMoeda)
    expect(f.status).toBe('pendente')
    expect(f.dataVencimento - f.dataEmissao).toBe(DIAS_TOLERANCIA_FATURA * 24 * 60 * 60 * 1000)
  })

  it('soma ao resumo de uma conta vazia sem marcá-la como vencida', () => {
    const estado = estadoVazio()
    const real = resumoDaCustodia(estado, EMAIL, TAXAS_PADRAO.custodiaMensalPorMoeda, agora)
    const r = resumoComExemplo(real, faturaDeExemplo(EMAIL, TAXAS_PADRAO, agora))
    expect(r.moedasGuardadas).toBe(1)
    expect(r.emAberto).toHaveLength(1)
    expect(r.emAbertoCents).toBe(TAXAS_PADRAO.custodiaMensalPorMoeda)
    expect(r.vencida).toBe(false)
  })

  it('não altera o resumo real de onde partiu', () => {
    const estado = estadoVazio()
    const real = resumoDaCustodia(estado, EMAIL, TAXAS_PADRAO.custodiaMensalPorMoeda, agora)
    resumoComExemplo(real, faturaDeExemplo(EMAIL, TAXAS_PADRAO, agora))
    expect(real.emAberto).toHaveLength(0)
    expect(real.moedasGuardadas).toBe(0)
  })
})
