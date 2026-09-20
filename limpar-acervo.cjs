/**
 * ZERA O ACERVO E A CUSTÓDIA — rodar UMA VEZ, em 20/09/2026.
 *
 * Pedido dos sócios: apagar as moedas de TODA conta, com os recibos e os laudos,
 * e apagar os planos e faturas de custódia. Eles vão cadastrar na mão, pela tela
 * `Cadastrar moeda sem envio` que existe na ficha do cliente (/admin/usuarios) e
 * na bancada (/admin/bancada).
 *
 * AS CONTAS FICAM. Ninguém precisa se cadastrar de novo nem refazer login. O que
 * sai é o acervo e tudo que dependia dele.
 *
 * A corrente de hashes das análises some junto, e é o certo: ela é a prova dos
 * laudos, e sem moeda não há laudo que provar. O próximo cadastro recomeça a
 * corrente no GENESIS, que é como ela nasce num sistema sem histórico.
 *
 * Os contadores de `seq` NÃO são reiniciados de propósito: código de moeda já
 * emitido não pode ser reaproveitado por outra moeda, mesmo que a primeira tenha
 * sido apagada. Um recibo REC-000051 que existiu e um novo REC-000051 diferente
 * seriam indistinguíveis em qualquer conversa futura.
 *
 * Tudo numa transação: ou passa inteiro, ou nada é gravado.
 */
const fs = require('fs')
const pg = require('pg')

const url = fs.readFileSync('.env.local', 'utf8').match(/^POSTGRES_URL="?([^"\r\n]+)/m)[1]

/** Ordem de filho para pai, para não esbarrar em chave estrangeira. */
const APAGAR = [
  'ofertas_historico',
  'sell_offers', 'buy_orders', 'trades',
  'retiradas', 'rastreios',
  'faturas_custodia', 'planos_custodia',
  'recibos', 'analises', 'coins',
  'envios', 'caixas',
  'ledger_entries', 'deposits', 'saques',
  'payment_events', 'payment_intents', 'recebimentos_gateway',
  'eventos_uso', 'exportacoes', 'audit_log',
]

;(async () => {
  const c = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } })
  await c.connect()
  await c.query('begin')
  try {
    for (const t of APAGAR) {
      const r = await c.query('delete from aurea.' + t)
      if (r.rowCount) console.log('  ' + String(r.rowCount).padStart(5) + ' linhas apagadas de ' + t)
    }

    // Saldo zerado junto: não há operação que justifique dinheiro em conta.
    const z = await c.query('update aurea.users set balance = 0, inadimplente = false')
    console.log('  ' + z.rowCount + ' contas com saldo zerado (as contas em si ficam)')

    const contas = await c.query('select count(*)::int n from aurea.users')
    const moedas = await c.query('select count(*)::int n from aurea.coins')
    console.log('\n  CONFERÊNCIA: ' + contas.rows[0].n + ' contas preservadas, ' + moedas.rows[0].n + ' moedas no acervo.')

    await c.query('commit')
    console.log('\nCOMMIT OK — acervo zerado, contas intactas.')
  } catch (e) {
    await c.query('rollback')
    console.error('ROLLBACK — nada foi gravado. Motivo:', e.message)
    process.exitCode = 1
  }
  await c.end()
})()
