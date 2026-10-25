/**
 * Estado vazio ilustrado (Brandbook §9.8): "Você ainda não tem moedas na
 * custódia", "Nenhuma oferta para este tipo". Diz o que falta e oferece o
 * próximo passo — tela vazia sem saída é onde a pessoa desiste.
 *
 * A arte vem do catálogo (`ilustracao`, ver src/brand/ativos.ts → ILUSTRACOES)
 * e é decorativa (alt=""), porque o título já diz tudo. Quando a ilustração tem
 * versão para fundo escuro, as duas vão no HTML e o CSS mostra a do tema
 * (o tema é o data-theme do <body>, que media query nenhuma enxerga).
 * <img> simples: SVG não ganha nada com o otimizador do next/image.
 * Server Component.
 */

import type { ReactNode } from 'react'

import { ILUSTRACOES, type IdDaIlustracao } from '@/brand/ativos'

export function EstadoVazio({
  titulo,
  children,
  ilustracao,
  arte,
  acao,
}: {
  titulo: string
  children?: ReactNode
  /** Ilustração do catálogo — prefira esta. */
  ilustracao?: IdDaIlustracao
  /** Caminho avulso de um SVG, para o que ainda não está no catálogo. */
  arte?: string
  /** Botão ou link do próximo passo. */
  acao?: ReactNode
}): ReactNode {
  const doCatalogo = ilustracao ? ILUSTRACOES[ilustracao] : undefined
  const src = doCatalogo?.src ?? arte
  const srcEscuro = doCatalogo?.srcEscuro

  return (
    <div className="ro-vazio">
      {/* eslint-disable @next/next/no-img-element -- SVG decorativo, sem ganho no otimizador */}
      {src ? (
        <img
          className={srcEscuro ? 'ro-vazio__arte ro-so-claro' : 'ro-vazio__arte'}
          src={src}
          alt=""
          width={160}
          height={120}
          loading="lazy"
        />
      ) : null}
      {srcEscuro ? (
        <img className="ro-vazio__arte ro-so-escuro" src={srcEscuro} alt="" width={160} height={120} loading="lazy" />
      ) : null}
      {/* eslint-enable @next/next/no-img-element */}
      <p className="ro-vazio__titulo">{titulo}</p>
      {children ? <div className="ro-vazio__texto">{children}</div> : null}
      {acao}
    </div>
  )
}
