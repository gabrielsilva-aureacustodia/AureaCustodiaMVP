/**
 * COLOCA AS 127 MOEDAS NAS CAIXAS CERTAS E RECALCULA A CADEIA DE HASHES (05/10/2026).
 *
 * O QUE ESTAVA ERRADO
 * -------------------
 * O Rogério cadastrou o acervo de 127 moedas e a caixa não ficou registrada como deveria:
 *
 *  - só a RO-000001 tinha caixa gravada (EB-001, sem posição);
 *  - 98 moedas tinham posição de 2 a 100 e caixa NULA;
 *  - as 28 restantes (cadastro direto) não tinham caixa nem posição;
 *  - EB-001 não estava cadastrada em `aurea.caixas`, e nenhuma caixa dizia de que moeda era.
 *
 * O Gabriel pediu: a partir da moeda 101 da Bandeira, para a EB-002; as de Direitos Humanos, para a
 * DH-001. São 120 moedas da Bandeira e 7 de Direitos Humanos (a RO-000111 e a RO-000122 a 127 — a
 * contagem do pedido, "121 a 127", era por ordem de chegada, e bate com o total de 127).
 *
 * REGRA APLICADA (por ordem do código da moeda, dentro de cada tipo)
 * ------------------------------------------------------------------
 *   Bandeira, 1ª a 100ª  -> EB-001, posição = ordem  (RO-000001..RO-000100, posição 1 a 100)
 *   Bandeira, 101ª a 120ª-> EB-002, posição 1 a 20   (RO-000101..110 e RO-000112..121)
 *   Direitos Humanos     -> DH-001, posição 1 a 7    (RO-000111 e RO-000122..127)
 *
 * E o catálogo de caixas: EB-001 passa a existir (100 posições) e as três ganham `tipo_moeda`
 * (migration 040), que é o que impede o problema de voltar.
 *
 * POR QUE ISSO NÃO É UM UPDATE SIMPLES
 * ------------------------------------
 * `caixa` e `posicao` estão em `CAMPOS_DA_ANALISE` (src/domain/analise.ts), ou seja, DENTRO do hash do
 * laudo. Mudar a caixa muda o hash daquele laudo e, como a cadeia é encadeada, o de todos os
 * seguintes; e o hash do laudo É o hash do recibo da moeda. Um UPDATE só na caixa deixaria os hashes
 * mentindo sobre o próprio conteúdo. É o mesmo cuidado de corrigir-peso-dos-laudos.cjs (28/09/2026), e
 * a mesma trava: antes de escrever qualquer coisa, a fórmula daqui precisa REPRODUZIR os hashes
 * atuais, byte a byte. Se divergir, nada é escrito.
 *
 * Sem `--aplicar`, só relata.
 */
const fs = require('fs')
const crypto = require('crypto')
const pg = require('pg')

const APLICAR = process.argv.includes('--aplicar')
const url = fs.readFileSync('.env.local', 'utf8').match(/^POSTGRES_URL="?([^"\r\n]+)/m)[1]

const GENESIS = '0'.repeat(64)
const BANDEIRA = 'Entrega da Bandeira Olímpica'
const DH = 'Direitos Humanos'

/** CAMPOS_DA_ANALISE, NESTA ORDEM (src/domain/analise.ts). */
const CAMPOS = [
  'protocolo',
  'protocoloEnvio',
  'codigoMoeda',
  'codigoRecibo',
  'tipoMoeda',
  'ano',
  'pesoMg',
  'veredito',
  'motivoRecusa',
  'operador',
  'aprovador',
  'caixa',
  'posicao',
  'validadoEm',
  'caminhoVideo',
]

function canonico(v) {
  if (v === null || v === undefined) return ''
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) throw new Error(`Campo numérico inválido: ${String(v)}`)
    return String(v)
  }
  return String(v)
}

function hashEncadeado(anterior, a) {
  const texto = anterior + '\n' + CAMPOS.map((c) => canonico(a[c])).join('|')
  return crypto.createHash('sha256').update(texto, 'utf8').digest('hex')
}

