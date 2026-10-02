'use client'

/**
 * O tour guiado: tela escurecida e borrada, um foco no elemento explicado e um balão com o texto.
 *
 * COMO O FOCO É FEITO
 * -------------------
 * Uma camada de tela cheia pinta o véu (escuro + desfoque) e recebe um `clip-path` com um buraco
 * do tamanho do elemento — o buraco deixa o elemento nítido e o resto borrado, o que um simples
 * `box-shadow` gigante não faz (ele escurece, mas não desfoca o que está dentro do buraco da
 * sombra). A camada captura todos os cliques, inclusive os do buraco: durante o tour nada da
 * tela por baixo é acionável, e é isso que garante que o passeio não compra, vende nem paga nada.
 *
 * O ELEMENTO PODE AINDA NÃO EXISTIR
 * ---------------------------------
 * Cada passo manda a pessoa para uma rota, e a tela de destino carrega depois da navegação. O
 * componente procura a âncora por alguns segundos; se ela não aparecer (a tela está num estado
 * que não a mostra, como "Envios" de quem já tem um envio em andamento), o balão sai no centro
 * em vez de travar o tour.
 */

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'

import { TOTAL_DE_ETAPAS_DO_TOUR } from '@/domain/tutorial'
import type { PassoDoTour } from '@/domain/tutorial'
import { acharAlvo, mesmaCaixa, medir, trazerParaVista } from '@/components/tutorial/dom'
import type { Caixa } from '@/components/tutorial/dom'

/** Folga entre o elemento e a borda do foco. */
const FOLGA = 6
const LIMITE_MOBILE_PX = 640
/** Quanto esperar a âncora aparecer depois de a rota abrir. */
const ESPERA_ANCORA_MS = 3000

interface Props {
  passo: PassoDoTour
  /** Posição do passo na lista e tamanho da lista, para o texto "passo X de Y" dentro da etapa. */
  numeroNaEtapa: number
  totalNaEtapa: number
  podeVoltar: boolean
  ultimo: boolean
  /** A rota do passo já está aberta? Antes disso o balão espera. */
  rotaPronta: boolean
  aoAvancar(): void
  aoVoltar(): void
  aoPularEtapa(): void
  aoPularTudo(): void
  /** Só no último balão quando há ação final (completar cadastro): fecha o tour e leva ao formulário. */
  aoCompletarCadastro?: () => void
}

