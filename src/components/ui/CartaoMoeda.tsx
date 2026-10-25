/**
 * Cartão de moeda (Brandbook §9.3): a peça sob a luz de vitrine, o nome em serifa e uma linha de
 * dados (tipo, valor estimado, situação). Usado na vitrine da landing, na galeria de recibos e no
 * mercado.
 *
 * A imagem é o render em ¾ do catálogo quando ele está aprovado; enquanto estiver pendente, é a
 * FOTO REAL de public/moedas/ (com a inclinação do <MoedaRealista>). A moeda nunca some do cartão
 * e nunca aparece errada — regra do Brandbook §8.1.
 *
 * Os dados ficam fora da imagem e entram por `children`: valor estimado vem do servidor, com a
 * palavra "estimado" ao lado (§11). Server Component; o <MoedaRealista> da recaída é cliente.
 */

import type { ReactNode } from 'react'

import { ATIVOS, FOTO_REAL, RENDER_TRES_QUARTOS, type MoedaNegociavel } from '@/brand/ativos'
import { ImagemDaMarca } from '@/brand/componentes/ImagemDaMarca'
import { MoedaRealista } from '@/components/ui/MoedaRealista'

export function CartaoMoeda({
  moeda,
  nome,
  selo,
  children,
  href,
  prioridade = false,
}: {
  moeda: MoedaNegociavel
  /** Nome da moeda como o catálogo de tipos o chama (não é texto livre da tela). */
  nome: string
  /** Um <Selo> de situação, opcional, no canto da linha de dados. */
  selo?: ReactNode
  /** Linha de dados: ano, valor estimado, quantidade no cofre. */
  children?: ReactNode
  /** Com destino, o cartão inteiro vira link (e ganha o hover de cartão interativo). */
  href?: string
  prioridade?: boolean
}): ReactNode {
  const render = ATIVOS[RENDER_TRES_QUARTOS[moeda]]
  const foto = FOTO_REAL[moeda]

  const imagem =
    render.situacao === 'aprovado' ? (
      <ImagemDaMarca id={RENDER_TRES_QUARTOS[moeda]} sizes="(min-width: 1080px) 360px, 80vw" prioridade={prioridade} alt="" />
    ) : (
      <MoedaRealista src={foto.src} alt="" size={240} priority={prioridade} />
    )

  const conteudo = (
    <>
      <div className="ro-vitrine-luz">{imagem}</div>
      <p className="ro-cartao-moeda__nome">{nome}</p>
      {children || selo ? (
        <div className="ro-cartao-moeda__meta">
          <div className="ro-legenda">{children}</div>
          {selo}
        </div>
      ) : null}
    </>
  )

  // O nome da moeda vai como texto do cartão; a imagem é decorativa (alt="") para o leitor de tela
  // não ouvir o nome duas vezes.
  return href ? (
    <a href={href} className="ro-cartao ro-cartao-interativo ro-cartao-moeda">
      {conteudo}
    </a>
  ) : (
    <article className="ro-cartao ro-cartao-moeda">{conteudo}</article>
  )
}
