/**
 * Regras e loja de instalação do PWA — o contrato que o botão da página inicial, o aviso flutuante e o painel de
 * instruções dependem.
 *
 * Os user agents abaixo são de aparelhos reais (versões de 2025-2026), um por caso que muda o caminho de instalação.
 * Quem mexer na detecção precisa conferir aqui: errar o aparelho mostra ao cliente um passo a passo que não existe no
 * celular dele, e é a falha mais cara deste recurso (o resto só deixa de instalar).
 */

import { Script, runInNewContext } from 'node:vm'

import { describe, expect, it, vi } from 'vitest'

import { decidirRecarga, JANELA_DA_VOLTA_MS } from './atualizacao'
import {
  avisoLiberado,
  botaoDaLandingVisivel,
  criarLoja,
  detectarAmbiente,
  dispensaVigente,
  ehAparelhoIos,
  ehEventoDeInstalacao,
  instaladoValido,
  lerRegistro,
  registroAposDispensa,
  registroInstalado,
  registroSemInstalacao,
  resolverCaminho,
  rotaPermiteAviso,
  type Ambiente,
  type Caminho,
  type EventoDeInstalacao,
  type RegistroLocal,
} from './instalacao'
import { montarServiceWorker } from './service-worker'

const DIA = 86_400_000

const UA = {
  iphoneSafari:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1',
  iphoneChrome:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/137.0.7151.107 Mobile/15E148 Safari/604.1',
  iphoneEdge:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) EdgiOS/137.0.3296.83 Version/18.0 Mobile/15E148 Safari/605.1.15',
  iphoneInstagram:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/22F76 Instagram 380.0.0.28.105 (iPhone15,2; iOS 18_5; pt_BR; pt-BR; scale=3.00; 1170x2532; 700881820)',
  iphoneWebViewSemSafari:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
  ipadComoMac:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15',
  androidChrome:
    'Mozilla/5.0 (Linux; Android 15; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',
  androidSamsung:
    'Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/27.0 Chrome/125.0.0.0 Mobile Safari/537.36',
  androidFirefox: 'Mozilla/5.0 (Android 15; Mobile; rv:139.0) Gecko/139.0 Firefox/139.0',
  androidEdge:
    'Mozilla/5.0 (Linux; Android 15; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36 EdgA/137.0.0.0',
  androidFacebook:
    'Mozilla/5.0 (Linux; Android 14; SM-A546E Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/137.0.0.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/510.0.0.46.108;]',
  androidWebViewGenerico:
    'Mozilla/5.0 (Linux; Android 13; SM-S908B Build/TP1A.220624.014; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/137.0.0.0 Mobile Safari/537.36',
  desktopChrome:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
  desktopMac:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15',
} as const

const amb = (userAgent: string, maxTouchPoints = 5): Ambiente => detectarAmbiente({ userAgent, maxTouchPoints })

describe('detecção do aparelho', () => {
  it('iPhone no Safari, no Chrome e no Edge: tudo é iOS, só muda o navegador', () => {
    expect(amb(UA.iphoneSafari)).toEqual({ plataforma: 'ios', navegador: 'safari', embutido: false })
    expect(amb(UA.iphoneChrome)).toEqual({ plataforma: 'ios', navegador: 'chrome', embutido: false })
    expect(amb(UA.iphoneEdge)).toEqual({ plataforma: 'ios', navegador: 'edge', embutido: false })
  })

  it('iPad que se apresenta como Mac conta como iOS; um Mac de verdade (sem toque) não', () => {
    expect(ehAparelhoIos({ userAgent: UA.ipadComoMac, maxTouchPoints: 5 })).toBe(true)
    expect(ehAparelhoIos({ userAgent: UA.desktopMac, maxTouchPoints: 0 })).toBe(false)
    expect(amb(UA.desktopMac, 0).plataforma).toBe('outra')
  })

  it('Android: Chrome, Samsung, Firefox e Edge', () => {
    expect(amb(UA.androidChrome)).toEqual({ plataforma: 'android', navegador: 'chrome', embutido: false })
    expect(amb(UA.androidSamsung).navegador).toBe('samsung')
    expect(amb(UA.androidFirefox)).toEqual({ plataforma: 'android', navegador: 'firefox', embutido: false })
    expect(amb(UA.androidEdge).navegador).toBe('edge')
  })

  it('navegador embutido (Instagram, Facebook, WebView genérico, WebView do iPhone sem Safari) não instala', () => {
    expect(amb(UA.iphoneInstagram).embutido).toBe(true)
    expect(amb(UA.iphoneWebViewSemSafari).embutido).toBe(true)
    expect(amb(UA.androidFacebook).embutido).toBe(true)
    expect(amb(UA.androidWebViewGenerico).embutido).toBe(true)
  })

  it('computador: plataforma "outra"', () => {
    expect(amb(UA.desktopChrome, 0)).toEqual({ plataforma: 'outra', navegador: 'chrome', embutido: false })
  })
})

