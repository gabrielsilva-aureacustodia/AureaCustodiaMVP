'use client'

/**
 * 1.4 MEUS RECIBOS — port de aurea-mvp-teste.html, linhas 1851-1893
 * (`renderNfts`).
 *
 * Client Component de propósito: a grade precisa reagir ao ciclo de
 * sincronização de 10s do AppProvider. Uma moeda vendida em outra aba some da
 * lista sozinha, e uma moeda anunciada troca a etiqueta de "Em custódia" para
 * "À venda" — no monolito era o `render()` disparado pelo startSync que fazia
 * isso; aqui é o próprio React, ao receber o estado novo.
 *
 * O título da tela ('Meus recibos' / 'Recibos digitais de validação e
 * recebimento de custódia.') NÃO está aqui: a Topbar o deriva da rota, ver a
 * nota no topo de components/shell/Topbar.tsx. O original o escrevia à mão em
 * #pageTitle na linha 1855, e dizia 'Meus recibos NFT' — a palavra saiu por
 * decisão do jurídico em 09/09/2026.
 */

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'

import { tiposNegociaveis } from '@/domain/constants'
import { fdate } from '@/domain/dates'
import { medianSellPrice } from '@/domain/market'
import { brl } from '@/domain/money'
import { allCoinsFlat } from '@/domain/selectors'
import type { Cents, Coin } from '@/domain/types'
import { ReciboCard } from '@/components/recibo/ReciboCard'
import { AvisoDebitoCustodia } from '@/components/custody/AvisoDebitoCustodia'
import { ResumoDaCustodia } from '@/components/custody/ResumoDaCustodia'
import { useApp } from '@/components/providers/AppProvider'

