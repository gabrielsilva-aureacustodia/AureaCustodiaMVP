/**
 * LEITURA APENAS — fotografia do acervo antes da renumeração (22/09/2026).
 *
 * Não escreve nada. Existe para responder, antes de mexer: quantas moedas há,
 * que códigos elas têm hoje, em que ordem a corrente de hashes foi fechada e
 * onde estão os contadores de `seq`.
 */
const fs = require('fs')
const pg = require('pg')

const url = fs.readFileSync('.env.local', 'utf8').match(/^POSTGRES_URL="?([^"\r\n]+)/m)[1]

;(async () => {
  const c = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } })
  await c.connect()

  const seq = await c.query('select * from aurea.seq where id = 1')
  console.log('SEQ:', JSON.stringify(seq.rows[0]))

  for (const t of ['coins', 'recibos', 'analises', 'envios', 'caixas', 'users']) {
    const r = await c.query(`select count(*)::int n from aurea.${t}`)
    console.log(`  ${String(r.rows[0].n).padStart(5)} em ${t}`)
  }

  const coins = await c.query(
    `select id, owner_email, posicao, tipo_moeda, ano, protocolo
       from aurea.coins order by id asc limit 5`,
  )
  console.log('\nPRIMEIRAS MOEDAS:')
  for (const m of coins.rows) console.log(' ', JSON.stringify(m))

  const ultimas = await c.query(
    `select id from aurea.coins order by id desc limit 3`,
  )
  console.log('ULTIMOS CODIGOS:', ultimas.rows.map((r) => r.id).join(', '))

  const rec = await c.query(`select codigo, coin_id from aurea.recibos order by codigo asc limit 3`)
  console.log('\nPRIMEIROS RECIBOS:', rec.rows.map((r) => `${r.codigo}->${r.coin_id}`).join(', '))

  const anl = await c.query(
    `select protocolo, codigo_moeda, codigo_recibo, validado_em, hash_anterior, hash
       from aurea.analises order by validado_em asc, protocolo asc limit 3`,
  )
  console.log('\nPRIMEIRAS ANALISES:')
  for (const a of anl.rows) console.log(' ', JSON.stringify(a))

  const genesis = await c.query(
    `select count(*)::int n from aurea.analises where hash_anterior = repeat('0', 64)`,
  )
  console.log('\nANALISES ANCORADAS NO GENESIS:', genesis.rows[0].n)

  const porDono = await c.query(
    `select owner_email, count(*)::int n from aurea.coins group by owner_email order by n desc`,
  )
  console.log('\nMOEDAS POR CONTA:')
  for (const l of porDono.rows) console.log(`  ${String(l.n).padStart(4)}  ${l.owner_email}`)

  await c.end()
})()
