#!/usr/bin/env node
/**
 * MEDE O ESPAÇO QUE OS VÍDEOS DE AUTENTICIDADE OCUPAM NO SUPABASE STORAGE — SOMENTE LEITURA.
 *
 *   node scripts/medir-armazenamento.mjs            # relatório em texto
 *   node scripts/medir-armazenamento.mjs --json     # o mesmo, em JSON (para planilha)
 *
 * (Frente L da manutenção de 11/2026, pedido do Rogério: "verificar a questão de espaço para gravar
 * as filmagens da confirmação de autenticidade das moedas".)
 *
 * O QUE ELE FAZ
 * -------------
 *  1. LISTA os arquivos do balde pela API de Storage (a mesma que o painel do Supabase usa) e soma
 *     os tamanhos: total, média, mediana, maior, por pasta (= um envio), por mês e por extensão.
 *  2. CONFERE o total com `storage.objects`, lida no Postgres dentro de `BEGIN READ ONLY`. As duas
 *     contas precisam dar o mesmo número; se não derem, o relatório avisa em vez de escolher uma.
 *  3. Cruza com `aurea.analises`: quantas análises têm vídeo, quantas moedas cada vídeo cobre (uma
 *     gravação cobre o envio inteiro) e se sobrou arquivo no balde que nenhuma análise aponta
 *     (sobra de `alinhar-videos.cjs` ou de gravação que subiu e a análise não fechou).
 *  4. Mostra o tamanho do banco (`pg_database_size`) e o limite de tamanho por arquivo do balde, que
 *     são os outros dois números que o plano do Supabase limita.
 *
 * O QUE ELE NUNCA FAZ
 * -------------------
 * Não escreve, não apaga, não move, não cria URL assinada, não muda balde nem política. A única
 * chamada à API é `list`; o Postgres roda em transação READ ONLY (o servidor recusaria uma escrita)
 * e **sem `SET` de sessão** — o pooler do Supabase vazaria o `SET` para o site (memória
 * leitura-de-producao-sem-set-de-sessao). Nada do `operador` ou de dado pessoal é lido: só contagens.
 *
 * SEGREDOS
 * --------
 * Lê SUPABASE_SERVICE_ROLE_KEY e POSTGRES_URL do ambiente ou do `.env.local` (vale o da pasta
 * principal quando rodado num git worktree — scripts/env-local.mjs). Nenhum valor sai na tela:
 * só o endereço do projeto e o nome do balde. Fora de `src/*.test.ts` de propósito: é um script de
 * produção, e a suíte não pode executá-lo.
 *
 * Node puro, sem TypeScript, porque roda fora do Next.
 */

import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { createClient } from '@supabase/supabase-js'
import pg from 'pg'

import { carregarEnvLocal } from './env-local.mjs'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const emJson = process.argv.includes('--json')

if (process.argv.includes('--ajuda') || process.argv.includes('--help')) {
  console.log('Uso: node scripts/medir-armazenamento.mjs [--json]\nSomente leitura: lista o balde de vídeos e soma os tamanhos.')
  process.exit(0)
}

// Lista vazia = lê o .env.local sempre que existir; na Vercel o ambiente já traz tudo e o arquivo não existe.
carregarEnvLocal(raiz, [])

const supaUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'analises'
const pgUrl = process.env.POSTGRES_URL || process.env.POSTGRES_URL_DIRECT

const MB = 1024 * 1024
const GB = 1024 * MB

/** 1.536.000 → "1,46 MB". Base 1024, como o painel do Supabase mostra. */
function humano(bytes) {
  if (!Number.isFinite(bytes)) return '—'
  if (bytes >= GB) return `${(bytes / GB).toFixed(2).replace('.', ',')} GB`
  if (bytes >= MB) return `${(bytes / MB).toFixed(2).replace('.', ',')} MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1).replace('.', ',')} KB`
  return `${bytes} B`
}

/** Mês de Brasília (UTC-3), 'AAAA-MM'. O servidor não tem fuso confiável; o negócio vive no de Brasília. */
function mesDeBrasilia(quando) {
  const ms = typeof quando === 'number' ? quando : Date.parse(quando)
  if (!Number.isFinite(ms)) return 'sem-data'
  return new Date(ms - 3 * 3600 * 1000).toISOString().slice(0, 7)
}

