/**
 * Cartão de recibo de custódia da grade 1.4 — port de aurea-mvp-teste.html, linhas
 * 1860-1872 (o `coins.map(...)` de `renderNfts`).
 *
 * Sem 'use client' desde 25/10/2026: "Ver recibo" virou <Link>, e o cartão não tem hook nenhum
 * (componente só de marcação — doc 35 §4). No monolito o botão chamava
 * `openNftDetail(session, c.id)`, que guardava a moeda numa global e trocava a
 * view; aqui a moeda é segmento de rota (/recibos/RO-000042). O efeito é o mesmo, mas o certificado passa a ter URL própria —
 * recarregar a página deixa de perder a tela aberta, como acontecia no original.
 *
 * A DECISÃO DE RÓTULO/ETIQUETA MORA AQUI, e não em quem monta a grade, porque é
 * exatamente o trecho que o original calculava dentro do `map`. Manter junto do
 * cartão evita que a lista precise saber de status de recibo.
 */

import Link from 'next/link'
import type { ReactNode } from 'react'

import { COIN } from '@/domain/constants'
import { brl } from '@/domain/money'
import type { Cents, Coin } from '@/domain/types'
import { CoinArt } from '@/components/svg/CoinArt'
import { Selo, type TomDoSelo } from '@/components/ui/Selo'

export interface ReciboCardProps {
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

export function ReciboCard({ coin, valor, listed }: ReciboCardProps): ReactNode {
  // Precedência: "Retirado" > "Bloqueado" > "À venda" > "Em custódia".
  const label =
    coin.recibo.status === 'Extinto'
      ? 'Retirado'
      : coin.recibo.status === 'Bloqueado'
      ? 'Bloqueado'
      : listed
      ? 'À venda'
      : 'Em custódia'
  // Tom do selo pela regra do Brandbook (§9.4): em custódia é sucesso, à venda é destaque (ouro),
  // bloqueado é perigo e retirado sai de cena (neutro).
  const tom: TomDoSelo =
    label === 'Bloqueado' ? 'perigo' : label === 'Em custódia' ? 'sucesso' : label === 'À venda' ? 'ouro' : 'neutro'

  return (
    // Cartão de moeda do Brandbook (§9.3, 25/10/2026): a foto pousa na .ro-vitrine-luz (spot quente e
    // sombra de contato), o nome vem na fonte de título e o valor + selo dividem a linha de baixo.
    <article className="ro-cartao ro-cartao-moeda recibo-card">
      <div className="ro-vitrine-luz recibo-vitrine">
        <div className="recibo-art">
          <CoinArt type={coin.tipoMoeda} />
        </div>
      </div>
      <div>
        {/* O ano só aparece quando NÃO é a moeda negociável: para ela o ano é
            sempre 2012 e repetir viraria ruído. Separador ' · ' na grade — o
            certificado usa espaço simples, e essa diferença é do original. */}
        <h4 className="ro-cartao-moeda__nome recibo-type">
          {coin.tipoMoeda}
          {coin.tipoMoeda !== COIN.name ? ' · ' + coin.ano : ''}
        </h4>
        <div className="recibo-code">{coin.recibo.codigo}</div>
      </div>
      <div className="ro-cartao-moeda__meta">
        <span className="recibo-val">{brl(valor)}</span>
        <Selo tom={tom}>{label}</Selo>
      </div>
      {/* Link de verdade desde 25/10/2026 (era <button> com router.push): abre em nova aba e tem
          endereço. O nome acessível leva o código, porque "Ver recibo" se repete em cada cartão. */}
      <Link className="btn btn-outline recibo-ver" href={`/recibos/${coin.id}`}>
        Ver recibo<span className="sr-only"> {coin.recibo.codigo}</span>
      </Link>
    </article>
  )
}
