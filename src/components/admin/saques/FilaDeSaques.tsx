'use client'

/**
 * A fila de saques — a mesma tela no painel inicial, no Financeiro, na página própria e na ficha do
 * cliente (14/10/2026).
 *
 * O QUE CADA BOTÃO FAZ
 *  - "Aprovar e enviar Pix": manda o valor líquido para a chave cadastrada pelo Mercado Pago (só
 *    aparece com o envio automático ligado). Pede confirmação mostrando valor e chave, porque é
 *    dinheiro saindo.
 *  - "Conferir": pergunta ao Mercado Pago se o Pix já foi creditado.
 *  - "Marcar como pago": a equipe fez o Pix por fora e registra o comprovante.
 *  - "Recusar": devolve o valor ao saldo do cliente; o motivo vai no e-mail dele.
 *
 * ESCONDER BOTÃO NÃO PROTEGE NADA. `podePagar` só decide o que aparece; cada Server Action confere
 * `saques.pagar` por conta própria.
 */

import Link from 'next/link'
import { useState } from 'react'
import type { ReactNode } from 'react'

import { SITUACAO_DO_SAQUE } from '@/domain/saques'
import { aprovarSaque, conferirSaque, marcarSaquePago, recusarSaque } from '@/server/actions/admin/saques'
import type { DadosDaFilaDeSaques, LinhaDeSaque } from '@/server/admin/saques'

import { useAdmin } from '../AdminProvider'
import { data, dataHora, dinheiro } from '../formatos'

function destino(l: LinhaDeSaque): string {
  const d = l.saque.dadosBancarios
  if (d.chavePix) return `Pix ${d.tipoChavePix ?? ''}: ${d.chavePix}`.replace('  ', ' ')
  return [d.banco, d.agencia && `ag. ${d.agencia}`, d.conta && `c. ${d.conta}`].filter(Boolean).join(' · ') || '—'
}

type Painel = { id: string; modo: 'pagar' | 'recusar' } | null

