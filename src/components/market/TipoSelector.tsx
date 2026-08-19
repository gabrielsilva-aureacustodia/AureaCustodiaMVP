'use client'

/**
 * Escolha do tipo de moeda em que se está operando — compra ou venda.
 *
 * NÃO É PORT. No monolito a pergunta não existia porque a resposta era sempre a
 * mesma: "Entrega da Bandeira Olímpica" era o único ativo negociável, e a
 * interface inteira falava dele no singular. Com dois ativos, a tela precisa
 * perguntar antes, senão o preço unitário digitado não tem a que se referir.
 *
 * O QUE ESTE COMPONENTE NÃO FAZ
 * -----------------------------
 * Não decide nada de negócio. A lista vem pronta de quem chama, e a validação
 * de verdade — o tipo é negociável? o usuário tem essa moeda? — roda no
 * servidor, dentro das server actions. Aqui é só um seletor.
 *
 * <fieldset>/<legend> com <input type="radio"> em vez de botões: são opções
 * mutuamente exclusivas de um formulário, e o rádio nativo já entrega navegação
 * por setas, agrupamento anunciado pelo leitor de tela e o estado marcado sem
 * uma linha de ARIA escrita à mão. O visual de "pílula" é do CSS.
 */

import type { ReactNode } from 'react'

import type { CoinType } from '@/domain/types'

export interface TipoSelectorProps {
  /** Rótulo do grupo — vira o <legend>. */
  titulo: string
  /** Tipos oferecidos, na ordem do catálogo. */
  tipos: readonly CoinType[]
  /** Chave marcada agora. */
  valor: string
  onChange(tipo: string): void
  /**
   * Texto opcional por tipo, exibido abaixo do nome: quantas moedas o usuário
   * tem daquele tipo, quantos lotes existem à venda. Chave = CoinType.key.
   */
  detalhePorTipo?: Record<string, string>
  /**
   * Nome do grupo de rádios. Precisa ser único NA PÁGINA: a tela de mercado tem
   * dois seletores (o do painel de indicadores e o do formulário de oferta) e,
   * com o mesmo `name`, marcar um desmarcaria o outro.
   */
  name: string
}

export function TipoSelector({
  titulo,
  tipos,
  valor,
  onChange,
  detalhePorTipo,
  name,
}: TipoSelectorProps): ReactNode {
  if (!tipos.length) return null

  return (
    <fieldset className="tipo-sel">
      <legend className="field-lbl">{titulo}</legend>

      {tipos.map((t) => {
        const marcado = t.key === valor
        const detalhe = detalhePorTipo ? detalhePorTipo[t.key] : undefined

        return (
          <label key={t.key} className={`tipo-opt${marcado ? ' on' : ''}`}>
            <input
              type="radio"
              name={name}
              value={t.key}
              checked={marcado}
              onChange={() => onChange(t.key)}
            />
            <span className="tipo-txt">
              <span className="tipo-nome">{t.key}</span>
              {/* A ficha técnica só aparece na opção marcada: repeti-la em todas
                  devolveria à tela o mesmo paredão de texto que as pastas vieram
                  resolver. */}
              <span className="tipo-meta">{marcado ? t.detail : (detalhe ?? '')}</span>
            </span>
          </label>
        )
      })}
    </fieldset>
  )
}
