/**
 * CORREÇÃO DO PESO NOS LAUDOS E RECÁLCULO DA CADEIA DE HASHES (28/09/2026).
 *
 * O QUE ESTAVA ERRADO
 * -------------------
 * O catálogo vindo do banco chegava sem `pesoPadraoMg` — a tabela
 * `aurea.tipos_moeda` não tem essa coluna, e `catalogoDasLinhas` não resgatava
 * o valor do código (corrigido em 25/09). O cadastro direto, que não passa pela
 * balança da bancada e por isso depende do peso de catálogo, gravou:
 *
 *   - 10 laudos com `peso_mg = 0`  — o laudo afirmando que a moeda não pesa nada;
 *   - 17 laudos com `peso_mg = 7`  — alguém digitou 7 GRAMAS num campo que pede
 *                                    miligramas, e nada barrou.
 *
 * O correto é o peso de catálogo do tipo: 7000 mg na Entrega da Bandeira
 * Olímpica, 7840 mg na Direitos Humanos.
 *
 * POR QUE ISSO NÃO É UM UPDATE SIMPLES
 * ------------------------------------
 * `pesoMg` está em `CAMPOS_DA_ANALISE` (src/domain/analise.ts), ou seja, DENTRO
 * do hash. Corrigir o peso muda o hash daquele laudo e, como a cadeia é
 * encadeada, de todos os laudos seguintes. E o hash do laudo É o hash do recibo
 * da moeda, então `aurea.recibos.hash` acompanha.
 *
 * Um UPDATE só no peso deixaria 127 hashes mentindo sobre o próprio conteúdo —
 * uma corrente que confere entre si e não confere com os dados. Pior do que o
 * peso errado, porque a auditoria passaria.
 *
 * A TRAVA QUE FAZ ESTE SCRIPT SER SEGURO
 * --------------------------------------
 * Antes de escrever qualquer coisa, ele RECALCULA a cadeia inteira a partir dos
 * dados atuais e exige bater com os 127 hashes já gravados. Se a fórmula aqui
 * divergir da do domínio em um caractere, isso aparece antes de o primeiro
 * UPDATE sair — foi a mesma trava usada na renumeração do acervo em 22/09.
 *
 * Sem `--aplicar`, só relata.
 */
const fs = require('fs')
const crypto = require('crypto')
const pg = require('pg')

const APLICAR = process.argv.includes('--aplicar')
const url = fs.readFileSync('.env.local', 'utf8').match(/^POSTGRES_URL="?([^"\r\n]+)/m)[1]

/** 64 zeros — o `hashAnterior` do primeiro laudo (domain/hash.ts). */
const GENESIS = '0'.repeat(64)

/** `pesoPadraoMg` de COIN_TYPES (src/domain/constants.ts). */
const PESO_DE_CATALOGO = {
  'Entrega da Bandeira Olímpica': 7000,
  'Direitos Humanos': 7840,
}

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

/** `campoCanonico`: null vira '', número vira decimal, texto entra como está. */
function canonico(v) {
  if (v === null || v === undefined) return ''
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) throw new Error(`Campo numérico inválido: ${String(v)}`)
    return String(v)
  }
  return String(v)
}

/** `hashEncadeado` = SHA-256( anterior + '\n' + campos.join('|') ). */
function hashEncadeado(anterior, a) {
  const texto = anterior + '\n' + CAMPOS.map((c) => canonico(a[c])).join('|')
  return crypto.createHash('sha256').update(texto, 'utf8').digest('hex')
}

function daLinha(r) {
  return {
    posicaoNaCadeia: Number(r.posicao),
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
    origem: r.origem,
  }
}

