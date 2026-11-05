'use client'

/**
 * Botão "Baixar o app" da página inicial.
 *
 *   - Android com o evento do Chrome: um toque abre o diálogo de instalação.
 *   - Qualquer outro caso com algo a oferecer (iPhone, Android sem evento, navegador embutido): abre o painel de
 *     instruções, na aba do aparelho.
 *   - SOME para quem já instalou (app aberto como app, ou instalação confirmada) e REAPARECE se desinstalar — as regras
 *     e o limite do iPhone estão no cabeçalho de src/lib/pwa/instalacao.ts.
 *
 * VISÍVEL ANTES DE HIDRATAR, DE PROPÓSITO. O servidor não sabe se o app está instalado, então este botão sai no HTML.
 * Se ele só nascesse depois da hidratação, a faixa do herói da landing empurraria o conteúdo para baixo no meio da
 * leitura (deslocamento de layout) para todo visitante novo, que é quem importa. O custo é o inverso, e raro: quem JÁ
 * instalou e abre a página no navegador vê o botão por um instante antes de ele sumir. No computador (mouse e janela
 * larga) o CSS o esconde desde o HTML — ver `.pub-instalar` em src/styles/pwa.css.
 *
 * Fica DIRETO em `.pub-acoes` (sem div em volta): o `flex` dos botões do herói só vale para filho direto.
 */

import type { ReactNode } from 'react'

import { botaoDaLandingVisivel } from '@/lib/pwa/instalacao'

import { IconeBaixar } from './IconesDoGuia'
import { useInstalacao } from './useInstalacao'

export function BotaoBaixarApp(): ReactNode {
  const { caminho, pronto, loja } = useInstalacao()

  // Só some quando SABE que não há o que oferecer. Antes de `pronto`, fica.
  if (pronto && !botaoDaLandingVisivel(caminho)) return null

  async function aoTocar(): Promise<void> {
    if (caminho === 'nativo') {
      // Direto do toque (o diálogo exige o gesto). Sem diálogo possível, mostra o passo a passo.
      const resultado = await loja.instalar()
      if (resultado === 'indisponivel') loja.abrirGuia()
      return
    }
    loja.abrirGuia()
  }

  return (
    <button
      type="button"
      className="pub-btn pub-btn-ghost pub-btn-lg pub-instalar"
      data-pwa-baixar=""
      aria-haspopup="dialog"
      onClick={() => void aoTocar()}
    >
      <IconeBaixar />
      Baixar o app
    </button>
  )
}
