/**
 * Instalação do PWA: as REGRAS (puras) e a LOJA que guarda o evento de instalação do navegador.
 *
 * Desenho herdado do IOCUS (admin/src/lib/pwa/install-prompt.ts), com o que o Real Olímpico tem de diferente: o aviso
 * precisa SUMIR para quem já instalou e VOLTAR se a pessoa desinstalar, e há uma versão de instruções por sistema.
 *
 * POR QUE UMA LOJA DE MÓDULO E NÃO UM useState
 * --------------------------------------------
 * O Chrome dispara `beforeinstallprompt` uma vez por carregamento de página, quase sempre antes de a pessoa chegar na
 * tela que mostra o botão. Um ouvinte montado só ali perderia o evento. Ele é capturado no layout raiz e guardado aqui;
 * um módulo sobrevive à navegação do App Router (o JavaScript não recarrega entre rotas), então o evento pego em `/`
 * continua disponível em `/inicio`.
 *
 * POR QUE NADA DE REACT, window OU localStorage AQUI
 * --------------------------------------------------
 * A suíte (vitest, ambiente `node`) testa estas regras sem DOM. O que toca o navegador mora em `./navegador.ts` e entra
 * por injeção (`Dependencias`).
 *
 * O QUE ESTE MÓDULO NUNCA FAZ
 * ---------------------------
 * Nunca chama `preventDefault()` em `beforeinstallprompt`. Isso silenciaria o convite nativo do Chrome; o nosso botão é
 * um caminho a mais para a MESMA instalação, não um substituto.
 *
 * COMO O "SOME / REAPARECE" FUNCIONA (e onde está o limite)
 * ---------------------------------------------------------
 *  - Android/Chrome: o evento só dispara se o app NÃO está instalado. Evento chegou = não está instalado = limpa a marca
 *    guardada. `appinstalled` (ou abrir o app em modo `standalone`) grava a marca. Desinstalou? Na próxima visita o
 *    evento volta, a marca cai e o botão reaparece.
 *  - iPhone: o Safari NÃO tem sinal nenhum de instalação, e o app da tela inicial tem armazenamento próprio — o site
 *    aberto no Safari não enxerga que ele existe. Dentro do app instalado o botão some (`navigator.standalone`); no
 *    Safari ele fica, e "Já adicionei" o esconde por 30 dias, depois volta (é o jeito de "desinstalar" aparecer de novo).
 */

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export type Plataforma = 'ios' | 'android' | 'outra'
export type Navegador = 'safari' | 'chrome' | 'edge' | 'firefox' | 'samsung' | 'opera' | 'outro'

export interface Ambiente {
  plataforma: Plataforma
  navegador: Navegador
  /** Navegador DENTRO de outro aplicativo (Instagram, Facebook, TikTok…): não instala PWA. */
  embutido: boolean
}

/**
 * O que o aparelho consegue fazer agora.
 *
 * - `instalado`          rodando como app, ou instalação já confirmada. Nada a oferecer.
 * - `nativo`             há um evento guardado: um toque abre o diálogo de instalação do navegador.
 * - `abrir-no-navegador` navegador embutido num app: só instala se abrir no Chrome (Android) ou Safari (iPhone).
 * - `ios`                iPhone/iPad: Compartilhar → Adicionar à Tela de Início, passo a passo.
 * - `android`            Android sem evento (recusou antes, Firefox, Samsung…): pelo menu do navegador.
 * - `indisponivel`       computador sem evento: nada útil a mostrar.
 */
export type Caminho = 'instalado' | 'nativo' | 'abrir-no-navegador' | 'ios' | 'android' | 'indisponivel'

export type Resultado = 'aceito' | 'recusado' | 'indisponivel'

/**
 * `BeforeInstallPromptEvent` do Chrome. Não está nos tipos DOM do TypeScript (a API nunca saiu da incubação), então só
 * os dois membros usados são declarados.
 */
