/**
 * A tela da bancada.
 *
 * Ela não toca disco nem rede: tudo passa por `window.estacao`, a ponte
 * declarada em preload.js. Se algo aqui precisar de uma capacidade nova, o nome
 * dela tem que aparecer lá primeiro — é essa a fronteira de segurança do
 * programa.
 *
 * O FLUXO QUE ESTA TELA IMPÕE, e o motivo de cada passo:
 *
 *   escolher o envio  → o operador confere o protocolo contra o pacote
 *   abrir             → a fase muda no site e o cliente vê "Em análise física"
 *   gravar            → o vídeo vai para o disco ANTES de qualquer envio
 *   pesar e julgar    → um veredito por moeda do envio
 *   fechar            → enfileira e envia; se a rede cair, a fila reenvia
 *
 * O peso é digitado em GRAMAS, como o display da balança mostra, e convertido
 * para miligramas inteiros aqui. O servidor só aceita inteiro: '27.0' e '27'
 * são o mesmo peso e produziriam hashes diferentes.
 */

const $ = (id) => document.getElementById(id)

const estado = {
  fila: [],
  envio: null,
  vereditos: [],
  operador: '',
  gravando: false,
  gravador: null,
  formato: null,
  pedacos: [],
  fluxo: null,
  inicioGravacao: 0,
  tickCronometro: null,
  videoDaAnalise: null,
}

/* ---------------------------------------------------------------------------
 * Conexão e configuração
 * ------------------------------------------------------------------------- */

function marcarConexao(texto, classe) {
  const el = $('conexao')
  el.textContent = texto
  el.className = 'chip' + (classe ? ' ' + classe : '')
}

async function verificarConexao() {
  marcarConexao('Verificando…')
  const r = await window.estacao.site.ping()
  if (r.ok) {
    marcarConexao('Conectado', 'ok')
    return true
  }
  // As três falhas que chegariam ao operador como a mesma tela travada, agora
  // separadas: sem chave, chave errada, ou site fora do ar.
  marcarConexao(r.rede ? 'Sem conexão' : 'Erro: ' + r.erro, 'erro')
  return false
}

async function abrirConfig() {
  const cfg = await window.estacao.config.ler()
  $('cfg-site').value = cfg.site || ''
  $('cfg-operador').value = cfg.operador || ''
  $('cfg-token').value = ''
  $('cfg-token-estado').textContent = cfg.temToken
    ? 'Já existe uma chave gravada neste notebook.'
    : 'Nenhuma chave gravada ainda.'
  $('cfg-caminho').textContent = cfg.arquivoConfig
  $('modal-config').hidden = false
}

async function salvarConfig() {
  const cfg = await window.estacao.config.gravar({
    site: $('cfg-site').value,
    token: $('cfg-token').value,
    operador: $('cfg-operador').value,
  })
  estado.operador = cfg.operador
  $('modal-config').hidden = true
  if (await verificarConexao()) carregarFila()
}

/* ---------------------------------------------------------------------------
 * A fila
 * ------------------------------------------------------------------------- */

async function carregarFila() {
  const r = await window.estacao.site.fila()
  if (!r.ok) {
    $('fila').innerHTML = ''
    $('fila-vazia').textContent = r.erro
    $('fila-vazia').hidden = false
    return
  }
  estado.fila = r.dados.fila || []
  desenharFila()
}

function desenharFila() {
  const ul = $('fila')
  ul.innerHTML = ''
  $('fila-vazia').textContent = 'Nada esperando análise.'
  $('fila-vazia').hidden = estado.fila.length > 0

  for (const item of estado.fila) {
    const li = document.createElement('li')
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.setAttribute('aria-current', String(estado.envio?.protocolo === item.protocolo))

    const protocolo = document.createElement('span')
    protocolo.className = 'protocolo'
    protocolo.textContent = item.protocolo

    const detalhe = document.createElement('span')
    detalhe.className = 'detalhe'
    const plural = item.quantidade === 1 ? 'moeda' : 'moedas'
    detalhe.textContent = `${item.cliente} · ${item.quantidade} ${plural} · ${item.tipoMoeda}`

    const etapa = document.createElement('span')
    etapa.className = 'detalhe'
    etapa.textContent = item.etapaAtual

    btn.append(protocolo, detalhe, etapa)
    btn.addEventListener('click', () => selecionarEnvio(item))
    li.append(btn)
    ul.append(li)
  }
}

