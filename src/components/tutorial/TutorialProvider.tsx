'use client'

/**
 * O maestro do tutorial: decide O QUE mostrar e QUANDO, e guarda o que a pessoa já viu.
 *
 * TRÊS COISAS, UMA DE CADA VEZ
 * ----------------------------
 *  1. O tour guiado (tela escurecida), na primeira vez que a conta abre a plataforma.
 *  2. O tutorial da página (sem escurecer), na primeira vez que cada tela abre — e sempre
 *     disponível depois pelo botão "Ver tutorial desta página".
 *  3. O tutorial contextual, quando aparece uma função que só existe depois de uma ação (a
 *     custódia a pagar, que só surge depois de a moeda ser aceita).
 *
 * Nunca duas ao mesmo tempo: o tour tem prioridade, depois o que a pessoa pediu, depois o
 * automático. Um tutorial por cima do outro seria justamente o barulho que o recurso quer evitar.
 *
 * O EXEMPLO DE CUSTÓDIA
 * ---------------------
 * Na etapa de custódia o tour precisa mostrar uma fatura que a conta não tem. Ela é exposta por
 * `useTutorial().exemplo` e as telas (`AvisoDebitoCustodia`, `ResumoDaCustodia`) a somam ao que
 * desenham. Não passa por `AppState`, `run()` nem Server Action — por isso não grava nada, não
 * existe para mais ninguém e some no mesmo instante em que o passo muda ou o tour fecha.
 *
 * ONDE MORA O PROGRESSO
 * ---------------------
 * localStorage, uma chave por conta e por tela (ver `@/domain/tutorial`). Sem tabela, sem
 * migration: é estado de interface. Quem trocar de aparelho vê o tutorial de novo — aceito.
 */