export interface EventoDeInstalacao extends Event {
  /** Abre o diálogo nativo. Vale UMA vez por evento e só dentro de um toque do usuário. */
  prompt(): Promise<unknown>
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

/** O que fica no aparelho (localStorage). Versionado: um formato novo no futuro não lê lixo do antigo. */
export interface RegistroLocal {
  v: 1
  /** Marca de "instalado". */
  instalado?: boolean
  /** Fim da marca, em ms. Só o "Já adicionei" do iPhone usa: sem sinal de desinstalação, a marca precisa expirar. */
  instaladoAte?: number
  /** Quantas vezes a pessoa disse "Agora não" ao aviso flutuante. */
  dispensas?: number
  /** O aviso flutuante não volta antes deste instante, em ms. */
  dispensadoAte?: number
}

export type AbaDoGuia = 'android' | 'ios'

export interface Instantaneo {
  /** Falso no servidor e até `iniciar`: nada é decidido sem saber o aparelho. */
  readonly pronto: boolean
  readonly ambiente: Ambiente
  /** Rodando como app instalado (`display-mode: standalone` ou `navigator.standalone`). */
  readonly standalone: boolean
  readonly evento: EventoDeInstalacao | null
  readonly registro: RegistroLocal
  readonly guia: { readonly aberto: boolean; readonly aba: AbaDoGuia }
}

// ---------------------------------------------------------------------------
// Constantes de tempo
// ---------------------------------------------------------------------------

const DIA = 86_400_000
/** Primeira dispensa do aviso: volta em 7 dias. */
export const DIAS_APOS_PRIMEIRA_DISPENSA = 7
/** Da segunda em diante: 30 dias. Convite, não cobrança. */
export const DIAS_APOS_DISPENSAS_SEGUINTES = 30
/** "Já adicionei" no iPhone vale por 30 dias; depois o botão volta (ver o cabeçalho do arquivo). */
export const DIAS_DO_JA_ADICIONEI = 30
/** Espera antes de o aviso aparecer, para não competir com a primeira pintura nem com a leitura inicial. */
export const ESPERA_DO_AVISO_MS = 6_000

/**
 * Onde o aviso flutuante pode aparecer: telas de LER, nunca de FAZER. Login, cadastro, venda, compra, pagamento,
 * retirada e todo o painel ficam de fora — um cartão por cima do botão "Pagar" é pior que nenhuma instalação.
 */
const ROTAS_DO_AVISO: readonly string[] = ['/', '/inicio', '/mercado', '/taxas', '/academy']

// ---------------------------------------------------------------------------
// Detecção do aparelho
// ---------------------------------------------------------------------------

/** Apps que abrem links num navegador próprio, incapaz de instalar PWA. `; wv)` é o WebView genérico do Android. */
const NAVEGADOR_EMBUTIDO = /FBAN|FBAV|FB_IAB|FBIOS|Instagram|TikTok|musical_ly|BytedanceWebview|LinkedInApp|Snapchat|Twitter|MicroMessenger|KAKAOTALK|Line\/|; wv\)/i

/**
 * iPhone, iPod e iPad. O iPadOS 13+ pede o site de computador e se apresenta como Mac ("Macintosh"); um Mac de verdade
 * não tem tela de toque, então "Macintosh" com mais de um ponto de toque é um iPad disfarçado.
 */
export function ehAparelhoIos({ userAgent, maxTouchPoints }: { userAgent: string; maxTouchPoints: number }): boolean {
  if (/iPhone|iPad|iPod/i.test(userAgent)) return true
  return /Macintosh/i.test(userAgent) && maxTouchPoints > 1
}

