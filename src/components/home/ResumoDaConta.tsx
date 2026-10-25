'use client'

/**
 * Faixa de abertura do Início (redesenho da Frente 4, 25/10/2026; desenho do Brandbook §9.11 e §12).
 *
 * O Início abria com três números da PLATAFORMA (moedas no mercado, volume, última negociação) e a
 * pessoa só via o próprio saldo no canto da topbar. Os apps de conta que serviram de referência
 * (Nubank, Inter, Mercury — BENCHMARK.md) abrem pelo que é de quem entrou: quanto tem, o que tem
 * guardado e o próximo passo. Este bloco faz isso com o que o AppProvider já entrega — nenhuma busca
 * nova, nenhuma regra nova: são os mesmos números de Minha conta, só que no lugar onde se chega.
 *
 * É a `.ro-faixa` do Brandbook: escura nos dois temas, guilhoché em CSS (0 KB de imagem), saldo em
 * `.ro-valor` com os centavos menores. A foto `cenarios-faixa-abertura-painel` da Frente 2 foi
 * REPROVADA na conferência do Brandbook (moeda inventada, cores trocadas) e por isso não entra aqui.
 *
 * UMA AÇÃO PRIMÁRIA, QUE MUDA COM O MOMENTO DA CONTA: sem moeda guardada, o caminho é mandar a primeira
 * (Envios); com moeda, é o mercado. O resto da navegação continua nos blocos logo abaixo.
 *
 * O aviso de custódia a pagar (AvisoDebitoCustodia) vem logo depois da faixa, fora dela: o aviso usa
 * as cores do tema, e a faixa é escura também no claro.
 */

import Link from 'next/link'
import type { ReactNode } from 'react'

import { brl } from '@/domain/money'
import { AvisoDebitoCustodia } from '@/components/custody/AvisoDebitoCustodia'
import { useApp } from '@/components/providers/AppProvider'

/** "R$ 54.000,00" → ["R$ 54.000", ",00"]: os centavos vão menores no `.ro-valor`. */
function partesDoValor(valor: string): [string, string] {
  const virgula = valor.lastIndexOf(',')
  return virgula < 0 ? [valor, ''] : [valor.slice(0, virgula), valor.slice(virgula)]
}

export function ResumoDaConta(): ReactNode {
  const { state, session, me } = useApp()

  // As mesmas contas de Minha conta (conta/page.tsx): ofertas de venda são registros por moeda, e a
  // ordem de compra conta a quantidade que ainda falta.
  const guardadas = me.coins.length
  const aVenda = state.sellOffers.filter((o) => o.seller === session).length
  const aCompra = state.buyOrders.filter((b) => b.buyer === session).reduce((s, b) => s + b.qty, 0)
  const [inteiro, centavos] = partesDoValor(brl(me.balance))
  const hoje = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <>
      <section className="ro-faixa ro-guilloche inicio-conta" aria-labelledby="inicio-conta-titulo">
        <div className="inicio-conta-cab">
          <div>
            <h2 id="inicio-conta-titulo" className="ro-sobretitulo">
              Sua conta <span suppressHydrationWarning>· {hoje}</span>
            </h2>
            <p className="inicio-saldo-lbl">Saldo disponível</p>
            <p className="ro-valor">
              {inteiro}
              <small>{centavos}</small>
            </p>
          </div>
          {guardadas === 0 ? (
            <Link href="/envios" className="btn btn-gold btn-lg auto inicio-cta">
              Enviar minha primeira moeda
            </Link>
          ) : (
            <Link href="/mercado" className="btn btn-gold btn-lg auto inicio-cta">
              Ver o mercado agora
            </Link>
          )}
        </div>

        <dl className="inicio-numeros">
          <div>
            <dt>Moedas em custódia</dt>
            <dd>{guardadas}</dd>
          </div>
          <div>
            <dt>Moedas à venda</dt>
            <dd>{aVenda}</dd>
          </div>
          <div>
            <dt>Moedas à compra</dt>
            <dd>{aCompra}</dd>
          </div>
        </dl>
      </section>

      <AvisoDebitoCustodia estilo={{ marginTop: 14, marginBottom: 0 }} />
    </>
  )
}
