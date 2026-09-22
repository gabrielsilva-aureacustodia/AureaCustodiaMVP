/**
 * RENUMERA O ACERVO PARA 1–100 — rodar UMA VEZ, em 22/09/2026.
 *
 * Pedido do Gabriel: as 100 moedas cadastradas estão numeradas RO-000111 a
 * RO-000210, porque o contador `seq` guardava o rastro de moedas que já foram
 * apagadas em limpezas anteriores. Ele decidiu ignorar esse rastro e renumerar
 * o acervo vivo de 1 a 100, com recibos e protocolos acompanhando.
 *
 * ISSO DESFAZ UMA SALVAGUARDA, DE PROPÓSITO E POR DECISÃO DELE. O `seq` nunca
 * era reiniciado justamente para que um código já emitido não fosse reusado por
 * outra moeda: um REC-000051 que existiu e um REC-000051 novo e diferente são
 * indistinguíveis em qualquer conversa futura. Como as moedas antigas foram
 * apagadas e nunca chegaram a cliente nenhum, ele julgou o risco aceitável.
 * Fica registrado aqui porque quem ler o banco daqui a um ano precisa saber.
 *
 * O QUE MUDA
 * ----------
 *   coins.id            RO-000111..210  ->  RO-000001..100
 *   recibos.codigo      REC-000111..210 ->  REC-000001..100
 *   analises.protocolo  RO-ANL-0061..0160 -> RO-ANL-0001..0100
 *   envios.protocolo    RO-ENV-0052..0054 -> RO-ENV-0001..0003
 *   seq                 coin/analise/envio recomeçam no total vivo
 *
 * A CORRENTE DE HASHES É RECALCULADA INTEIRA, e tem de ser: `protocolo`,
 * `protocoloEnvio`, `codigoMoeda` e `codigoRecibo` estão em CAMPOS_DA_ANALISE
 * (src/domain/analise.ts), então trocar qualquer um deles muda o hash daquela
 * análise e, por encadeamento, o de todas as seguintes. Não existe UPDATE
 * pontual aqui: ou se refaz do GENESIS, ou a corrente quebra.
 *
 * A PROVA DE QUE A FÓRMULA AQUI É A MESMA DO APLICATIVO
 * ----------------------------------------------------
 * Antes de escrever qualquer coisa, o script recalcula a corrente ATUAL com os
 * valores ATUAIS e confere contra os hashes gravados. Se um único hash não
 * bater, ele aborta sem tocar no banco — porque aí a divergência está na minha
 * leitura dos campos, não no acervo, e renumerar em cima disso produziria uma
 * corrente que só este script sabe conferir.
 *
 * O SHA-256 vem do `node:crypto`. O domínio tem implementação própria, pura, e
 * o `hash.test.ts` a confere contra o `node:crypto` no mesmo teste — são o
 * mesmo algoritmo sobre os mesmos bytes UTF-8.
 *
 * Tudo numa transação: ou passa inteiro, ou nada é gravado.
 */
const fs = require('fs')
const crypto = require('node:crypto')
const pg = require('pg')

const url = fs.readFileSync('.env.local', 'utf8').match(/^POSTGRES_URL="?([^"\r\n]+)/m)[1]

const GENESIS = '0'.repeat(64)

/** Forma canônica de um campo — espelha `campoCanonico` de src/domain/hash.ts. */
function campoCanonico(v) {
  if (v === null || v === undefined) return ''
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) throw new Error(`Campo numérico inválido: ${String(v)}`)
    return String(v)
  }
  return v
}

/** `hashEncadeado` de src/domain/hash.ts: SHA-256( anterior + '\n' + campos.join('|') ). */
function hashEncadeado(hashAnterior, campos) {
  const texto = hashAnterior + '\n' + campos.map(campoCanonico).join('|')
  return crypto.createHash('sha256').update(texto, 'utf8').digest('hex')
}

/**
 * CAMPOS_DA_ANALISE, na ordem exata de src/domain/analise.ts.
 * Os tipos seguem `carregarAnalises` (repositories/analises.ts): ano, peso,
 * posição e validadoEm são NÚMEROS, e a posição na caixa pode ser nula.
 */