function detectarNavegador(ua: string): Navegador {
  // A ordem importa: quase todos dizem "Chrome/" no user agent, então os específicos vêm antes.
  if (/SamsungBrowser/i.test(ua)) return 'samsung'
  if (/EdgA|EdgiOS|Edg\//.test(ua)) return 'edge'
  if (/OPR\/|OPiOS|Opera/i.test(ua)) return 'opera'
  if (/FxiOS|Firefox/i.test(ua)) return 'firefox'
  if (/CriOS|Chrome\//i.test(ua)) return 'chrome'
  if (/Safari\//i.test(ua)) return 'safari'
  return 'outro'
}

export function detectarAmbiente({ userAgent, maxTouchPoints }: { userAgent: string; maxTouchPoints: number }): Ambiente {
  const ios = ehAparelhoIos({ userAgent, maxTouchPoints })
  const android = !ios && /Android/i.test(userAgent)
  const plataforma: Plataforma = ios ? 'ios' : android ? 'android' : 'outra'

  // No iPhone, um WebView embutido não traz "Safari/" no user agent (o Safari de verdade e o Chrome do iPhone trazem).
  // O app JÁ instalado também não traz, mas esse caso é resolvido antes por `standalone` — ver `resolverCaminho`.
  const embutido =
    NAVEGADOR_EMBUTIDO.test(userAgent) || (ios && !/Safari\//i.test(userAgent) && !/CriOS|FxiOS|EdgiOS/i.test(userAgent))

  return { plataforma, navegador: detectarNavegador(userAgent), embutido }
}

// ---------------------------------------------------------------------------
// Regras de decisão
// ---------------------------------------------------------------------------

/** A marca de "instalado" ainda vale? (Expira só no caso do "Já adicionei" do iPhone.) */
export function instaladoValido(registro: RegistroLocal, agora: number): boolean {
  if (registro.instalado !== true) return false
  return registro.instaladoAte === undefined || registro.instaladoAte > agora
}

/**
 * Qual caminho de instalação o aparelho tem agora. Prioridade: instalado > nativo > navegador embutido > iPhone >
 * Android > indisponível.
 */
export function resolverCaminho(entrada: {
  standalone: boolean
  marcadoInstalado: boolean
  temEvento: boolean
  ambiente: Ambiente
}): Caminho {
  // 1. Instalado vence tudo: nenhuma sobra de evento ou de dica de plataforma pode oferecer uma segunda instalação.
  if (entrada.standalone || entrada.marcadoInstalado) return 'instalado'
  // 2. Evento guardado = diálogo nativo direto, o melhor caminho (é o mesmo do convite do Chrome).
  if (entrada.temEvento) return 'nativo'
  // 3. Navegador dentro de outro app não instala; o que ajuda é mandar abrir no navegador de verdade.
  if (entrada.ambiente.embutido && entrada.ambiente.plataforma !== 'outra') return 'abrir-no-navegador'
  // 4. iPhone nunca dispara o evento (todos os navegadores de lá usam o WebKit): só o Compartilhar.
  if (entrada.ambiente.plataforma === 'ios') return 'ios'
  // 5. Android sem evento: menu do navegador.
  if (entrada.ambiente.plataforma === 'android') return 'android'
  return 'indisponivel'
}

/** Caminho do estado atual da loja. Antes do `iniciar` não há decisão: devolve `indisponivel`. */
export function caminhoDoInstantaneo(s: Instantaneo, agora: number): Caminho {
  if (!s.pronto) return 'indisponivel'
  return resolverCaminho({
    standalone: s.standalone,
    marcadoInstalado: instaladoValido(s.registro, agora),
    temEvento: s.evento !== null,
    ambiente: s.ambiente,
  })
}

/** O botão da página inicial aparece em todo caminho que tem algo a oferecer. */
export function botaoDaLandingVisivel(caminho: Caminho): boolean {
  return caminho !== 'instalado' && caminho !== 'indisponivel'
}

export function rotaPermiteAviso(caminhoDaUrl: string): boolean {
  return ROTAS_DO_AVISO.includes(caminhoDaUrl)
}

export function dispensaVigente(registro: RegistroLocal, agora: number): boolean {
  return registro.dispensadoAte !== undefined && registro.dispensadoAte > agora
}

/**
 * O aviso flutuante pode aparecer? Só em celular ou tablet (computador tem o convite do próprio navegador e o botão
 * da página inicial), só onde há algo a oferecer, só em telas de leitura e só fora do período de "Agora não".
 * O navegador embutido fica de fora: ali não há instalação possível, e o botão da página inicial já explica.
 */
export function avisoLiberado(entrada: {
  caminho: Caminho
  ambiente: Ambiente
  caminhoDaUrl: string
  registro: RegistroLocal
  agora: number
}): boolean {
  if (entrada.ambiente.plataforma === 'outra') return false
  if (entrada.caminho !== 'nativo' && entrada.caminho !== 'ios' && entrada.caminho !== 'android') return false
  if (!rotaPermiteAviso(entrada.caminhoDaUrl)) return false
  return !dispensaVigente(entrada.registro, entrada.agora)
}

// ---------------------------------------------------------------------------
// Transições do registro (puras: devolvem um registro novo)
// ---------------------------------------------------------------------------

/** Marca como instalado. Sem `ate` a marca não expira (Android: quem desmarca é o evento de instalação, ver acima). */
export function registroInstalado(registro: RegistroLocal, ate?: number): RegistroLocal {
  const novo: RegistroLocal = { ...registro, instalado: true }
  if (ate === undefined) delete novo.instaladoAte
  else novo.instaladoAte = ate
  return novo
}

/** O evento de instalação chegou: por definição o app NÃO está instalado — é o que faz o botão reaparecer. */
export function registroSemInstalacao(registro: RegistroLocal): RegistroLocal {
  const novo: RegistroLocal = { ...registro }
  delete novo.instalado
  delete novo.instaladoAte
  return novo
}

/** "Agora não": 7 dias na primeira vez, 30 nas seguintes. */
export function registroAposDispensa(registro: RegistroLocal, agora: number): RegistroLocal {
  const vezes = registro.dispensas ?? 0
  const dias = vezes === 0 ? DIAS_APOS_PRIMEIRA_DISPENSA : DIAS_APOS_DISPENSAS_SEGUINTES
  return { ...registro, dispensas: vezes + 1, dispensadoAte: agora + dias * DIA }
}

/** Lê o texto do localStorage sem confiar nele: lixo, formato antigo ou JSON quebrado viram registro vazio. */
export function lerRegistro(texto: string | null): RegistroLocal {
  if (!texto) return { v: 1 }
  try {
    const bruto: unknown = JSON.parse(texto)
    if (typeof bruto !== 'object' || bruto === null) return { v: 1 }
    const o = bruto as Record<string, unknown>
    if (o.v !== 1) return { v: 1 }
    const numero = (x: unknown): number | undefined => (typeof x === 'number' && Number.isFinite(x) ? x : undefined)
    return {
      v: 1,
      ...(o.instalado === true ? { instalado: true } : {}),
      ...(numero(o.instaladoAte) !== undefined ? { instaladoAte: numero(o.instaladoAte) } : {}),
      ...(numero(o.dispensas) !== undefined ? { dispensas: numero(o.dispensas) } : {}),
      ...(numero(o.dispensadoAte) !== undefined ? { dispensadoAte: numero(o.dispensadoAte) } : {}),
    }
  } catch {
    return { v: 1 }
  }
}

/** Confere que um `Event` qualquer é mesmo o evento de instalação (o TypeScript o tipa como `Event` puro). */
export function ehEventoDeInstalacao(evento: unknown): evento is EventoDeInstalacao {
  return (
    typeof evento === 'object' &&
    evento !== null &&
    typeof (evento as { prompt?: unknown }).prompt === 'function' &&
    'userChoice' in evento
  )
}

// ---------------------------------------------------------------------------
// Loja
// ---------------------------------------------------------------------------

export interface Dependencias {
  lerRegistro(): RegistroLocal
  gravarRegistro(registro: RegistroLocal): void
  agora(): number
}

/** Como o servidor enxerga a loja — e o ponto de partida da hidratação. Congelado e compartilhado. */
const INICIAL: Instantaneo = Object.freeze({
  pronto: false,
  ambiente: Object.freeze({ plataforma: 'outra', navegador: 'outro', embutido: false } as Ambiente),
  standalone: false,
  evento: null,
  registro: Object.freeze({ v: 1 } as RegistroLocal),
  guia: Object.freeze({ aberto: false, aba: 'android' as AbaDoGuia }),
})

/**
 * Cria uma loja. O site usa uma só (`lojaDeInstalacao`, em ./navegador.ts); a fábrica existe para cada teste ter a sua,
 * limpa. Todo método é um closure (sem `this`): pode ir direto para `addEventListener` ou `useSyncExternalStore`.
 */
export function criarLoja(dep: Dependencias) {
  let instantaneo: Instantaneo = INICIAL
  const ouvintes = new Set<() => void>()

  /** Troca o instantâneo inteiro e avisa quem ouve. Só se chama numa mudança real: `useSyncExternalStore` compara por referência. */
  function confirmar(proximo: Instantaneo): void {
    instantaneo = proximo
    for (const ouvinte of ouvintes) ouvinte()
  }

  function gravar(registro: RegistroLocal): RegistroLocal {
    dep.gravarRegistro(registro)
    return registro
  }

  function subscribe(ouvinte: () => void): () => void {
    ouvintes.add(ouvinte)
    return () => {
      ouvintes.delete(ouvinte)
    }
  }

  const getSnapshot = (): Instantaneo => instantaneo
  const getServerSnapshot = (): Instantaneo => INICIAL

  /**
   * Chamado uma vez, no navegador, depois da hidratação. `eventoAdiado` é o evento que o script de <head> do layout
   * já pegou antes de o React existir (ver layout.tsx): sem ele, um evento disparado durante o carregamento se perderia.
   */
  function iniciar(contexto: { ambiente: Ambiente; standalone: boolean; eventoAdiado?: EventoDeInstalacao | null }): void {
    let registro = dep.lerRegistro()
    const agora = dep.agora()
    if (contexto.standalone && !instaladoValido(registro, agora)) registro = gravar(registroInstalado(registro))
    // Evento já na mão = não está instalado, mesmo que a marca diga o contrário (desinstalou).
    if (contexto.eventoAdiado && instaladoValido(registro, agora)) registro = gravar(registroSemInstalacao(registro))
    confirmar({
      ...instantaneo,
      pronto: true,
      ambiente: contexto.ambiente,
      standalone: contexto.standalone,
      evento: contexto.eventoAdiado ?? null,
      registro,
      guia: { aberto: false, aba: contexto.ambiente.plataforma === 'ios' ? 'ios' : 'android' },
    })
  }

  /** Ouvinte de `beforeinstallprompt`. Um evento novo substitui o velho: só o mais recente é garantidamente utilizável. */
  function capturarEvento(evento: Event): void {
    if (!ehEventoDeInstalacao(evento)) return
    if (instantaneo.evento === evento) return
    const registro = instaladoValido(instantaneo.registro, dep.agora())
      ? gravar(registroSemInstalacao(instantaneo.registro))
      : instantaneo.registro
    confirmar({ ...instantaneo, evento, registro })
  }

  /** `appinstalled`, ou o aceite do diálogo nativo. O evento guardado morre: não instala duas vezes. */
  function marcarInstalado(): void {
    confirmar({
      ...instantaneo,
      evento: null,
      registro: gravar(registroInstalado(instantaneo.registro)),
      guia: { ...instantaneo.guia, aberto: false },
    })
  }

  /** iPhone: "Já adicionei". Vale 30 dias (ver o cabeçalho do arquivo). */
  function marcarJaAdicionei(): void {
    confirmar({
      ...instantaneo,
      registro: gravar(registroInstalado(instantaneo.registro, dep.agora() + DIAS_DO_JA_ADICIONEI * DIA)),
      guia: { ...instantaneo.guia, aberto: false },
    })
  }

  function mudarStandalone(standalone: boolean): void {
    if (instantaneo.standalone === standalone) return
    const registro = standalone ? gravar(registroInstalado(instantaneo.registro)) : instantaneo.registro
    confirmar({ ...instantaneo, standalone, registro })
  }

  /**
   * Abre o diálogo nativo de instalação com o evento guardado.
   *
   * TEM que ser chamado direto do toque: `prompt()` exige o gesto do usuário, então nada pode ser aguardado antes dele.
   * Uma função `async` roda síncrona até o primeiro `await`, que é justamente a chamada de `prompt()`.
   *
   * O evento vale uma vez, então é descartado ANTES de abrir: um segundo toque, ou um `prompt()` que lance erro, nunca
   * chega ao mesmo evento. Depois de uma recusa o caminho cai para `android`, e o toque seguinte abre as instruções.
   */
  async function instalar(): Promise<Resultado> {
    const evento = instantaneo.evento
    if (evento === null) return 'indisponivel'
    confirmar({ ...instantaneo, evento: null })
    try {
      await evento.prompt()
      const { outcome } = await evento.userChoice
      if (outcome === 'accepted') {
        // Sem esperar o `appinstalled` (o Chrome pode levar alguns segundos): o botão não pode se oferecer de novo nesse intervalo.
        marcarInstalado()
        return 'aceito'
      }
      return 'recusado'
    } catch {
      // `prompt()` recusou (sem gesto, ou evento já usado). Sem log, de propósito: o chamador responde `indisponivel`
      // abrindo as instruções, que é a saída de que a pessoa precisa.
      return 'indisponivel'
    }
  }

  function dispensarAviso(): void {
    confirmar({ ...instantaneo, registro: gravar(registroAposDispensa(instantaneo.registro, dep.agora())) })
  }

  function abrirGuia(aba?: AbaDoGuia): void {
    confirmar({ ...instantaneo, guia: { aberto: true, aba: aba ?? instantaneo.guia.aba } })
  }

  function fecharGuia(): void {
    if (!instantaneo.guia.aberto) return
    confirmar({ ...instantaneo, guia: { ...instantaneo.guia, aberto: false } })
  }

  function escolherAba(aba: AbaDoGuia): void {
    if (instantaneo.guia.aba === aba) return
    confirmar({ ...instantaneo, guia: { ...instantaneo.guia, aba } })
  }

  return {
    subscribe,
    getSnapshot,
    getServerSnapshot,
    iniciar,
    capturarEvento,
    marcarInstalado,
    marcarJaAdicionei,
    mudarStandalone,
    instalar,
    dispensarAviso,
    abrirGuia,
    fecharGuia,
    escolherAba,
  }
}

export type LojaDeInstalacao = ReturnType<typeof criarLoja>