function mediana(valores) {
  if (valores.length === 0) return 0
  const o = [...valores].sort((a, b) => a - b)
  const m = Math.floor(o.length / 2)
  return o.length % 2 ? o[m] : (o[m - 1] + o[m]) / 2
}

function somar(lista, chaveDe) {
  const mapa = new Map()
  for (const item of lista) {
    const k = chaveDe(item)
    const atual = mapa.get(k) ?? { n: 0, bytes: 0 }
    atual.n += 1
    atual.bytes += item.bytes
    mapa.set(k, atual)
  }
  return [...mapa.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))
}

/** Caminhos do balde, recursivo. `id` nulo na resposta do Storage = pasta. */
async function listarBalde(storage) {
  const arquivos = []
  const pastas = ['']
  while (pastas.length > 0) {
    const prefixo = pastas.shift()
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await storage.list(prefixo, { limit: 1000, offset, sortBy: { column: 'name', order: 'asc' } })
      if (error) throw new Error(`a API de Storage recusou a listagem de "${prefixo || '/'}": ${error.message}`)
      if (!data || data.length === 0) break
      for (const item of data) {
        const caminho = prefixo ? `${prefixo}/${item.name}` : item.name
        if (item.id === null || item.id === undefined) {
          pastas.push(caminho)
        } else if (!item.name.endsWith('.emptyFolderPlaceholder')) {
          arquivos.push({ caminho, bytes: Number(item.metadata?.size ?? 0), criado: item.created_at ?? item.updated_at ?? null })
        }
      }
      if (data.length < 1000) break
    }
  }
  return arquivos
}

/** Tudo o que se lê do Postgres, numa transação READ ONLY e sem SET. */
async function lerDoBanco() {
  let local = false
  try {
    local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(new URL(pgUrl).hostname)
  } catch {
    // connection string ilegível para o URL(): o pg dirá o motivo; segue com SSL, o padrão seguro.
  }
  const c = new pg.Client({ connectionString: pgUrl, ssl: local ? false : { rejectUnauthorized: false } })
  await c.connect()
  try {
    await c.query('BEGIN READ ONLY')
    const baldes = (await c.query('SELECT id, public, file_size_limit, allowed_mime_types FROM storage.buckets ORDER BY id')).rows
    const objetosPorBalde = (
      await c.query(
        `SELECT bucket_id, count(*)::int AS n, coalesce(sum((metadata->>'size')::bigint), 0)::bigint AS bytes
           FROM storage.objects GROUP BY bucket_id ORDER BY bucket_id`,
      )
    ).rows
    const doBalde = (
      await c.query(
        `SELECT name, coalesce((metadata->>'size')::bigint, 0)::bigint AS bytes
           FROM storage.objects WHERE bucket_id = $1 AND name NOT LIKE '%.emptyFolderPlaceholder'`,
        [bucket],
      )
    ).rows
    const tamanhoDoBanco = Number((await c.query('SELECT pg_database_size(current_database())::bigint AS b')).rows[0].b)
    const analises = (
      await c.query(
        `SELECT protocolo_envio, codigo_moeda, tipo_moeda, veredito, validado_em, caminho_video, origem
           FROM aurea.analises ORDER BY posicao`,
      )
    ).rows
    return { baldes, objetosPorBalde, doBalde, tamanhoDoBanco, analises }
  } finally {
    // ROLLBACK e não COMMIT: não há nada a confirmar, e assim a transação some sem deixar rastro.
    await c.query('ROLLBACK').catch(() => undefined)
    await c.end().catch(() => undefined)
  }
}

function linhaPorMes(rotulo, pares) {
  if (pares.length === 0) return [`  (${rotulo}: nada)`]
  return pares.map(([k, v]) => `  ${k}   ${String(v.n).padStart(4)} arquivo(s)   ${humano(v.bytes).padStart(10)}`)
}