/* ---------------------------------------------------------------------------
 * O procedimento
 * ------------------------------------------------------------------------- */

async function selecionarEnvio(item) {
  if (estado.gravando) {
    mensagem('Pare a gravação antes de trocar de envio.', 'erro')
    return
  }
  estado.envio = item
  estado.videoDaAnalise = null
  estado.vereditos = Array.from({ length: item.quantidade }, () => ({
    veredito: 'aprovada',
    gramas: '',
    caixa: '',
    posicao: '',
    motivoRecusa: '',
  }))

  $('sem-selecao').hidden = true
  $('procedimento').hidden = false
  $('titulo-envio').textContent = item.protocolo
  const plural = item.quantidade === 1 ? 'moeda' : 'moedas'
  $('subtitulo-envio').textContent =
    `${item.cliente} · ${item.quantidade} ${plural} · ${item.tipoMoeda} ${item.ano}`

  desenharFila()
  desenharMoedas()
  mensagem('')

  // Abre a fase no site. Falhar aqui NÃO impede a análise: a fase é informação
  // para o cliente, e o procedimento físico já vai começar de qualquer jeito.
  const r = await window.estacao.site.abrir(item.protocolo)
  if (!r.ok && !r.rede) mensagem('A fase não avançou no site: ' + r.erro, 'erro')

  await ligarCamera()
}

function desenharMoedas() {
  const container = $('moedas')
  container.innerHTML = ''

  estado.vereditos.forEach((v, i) => {
    const bloco = document.createElement('div')
    bloco.className = 'moeda'

    const topo = document.createElement('div')
    topo.className = 'moeda-topo'
    const titulo = document.createElement('h3')
    titulo.textContent = `Moeda ${i + 1} de ${estado.vereditos.length}`

    const botoes = document.createElement('div')
    botoes.className = 'veredito-botoes'
    for (const opcao of ['aprovada', 'recusada']) {
      const b = document.createElement('button')
      b.type = 'button'
      b.dataset.veredito = opcao
      b.textContent = opcao === 'aprovada' ? 'Aprovar' : 'Recusar'
      b.setAttribute('aria-pressed', String(v.veredito === opcao))
      b.addEventListener('click', () => {
        estado.vereditos[i].veredito = opcao
        desenharMoedas()
      })
      botoes.append(b)
    }
    topo.append(titulo, botoes)

    const linha = document.createElement('div')
    linha.className = 'linha'
    // TEXTO, não `number`, e o motivo é a vírgula. Num `input[type=number]` o
    // Chromium DESCARTA "27,05" e devolve string vazia — o operador digita o
    // peso, o campo esvazia e o programa acusa "digite o peso lido na balança".
    // Todo mundo aqui digita vírgula. `inputmode=decimal` ainda abre o teclado
    // numérico em tela sensível ao toque. Descoberto no teste de 10/09/2026.
    linha.append(
      campo('Peso (g)', 'text', v.gramas, (valor) => (estado.vereditos[i].gramas = valor), {
        inputmode: 'decimal',
        placeholder: '27,05',
        autocomplete: 'off',
      }),
    )

    if (v.veredito === 'aprovada') {
      // A caixa é o endereço físico. O rótulo do exemplo real do cofre é
      // "Caixa EB 001" — EB de Entrega da Bandeira. O código já carrega o tipo.
      linha.append(
        campo('Caixa', 'text', v.caixa, (valor) => (estado.vereditos[i].caixa = valor), {
          placeholder: 'EB-001',
        }),
        campo('Posição', 'number', v.posicao, (valor) => (estado.vereditos[i].posicao = valor), {
          step: '1',
          placeholder: '7',
        }),
      )
    } else {
      linha.append(
        campo(
          'Motivo da recusa',
          'text',
          v.motivoRecusa,
          (valor) => (estado.vereditos[i].motivoRecusa = valor),
          { placeholder: 'Peso fora da tolerância' },
        ),
      )
    }

    bloco.append(topo, linha)
    container.append(bloco)
  })
}

