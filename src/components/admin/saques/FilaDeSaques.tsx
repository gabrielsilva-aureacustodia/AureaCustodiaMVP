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
 * CONFIRMAÇÃO COM O OBJETO (25/10/2026). O `window.confirm` do "Aprovar" virou a confirmação no
 * próprio lugar (`ConfirmarAcao`), e os botões de confirmar dizem valor e cliente: "Confirmar:
 * pagar o saque de R$ 120,00 a Ana Souza". Na fila com vários pedidos, "Confirmar pagamento"
 * repetido não dizia qual linha ia ser paga. "Conferir" e "Reenviar" deixaram de ser dourados:
 * o primário da linha é só o que manda dinheiro (um primário por bloco).
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
import { ConfirmarAcao } from '../ConfirmarAcao'
import { Selo, type Tom } from '../Pecas'
import { data, dataHora, dinheiro } from '../formatos'

function destino(l: LinhaDeSaque): string {
  const d = l.saque.dadosBancarios
  if (d.chavePix) return `Pix ${d.tipoChavePix ?? ''}: ${d.chavePix}`.replace('  ', ' ')
  return [d.banco, d.agencia && `ag. ${d.agencia}`, d.conta && `c. ${d.conta}`].filter(Boolean).join(' · ') || '—'
}

type Painel = { id: string; modo: 'pagar' | 'recusar' } | null

