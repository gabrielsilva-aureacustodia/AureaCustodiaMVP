'use client'

/**
 * Painel "Baixe o app": o passo a passo de instalação, com uma aba para CADA sistema (Android e iPhone).
 *
 * É o único painel do site, aberto pelo aviso flutuante e pelo botão da página inicial (a loja guarda `guia.aberto`).
 * Uma implementação só significa uma armadilha de foco e de teclado só — e deixa conferir as duas versões sem trocar
 * de aparelho: a aba nasce no sistema da pessoa, mas ela pode olhar a outra (para mandar o link a alguém, por exemplo).
 *
 * POR QUE PASSO A PASSO ESCRITO, E NÃO SÓ O BOTÃO NATIVO
 * ------------------------------------------------------
 * O Chrome do Android abre o diálogo de instalação direto (botão "Instalar agora", quando há evento guardado). Mas o
 * evento não dispara em todo celular, nem em toda visita; e o iPhone NÃO TEM diálogo nenhum — lá a instalação é
 * manual, pelo Compartilhar do Safari. Por isso cada aba tem os passos, com o ícone de cada botão como ele aparece
 * na tela da pessoa.
 *
 * ACESSIBILIDADE: `role="dialog"` modal com título e descrição, foco movido para o painel ao abrir e devolvido a quem
 * o abriu ao fechar, Tab preso dentro, Esc fecha, fundo não rola, abas com setas (padrão WAI-ARIA tabs). No celular
 * sobe de baixo como gaveta; de 640px em diante vira cartão centralizado.
 */

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'

import { LOGO_REAL_EMBLEMA } from '@/domain/constants'
import type { AbaDoGuia, Ambiente, Navegador } from '@/lib/pwa/instalacao'

import {
  BarraDoChrome,
  BarraDoSafari,
  IconeAppNaTela,
  IconeBaixar,
  IconeCompartilhar,
  IconeConfirmar,
  IconeCopiar,
  IconeFechar,
  IconeInstalarApp,
  IconeMaisQuadrado,
  IconeMenuPontos,
} from './IconesDoGuia'
import { useInstalacao } from './useInstalacao'

const NOME_DO_NAVEGADOR: Record<Navegador, string> = {
  safari: 'Safari',
  chrome: 'Chrome',
  edge: 'Edge',
  firefox: 'Firefox',
  samsung: 'Samsung Internet',
  opera: 'Opera',
  outro: 'navegador',
}

const SELETOR_FOCAVEL = 'button:not([disabled]):not([tabindex="-1"]), a[href], [tabindex]:not([tabindex="-1"])'

function Passo({
  icone,
  titulo,
  dica,
  ilustracao,
}: {
  icone: ReactNode
  titulo: ReactNode
  dica?: ReactNode
  ilustracao?: ReactNode
}): ReactNode {
  return (
    <li className="pwa-passo">
      <span className="pwa-passo-icone">{icone}</span>
      <div className="pwa-passo-texto">
        <p className="pwa-passo-titulo">{titulo}</p>
        {dica ? <p className="pwa-passo-dica">{dica}</p> : null}
        {ilustracao}
      </div>
    </li>
  )
}

function PassosAndroid({
  ambiente,
  podeInstalarDireto,
  instalando,
  aoInstalar,
}: {
  ambiente: Ambiente
  podeInstalarDireto: boolean
  instalando: boolean
  aoInstalar: () => void
}): ReactNode {
  const naoEhChrome = ambiente.plataforma === 'android' && ambiente.navegador !== 'chrome'
  return (
    <>
      {podeInstalarDireto ? (
        <div className="pwa-direto">
          <button type="button" className="btn btn-gold btn-lg" onClick={aoInstalar} disabled={instalando}>
            <IconeBaixar />
            Instalar agora
          </button>
          <p>Seu navegador abre a instalação na hora. Ou siga os passos abaixo, se preferir.</p>
        </div>
      ) : null}
      <ol className="pwa-passos" role="list">
        <Passo
          icone={<IconeMenuPontos />}
          titulo={
            <>
              Toque no menu <strong>⋮</strong> do navegador
            </>
          }
          dica={
            <>
              Fica no canto superior direito do Chrome. No Samsung Internet, o menu é o <strong>≡</strong>.
            </>
          }
          ilustracao={<BarraDoChrome />}
        />
        <Passo
          icone={<IconeInstalarApp />}
          titulo={
            <>
              Toque em <strong>Instalar app</strong>
            </>
          }
          dica={
            <>
              Se não aparecer, toque em <strong>Adicionar à tela inicial</strong>.
              {naoEhChrome ? ' Em outros navegadores, procure por “Instalar” ou “Adicionar à tela inicial” no menu.' : ''}
            </>
          }
        />
        <Passo
          icone={<IconeConfirmar />}
          titulo={
            <>
              Confirme em <strong>Instalar</strong>
            </>
          }
          dica="O ícone do Real Olímpico vai para a sua tela inicial."
        />
        <Passo
          icone={<IconeAppNaTela />}
          titulo="Abra pelo ícone"
          dica="Dali em diante o app abre em tela cheia e se atualiza sozinho."
        />
      </ol>
    </>
  )
}

