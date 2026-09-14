'use client'

/**
 * Espaço de foto do item — port de aurea-mvp-teste.html, `photoSlotHtml`
 * (2045-2053), `onFotoChange` (2054-2060) e `removeFoto` (2061).
 *
 * UMA FOTO SÓ (14/09/2026). O monolito pedia duas, frente e verso. Passou a ser
 * uma foto do item, sem face obrigatória: quem conclui a análise física é a
 * bancada de validação, e a foto do envio serve apenas para a pessoa conferir o
 * que está mandando antes de gerar o protocolo.
 *
 * A FOTO NUNCA SAI DA ABA — E ISSO É DECISÃO DE PRIVACIDADE, NÃO PREGUIÇA
 * -----------------------------------------------------------------------
 * O arquivo escolhido é lido pelo FileReader e vira um dataURL que fica na
 * memória do componente. Nada é enviado ao servidor: `createProtocol` recebe
 * tipo, ano e quantidade, e mais nada. É a decisão registrada na Seção 4.6 do
 * documento técnico — a imagem existe só para conferência, e um ambiente de
 * teste não tem por que acumular fotos de acervo alheio num banco compartilhado.
 *
 * A consequência é intencional: recarregar a página perde a foto. No monolito era
 * idêntico — `sendForm.fotos` era uma variável de sessão de aba, fora do estado
 * persistido. Se um dia a análise física precisar dela, o caminho é upload para
 * armazenamento privado com URL assinada, nunca dataURL dentro do estado.
 */

import type { ChangeEvent, ReactNode } from 'react'

export interface PhotoSlotProps {
  /** dataURL da imagem já escolhida, ou null. */
  data: string | null
  onSelect(dataUrl: string): void
  onRemove(): void
}

export function PhotoSlot({ data, onSelect, onRemove }: PhotoSlotProps): ReactNode {
  function aoEscolher(ev: ChangeEvent<HTMLInputElement>): void {
    const file = ev.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      // readAsDataURL sempre produz string; o teste existe porque o tipo de
      // `result` também admite ArrayBuffer (do readAsArrayBuffer) e o modo
      // strict não deixa passar sem estreitar.
      if (typeof reader.result === 'string') onSelect(reader.result)
    }
    reader.readAsDataURL(file)
  }

  // Com foto o espaço deixa de ser <label> e vira <div>: o clique passa a
  // pertencer ao botão de remover, e não a um seletor de arquivo invisível.
  if (data) {
    return (
      <div className="photo-slot">
        {/* <img> puro, e não next/image: a origem é um dataURL em memória, que o
            otimizador de imagens do Next não consegue processar. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={data} alt="Foto do item" />
        <div className="rm" onClick={onRemove}>
          ✕
        </div>
      </div>
    )
  }

  return (
    <label className="photo-slot">
      <svg viewBox="0 0 24 24">
        <rect x="4" y="6" width="16" height="13" rx="2" />
        <circle cx="12" cy="12.5" r="3" />
        <path d="M9 6V4h6v2" />
      </svg>
      <span>Adicionar foto do item</span>
      {/* O input cobre o espaço inteiro com opacity:0 (wizard.css) — é ele que
          recebe o toque, e o visual todo é do <label>. */}
      <input type="file" accept="image/*" onChange={aoEscolher} />
    </label>
  )
}
