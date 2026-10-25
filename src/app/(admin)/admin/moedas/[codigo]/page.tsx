/**
 * /admin/moedas/[codigo] — o recibo de qualquer conta, com a prova de onde ele veio (plano do
 * Admin, seções 3.5 e 3.6).
 *
 * O recibo (código, hash, situação, emissão), a análise que aprovou a moeda com os quinze campos
 * que entram no hash — na ordem de estacao/CONTRATO.md —, o vídeo, o envio de origem e as retiradas
 * com a reimpressão da etiqueta pela rota que já existe. Pede `bancada.auditoria`.
 *
 * Rodada 2 (25/10/2026): cartão de identidade com os selos (recibo, situação, hash), recibo e
 * análise na zona principal, e na lateral a proveniência em linha do tempo, o envio e as
 * retiradas — o desenho de ficha de acervo dos sistemas de museu (CollectiveAccess).
 */

import Link from 'next/link'
import type { ReactNode } from 'react'

import { SemPermissao } from '@/components/admin/Blocos'
import { BotaoVideo } from '@/components/admin/moedas/BotaoVideo'
import { hashCurto } from '@/components/admin/moedas/TabelaDeMoedas'
import { data, dataHora, dinheiro, numero } from '@/components/admin/formatos'
import { Secao, Selo, Vazio } from '@/components/admin/Pecas'
import { ROTULO_STATUS_RETIRADA } from '@/domain/admin/logistica'
import { ROTULO_SITUACAO } from '@/domain/admin/moedas'
import { temPermissao } from '@/domain/admin/permissoes'
import { CAMPOS_DA_ANALISE } from '@/domain/analise'
import { membroDaPagina } from '@/server/admin/acesso'
import { carregarFichaDaMoeda } from '@/server/admin/moedas'

export const dynamic = 'force-dynamic'

function codigoDaRota(bruto: string): string {
  try {
    return decodeURIComponent(bruto).trim().toUpperCase()
  } catch {
    return ''
  }
}

