'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'

import { fdate } from '@/domain/dates'
import { brl } from '@/domain/money'
import type { Retirada } from '@/domain/types'
import { useApp } from '@/components/providers/AppProvider'
import { obterMinhasRetiradas } from '@/server/actions/custody'

export default function RetiradasPage(): ReactNode {
  const { session } = useApp()
  const [retiradas, setRetiradas] = useState<Retirada[]>([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    let ativo = true
    void obterMinhasRetiradas().then((res) => {
      if (ativo) {
        if (res.ok && res.data) {
          setRetiradas(res.data)
        }
        setCarregando(false)
      }
    })
    return () => {
      ativo = false
    }
  }, [session])

  const total = retiradas.length
  const emAndamento = retiradas.filter((r) => r.status !== 'entregue' && r.status !== 'cancelada').length
  const concluidas = retiradas.filter((r) => r.status === 'entregue').length

  return (
    <div className="cols-rev">
      <div className="panel">
        <h3>
          <svg viewBox="0 0 24 24">
            <path d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
          </svg>
          Minhas retiradas físicas
        </h3>

        {carregando ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Carregando histórico de retiradas...
          </div>
        ) : retiradas.length === 0 ? (
          <div className="empty">
            Você ainda não solicitou a retirada de nenhuma moeda física da custódia.
            <br />
            Para pedir a saída de uma moeda, acesse{' '}
            <Link href="/recibos" style={{ color: 'var(--gold)', fontWeight: 600 }}>
              Meus recibos
            </Link>{' '}
            e clique em &quot;Solicitar retirada&quot;.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {retiradas.map((r) => (
              <div
                key={r.id}
                style={{
                  border: '1px solid var(--line-soft)',
                  borderRadius: '11px',
                  padding: '18px 20px',
                  background: 'var(--card)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '12px',
                    flexWrap: 'wrap',
                    gap: '8px',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-strong)' }}>
                      Retirada {r.id}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Solicitada em {fdate(r.solicitadoEm)} · Recibo extinto:{' '}
                      <Link
                        href={`/recibos/${r.coinId}`}
                        style={{ color: 'var(--gold)', fontWeight: 600 }}
                      >
                        {r.reciboCodigo}
                      </Link>
                    </div>
                  </div>
                  <span className={`badge-retirada badge-${r.status}`}>
                    {r.status}
                  </span>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: '12px',
                    padding: '12px 14px',
                    background: 'var(--bg-panel)',
                    borderRadius: '8px',
                    marginBottom: '12px',
                    fontSize: '13px',
                  }}
                >
                  <div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '11.5px' }}>Modalidade</div>
                    <div style={{ fontWeight: 600 }}>
                      {r.modalidade === 'segura' ? 'Transporte Blindado' : 'Correios (AR)'}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '11.5px' }}>Taxa Paga</div>
                    <div style={{ fontWeight: 600 }}>{brl(r.valorTaxaCents)}</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '11.5px' }}>
                      Limite para postar (30 dias)
                    </div>
                    <div style={{ fontWeight: 600, color: 'var(--gold)' }}>
                      {fdate(r.dataLimiteD30)}
                    </div>
                  </div>
                  {r.codigoRastreio ? (
                    <div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '11.5px' }}>Código de Rastreio</div>
                      <div style={{ fontWeight: 700, fontFamily: 'monospace', color: 'var(--green)' }}>
                        {r.codigoRastreio}
                      </div>
                    </div>
                  ) : null}
                </div>

                <div style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
                  <strong>Destinatário:</strong> {r.endereco.nome} ({r.endereco.cpfOuCnpj}) —{' '}
                  {r.endereco.logradouro}, {r.endereco.numero}
                  {r.endereco.complemento ? ` (${r.endereco.complemento})` : ''} - {r.endereco.bairro},{' '}
                  {r.endereco.cidade}/{r.endereco.uf} - CEP {r.endereco.cep}
                </div>

                <div style={{ marginTop: '12px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <Link
                    href={`/recibos/${r.coinId}`}
                    className="btn btn-outline"
                    style={{
                      padding: '6px 12px',
                      fontSize: '12px',
                      minHeight: '44px',
                      display: 'inline-flex',
                      alignItems: 'center',
                    }}
                  >
                    Ver recibo extinto
                  </Link>
                  <a
                    href={`/api/retiradas/etiqueta/${r.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-outline"
                    style={{
                      padding: '6px 12px',
                      fontSize: '12px',
                      minHeight: '44px',
                      display: 'inline-flex',
                      alignItems: 'center',
                    }}
                  >
                    🏷️ Imprimir etiqueta Correios
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="panel" style={{ marginBottom: '18px' }}>
          <h3>Resumo de saídas</h3>
          <div className="summary-row">
            <span className="k">Total solicitadas</span>
            <span className="v">{total}</span>
          </div>
          <div className="summary-row">
            <span className="k">Em andamento</span>
            <span className="v">{emAndamento}</span>
          </div>
          <div className="summary-row total">
            <span className="k">Entregues</span>
            <span className="v">{concluidas}</span>
          </div>
        </div>

        <div className="panel">
          <div className="note">
            <svg viewBox="0 0 24 24">
              <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />
            </svg>
            Ao solicitar a retirada física, o recibo de custódia é extinto imediatamente e a moeda deixa
            o acervo negociável. A Áurea tem até 30 dias corridos para preparar e postar; a
            entrega depende do prazo dos Correios, que corre por fora e tem rastreamento oficial.
          </div>
        </div>
      </div>
    </div>
  )
}
