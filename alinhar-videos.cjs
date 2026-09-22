/**
 * ALINHA AS PASTAS DE VÍDEO COM OS PROTOCOLOS NOVOS — rodar UMA VEZ, 22/09/2026.
 *
 * A renumeração de ontem trocou `envios.protocolo` de RO-ENV-0052..0054 para
 * RO-ENV-0001..0003, mas os vídeos de bancada continuaram no Supabase Storage
 * sob as pastas antigas — e o `caminho_video` das análises continuou apontando
 * para lá, que é onde os arquivos de fato estão. Ficou certo e ilegível ao
 * mesmo tempo: a análise diz protocolo RO-ENV-0002 e vídeo em RO-ENV-0053/.
 *
 * Este script move os arquivos e acerta o campo.
 *
 * A ORDEM É COPIAR, GRAVAR, SÓ ENTÃO APAGAR
 * -----------------------------------------
 * Storage e Postgres não compartilham transação. Se o arquivo se movesse
 * primeiro e o banco falhasse depois, o `caminho_video` apontaria para um
 * lugar vazio — e o vídeo é a prova do laudo. Então:
 *
 *   1. COPIA o arquivo para o caminho novo, deixando o original onde está;
 *   2. ATUALIZA o banco numa transação e confirma;
 *   3. APAGA o original, já com o banco apontando para a cópia.
 *
 * Em qualquer ponto em que isso falhe pelo meio, o caminho gravado no banco
 * aponta para um arquivo que existe. É o pior caso aceitável: sobra arquivo
 * duplicado, que se limpa à mão, em vez de faltar prova.
 *
 * A CORRENTE DE HASHES É REFEITA DE NOVO
 * --------------------------------------
 * `caminhoVideo` está em CAMPOS_DA_ANALISE (src/domain/analise.ts). Mudar o
 * campo muda o hash daquela análise e, por encadeamento, o de todas as
 * seguintes. Como na renumeração: refaz do GENESIS ou a corrente quebra.
 *
 * Precisa de SUPABASE_SERVICE_ROLE_KEY no ambiente ou no .env.local — é a
 * chave que assina operações no balde privado.
 */
const fs = require('fs')
const crypto = require('node:crypto')
const pg = require('pg')
const { createClient } = require('@supabase/supabase-js')

const env = fs.readFileSync('.env.local', 'utf8')
const ler = (k) => {
  const m = env.match(new RegExp('^' + k + '="?([^"\\r\\n]+)', 'm'))
  return process.env[k] ?? (m ? m[1] : undefined)
}

const url = ler('POSTGRES_URL')
const supaUrl = ler('SUPABASE_URL') ?? ler('NEXT_PUBLIC_SUPABASE_URL')
const serviceKey = ler('SUPABASE_SERVICE_ROLE_KEY')
const bucket = ler('SUPABASE_STORAGE_BUCKET') ?? 'analises'

if (!serviceKey) {
  console.error('ABORTADO: falta SUPABASE_SERVICE_ROLE_KEY no ambiente ou no .env.local.')
  console.error('Sem ela não há como mexer no balde privado. Nada foi tocado.')
  process.exitCode = 1
  return
}

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
  const texto = hashAnterior + '\n' + campos.map(campoCanonico).join('|')
  return crypto.createHash('sha256').update(texto, 'utf8').digest('hex')
}

/** CAMPOS_DA_ANALISE, na ordem de src/domain/analise.ts. */
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

function correnteDe(analises) {
  let anterior = GENESIS
  return analises.map((a) => {
    const hash = hashEncadeado(anterior, camposDaAnalise(a))
    const par = { hashAnterior: anterior, hash }
    anterior = hash
    return par
  })
}

const COLUNAS = `posicao, protocolo, protocolo_envio, codigo_moeda, codigo_recibo, tipo_moeda,
                 ano, peso_mg, veredito, motivo_recusa, operador, aprovador, caixa, posicao_caixa,
                 validado_em, caminho_video, hash_anterior, hash`

