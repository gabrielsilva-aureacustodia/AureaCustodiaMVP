'use client'

/**
 * Espaço de foto da moeda (frente e verso) — port de aurea-mvp-teste.html,
 * `photoSlotHtml` (2045-2053), `onFotoChange` (2054-2060) e `removeFoto` (2061).
 *
 * AS FOTOS NUNCA SAEM DA ABA — E ISSO É DECISÃO DE PRIVACIDADE, NÃO PREGUIÇA
 * --------------------------------------------------------------------------
 * O arquivo escolhido é lido pelo FileReader e vira um dataURL que fica na
 * memória do componente. Nada é enviado ao servidor: `createProtocol` recebe
 * tipo, ano e quantidade, e mais nada. É a decisão registrada na Seção 4.6 do
 * documento técnico — a imagem existe só para o usuário conferir o que
 * fotografou antes de gerar o protocolo, e um ambiente de teste não tem por que
 * acumular fotos de acervo alheio num banco compartilhado por sete contas.
 *
 * A consequência é intencional e precisa continuar assim: recarregar a página
 * perde as fotos. No monolito era idêntico — `sendForm.fotos` era uma variável
 * global de sessão de aba, fora do estado persistido. Se um dia a análise física
 * precisar delas, o caminho é upload para armazenamento privado com URL
 * assinada, nunca dataURL dentro do documento de estado.
 */

import type { ChangeEvent, ReactNode } from 'react'

/** As duas faces exigidas pelo passo 1. */
export type FotoSlot = 'frente' | 'verso'

/** Mapa das duas fotos em memória. `null` = espaço ainda vazio. */
export type Fotos = Record<FotoSlot, string | null>

export interface PhotoSlotProps {
  slot: FotoSlot
  /** Texto que aparece embaixo de 'Adicionar foto': 'Frente' ou 'Verso'. */
  label: string
  /** dataURL da imagem já escolhida, ou null. */
  data: string | null
  onSelect(slot: FotoSlot, dataUrl: string): void
  onRemove(slot: FotoSlot): void
}

export function PhotoSlot({ slot, label, data, onSelect, onRemove }: PhotoSlotProps): ReactNode {
  function aoEscolher(ev: ChangeEvent<HTMLInputElement>): void {
    const file = ev.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      // readAsDataURL sempre produz string; o teste existe porque o tipo de
      // `result` também admite ArrayBuffer (do readAsArrayBuffer) e o modo
      // strict não deixa passar sem estreitar.
      if (typeof reader.result === 'string') onSelect(slot, reader.result)
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
        <img src={data} alt={`Foto da moeda — ${label.toLowerCase()}`} />
        <div className="rm" onClick={() => onRemove(slot)}>
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
      <span>
        Adicionar foto
        <br />
        {label}
      </span>
      {/* O input cobre o espaço inteiro com opacity:0 (wizard.css) — é ele que
          recebe o toque, e o visual todo é do <label>. */}
      <input type="file" accept="image/*" onChange={aoEscolher} />
    </label>
  )
}