describe('qual caminho de instalação o aparelho tem', () => {
  const android = amb(UA.androidChrome)
  const iphone = amb(UA.iphoneSafari)
  const computador = amb(UA.desktopChrome, 0)
  const base = { standalone: false, marcadoInstalado: false, temEvento: false }

  it('instalado vence tudo, inclusive um evento que sobrou', () => {
    expect(resolverCaminho({ ...base, standalone: true, temEvento: true, ambiente: android })).toBe('instalado')
    expect(resolverCaminho({ ...base, marcadoInstalado: true, temEvento: true, ambiente: iphone })).toBe('instalado')
  })

  it('evento guardado = diálogo nativo, em qualquer plataforma', () => {
    expect(resolverCaminho({ ...base, temEvento: true, ambiente: android })).toBe('nativo')
    expect(resolverCaminho({ ...base, temEvento: true, ambiente: computador })).toBe('nativo')
  })

  it('sem evento: embutido manda abrir no navegador; iPhone e Android têm cada um o seu passo a passo', () => {
    expect(resolverCaminho({ ...base, ambiente: amb(UA.androidFacebook) })).toBe('abrir-no-navegador')
    expect(resolverCaminho({ ...base, ambiente: amb(UA.iphoneInstagram) })).toBe('abrir-no-navegador')
    expect(resolverCaminho({ ...base, ambiente: iphone })).toBe('ios')
    expect(resolverCaminho({ ...base, ambiente: android })).toBe('android')
  })

  it('computador sem evento não tem o que oferecer', () => {
    expect(resolverCaminho({ ...base, ambiente: computador })).toBe('indisponivel')
  })

  it('o botão da página inicial some só em "instalado" e "indisponível"', () => {
    const quais = (['instalado', 'nativo', 'abrir-no-navegador', 'ios', 'android', 'indisponivel'] as Caminho[]).filter(
      botaoDaLandingVisivel,
    )
    expect(quais).toEqual(['nativo', 'abrir-no-navegador', 'ios', 'android'])
  })
})

describe('registro guardado no aparelho', () => {
  it('a marca de instalado expira só quando tem prazo', () => {
    expect(instaladoValido({ v: 1 }, 100)).toBe(false)
    expect(instaladoValido(registroInstalado({ v: 1 }), 100)).toBe(true)
    const comPrazo = registroInstalado({ v: 1 }, 1000)
    expect(instaladoValido(comPrazo, 999)).toBe(true)
    expect(instaladoValido(comPrazo, 1000)).toBe(false)
  })

  it('registroSemInstalacao tira a marca e o prazo, e guarda o resto (dispensas)', () => {
    const r = registroSemInstalacao({ v: 1, instalado: true, instaladoAte: 5, dispensas: 2, dispensadoAte: 9 })
    expect(r).toEqual({ v: 1, dispensas: 2, dispensadoAte: 9 })
  })

  it('"Agora não": 7 dias na primeira vez, 30 dias nas seguintes', () => {
    const agora = 1_000_000
    const primeira = registroAposDispensa({ v: 1 }, agora)
    expect(primeira).toEqual({ v: 1, dispensas: 1, dispensadoAte: agora + 7 * DIA })
    const segunda = registroAposDispensa(primeira, agora)
    expect(segunda).toEqual({ v: 1, dispensas: 2, dispensadoAte: agora + 30 * DIA })
    expect(dispensaVigente(primeira, agora + 7 * DIA - 1)).toBe(true)
    expect(dispensaVigente(primeira, agora + 7 * DIA)).toBe(false)
  })

  it('texto ilegível, formato antigo ou tipo errado viram registro vazio', () => {
    expect(lerRegistro(null)).toEqual({ v: 1 })
    expect(lerRegistro('{quebrado')).toEqual({ v: 1 })
    expect(lerRegistro('"texto"')).toEqual({ v: 1 })
    expect(lerRegistro(JSON.stringify({ v: 2, instalado: true }))).toEqual({ v: 1 })
    expect(lerRegistro(JSON.stringify({ v: 1, instalado: 'sim', dispensas: 'muitas', dispensadoAte: 7 }))).toEqual({
      v: 1,
      dispensadoAte: 7,
    })
  })
})