function campo(rotulo, tipo, valor, aoMudar, atributos = {}) {
  const label = document.createElement('label')
  label.className = 'campo'
  const span = document.createElement('span')
  span.textContent = rotulo
  const input = document.createElement('input')
  input.type = tipo
  input.value = valor
  for (const [k, v] of Object.entries(atributos)) input.setAttribute(k, v)
  input.addEventListener('input', () => aoMudar(input.value))
  label.append(span, input)
  return label
}

/* ---------------------------------------------------------------------------
 * Câmera e gravação
 * ------------------------------------------------------------------------- */

/**
 * A câmera escolhida fica lembrada NESTE notebook.
 *
 * Com a webcam do notebook e a USB ligadas ao mesmo tempo, a lista tem duas
 * entradas e o navegador oferece a integrada primeiro. Sem lembrar, o operador
 * troca de câmera em toda abertura do programa — e um dia esquece, e a análise
 * sai gravada pela câmera errada. É `localStorage` porque a escolha é da
 * máquina, não do operador nem do envio.
 */
const CAMERA_LEMBRADA = 'aurea-estacao-camera'

function lembrarCamera(deviceId) {
  try {
    if (deviceId) localStorage.setItem(CAMERA_LEMBRADA, deviceId)
  } catch {
    /* modo restrito: seguir sem lembrar é melhor do que quebrar a tela */
  }
}

function cameraLembrada() {
  try {
    return localStorage.getItem(CAMERA_LEMBRADA)
  } catch {
    return null
  }
}

/**
 * Lista os dispositivos, com prazo.
 *
 * `enumerateDevices()` pode TRAVAR — não falhar, travar — dependendo do driver
 * de câmera instalado no Windows. Aconteceu em 10/09/2026: mais de vinte
 * segundos sem responder, e a tela ficava com a lista de câmeras vazia sem
 * acusar nada. O `main.js` ataca a causa forçando o DirectShow; este prazo é a
 * rede de segurança para o dia em que outro driver fizer o mesmo.
 */
async function enumerarComPrazo() {
  try {
    return await comPrazo(navigator.mediaDevices.enumerateDevices(), PRAZO_MIDIA_MS, 'A lista de câmeras')
  } catch {
    return null
  }
}

async function listarCameras() {
  const dispositivos = await enumerarComPrazo()
  const select = $('cameras')
  if (!dispositivos) {
    // Sem lista, mas ainda dá para gravar: uma opção vazia faz o `abrirFluxo`
    // pedir "qualquer câmera", que é o caminho que não depende de enumeração.
    if (select.options.length === 0) {
      const trilha = estado.fluxo && estado.fluxo.getVideoTracks()[0]
      const opcao = document.createElement('option')
      opcao.value = ''
      opcao.textContent = trilha ? trilha.label : 'Câmera padrão do Windows'
      select.append(opcao)
    }
    $('aviso-video').textContent =
      'O Windows não devolveu a lista de câmeras. Usando a padrão — se for a errada, feche e abra o programa.'
    return []
  }
  const cameras = dispositivos.filter((d) => d.kind === 'videoinput')
  const anterior = select.value || cameraLembrada()
  select.innerHTML = ''
  cameras.forEach((c, i) => {
    const opt = document.createElement('option')
    opt.value = c.deviceId
    // Sem permissão concedida, o rótulo vem vazio — daí o "Câmera N".
    opt.textContent = c.label || `Câmera ${i + 1}`
    select.append(opt)
  })
  if (anterior && cameras.some((c) => c.deviceId === anterior)) select.value = anterior
  return cameras
}

