'use client'

/**
 * Minha conta › Minha custódia — a página de detalhes do serviço de guarda.
 *
 * O QUE ELA RESPONDE, E POR QUE FALTAVA (25/09/2026)
 * --------------------------------------------------
 * "Não temos uma seção onde o usuário pode facilmente ver tudo nos seus planos
 * de custódia." Antes desta tela, a custódia do cliente estava repartida entre
 * o aviso de débito (que some quando está tudo pago), a aba de Faturas (uma
 * tabela de cobranças, sem a conta do mês) e nada mais. Faltavam as três
 * perguntas: quanto custa por mês, quando vence a próxima, e o que já paguei.
 *
 * O extrato é a lista de faturas PAGAS, com data, forma e quantas moedas cada
 * uma cobriu. É o comprovante que o cliente procura quando quer conferir o
 * histórico — e a origem de cada fatura está escrita em português, porque a
 * pergunta que ele faz olhando o extrato é "por que fui cobrado isto aqui?".
 *
 * CANCELAR O PLANO NÃO ENCERRA A GUARDA, e isso está dito na tela em vez de
 * escondido num termo. A moeda continua no armazém; o que para é a cobrança
 * automática no cartão. Quem quer encerrar a custódia de verdade pede a
 * retirada física — o caminho está no próprio aviso.
 */

import Link from 'next/link'
import { useState, type ReactNode } from 'react'

import { resumoDaCustodia, rotuloDaOrigem } from '@/domain/custodia-do-cliente'
import { fdate } from '@/domain/dates'
import { brl } from '@/domain/money'
import type { PlanoCustodia } from '@/domain/types'
import { useApp } from '@/components/providers/AppProvider'
import { cancelarMinhaAssinaturaCustodia } from '@/server/actions/plano-custodia'

const FORMA: Record<string, string> = {
  saldo: 'Saldo em conta',
  pix: 'Pix',
  cartao: 'Cartão de crédito',
}

/**
 * O cartão de um plano, com o botão de cancelar.
 *
 * A confirmação é no próprio lugar, sem modal: o primeiro clique troca o rótulo
 * e explica o que vai acontecer, o segundo executa. Modal empurraria o aviso de
 * "a guarda continua" para uma caixa que a pessoa fecha no automático.
 */
