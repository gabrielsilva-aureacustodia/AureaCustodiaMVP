/**
 * ZERA PLANOS E FATURAMENTO DE CUSTÓDIA — rodar UMA VEZ, em 22/09/2026.
 *
 * Pedido do Gabriel: apagar os planos de custódia ativos ou a pagar, os
 * registros de planos antigos e o faturamento anterior, para que as contas
 * possam contratar a custódia no plano novo (mensal, R$ 2,00 por moeda).
 *
 * O que estava no banco:
 *   PLC-000006  siqueiraroger1  ANUAL  R$ 2.400,00  aguardando_pagamento
 *   PLC-000007  gabriel.silva   mensal R$     2,00  aguardando_pagamento
 * O primeiro é do plano anual, que deixou de existir em 21/09. O segundo é do
 * plano novo, mas foi contratado antes desta limpeza e sai junto.
 *
 * A ASSINATURA DO MERCADO PAGO É CANCELADA ANTES DA LINHA SUMIR
 * -------------------------------------------------------------
 * PLC-000007 carrega `assinatura_id`, e o formato dele não é o da simulação
 * (`preapp-mock-…`): é uma assinatura recorrente criada de verdade, em
 * produção. Apagar a linha sem cancelar deixaria o Mercado Pago cobrando todo
 * mês sem nada no sistema apontando para a cobrança — e ninguém descobriria
 * até alguém estranhar o extrato.
 *
 * Por isso o script RECUSA apagar plano com assinatura enquanto não conseguir
 * cancelá-la. Sem MP_ACCESS_TOKEN no ambiente, ele limpa todo o resto e diz
 * exatamente o que ficou para trás e por quê. Nunca apaga silenciosamente.
 *
 * O LIVRO-RAZÃO É REENCADEADO
 * ---------------------------
 * Os lançamentos de custódia (`tipo: 'custodia'`) referenciam as faturas que
 * somem. Eles saem junto, e como o livro é uma corrente de hashes — e um dos
 * que saem é justamente o que está ancorado no GENESIS — os que restam são
 * reencadeados do começo. Os `saldo_inicial` ficam: são fato de conta, não
 * faturamento.
 *
 * Tudo numa transação: ou passa inteiro, ou nada é gravado.
 */
const fs = require('fs')
const crypto = require('node:crypto')
const pg = require('pg')

const env = fs.readFileSync('.env.local', 'utf8')
const ler = (k) => {
  const m = env.match(new RegExp('^' + k + '="?([^"\\r\\n]+)', 'm'))
  return process.env[k] ?? (m ? m[1] : undefined)
}

const url = ler('POSTGRES_URL')
const mpToken = ler('MP_ACCESS_TOKEN')

const GENESIS = '0'.repeat(64)

function campoCanonico(v) {
  if (v === null || v === undefined) return ''
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) throw new Error(`Campo numérico inválido: ${String(v)}`)
    return String(v)
  }
  return v
}

function hashEncadeado(hashAnterior, campos) {
  return crypto
    .createHash('sha256')
    .update(hashAnterior + '\n' + campos.map(campoCanonico).join('|'), 'utf8')
    .digest('hex')
}

/** CAMPOS_DO_LANCAMENTO, na ordem de src/domain/ledger.ts. */
function camposDoLancamento(e) {
  return [
    Number(e.created_at),
    e.user_email,
    e.tipo,
    Number(e.valor),
    Number(e.sinal),
    Number(e.saldo_apos),
    e.tipo_moeda,
    e.quantidade === null ? null : Number(e.quantidade),
    e.ref_interna,
    e.ref_externa,
    e.descricao,
  ]
}

function correnteDe(lancamentos) {
  let anterior = GENESIS
  return lancamentos.map((e) => {
    const hash = hashEncadeado(anterior, camposDoLancamento(e))
    const par = { hashAnterior: anterior, hash }
    anterior = hash
    return par
  })
}

const COLUNAS = `id, created_at, user_email, tipo, valor, sinal, saldo_apos, tipo_moeda,
                 quantidade, ref_interna, ref_externa, descricao, hash_anterior, hash`

/** PUT /preapproval/{id} com status 'cancelled'. */
async function cancelarAssinatura(id) {
  if (!mpToken) return { ok: false, error: 'MP_ACCESS_TOKEN ausente do ambiente' }
  try {
    const res = await fetch(`https://api.mercadopago.com/preapproval/${id}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${mpToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: 'cancelled' }),
    })
    const corpo = await res.text()
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}: ${corpo.slice(0, 200)}` }
    return { ok: true, status: JSON.parse(corpo).status }
  } catch (e) {
    return { ok: false, error: e.message }
  }
}