;(async () => {
  const c = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } })
  await c.connect()
  const storage = createClient(supaUrl, serviceKey).storage.from(bucket)

  const { rows: analises } = await c.query(
    `SELECT ${COLUNAS} FROM aurea.analises ORDER BY posicao`,
  )

  // ---- 1. A fórmula daqui reproduz a corrente gravada? --------------------
  const atual = correnteDe(analises)
  const divergentes = analises.filter(
    (a, i) => a.hash !== atual[i].hash || a.hash_anterior !== atual[i].hashAnterior,
  )
  if (divergentes.length) {
    console.error(
      `ABORTADO: ${divergentes.length} de ${analises.length} análises não fecham com a fórmula deste script.`,
    )
    console.error('Nada foi tocado. Primeira divergência em', divergentes[0].protocolo)
    await c.end()
    process.exitCode = 1
    return
  }
  console.log(`Corrente atual confere (${analises.length} análises).\n`)

  // ---- 2. O caminho novo de cada arquivo ---------------------------------
  // O protocolo aparece DUAS vezes no caminho: na pasta e no nome do arquivo
  // (`RO-ENV-0053/RO-ENV-0053-1.webm`). Trocar só a pasta deixaria o nome
  // mentindo — então a substituição é sobre o caminho inteiro.
  const caminhoNovo = new Map()
  for (const a of analises) {
    if (!a.caminho_video) continue
    const pastaVelha = a.caminho_video.split('/')[0]
    if (pastaVelha === a.protocolo_envio) continue // já alinhado
    const novo = a.caminho_video.split(pastaVelha).join(a.protocolo_envio)
    caminhoNovo.set(a.caminho_video, novo)
  }

  if (caminhoNovo.size === 0) {
    console.log('Nada a fazer: todos os vídeos já estão na pasta do próprio protocolo.')
    await c.end()
    return
  }

  console.log('ARQUIVOS A MOVER:')
  for (const [velho, novo] of caminhoNovo) console.log(`  ${velho}\n    -> ${novo}`)

  // ---- 3. COPIAR ---------------------------------------------------------
  const copiados = []
  for (const [velho, novo] of caminhoNovo) {
    const { error } = await storage.copy(velho, novo)
    if (error) {
      // 'already exists' é o caso de uma execução anterior interrompida entre a
      // cópia e o banco: a cópia já está lá e serve.
      if (!/exists/i.test(error.message)) {
        console.error(`\nABORTADO ao copiar ${velho}: ${error.message}`)
        console.error('O banco não foi tocado; os originais continuam no lugar.')
        await c.end()
        process.exitCode = 1
        return
      }
      console.log(`  (já existia) ${novo}`)
    }
    copiados.push([velho, novo])
  }
  console.log(`\n  ${copiados.length} arquivo(s) copiado(s) para o caminho novo`)

  // ---- 4. BANCO ----------------------------------------------------------
  await c.query('begin')
  try {
    for (const [velho, novo] of caminhoNovo) {
      await c.query('UPDATE aurea.analises SET caminho_video = $1 WHERE caminho_video = $2', [
        novo,
        velho,
      ])
    }

    const { rows: depois } = await c.query(
      `SELECT ${COLUNAS} FROM aurea.analises ORDER BY posicao`,
    )
    const nova = correnteDe(depois)
    for (let i = 0; i < depois.length; i++) {
      await c.query('UPDATE aurea.analises SET hash_anterior = $1, hash = $2 WHERE posicao = $3', [
        nova[i].hashAnterior,
        nova[i].hash,
        depois[i].posicao,
      ])
      // O recibo guarda o hash do laudo que o emitiu.
      await c.query('UPDATE aurea.recibos SET hash = $1 WHERE codigo = $2', [
        nova[i].hash,
        depois[i].codigo_recibo,
      ])
    }

    const { rows: conf } = await c.query(`SELECT ${COLUNAS} FROM aurea.analises ORDER BY posicao`)
    const esperada = correnteDe(conf)
    const ruins = conf.filter(
      (a, i) => a.hash !== esperada[i].hash || a.hash_anterior !== esperada[i].hashAnterior,
    ).length
    if (ruins) throw new Error(`corrente não fecha: ${ruins} análise(s)`)

    const desalinhadas = conf.filter((a) => a.caminho_video && a.caminho_video.split('/')[0] !== a.protocolo_envio)
    if (desalinhadas.length) throw new Error(`${desalinhadas.length} análise(s) ainda desalinhada(s)`)

    await c.query('commit')
    console.log('  banco atualizado e corrente refeita do GENESIS')
  } catch (e) {
    await c.query('rollback')
    console.error('\nROLLBACK — banco intacto. Motivo:', e.message)
    console.error('As cópias ficaram no balde; rodar de novo é seguro.')
    await c.end()
    process.exitCode = 1
    return
  }

  // ---- 5. APAGAR OS ORIGINAIS, com o banco já apontando para a cópia -----
  const velhos = copiados.map(([velho]) => velho)
  const { error: erroRemocao } = await storage.remove(velhos)
  if (erroRemocao) {
    console.error(`\nAVISO: não deu para apagar os originais (${erroRemocao.message}).`)
    console.error('Não é problema: o banco já aponta para os caminhos novos. Sobrou arquivo duplicado:')
    for (const v of velhos) console.error('  ' + v)
  } else {
    console.log(`  ${velhos.length} original(is) removido(s)`)
  }

  const { rows: final } = await c.query(
    `SELECT protocolo_envio, split_part(caminho_video,'/',1) pasta, count(*)::int n
       FROM aurea.analises GROUP BY 1,2 ORDER BY 1`,
  )
  console.log('\n  CONFERÊNCIA:')
  for (const l of final) console.log(`    ${l.protocolo_envio}  <-  pasta ${l.pasta}  (${l.n})`)

  await c.end()
  console.log('\nOK — vídeos e protocolos alinhados.')
})()
