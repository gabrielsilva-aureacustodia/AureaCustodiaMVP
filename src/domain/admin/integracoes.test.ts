import { describe, expect, it } from 'vitest'

import { estadoDasIntegracoes, NOMES_DE_VARIAVEIS, VARIAVEIS_NAO_SECRETAS } from './integracoes'

function presenca(nomes: string[]): Record<string, boolean> {
  return Object.fromEntries(NOMES_DE_VARIAVEIS.map((n) => [n, nomes.includes(n)]))
}

describe('estado das integrações', () => {
  it('ligado, incompleto e desligado — contando só as obrigatórias, e aceitando a alternativa', () => {
    const estados = estadoDasIntegracoes(presenca(['DATABASE_URL', 'EVOLUTION_API_URL', 'SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY']), {})
    const por = Object.fromEntries(estados.map((e) => [e.chave, e.estado]))
    expect(por.banco).toBe('ligado')
    expect(por.login).toBe('ligado')
    expect(por.mensageria).toBe('parcial')
    expect(por.correios).toBe('desligado')
    // Google Sheets é opcional dentro de "relatórios": sem ele, o que manda é a chave dos relatórios.
    expect(estadoDasIntegracoes(presenca(['AUREA_RELATORIOS_TOKEN']), {}).find((e) => e.chave === 'relatorios')?.estado).toBe('ligado')
  })

  it('só nomes de variável, nunca valor; e os dois valores que não são segredo viram observação', () => {
    const estados = estadoDasIntegracoes(presenca(['MP_ACCESS_TOKEN', 'MP_WEBHOOK_SECRET', 'MP_SANDBOX']), { MP_SANDBOX: 'false', SUPABASE_STORAGE_BUCKET: undefined })
    const pagamento = estados.find((e) => e.chave === 'pagamento')
    expect(pagamento?.observacao).toBe('Modo: produção (MP_SANDBOX=false).')
    expect(estados.find((e) => e.chave === 'servico_supabase')?.observacao).toBe('Balde dos vídeos: analises (padrão).')
    expect(JSON.stringify(estados)).not.toContain('APP_USR')
    expect(VARIAVEIS_NAO_SECRETAS).toEqual(['MP_SANDBOX', 'SUPABASE_STORAGE_BUCKET'])
    expect(NOMES_DE_VARIAVEIS).not.toContain('SESSION_SECRET')
  })
})