/** Brandbook §9.4: esperando → aviso, no Mercado Pago → neutro, pago → sucesso, falhou → perigo. */
const TOM_DO_SAQUE: Record<keyof typeof SITUACAO_DO_SAQUE, Tom> = { solicitado: 'atencao', em_processamento: 'neutro', pago: 'ok', falhou: 'alerta' }

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

  const linhas = [...dados.fila, ...dados.historico]
  if (linhas.length === 0) {
    return (
      <div className="adm-vazio">
        <b>{vazio}</b>
        Um pedido aparece aqui quando o cliente pede saque: o valor sai do saldo dele na hora e espera a equipe.
      </div>
    )
  }

  return (
    <>
      {podePagar && !dados.envio.ativo && dados.fila.length > 0 ? (
        <div className="note adm-secao">
          <span>
            O envio automático de Pix está desligado{dados.envio.faltando.length ? ` (falta ${dados.envio.faltando.join(', ')})` : ''}. Faça o Pix
            pelo app do banco ou pelo Mercado Pago e use <b>Marcar como pago</b> com o comprovante.
          </span>
        </div>
      ) : null}
      {podePagar && dados.envio.ativo && dados.envio.modo === 'sandbox' ? (
        <div className="note adm-secao">Envio em modo de TESTE (sandbox): nenhum dinheiro real sai.</div>
      ) : null}

      <div className="table-scroll">
        <table className="audit-table adm-tabela-cartoes">
          <caption className="adm-sr">Pedidos de saque{comCliente ? '' : ' desta conta'}: pedido, valor, destino, previsão e situação</caption>
          <thead>
            <tr>
              <th scope="col">{comCliente ? 'Cliente e pedido' : 'Pedido'}</th>
              <th scope="col" className="adm-num">A pagar</th>
              <th scope="col">Destino</th>
              <th scope="col">Previsão</th>
              <th scope="col">Situação</th>
              {podePagar ? <th scope="col">Ações</th> : null}
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
                  {/* Rodada 3: pedido dentro da 1ª coluna — com sete colunas, a de ações (a que importa)
                      ficava fora da tela a 1440 px. */}
                  <td data-rotulo={comCliente ? 'Cliente e pedido' : 'Pedido'}>
                    {comCliente ? (
                      <>
                        <Link href={`/admin/usuarios/${encodeURIComponent(s.userEmail)}`}>{l.nome}</Link>
                        <div className="adm-fraco">{s.userEmail}</div>
                      </>
                    ) : null}
                    <div className="adm-fraco">
                      <span className="adm-mono adm-codigo">{s.id}</span> · {dataHora(s.criadoEm)}
                    </div>
                  </td>
                  <td className="adm-num" data-rotulo="A pagar">
                    {dinheiro(s.valorLiquido)}
                    <div className="adm-fraco">
                      debitado {dinheiro(s.valorTotal)} · tarifa {dinheiro(s.taxa)}
                    </div>
                  </td>
                  <td data-rotulo="Destino">{destino(l)}</td>
                  <td data-rotulo="Previsão">
                    {data(s.previsaoPagamentoEm)}
                    {l.atrasado ? <div className="adm-alerta-texto">! prazo vencido</div> : null}
                  </td>
                  <td data-rotulo="Situação">
                    <Selo tom={TOM_DO_SAQUE[s.status]}>{SITUACAO_DO_SAQUE[s.status]}</Selo>
                    {s.canal ? <div className="adm-fraco">{s.canal === 'mercadopago' ? 'Mercado Pago' : 'pago por fora'}{s.comprovanteRef ? ` · ${s.comprovanteRef}` : ''}</div> : null}
                    {s.detalheGateway ? <div className="adm-fraco">{s.detalheGateway}</div> : null}
                    {s.motivoFalha ? <div className="adm-fraco">Motivo: {s.motivoFalha}</div> : null}
                  </td>
                  {podePagar ? (
                    <td data-rotulo="Ações" className="adm-celula-acoes">
                      {emAberto ? (
                        <div className="adm-acoes-linha">
                          {s.status === 'solicitado' && dados.envio.ativo ? (
                            <ConfirmarAcao
                              rotulo="Aprovar e enviar Pix"
                              objeto={`enviar ${dinheiro(s.valorLiquido)} por Pix a ${l.nome}`}
                              detalhe={
                                <>
                                  Destino: <b>{destino(l)}</b>. O Pix sai da conta do Mercado Pago da empresa e não pode ser desfeito por aqui.
                                </>
                              }
                              aoConfirmar={() => executar(s.id, () => aprovarSaque(s.id))}
                              variante="gold"
                              desabilitado={trabalhando}
                              usoNome="saque:aprovar"
                            />
                          ) : null}
                          {semPayout && dados.envio.ativo ? (
                            <ConfirmarAcao
                              rotulo="Reenviar"
                              objeto={`reenviar ${dinheiro(s.valorLiquido)} por Pix a ${l.nome}`}
                              detalhe={
                                <>
                                  Destino: <b>{destino(l)}</b>. O envio anterior não chegou ao Mercado Pago.
                                </>
                              }
                              aoConfirmar={() => executar(s.id, () => aprovarSaque(s.id))}
                              desabilitado={trabalhando}
                              usoNome="saque:reenviar"
                            />
                          ) : null}
                          {s.status === 'em_processamento' && s.payoutId ? (
                            <button type="button" className="btn btn-outline adm-btn-compacto" disabled={trabalhando} onClick={() => void executar(s.id, () => conferirSaque(s.id))} data-uso="saque:conferir">
                              Conferir no Mercado Pago<span className="adm-sr"> o saque de {l.nome}</span>
                            </button>
                          ) : null}
                          {!(s.status === 'em_processamento' && s.payoutId) ? (
                            <button type="button" className="btn btn-outline adm-btn-compacto" disabled={trabalhando} aria-expanded={aberto?.id === s.id && aberto.modo === 'pagar'} onClick={() => { setAberto({ id: s.id, modo: 'pagar' }); setTexto('') }}>
                              Marcar como pago<span className="adm-sr"> o saque de {l.nome}</span>
                            </button>
                          ) : null}
                          {s.status === 'solicitado' ? (
                            <button type="button" className="btn btn-danger adm-btn-compacto" disabled={trabalhando} aria-expanded={aberto?.id === s.id && aberto.modo === 'recusar'} onClick={() => { setAberto({ id: s.id, modo: 'recusar' }); setTexto('') }}>
                              Recusar<span className="adm-sr"> o saque de {l.nome}</span>
                            </button>
                          ) : null}
                        </div>
                      ) : (
                        <span className="adm-fraco">—</span>
                      )}
                      {aberto?.id === s.id ? (
                        <div className={aberto.modo === 'recusar' ? 'adm-confirmacao adm-perigo' : 'adm-confirmacao'}>
                          <p>
                            {aberto.modo === 'pagar'
                              ? `Use depois de fazer o Pix de ${dinheiro(s.valorLiquido)} pelo app do banco ou do Mercado Pago. O comprovante fica no pedido.`
                              : `O cliente recebe de volta ${dinheiro(s.valorTotal)} (o valor e a tarifa) no saldo, e lê o motivo no e-mail.`}
                          </p>
                          <input
                            className="input tinput"
                            autoComplete="off"
                            spellCheck={aberto.modo === 'recusar'}
                            placeholder={aberto.modo === 'pagar' ? 'Comprovante do Pix (código ou ID)' : 'Motivo da recusa (o cliente vai ler)'}
                            aria-label={aberto.modo === 'pagar' ? 'Comprovante do Pix' : 'Motivo da recusa'}
                            value={texto}
                            onChange={(e) => setTexto(e.target.value)}
                          />
                          <div className="adm-acoes">
                            <button
                              type="button"
                              className={`btn ${aberto.modo === 'recusar' ? 'btn-danger' : 'btn-gold'} adm-btn-compacto`}
                              disabled={trabalhando || texto.trim().length < 3}
                              aria-describedby={texto.trim().length < 3 ? `saque-${s.id}-falta` : undefined}
                              onClick={() => void executar(s.id, () => (aberto.modo === 'pagar' ? marcarSaquePago(s.id, texto) : recusarSaque(s.id, texto)))}
                            >
                              {aberto.modo === 'pagar'
                                ? `Confirmar: pagar o saque de ${dinheiro(s.valorLiquido)} a ${l.nome}`
                                : `Confirmar: recusar e devolver ${dinheiro(s.valorTotal)} a ${l.nome}`}
                            </button>
                            <button type="button" className="btn btn-ghost adm-btn-compacto" onClick={() => setAberto(null)}>
                              Cancelar
                            </button>
                          </div>
                          {texto.trim().length < 3 ? (
                            <small id={`saque-${s.id}-falta`} className="adm-fraco">
                              {aberto.modo === 'pagar' ? 'Escreva o comprovante (3 caracteres ou mais) para liberar.' : 'Escreva o motivo (3 caracteres ou mais) para liberar.'}
                            </small>
                          ) : null}
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
