/**
 * APAGA O ACERVO DA ROZÂNE — rodar UMA VEZ, em 22/09/2026.
 *
 * Pedido do Gabriel: limpar as moedas de rozanebagli@gmail.com, os laudos
 * delas e qualquer informação ligada a elas, porque o cadastro vai ser refeito
 * do zero. A CONTA FICA: ela não precisa se cadastrar nem logar de novo.
 *
 * POR QUE ESTE CASO É SIMPLES, E O QUE O TORNARIA DIFÍCIL
 * ------------------------------------------------------
 * As 31 análises dela ocupam as posições 100 a 130 da corrente de hashes, que
 * são as ÚLTIMAS. Apagar o fim de uma corrente encadeada não invalida nada: o
 * hash de cada análise depende da anterior, nunca da seguinte. As 100 análises
 * do Rogério continuam válidas byte a byte, sem recálculo nenhum.
 *
 * Se as dela estivessem no meio, a história seria outra — toda análise
 * posterior teria de ser reencadeada, como foi preciso na renumeração e no
 * alinhamento dos vídeos. Por isso o script CONFERE essa condição antes de
 * apagar e aborta se ela não valer. Não é verificação decorativa: é a
 * diferença entre uma exclusão inofensiva e uma que quebra a prova dos laudos
 * de outra pessoa.
 *
 * As moedas dela também não têm vídeo de bancada (`caminho_video` vazio):
 * entraram por cadastro direto, que pula a análise filmada. Não há nada para
 * remover no Supabase Storage.
 *
 * OS CONTADORES VOLTAM PARA ONDE ESTAVAM
 * --------------------------------------
 * `seq.coin` e `seq.analise` recuam de 131 para 100, para que o recadastro
 * recomece exatamente em RO-000101 e RO-ANL-0101. É a mesma decisão que o
 * Gabriel tomou na renumeração de ontem: o rastro de código apagado não conta.
 * Aqui o risco é ainda menor — as moedas nunca saíram do cadastro dela.
 *
 * Tudo numa transação: ou passa inteiro, ou nada é gravado.
 */
const fs = require('fs')
const pg = require('pg')

const url = fs.readFileSync('.env.local', 'utf8').match(/^POSTGRES_URL="?([^"\r\n]+)/m)[1]
const EMAIL = 'rozanebagli@gmail.com'