describe('aviso flutuante', () => {
  const base = {
    caminho: 'nativo' as Caminho,
    ambiente: amb(UA.androidChrome),
    caminhoDaUrl: '/',
    registro: { v: 1 } as RegistroLocal,
    agora: 1000,
  }

  it('aparece em celular, nas telas de leitura, quando há algo a oferecer', () => {
    for (const rota of ['/', '/inicio', '/mercado', '/taxas', '/academy']) {
      expect(avisoLiberado({ ...base, caminhoDaUrl: rota }), rota).toBe(true)
    }
    expect(avisoLiberado({ ...base, caminho: 'ios', ambiente: amb(UA.iphoneSafari) })).toBe(true)
    expect(avisoLiberado({ ...base, caminho: 'android' })).toBe(true)
  })

  it('nunca em telas de fazer: login, cadastro, venda, compra, pagamento, retirada e painel', () => {
    for (const rota of ['/entrar', '/cadastrar', '/vender', '/compras', '/retirada', '/conta/extrato', '/envios', '/admin', '/painel', '/recibos/RO-1']) {
      expect(rotaPermiteAviso(rota), rota).toBe(false)
      expect(avisoLiberado({ ...base, caminhoDaUrl: rota }), rota).toBe(false)
    }
  })

  it('não aparece instalado, em navegador embutido, no computador ou durante o "Agora não"', () => {
    expect(avisoLiberado({ ...base, caminho: 'instalado' })).toBe(false)
    expect(avisoLiberado({ ...base, caminho: 'abrir-no-navegador' })).toBe(false)
    expect(avisoLiberado({ ...base, caminho: 'indisponivel' })).toBe(false)
    expect(avisoLiberado({ ...base, ambiente: amb(UA.desktopChrome, 0) })).toBe(false)
    expect(avisoLiberado({ ...base, registro: { v: 1, dispensadoAte: 2000 } })).toBe(false)
    expect(avisoLiberado({ ...base, registro: { v: 1, dispensadoAte: 1000 } })).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Loja
// ---------------------------------------------------------------------------

type Escolha = 'accepted' | 'dismissed'

class EventoFalso extends Event implements EventoDeInstalacao {
  prompt = vi.fn(async (): Promise<unknown> => undefined)
  userChoice: Promise<{ outcome: Escolha; platform: string }>
  constructor(escolha: Escolha = 'accepted') {
    super('beforeinstallprompt')
    this.userChoice = Promise.resolve({ outcome: escolha, platform: 'web' })
  }
}

function novaLoja(registroInicial: RegistroLocal = { v: 1 }) {
  const estado = { registro: registroInicial, agora: 1_700_000_000_000 }
  const gravacoes: RegistroLocal[] = []
  const loja = criarLoja({
    lerRegistro: () => estado.registro,
    gravarRegistro: (r) => {
      estado.registro = r
      gravacoes.push(r)
    },
    agora: () => estado.agora,
  })
  const caminho = (): Caminho => {
    const s = loja.getSnapshot()
    return !s.pronto
      ? 'indisponivel'
      : resolverCaminho({
          standalone: s.standalone,
          marcadoInstalado: instaladoValido(s.registro, estado.agora),
          temEvento: s.evento !== null,
          ambiente: s.ambiente,
        })
  }
  return { loja, estado, gravacoes, caminho }
}

describe('loja de instalação', () => {
  it('o servidor enxerga "não pronto" e nada é decidido antes de iniciar', () => {
    const { loja, caminho } = novaLoja()
    expect(loja.getServerSnapshot().pronto).toBe(false)
    expect(loja.getSnapshot()).toBe(loja.getServerSnapshot())
    expect(caminho()).toBe('indisponivel')
  })

  it('Android: sem evento é menu; com evento é diálogo nativo; aceitar marca como instalado e some o botão', async () => {
    const { loja, estado, caminho } = novaLoja()
    loja.iniciar({ ambiente: amb(UA.androidChrome), standalone: false })
    expect(caminho()).toBe('android')

    const evento = new EventoFalso('accepted')
    loja.capturarEvento(evento)
    expect(caminho()).toBe('nativo')

    await expect(loja.instalar()).resolves.toBe('aceito')
    expect(evento.prompt).toHaveBeenCalledTimes(1)
    expect(caminho()).toBe('instalado')
    expect(estado.registro.instalado).toBe(true)
    expect(botaoDaLandingVisivel(caminho())).toBe(false)
  })

  it('recusar o diálogo: o evento foi gasto, o botão continua e o próximo toque cai nas instruções', async () => {
    const { loja, caminho } = novaLoja()
    loja.iniciar({ ambiente: amb(UA.androidChrome), standalone: false })
    loja.capturarEvento(new EventoFalso('dismissed'))

    await expect(loja.instalar()).resolves.toBe('recusado')
    expect(caminho()).toBe('android')
    expect(botaoDaLandingVisivel(caminho())).toBe(true)
    await expect(loja.instalar()).resolves.toBe('indisponivel')
  })

  it('prompt() que lança erro: devolve "indisponível" e descarta o evento', async () => {
    const { loja, caminho } = novaLoja()
    loja.iniciar({ ambiente: amb(UA.androidChrome), standalone: false })
    const evento = new EventoFalso()
    evento.prompt.mockRejectedValueOnce(new Error('sem gesto'))
    loja.capturarEvento(evento)

    await expect(loja.instalar()).resolves.toBe('indisponivel')
    expect(caminho()).toBe('android')
  })

  it('REAPARECE: marca de instalado guardada + evento de instalação chegando = desinstalou, o botão volta', () => {
    const { loja, estado, caminho } = novaLoja({ v: 1, instalado: true })
    loja.iniciar({ ambiente: amb(UA.androidChrome), standalone: false })
    expect(caminho()).toBe('instalado') // visita seguinte à instalação, em aba comum: botão escondido

    loja.capturarEvento(new EventoFalso()) // o Chrome só dispara isto se o app NÃO está instalado
    expect(caminho()).toBe('nativo')
    expect(estado.registro.instalado).toBeUndefined()
  })

  it('REAPARECE também quando o evento já estava na mão antes da hidratação (captura do <head>)', () => {
    const { loja, estado, caminho } = novaLoja({ v: 1, instalado: true })
    loja.iniciar({ ambiente: amb(UA.androidChrome), standalone: false, eventoAdiado: new EventoFalso() })
    expect(caminho()).toBe('nativo')
    expect(estado.registro.instalado).toBeUndefined()
  })

  it('abrir como app (standalone) marca o aparelho como instalado e esconde tudo', () => {
    const { loja, estado, caminho } = novaLoja()
    loja.iniciar({ ambiente: amb(UA.androidChrome), standalone: true })
    expect(caminho()).toBe('instalado')
    expect(estado.registro.instalado).toBe(true)
  })

  it('appinstalled enquanto a página está aberta esconde o botão sem recarregar', () => {
    const { loja, caminho } = novaLoja()
    loja.iniciar({ ambiente: amb(UA.androidChrome), standalone: false })
    loja.capturarEvento(new EventoFalso())
    loja.marcarInstalado()
    expect(caminho()).toBe('instalado')
  })

  it('iPhone: "Já adicionei" esconde por 30 dias e depois o botão volta (a Apple não dá sinal de desinstalação)', () => {
    const { loja, estado, caminho } = novaLoja()
    loja.iniciar({ ambiente: amb(UA.iphoneSafari), standalone: false })
    expect(caminho()).toBe('ios')

    loja.marcarJaAdicionei()
    expect(caminho()).toBe('instalado')
    estado.agora += 29 * DIA
    expect(caminho()).toBe('instalado')
    estado.agora += 2 * DIA
    expect(caminho()).toBe('ios')
  })

  it('dispensar o aviso grava o prazo, e guardar o resto do registro intacto', () => {
    const { loja, estado } = novaLoja({ v: 1, dispensas: 1 })
    loja.iniciar({ ambiente: amb(UA.androidChrome), standalone: false })
    loja.dispensarAviso()
    expect(estado.registro.dispensas).toBe(2)
    expect(estado.registro.dispensadoAte).toBe(estado.agora + 30 * DIA)
  })

  it('o painel de instruções nasce na aba do aparelho e deixa trocar de aba', () => {
    const iphone = novaLoja()
    iphone.loja.iniciar({ ambiente: amb(UA.iphoneSafari), standalone: false })
    expect(iphone.loja.getSnapshot().guia).toEqual({ aberto: false, aba: 'ios' })
    iphone.loja.abrirGuia()
    iphone.loja.escolherAba('android')
    expect(iphone.loja.getSnapshot().guia).toEqual({ aberto: true, aba: 'android' })
    iphone.loja.fecharGuia()
    expect(iphone.loja.getSnapshot().guia.aberto).toBe(false)

    const android = novaLoja()
    android.loja.iniciar({ ambiente: amb(UA.androidChrome), standalone: false })
    expect(android.loja.getSnapshot().guia.aba).toBe('android')
  })

  it('só notifica quem ouve em mudança real (useSyncExternalStore compara por referência)', () => {
    const { loja } = novaLoja()
    loja.iniciar({ ambiente: amb(UA.androidChrome), standalone: false })
    const ouvinte = vi.fn()
    const parar = loja.subscribe(ouvinte)
    const antes = loja.getSnapshot()

    loja.fecharGuia() // já estava fechado
    loja.escolherAba('android') // já era a aba
    loja.mudarStandalone(false) // já era falso
    loja.capturarEvento(new Event('beforeinstallprompt')) // não é o evento de instalação
    expect(ouvinte).not.toHaveBeenCalled()
    expect(loja.getSnapshot()).toBe(antes)

    loja.abrirGuia()
    expect(ouvinte).toHaveBeenCalledTimes(1)
    parar()
    loja.fecharGuia()
    expect(ouvinte).toHaveBeenCalledTimes(1)
  })

  it('ehEventoDeInstalacao recusa Event comum e aceita o evento com prompt e userChoice', () => {
    expect(ehEventoDeInstalacao(new Event('x'))).toBe(false)
    expect(ehEventoDeInstalacao(null)).toBe(false)
    expect(ehEventoDeInstalacao(new EventoFalso())).toBe(true)
  })
})

describe('atualização automática: quando é seguro recarregar', () => {
  it('página oculta: sempre', () => {
    expect(decidirRecarga({ oculto: true, msDesdeQueFicouVisivel: 600_000, campoEmEdicao: true })).toBe(true)
  })
  it('acabou de voltar e ninguém está digitando: sim', () => {
    expect(decidirRecarga({ oculto: false, msDesdeQueFicouVisivel: 1000, campoEmEdicao: false })).toBe(true)
  })
  it('acabou de voltar mas há campo em edição: espera', () => {
    expect(decidirRecarga({ oculto: false, msDesdeQueFicouVisivel: 1000, campoEmEdicao: true })).toBe(false)
  })
  it('já está usando o app há um tempo: espera para o próximo segundo plano', () => {
    expect(decidirRecarga({ oculto: false, msDesdeQueFicouVisivel: JANELA_DA_VOLTA_MS, campoEmEdicao: false })).toBe(false)
  })
})

describe('service worker gerado', () => {
  const texto = montarServiceWorker('dpl_ABC123')

  it('é JavaScript válido e carrega a versão do deploy', () => {
    expect(() => new Script(texto)).not.toThrow()
    expect(texto).toContain('var VERSAO = "dpl_ABC123";')
  })

  it('cada deploy gera um texto diferente (é o que faz o navegador baixar a versão nova)', () => {
    expect(montarServiceWorker('dpl_OUTRO')).not.toBe(texto)
  })

  it('versão com caracteres perigosos não quebra o arquivo nem fecha o comentário do cabeçalho', () => {
    const t = montarServiceWorker('v*/;alert(1);/*\n')
    expect(() => new Script(t)).not.toThrow()
    expect(t.split('\n')[0]).not.toContain('*/;alert')
  })

  it('NUNCA toca API, método que muda estado ou outro domínio — e nunca guarda HTML', () => {
    expect(texto).toContain("if (req.method !== 'GET') return;")
    expect(texto).toContain('if (url.origin !== self.location.origin) return;')
    expect(texto).toContain("if (url.pathname.indexOf('/api/') === 0) return;")
    // navegação: rede primeiro, sem cache.put no ramo do documento
    const ramoDaNavegacao = texto.slice(texto.indexOf("req.mode === 'navigate'"), texto.indexOf('// 5.'))
    expect(ramoDaNavegacao).not.toContain('cache.put')
    expect(ramoDaNavegacao).toContain("caches.match('/offline.html')")
  })

  it('só guarda estáticos imutáveis e de marca', () => {
    const padrao = /var ESTATICO = (\/.+\/);/.exec(texto)
    expect(padrao).not.toBeNull()
    const re = runInNewContext(padrao?.[1] ?? '/$^/') as RegExp
    for (const ok of ['/_next/static/chunks/a-1f3.js', '/pwa/icon-192.png', '/brand/logo-real-olimpico-emblema.webp']) {
      expect(re.test(ok), ok).toBe(true)
    }
    for (const nao of ['/inicio', '/api/state', '/mercado', '/_next/image', '/conta/extrato', '/']) {
      expect(re.test(nao), nao).toBe(false)
    }
  })
})
