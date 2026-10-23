'use client'

/**
 * A fila das NFS-e (23/10/2026): toda comissão e toda custódia paga, com a nota que gerou ou o motivo
 * de não ter gerado.
 *
 * O QUE CADA BOTÃO FAZ
 *  - "Enviar fila agora": manda à Sefin o que está pendente, sem esperar o cron diário.
 *  - "Reprocessar" (linha) / "Reprocessar todas as recusadas": devolve à fila notas rejeitadas ou com
 *    erro — por exemplo, depois que o cliente completou o endereço — e envia.
 *  - "XML": baixa o XML autorizado, que é o documento fiscal oficial.
 *
 * ESCONDER BOTÃO NÃO PROTEGE NADA. `podeEmitir` só decide o que aparece; cada Server Action confere
 * `resultados.nfse` por conta própria.
 */

import Link from 'next/link'
import { useState } from 'react'
import type { ReactNode } from 'react'

import { ROTULO_DO_SERVICO } from '@/domain/nfse/codigos'
import { baixarXmlNfse, enviarFilaDeNotas, reprocessarNotas } from '@/server/actions/admin/fiscal'
import type { DadosFiscais, LinhaFiscal } from '@/server/admin/fiscal'
import type { StatusNfse } from '@/server/db/repositories/nfse'

import { useAdmin } from '../AdminProvider'
import { Cartao } from '../Blocos'
import { dataHora, dinheiro, numero } from '../formatos'

const ROTULO_STATUS: Record<StatusNfse, string> = {
  pendente: 'Na fila',
  processando: 'Enviando',
  autorizada: 'Autorizada',
  rejeitada: 'Recusada',
  erro: 'Erro de envio',
  cancelada: 'Cancelada',
}

function competencia(c: string): string {
  const [ano, mes, dia] = c.split('-')
  return `${dia}/${mes}/${ano}`
}

function situacao(l: LinhaFiscal): ReactNode {
  const e = l.emissao
  if (e.status === 'autorizada') {
    return (
      <>
        <b>NFS-e nº {e.numeroNfse ?? '—'}</b>
        {e.ambiente === 'restrita' ? <span className="adm-fraco"> · teste (sem validade jurídica)</span> : null}
        <div className="adm-fraco" style={{ wordBreak: 'break-all' }}>
          {e.chaveAcesso}
        </div>
      </>
    )
  }
  return (
    <>
      <b>{ROTULO_STATUS[e.status]}</b>
      {e.erros?.length ? (
        <ul className="adm-fraco" style={{ margin: '4px 0 0', paddingLeft: 16 }}>
          {e.erros.map((x, i) => (
            <li key={i}>
              {x.codigo ? `${x.codigo}: ` : ''}
              {x.descricao}
              {x.complemento ? ` (${x.complemento})` : ''}
            </li>
          ))}
        </ul>
      ) : null}
    </>
  )
}

function baixar(nome: string, xml: string): void {
  const url = URL.createObjectURL(new Blob([xml], { type: 'application/xml' }))
  const a = document.createElement('a')
  a.href = url
  a.download = nome
  a.click()
  URL.revokeObjectURL(url)
}