;(async () => {
  const c = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } })
  await c.connect()

  const { rows } = await c.query(
    `SELECT protocolo, posicao, protocolo_envio, codigo_moeda, codigo_recibo, tipo_moeda, ano,
            peso_mg, veredito, motivo_recusa, operador, aprovador, caixa, posicao_caixa,
            validado_em, caminho_video, hash_anterior, hash, origem
       FROM aurea.analises
      ORDER BY posicao`,
  )
  const analises = rows.map(daLinha)
  console.log(`${analises.length} laudos na corrente.\n`)

  /* ---------- 1. A fórmula daqui reproduz a corrente que já existe? ---------- */
  let anterior = GENESIS
  let divergencias = 0
  for (const a of analises) {
    const esperado = hashEncadeado(anterior, a)
    if (a.hashAnterior !== anterior || a.hash !== esperado) {
      divergencias++
      if (divergencias <= 3) {
        console.error(`  divergência em ${a.protocolo}: gravado ${a.hash}, recalculado ${esperado}`)
      }
    }
    anterior = a.hash
  }
  if (divergencias > 0) {
    console.error(
      `\nABORTADO: ${divergencias} divergência(s) ao reproduzir a corrente ATUAL.\n` +
        'A fórmula deste script não corresponde à do domínio, ou os dados já estão inconsistentes.\n' +
        'Nada foi escrito.',
    )
    await c.end()
    process.exit(1)
  }
  console.log('✓ A fórmula confere: os 127 hashes gravados foram reproduzidos do zero.\n')

  /* ---------- 2. Quais laudos têm peso errado ---------- */
  const aCorrigir = []
  for (const a of analises) {
    const certo = PESO_DE_CATALOGO[a.tipoMoeda]
    if (certo === undefined) continue
    // Só o cadastro direto: o peso da bancada foi aferido de verdade na balança
    // e não se sobrescreve com valor de catálogo.
    if (a.origem !== 'cadastro_direto') continue
    if (a.pesoMg === certo) continue
    aCorrigir.push({ a, de: a.pesoMg, para: certo })
  }

  if (aCorrigir.length === 0) {
    console.log('Nenhum laudo com peso a corrigir.')
    await c.end()
    return
  }

  const porCaso = {}
  for (const { a, de, para } of aCorrigir) {
    const k = `${a.tipoMoeda}: ${de} mg → ${para} mg`
    porCaso[k] = (porCaso[k] || 0) + 1
  }
  console.log(`${aCorrigir.length} laudos com peso errado:`)
  for (const [k, n] of Object.entries(porCaso)) console.log(`  ${n}× ${k}`)

  /* ---------- 3. Recalcular a corrente com os pesos certos ---------- */
  const primeiro = analises.findIndex((a) => aCorrigir.some((x) => x.a.protocolo === a.protocolo))
  for (const { a, para } of aCorrigir) a.pesoMg = para

  anterior = GENESIS
  const novos = []
  for (let i = 0; i < analises.length; i++) {
    const a = analises[i]
    const hash = hashEncadeado(anterior, a)
    if (a.hashAnterior !== anterior || a.hash !== hash) {
      novos.push({ protocolo: a.protocolo, codigoRecibo: a.codigoRecibo, hashAnterior: anterior, hash, pesoMg: a.pesoMg })
    }
    a.hashAnterior = anterior
    a.hash = hash
    anterior = hash
  }

  console.log(`\nPrimeiro laudo afetado: índice ${primeiro} (${analises[primeiro].protocolo}).`)
  console.log(`${novos.length} laudos mudam de hash — o corrigido e todos os seguintes.`)
  console.log(`${analises.length - novos.length} laudos anteriores a ele ficam intactos.`)

  if (!APLICAR) {
    console.log('\n(simulação — rode com --aplicar para gravar)')
    await c.end()
    return
  }

  /* ---------- 4. Gravar: laudo e recibo, numa transação só ---------- */
  await c.query('BEGIN')
  try {
    for (const n of novos) {
      await c.query(
        `UPDATE aurea.analises SET peso_mg = $1, hash_anterior = $2, hash = $3 WHERE protocolo = $4`,
        [n.pesoMg, n.hashAnterior, n.hash, n.protocolo],
      )
      // O hash do recibo da moeda É o hash do laudo que a aprovou. Deixá-lo
      // para trás quebraria a ligação que o recibo existe para provar.
      if (n.codigoRecibo) {
        await c.query(`UPDATE aurea.recibos SET hash = $1 WHERE codigo = $2`, [n.hash, n.codigoRecibo])
      }
    }
    await c.query('COMMIT')
  } catch (e) {
    await c.query('ROLLBACK')
    throw e
  }
  console.log(`\n✓ ${novos.length} laudos e recibos atualizados.`)

  /* ---------- 5. Reler do banco e conferir a corrente de novo ---------- */
  const depois = (
    await c.query(
      `SELECT protocolo, posicao, protocolo_envio, codigo_moeda, codigo_recibo, tipo_moeda, ano,
              peso_mg, veredito, motivo_recusa, operador, aprovador, caixa, posicao_caixa,
              validado_em, caminho_video, hash_anterior, hash, origem
         FROM aurea.analises
        ORDER BY posicao`,
    )
  ).rows.map(daLinha)

  anterior = GENESIS
  let erros = 0
  for (const a of depois) {
    if (a.hashAnterior !== anterior || a.hash !== hashEncadeado(anterior, a)) erros++
    anterior = a.hash
  }

  const desalinhados = (
    await c.query(
      `SELECT count(*)::int n
         FROM aurea.analises a
         JOIN aurea.recibos r ON r.codigo = a.codigo_recibo
        WHERE r.hash <> a.hash`,
    )
  ).rows[0].n

  const pesosRuins = (
    await c.query(
      `SELECT count(*)::int n FROM aurea.analises
        WHERE origem = 'cadastro_direto' AND peso_mg NOT IN (7000, 7840)`,
    )
  ).rows[0].n

  console.log(`\nCONFERÊNCIA FINAL`)
  console.log(`  corrente de hashes: ${erros === 0 ? 'íntegra' : erros + ' divergência(s)'}`)
  console.log(`  recibos fora de sincronia com o laudo: ${desalinhados}`)
  console.log(`  laudos de cadastro direto com peso fora do catálogo: ${pesosRuins}`)

  await c.end()
  if (erros > 0 || desalinhados > 0 || pesosRuins > 0) process.exit(1)
})().catch((e) => {
  console.error(e.message)
  process.exit(1)
})
