'use client'

/**
 * O maestro do tutorial do painel: decide O QUE mostrar e QUANDO. Irmão de `TutorialProvider`
 * (o do cliente) e dono de menos coisas, de propósito.
 *
 * DUAS COISAS, NENHUMA AUTOMÁTICA POR TELA (decisão do Gabriel, 30/10/2026)
 * -------------------------------------------------------------------------
 *  1. O tour (tela escurecida) abre sozinho UMA vez, na primeira entrada de cada membro.
 *  2. O tutorial da tela só abre pelo botão "Ver tutorial desta página". Uma equipe que abre o painel
 *     todo dia não deve ser interrompida em cada tela nova.
 *
 * O PAPEL MANDA. Tudo sai de `membro.permissoes` (a lista que o servidor já resolveu para o layout):
 * `passosDoTourAdmin` e `tutorialDaPaginaAdmin` devolvem só o que aquele membro alcança, e a página
 * que ele não abre fica sem botão. Isto é conveniência, como o menu: quem recusa de verdade é a página
 * e a Server Action. O tutorial não chama nenhuma ação, não lê dado nenhum e não grava nada além da
 * chave do localStorage (estado de interface, uma por membro).
 *
 * Os desenhos são os do cliente: `TourGuiado` (balão e foco) e `DicasDaPagina` (bolinhas e painel).
 * Os passos do tour apontam para o menu lateral, que existe em toda tela, então o tour não navega:
 * quem o abre numa ficha de cliente o vê ali mesmo. No celular o menu é gaveta, e ela é aberta
 * enquanto o passo é do menu — senão o foco apontaria para fora da tela.
 */

import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

import {
  chaveDoTourAdmin,
  paginaDoTutorialAdmin,
  passosDoTourAdmin,
  totalDeEtapasDoTourAdmin,
  tutorialDaPaginaAdmin,
} from '@/domain/tutorial-admin'
import { useSidebar } from '@/components/shell/Sidebar'
import { DicasDaPagina } from '@/components/tutorial/DicasDaPagina'
import { TourGuiado } from '@/components/tutorial/TourGuiado'
import { acharAlvo, gravarChave, lerChave } from '@/components/tutorial/dom'

import { useAdmin } from './AdminProvider'
import { itemDaRota } from './navegacao'

/** Abaixo disto o menu lateral é gaveta (mesmo ponto de `SidebarProvider`). */
const LARGURA_DA_GAVETA_PX = 1080