export function NotasFiscais({
  dados,
  status,
  busca,
  podeEmitir,
}: {
  dados: DadosFiscais
  status: StatusNfse | null
  busca: string
  podeEmitir: boolean
}): ReactNode {
  const { run } = useAdmin()
  const [ocupado, setOcupado] = useState<string | null>(null)

  async function executar(chave: string, acao: () => ReturnType<typeof enviarFilaDeNotas>): Promise<void> {
    setOcupado(chave)
    await run(acao)
    setOcupado(null)
  }

  async function xml(id: number): Promise<void> {
    setOcupado(`xml-${id}`)
    const r = await run(() => baixarXmlNfse(id))
    setOcupado(null)
    if (r.ok && r.data) baixar(r.data.nome, r.data.xml)
  }

  const c = dados.contagem
  const recusadas = c.rejeitada + c.erro
  const filtro = (s: StatusNfse | null): string => {
    const q = new URLSearchParams()
    if (s) q.set('status', s)
    if (busca) q.set('busca', busca)
    const t = q.toString()
    return t ? `?${t}` : '?'
  }

  return (
    <>
      <div className="adm-grade">
        <Cartao rotulo="Autorizadas" valor={numero(c.autorizada)} tom="positivo" detalhe="notas emitidas pela plataforma" />
        <Cartao rotulo="Na fila" valor={numero(c.pendente + c.processando)} detalhe="esperando envio à Sefin" />
        <Cartao rotulo="Recusadas ou com erro" valor={numero(recusadas)} tom={recusadas ? 'alerta' : 'normal'} detalhe="precisam de correção ou reenvio" />
        <Cartao
          rotulo="Ambiente"
          valor={dados.ambiente === 'producao' ? 'Produção' : 'Teste'}
          tom={dados.ambiente === 'producao' ? 'positivo' : 'alerta'}
          detalhe={dados.ambiente === 'producao' ? 'notas com validade fiscal' : 'produção restrita: notas sem validade jurídica'}
        />
      </div>

      {dados.semBanco ? <div className="note adm-secao">Sem banco de dados configurado: a fila de notas vive no Postgres.</div> : null}
      {dados.impedimento ? <div className="note adm-secao">{dados.impedimento}</div> : null}

      <div className="panel">
        <div className="adm-acoes" style={{ flexWrap: 'wrap' }}>
          {([null, 'pendente', 'autorizada', 'rejeitada', 'erro'] as const).map((s) => (
            <Link key={s ?? 'todas'} href={filtro(s)} className={`btn adm-btn-compacto ${status === s ? 'btn-gold' : ''}`}>
              {s ? ROTULO_STATUS[s] : 'Todas'}
            </Link>
          ))}
          <form method="get" style={{ display: 'flex', gap: 8 }}>
            {status ? <input type="hidden" name="status" value={status} /> : null}
            <input className="tinput" name="busca" defaultValue={busca} placeholder="e-mail, TRADE-12, FAT-… ou nº da nota" aria-label="Buscar nota" />
            <button type="submit" className="btn adm-btn-compacto">
              Buscar
            </button>
          </form>
          {podeEmitir ? (
            <>
              <button type="button" className="btn btn-gold adm-btn-compacto" disabled={ocupado !== null} onClick={() => void executar('fila', () => enviarFilaDeNotas())}>
                {ocupado === 'fila' ? 'Enviando…' : 'Enviar fila agora'}
              </button>
              {recusadas ? (
                <button type="button" className="btn adm-btn-compacto" disabled={ocupado !== null} onClick={() => void executar('todas', () => reprocessarNotas('todas'))}>
                  {ocupado === 'todas' ? 'Reprocessando…' : `Reprocessar todas as recusadas (${recusadas})`}
                </button>
              ) : null}
            </>
          ) : null}
        </div>

        {dados.linhas.length === 0 ? (
          <p className="adm-fraco">Nenhuma nota {status ? `com a situação "${ROTULO_STATUS[status]}"` : 'ainda'}.</p>
        ) : (
          <div className="table-scroll">
            <table className="audit-table">
              <thead>
                <tr>
                  <th>Fato</th>
                  <th>Serviço</th>
                  <th>Cliente (tomador)</th>
                  <th>Valor</th>
                  <th>Competência</th>
                  <th>Nota</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {dados.linhas.map((l) => {
                  const e = l.emissao
                  return (
                    <tr key={e.id}>
                      <td>
                        {dataHora(e.ocorridoEm)}
                        <div className="adm-fraco">{e.refFato}</div>
                      </td>
                      <td>{ROTULO_DO_SERVICO[e.servico]}</td>
                      <td>
                        {l.nome}
                        <div className="adm-fraco">{e.tomadorEmail}</div>
                      </td>
                      <td>{dinheiro(e.valorCents)}</td>
                      <td>{competencia(e.competencia)}</td>
                      <td>{situacao(l)}</td>
                      <td>
                        {e.status === 'autorizada' ? (
                          <button type="button" className="btn adm-btn-compacto" disabled={ocupado !== null} onClick={() => void xml(e.id)}>
                            XML
                          </button>
                        ) : null}
                        {podeEmitir && (e.status === 'rejeitada' || e.status === 'erro') ? (
                          <button
                            type="button"
                            className="btn adm-btn-compacto"
                            disabled={ocupado !== null}
                            onClick={() => void executar(`linha-${e.id}`, () => reprocessarNotas([e.id]))}
                          >
                            {ocupado === `linha-${e.id}` ? 'Enviando…' : 'Reprocessar'}
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
