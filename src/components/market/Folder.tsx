'use client'

/**
 * Pasta recolhível das telas de compra e de venda.
 *
 * NÃO É PORT — é componente novo. No monolito só existia um ativo negociável,
 * então a tela de venda podia despejar o inventário inteiro numa lista corrida
 * (buildCoinListHtml, linhas 1483-1501) e a vitrine podia listar todos os lotes
 * em sequência. Com o segundo ativo (Direitos Humanos) e os que vierem, essa
 * lista vira uma parede de moedas em que ninguém acha nada.
 *
 * PURAMENTE APRESENTACIONAL, e por escolha: quem sabe o que está aberto é a
 * página, porque a mesma tela precisa abrir a pasta do tipo que o usuário
 * acabou de escolher no seletor. Guardar `aberta` aqui dentro deixaria os dois
 * controles discordando — o seletor diria "Direitos Humanos" e a pasta aberta
 * continuaria sendo a olímpica.
 *
 * ACESSIBILIDADE: o cabeçalho é <button>, não <div> com onClick. É um controle
 * que abre e fecha conteúdo, então precisa de foco por teclado, Enter/Espaço
 * nativos e `aria-expanded` — sem isso um leitor de tela anuncia "Moedas
 * Olímpicas" e não diz que há algo a expandir. Os 44px de altura mínima são o
 * alvo de toque do projeto.
 */

import type { ReactNode } from 'react'

export interface FolderProps {
  /** Título da pasta — o nome da categoria do catálogo. */
  titulo: string
  /** Linha de apoio: contagem de moedas, de lotes, faixa de preço. */
  resumo: string
  aberta: boolean
  onToggle(): void
  /**
   * true quando esta é a pasta do tipo ativo no seletor. Só muda a moldura —
   * a pasta continua abrindo e fechando igual.
   */
  destacada?: boolean
  children: ReactNode
}

export function Folder({
  titulo,
  resumo,
  aberta,
  onToggle,
  destacada = false,
  children,
}: FolderProps): ReactNode {
  return (
    <div className={`folder${destacada ? ' active' : ''}`}>
      <button
        type="button"
        className="folder-head"
        onClick={onToggle}
        aria-expanded={aberta}
      >
        {/* O chevron gira por CSS (.folder.open .folder-chev), não por troca de
            ícone: um único nó no DOM evita o pulo de layout entre os dois
            desenhos. */}
        <svg className={`folder-chev${aberta ? ' open' : ''}`} viewBox="0 0 24 24" aria-hidden="true">
          <path d="M9 6l6 6-6 6" />
        </svg>

        <svg className="folder-ico" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        </svg>

        <span className="folder-t">
          <span className="folder-name">{titulo}</span>
          <span className="folder-sub">{resumo}</span>
        </span>
      </button>

      {/* Desmontado quando fechado, e não escondido com display:none. A pasta
          fechada pode conter dezenas de moedas; mantê-las no DOM só para não
          serem vistas custa render a cada volta do ciclo de sincronização. */}
      {aberta ? <div className="folder-body">{children}</div> : null}
    </div>
  )
}