/**
 * Abre o fluxo da câmera pedida, com queda para "qualquer uma".
 *
 * POR QUE A QUEDA EXISTE
 * ----------------------
 * O `deviceId` de uma câmera NÃO é estável: o Chromium o embaralha por origem e
 * ele muda quando a webcam é reconectada noutra porta USB, e entre sessões.
 * Pedir `deviceId: { exact: … }` com um id velho falha com `NotFoundError` — e
 * a mensagem que o operador via era "confira se o cabo USB está conectado",
 * com o cabo perfeitamente conectado. Descoberto no teste de 10/09/2026.
 *
 * `exact` continua sendo a primeira tentativa, de propósito: numa bancada com
 * duas câmeras, abrir "qualquer uma" sem avisar seria pior — a análise sairia
 * gravada pela webcam do notebook em vez do microscópio, e ninguém perceberia.
 * Por isso a queda AVISA.
 */
/**
 * Resolução pedida. `ideal` e não `exact`: a webcam do notebook entrega 720p e
 * a USB da bancada entrega 1080p — pedir `exact` faria a primeira falhar em vez
 * de entregar o que consegue. Sem pedir nada, o Chromium entrega 640x480, que é
 * pouco para enxergar relevo de moeda.
 */
const RESOLUCAO = { width: { ideal: 1920 }, height: { ideal: 1080 } }

/** Prazo para o Windows responder. Ver o cabeçalho de `enumerarComPrazo`. */
const PRAZO_MIDIA_MS = 8000

function comPrazo(promessa, ms, oQue) {
  return Promise.race([
    promessa,
    new Promise((_, rej) => setTimeout(() => rej(new Error(oQue + ' não respondeu em ' + ms / 1000 + 's')), ms)),
  ])
}

async function abrirFluxo(deviceId) {
  const semAudio = { audio: false }
  if (deviceId) {
    try {
      const fluxo = await comPrazo(
        navigator.mediaDevices.getUserMedia({
          video: { deviceId: { exact: deviceId }, ...RESOLUCAO },
          ...semAudio,
        }),
        PRAZO_MIDIA_MS,
        'A câmera escolhida',
      )
      return { fluxo, caiu: false }
    } catch (e) {
      // Só a ausência do dispositivo justifica a queda. Permissão negada ou
      // câmera em uso por outro programa são problemas reais, e escondê-los
      // atrás de "abri outra" faria o operador gravar sem saber o quê.
      if (e.name !== 'NotFoundError' && e.name !== 'OverconstrainedError') throw e
    }
  }
  // Sem áudio: o que prova a custódia é a imagem da moeda. Microfone ligado
  // grava a conversa da sala, que é dado pessoal que ninguém pediu.
  const fluxo = await comPrazo(
    navigator.mediaDevices.getUserMedia({ video: { ...RESOLUCAO }, ...semAudio }),
    PRAZO_MIDIA_MS,
    'A câmera',
  )
  return { fluxo, caiu: Boolean(deviceId) }
}

async function ligarCamera() {
  try {
    if (estado.fluxo) {
      estado.fluxo.getTracks().forEach((t) => t.stop())
      estado.fluxo = null
    }
    const { fluxo, caiu } = await abrirFluxo($('cameras').value)
    estado.fluxo = fluxo
    $('video').srcObject = estado.fluxo
    $('aviso-video').textContent = caiu
      ? 'A câmera escolhida não está mais disponível — abri a que o Windows ofereceu. Confira a seleção antes de gravar.'
      : ''
    // Os rótulos das câmeras só aparecem depois da primeira permissão.
    await listarCameras()
    // Depois da queda, o id lembrado está velho: guardar o que abriu de fato.
    const trilha = estado.fluxo.getVideoTracks()[0]
    const idReal = trilha && trilha.getSettings ? trilha.getSettings().deviceId : null
    if (idReal) {
      const opcao = [...$('cameras').options].find((o) => o.value === idReal)
      if (opcao) $('cameras').value = idReal
      lembrarCamera(idReal)
    } else {
      lembrarCamera($('cameras').value)
    }
  } catch (e) {
    $('aviso-video').textContent =
      'Não consegui abrir a câmera: ' + e.message + '. Confira se o cabo USB está conectado e se nenhum outro programa está usando a webcam.'
  }
}

