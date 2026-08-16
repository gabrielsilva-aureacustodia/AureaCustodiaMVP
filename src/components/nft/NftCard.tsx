'use client'

/**
 * Cartão de recibo NFT da grade 1.4 — port de aurea-mvp-teste.html, linhas
 * 1860-1872 (o `coins.map(...)` de `renderNfts`).
 *
 * É 'use client' porque o botão "Ver recibo" navega. No monolito ele chamava
 * `openNftDetail(session, c.id)`, que guardava a moeda numa global e trocava a
 * view; aqui a moeda vira segmento de rota (/recibos/RO-000042) e quem navega é
 * o router. O efeito é o mesmo, mas o certificado passa a ter URL própria —
 * recarregar a página deixa de perder a tela aberta, como acontecia no original.
 *
 * A DECISÃO DE RÓTULO/ETIQUETA MORA AQUI, e não em quem monta a grade, porque é
 * exatamente o trecho que o original calculava dentro do `map`. Manter junto do
 * cartão evita que a lista precise saber de status de NFT.
 */

import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'

import { COIN } from '@/domain/constants'
import { brl } from '@/domain/money'
import type { Cents, Coin } from '@/domain/types'
import { CoinArt } from '@/components/svg/CoinArt'

export interface NftCardProps {
  coin: Coin
  /**
   * Valor já resolvido por quem chama. A regra do original (mediana de 24h para
   * a moeda negociável, valor de ficha para as demais) vale igual no cartão e no
   * total do resumo — calcular duas vezes abriria espaço para as duas contas
   * divergirem.
   */
  valor: Cents
  /** true quando existe oferta de venda aberta para esta moeda. */
  listed: boolean
}

export function NftCard({ coin, valor, listed }: NftCardProps): ReactNode {
  const router = useRouter()

  // Precedência do original (linha 1862): "Retirado" ganha de "À venda", que
  // ganha de "Em custódia". Um recibo extinto não é mais negociável, então nem
  // se pergunta se está anunciado.
  const label = coin.nft.status === 'Extinto' ? 'Retirado' : listed ? 'À venda' : 'Em custódia'
  const emCustodia = label === 'Em custódia'
  const badgeCls = emCustodia ? 'badge-green' : 'badge-gold'

  return (
    <div className="nft-card">
      {/* .nft-art tem 96px e a .coin-svg lá dentro, 64px — a arte NÃO preenche o
          quadro. É assim no monolito (nft.css linha 12 x market.css linha 32) e
          a folga é o que centraliza o disco no cartão. */}
      <div className="nft-art">
        <CoinArt type={coin.tipoMoeda} />
      </div>
      <div className="nft-code">{coin.nft.codigo}</div>
      {/* O ano só aparece quando NÃO é a moeda negociável: para ela o ano é
          sempre 2012 e repetir viraria ruído. Separador ' · ' na grade — o
          certificado usa espaço simples, e essa diferença é do original. */}
      <div className="nft-type">
        {coin.tipoMoeda}
        {coin.tipoMoeda !== COIN.name ? ' · ' + coin.ano : ''}
      </div>
      <span className={badgeCls}>{emCustodia ? `✓ ${label}` : label}</span>
      <div className="nft-val">{brl(valor)}</div>
      {/* Os quatro valores do `style` inline vêm literalmente da linha 1871:
          o botão da grade é menor que o .btn padrão e ocupa a largura do cartão. */}
      <button
        className="btn btn-outline"
        type="button"
        style={{ width: '100%', padding: '8px', fontSize: '12.5px', marginTop: '8px' }}
        onClick={() => router.push(`/recibos/${coin.id}`)}
      >
        Ver recibo
      </button>
    </div>
  )
}