export function TourGuiado({
  passo,
  numeroNaEtapa,
  totalNaEtapa,
  podeVoltar,
  ultimo,
  rotaPronta,
  aoAvancar,
  aoVoltar,
  aoPularEtapa,
  aoPularTudo,
  aoCompletarCadastro,
}: Props): ReactNode {
  const [alvo, setAlvo] = useState<HTMLElement | null>(null)
  const [semAlvo, setSemAlvo] = useState(false)
  const [caixa, setCaixa] = useState<Caixa | null>(null)
  const [janela, setJanela] = useState<{ w: number; h: number }>({ w: 1280, h: 800 })
  const [alturaBalao, setAlturaBalao] = useState(220)
  const balaoRef = useRef<HTMLDivElement | null>(null)
  const botaoPrincipal = useRef<HTMLButtonElement | null>(null)

  const movel = janela.w < LIMITE_MOBILE_PX

  // Procura a âncora assim que a rota do passo estiver aberta; desiste (balão central) depois de um tempo.
  useEffect(() => {
    setAlvo(null)
    setCaixa(null)
    setSemAlvo(false)
    if (!rotaPronta) return
    if (!passo.alvo) {
      setSemAlvo(true)
      return
    }

    const inicio = Date.now()
    const procurar = (): void => {
      const el = acharAlvo(passo.alvo)
      if (el) {
        setAlvo(el)
        trazerParaVista(el, movel ? 70 : 100)
        window.clearInterval(timer)
      } else if (Date.now() - inicio > ESPERA_ANCORA_MS) {
        setSemAlvo(true)
        window.clearInterval(timer)
      }
    }
    const timer = window.setInterval(procurar, 120)
    procurar()
    return () => window.clearInterval(timer)
    // `movel` só afeta a margem de rolagem; refazer a busca quando ele muda reiniciaria a espera à toa.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passo.id, rotaPronta])

  // Acompanha o elemento enquanto a tela rola, redimensiona ou muda de altura.
  useEffect(() => {
    const atualizar = (): void => {
      setJanela((j) => (j.w === window.innerWidth && j.h === window.innerHeight ? j : { w: window.innerWidth, h: window.innerHeight }))
      if (!alvo) return
      if (!alvo.isConnected) {
        setAlvo(null)
        setSemAlvo(true)
        setCaixa(null)
        return
      }
      const nova = medir(alvo)
      setCaixa((atual) => (mesmaCaixa(atual, nova) ? atual : nova))
    }
    atualizar()
    const timer = window.setInterval(atualizar, 150)
    window.addEventListener('scroll', atualizar, true)
    window.addEventListener('resize', atualizar)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('scroll', atualizar, true)
      window.removeEventListener('resize', atualizar)
    }
  }, [alvo])

  useLayoutEffect(() => {
    const h = balaoRef.current?.offsetHeight
    if (h && h !== alturaBalao) setAlturaBalao(h)
  }, [passo.id, janela.w, rotaPronta, semAlvo, alvo, alturaBalao])

  // Foco no botão principal a cada passo: quem navega por teclado segue com Enter.
  useEffect(() => {
    if (rotaPronta) botaoPrincipal.current?.focus({ preventScroll: true })
  }, [passo.id, rotaPronta])

  // Escape = pular tudo, como em qualquer janela de ajuda.
  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') aoPularTudo()
    }
    document.addEventListener('keydown', aoTeclar)
    return () => document.removeEventListener('keydown', aoTeclar)
  }, [aoPularTudo])

  /* ---------- foco (buraco no véu) ---------- */
  const foco = caixa
    ? {
        l: Math.max(0, caixa.left - FOLGA),
        t: Math.max(0, caixa.top - FOLGA),
        r: Math.min(janela.w, caixa.left + caixa.width + FOLGA),
        b: Math.min(janela.h, caixa.top + caixa.height + FOLGA),
      }
    : null
  const focoVisivel = foco !== null && foco.r > foco.l && foco.b > foco.t

  const estiloVeu: CSSProperties = focoVisivel
    ? {
        clipPath: `polygon(evenodd, 0 0, 100% 0, 100% 100%, 0 100%, 0 0, ${foco.l}px ${foco.t}px, ${foco.l}px ${foco.b}px, ${foco.r}px ${foco.b}px, ${foco.r}px ${foco.t}px, ${foco.l}px ${foco.t}px)`,
      }
    : {}

  /* ---------- posição do balão ---------- */
  const largura = Math.min(400, janela.w - 24)
  let estiloBalao: CSSProperties = {}
  if (!movel) {
    if (focoVisivel && foco) {
      const abaixo = foco.b + 14
      const acima = foco.t - alturaBalao - 14
      let top: number
      if (abaixo + alturaBalao <= janela.h - 12) top = abaixo
      else if (acima >= 12) top = acima
      else top = Math.max(12, janela.h - alturaBalao - 12)
      const left = Math.min(Math.max(12, foco.l), Math.max(12, janela.w - largura - 12))
      estiloBalao = { top, left, width: largura }
    } else {
      estiloBalao = {
        top: Math.max(12, (janela.h - alturaBalao) / 2),
        left: Math.max(12, (janela.w - largura) / 2),
        width: largura,
      }
    }
  }

  const aguardando = !rotaPronta || (passo.alvo && !alvo && !semAlvo)

  return (
    <div className="tour-camada" data-tutorial-ui role="presentation">
      <div className="tour-veu" style={estiloVeu} />
      {focoVisivel && foco ? (
        <div
          className="tour-foco"
          style={{ top: foco.t, left: foco.l, width: foco.r - foco.l, height: foco.b - foco.t }}
        />
      ) : null}

      {!aguardando ? (
        <div
          ref={balaoRef}
          className={movel ? 'tour-balao tour-balao-movel' : 'tour-balao'}
          style={estiloBalao}
          role="dialog"
          aria-modal="true"
          aria-labelledby="tour-titulo"
          aria-describedby="tour-texto"
        >
          <div className="tour-cabeca">
            <span className="tour-etapa">
              {passo.etapa === 0 ? 'Boas-vindas' : `Etapa ${passo.etapa} de ${TOTAL_DE_ETAPAS_DO_TOUR}`}
              {totalNaEtapa > 1 ? ` · ${numeroNaEtapa}/${totalNaEtapa}` : ''}
            </span>
            <button type="button" className="tour-pular-tudo" onClick={aoPularTudo}>
              Pular tudo
            </button>
          </div>

          <h4 id="tour-titulo" className="tour-titulo">
            {passo.titulo}
          </h4>
          <p id="tour-texto" className="tour-texto">
            {passo.texto}
          </p>

          <div className="tour-pontos" aria-hidden="true">
            {Array.from({ length: TOTAL_DE_ETAPAS_DO_TOUR + 1 }, (_, i) => (
              <i key={i} className={i === passo.etapa ? 'on' : i < passo.etapa ? 'feito' : ''} />
            ))}
          </div>

          <div className="tour-acoes">
            <button type="button" className="btn btn-outline" onClick={aoVoltar} disabled={!podeVoltar}>
              Voltar
            </button>
            {passo.etapa > 0 && !ultimo ? (
              <button type="button" className="btn btn-outline" onClick={aoPularEtapa}>
                Pular esta etapa
              </button>
            ) : null}
            {passo.acaoFinal === 'completar-cadastro' && aoCompletarCadastro ? (
              <>
                <button type="button" className="btn btn-outline" onClick={aoAvancar}>
                  Concluir
                </button>
                <button ref={botaoPrincipal} type="button" className="btn btn-gold" onClick={aoCompletarCadastro}>
                  Completar meu cadastro
                </button>
              </>
            ) : (
              <button ref={botaoPrincipal} type="button" className="btn btn-gold" onClick={aoAvancar}>
                {ultimo ? 'Concluir' : passo.etapa === 0 ? 'Começar' : 'Próximo'}
              </button>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