;(async () => {
  const c = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } })
  await c.connect()

  const conta = await c.query('SELECT email, name, balance FROM aurea.users WHERE email = $1', [EMAIL])
  if (!conta.rows.length) {
    console.error(`ABORTADO: conta ${EMAIL} não existe.`)
    await c.end()
    process.exitCode = 1
    return
  }
  console.log(`CONTA: ${conta.rows[0].name} (${conta.rows[0].email}) — a conta NÃO será apagada.`)

  const { rows: moedas } = await c.query(
    'SELECT id FROM aurea.coins WHERE owner_email = $1 ORDER BY id',
    [EMAIL],
  )
  if (moedas.length === 0) {
    console.log('Nada a fazer: a conta não tem moeda nenhuma.')
    await c.end()
    return
  }
  const ids = moedas.map((m) => m.id)
  console.log(`MOEDAS: ${ids.length} (${ids[0]} a ${ids[ids.length - 1]})`)

  // ---- A trava que dá segurança a esta operação --------------------------
  const { rows: pos } = await c.query(
    `SELECT a.posicao, (c2.owner_email = $1) AS dela
       FROM aurea.analises a
       LEFT JOIN aurea.coins c2 ON c2.id = a.codigo_moeda`,
    [EMAIL],
  )
  const dela = pos.filter((p) => p.dela).map((p) => Number(p.posicao))
  const outras = pos.filter((p) => !p.dela).map((p) => Number(p.posicao))
  if (dela.length && outras.length && Math.min(...dela) < Math.max(...outras)) {
    console.error('\nABORTADO: as análises dela NÃO são as últimas da corrente.')
    console.error(`  menor posição dela: ${Math.min(...dela)} · maior posição de terceiros: ${Math.max(...outras)}`)
    console.error('  Apagar do meio invalidaria o hash de todas as análises seguintes, que são de')
    console.error('  outra pessoa. Seria preciso reencadear a corrente — este script não faz isso.')
    await c.end()
    process.exitCode = 1
    return
  }
  console.log(`ANÁLISES: ${dela.length}, nas últimas posições da corrente — nada a reencadear.`)

  const comVideo = await c.query(
    `SELECT count(*)::int n FROM aurea.analises
      WHERE codigo_moeda = ANY($1::text[]) AND caminho_video IS NOT NULL AND caminho_video <> ''`,
    [ids],
  )
  if (comVideo.rows[0].n) {
    console.log(
      `  AVISO: ${comVideo.rows[0].n} análise(s) têm vídeo no Storage. Os arquivos NÃO são`,
    )
    console.log('  apagados por este script — o balde é privado e a limpeza dele é à parte.')
  }

  await c.query('begin')
  try {
    // Filho antes de pai: recibos referenciam coins por chave estrangeira.
    const rec = await c.query('DELETE FROM aurea.recibos WHERE coin_id = ANY($1::text[])', [ids])
    console.log(`\n  ${rec.rowCount} recibo(s)`)

    const anl = await c.query('DELETE FROM aurea.analises WHERE codigo_moeda = ANY($1::text[])', [ids])
    console.log(`  ${anl.rowCount} análise(s)`)

    for (const t of ['sell_offers', 'retiradas']) {
      const r = await c.query(`DELETE FROM aurea.${t} WHERE coin_id = ANY($1::text[])`, [ids])
      if (r.rowCount) console.log(`  ${r.rowCount} em ${t}`)
    }

    const moe = await c.query('DELETE FROM aurea.coins WHERE owner_email = $1', [EMAIL])
    console.log(`  ${moe.rowCount} moeda(s)`)

    const evt = await c.query('DELETE FROM aurea.eventos_uso WHERE user_email = $1', [EMAIL])
    if (evt.rowCount) console.log(`  ${evt.rowCount} evento(s) de uso`)

    // Os contadores recuam para o cadastro recomeçar nos mesmos códigos.
    const restamMoedas = await c.query('SELECT count(*)::int n FROM aurea.coins')
    const restamAnalises = await c.query('SELECT count(*)::int n FROM aurea.analises')
    await c.query('UPDATE aurea.seq SET coin = $1, analise = $2 WHERE id = 1', [
      restamMoedas.rows[0].n,
      restamAnalises.rows[0].n,
    ])
    console.log(
      `  seq recuado: coin = ${restamMoedas.rows[0].n}, analise = ${restamAnalises.rows[0].n}`,
    )

    // ---- Conferência dentro da transação --------------------------------
    const sobra = await c.query('SELECT count(*)::int n FROM aurea.coins WHERE owner_email = $1', [EMAIL])
    if (sobra.rows[0].n) throw new Error(`sobraram ${sobra.rows[0].n} moeda(s) da conta`)

    const orfaos = await c.query(
      `SELECT count(*)::int n FROM aurea.recibos r
        WHERE NOT EXISTS (SELECT 1 FROM aurea.coins c WHERE c.id = r.coin_id)`,
    )
    if (orfaos.rows[0].n) throw new Error(`${orfaos.rows[0].n} recibo(s) sem moeda`)

    const genesis = await c.query(
      `SELECT count(*)::int n FROM aurea.analises WHERE hash_anterior = repeat('0', 64)`,
    )
    if (genesis.rows[0].n !== 1) {
      throw new Error(`a corrente deveria ter 1 âncora no GENESIS, tem ${genesis.rows[0].n}`)
    }

    const aindaTem = await c.query('SELECT count(*)::int n FROM aurea.users WHERE email = $1', [EMAIL])
    if (aindaTem.rows[0].n !== 1) throw new Error('a conta sumiu — isso não deveria acontecer')

    console.log(
      `\n  CONFERÊNCIA: conta preservada, 0 moedas dela, ${restamAnalises.rows[0].n} análises restantes`,
    )

    await c.query('commit')
    console.log('\nCOMMIT OK — acervo da Rozâne zerado, pronto para recadastro.')
  } catch (e) {
    await c.query('rollback')
    console.error('\nROLLBACK — nada foi gravado. Motivo:', e.message)
    process.exitCode = 1
  }
  await c.end()
})()
