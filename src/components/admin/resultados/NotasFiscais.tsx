'use client'

/**
 * A fila das NFS-e (23/10/2026): toda comissão, custódia paga, tarifa de saque e taxa de retirada, com a
 * nota que gerou ou o motivo de não ter gerado — e as canceladas (saque recusado), com o motivo.
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
import { ConfirmarAcao } from '../ConfirmarAcao'
import { Abas, Selo, TabelaRolavel } from '../Pecas'
import { Cartao } from '../Blocos'
import { dataHora, dinheiro, numero } from '../formatos'

const ROTULO_STATUS: Record<StatusNfse, string> = {
  pendente: 'Na fila',
  processando: 'Enviando',
  autorizada: 'Autorizada',
  rejeitada: 'Recusada',
  erro: 'Erro de envio',
  cancelando: 'Cancelando',
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
        <Selo tom="ok">Autorizada</Selo> <b>NFS-e nº {e.numeroNfse ?? '—'}</b>
        {e.ambiente === 'restrita' ? <span className="adm-fraco"> · teste (sem validade jurídica)</span> : null}
        <div className="adm-fraco" style={{ wordBreak: 'break-all' }}>
          {e.chaveAcesso}
        </div>
      </>
    )
  }
  return (
    <>
      <Selo tom={e.status === 'rejeitada' || e.status === 'erro' ? 'alerta' : e.status === 'cancelada' ? 'neutro' : 'atencao'}>{ROTULO_STATUS[e.status]}</Selo>
      {e.numeroNfse && (e.status === 'cancelada' || e.status === 'cancelando') ? <span> · NFS-e nº {e.numeroNfse}</span> : null}
      {e.motivoCancelamento ? <div className="adm-fraco">{e.motivoCancelamento.split('|').slice(1).join('|')}</div> : null}
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

      {/* Envio à Sefin num bloco à parte, com confirmação que diz quantas notas saem (25/10/2026):
          é documento fiscal saindo da empresa. Mesmas actions, mesma permissão (resultados.nfse). */}
      {podeEmitir ? (
        <div className="panel adm-secao">
          <h3>Envio à Sefin Nacional</h3>
          <div className="adm-acoes">
            <ConfirmarAcao
              rotulo={ocupado === 'fila' ? 'Enviando…' : 'Enviar fila agora'}
              objeto={`enviar ${numero(c.pendente + c.processando)} nota(s) da fila à Sefin`}
              detalhe={dados.ambiente === 'producao' ? 'Ambiente de produção: as notas autorizadas têm validade fiscal.' : 'Ambiente de teste: notas sem validade jurídica.'}
              aoConfirmar={() => executar('fila', () => enviarFilaDeNotas())}
              variante="gold"
              desabilitado={ocupado !== null}
            />
            {recusadas ? (
              <ConfirmarAcao
                rotulo={ocupado === 'todas' ? 'Reprocessando…' : `Reprocessar todas as recusadas (${recusadas})`}
                objeto={`reprocessar ${numero(recusadas)} nota(s) recusada(s) ou com erro`}
                detalhe="Volta para a fila e é reenviada com os dados de hoje."
                aoConfirmar={() => executar('todas', () => reprocessarNotas('todas'))}
                desabilitado={ocupado !== null}
              />
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="panel">
        <Abas
          rotulo="Situação das notas"
          itens={([null, 'pendente', 'autorizada', 'rejeitada', 'erro', 'cancelada'] as const).map((st) => ({
            href: filtro(st) === '?' ? '/admin/resultados/fiscal' : `/admin/resultados/fiscal${filtro(st)}`,
            rotulo: st ? ROTULO_STATUS[st] : 'Todas',
            atual: status === st,
            contagem: st ? c[st] : undefined,
          }))}
        />
        <form method="get" className="adm-form" role="search">
          {status ? <input type="hidden" name="status" value={status} /> : null}
          <div className="field adm-campo-largo">
            <label htmlFor="nfse-busca">E-mail, TRADE-12, FAT-… ou nº da nota</label>
            <input id="nfse-busca" type="search" className="tinput" name="busca" defaultValue={busca} autoComplete="off" spellCheck={false} />
          </div>
          <button type="submit" className="btn btn-outline adm-btn-compacto">
            Buscar notas
          </button>
          {busca ? (
            <Link href={filtro(status)} className="btn btn-outline adm-btn-compacto">
              Limpar busca
            </Link>
          ) : null}
        </form>

        {dados.linhas.length === 0 ? (
          <div className="adm-vazio">
            <b>Nenhuma nota {status ? `com a situação "${ROTULO_STATUS[status]}"` : busca ? 'com essa busca' : 'ainda'}.</b>
            {status || busca ? 'Troque a situação ou a busca acima.' : 'Uma nota nasce a cada comissão de negociação (uma por lado) e a cada fatura de custódia paga.'}
          </div>
        ) : (
          <TabelaRolavel rotulo="Notas fiscais (NFS-e): fato, serviço, cliente, valor, competência e situação">
            <table className="audit-table">
              <caption className="adm-sr">Notas fiscais (NFS-e): fato, serviço, cliente, valor, competência e situação</caption>
              <thead>
                <tr>
                  <th scope="col">Fato</th>
                  <th scope="col">Serviço</th>
                  <th scope="col">Cliente (tomador)</th>
                  <th scope="col" className="adm-num">Valor</th>
                  <th scope="col">Competência</th>
                  <th scope="col">Nota</th>
                  <th scope="col">
                    <span className="adm-sr">Ações</span>
                  </th>
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
                      <td className="adm-num">{dinheiro(e.valorCents)}</td>
                      <td>{competencia(e.competencia)}</td>
                      <td>{situacao(l)}</td>
                      <td>
                        {e.status === 'autorizada' ? (
                          <button type="button" className="btn btn-outline adm-btn-compacto" disabled={ocupado !== null} onClick={() => void xml(e.id)}>
                            XML<span className="adm-sr"> da nota de {e.refFato}</span>
                          </button>
                        ) : null}
                        {podeEmitir && (e.status === 'rejeitada' || e.status === 'erro') ? (
                          <button
                            type="button"
                            className="btn btn-outline adm-btn-compacto"
                            disabled={ocupado !== null}
                            onClick={() => void executar(`linha-${e.id}`, () => reprocessarNotas([e.id]))}
                          >
                            {ocupado === `linha-${e.id}` ? 'Enviando…' : 'Reprocessar'}
                            <span className="adm-sr"> a nota de {e.refFato}</span>
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </TabelaRolavel>
        )}
      </div>
    </>
  )
}