function PassosIphone({ ambiente }: { ambiente: Ambiente }): ReactNode {
  const foraDoSafari = ambiente.plataforma === 'ios' && ambiente.navegador !== 'safari' && !ambiente.embutido
  return (
    <>
      {foraDoSafari ? (
        <p className="pwa-nota">
          Você está no {NOME_DO_NAVEGADOR[ambiente.navegador]}. Dá certo pelo botão <strong>Compartilhar</strong> dele, na
          barra de endereço. Se “Adicionar à Tela de Início” não aparecer, abra este endereço no <strong>Safari</strong>.
        </p>
      ) : null}
      <ol className="pwa-passos" role="list">
        <Passo
          icone={<IconeCompartilhar />}
          titulo={
            <>
              Toque em <strong>Compartilhar</strong>
            </>
          }
          dica={
            <>
              O quadrado com a seta para cima, {foraDoSafari ? 'na barra de endereço' : 'na barra do Safari'}. Não achou? Toque
              em <strong>⋯</strong> (Mais).
            </>
          }
          // A barra desenhada é a do Safari: em outro navegador do iPhone ela mostraria uma tela que a pessoa não vê.
          ilustracao={foraDoSafari ? undefined : <BarraDoSafari />}
        />
        <Passo
          icone={<IconeMaisQuadrado />}
          titulo={
            <>
              Toque em <strong>Adicionar à Tela de Início</strong>
            </>
          }
          dica="Role a lista para baixo, se precisar."
        />
        <Passo
          icone={<IconeConfirmar />}
          titulo={
            <>
              Toque em <strong>Adicionar</strong>
            </>
          }
          dica="No canto superior direito da tela."
        />
        <Passo
          icone={<IconeAppNaTela />}
          titulo="Abra pelo ícone do Real Olímpico"
          dica="Ele fica na tela inicial, como qualquer outro app, e se atualiza sozinho."
        />
      </ol>
    </>
  )
}