import { usePathname, useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

import {
  chaveContextual,
  chaveDaPagina,
  chaveDoTour,
  faturaDeExemplo,
  paginaDoTutorial,
  passosDoTour,
  tutorialDaPagina,
  tutoriaisContextuais,
} from '@/domain/tutorial'
import type { Dica } from '@/domain/tutorial'
import { temCadastroCompleto } from '@/domain/cadastro'
import { ModalCadastro } from '@/components/account/ModalCadastro'
import { useApp } from '@/components/providers/AppProvider'
import { DicasDaPagina } from '@/components/tutorial/DicasDaPagina'
import { TourGuiado } from '@/components/tutorial/TourGuiado'
import { Ctx } from '@/components/tutorial/contexto'
import type { TutorialCtx } from '@/components/tutorial/contexto'
import { acharAlvo, apagarChave, gravarChave, lerChave } from '@/components/tutorial/dom'
import { useModal } from '@/components/ui/Modal'

export { useTutorial } from '@/components/tutorial/contexto'

/** O que está aberto na camada de dicas. */
interface DicasAbertas {
  titulo: string
  dicas: Dica[]
  /** 'pagina' mostra o link para refazer o tour; 'contexto' não. */
  origem: 'pagina' | 'contexto'
}

/** Espera depois de a rota abrir antes do tutorial automático: a tela carrega por partes. */
const ESPERA_AUTOMATICO_MS = 1100
/** De quanto em quanto tempo se procura um gatilho de tutorial contextual. */
const VARREDURA_CONTEXTUAL_MS = 2000

export function TutorialProvider({ children }: { children: ReactNode }): ReactNode {
  const { session, me, taxas } = useApp()
  const pathname = usePathname()
  const router = useRouter()
  const modal = useModal()
  const pagina = paginaDoTutorial(pathname)

  // localStorage só existe no navegador: nada de decidir antes de montar, para o HTML do
  // servidor e o do cliente continuarem iguais (sem aviso de hidratação).
  const [montado, setMontado] = useState(false)
  const [indiceDoTour, setIndiceDoTour] = useState<number | null>(null)
  const [dicas, setDicas] = useState<DicasAbertas | null>(null)

  useEffect(() => setMontado(true), [])

  const passos = useMemo(
    () => passosDoTour({ taxas, temMoedas: me.coins.length > 0, cadastroCompleto: temCadastroCompleto(me) }),
    [taxas, me],
  )
  const passo = indiceDoTour !== null ? (passos[indiceDoTour] ?? null) : null

  /* ---------- 1. tour: abre na primeira vez da conta ---------- */
  useEffect(() => {
    if (!montado) return
    if (lerChave(chaveDoTour(session)) === null) setIndiceDoTour(0)
  }, [montado, session])

  const encerrarTour = useCallback(
    (como: 'concluido' | 'pulado') => {
      gravarChave(chaveDoTour(session), `${como}:${Date.now()}`)
      // A tela em que a pessoa terminou não deve receber, no mesmo instante, o tutorial dela.
      const atual = paginaDoTutorial(window.location.pathname)
      if (atual) gravarChave(chaveDaPagina(session, atual), String(Date.now()))
      setIndiceDoTour(null)
    },
    [session],
  )

  // Cada passo manda a pessoa para a tela dele e marca a tela como já explicada.
  useEffect(() => {
    if (!passo?.rota) return
    gravarChave(chaveDaPagina(session, passo.rota), String(Date.now()))
    if (paginaDoTutorial(pathname) !== passo.rota) router.push(passo.rota)
  }, [passo, pathname, router, session])

  const avancar = useCallback(() => {
    if (indiceDoTour === null) return
    if (indiceDoTour >= passos.length - 1) encerrarTour('concluido')
    else setIndiceDoTour(indiceDoTour + 1)
  }, [indiceDoTour, passos.length, encerrarTour])

  const voltar = useCallback(() => {
    if (indiceDoTour !== null && indiceDoTour > 0) setIndiceDoTour(indiceDoTour - 1)
  }, [indiceDoTour])

  const pularEtapa = useCallback(() => {
    if (indiceDoTour === null) return
    const etapaAtual = passos[indiceDoTour]?.etapa ?? 0
    const proximo = passos.findIndex((p, k) => k > indiceDoTour && p.etapa > etapaAtual)
    if (proximo === -1) encerrarTour('concluido')
    else setIndiceDoTour(proximo)
  }, [indiceDoTour, passos, encerrarTour])

  // Último balão: fecha o tour e abre o formulário de cadastro na hora, sem a pessoa procurar o botão.
  const completarCadastro = useCallback(() => {
    encerrarTour('concluido')
    modal.open(<ModalCadastro motivo="configuracoes" />)
  }, [encerrarTour, modal])

  const pularTudo = useCallback(() => encerrarTour('pulado'), [encerrarTour])

  const refazerTour = useCallback(() => {
    apagarChave(chaveDoTour(session))
    setDicas(null)
    setIndiceDoTour(0)
  }, [session])

  /* ---------- 2. tutorial da página: automático na primeira visita ---------- */
  useEffect(() => {
    // Trocar de tela fecha o que estava aberto: as bolinhas apontariam para elementos que já saíram.
    setDicas(null)
  }, [pathname])

  useEffect(() => {
    if (!montado || indiceDoTour !== null || !pagina) return
    if (lerChave(chaveDaPagina(session, pagina)) !== null) return
    const timer = window.setTimeout(() => {
      gravarChave(chaveDaPagina(session, pagina), String(Date.now()))
      const t = tutorialDaPagina(pagina, taxas)
      setDicas((aberto) => aberto ?? { titulo: t.titulo, dicas: t.dicas, origem: 'pagina' })
    }, ESPERA_AUTOMATICO_MS)
    return () => window.clearTimeout(timer)
  }, [montado, indiceDoTour, pagina, session, taxas])

  const abrirDaPagina = useCallback(() => {
    if (!pagina) return
    const t = tutorialDaPagina(pagina, taxas)
    setDicas({ titulo: t.titulo, dicas: t.dicas, origem: 'pagina' })
  }, [pagina, taxas])

  /* ---------- 3. tutorial contextual: abre quando a função aparece na tela ---------- */
  useEffect(() => {
    if (!montado || indiceDoTour !== null || dicas) return
    const definicoes = tutoriaisContextuais(taxas)
    const varrer = (): void => {
      for (const def of definicoes) {
        if (lerChave(chaveContextual(session, def.id)) !== null) continue
        if (!acharAlvo(def.gatilho)) continue
        gravarChave(chaveContextual(session, def.id), String(Date.now()))
        setDicas({ titulo: def.titulo, dicas: def.dicas, origem: 'contexto' })
        return
      }
    }
    const timer = window.setInterval(varrer, VARREDURA_CONTEXTUAL_MS)
    return () => window.clearInterval(timer)
  }, [montado, indiceDoTour, dicas, session, taxas])

  /* ---------- exemplo de custódia (só dentro do tour) ---------- */
  const exemploAtivo = passo?.exemploDeCustodia === true
  const exemplo = useMemo(
    () => (exemploAtivo ? faturaDeExemplo(session, taxas) : null),
    [exemploAtivo, session, taxas],
  )
  const valor = useMemo<TutorialCtx>(() => ({ exemplo }), [exemplo])

  /* ---------- desenho do passo do tour ---------- */
  let numeroNaEtapa = 1
  let totalNaEtapa = 1
  if (passo) {
    const daEtapa = passos.filter((p) => p.etapa === passo.etapa)
    totalNaEtapa = daEtapa.length
    numeroNaEtapa = daEtapa.findIndex((p) => p.id === passo.id) + 1
  }

  return (
    <Ctx.Provider value={valor}>
      {children}

      {montado && passo ? (
        <TourGuiado
          passo={passo}
          numeroNaEtapa={numeroNaEtapa}
          totalNaEtapa={totalNaEtapa}
          podeVoltar={indiceDoTour !== null && indiceDoTour > 0}
          ultimo={indiceDoTour === passos.length - 1}
          rotaPronta={passo.rota === null || pagina === passo.rota}
          aoAvancar={avancar}
          aoVoltar={voltar}
          aoPularEtapa={pularEtapa}
          aoPularTudo={pularTudo}
          aoCompletarCadastro={completarCadastro}
        />
      ) : null}

      {montado && !passo && dicas ? (
        <DicasDaPagina
          titulo={dicas.titulo}
          dicas={dicas.dicas}
          aoRefazerTour={dicas.origem === 'pagina' ? refazerTour : undefined}
          aoFechar={() => setDicas(null)}
        />
      ) : null}

      {montado && !passo && !dicas && pagina ? (
        <button type="button" className="tutorial-link" data-tutorial-ui onClick={abrirDaPagina}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M9.5 9.5a2.5 2.5 0 114 2c-.9.6-1.5 1.1-1.5 2.2M12 17v.5" />
          </svg>
          Ver tutorial desta página
        </button>
      ) : null}
    </Ctx.Provider>
  )
}
