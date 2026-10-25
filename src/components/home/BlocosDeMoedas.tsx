'use client'

/**
 * Dois cartões explicativos das moedas negociáveis, abaixo dos indicadores do
 * Início: foto real, história curta, tiragem e os preços da moeda.
 *
 * OS PREÇOS NÃO SÃO CALCULADOS AQUI (21/10/2026): vêm de `destaqueDeMercado`
 * (domain/destaques-de-mercado.ts), a mesma função que a landing usa. A MAIOR
 * OFERTA DE COMPRA fica em destaque — é o que alguém paga agora —, e abaixo dela
 * a média de mercado da plataforma (`medianSellPrice`, a mesma mediana que a
 * conta, os recibos e o certificado usam) e a referência de mercado externo para
 * flor de cunho. Sem oferta nem negociação o cartão diz isso em vez de inventar
 * um número ou mostrar zero.
 *
 * As fotos são de public/moedas/: a da Direitos Humanos é domínio público
 * (Wikimedia Commons) e a da Bandeira é a imagem oficial do Banco Central
 * (bcb.gov.br, Meios de Pagamento > Moedas Comemorativas), recortada em círculo.
 * É fotografia do objeto como foi cunhado, não arte própria.
 *
 * Tiragem e ficha técnica saem de COIN_TYPES para não duplicar número.
 */

import type { ReactNode } from 'react'

import { COIN_TYPES, ROTULO_REFERENCIA_EXTERNA } from '@/domain/constants'
import { destaqueDeMercado } from '@/domain/destaques-de-mercado'
import { brl } from '@/domain/money'
import { useApp } from '@/components/providers/AppProvider'
import { MoedaRealista } from '@/components/ui/MoedaRealista'

interface Bloco {
  tipo: string
  titulo: string
  historia: string
  foto: string
}

const BLOCOS: Bloco[] = [
  {
    tipo: 'Direitos Humanos',
    titulo: 'Moeda dos Direitos Humanos',
    historia:
      'Emitida pelo Banco Central em dezembro de 1998 para os 50 anos da Declaração Universal dos Direitos Humanos. Traz um globo e uma figura humana estilizada e tem a menor tiragem entre as moedas de R$ 1.',
    foto: '/moedas/moeda-direitos-humanos-1998.png',
  },
  {
    tipo: 'Entrega da Bandeira Olímpica',
    titulo: 'Moeda da Entrega da Bandeira',
    historia:
      'Lançada em 2012, marca a passagem da bandeira olímpica de Londres para o Rio de Janeiro, na cerimônia de encerramento dos Jogos. Foi a primeira da série comemorativa que levou aos Jogos Rio 2016.',
    foto: '/moedas/moeda-entrega-da-bandeira-2012.png',
  },
]

export function BlocosDeMoedas(): ReactNode {
  const { state } = useApp()

  return (
    <div className="moeda-blocos">
      {BLOCOS.map((b) => {
        const tipo = COIN_TYPES.find((t) => t.key === b.tipo)
        const d = destaqueDeMercado(state, b.tipo)
        return (
          <section key={b.tipo} className="moeda-bloco">
            <div className="moeda-bloco-foto">
              <MoedaRealista src={b.foto} alt={b.titulo} size={160} interativa />
            </div>
            <div className="moeda-bloco-tx">
              <h3>{b.titulo}</h3>
              <p>{b.historia}</p>
              {tipo && <p className="moeda-bloco-ficha">Tiragem {tipo.tiragem} · Bimetálica 27mm</p>}
              <div className="moeda-bloco-valor moeda-bloco-destaque" data-destaque="maior-oferta-de-compra">
                <span className="lbl">Maior oferta de compra</span>
                <span className={d.maiorOfertaDeCompra === null ? 'val val-vazio' : 'val val-destaque'}>
                  {d.maiorOfertaDeCompra === null ? 'Sem ofertas de compra no momento' : brl(d.maiorOfertaDeCompra)}
                </span>
              </div>
              <dl className="moeda-bloco-refs">
                <div>
                  <dt>Média de mercado</dt>
                  <dd>{d.mediaDeMercado === null ? 'Sem negociações ainda' : brl(d.mediaDeMercado)}</dd>
                </div>
                {d.referenciaExterna ? (
                  <div data-destaque="referencia-externa">
                    <dt>{ROTULO_REFERENCIA_EXTERNA}</dt>
                    <dd>
                      {brl(d.referenciaExterna.valor)}
                      {/* A fonte fica DENTRO do <dd>: filho solto de <dl> que não é dt/dd quebra a lista no leitor de tela (axe). */}
                      <small>
                        {d.referenciaExterna.fonte} · cotado em {d.referenciaExterna.cotadoEm}
                      </small>
                    </dd>
                  </div>
                ) : null}
              </dl>
            </div>
          </section>
        )
      })}
    </div>
  )
}
