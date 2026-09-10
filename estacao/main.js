/**
 * Processo principal da estação de análise.
 *
 * O QUE MORA AQUI E POR QUÊ
 * -------------------------
 * Tudo que toca disco, rede ou configuração. A tela (renderer/) não faz
 * nenhuma das três: ela pede por IPC. Isso não é purismo de arquitetura — é o
 * que permite `contextIsolation` ligado e `nodeIntegration` desligado, e é o
 * que impede que uma página, um dia, consiga ler `C:\` porque alguém colou um
 * `<iframe>` numa tela de formulário.
 *
 * A REGRA QUE DEFINE ESTE PROGRAMA: GRAVA LOCAL PRIMEIRO, ENVIA DEPOIS.
 * Se a internet cair no meio da análise, a gravação já está no disco e o
 * veredito já está na fila. A moeda foi manuseada uma vez só. Um programa que
 * gravasse direto para a nuvem perderia a análise inteira numa oscilação — e a
 * moeda já estaria fora da cápsula.
 *
 * JAVASCRIPT PURO, SEM ETAPA DE BUILD. Nada aqui é compilado: o `.exe` embrulha
 * estes arquivos como estão. É a diferença entre "editar e rodar" e "editar,
 * compilar, empacotar e rodar" numa bancada onde quem conserta é quem opera.
 */

const { app, BrowserWindow, ipcMain, session, shell } = require('electron')
const fs = require('node:fs')
const fsp = require('node:fs/promises')
const path = require('node:path')

/* ---------------------------------------------------------------------------
 * 1. Onde as coisas ficam
 * ------------------------------------------------------------------------- */

const RAIZ = process.env.AUREA_ESTACAO_DIR || path.join('C:', 'AureaEstacao')
const ARQ_CONFIG = path.join(RAIZ, 'estacao.json')
const DIR_ANALISES = path.join(RAIZ, 'analises')
const DIR_FILA = path.join(RAIZ, 'fila')

const CONFIG_PADRAO = {
  site: 'https://aurea-custodia-mvp.vercel.app',
  token: '',
  operador: '',
}