async function main() {
  const faltando = []
  if (!supaUrl) faltando.push('SUPABASE_URL')
  if (!serviceKey) faltando.push('SUPABASE_SERVICE_ROLE_KEY')
  if (faltando.length > 0) {
    console.error(`medir-armazenamento: falta ${faltando.join(' e ')} no ambiente ou no .env.local. Nada foi lido.`)
    process.exit(1)
  }

  const storage = createClient(supaUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } }).storage.from(bucket)

  // ---- 1. O balde, pela API de Storage --------------------------------------------------------
  const arquivos = await listarBalde(storage)
  const tamanhos = arquivos.map((a) => a.bytes)
  const total = tamanhos.reduce((s, b) => s + b, 0)
  const porPasta = somar(arquivos, (a) => a.caminho.split('/')[0])
  const porMes = somar(arquivos, (a) => (a.criado ? mesDeBrasilia(a.criado) : 'sem-data'))
  const porExtensao = somar(arquivos, (a) => (a.caminho.includes('.') ? a.caminho.split('.').pop().toLowerCase() : 'sem-extensao'))

  const resultado = {
    projeto: new URL(supaUrl).hostname,
    balde: bucket,
    balde_api: {
      arquivos: arquivos.length,
      bytes: total,
      media_bytes: arquivos.length ? Math.round(total / arquivos.length) : 0,
      mediana_bytes: mediana(tamanhos),
      maior_bytes: tamanhos.length ? Math.max(...tamanhos) : 0,
      menor_bytes: tamanhos.length ? Math.min(...tamanhos) : 0,
      pastas: porPasta.length,
      por_mes: Object.fromEntries(porMes),
      por_extensao: Object.fromEntries(porExtensao),
    },
  }

  // ---- 2. O banco: conferência cruzada e contexto ---------------------------------------------
  let banco = null
  let erroBanco = null
  if (pgUrl) {
    try {
      banco = await lerDoBanco()
    } catch (e) {
      erroBanco = e instanceof Error ? e.message : String(e)
    }
  } else {
    erroBanco = 'sem POSTGRES_URL no ambiente ou no .env.local'
  }

  if (banco) {
    const meu = banco.objetosPorBalde.find((b) => b.bucket_id === bucket)
    const totalNoBanco = banco.doBalde.reduce((s, o) => s + Number(o.bytes), 0)
    const todosOsBaldes = banco.objetosPorBalde.reduce((s, b) => s + Number(b.bytes), 0)
    const infoDoBalde = banco.baldes.find((b) => b.id === bucket) ?? null

    const analisesComVideo = banco.analises.filter((a) => a.caminho_video)
    const caminhosApontados = new Set(analisesComVideo.map((a) => a.caminho_video))
    // O contrato aceita o caminho com ou sem o prefixo do balde ("analises/RO-ENV-0001/…").
    const semPrefixo = (c) => (c.startsWith(`${bucket}/`) ? c.slice(bucket.length + 1) : c)
    const apontados = new Set([...caminhosApontados].map(semPrefixo))
    const nomesNoBalde = new Set(arquivos.map((a) => a.caminho))
    const orfaos = arquivos.filter((a) => !apontados.has(a.caminho))
    const sumidos = [...apontados].filter((c) => !nomesNoBalde.has(c))

    // Uma gravação cobre o envio inteiro: moedas por vídeo = análises do envio que apontam para ele.
    const moedasPorVideo = new Map()
    for (const a of analisesComVideo) moedasPorVideo.set(semPrefixo(a.caminho_video), (moedasPorVideo.get(semPrefixo(a.caminho_video)) ?? 0) + 1)
    const enviosDistintos = new Set(banco.analises.map((a) => a.protocolo_envio))
    const analisesPorMes = somar(
      banco.analises.map((a) => ({ bytes: 0, mes: mesDeBrasilia(Number(a.validado_em)) })),
      (a) => a.mes,
    )
    const enviosPorMes = new Map()
    for (const a of banco.analises) {
      const mes = mesDeBrasilia(Number(a.validado_em))
      if (!enviosPorMes.has(mes)) enviosPorMes.set(mes, new Set())
      enviosPorMes.get(mes).add(a.protocolo_envio)
    }
    const porOrigem = somar(banco.analises.map((a) => ({ bytes: 0, origem: a.origem ?? 'bancada' })), (a) => a.origem)

    // Moedas analisadas por envio: liga o peso do vídeo à quantidade de moedas que ele cobre.
    const moedasPorEnvio = new Map()
    for (const an of banco.analises) moedasPorEnvio.set(an.protocolo_envio, (moedasPorEnvio.get(an.protocolo_envio) ?? 0) + 1)
    const maioresComMoedas = [...porPasta]
      .sort((x, y) => y[1].bytes - x[1].bytes)
      .slice(0, 10)
      .map(([pasta, v]) => ({ pasta, bytes: v.bytes, moedas: moedasPorEnvio.get(pasta) ?? 0 }))

    resultado.banco = {
      maiores_com_moedas: maioresComMoedas,
      conferencia_arquivos_iguais: meu ? meu.n === arquivos.length : arquivos.length === 0,
      conferencia_bytes_iguais: Number(meu?.bytes ?? 0) === total,
      balde_storage_objects: { arquivos: meu?.n ?? 0, bytes: Number(meu?.bytes ?? 0) },
      todos_os_baldes_bytes: todosOsBaldes,
      outros_baldes: banco.objetosPorBalde.filter((b) => b.bucket_id !== bucket).map((b) => ({ balde: b.bucket_id, arquivos: b.n, bytes: Number(b.bytes) })),
      balde_config: infoDoBalde
        ? { publico: infoDoBalde.public, limite_por_arquivo_bytes: infoDoBalde.file_size_limit, tipos_mime_permitidos: infoDoBalde.allowed_mime_types }
        : null,
      tamanho_do_banco_bytes: banco.tamanhoDoBanco,
      analises: {
        total: banco.analises.length,
        com_video: analisesComVideo.length,
        sem_video: banco.analises.length - analisesComVideo.length,
        envios: enviosDistintos.size,
        videos_distintos: apontados.size,
        moedas_por_video_media: apontados.size ? Number((analisesComVideo.length / apontados.size).toFixed(2)) : 0,
        por_mes: Object.fromEntries(analisesPorMes.map(([m, v]) => [m, v.n])),
        envios_por_mes: Object.fromEntries([...enviosPorMes.entries()].sort().map(([m, s]) => [m, s.size])),
        por_origem: Object.fromEntries(porOrigem.map(([o, v]) => [o, v.n])),
      },
      arquivos_sem_analise: orfaos.length,
      bytes_sem_analise: orfaos.reduce((s, a) => s + a.bytes, 0),
      // Só caminhos (protocolo/arquivo): nenhum dado pessoal. Serve para o Gabriel decidir se apaga à mão.
      caminhos_sem_analise: orfaos.slice(0, 50).map((a) => ({ caminho: a.caminho, bytes: a.bytes })),
      bytes_com_analise: total - orfaos.reduce((s, a) => s + a.bytes, 0),
      analises_com_caminho_sem_arquivo: sumidos.length,
      total_banco_igual_api: totalNoBanco === total,
    }
    resultado._moedas_por_video = moedasPorVideo.size
  } else {
    resultado.banco = { indisponivel: erroBanco }
  }

  // ---- 3. Saída --------------------------------------------------------------------------------
  if (emJson) {
    delete resultado._moedas_por_video
    console.log(JSON.stringify(resultado, null, 2))
    return
  }

  const b = resultado.balde_api
  console.log(`\nMEDIÇÃO DO ARMAZENAMENTO DE VÍDEOS — projeto ${resultado.projeto}, balde "${bucket}"`)
  console.log(`Medido em ${new Date().toISOString()} (somente leitura)\n`)
  console.log('O QUE O BALDE GUARDA (pela API de Storage)')
  console.log(`  Arquivos ........... ${b.arquivos}  (em ${b.pastas} pasta(s) = envio(s))`)
  console.log(`  Tamanho total ...... ${humano(b.bytes)}  (${b.bytes} bytes)`)
  console.log(`  Média por vídeo .... ${humano(b.media_bytes)}`)
  console.log(`  Mediana ............ ${humano(b.mediana_bytes)}`)
  console.log(`  Menor / maior ...... ${humano(b.menor_bytes)} / ${humano(b.maior_bytes)}`)
  console.log('\nPOR MÊS DE GRAVAÇÃO (fuso de Brasília)')
  console.log(linhaPorMes('meses', porMes).join('\n'))
  console.log('\nPOR EXTENSÃO')
  console.log(linhaPorMes('extensões', porExtensao).join('\n'))
  // Só as 10 maiores: com o tempo são centenas de pastas, e o que interessa é quem pesa.
  const maiores = [...porPasta].sort((x, y) => y[1].bytes - x[1].bytes).slice(0, 10)
  console.log(`\nAS 10 MAIORES PASTAS (um envio por pasta; ${porPasta.length} no total)`)
  console.log(linhaPorMes('pastas', maiores).join('\n'))

  if (!banco) {
    console.log(`\nBANCO: não consegui ler (${erroBanco}). O relatório acima vale; a conferência cruzada não foi feita.`)
    return
  }
  const r = resultado.banco
  console.log('\nCONFERÊNCIA COM storage.objects (Postgres, BEGIN READ ONLY)')
  console.log(`  Arquivos: API ${b.arquivos} × banco ${r.balde_storage_objects.arquivos} — ${r.conferencia_arquivos_iguais ? 'IGUAIS' : 'DIFERENTES (investigar)'}`)
  console.log(`  Bytes:    API ${humano(b.bytes)} × banco ${humano(r.balde_storage_objects.bytes)} — ${r.conferencia_bytes_iguais ? 'IGUAIS' : 'DIFERENTES (investigar)'}`)
  console.log(`  Todos os baldes do projeto somados: ${humano(r.todos_os_baldes_bytes)} (é este número que o plano do Supabase limita)`)
  for (const o of r.outros_baldes) console.log(`    outro balde "${o.balde}": ${o.arquivos} arquivo(s), ${humano(o.bytes)}`)
  if (r.balde_config) {
    const lim = r.balde_config.limite_por_arquivo_bytes
    console.log(`  Balde: ${r.balde_config.publico ? 'PÚBLICO (!)' : 'privado'}; limite por arquivo do balde: ${lim ? humano(Number(lim)) : 'nenhum (vale o limite global do projeto)'}; tipos permitidos: ${r.balde_config.tipos_mime_permitidos ? r.balde_config.tipos_mime_permitidos.join(', ') : 'todos'}`)
  } else {
    console.log(`  O balde "${bucket}" NÃO existe em storage.buckets.`)
  }
  console.log(`  Tamanho do banco (pg_database_size): ${humano(r.tamanho_do_banco_bytes)}`)

  const a = r.analises
  console.log('\nVÍDEOS × ANÁLISES (aurea.analises)')
  console.log(`  Análises: ${a.total} em ${a.envios} envio(s); com vídeo ${a.com_video}, sem vídeo ${a.sem_video}`)
  console.log(`  Vídeos distintos apontados: ${a.videos_distintos}; moedas por vídeo (média): ${String(a.moedas_por_video_media).replace('.', ',')}`)
  console.log(`  Análises por origem: ${Object.entries(a.por_origem).map(([o, n]) => `${o} ${n}`).join(' · ') || '—'}`)
  console.log('  Por mês — análises (moedas) · envios:')
  for (const mes of Object.keys(a.por_mes)) console.log(`    ${mes}   ${String(a.por_mes[mes]).padStart(4)} moeda(s) · ${a.envios_por_mes[mes] ?? 0} envio(s)`)
  console.log(`  Arquivos no balde que nenhuma análise aponta: ${r.arquivos_sem_analise} (${humano(r.bytes_sem_analise)}) — quem tem análise pesa ${humano(r.bytes_com_analise)}`)
  for (const o of r.caminhos_sem_analise) console.log(`    sem análise: ${o.caminho}  ${humano(o.bytes)}`)
  console.log('  As 10 maiores gravações e quantas moedas cada uma cobre:')
  for (const m of r.maiores_com_moedas) console.log(`    ${m.pasta}   ${humano(m.bytes).padStart(10)}   ${m.moedas} moeda(s)`)
  if (a.com_video > 0) console.log(`  Peso médio por moeda analisada com vídeo: ${humano(Math.round(r.bytes_com_analise / a.com_video))}`)
  console.log(`  Análises com caminho de vídeo cujo arquivo não está no balde: ${r.analises_com_caminho_sem_arquivo}`)
  console.log('')
}

main().catch((e) => {
  // A mensagem do erro nunca carrega a chave: o SDK e o pg só repetem o motivo.
  console.error(`medir-armazenamento: ${e instanceof Error ? e.message : String(e)}`)
  process.exit(1)
})