export function FilaDeSaques({
  dados,
  podePagar,
  comCliente = true,
  vazio = 'Nenhum saque esperando.',
}: {
  dados: DadosDaFilaDeSaques
  podePagar: boolean
  /** Na ficha do cliente a coluna do nome é redundante. */
  comCliente?: boolean
  vazio?: string
}): ReactNode {
  const { run } = useAdmin()
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [aberto, setAberto] = useState<Painel>(null)
  const [texto, setTexto] = useState('')

  async function executar(id: string, acao: () => Promise<{ ok: boolean }>): Promise<void> {
    setOcupado(id)
    const r = await run(acao)
    setOcupado(null)
    if (r.ok) {
      setAberto(null)
      setTexto('')
    }
  }

  function aprovar(l: LinhaDeSaque): void {
    const ok = window.confirm(
      `Enviar ${dinheiro(l.saque.valorLiquido)} pelo Mercado Pago para ${l.nome}?\n\n${destino(l)}\n\nO Pix sai da conta do Mercado Pago da empresa e não pode ser desfeito por aqui.`,
    )
    if (ok) void executar(l.saque.id, () => aprovarSaque(l.saque.id))
  }

  const linhas = [...dados.fila, ...dados.historico]
  if (linhas.length === 0) return <p className="adm-fraco">{vazio}</p>

  return (
    <>
      {podePagar && !dados.envio.ativo && dados.fila.length > 0 ? (
        <div className="note adm-secao">
          O envio automático de Pix está desligado{dados.envio.faltando.length ? ` (falta ${dados.envio.faltando.join(', ')})` : ''}. Faça o Pix
          pelo app do banco ou pelo Mercado Pago e use <b>Marcar como pago</b> com o comprovante.
        </div>
      ) : null}
      {podePagar && dados.envio.ativo && dados.envio.modo === 'sandbox' ? (
        <div className="note adm-secao">Envio em modo de TESTE (sandbox): nenhum dinheiro real sai.</div>
      ) : null}

      <div className="table-scroll">
        <table className="audit-table">
          <thead>
            <tr>
              {comCliente ? <th>Cliente</th> : null}
              <th>Pedido</th>
              <th className="adm-num">A pagar</th>
              <th>Destino</th>
              <th>Previsão</th>
              <th>Situação</th>
              {podePagar ? <th>Ações</th> : null}
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => {
              const s = l.saque
              const emAberto = s.status === 'solicitado' || s.status === 'em_processamento'
              const trabalhando = ocupado === s.id
              const semPayout = s.status === 'em_processamento' && !s.payoutId
              return (
                <tr key={s.id}>
                  {comCliente ? (
                    <td>
                      <Link href={`/admin/usuarios/${encodeURIComponent(s.userEmail)}`}>{l.nome}</Link>
                      <div className="adm-fraco">{s.userEmail}</div>
                    </td>
                  ) : null}
                  <td>
                    <span className="adm-mono">{s.id}</span>
                    <div className="adm-fraco">{dataHora(s.criadoEm)}</div>
                  </td>
                  <td className="adm-num">
                    {dinheiro(s.valorLiquido)}
                    <div className="adm-fraco">
                      debitado {dinheiro(s.valorTotal)} · tarifa {dinheiro(s.taxa)}
                    </div>
                  </td>
                  <td>{destino(l)}</td>
                  <td>
                    {data(s.previsaoPagamentoEm)}
                    {l.atrasado ? <div className="adm-fraco" style={{ color: 'var(--red)' }}>prazo vencido</div> : null}
                  </td>
                  <td>
                    {SITUACAO_DO_SAQUE[s.status]}
                    {s.canal ? <div className="adm-fraco">{s.canal === 'mercadopago' ? 'Mercado Pago' : 'pago por fora'}{s.comprovanteRef ? ` · ${s.comprovanteRef}` : ''}</div> : null}
                    {s.detalheGateway ? <div className="adm-fraco">{s.detalheGateway}</div> : null}
                    {s.motivoFalha ? <div className="adm-fraco">Motivo: {s.motivoFalha}</div> : null}
                  </td>
                  {podePagar ? (
                    <td>
                      {emAberto ? (
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {s.status === 'solicitado' && dados.envio.ativo ? (
                            <button type="button" className="btn btn-gold adm-btn-compacto" disabled={trabalhando} onClick={() => aprovar(l)} data-uso="saque:aprovar">
                              Aprovar e enviar Pix
                            </button>
                          ) : null}
                          {semPayout && dados.envio.ativo ? (
                            <button type="button" className="btn btn-outline adm-btn-compacto" disabled={trabalhando} onClick={() => aprovar(l)} data-uso="saque:reenviar">
                              Reenviar
                            </button>
                          ) : null}
                          {s.status === 'em_processamento' && s.payoutId ? (
                            <button type="button" className="btn btn-gold adm-btn-compacto" disabled={trabalhando} onClick={() => void executar(s.id, () => conferirSaque(s.id))} data-uso="saque:conferir">
                              Conferir
                            </button>
                          ) : null}
                          {!(s.status === 'em_processamento' && s.payoutId) ? (
                            <button type="button" className="btn btn-outline adm-btn-compacto" disabled={trabalhando} onClick={() => { setAberto({ id: s.id, modo: 'pagar' }); setTexto('') }}>
                              Marcar como pago
                            </button>
                          ) : null}
                          {s.status === 'solicitado' ? (
                            <button type="button" className="btn btn-outline adm-btn-compacto" disabled={trabalhando} onClick={() => { setAberto({ id: s.id, modo: 'recusar' }); setTexto('') }}>
                              Recusar
                            </button>
                          ) : null}
                        </div>
                      ) : (
                        <span className="adm-fraco">—</span>
                      )}
                      {aberto?.id === s.id ? (
                        <div style={{ marginTop: 8 }}>
                          <input
                            className="input"
                            placeholder={aberto.modo === 'pagar' ? 'Comprovante do Pix (código ou ID)' : 'Motivo da recusa (o cliente vai ler)'}
                            aria-label={aberto.modo === 'pagar' ? 'Comprovante do Pix' : 'Motivo da recusa'}
                            value={texto}
                            onChange={(e) => setTexto(e.target.value)}
                          />
                          <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                            <button
                              type="button"
                              className="btn btn-gold adm-btn-compacto"
                              disabled={trabalhando || texto.trim().length < 3}
                              onClick={() => void executar(s.id, () => (aberto.modo === 'pagar' ? marcarSaquePago(s.id, texto) : recusarSaque(s.id, texto)))}
                            >
                              {aberto.modo === 'pagar' ? 'Confirmar pagamento' : 'Confirmar recusa e estorno'}
                            </button>
                            <button type="button" className="btn btn-outline adm-btn-compacto" onClick={() => setAberto(null)}>
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </td>
                  ) : null}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}
