'use client'

/**
 * Lista de escolha das moedas a anunciar — evolução de buildCoinListHtml
 * (aurea-mvp-teste.html, linhas 1483-1501).
 *
 * O QUE MUDOU EM RELAÇÃO AO PORT ORIGINAL, E POR QUÊ
 * -------------------------------------------------
 * O monolito desenhava uma lista corrida com TODAS as moedas do único tipo
 * negociável. Com 15 ou 21 moedas na conta já era uma parede; com o segundo
 * ativo (Direitos Humanos) e os que vierem, deixa de ser navegável.
 *
 * Agora as moedas vêm agrupadas em PASTAS por categoria do catálogo, e dentro
 * de cada pasta por tipo. A pasta do tipo ativo abre sozinha; as outras ficam
 * fechadas e mostram só a contagem. Nada foi escondido — o que mudou é que a
 * tela deixou de exigir rolagem para responder "quantas eu tenho de cada uma".
 *
 * O QUE NÃO MUDOU
 * ---------------
 * Continua PURAMENTE APRESENTACIONAL: quem decide o que é "disponível", o que
 * já está anunciado, o que está selecionado e qual pasta está aberta é a tela
 * 1.2, que tem o estado em mãos. Duas fontes para a mesma resposta fariam a
 * lista discordar do contador de quantidade ao lado dela.
 *
 * E as moedas já anunciadas continuam aparecendo apagadas (.listed) e sem
 * clique, exatamente como no original: sumir com elas esconderia do dono o
 * motivo de a moeda não estar disponível.
 */

import type { KeyboardEvent, ReactNode } from 'react'

import { coinTypeInfo } from '@/domain/constants'
import type { Coin } from '@/domain/types'
import { Folder } from '@/components/market/Folder'
import { CoinArt } from '@/components/svg/CoinArt'

export interface CoinPickerProps {
  /** Moedas negociáveis do usuário, na ordem do inventário. */
  moedas: Coin[]
  /** Ids que já possuem oferta de venda aberta — vindos de state.sellOffers. */
  anunciadas: ReadonlySet<string>
  /** Ids marcados agora. Array e não Set: é o mesmo `selectedCoins` do original. */
  selecionadas: string[]
  /** Tipo escolhido no seletor. Só moedas dele podem ser marcadas. */
  tipoAtivo: string
  /** Categorias abertas agora. A tela controla — ver a nota do topo. */
  abertas: ReadonlySet<string>
  onToggleFolder(categoria: string): void
  onToggle(coinId: string): void
}

export function CoinPicker({
  moedas,
  anunciadas,
  selecionadas,
  tipoAtivo,
  abertas,
  onToggleFolder,
  onToggle,
}: CoinPickerProps): ReactNode {
  // Texto herdado da linha 1486, generalizado: o original nomeava a única moeda
  // negociável que existia ("Entrega da Bandeira Olímpica"); agora são duas, e
  // citar só uma delas mandaria o usuário procurar a moeda errada.
  if (!moedas.length) {
    return (
      <div className="empty">
        Você ainda não possui moedas negociáveis em custódia nesta conta de teste. Envie uma moeda em
        &quot;Envios&quot; para poder anunciá-la aqui.
      </div>
    )
  }

  /*
   * Agrupamento em dois níveis: categoria -> tipo -> moedas.
   *
   * Map, e não objeto literal, porque a ordem de inserção é garantida e o nome
   * da categoria é texto livre do catálogo — chaves numéricas de objeto seriam
   * reordenadas pelo motor, e 'Rio 2016 – Estádio' tem caracteres que não
   * combinam com acesso por propriedade.
   */
  const porCategoria = new Map<string, Map<string, Coin[]>>()
  moedas.forEach((c) => {
    const cat = coinTypeInfo(c.tipoMoeda).categoria
    const tipos = porCategoria.get(cat) ?? new Map<string, Coin[]>()
    const lista = tipos.get(c.tipoMoeda) ?? []
    lista.push(c)
    tipos.set(c.tipoMoeda, lista)
    porCategoria.set(cat, tipos)
  })

  return (
    <>
      {[...porCategoria.entries()].map(([categoria, tipos]) => {
        const todas = [...tipos.values()].flat()
        const livres = todas.filter((c) => !anunciadas.has(c.id)).length
        const temTipoAtivo = tipos.has(tipoAtivo)

        return (
          <Folder
            key={categoria}
            titulo={categoria}
            resumo={`${todas.length} moeda(s) · ${livres} disponível(is)`}
            aberta={abertas.has(categoria)}
            destacada={temTipoAtivo}
            onToggle={() => onToggleFolder(categoria)}
          >
            {[...tipos.entries()].map(([tipo, lista]) => (
              <div key={tipo}>
                {/* O subtítulo do tipo só aparece quando a pasta tem mais de um
                    — com um só, ele repetiria o nome da própria pasta. */}
                {tipos.size > 1 ? <div className="folder-sub-head">{tipo}</div> : null}

                {lista.map((c) => {
                  const listed = anunciadas.has(c.id)
                  const sel = selecionadas.includes(c.id)
                  // Moeda de outro tipo não entra na seleção: um anúncio tem um
                  // preço unitário só, e o servidor recusa lote misto. Bloquear
                  // aqui é o que evita o usuário montar a seleção para depois
                  // levar uma recusa que ele não tinha como prever.
                  const outroTipo = c.tipoMoeda !== tipoAtivo
                  const inerte = listed || outroTipo

                  return (
                    <div
                      key={c.id}
                      className={`sell-coin ${sel ? 'selected' : ''} ${inerte ? 'listed' : ''}`}
                      onClick={inerte ? undefined : () => onToggle(c.id)}
                      onKeyDown={
                        inerte
                          ? undefined
                          : (e: KeyboardEvent<HTMLDivElement>) => {
                              // O original só respondia a clique. Enter e espaço
                              // são o mínimo para a lista ser operável sem mouse.
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault()
                                onToggle(c.id)
                              }
                            }
                      }
                      role="checkbox"
                      aria-checked={sel}
                      aria-disabled={inerte || undefined}
                      tabIndex={inerte ? undefined : 0}
                    >
                      {/* O ✓ vem do texto, não de pseudo-elemento: .check é só a
                          caixinha, e é .sell-coin.selected que a pinta. */}
                      <div className="check">{inerte ? '' : sel ? '✓' : ''}</div>
                      <CoinArt type={c.tipoMoeda} />
                      <div>
                        <div className="c-name">{c.tipoMoeda}</div>
                        <div className="c-meta">
                          Código {c.id} · Entrada {c.entrada}
                        </div>
                        {listed ? (
                          <span className="badge-gold">JÁ ANUNCIADA</span>
                        ) : outroTipo ? (
                          <span className="badge-gold">OUTRO TIPO SELECIONADO</span>
                        ) : (
                          <span className="badge-green">✓ Em custódia verificada</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
          </Folder>
        )
      })}
    </>
  )
}