;(async () => {
  const c = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } })
  await c.connect()

  const { rows: planos } = await c.query(
    'SELECT id, user_email, modalidade, status, valor_total, assinatura_id FROM aurea.planos_custodia ORDER BY id',
  )
  const { rows: faturas } = await c.query(
    'SELECT id, user_email, status, valor_cents FROM aurea.faturas_custodia ORDER BY id',
  )

  console.log(`PLANOS: ${planos.length}`)
  for (const p of planos) {
    console.log(
      `  ${p.id}  ${p.user_email}  ${p.modalidade}  ${p.status}  R$ ${(Number(p.valor_total) / 100).toFixed(2)}` +
        (p.assinatura_id ? `  assinatura ${p.assinatura_id}` : ''),
    )
  }
  console.log(`FATURAS: ${faturas.length}`)
  for (const f of faturas) console.log(`  ${f.id}  ${f.status}  R$ ${(Number(f.valor_cents) / 100).toFixed(2)}`)

  // ---- 1. Cancelar no Mercado Pago o que tiver assinatura -----------------
  const comAssinatura = planos.filter((p) => p.assinatura_id)
  const bloqueados = new Set()

  for (const p of comAssinatura) {
    const simulada = String(p.assinatura_id).startsWith('preapp-mock-')
    if (simulada) {
      console.log(`\n  ${p.id}: assinatura ${p.assinatura_id} é simulada — nada a cancelar.`)
      continue
    }
    console.log(`\n  ${p.id}: cancelando assinatura ${p.assinatura_id} no Mercado Pago…`)
    const r = await cancelarAssinatura(p.assinatura_id)
    if (r.ok) {
      console.log(`    cancelada (status: ${r.status})`)
    } else {
      console.error(`    FALHOU: ${r.error}`)
      bloqueados.add(p.id)
    }
  }

  if (bloqueados.size) {
    console.error(
      `\n  ${bloqueados.size} plano(s) NÃO serão apagados: a assinatura recorrente deles continua`,
    )
    console.error('  viva no Mercado Pago, e apagar a linha esconderia uma cobrança mensal ativa.')
    console.error('  Cancele no painel do Mercado Pago, ou ponha MP_ACCESS_TOKEN no .env.local')
    console.error('  e rode de novo. O resto da limpeza segue normalmente.')
  }

  const planosParaApagar = planos.filter((p) => !bloqueados.has(p.id)).map((p) => p.id)
  if (planosParaApagar.length === 0 && planos.length > 0) {
    console.error('\nNada a apagar sem resolver as assinaturas. Banco intacto.')
    await c.end()
    process.exitCode = 1
    return
  }

  // ---- 2. A transação ----------------------------------------------------
  await c.query('begin')
  try {
    // Fatura antes de plano: a fatura referencia o plano por chave estrangeira.
    const fat = await c.query(
      'DELETE FROM aurea.faturas_custodia WHERE plano_id = ANY($1::text[]) OR plano_id IS NULL',
      [planosParaApagar],
    )
    console.log(`\n  ${fat.rowCount} fatura(s) apagada(s)`)

    const pla = await c.query('DELETE FROM aurea.planos_custodia WHERE id = ANY($1::text[])', [
      planosParaApagar,
    ])
    console.log(`  ${pla.rowCount} plano(s) apagado(s)`)

    // Lançamentos de custódia: são o faturamento anterior no livro-razão.
    const led = await c.query(`DELETE FROM aurea.ledger_entries WHERE tipo = 'custodia'`)
    console.log(`  ${led.rowCount} lançamento(s) de custódia apagado(s) do livro-razão`)

    // ---- 3. Reencadear o que restou --------------------------------------
    const { rows: restantes } = await c.query(
      `SELECT ${COLUNAS} FROM aurea.ledger_entries ORDER BY id`,
    )
    const nova = correnteDe(restantes)
    for (let i = 0; i < restantes.length; i++) {
      await c.query('UPDATE aurea.ledger_entries SET hash_anterior = $1, hash = $2 WHERE id = $3', [
        nova[i].hashAnterior,
        nova[i].hash,
        restantes[i].id,
      ])
    }

    const { rows: conf } = await c.query(`SELECT ${COLUNAS} FROM aurea.ledger_entries ORDER BY id`)
    const esperada = correnteDe(conf)
    const ruins = conf.filter(
      (e, i) => e.hash !== esperada[i].hash || e.hash_anterior !== esperada[i].hashAnterior,
    ).length
    if (ruins) throw new Error(`livro-razão não fecha: ${ruins} lançamento(s)`)
    console.log(`  livro-razão reencadeado: ${conf.length} lançamento(s) a partir do GENESIS`)

    const sobra = await c.query(
      'SELECT count(*)::int p FROM aurea.planos_custodia',
    )
    const sobraF = await c.query('SELECT count(*)::int f FROM aurea.faturas_custodia')
    console.log(
      `\n  CONFERÊNCIA: ${sobra.rows[0].p} plano(s) e ${sobraF.rows[0].f} fatura(s) restantes`,
    )

    await c.query('commit')
    console.log('\nCOMMIT OK — custódia zerada, pronta para o plano novo.')
  } catch (e) {
    await c.query('rollback')
    console.error('\nROLLBACK — nada foi gravado. Motivo:', e.message)
    process.exitCode = 1
  }
  await c.end()
})()
