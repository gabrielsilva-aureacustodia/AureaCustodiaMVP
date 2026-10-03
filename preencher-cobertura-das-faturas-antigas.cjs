/**
 * PREENCHE `cobertura_ate` NAS FATURAS DE CUSTÓDIA ANTERIORES AO CICLO POR MOEDA (03/10/2026).
 *
 * A migration 039 criou a coluna; as faturas emitidas pela regra antiga (mês-calendário)
 * ficaram com ela nula, e a tela caía em "fim do mês da competência" — mostrando "guarda até
 * 31/10" na linha de uma fatura de 01/10 cujas moedas, pela regra nova, só voltam a ser
 * cobradas em 21/11. Cobertura e próxima cobrança precisam contar a mesma história.
 *
 * REGRA (a mesma de src/domain/ciclo-custodia.ts): a fatura de competência AAAA-MM cobre o
 * ciclo da moeda que COMEÇA nesse mês — do dia do aniversário da aceitação até o dia anterior ao
 * aniversário do mês seguinte. Fatura com várias moedas vale pela que lapsa primeiro. Fatura sem
 * nenhuma moeda localizável fica como está (nula).
 *
 * NÃO MEXE EM VALOR, STATUS, VENCIMENTO NEM SALDO: é só o metadado de cobertura. O que já foi
 * cobrado já foi.
 *
 * Sem `--aplicar`, só relata.
 */
const fs = require('fs')
const pg = require('pg')

const APLICAR = process.argv.includes('--aplicar')
const url = fs.readFileSync('.env.local', 'utf8').match(/^POSTGRES_URL="?([^"\r\n]+)/m)[1]

const BRASILIA = 3 * 3600000
const inicioDoDia = (ano, mes, dia) => Date.UTC(ano, mes - 1, dia) + BRASILIA
const ultimoDia = (ano, mes) => new Date(Date.UTC(ano, mes, 0)).getUTCDate()

function fimDoCicloQueComecaEm(entrada, competencia) {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(entrada || '')
  if (!m) return null
  const dia = Number(m[1])
  const entradaMes = Number(m[3]) * 12 + Number(m[2])
  let [ano, mes] = competencia.split('-').map(Number)
  if (ano * 12 + mes < entradaMes) {
    ano = Number(m[3])
    mes = Number(m[2])
  }
  const idx = ano * 12 + (mes - 1) + 1
  const ny = Math.floor(idx / 12)
  const nm = (idx % 12) + 1
  return inicioDoDia(ny, nm, Math.min(dia, ultimoDia(ny, nm))) - 1
}

const d = (t) => (t === null ? '-' : new Date(Number(t) - BRASILIA).toISOString().slice(0, 10))

;(async () => {
  const c = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } })
  await c.connect()

  const { rows: faturas } = await c.query(
    `SELECT id, user_email, competencia, origem, status, moeda_ids
       FROM aurea.faturas_custodia WHERE cobertura_ate IS NULL ORDER BY data_emissao`,
  )
  const { rows: moedas } = await c.query(`SELECT id, entrada FROM aurea.coins`)
  const entradaDe = new Map(moedas.map((m) => [m.id, m.entrada]))

  const plano = []
  for (const f of faturas) {
    const fins = (f.moeda_ids || [])
      .map((id) => fimDoCicloQueComecaEm(entradaDe.get(id), f.competencia))
      .filter((t) => t !== null)
    plano.push({ f, cobertura: fins.length ? Math.min(...fins) : null })
  }

  console.log(`${faturas.length} fatura(s) sem cobertura:`)
  for (const { f, cobertura } of plano) {
    console.log(
      `  ${f.id} · ${f.user_email} · comp ${f.competencia} · ${f.origem} · ${f.status} · ${(f.moeda_ids || []).length} moeda(s) -> guarda até ${d(cobertura)}`,
    )
  }

  if (!APLICAR) {
    console.log('\n(simulação — rode com --aplicar para gravar)')
    await c.end()
    return
  }

  await c.query('BEGIN')
  try {
    for (const { f, cobertura } of plano) {
      if (cobertura === null) continue
      await c.query(`UPDATE aurea.faturas_custodia SET cobertura_ate = $1 WHERE id = $2 AND cobertura_ate IS NULL`, [
        cobertura,
        f.id,
      ])
    }
    await c.query('COMMIT')
  } catch (e) {
    await c.query('ROLLBACK')
    throw e
  }
  const { rows } = await c.query(`SELECT count(*)::int n FROM aurea.faturas_custodia WHERE cobertura_ate IS NULL`)
  console.log(`\n✓ gravado. Faturas ainda sem cobertura: ${rows[0].n}`)
  await c.end()
})().catch((e) => {
  console.error(e.message)
  process.exit(1)
})
