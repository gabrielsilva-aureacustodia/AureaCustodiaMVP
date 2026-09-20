/**
 * LIMPEZA DO RESTO — rodar UMA VEZ, em 20/09/2026, depois de limpar-mock.cjs.
 *
 * A primeira limpeza esvaziou o banco, mas o site ficou no ar com o código
 * antigo por algumas horas, e nesse intervalo um envio de teste foi criado e
 * aprovado pelo botão "Simular avanço de etapa" — aquele que deixava o próprio
 * dono do envio aprovar a moeda. Resultado: 50 moedas na conta do Rogério, com
 * hash simulado (`0xE060...EF83`, e não SHA-256) e SEM laudo na corrente.
 *
 * A REGRA DE CORTE É ESTA, e é o que torna o script seguro: apaga a moeda que
 * NÃO TEM análise na corrente. Moeda de verdade tem laudo — o da bancada ou o do
 * cadastro direto —, e o hash do recibo dela É o hash desse laudo. Moeda sem
 * laudo nenhum não veio de caminho legítimo.
 *
 * Fica de fora, de propósito, a tabela `audit_log`: ela é a trilha de quem fez o
 * quê e já contém o registro do cadastro das 60 moedas reais. Apagar trilha para
 * limpar teste é pior do que conviver com algumas linhas de teste nela.
 *
 * Tudo roda numa transação: ou passa inteiro, ou nada é gravado.
 */
const fs = require('fs')
const pg = require('pg')

const url = fs.readFileSync('.env.local', 'utf8').match(/^POSTGRES_URL="?([^"\r\n]+)/m)[1]

;(async () => {
  const c = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } })
  await c.connect()
  await c.query('begin')
  try {
    const semLaudo = `select id from aurea.coins co
       where not exists (select 1 from aurea.analises a where a.codigo_moeda = co.id)`

    const alvo = (await c.query(semLaudo)).rows.map((r) => r.id)
    console.log('  moedas sem laudo na corrente: ' + alvo.length)
    if (alvo.length) console.log('    ' + alvo[0] + ' … ' + alvo[alvo.length - 1])

    const rec = await c.query(`delete from aurea.recibos where coin_id = any($1)`, [alvo])
    console.log('  recibos apagados: ' + rec.rowCount)

    const moe = await c.query(`delete from aurea.coins where id = any($1)`, [alvo])
    console.log('  moedas apagadas:  ' + moe.rowCount)

    // O resíduo do mesmo envio de teste. Sem as moedas, cada um deles é uma
    // linha órfã que só confunde relatório e conciliação.
    // ORDEM DE FILHO PARA PAI. `faturas_custodia` tem chave estrangeira para
    // `planos_custodia` (faturas_custodia_plano_id_fkey), então a fatura sai
    // primeiro. Na primeira versão deste script a ordem estava invertida: o
    // Postgres recusava, a transação inteira fazia rollback e nada acontecia —
    // sem mensagem de erro visível para quem só olhava o resultado.
    for (const t of ['faturas_custodia', 'planos_custodia', 'envios', 'ledger_entries', 'payment_events', 'payment_intents', 'eventos_uso']) {
      const r = await c.query('delete from aurea.' + t)
      if (r.rowCount) console.log('  ' + String(r.rowCount).padStart(4) + ' linhas apagadas de ' + t)
    }

    // Confirmação dentro da própria transação, antes do commit.
    const fica = await c.query(`select owner_email, count(*)::int n from aurea.coins group by 1 order by 2 desc`)
    console.log('\n  ACERVO QUE FICA:')
    for (const r of fica.rows) console.log('    ' + String(r.n).padStart(3) + '  ' + r.owner_email)

    await c.query('commit')
    console.log('\nCOMMIT OK.')
  } catch (e) {
    await c.query('rollback')
    console.error('ROLLBACK — nada foi gravado. Motivo:', e.message)
    process.exitCode = 1
  }
  await c.end()
})()