function formatarTempo(ms) {
  const s = Math.floor(ms / 1000)
  return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0')
}

async function alternarGravacao() {
  if (estado.gravando) return pararGravacao()
  return comecarGravacao()
}

/**
 * Os formatos de gravação, em ordem de preferência.
 *
 * POR QUE UMA LISTA, E NÃO 'video/webm' DIRETO
 * --------------------------------------------
 * `MediaRecorder.isTypeSupported('video/webm')` devolve `true` e mesmo assim o
 * `start()` lança `NotSupportedError` num fluxo SEM ÁUDIO — que é exatamente o
 * nosso caso, porque a bancada grava só imagem. O formato genérico deixa o
 * Chromium escolher uma configuração de contêiner que espera trilha de áudio, e
 * ela não existe. Descoberto no teste de 10/09/2026, no executável empacotado.
 *
 * Declarar o codec de vídeo resolve, e a lista existe porque nem toda máquina
 * tem os mesmos: o VP9 é o melhor, o VP8 é o mais compatível, e o resto é rede
 * de segurança para um notebook que não tenha nenhum dos dois.
 */
const FORMATOS = [
  { mime: 'video/webm;codecs=vp9', ext: 'webm' },
  { mime: 'video/webm;codecs=vp8', ext: 'webm' },
  { mime: 'video/webm', ext: 'webm' },
  { mime: 'video/mp4', ext: 'mp4' },
  // Último recurso: sem `mimeType`, o navegador escolhe sozinho.
  { mime: '', ext: 'webm' },
]

/**
 * Cria e inicia o gravador no primeiro formato que REALMENTE funcionar.
 *
 * `isTypeSupported` não basta — a checagem passa e o `start()` falha. Por isso a
 * tentativa vai até o fim: constrói, liga os manipuladores e chama `start()`
 * dentro do `try`. Só um formato que sobreviveu aos três é devolvido.
 */
function iniciarGravador(fluxo) {
  for (const formato of FORMATOS) {
    if (formato.mime && !MediaRecorder.isTypeSupported(formato.mime)) continue
    let gravador
    try {
      gravador = new MediaRecorder(fluxo, formato.mime ? { mimeType: formato.mime } : undefined)
    } catch {
      continue
    }
    gravador.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) estado.pedacos.push(e.data)
    }
    gravador.onstop = salvarGravacao
    try {
      gravador.start(1000)
      return { gravador, formato }
    } catch {
      try {
        gravador.stop()
      } catch {
        /* já estava parado */
      }
    }
  }
  return null
}

/** A trilha de vídeo está viva? Câmera desconectada deixa a trilha em 'ended'. */
function cameraViva() {
  if (!estado.fluxo) return false
  const t = estado.fluxo.getVideoTracks()[0]
  return Boolean(t) && t.readyState === 'live'
}

/**
 * Começa a gravar, reabrindo a câmera se ela tiver morrido.
 *
 * POR QUE A REABERTURA
 * --------------------
 * Uma trilha de vídeo vira 'ended' sozinha quando a webcam é desconectada — e
 * numa bancada isso é um cabo esbarrado, não um evento raro. Sem esta
 * verificação, o `MediaRecorder` recusa a trilha morta e o operador via
 * "não consegui iniciar a gravação em nenhum formato", que não tem relação
 * nenhuma com a causa. Reabrir resolve na maioria dos casos, e quando não
 * resolve a mensagem passa a ser a da câmera, que é a verdadeira.
 */
