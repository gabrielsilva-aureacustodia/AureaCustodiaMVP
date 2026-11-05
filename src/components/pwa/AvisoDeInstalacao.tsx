'use client'

/**
 * Aviso flutuante de instalação: um cartão que sobe do rodapé, parecido com o convite do próprio navegador, mas com a
 * versão certa para cada sistema.
 *
 *   - Android com o evento do Chrome: o botão "Instalar" abre o diálogo nativo direto.
 *   - Android sem evento, e iPhone: o botão "Como instalar" abre o painel de instruções da aba do aparelho.
 *
 * POR QUE NÃO É INCÔMODO (decisões de UX, todas testadas em src/lib/pwa/instalacao.test.ts):
 *   - só celular e tablet, e só em telas de LER (`rotaPermiteAviso`): nunca por cima de login, pagamento ou venda;
 *   - só depois de 6 segundos na tela (`ESPERA_DO_AVISO_MS`), para não competir com a primeira pintura;
 *   - "Agora não" some por 7 dias, e por 30 nas vezes seguintes; instalado, nunca mais;
 *   - sai do caminho dos botões flutuantes que já existem (Atendimento e "Ver tutorial"): a altura do cartão vai para
 *     `--pwa-aviso-altura` e src/styles/pwa.css sobe esses botões enquanto ele está na tela.
 *
 * A espera reinicia a cada rota (`key={pathname}`): quem acaba de sair do login para `/inicio` não leva um cartão na
 * cara no primeiro segundo.
 */

import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

import { LOGO_REAL_EMBLEMA } from '@/domain/constants'
import { avisoLiberado, ESPERA_DO_AVISO_MS } from '@/lib/pwa/instalacao'

import { IconeBaixar } from './IconesDoGuia'
import { useInstalacao } from './useInstalacao'

function AvisoComEspera({ caminhoDaUrl }: { caminhoDaUrl: string }): ReactNode {
  const { instantaneo, caminho, pronto, loja } = useInstalacao()
  const [esperou, setEsperou] = useState(false)
  const [botaoDaPaginaNaTela, setBotaoDaPaginaNaTela] = useState(false)
  const cartao = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const temporizador = setTimeout(() => setEsperou(true), ESPERA_DO_AVISO_MS)
    return () => clearTimeout(temporizador)
  }, [])

  // Na página inicial o convite JÁ está na tela, em forma de botão (BotaoBaixarApp). Um cartão por cima dele seria
  // repetição e ainda cobriria o herói: o aviso cede enquanto esse botão está visível e entra quando a pessoa rola
  // para além dele. Nas outras telas não há botão e o aviso segue a regra normal.
  useEffect(() => {
    const botao = document.querySelector('[data-pwa-baixar]')
    if (!botao || typeof IntersectionObserver === 'undefined') return
    const observador = new IntersectionObserver(([entrada]) => setBotaoDaPaginaNaTela(entrada?.isIntersecting === true))
    observador.observe(botao)
    return () => observador.disconnect()
  }, [])

  const liberado =
    pronto &&
    esperou &&
    !botaoDaPaginaNaTela &&
    !instantaneo.guia.aberto &&
    avisoLiberado({
      caminho,
      ambiente: instantaneo.ambiente,
      caminhoDaUrl,
      registro: instantaneo.registro,
      agora: Date.now(),
    })

  // Avisa o CSS a altura do cartão, para os botões flutuantes de baixo subirem em vez de ficarem escondidos por ele.
  useEffect(() => {
    const elemento = cartao.current
    if (!liberado || !elemento) return
    const medir = (): void => document.documentElement.style.setProperty('--pwa-aviso-altura', `${elemento.offsetHeight}px`)
    medir()
    const observador = new ResizeObserver(medir)
    observador.observe(elemento)
    return () => {
      observador.disconnect()
      document.documentElement.style.removeProperty('--pwa-aviso-altura')
    }
  }, [liberado])

  if (!liberado) return null

  async function aoInstalar(): Promise<void> {
    if (caminho !== 'nativo') {
      loja.abrirGuia()
      return
    }
    const resultado = await loja.instalar()
    // Recusou no diálogo do navegador: respeita e não insiste. Sem diálogo (evento gasto): mostra o passo a passo.
    if (resultado === 'recusado') loja.dispensarAviso()
    else if (resultado === 'indisponivel') loja.abrirGuia()
  }

  return (
    <div ref={cartao} className="pwa-aviso" role="region" aria-label="Instalar o aplicativo">
      <div className="pwa-aviso-corpo">
        <Image className="pwa-aviso-emblema" src={LOGO_REAL_EMBLEMA} alt="" width={44} height={44} />
        <div>
          <p className="pwa-aviso-titulo">Instale o Real Olímpico</p>
          <p className="pwa-aviso-texto">Abre em tela cheia, direto da tela inicial, e se atualiza sozinho.</p>
        </div>
      </div>
      <div className="pwa-aviso-acoes">
        <button type="button" className="btn btn-gold" onClick={() => void aoInstalar()}>
          <IconeBaixar />
          {caminho === 'nativo' ? 'Instalar' : 'Como instalar'}
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => loja.dispensarAviso()}>
          Agora não
        </button>
      </div>
    </div>
  )
}

export function AvisoDeInstalacao(): ReactNode {
  const caminhoDaUrl = usePathname()
  return <AvisoComEspera key={caminhoDaUrl} caminhoDaUrl={caminhoDaUrl} />
}