function GuiaAberto(): ReactNode {
  const { instantaneo, caminho, loja } = useInstalacao()
  const { ambiente, guia } = instantaneo
  const painel = useRef<HTMLDivElement>(null)
  const [copiado, setCopiado] = useState<'nao' | 'sim' | 'erro'>('nao')
  const [instalando, setInstalando] = useState(false)

  // Ao abrir: guarda quem tinha o foco, trava a rolagem do fundo e leva o foco para o painel. Ao fechar, desfaz tudo.
  useEffect(() => {
    const anterior = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const overflowAnterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    painel.current?.focus()
    return () => {
      document.body.style.overflow = overflowAnterior
      anterior?.focus()
    }
  }, [])

  function aoTeclar(e: KeyboardEvent<HTMLDivElement>): void {
    if (e.key === 'Escape') {
      e.stopPropagation()
      loja.fecharGuia()
      return
    }
    if (e.key !== 'Tab') return
    // Foco preso: Tab no último volta ao primeiro, Shift+Tab no primeiro (ou no próprio painel) vai ao último.
    const alvos = Array.from(painel.current?.querySelectorAll<HTMLElement>(SELETOR_FOCAVEL) ?? [])
    const primeiro = alvos[0]
    const ultimo = alvos[alvos.length - 1]
    if (!primeiro || !ultimo) return
    const ativo = document.activeElement
    if (e.shiftKey && (ativo === primeiro || ativo === painel.current)) {
      e.preventDefault()
      ultimo.focus()
    } else if (!e.shiftKey && ativo === ultimo) {
      e.preventDefault()
      primeiro.focus()
    }
  }

  function aoTeclarNasAbas(e: KeyboardEvent<HTMLDivElement>): void {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
    e.preventDefault()
    const proxima: AbaDoGuia = guia.aba === 'android' ? 'ios' : 'android'
    loja.escolherAba(proxima)
    requestAnimationFrame(() => document.getElementById(`pwa-aba-${proxima}`)?.focus())
  }

  async function instalarAgora(): Promise<void> {
    if (instalando) return
    setInstalando(true)
    // Direto do toque: `prompt()` exige o gesto do usuário. Se aceitar, a loja fecha o painel sozinha.
    await loja.instalar()
    setInstalando(false)
  }

  async function copiarEndereco(): Promise<void> {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/`)
      setCopiado('sim')
    } catch {
      setCopiado('erro')
    }
  }

  const noIphone = ambiente.plataforma === 'ios'
  const painelId = `pwa-painel-${guia.aba}`

  return (
    <div
      className="pwa-guia-fundo"
      onClick={(e) => {
        if (e.target === e.currentTarget) loja.fecharGuia()
      }}
    >
      <div
        ref={painel}
        className="pwa-guia"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pwa-guia-titulo"
        aria-describedby="pwa-guia-sub"
        tabIndex={-1}
        onKeyDown={aoTeclar}
      >
        <header className="pwa-guia-topo">
          <Image className="pwa-guia-emblema" src={LOGO_REAL_EMBLEMA} alt="" width={48} height={48} />
          <div className="pwa-guia-titulos">
            <h2 id="pwa-guia-titulo">Baixe o app Real Olímpico</h2>
            <p id="pwa-guia-sub">É leve, abre em tela cheia e se atualiza sozinho.</p>
          </div>
          <button type="button" className="pwa-fechar" aria-label="Fechar instruções" onClick={() => loja.fecharGuia()}>
            <IconeFechar />
          </button>
        </header>

        {caminho === 'abrir-no-navegador' ? (
          <div className="pwa-embutido" role="note">
            <p>
              <strong>Abra no navegador para instalar.</strong> Você está dentro de outro aplicativo (como Instagram,
              Facebook ou TikTok), e ele não consegue instalar o app. Abra este endereço no <strong>Chrome</strong>{' '}
              (Android) ou no <strong>Safari</strong> (iPhone).
            </p>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => void copiarEndereco()}>
              <IconeCopiar />
              Copiar endereço
            </button>
            <span className="pwa-copiado" role="status" aria-live="polite">
              {copiado === 'sim'
                ? 'Endereço copiado. Cole no navegador.'
                : copiado === 'erro'
                  ? 'Não deu para copiar aqui. Use o menu do aplicativo e escolha “Abrir no navegador”.'
                  : ''}
            </span>
          </div>
        ) : null}

        <div className="pwa-abas" role="tablist" aria-label="Escolha o seu aparelho" onKeyDown={aoTeclarNasAbas}>
          {(['android', 'ios'] as const).map((aba) => (
            <button
              key={aba}
              type="button"
              role="tab"
              id={`pwa-aba-${aba}`}
              className="pwa-aba"
              aria-selected={guia.aba === aba}
              aria-controls={guia.aba === aba ? painelId : undefined}
              tabIndex={guia.aba === aba ? 0 : -1}
              onClick={() => loja.escolherAba(aba)}
            >
              {aba === 'android' ? 'Android' : 'iPhone'}
            </button>
          ))}
        </div>

        <div role="tabpanel" id={painelId} aria-labelledby={`pwa-aba-${guia.aba}`}>
          {guia.aba === 'android' ? (
            <PassosAndroid
              ambiente={ambiente}
              podeInstalarDireto={caminho === 'nativo'}
              instalando={instalando}
              aoInstalar={() => void instalarAgora()}
            />
          ) : (
            <PassosIphone ambiente={ambiente} />
          )}
        </div>

        <footer className="pwa-guia-pe">
          {/* Dentro de outro aplicativo (Instagram, etc.) não dá para ter instalado nada: não há o que confirmar. */}
          {guia.aba === 'ios' && noIphone && caminho !== 'instalado' && caminho !== 'abrir-no-navegador' ? (
            <button type="button" className="btn btn-gold" onClick={() => loja.marcarJaAdicionei()}>
              Já adicionei ao meu iPhone
            </button>
          ) : null}
          <button type="button" className="btn btn-ghost" onClick={() => loja.fecharGuia()}>
            Fechar
          </button>
        </footer>
      </div>
    </div>
  )
}

export function GuiaDeInstalacao(): ReactNode {
  const { instantaneo } = useInstalacao()
  // Montado só aberto: o efeito de foco e de rolagem trava e destrava junto, sem estado preso entre aberturas.
  if (!instantaneo.guia.aberto) return null
  return <GuiaAberto />
}