export function TutorialAdmin(): ReactNode {
  const { membro } = useAdmin()
  const pathname = usePathname()
  const { setOpen: abrirGaveta } = useSidebar()

  // localStorage só existe no navegador: nada de decidir antes de montar, para o HTML do servidor e o
  // do cliente continuarem iguais (sem aviso de hidratação).
  const [montado, setMontado] = useState(false)
  const [indiceDoTour, setIndiceDoTour] = useState<number | null>(null)
  const [dicasAbertas, setDicasAbertas] = useState(false)

  useEffect(() => setMontado(true), [])

  const permissoes = membro.permissoes
  const passos = useMemo(() => passosDoTourAdmin(permissoes), [permissoes])
  const totalDeEtapas = totalDeEtapasDoTourAdmin(passos)
  const passo = indiceDoTour !== null ? (passos[indiceDoTour] ?? null) : null

  const pagina = paginaDoTutorialAdmin(pathname)
  const item = itemDaRota(pathname)
  const tutorial = useMemo(() => {
    const t = pagina ? tutorialDaPaginaAdmin(pagina, permissoes) : null
    if (!t || !pagina) return t
    // A primeira dica é sempre o "para que serve a tela", com o texto do próprio menu (uma fonte só). Sem
    // ela, uma tela cujas seções ainda não carregaram (ou estão vazias) abriria o painel de dicas sem nenhuma
    // linha. As fichas têm título e texto próprios no conteúdo e não precisam dela.
    if (pagina.startsWith('ficha-')) return t
    return { ...t, dicas: [{ id: 'sobre-a-tela', titulo: item.titulo, texto: item.subtitulo }, ...t.dicas] }
  }, [pagina, permissoes, item])

  /* ---------- 1. tour: abre na primeira entrada do membro ---------- */
  useEffect(() => {
    if (!montado) return
    if (lerChave(chaveDoTourAdmin(membro.email)) === null) setIndiceDoTour(0)
  }, [montado, membro.email])

  const encerrar = useCallback(
    (como: 'concluido' | 'pulado') => {
      gravarChave(chaveDoTourAdmin(membro.email), `${como}:${Date.now()}`)
      setIndiceDoTour(null)
    },
    [membro.email],
  )

  const avancar = useCallback(() => {
    if (indiceDoTour === null) return
    if (indiceDoTour >= passos.length - 1) encerrar('concluido')
    else setIndiceDoTour(indiceDoTour + 1)
  }, [indiceDoTour, passos.length, encerrar])

  const voltar = useCallback(() => {
    if (indiceDoTour !== null && indiceDoTour > 0) setIndiceDoTour(indiceDoTour - 1)
  }, [indiceDoTour])

  const pularEtapa = useCallback(() => {
    if (indiceDoTour === null) return
    const etapaAtual = passos[indiceDoTour]?.etapa ?? 0
    const proximo = passos.findIndex((p, k) => k > indiceDoTour && p.etapa > etapaAtual)
    if (proximo === -1) encerrar('concluido')
    else setIndiceDoTour(proximo)
  }, [indiceDoTour, passos, encerrar])

  const pularTudo = useCallback(() => encerrar('pulado'), [encerrar])

  // O menu rola por dentro (14 itens num ecrã baixo): sem trazer o item para a vista, o foco do tour cairia
  // fora da tela e o balão sairia no centro, sem mostrar nada. O espera cobre a gaveta abrindo no celular.
  useEffect(() => {
    if (!passo?.noMenu || !passo.alvo) return
    const alvo = passo.alvo
    const timer = window.setTimeout(() => acharAlvo(alvo)?.scrollIntoView({ block: 'center' }), 350)
    return () => window.clearTimeout(timer)
  }, [passo])

  // Gaveta do menu: aberta só enquanto o passo aponta para o menu e a tela é estreita; fechada ao sair do tour.
  const noMenu = passo?.noMenu === true
  useEffect(() => {
    if (indiceDoTour === null) return
    abrirGaveta(noMenu && window.innerWidth < LARGURA_DA_GAVETA_PX)
    return () => abrirGaveta(false)
  }, [indiceDoTour, noMenu, abrirGaveta])

  /* ---------- 2. tutorial da tela: só pelo botão ---------- */
  // Trocar de tela fecha o que estava aberto: as bolinhas apontariam para elementos que já saíram.
  useEffect(() => setDicasAbertas(false), [pathname])

  const fecharDicas = useCallback(() => setDicasAbertas(false), [])

  const refazerTour = useCallback(() => {
    setDicasAbertas(false)
    setIndiceDoTour(0)
  }, [])

  const numeroNaEtapa = passo ? passos.filter((p) => p.etapa === passo.etapa).findIndex((p) => p.id === passo.id) + 1 : 1
  const totalNaEtapa = passo ? passos.filter((p) => p.etapa === passo.etapa).length : 1

  return (
    <>
      {montado && passo ? (
        <TourGuiado
          passo={passo}
          totalDeEtapas={totalDeEtapas}
          numeroNaEtapa={numeroNaEtapa}
          totalNaEtapa={totalNaEtapa}
          podeVoltar={indiceDoTour !== null && indiceDoTour > 0}
          ultimo={indiceDoTour === passos.length - 1}
          rotaPronta
          aoAvancar={avancar}
          aoVoltar={voltar}
          aoPularEtapa={pularEtapa}
          aoPularTudo={pularTudo}
        />
      ) : null}

      {montado && !passo && tutorial && dicasAbertas ? (
        <DicasDaPagina titulo={tutorial.titulo} dicas={tutorial.dicas} aoRefazerTour={refazerTour} aoFechar={fecharDicas} />
      ) : null}

      {montado && !passo && tutorial && !dicasAbertas ? (
        <button type="button" className="tutorial-link" data-tutorial-ui onClick={() => setDicasAbertas(true)}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M9.5 9.5a2.5 2.5 0 114 2c-.9.6-1.5 1.1-1.5 2.2M12 17v.5" />
          </svg>
          Ver tutorial desta página
        </button>
      ) : null}
    </>
  )
}