function CartaoDoPlano({ plano }: { plano: PlanoCustodia }): ReactNode {
  const { run } = useApp()
  const [confirmando, setConfirmando] = useState(false)
  const [ocupado, setOcupado] = useState(false)

  const ativo = plano.status === 'vigente' || plano.status === 'aguardando_pagamento'

  return (
    <div className="panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 12 }}>
        <div>
          <h4 style={{ margin: 0, fontSize: 16 }}>Plano Mensal de Custódia</h4>
          <div style={{ fontSize: 12, color: 'var(--gold)', marginTop: 2 }}>
            {plano.id} · Envio {plano.protocoloEnvio}
          </div>
        </div>
        <span
          style={{
            padding: '3px 8px',
            borderRadius: 12,
            fontSize: 11,
            fontWeight: 700,
            whiteSpace: 'nowrap',
            background:
              plano.status === 'vigente'
                ? 'rgba(26, 127, 55, 0.2)'
                : plano.status === 'aguardando_pagamento'
                  ? 'rgba(212, 175, 55, 0.2)'
                  : 'var(--input-bg)',
            color:
              plano.status === 'vigente'
                ? '#3fb950'
                : plano.status === 'aguardando_pagamento'
                  ? 'var(--gold)'
                  : 'var(--text-muted)',
          }}
        >
          {plano.status === 'vigente'
            ? 'Vigente'
            : plano.status === 'aguardando_pagamento'
              ? 'Aguardando pagamento'
              : plano.status === 'encerrado'
                ? 'Encerrado'
                : 'Cancelado'}
        </span>
      </div>

      <div className="summary-box" style={{ marginBottom: 12 }}>
        <div className="sr">
          <span className="k">Moedas cobertas</span>
          <span className="v">
            {plano.moedaIds.length > 0
              ? `${plano.moedaIds.length} — ${plano.moedaIds.join(', ')}`
              : 'Aguardando validação física'}
          </span>
        </div>
        <div className="sr">
          <span className="k">Valor</span>
          <span className="v">{brl(plano.valorTotalCents)} / mês</span>
        </div>
        <div className="sr">
          <span className="k">Início da vigência</span>
          <span className="v">{plano.inicioCompetencia}</span>
        </div>
        <div className="sr">
          <span className="k">Pago até</span>
          <span className="v">{plano.pagoAteCompetencia ?? 'Aguardando pagamento'}</span>
        </div>
        <div className="sr">
          <span className="k">Cobrança automática no cartão</span>
          <span className="v">{plano.assinaturaId ? 'Ativa' : 'Não'}</span>
        </div>
        {plano.estornadoCents > 0 && (
          <div className="sr">
            <span className="k">Estorno por moedas recusadas</span>
            <span className="v" style={{ color: '#3fb950' }}>{brl(plano.estornadoCents)}</span>
          </div>
        )}
      </div>

      {ativo &&
        (confirmando ? (
          <div>
            <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 10 }}>
              Cancelar encerra a cobrança automática deste plano. <b>Suas moedas continuam na
              custódia</b> e a guarda continua sendo cobrada mês a mês, por fatura, pelo mesmo
              preço. Para encerrar a guarda, peça a{' '}
              <Link href="/retirada" style={{ color: 'var(--gold)', textDecoration: 'underline' }}>
                retirada física
              </Link>{' '}
              das moedas.
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-outline"
                style={{ minHeight: 44 }}
                disabled={ocupado}
                onClick={() => setConfirmando(false)}
              >
                Manter plano
              </button>
              <button
                type="button"
                className="btn btn-gold"
                style={{ minHeight: 44 }}
                disabled={ocupado}
                onClick={async () => {
                  setOcupado(true)
                  try {
                    const r = await run(() => cancelarMinhaAssinaturaCustodia(plano.id))
                    if (r.ok) setConfirmando(false)
                  } finally {
                    setOcupado(false)
                  }
                }}
              >
                {ocupado ? 'Cancelando…' : 'Confirmar cancelamento'}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="btn btn-outline"
            style={{ width: '100%', minHeight: 44 }}
            onClick={() => setConfirmando(true)}
          >
            Cancelar assinatura deste plano
          </button>
        ))}
    </div>
  )
}