export default function RecibosPage(): ReactNode {
  const { state, me, catalogo } = useApp()
  const router = useRouter()

  // Mediana das ofertas abertas nas últimas 24h (domain/market.ts), uma por
  // tipo negociável. É a referência de mercado de cada ativo; as moedas de
  // tipos sem mercado continuam valendo o `valorEstimado` da própria ficha.
  const medPorTipo: Record<string, Cents | null> = {}
  tiposNegociaveis(catalogo).forEach((t) => {
    medPorTipo[t.key] = medianSellPrice(state, t.key)
  })
  const coins = me.coins

  /**
   * PORT FIEL da linha 1858, generalizado para vários ativos. O teste é de
   * VERACIDADE (`med`), não de `!== null`: uma mediana de zero centavos cai no
   * valor de ficha. Na prática não acontece — não há oferta de R$ 0,00 — mas
   * trocar por `med !== null` mudaria o comportamento num canto que ninguém
   * revisitaria.
   */
  const valOf = (c: Coin): Cents => {
    const med = medPorTipo[c.tipoMoeda]
    return med ? med : c.valorEstimado
  }

  const totalVal = coins.reduce<Cents>((s, c) => s + valOf(c), 0)
  const recibosAtivos = coins.filter((c) => c.recibo.status === 'Ativo').length

  /* ---- auditoria de estoque (resumo por tipo) ---- */
  const porTipo = new Map<string, number>()
  allCoinsFlat(state).forEach(({ coin }) => {
    porTipo.set(coin.tipoMoeda, (porTipo.get(coin.tipoMoeda) ?? 0) + 1)
  })
  const linhasAuditoria = [...porTipo.entries()].sort((a, b) => b[1] - a[1])
  const hoje = fdate(Date.now())

  return (
    <div className="cols-rev">
      <div>
        <div className="panel" style={{ marginBottom: 18 }}>
          <h3>
            <svg viewBox="0 0 24 24">
              <path d="M6 3h9l4 4v14H6z" />
              <path d="M9 10h7M9 13.5h7M9 17h4" />
            </svg>
            Moedas em custódia
          </h3>

          {/* A custódia é paga depois de a moeda já estar guardada: sem este aviso,
              o débito só apareceria em Faturas de custódia, tela que o cliente não
              tem motivo para abrir. */}
          <AvisoDebitoCustodia estilo={{ marginTop: 0, marginBottom: 14 }} />
          {/* O estado vazio fica DENTRO da .recibo-grid, como no original (linha
              1879): o `cardsHtml` era ou os cartões, ou o .empty, e os dois
              entravam no mesmo contêiner de grade. */}
          <div className="recibo-grid">
            {coins.length ? (
              coins.map((c) => (
                // A chave é o código do ativo: sequencial, único e estável mesmo
                // quando a moeda troca de dono ou muda de status.
                <ReciboCard
                  key={c.id}
                  coin={c}
                  valor={valOf(c)}
                  listed={state.sellOffers.some((o) => o.coinId === c.id)}
                />
              ))
            ) : (
              <div className="empty">
                Você ainda não tem moedas em custódia. Use &quot;Enviar moeda para custódia&quot;
                para começar.
              </div>
            )}
          </div>
        </div>

        {/* A custódia do cliente fica na mesma coluna do acervo, logo abaixo
            dele: é a tela em que ele olha as moedas guardadas, e é ali que a
            pergunta "quanto isso me custa por mês?" aparece. */}
        <ResumoDaCustodia estilo={{ marginBottom: 18 }} />

        {/* ---------- auditoria de estoque ---------- */}
        <div className="panel">
          <h3>
            <svg viewBox="0 0 24 24">
              <path d="M4 21h16M5 21V10h3v11M10.5 21V10h3v11M16 21V10h3v11M3 9l9-6 9 6z" />
            </svg>
            Auditoria de estoque
          </h3>

          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: 12 }}>
            Auditoria transparente de todas as moedas no nosso sistema, suas e de outros
            usuários (nenhum nome será exposto).
          </p>

          <div className="table-scroll">
            <table className="audit-table">
              <thead>
                <tr>
                  <th>Moeda</th>
                  <th>Quantidade custodiada</th>
                  <th>Status</th>
                  <th>Última auditoria</th>
                </tr>
              </thead>
              <tbody>
                {linhasAuditoria.map(([tipo, qtd]) => (
                  <tr key={tipo}>
                    <td>{tipo}</td>
                    <td>{qtd}</td>
                    <td>
                      <span className="pill g">auditado</span>
                    </td>
                    <td>{hoje}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="note">
            <svg viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 8v5M12 16.5v.5" />
            </svg>
            Estoque auditado periodicamente pelo Real Olímpico.
          </div>

          <button
            className="btn btn-gold"
            type="button"
            style={{ marginTop: 14 }}
            onClick={() => router.push('/recibos/auditoria')}
          >
            Ver auditoria completa
          </button>
        </div>
      </div>

      <div>
        <div className="panel" style={{ marginBottom: '18px' }}>
          <h3>Resumo</h3>
          <div className="summary-row">
            <span className="k">Total em custódia</span>
            <span className="v">{coins.length} moeda(s)</span>
          </div>
          <div className="summary-row">
            <span className="k">Valor estimado</span>
            <span className="v">{brl(totalVal)}</span>
          </div>
          {/* .total é a última linha do bloco: sem borda inferior e com o número
              em dourado. Aqui ela destaca a contagem de recibos, não dinheiro —
              é assim no original. */}
          <div className="summary-row total">
            <span className="k">Recibos ativos</span>
            <span className="v">{recibosAtivos}</span>
          </div>
          {coins.length - recibosAtivos > 0 ? (
            <div className="summary-row" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              <span className="k">Recibos extintos</span>
              <span className="v">{coins.length - recibosAtivos}</span>
            </div>
          ) : null}
          <div style={{ marginTop: '14px' }}>
            <Link
              href="/retirada"
              className="btn btn-outline"
              style={{ width: '100%', padding: '8px', fontSize: '12.5px' }}
            >
              Minhas retiradas físicas ›
            </Link>
          </div>
        </div>

        <div className="panel">
          <div className="note">
            <svg viewBox="0 0 24 24">
              <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />
            </svg>
            Cada recibo de custódia comprova a recepção e guarda da moeda física, com registro na
            plataforma. Segurança, transparência e conformidade em cada etapa.
          </div>
        </div>
      </div>
    </div>
  )
}
