/**
 * Registro do service worker e ATUALIZAÇÃO AUTOMÁTICA do app.
 *
 * O pedido é "atualizar sozinho com toda mudança do sistema", mas esta é uma plataforma de dinheiro: recarregar a página
 * no meio de um Pix, de uma venda ou de um formulário joga fora o que a pessoa estava fazendo. A regra, então, é
 * ATUALIZAR SEM INTERROMPER:
 *
 *   1. Deploy novo = service worker com bytes novos (src/app/sw.js/route.ts). O navegador o percebe quando a página
 *      chama `registration.update()` — ao abrir, ao VOLTAR do segundo plano e a cada 30 minutos.
 *   2. O worker novo assume na hora (`skipWaiting` + `clients.claim`), e a página recebe `controllerchange`.
 *   3. A página recarrega para pegar o código novo, mas só num momento SEGURO (`decidirRecarga`):
 *        - quando o app vai para segundo plano (ninguém está olhando), ou
 *        - logo depois de a pessoa voltar (nos primeiros segundos), e só se ela não estiver digitando.
 *      Fora disso espera. A atualização nunca cai em cima de um campo preenchido.
 *
 * Como o worker NUNCA guarda HTML nem dados (ver ./service-worker.ts), mesmo sem recarregar a próxima navegação já vem
 * do servidor atualizado; o recarregamento só troca o JavaScript que já estava na memória.
 */

/** Janela, depois de voltar para o app, em que ainda é seguro recarregar. Curta: o toque seguinte pode ser um "Pagar". */
export const JANELA_DA_VOLTA_MS = 5_000
const INTERVALO_DE_CHECAGEM_MS = 30 * 60 * 1000

/**
 * Pode recarregar agora? Pura, para a suíte provar as três saídas sem DOM.
 *  - página oculta: sempre (ninguém vê; ao voltar já está nova);
 *  - recém-voltou e sem campo em edição: sim;
 *  - qualquer outro caso: espera.
 */
export function decidirRecarga(estado: { oculto: boolean; msDesdeQueFicouVisivel: number; campoEmEdicao: boolean }): boolean {
  if (estado.oculto) return true
  return estado.msDesdeQueFicouVisivel < JANELA_DA_VOLTA_MS && !estado.campoEmEdicao
}

function campoEmEdicao(): boolean {
  const el = document.activeElement
  if (!(el instanceof HTMLElement)) return false
  return el.isContentEditable || el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT'
}

/**
 * Em desenvolvimento o service worker atrapalha: intercepta o que o recarregamento a quente do Next precisa receber
 * inteiro, e um worker registrado em `localhost` sobrevive entre projetos que usam a mesma porta e passa a servir o
 * casco de OUTRO projeto — sintoma confuso e caro de diagnosticar. Aqui só desfaz o que sobrou.
 */
async function limparResiduosDeDesenvolvimento(): Promise<void> {
  const registros = await navigator.serviceWorker.getRegistrations()
  await Promise.all(registros.map((registro) => registro.unregister()))
  if ('caches' in window) {
    const nomes = await caches.keys()
    await Promise.all(nomes.filter((nome) => nome.startsWith('ro-casco-')).map((nome) => caches.delete(nome)))
  }
}

/** Registra o worker e liga a atualização automática. Devolve a limpeza para o `useEffect`. */
export function registrarServiceWorker(): () => void {
  if (!('serviceWorker' in navigator)) return () => {}

  if (process.env.NODE_ENV !== 'production') {
    void limparResiduosDeDesenvolvimento().catch(() => {})
    return () => {}
  }

  const sw = navigator.serviceWorker
  let registro: ServiceWorkerRegistration | undefined
  let controladorAnterior = sw.controller
  let atualizacaoPendente = false
  let visivelDesde = document.visibilityState === 'visible' ? Date.now() : 0
  let temporizador: ReturnType<typeof setInterval> | undefined

  function aplicarSeSeguro(): void {
    if (!atualizacaoPendente) return
    const seguro = decidirRecarga({
      oculto: document.visibilityState === 'hidden',
      msDesdeQueFicouVisivel: Date.now() - visivelDesde,
      campoEmEdicao: campoEmEdicao(),
    })
    if (seguro) window.location.reload()
  }

  function checarNovaVersao(): void {
    // Falha de rede aqui é normal (túnel, avião): a próxima checagem tenta de novo.
    void registro?.update().catch(() => {})
  }

  /**
   * O worker que controla a página mudou.
   * A PRIMEIRA troca de `null` para um worker é só a instalação inicial assumindo a página: não há versão anterior
   * a atualizar, e recarregar ali daria um piscar à toa na primeira visita.
   */
  function aoTrocarControlador(): void {
    const eraPrimeira = controladorAnterior === null
    controladorAnterior = sw.controller
    if (eraPrimeira) return
    atualizacaoPendente = true
    aplicarSeSeguro()
  }

  function aoMudarVisibilidade(): void {
    if (document.visibilityState === 'visible') {
      visivelDesde = Date.now()
      checarNovaVersao()
    } else {
      // Foi para segundo plano: é o melhor momento para trocar o código, ninguém está olhando.
      aplicarSeSeguro()
    }
  }

  function registrar(): void {
    // `updateViaCache: 'none'`: nem o script do worker nem o que ele importa passam pelo cache HTTP.
    void sw
      .register('/sw.js', { scope: '/', updateViaCache: 'none' })
      .then((r) => {
        registro = r
        temporizador = setInterval(() => {
          if (document.visibilityState === 'visible') checarNovaVersao()
        }, INTERVALO_DE_CHECAGEM_MS)
      })
      .catch((erro: unknown) => {
        // Falhar aqui não quebra o site: perde-se instalação e atualização automática, nada mais. Fica no console
        // para o problema não sumir, mas não interrompe nem avisa o cliente.
        console.error('[pwa] não foi possível registrar o service worker', erro)
      })
  }

  sw.addEventListener('controllerchange', aoTrocarControlador)
  document.addEventListener('visibilitychange', aoMudarVisibilidade)

  // Depois do `load`: o registro não disputa banda com a primeira pintura nem com a hidratação.
  const aoCarregar = (): void => registrar()
  if (document.readyState === 'complete') registrar()
  else window.addEventListener('load', aoCarregar, { once: true })

  return () => {
    sw.removeEventListener('controllerchange', aoTrocarControlador)
    document.removeEventListener('visibilitychange', aoMudarVisibilidade)
    window.removeEventListener('load', aoCarregar)
    if (temporizador !== undefined) clearInterval(temporizador)
  }
}