function daLinha(r) {
  return {
    protocolo: r.protocolo,
    protocoloEnvio: r.protocolo_envio,
    codigoMoeda: r.codigo_moeda,
    codigoRecibo: r.codigo_recibo,
    tipoMoeda: r.tipo_moeda,
    ano: Number(r.ano),
    pesoMg: Number(r.peso_mg),
    veredito: r.veredito,
    motivoRecusa: r.motivo_recusa,
    operador: r.operador,
    aprovador: r.aprovador,
    caixa: r.caixa,
    posicao: r.posicao_caixa === null ? null : Number(r.posicao_caixa),
    validadoEm: Number(r.validado_em),
    caminhoVideo: r.caminho_video,
    hashAnterior: r.hash_anterior,
    hash: r.hash,
  }
}

const SELECT = `SELECT protocolo, posicao, protocolo_envio, codigo_moeda, codigo_recibo, tipo_moeda, ano,
                       peso_mg, veredito, motivo_recusa, operador, aprovador, caixa, posicao_caixa,
                       validado_em, caminho_video, hash_anterior, hash
                  FROM aurea.analises ORDER BY posicao`

;(async () => {
  const c = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } })
  await c.connect()

  const analises = (await c.query(SELECT)).rows.map(daLinha)
  console.log(`${analises.length} laudos na corrente.\n`)

  /* ---------- 1. A fórmula daqui reproduz a corrente que já existe? ---------- */
  let anterior = GENESIS
  let divergencias = 0
  for (const a of analises) {
    if (a.hashAnterior !== anterior || a.hash !== hashEncadeado(anterior, a)) divergencias++
    anterior = a.hash
  }
  if (divergencias > 0) {
    console.error(`ABORTADO: ${divergencias} divergência(s) ao reproduzir a corrente ATUAL. Nada foi escrito.`)
    await c.end()
    process.exit(1)
  }
  console.log(`✓ A fórmula confere: os ${analises.length} hashes gravados foram reproduzidos do zero.\n`)

  /* ---------- 2. Onde cada moeda deve ficar ---------- */
  const aprovadas = analises.filter((a) => a.veredito === 'aprovada' && a.codigoMoeda)
  const porCodigo = (x, y) => x.codigoMoeda.localeCompare(y.codigoMoeda)
  const bandeira = aprovadas.filter((a) => a.tipoMoeda === BANDEIRA).sort(porCodigo)
  const dh = aprovadas.filter((a) => a.tipoMoeda === DH).sort(porCodigo)
  const outros = aprovadas.filter((a) => a.tipoMoeda !== BANDEIRA && a.tipoMoeda !== DH)

  const destino = new Map()
  bandeira.forEach((a, i) => {
    destino.set(a.codigoMoeda, i < 100 ? { caixa: 'EB-001', posicao: i + 1 } : { caixa: 'EB-002', posicao: i - 99 })
  })
  dh.forEach((a, i) => destino.set(a.codigoMoeda, { caixa: 'DH-001', posicao: i + 1 }))

  console.log(`Bandeira: ${bandeira.length} moedas · Direitos Humanos: ${dh.length} · outros tipos (não mexo): ${outros.length}`)
  if (bandeira.length > 200 || dh.length > 100) {
    console.error('ABORTADO: contagem inesperada de moedas por tipo.')
    await c.end()
    process.exit(1)
  }

  const resumo = {}
  const mudancas = []
  for (const a of aprovadas) {
    const d = destino.get(a.codigoMoeda)
    if (!d) continue
    const k = `${a.tipoMoeda} -> ${d.caixa}`
    resumo[k] = (resumo[k] || 0) + 1
    if (a.caixa !== d.caixa || a.posicao !== d.posicao) mudancas.push({ a, de: `${a.caixa ?? '-'}:${a.posicao ?? '-'}`, para: `${d.caixa}:${d.posicao}` })
    a.__novo = d
  }
  console.log('\nDestino:')
  for (const [k, n] of Object.entries(resumo)) console.log(`  ${n}x ${k}`)
  console.log(`\n${mudancas.length} laudo(s) mudam de caixa/posição. Amostra:`)
  for (const m of [mudancas[0], mudancas[1], mudancas[99], mudancas[100], mudancas[mudancas.length - 8], mudancas[mudancas.length - 1]].filter(Boolean)) {
    console.log(`  ${m.a.codigoMoeda} (${m.a.tipoMoeda.slice(0, 12)}): ${m.de} -> ${m.para}`)
  }

  if (mudancas.length === 0) {
    console.log('\nNada a mudar.')
    await c.end()
    return
  }

  /* ---------- 3. Recalcular a corrente ---------- */
  for (const a of aprovadas) {
    if (a.__novo) {
      a.caixa = a.__novo.caixa
      a.posicao = a.__novo.posicao
    }
  }
  anterior = GENESIS
  const novos = []
  for (const a of analises) {
    const hash = hashEncadeado(anterior, a)
    if (a.hashAnterior !== anterior || a.hash !== hash) {
      novos.push({ protocolo: a.protocolo, codigoRecibo: a.codigoRecibo, hashAnterior: anterior, hash, caixa: a.caixa, posicao: a.posicao })
    }
    a.hashAnterior = anterior
    a.hash = hash
    anterior = hash
  }
  console.log(`\n${novos.length} laudos mudam de hash (o primeiro alterado e todos os seguintes).`)

  if (!APLICAR) {
    console.log('\n(simulação — rode com --aplicar para gravar)')
    await c.end()
    return
  }

  /* ---------- 4. Gravar: caixas, laudos e recibos, numa transação só ---------- */
  await c.query('BEGIN')
  try {
    const agora = Date.now()
    await c.query(
      `INSERT INTO aurea.caixas (codigo, rotulo, local, capacidade, ativa, created_at, tipo_moeda)
       VALUES ('EB-001', 'Bandeira - caixa 1', '', 100, true, $1, $2)
       ON CONFLICT (codigo) DO NOTHING`,
      [agora, BANDEIRA],
    )
    await c.query(`UPDATE aurea.caixas SET tipo_moeda = $1 WHERE codigo IN ('EB-001', 'EB-002')`, [BANDEIRA])
    await c.query(`UPDATE aurea.caixas SET tipo_moeda = $1 WHERE codigo = 'DH-001'`, [DH])

    for (const n of novos) {
      await c.query(
        `UPDATE aurea.analises SET caixa = $1, posicao_caixa = $2, hash_anterior = $3, hash = $4 WHERE protocolo = $5`,
        [n.caixa, n.posicao, n.hashAnterior, n.hash, n.protocolo],
      )
      if (n.codigoRecibo) await c.query(`UPDATE aurea.recibos SET hash = $1 WHERE codigo = $2`, [n.hash, n.codigoRecibo])
    }
    await c.query('COMMIT')
  } catch (e) {
    await c.query('ROLLBACK')
    throw e
  }
  console.log(`\n✓ ${novos.length} laudos e recibos atualizados; caixas cadastradas e tipadas.`)

  /* ---------- 5. Reler e conferir ---------- */
  const depois = (await c.query(SELECT)).rows.map(daLinha)
  anterior = GENESIS
  let erros = 0
  for (const a of depois) {
    if (a.hashAnterior !== anterior || a.hash !== hashEncadeado(anterior, a)) erros++
    anterior = a.hash
  }
  const desalinhados = (
    await c.query(`SELECT count(*)::int n FROM aurea.analises a JOIN aurea.recibos r ON r.codigo = a.codigo_recibo WHERE r.hash <> a.hash`)
  ).rows[0].n
  const ocupacao = (
    await c.query(
      `SELECT caixa, tipo_moeda, count(*)::int n, min(posicao_caixa) pmin, max(posicao_caixa) pmax,
              count(DISTINCT posicao_caixa)::int distintas
         FROM aurea.analises WHERE veredito = 'aprovada' GROUP BY 1, 2 ORDER BY 1`,
    )
  ).rows
  const caixas = (await c.query(`SELECT codigo, capacidade, tipo_moeda, ativa FROM aurea.caixas ORDER BY codigo`)).rows

  console.log('\nCONFERÊNCIA FINAL')
  console.log(`  corrente de hashes: ${erros === 0 ? 'íntegra' : erros + ' divergência(s)'}`)
  console.log(`  recibos fora de sincronia com o laudo: ${desalinhados}`)
  console.log('  ocupação:')
  for (const o of ocupacao) console.log(`    ${o.caixa}: ${o.n} moedas (${o.tipo_moeda}), posições ${o.pmin}-${o.pmax}, ${o.distintas} distintas`)
  console.log('  caixas:', JSON.stringify(caixas))

  await c.end()
  if (erros > 0 || desalinhados > 0) process.exit(1)
})().catch((e) => {
  console.error(e.message)
  process.exit(1)
})