async function comecarGravacao() {
  if (!cameraViva()) {
    $('aviso-video').textContent = 'A câmera parou. Reabrindo…'
    await ligarCamera()
    if (!cameraViva()) {
      $('aviso-video').textContent =
        'A câmera não está disponível. Confira o cabo e a seleção acima, e tente de novo.'
      return
    }
  }
  estado.pedacos = []

  const tentativa = iniciarGravador(estado.fluxo)
  // Falhar em silêncio aqui seria o pior desfecho possível: o operador acharia
  // que está gravando, faria a análise inteira e descobriria no fim que não há
  // vídeo — com a moeda já recapsulada.
  if (!tentativa) {
    $('aviso-video').textContent =
      'Não consegui iniciar a gravação neste notebook, em nenhum formato. A análise pode ser fechada sem vídeo.'
    return
  }
  estado.gravador = tentativa.gravador
  estado.formato = tentativa.formato

  estado.gravando = true
  estado.inicioGravacao = Date.now()
  $('btn-gravar').textContent = 'Parar'
  $('btn-gravar').classList.add('parando')
  $('cronometro').classList.add('gravando')
  estado.tickCronometro = setInterval(() => {
    $('cronometro').textContent = formatarTempo(Date.now() - estado.inicioGravacao)
  }, 500)
}

function pararGravacao() {
  if (!estado.gravador) return
  estado.gravador.stop()
  estado.gravando = false
  clearInterval(estado.tickCronometro)
  $('btn-gravar').textContent = 'Gravar'
  $('btn-gravar').classList.remove('parando')
  $('cronometro').classList.remove('gravando')
}

async function salvarGravacao() {
  const formato = estado.formato || FORMATOS[0]
  const blob = new Blob(estado.pedacos, { type: formato.mime || 'video/webm' })
  const buffer = await blob.arrayBuffer()
  $('aviso-video').textContent = 'Salvando a gravação…'

  // A extensão acompanha o formato que de fato gravou. Um arquivo MP4 salvo
  // como .webm abre em alguns tocadores e falha noutros, e o cliente é
  // justamente quem vai tentar abrir daqui a dois anos.
  const r = await window.estacao.video.gravar(
    estado.envio.protocolo,
    estado.vereditos.length,
    buffer,
    formato.ext,
  )

  if (!r.ok) {
    $('aviso-video').textContent = 'Falha ao salvar: ' + r.erro
    return
  }
  estado.videoDaAnalise = r.caminho || null
  $('aviso-video').textContent = r.enviado
    ? 'Gravação salva no disco e enviada para o armazenamento.'
    : 'Gravação salva no disco. Ainda não subiu: ' + (r.motivo || 'armazenamento indisponível.')
}

/* ---------------------------------------------------------------------------
 * Fechar
 * ------------------------------------------------------------------------- */

function mensagem(texto, classe) {
  const el = $('mensagem')
  el.textContent = texto
  el.className = 'mensagem' + (classe ? ' ' + classe : '')
}