function camposDaAnalise(a) {
  return [
    a.protocolo,
    a.protocolo_envio,
    a.codigo_moeda,
    a.codigo_recibo,
    a.tipo_moeda,
    Number(a.ano),
    Number(a.peso_mg),
    a.veredito,
    a.motivo_recusa,
    a.operador,
    a.aprovador,
    a.caixa,
    a.posicao_caixa === null ? null : Number(a.posicao_caixa),
    Number(a.validado_em),
    a.caminho_video,
  ]
}

/** Refaz a corrente do GENESIS e devolve o hash de cada linha, na ordem dada. */
function correnteDe(analises) {
  let anterior = GENESIS
  return analises.map((a) => {
    const hash = hashEncadeado(anterior, camposDaAnalise(a))
    const par = { hashAnterior: anterior, hash }
    anterior = hash
    return par
  })
}

const pad = (n, casas) => String(n).padStart(casas, '0')

;(async () => {
  const c = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } })
  await c.connect()

  // A ordem da corrente é `posicao`, a mesma que `carregarAnalises` usa. Não é
  // `validado_em`: duas análises fechadas no mesmo milissegundo empatariam, e o
  // empate desfeito em outra ordem produziria outra corrente.
  const { rows: analises } = await c.query(
    `SELECT posicao, protocolo, protocolo_envio, codigo_moeda, codigo_recibo, tipo_moeda,
            ano, peso_mg, veredito, motivo_recusa, operador, aprovador, caixa, posicao_caixa,
            validado_em, caminho_video, hash_anterior, hash
       FROM aurea.analises ORDER BY posicao`,
  )

  console.log(`Análises: ${analises.length}`)

  // ---- 1. CONFERÊNCIA: a fórmula daqui reproduz a corrente gravada? --------
  const atual = correnteDe(analises)
  let divergencias = 0
  for (let i = 0; i < analises.length; i++) {
    if (analises[i].hash !== atual[i].hash || analises[i].hash_anterior !== atual[i].hashAnterior) {
      if (divergencias < 3) {
        console.error(`  DIVERGE em ${analises[i].protocolo}:`)
        console.error(`    gravado:    ${analises[i].hash_anterior} -> ${analises[i].hash}`)
        console.error(`    recalculado:${atual[i].hashAnterior} -> ${atual[i].hash}`)
      }
      divergencias++
    }
  }
  if (divergencias) {
    console.error(
      `\nABORTADO: ${divergencias} de ${analises.length} análises não fecham com a fórmula deste script.`,
    )
    console.error('Nada foi gravado. A leitura dos campos precisa ser corrigida antes de renumerar.')
    await c.end()
    process.exitCode = 1
    return
  }
  console.log('  corrente atual confere com a fórmula — pode renumerar\n')

  // ---- 2. O MAPA ----------------------------------------------------------
  const moedaNova = new Map()
  const reciboNovo = new Map()
  const analiseNova = new Map()
  analises.forEach((a, i) => {
    const n = i + 1
    moedaNova.set(a.codigo_moeda, 'RO-' + pad(n, 6))
    reciboNovo.set(a.codigo_recibo, 'REC-' + pad(n, 6))
    analiseNova.set(a.protocolo, 'RO-ANL-' + pad(n, 4))
  })

  const { rows: envios } = await c.query('SELECT protocolo FROM aurea.envios ORDER BY protocolo')
  const envioNovo = new Map()
  envios.forEach((e, i) => envioNovo.set(e.protocolo, 'RO-ENV-' + pad(i + 1, 4)))

  const { rows: soltas } = await c.query(
    `SELECT id FROM aurea.coins WHERE id NOT IN (SELECT codigo_moeda FROM aurea.analises)`,
  )
  if (soltas.length) {
    console.error(`ABORTADO: ${soltas.length} moeda(s) sem análise — o mapa não as cobriria.`)
    console.error('  ' + soltas.map((r) => r.id).join(', '))
    await c.end()
    process.exitCode = 1
    return
  }

  console.log('MAPA:')
  console.log(`  moedas  ${analises[0].codigo_moeda} -> ${moedaNova.get(analises[0].codigo_moeda)}`)
  const ult = analises[analises.length - 1]
  console.log(`          ${ult.codigo_moeda} -> ${moedaNova.get(ult.codigo_moeda)}`)
  console.log(`  envios  ${[...envioNovo].map(([a, b]) => `${a}->${b}`).join(', ')}`)

  // ---- 3. A TRANSAÇÃO -----------------------------------------------------
  await c.query('begin')
  try {
    // As chaves estrangeiras apontam para `coins.id` e `envios.protocolo`, que
    // são exatamente o que vai mudar. Nenhuma foi declarada ON UPDATE CASCADE,
    // e o Postgres confere FK ao fim de cada comando — então elas saem e voltam
    // dentro da transação, com a definição original lida do catálogo.
    const { rows: fks } = await c.query(
      `SELECT con.conname, rel.relname AS tabela, pg_get_constraintdef(con.oid) AS def
         FROM pg_constraint con
         JOIN pg_class rel ON rel.oid = con.conrelid
         JOIN pg_class ref ON ref.oid = con.confrelid
         JOIN pg_namespace n ON n.oid = rel.relnamespace
        WHERE con.contype = 'f' AND n.nspname = 'aurea'
          AND ref.relname IN ('coins', 'envios')`,
    )
    for (const fk of fks) {
      await c.query(`ALTER TABLE aurea.${fk.tabela} DROP CONSTRAINT ${fk.conname}`)
    }
    console.log(`\n  ${fks.length} chave(s) estrangeira(s) suspensa(s)`)

    // Prefixo temporário: RO-ANL-0061..0160 e RO-ANL-0001..0100 se sobrepõem na
    // faixa 61-100, então renomear direto esbarraria no próprio destino. Os
    // outros códigos não colidem, mas passam pelo mesmo caminho para a operação
    // ter uma regra só.
    const emDuasPassadas = async (sql, mapa) => {
      for (const [velho, novo] of mapa) await c.query(sql, ['TMP~' + novo, velho])
      for (const [, novo] of mapa) await c.query(sql, [novo, 'TMP~' + novo])
    }

    await emDuasPassadas('UPDATE aurea.coins SET id = $1 WHERE id = $2', moedaNova)
    await emDuasPassadas('UPDATE aurea.recibos SET coin_id = $1 WHERE coin_id = $2', moedaNova)
    await emDuasPassadas('UPDATE aurea.recibos SET codigo = $1 WHERE codigo = $2', reciboNovo)
    await emDuasPassadas('UPDATE aurea.sell_offers SET coin_id = $1 WHERE coin_id = $2', moedaNova)
    await emDuasPassadas('UPDATE aurea.retiradas SET coin_id = $1 WHERE coin_id = $2', moedaNova)
    await emDuasPassadas('UPDATE aurea.envios SET protocolo = $1 WHERE protocolo = $2', envioNovo)
    await emDuasPassadas('UPDATE aurea.rastreios SET protocolo = $1 WHERE protocolo = $2', envioNovo)
    await emDuasPassadas('UPDATE aurea.coins SET protocolo = $1 WHERE protocolo = $2', envioNovo)
    await emDuasPassadas(
      'UPDATE aurea.planos_custodia SET protocolo_envio = $1 WHERE protocolo_envio = $2',
      envioNovo,
    )
    await emDuasPassadas('UPDATE aurea.analises SET protocolo = $1 WHERE protocolo = $2', analiseNova)
    await emDuasPassadas(
      'UPDATE aurea.analises SET codigo_moeda = $1 WHERE codigo_moeda = $2',
      moedaNova,
    )
    await emDuasPassadas(
      'UPDATE aurea.analises SET codigo_recibo = $1 WHERE codigo_recibo = $2',
      reciboNovo,
    )
    await emDuasPassadas(
      'UPDATE aurea.analises SET protocolo_envio = $1 WHERE protocolo_envio = $2',
      envioNovo,
    )

    // Arrays de moedas nos planos e faturas: hoje vazios, mas o script não pode
    // depender disso — uma fatura emitida amanhã carregaria os códigos velhos.
    for (const [velho, novo] of moedaNova) {
      await c.query(
        `UPDATE aurea.planos_custodia SET moeda_ids = array_replace(moeda_ids, $1, $2)
          WHERE $1 = ANY(moeda_ids)`,
        [velho, novo],
      )
      await c.query(
        `UPDATE aurea.faturas_custodia SET moeda_ids = array_replace(moeda_ids, $1, $2)
          WHERE $1 = ANY(moeda_ids)`,
        [velho, novo],
      )
    }

    // ---- 4. A corrente, refeita do GENESIS com os códigos novos ------------
    const { rows: depois } = await c.query(
      `SELECT posicao, protocolo, protocolo_envio, codigo_moeda, codigo_recibo, tipo_moeda,
              ano, peso_mg, veredito, motivo_recusa, operador, aprovador, caixa, posicao_caixa,
              validado_em, caminho_video
         FROM aurea.analises ORDER BY posicao`,
    )
    const nova = correnteDe(depois)
    for (let i = 0; i < depois.length; i++) {
      await c.query(
        'UPDATE aurea.analises SET hash_anterior = $1, hash = $2 WHERE posicao = $3',
        [nova[i].hashAnterior, nova[i].hash, depois[i].posicao],
      )
    }
    console.log(`  corrente refeita: ${depois.length} análises a partir do GENESIS`)

    // O recibo guarda o hash do laudo que o emitiu.
    for (let i = 0; i < depois.length; i++) {
      await c.query('UPDATE aurea.recibos SET hash = $1 WHERE codigo = $2', [
        nova[i].hash,
        depois[i].codigo_recibo,
      ])
    }

    // ---- 5. Contadores ----------------------------------------------------
    await c.query('UPDATE aurea.seq SET coin = $1, analise = $2, envio = $3 WHERE id = 1', [
      analises.length,
      analises.length,
      envios.length,
    ])

    for (const fk of fks) {
      await c.query(`ALTER TABLE aurea.${fk.tabela} ADD CONSTRAINT ${fk.conname} ${fk.def}`)
    }
    console.log(`  ${fks.length} chave(s) estrangeira(s) restaurada(s)`)

    // ---- 6. CONFERÊNCIA FINAL, ainda dentro da transação ------------------
    const { rows: conf } = await c.query(
      `SELECT posicao, protocolo, protocolo_envio, codigo_moeda, codigo_recibo, tipo_moeda,
              ano, peso_mg, veredito, motivo_recusa, operador, aprovador, caixa, posicao_caixa,
              validado_em, caminho_video, hash_anterior, hash
         FROM aurea.analises ORDER BY posicao`,
    )
    const esperada = correnteDe(conf)
    let ruins = 0
    for (let i = 0; i < conf.length; i++) {
      if (conf[i].hash !== esperada[i].hash || conf[i].hash_anterior !== esperada[i].hashAnterior) {
        ruins++
      }
    }
    if (ruins) throw new Error(`corrente não fecha após a renumeração: ${ruins} análise(s)`)

    const orfas = await c.query(
      `SELECT count(*)::int n FROM aurea.recibos r
        WHERE NOT EXISTS (SELECT 1 FROM aurea.coins c WHERE c.id = r.coin_id)`,
    )
    if (orfas.rows[0].n) throw new Error(`${orfas.rows[0].n} recibo(s) sem moeda`)

    const faixa = await c.query(
      `SELECT min(id) menor, max(id) maior, count(*)::int n FROM aurea.coins`,
    )
    const seqFinal = await c.query('SELECT coin, analise, envio FROM aurea.seq WHERE id = 1')

    console.log(
      `\n  CONFERÊNCIA: ${faixa.rows[0].n} moedas de ${faixa.rows[0].menor} a ${faixa.rows[0].maior}`,
    )
    console.log(`  corrente íntegra do GENESIS até a ${conf.length}ª análise`)
    console.log(`  seq: ${JSON.stringify(seqFinal.rows[0])}`)

    await c.query('commit')
    console.log('\nCOMMIT OK — acervo renumerado de 1 a ' + analises.length + '.')
  } catch (e) {
    await c.query('rollback')
    console.error('\nROLLBACK — nada foi gravado. Motivo:', e.message)
    process.exitCode = 1
  }
  await c.end()
})()
