/**
 * /admin/moedas/[codigo] — o recibo de qualquer conta, com a prova de onde ele veio (plano do
 * Admin, seções 3.5 e 3.6).
 *
 * O recibo (código, hash, situação, emissão), a análise que aprovou a moeda com os quinze campos
 * que entram no hash — na ordem de estacao/CONTRATO.md —, o vídeo, o envio de origem e as retiradas
 * com a reimpressão da etiqueta pela rota que já existe. Pede `bancada.auditoria`.
 */

import Link from 'next/link'
import type { ReactNode } from 'react'

import { SemPermissao } from '@/components/admin/Blocos'
import { BotaoVideo } from '@/components/admin/moedas/BotaoVideo'
import { hashCurto } from '@/components/admin/moedas/TabelaDeMoedas'
import { data, dataHora, dinheiro, numero } from '@/components/admin/formatos'
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

  return (
    <>
      <div className="adm-topo-ficha">
        <div>
          <h2>{linha.codigo}</h2>
          <p className="adm-fraco">
            {linha.tipoMoeda} ({linha.ano}) · <Link href={`/admin/usuarios/${encodeURIComponent(linha.dono)}`}>{linha.nomeDono}</Link>
          </p>
        </div>
        <div className="adm-acoes">
          <Link href="/admin/moedas" className="btn btn-outline adm-btn-compacto">
            Auditoria
          </Link>
          <Link href={`/recibos/${encodeURIComponent(linha.codigo)}`} className="btn btn-outline adm-btn-compacto">
            Ver como o cliente vê
          </Link>
        </div>
      </div>

      <div className="panel">
        <h3>Recibo</h3>
        <dl className="adm-pares">
          <div>
            <dt>Código</dt>
            <dd>{linha.recibo.codigo}</dd>
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
        </dl>
        <dl className="adm-pares">
          <div style={{ gridColumn: '1 / -1' }}>
            <dt>Hash do recibo</dt>
            <dd className="adm-mono">{linha.recibo.hash}</dd>
          </div>
        </dl>
        {linha.hashConfere === true ? <p className="note">O hash do recibo é o hash da análise que aprovou a moeda.</p> : null}
        {linha.hashConfere === false ? <p className="note adm-negativo">O hash do recibo não é o da análise que aprovou a moeda. Rode “Verificar corrente” na auditoria.</p> : null}
        {linha.hashConfere === null ? <p className="adm-fraco">Moeda sem análise de bancada: o hash é o simulado do acervo de demonstração.</p> : null}
      </div>

      <div className="panel">
        <h3>Análise de origem</h3>
        {analise ? (
          <>
            <p className="adm-fraco">Os quinze campos que entram no hash, na ordem congelada do contrato da estação.</p>
            <div className="table-scroll">
              <table className="audit-table">
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
            {analise.caminhoVideo ? <BotaoVideo caminho={analise.caminhoVideo} /> : <p className="adm-fraco">Análise fechada sem vídeo — a ausência está registrada no hash.</p>}
          </>
        ) : (
          <p className="adm-fraco">Esta moeda não passou pela bancada.</p>
        )}
      </div>

      <div className="panel">
        <h3>Envio de origem</h3>
        {envio ? (
          <dl className="adm-pares">
            <div>
              <dt>Protocolo</dt>
              <dd>{envio.protocolo}</dd>
            </div>
            <div>
              <dt>Etapa</dt>
              <dd>{envio.etapaAtual}</dd>
            </div>
            <div>
              <dt>Moedas no envio</dt>
              <dd>{numero(envio.quantidade)}</dd>
            </div>
            <div>
              <dt>Postagem · recebimento</dt>
              <dd>
                {data(envio.dataPostagem)} · {data(envio.dataRecebimento)}
              </dd>
            </div>
            <div>
              <dt>Rastreio</dt>
              <dd className="adm-mono">{envio.codigoRastreio ?? '—'}</dd>
            </div>
          </dl>
        ) : (
          <p className="adm-fraco">Protocolo {linha.protocoloEnvio} não encontrado entre os envios (moeda do acervo de demonstração).</p>
        )}
      </div>

      <div className="panel">
        <h3>Retiradas</h3>
        {retiradas.length ? (
          <div className="table-scroll">
            <table className="audit-table">
              <thead>
                <tr>
                  <th>Retirada</th>
                  <th>Situação</th>
                  <th className="adm-num">Taxa</th>
                  <th>Prazo</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {retiradas.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <b>{r.id}</b>
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
                          Etiqueta
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
      </div>
    </>
  )
}