export default function MinhaCustodiaPage(): ReactNode {
  const { state, session, taxas } = useApp()
  const r = resumoDaCustodia(state, session, taxas.custodiaMensalPorMoeda)

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <Link
          href="/conta"
          className="back-link"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: 44 }}
        >
          ← Voltar para Minha conta
        </Link>
      </div>

      {/* ---------------- o mês corrente ---------------- */}
      <div className="panel" style={{ marginBottom: 18 }}>
        <h3>
          <svg viewBox="0 0 24 24">
            <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />
            <path d="M9 12l2 2 4-4" />
          </svg>
          Resumo da custódia
        </h3>

        <div className="summary-box">
          <div className="sr">
            <span className="k">Moedas sob guarda</span>
            <span className="v">{r.moedasGuardadas}</span>
          </div>
          <div className="sr">
            <span className="k">Preço por moeda</span>
            <span className="v">{brl(r.porMoedaCents)} / mês</span>
          </div>
          <div className="sr">
            <span className="k">Mensalidade do acervo</span>
            <span className="v">{brl(r.mensalidadeCents)} / mês</span>
          </div>
          <div className="sr">
            <span className="k">Competência atual</span>
            <span className="v">{r.competencia}</span>
          </div>
          <div className="sr">
            <span className="k">Próximo pagamento</span>
            <span className="v">
              {r.proximoVencimento
                ? `${fdate(r.proximoVencimento)} — ${brl(r.emAbertoCents)}`
                : `${r.proximaCompetencia} — ${brl(r.mensalidadeCents)} (estimado)`}
            </span>
          </div>
          <div className="sr">
            <span className="k">Já pago em custódia</span>
            <span className="v">{brl(r.totalPagoCents)}</span>
          </div>
        </div>

        {r.emAberto.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <Link
              href="/conta/faturas"
              className="btn btn-gold"
              style={{ width: '100%', minHeight: 44, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
            >
              Pagar {brl(r.emAbertoCents)} em aberto
            </Link>
          </div>
        )}

        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 12, marginBottom: 0 }}>
          A mensalidade acompanha o acervo: cada moeda guardada custa {brl(r.porMoedaCents)} por
          mês, sem prazo mínimo. Moeda vendida ou retirada deixa de ser cobrada a partir da
          competência seguinte.
        </p>
      </div>

      {/* ---------------- planos ---------------- */}
      <div style={{ marginBottom: 18 }}>
        <h3 style={{ marginBottom: 12 }}>Planos de custódia</h3>
        {r.planosAtivos.length === 0 && r.planosEncerrados.length === 0 ? (
          <div className="panel">
            <div className="empty">Você não tem plano de custódia contratado.</div>
            <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 10, marginBottom: 0 }}>
              Suas moedas continuam guardadas e cobradas mês a mês pela tarifa de{' '}
              {brl(r.porMoedaCents)} por moeda. O plano é contratado durante o envio de novas
              moedas para a custódia.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
            {[...r.planosAtivos, ...r.planosEncerrados].map((p) => (
              <CartaoDoPlano key={p.id} plano={p} />
            ))}
          </div>
        )}
      </div>

      {/* ---------------- extrato ---------------- */}
      <div className="panel">
        <h3>
          <svg viewBox="0 0 24 24">
            <path d="M6 3h9l4 4v14H6z" />
            <path d="M9 10h7M9 13.5h7M9 17h4" />
          </svg>
          Extrato de pagamentos da custódia
        </h3>

        {r.pagas.length === 0 ? (
          <div className="empty">Nenhum pagamento de custódia registrado até agora.</div>
        ) : (
          <div className="table-scroll">
            <table className="audit-table">
              <thead>
                <tr>
                  <th>Pago em</th>
                  <th>Competência</th>
                  <th>Referente a</th>
                  <th>Moedas</th>
                  <th>Forma</th>
                  <th style={{ textAlign: 'right' }}>Valor</th>
                </tr>
              </thead>
              <tbody>
                {r.pagas.map((f) => (
                  <tr key={f.id}>
                    <td>{fdate(f.dataPagamento ?? f.dataEmissao)}</td>
                    <td>{f.competencia}</td>
                    <td>{rotuloDaOrigem(f.origem)}</td>
                    <td>{f.quantidadeMoedas}</td>
                    <td>{FORMA[f.formaPagamento ?? 'saldo'] ?? f.formaPagamento}</td>
                    <td style={{ textAlign: 'right' }}>{brl(f.valorCents)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={5} style={{ fontWeight: 700 }}>
                    Total pago
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>{brl(r.totalPagoCents)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {r.emAberto.length > 0 && (
          <>
            <h4 style={{ marginTop: 20, marginBottom: 10, fontSize: 14 }}>Em aberto</h4>
            <div className="table-scroll">
              <table className="audit-table">
                <thead>
                  <tr>
                    <th>Vence em</th>
                    <th>Competência</th>
                    <th>Referente a</th>
                    <th>Moedas</th>
                    <th style={{ textAlign: 'right' }}>Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {r.emAberto.map((f) => (
                    <tr key={f.id}>
                      <td style={{ color: f.dataVencimento < Date.now() ? '#d9383a' : undefined }}>
                        {fdate(f.dataVencimento)}
                      </td>
                      <td>{f.competencia}</td>
                      <td>{rotuloDaOrigem(f.origem)}</td>
                      <td>{f.quantidadeMoedas}</td>
                      <td style={{ textAlign: 'right' }}>{brl(f.valorCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </>
  )
}
