/**
 * EXECUTOR DE USO ÚNICO — dispara o ciclo de faturamento de custódia à mão.
 *
 * Pedido do Gabriel em 22/09/2026: depois de zerar os planos antigos, o
 * Rogério precisa ser cobrado de novo, já pelo preço novo (mensal, R$ 2,00 por
 * moeda), para poder pagar.
 *
 * POR QUE ISTO NÃO É UM `INSERT` DE FATURA
 * ----------------------------------------
 * Chama `processarCicloFaturamento()`, que é exatamente a função que o cron de
 * todo dia 1º executa (`/api/cron/faturamento`). Assim a fatura nasce com o id,
 * a competência, o vencimento e a tolerância que o sistema usa de verdade, o
 * lançamento no livro-razão é derivado na mesma transação e o hash encadeia
 * sozinho. Uma fatura inserida na mão passaria por todos esses lugares errada.
 *
 * POR QUE MORA EM `scripts/` E NÃO EM `src/`
 * ------------------------------------------
 * O `include` do Vitest é `src/**​/*.test.ts` (vitest.config.mts). Um executor
 * como este dentro de `src/` entraria no `npm test` e rodaria o faturamento
 * contra o banco de produção toda vez que alguém rodasse a suíte. Já aconteceu
 * neste repositório: dois executores de uso único foram apagados em 20/09/2026
 * por esse motivo. Aqui fora, só roda quando chamado pelo caminho completo.
 *
 *   npx vitest run scripts/faturar-custodia.test.ts
 */

import { readFileSync } from 'node:fs'

import { describe, expect, it, vi } from 'vitest'

// O pacote `server-only` estoura fora do contexto de servidor do Next, e é a
// barreira funcionando. Aqui ela é neutralizada de propósito: o alvo é
// justamente um módulo de servidor.
vi.mock('server-only', () => ({}))

// O Vitest não lê `.env.local` sozinho — não há `setupFiles` neste projeto.
// O arquivo é CRLF, então o recorte tira o `\r` além do `\n`; sem isso a
// string de conexão sai com um caractere invisível no fim e o Postgres
// recusa o host.
for (const linha of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = linha.match(/^([A-Z_][A-Z0-9_]*)="?([^"]*)"?\s*$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2]
}

describe('faturamento de custódia — execução manual', () => {
  it('roda o ciclo do mês corrente e emite as faturas pendentes', async () => {
    const { processarCicloFaturamento } = await import('@/server/custodia/faturamento')

    const relatorio = await processarCicloFaturamento()
    console.log('\nRELATÓRIO DO CICLO:', JSON.stringify(relatorio, null, 2))

    expect(relatorio.competencia).toMatch(/^\d{4}-\d{2}$/)
  }, 120_000)
})