function montarCarga() {
  const erros = []
  const moedas = estado.vereditos.map((v, i) => {
    // Aceita "27,05" e "27.05", com ou sem espaço. O display da balança mostra
    // vírgula; teclado numérico às vezes manda ponto.
    const texto = String(v.gramas).trim().replace(',', '.')
    const gramas = Number(texto)
    if (texto === '' || !Number.isFinite(gramas) || gramas <= 0) {
      erros.push(`Moeda ${i + 1}: digite o peso lido na balança, em gramas.`)
    } else if (gramas < 1 || gramas > 100) {
      // A mesma faixa que o servidor recusa, conferida aqui para o operador
      // saber na hora em vez de depois do envio.
      erros.push(`Moeda ${i + 1}: ${v.gramas} g está fora do esperado (1 a 100 g). Confira a leitura.`)
    }
    if (v.veredito === 'recusada' && !v.motivoRecusa.trim()) {
      erros.push(`Moeda ${i + 1}: escreva o motivo da recusa.`)
    }
    return {
      // Gramas do display viram miligramas inteiros. O arredondamento acontece
      // aqui, uma vez, e não em três lugares diferentes.
      pesoMg: Math.round(gramas * 1000),
      veredito: v.veredito,
      motivoRecusa: v.veredito === 'recusada' ? v.motivoRecusa.trim() : null,
      caixa: v.veredito === 'aprovada' ? v.caixa.trim() || null : null,
      posicao: v.veredito === 'aprovada' && v.posicao !== '' ? Number(v.posicao) : null,
      caminhoVideo: estado.videoDaAnalise,
    }
  })

  if (!estado.operador) erros.push('Preencha o operador na configuração.')
  return { erros, carga: { protocolo: estado.envio.protocolo, operador: estado.operador, moedas } }
}

async function fecharAnalise() {
  if (estado.gravando) {
    mensagem('Pare a gravação antes de fechar.', 'erro')
    return
  }
  const { erros, carga } = montarCarga()
  if (erros.length > 0) {
    mensagem(erros.join(' '), 'erro')
    return
  }

  $('btn-fechar').disabled = true
  mensagem('Gravando a análise…')
  const r = await window.estacao.site.fechar(carga)
  $('btn-fechar').disabled = false

  if (!r.ok) {
    mensagem(r.erro, 'erro')
    return
  }
  if (r.aviso) {
    mensagem('O site recusou: ' + r.aviso + ' O registro ficou na pasta da fila.', 'erro')
  } else if (r.enviado) {
    const d = r.dados || {}
    mensagem(
      `Pronto. ${d.aprovadas || 0} aprovada(s), ${d.recusadas || 0} recusada(s). Recibos emitidos.`,
      'ok',
    )
  } else {
    mensagem(
      'Análise salva no notebook. Sem conexão agora — ela sobe sozinha quando a internet voltar.',
      'ok',
    )
  }

  atualizarPendentes(r.pendentes)
  estado.envio = null
  $('procedimento').hidden = true
  $('sem-selecao').hidden = false
  await carregarFila()
}

function atualizarPendentes(n) {
  const chip = $('pendentes')
  if (!n) {
    chip.hidden = true
    return
  }
  chip.hidden = false
  chip.textContent = n === 1 ? '1 análise aguardando envio' : `${n} análises aguardando envio`
}

/* ---------------------------------------------------------------------------
 * Início
 * ------------------------------------------------------------------------- */

$('btn-config').addEventListener('click', abrirConfig)
$('cfg-salvar').addEventListener('click', salvarConfig)
$('cfg-cancelar').addEventListener('click', () => ($('modal-config').hidden = true))
$('cfg-pasta').addEventListener('click', () => window.estacao.pasta.abrir('raiz'))
$('btn-atualizar').addEventListener('click', async () => {
  await verificarConexao()
  await carregarFila()
})
$('cameras').addEventListener('change', ligarCamera)
$('btn-gravar').addEventListener('click', alternarGravacao)
$('btn-fechar').addEventListener('click', fecharAnalise)

window.estacao.fila.aoMudar(({ pendentes }) => atualizarPendentes(pendentes))

;(async function iniciar() {
  const cfg = await window.estacao.config.ler()
  estado.operador = cfg.operador || ''

  // Sem chave, a primeira tela é a configuração — não um erro de conexão que o
  // operador não tem como interpretar.
  if (!cfg.temToken || !cfg.operador) {
    await abrirConfig()
    marcarConexao('Falta configurar', 'erro')
  } else if (await verificarConexao()) {
    await carregarFila()
  }

  await listarCameras()
  const { pendentes } = await window.estacao.fila.contar()
  atualizarPendentes(pendentes)
})()