function garantirPastas() {
  for (const dir of [RAIZ, DIR_ANALISES, DIR_FILA]) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

function lerConfig() {
  try {
    const bruto = fs.readFileSync(ARQ_CONFIG, 'utf8')
    return { ...CONFIG_PADRAO, ...JSON.parse(bruto) }
  } catch {
    // Primeira execução, ou arquivo corrompido: escreve o modelo e devolve os
    // padrões. O operador vê a tela de configuração em vez de um erro.
    try {
      fs.writeFileSync(ARQ_CONFIG, JSON.stringify(CONFIG_PADRAO, null, 2), 'utf8')
    } catch {
      /* disco somente leitura: a tela avisa quando o salvamento falhar */
    }
    return { ...CONFIG_PADRAO }
  }
}

function gravarConfig(nova) {
  const atual = lerConfig()
  const final = {
    // O espalhamento preserva chaves que a tela não conhece — hoje
    // `capturaModerna`, amanhã o que vier. Sem ele, salvar a configuração pela
    // tela apagaria a escolha da pilha de captura.
    ...atual,
    site: String(nova.site || atual.site || '').trim().replace(/\/+$/, ''),
    token: String(nova.token || '').trim(),
    operador: String(nova.operador || '').trim(),
  }
  fs.writeFileSync(ARQ_CONFIG, JSON.stringify(final, null, 2), 'utf8')
  return final
}

/* ---------------------------------------------------------------------------
 * 1.1 A pilha de captura de vídeo do Windows — precisa ser decidida ANTES do
 *     app ficar pronto, porque é uma opção de linha de comando do Chromium.
 * ------------------------------------------------------------------------- */

/**
 * O Windows tem duas pilhas de captura: MediaFoundation, a moderna e padrão do
 * Chromium, e DirectShow, a antiga. Este programa força a antiga.
 *
 * POR QUE, E COMO SE DESCOBRIU
 * ----------------------------
 * Em 10/09/2026, com a webcam USB da bancada conectada, `enumerateDevices()` e
 * `getUserMedia()` passaram a TRAVAR — não falhar, travar: mais de vinte
 * segundos sem responder, e o travamento sobrevivia a reiniciar o programa. A
 * lista de câmeras ficava vazia e nada acusava erro. Com o DirectShow, a mesma
 * máquina enumerou as três câmeras em 747 ms e gravou de todas.
 *
 * O preço: DirectShow é legado, e alguma câmera futura pode funcionar só na
 * pilha moderna. O escape está no `estacao.json` — `"capturaModerna": true`
 * volta ao padrão do Chromium sem precisar recompilar nada.
 */
garantirPastas()
if (lerConfig().capturaModerna !== true) {
  app.commandLine.appendSwitch('disable-features', 'MediaFoundationVideoCapture')
}

/* ---------------------------------------------------------------------------
 * 2. Conversa com o site
 * ------------------------------------------------------------------------- */

/**
 * Toda chamada ao site passa por aqui.
 *
 * Erro de rede e erro do servidor viram o MESMO formato de retorno
 * (`{ ok:false, erro, rede }`), com `rede: true` só quando a requisição nem
 * chegou. É essa distinção que a fila usa: erro de rede é para tentar de novo;
 * erro do servidor (protocolo já fechado, dados inválidos) é para parar de
 * tentar, porque tentar de novo dará o mesmo resultado para sempre.
 */
async function chamar(caminho, opcoes = {}) {
  const cfg = lerConfig()
  if (!cfg.site || !cfg.token) {
    return { ok: false, erro: 'Configure o endereço do site e a chave da estação.', rede: false }
  }

  const controlador = new AbortController()
  const prazo = setTimeout(() => controlador.abort(), opcoes.timeoutMs || 20000)

  try {
    const resposta = await fetch(cfg.site + caminho, {
      method: opcoes.method || 'GET',
      headers: {
        Authorization: 'Bearer ' + cfg.token,
        ...(opcoes.body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: opcoes.body ? JSON.stringify(opcoes.body) : undefined,
      signal: controlador.signal,
    })

    let dados = null
    try {
      dados = await resposta.json()
    } catch {
      dados = null
    }

    if (!resposta.ok) {
      return {
        ok: false,
        status: resposta.status,
        erro: (dados && dados.error) || `O site respondeu ${resposta.status}.`,
        detalhes: dados && dados.detalhes,
        rede: false,
      }
    }
    return { ok: true, dados }
  } catch (e) {
    return {
      ok: false,
      erro: e.name === 'AbortError' ? 'O site demorou demais para responder.' : 'Sem conexão com o site.',
      rede: true,
    }
  } finally {
    clearTimeout(prazo)
  }
}

/* ---------------------------------------------------------------------------
 * 3. A fila — o que faz este programa sobreviver à internet caindo
 * ------------------------------------------------------------------------- */

const INTERVALO_FILA_MS = 60000
let janela = null
let temporizadorFila = null

function avisarTela(canal, carga) {
  if (janela && !janela.isDestroyed()) janela.webContents.send(canal, carga)
}

async function itensDaFila() {
  try {
    const nomes = await fsp.readdir(DIR_FILA)
    return nomes.filter((n) => n.endsWith('.json')).sort()
  } catch {
    return []
  }
}

/**
 * Enfileira o fechamento ANTES de tentar enviá-lo.
 *
 * A ordem importa e não é negociável: se o programa gravasse só depois de o
 * envio falhar, uma queda de energia no milissegundo errado apagaria a análise
 * de uma moeda que já foi manuseada e recapsulada.
 */
async function enfileirar(carga) {
  garantirPastas()
  const nome = `${Date.now()}-${carga.protocolo}.json`
  await fsp.writeFile(path.join(DIR_FILA, nome), JSON.stringify(carga, null, 2), 'utf8')
  return nome
}

async function tentarUm(nome) {
  const arquivo = path.join(DIR_FILA, nome)
  let carga
  try {
    carga = JSON.parse(await fsp.readFile(arquivo, 'utf8'))
  } catch {
    // JSON ilegível: mover para .erro em vez de tentar para sempre.
    await fsp.rename(arquivo, arquivo + '.erro').catch(() => {})
    return { nome, estado: 'ilegivel' }
  }

  const r = await chamar('/api/estacao/analise/fechar', { method: 'POST', body: carga })

  if (r.ok) {
    await fsp.unlink(arquivo).catch(() => {})
    return { nome, estado: 'enviado', dados: r.dados }
  }
  if (r.rede) {
    return { nome, estado: 'aguardando', erro: r.erro }
  }
  // Recusa do servidor: repetir daria o mesmo erro para sempre. O arquivo vira
  // `.recusado` e fica no disco — o registro da análise não some, e o operador
  // consegue abrir a pasta e ver o que aconteceu.
  await fsp.writeFile(arquivo + '.recusado', JSON.stringify({ carga, erro: r }, null, 2), 'utf8')
  await fsp.unlink(arquivo).catch(() => {})
  return { nome, estado: 'recusado', erro: r.erro }
}

async function processarFila() {
  const nomes = await itensDaFila()
  const resultados = []
  for (const nome of nomes) {
    const r = await tentarUm(nome)
    resultados.push(r)
    // Rede caiu: parar aqui. Insistir nos demais só produziria a mesma falha N
    // vezes e atrasaria o próximo ciclo.
    if (r.estado === 'aguardando') break
  }
  const pendentes = (await itensDaFila()).length
  avisarTela('fila:mudou', { pendentes, resultados })
  return { pendentes, resultados }
}

function ligarFila() {
  if (temporizadorFila) return
  temporizadorFila = setInterval(() => {
    processarFila().catch(() => {})
  }, INTERVALO_FILA_MS)
}

/* ---------------------------------------------------------------------------
 * 4. A janela
 * ------------------------------------------------------------------------- */

function criarJanela() {
  janela = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#10131a',
    title: 'Áurea Custódia — Estação de Análise',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })
  janela.loadFile(path.join(__dirname, 'renderer', 'index.html'))
}

/**
 * Libera a câmera, e SÓ a câmera.
 *
 * Sem estes dois manipuladores, o Chromium embutido decide sozinho o que fazer
 * com o `getUserMedia` — e quando ele nega, a tela mostra "Não consegui abrir a
 * câmera" sem que exista nada de errado com o cabo, com a webcam ou com o
 * código. Numa bancada, isso vira meia hora trocando de porta USB.
 *
 * São DOIS de propósito: a maioria das APIs do navegador faz primeiro uma
 * consulta de permissão e só pede de verdade se a consulta negar. Implementar
 * só o `Request` deixa metade dos caminhos passando pelo padrão.
 *
 * Tudo que não é `media` é negado. Este programa não precisa de localização,
 * notificação, área de transferência nem nada além da imagem da moeda — e uma
 * lista de permissões que só cresce é como um programa de bancada vira um
 * navegador com acesso a tudo.
 */
function liberarCamera() {
  const ses = session.defaultSession
  ses.setPermissionCheckHandler((_wc, permissao) => permissao === 'media')
  ses.setPermissionRequestHandler((_wc, permissao, responder) => {
    responder(permissao === 'media')
  })
}

app.whenReady().then(() => {
  garantirPastas()
  liberarCamera()
  criarJanela()
  ligarFila()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) criarJanela()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

/* ---------------------------------------------------------------------------
 * 5. O que a tela pode pedir
 * ------------------------------------------------------------------------- */

ipcMain.handle('config:ler', () => {
  const cfg = lerConfig()
  // O token NUNCA volta inteiro para a tela. Ela só precisa saber se existe —
  // e um campo de senha preenchido com o valor real é o jeito mais fácil de um
  // vídeo de bancada gravar a chave da estação junto com a moeda.
  return {
    site: cfg.site,
    operador: cfg.operador,
    temToken: Boolean(cfg.token),
    pastaRaiz: RAIZ,
    arquivoConfig: ARQ_CONFIG,
  }
})

ipcMain.handle('config:gravar', (_e, nova) => {
  const cfg = lerConfig()
  // Token em branco significa "não mexer no que já está gravado" — assim o
  // operador consegue trocar o nome dele sem redigitar 64 caracteres.
  const final = gravarConfig({
    site: nova.site,
    operador: nova.operador,
    token: nova.token && String(nova.token).trim() ? nova.token : cfg.token,
  })
  return { site: final.site, operador: final.operador, temToken: Boolean(final.token) }
})

ipcMain.handle('site:ping', () => chamar('/api/estacao'))

ipcMain.handle('site:fila', () => chamar('/api/estacao/fila'))

ipcMain.handle('site:abrir', (_e, protocolo) =>
  chamar('/api/estacao/analise/abrir', { method: 'POST', body: { protocolo } }),
)

/**
 * Fecha a análise: enfileira e tenta enviar na hora.
 *
 * Devolve sempre `ok: true` quando conseguiu ENFILEIRAR, mesmo que o envio
 * falhe. Do ponto de vista da bancada, a análise está feita — a moeda foi
 * pesada, filmada e recapsulada. O que falta é transporte, e transporte é
 * problema da fila, não do operador.
 */
ipcMain.handle('site:fechar', async (_e, carga) => {
  try {
    await enfileirar(carga)
  } catch (e) {
    return { ok: false, erro: 'Não consegui gravar a análise no disco: ' + e.message }
  }
  const { pendentes, resultados } = await processarFila()
  const meu = resultados.find((r) => r.nome.endsWith(`-${carga.protocolo}.json`))
  return {
    ok: true,
    pendentes,
    enviado: Boolean(meu && meu.estado === 'enviado'),
    dados: meu && meu.dados,
    aviso: meu && meu.estado === 'recusado' ? meu.erro : null,
  }
})

ipcMain.handle('fila:processar', () => processarFila())

ipcMain.handle('fila:contar', async () => ({ pendentes: (await itensDaFila()).length }))

/**
 * Grava o vídeo no disco e, quando o armazenamento estiver configurado, o
 * envia direto para lá.
 *
 * O upload NÃO passa pela rota da aplicação: a Vercel recusa corpo acima de
 * 4,5 MB, e um vídeo de análise passa disso com folga. O site só assina a URL.
 * Se a assinatura falhar — balde ainda não criado, chave de serviço ausente,
 * internet fora — o arquivo fica no disco e a análise fecha do mesmo jeito.
 * Falta de balde não pode impedir a moeda de ser analisada.
 */
ipcMain.handle('video:gravar', async (_e, { protocolo, indice, buffer, extensao }) => {
  garantirPastas()
  const pasta = path.join(DIR_ANALISES, protocolo)
  await fsp.mkdir(pasta, { recursive: true })
  // A extensão vem da tela porque é lá que se descobre qual formato o
  // MediaRecorder daquele notebook conseguiu usar. Arquivo MP4 salvo como
  // .webm abre em alguns tocadores e falha noutros — e quem vai tentar abrir
  // daqui a dois anos é o cliente.
  const ext = extensao === 'mp4' ? 'mp4' : 'webm'
  const nomeArquivo = `${protocolo}-${indice}.${ext}`
  const destino = path.join(pasta, nomeArquivo)
  await fsp.writeFile(destino, Buffer.from(buffer))

  const assinatura = await chamar('/api/estacao/video/url', {
    method: 'POST',
    body: { protocolo, arquivo: nomeArquivo },
  })
  if (!assinatura.ok) {
    return { ok: true, local: destino, enviado: false, motivo: assinatura.erro }
  }

  try {
    const { url, caminho } = assinatura.dados
    // PUT, e o token vai NA URL — foi assim que o `uploadToSignedUrl` do
    // storage-js se comportou quando conferido no código do pacote instalado.
    // NÃO mandar `Authorization`: a graça da URL assinada é justamente o
    // uploader não precisar de credencial nenhuma, e mandar o token de upload
    // como Bearer faz o Storage tentar lê-lo como JWT e recusar.
    const envio = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': `video/${ext}`, 'x-upsert': 'true' },
      body: Buffer.from(buffer),
    })
    if (!envio.ok) {
      return { ok: true, local: destino, enviado: false, motivo: `Armazenamento respondeu ${envio.status}.` }
    }
    return { ok: true, local: destino, enviado: true, caminho }
  } catch (e) {
    return { ok: true, local: destino, enviado: false, motivo: e.message }
  }
})

ipcMain.handle('pasta:abrir', (_e, qual) => {
  const alvo = qual === 'fila' ? DIR_FILA : qual === 'analises' ? DIR_ANALISES : RAIZ
  shell.openPath(alvo)
  return { ok: true, caminho: alvo }
})