export default async function MoedaPage({ params }: { params: Promise<{ codigo: string }> }): Promise<ReactNode> {
  const membro = await membroDaPagina()
  if (!temPermissao(membro, 'bancada.auditoria')) return <SemPermissao permissoes={['bancada.auditoria']} />

  const codigo = codigoDaRota((await params).codigo)
  const ficha = codigo ? await carregarFichaDaMoeda(codigo) : null
  if (!ficha) {
    return (
      <div className="panel">
        <h3>Moeda não encontrada</h3>
        <p className="adm-fraco">Nenhuma moeda com o código {codigo || '(vazio)'} no acervo.</p>
        <Link href="/admin/moedas" className="btn btn-outline adm-btn-compacto">
          Voltar à auditoria
        </Link>
      </div>
    )
  }

  const { linha, analise, envio, retiradas } = ficha
  const podeEtiqueta = temPermissao(membro, 'logistica.etiquetas')

  // Proveniência (rodada 2): a história da moeda em ordem, montada só com o que esta página já
  // carrega — envio, análise, recibo e retiradas. Nenhuma consulta nova (a trilha completa por
  // moeda está em PROPOSTAS_BACKEND.md, P4).
  const marcos: Array<{ chave: string; quando: string; oQue: ReactNode }> = []
  if (envio?.dataPostagem) marcos.push({ chave: 'postagem', quando: data(envio.dataPostagem), oQue: <>Postada pelo cliente no envio {envio.protocolo}</> })
  if (envio?.dataRecebimento) marcos.push({ chave: 'recebimento', quando: data(envio.dataRecebimento), oQue: <>Recebida pela custódia</> })
  if (analise) marcos.push({ chave: 'analise', quando: dataHora(analise.validadoEm), oQue: <>Análise da bancada fechada{analise.caminhoVideo ? ', com vídeo' : ', sem vídeo'}</> })
  marcos.push({ chave: 'recibo', quando: linha.recibo.dataEmissao, oQue: <>Recibo {linha.recibo.codigo} emitido — {linha.recibo.status.toLowerCase()}</> })
  for (const r of retiradas) marcos.push({ chave: r.id, quando: data(r.solicitadoEm), oQue: <>Retirada {r.id} pedida — {ROTULO_STATUS_RETIRADA[r.status].toLowerCase()}</> })

  return (
    <>
      <div className="adm-identidade">
        <span className="adm-identidade-avatar adm-identidade-moeda" aria-hidden="true">
          {linha.ano}
        </span>
        <div className="adm-identidade-texto">
          <h2 translate="no">{linha.codigo}</h2>
          <p>
            {linha.tipoMoeda} ({linha.ano}) · de <Link href={`/admin/usuarios/${encodeURIComponent(linha.dono)}`}>{linha.nomeDono}</Link>
          </p>
        </div>
        <div className="adm-etiquetas adm-identidade-selos">
          <Selo tom={linha.recibo.status === 'Ativo' ? 'ok' : linha.recibo.status === 'Bloqueado' ? 'alerta' : 'neutro'}>Recibo {linha.recibo.status.toLowerCase()}</Selo>
          <Selo>{ROTULO_SITUACAO[linha.situacao]}</Selo>
          {linha.hashConfere === true ? <Selo tom="ok">Hash confere</Selo> : null}
          {linha.hashConfere === false ? <Selo tom="alerta">Hash diverge</Selo> : null}
        </div>
      </div>

      <div className="adm-zonas">
        <div className="adm-zona-principal">
          <Secao
            id="moeda-recibo"
            titulo="Recibo"
            acoes={
              <Link href={`/recibos/${encodeURIComponent(linha.codigo)}`} className="btn btn-outline">
                Ver como o cliente vê
              </Link>
            }
          >
            <dl className="adm-pares">
              <div>
                <dt>Código</dt>
                <dd translate="no">{linha.recibo.codigo}</dd>
              </div>
              <div>
                <dt>Situação do recibo</dt>
                <dd>{linha.recibo.status}</dd>
              </div>
              <div>
                <dt>Emissão</dt>
                <dd>{linha.recibo.dataEmissao}</dd>
              </div>
              <div>
                <dt>Situação física</dt>
                <dd>
                  {ROTULO_SITUACAO[linha.situacao]} · {linha.statusFisico}
                </dd>
              </div>
              <div>
                <dt>Caixa e posição</dt>
                <dd>{linha.caixa ? `${linha.caixa}${linha.posicao !== null ? ` · posição ${linha.posicao}` : ''}` : '—'}</dd>
              </div>
              <div>
                <dt>Valor estimado</dt>
                <dd>{dinheiro(linha.valorEstimado)}</dd>
              </div>
              <div className="adm-par-largo">
                <dt>Hash do recibo</dt>
                <dd className="adm-mono">{linha.recibo.hash}</dd>
              </div>
            </dl>
            {linha.hashConfere === true ? <p className="note">O hash do recibo é o hash da análise que aprovou a moeda.</p> : null}
            {linha.hashConfere === false ? <p className="note adm-negativo">O hash do recibo não é o da análise que aprovou a moeda. Rode “Verificar corrente” na auditoria.</p> : null}
            {linha.hashConfere === null ? <p className="adm-fraco">Moeda sem análise de bancada: o hash é o simulado do acervo de demonstração.</p> : null}
          </Secao>

          <Secao
            id="moeda-analise"
            titulo="Análise de origem"
            descricao={analise ? 'Os quinze campos que entram no hash, na ordem congelada do contrato da estação.' : undefined}
            acoes={analise?.caminhoVideo ? <BotaoVideo caminho={analise.caminhoVideo} /> : undefined}
          >
            {analise ? (
              <>
                <div className="table-scroll">
                  <table className="audit-table">
                    <caption className="adm-sr">Análise de origem da moeda</caption>
                    <thead>
                      <tr>
                        <th scope="col">Nº</th>
                        <th scope="col">Campo</th>
                        <th scope="col">Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {CAMPOS_DA_ANALISE.map((campo, i) => {
                        const valor = analise[campo]
                        return (
                          <tr key={campo}>
                            <td className="adm-fraco">{i + 1}</td>
                            <td>{campo}</td>
                            <td className={typeof valor === 'string' && valor.length > 30 ? 'adm-mono' : undefined}>
                              {valor === null || valor === '' ? <span className="adm-fraco">(vazio)</span> : campo === 'validadoEm' ? `${String(valor)} · ${dataHora(valor as number)}` : String(valor)}
                            </td>
                          </tr>
                        )
                      })}
                      <tr>
                        <td />
                        <td>hashAnterior</td>
                        <td className="adm-mono" title={analise.hashAnterior}>
                          {hashCurto(analise.hashAnterior)}
                        </td>
                      </tr>
                      <tr>
                        <td />
                        <td>hash</td>
                        <td className="adm-mono">{analise.hash}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                {!analise.caminhoVideo ? <p className="adm-fraco">Análise fechada sem vídeo — a ausência está registrada no hash.</p> : null}
              </>
            ) : (
              <Vazio titulo="Esta moeda não passou pela bancada.">Ela entrou pelo cadastro direto ou pelo acervo de demonstração.</Vazio>
            )}
          </Secao>
        </div>

        <aside className="adm-zona-lateral" aria-label="Proveniência, envio e retiradas">
          <Secao id="moeda-historia" titulo="Proveniência" descricao="Da postagem à situação de hoje.">
            <ol className="adm-linha-tempo">
              {marcos.map((m) => (
                <li key={m.chave}>
                  <span className="adm-linha-tempo-quando">{m.quando}</span>
                  <span>{m.oQue}</span>
                </li>
              ))}
            </ol>
          </Secao>

          <Secao id="moeda-envio" titulo="Envio de origem">
            {envio ? (
              <dl className="adm-lista-def">
                <dt>Protocolo</dt>
                <dd translate="no">{envio.protocolo}</dd>
                <dt>Etapa</dt>
                <dd>{envio.etapaAtual}</dd>
                <dt>Moedas no envio</dt>
                <dd>{numero(envio.quantidade)}</dd>
                <dt>Postagem</dt>
                <dd>{data(envio.dataPostagem)}</dd>
                <dt>Recebimento</dt>
                <dd>{data(envio.dataRecebimento)}</dd>
                <dt>Rastreio</dt>
                <dd className="adm-mono">{envio.codigoRastreio ?? '—'}</dd>
              </dl>
            ) : (
              <p className="adm-fraco">Protocolo {linha.protocoloEnvio} não encontrado entre os envios (moeda do acervo de demonstração).</p>
            )}
          </Secao>

          <Secao id="moeda-retiradas" titulo="Retiradas">
            {retiradas.length ? (
              <div className="table-scroll">
                <table className="audit-table">
                  <caption className="adm-sr">Retiradas desta moeda</caption>
                  <thead>
                    <tr>
                      <th scope="col">Retirada</th>
                      <th scope="col">Situação</th>
                      <th scope="col" className="adm-num">Taxa</th>
                      <th scope="col">Prazo</th>
                      <th scope="col">
                        <span className="adm-sr">Etiqueta</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {retiradas.map((r) => (
                      <tr key={r.id}>
                        <td>
                          <b translate="no">{r.id}</b>
                          <div className="adm-fraco">
                            {r.modalidade} · pedida {data(r.solicitadoEm)}
                          </div>
                        </td>
                        <td>
                          {ROTULO_STATUS_RETIRADA[r.status]}
                          {r.codigoRastreio ? <div className="adm-mono">{r.codigoRastreio}</div> : null}
                        </td>
                        <td className="adm-num">{dinheiro(r.valorTaxaCents)}</td>
                        <td>{data(r.dataLimiteD30)}</td>
                        <td>
                          {podeEtiqueta ? (
                            <a className="btn btn-outline adm-btn-compacto" href={`/api/retiradas/etiqueta/${encodeURIComponent(r.id)}`} target="_blank" rel="noreferrer">
                              Etiqueta<span className="adm-sr"> da retirada {r.id} (abre em nova aba)</span>
                            </a>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="adm-fraco">Nenhuma retirada desta moeda.</p>
            )}
          </Secao>
        </aside>
      </div>
    </>
  )
}
