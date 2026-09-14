'use client'

/**
 * Coluna 1 da tela de CS: a caixa de conversas, com filtro por situação, responsável e
 * etiqueta, busca por nome ou telefone, o contador de não lidas e o "Nova conversa".
 *
 * A busca vai quando o atendente manda (Enter ou o botão), não a cada tecla: cada filtro
 * novo é uma consulta ao banco, e digitar um telefone não pode virar onze consultas.
 */

import { useState } from 'react'
import type { ReactNode } from 'react'

import { STATUS_CONVERSA, type FiltroConversas, type StatusConversa } from '@/domain/admin/cs'
import { formatarTelefoneE164 } from '@/domain/admin/telefone'
import type { Caixa } from '@/server/admin/cs'
import { iniciarConversaNoPainel } from '@/server/actions/admin/cs'

import { useAdmin } from '../AdminProvider'
import { horaOuData, numero } from '../formatos'
import type { Executar } from './CaixaDeAtendimento'

const ROTULO_MIDIA: Record<string, string> = { image: 'imagem', video: 'vídeo', audio: 'áudio', document: 'documento', sticker: 'figurinha' }

export function ListaDeConversas({
  caixa,
  filtro,
  aoFiltrar,
  conversaId,
  aoAbrir,
  equipe,
  executar,
}: {
  caixa: Caixa | null
  filtro: FiltroConversas
  aoFiltrar: (f: FiltroConversas) => void
  conversaId: number | null
  aoAbrir: (id: number) => void
  equipe: Array<{ email: string; nome: string }>
  executar: Executar
}): ReactNode {
  const { pode } = useAdmin()
  const [busca, setBusca] = useState(filtro.busca)
  const [criando, setCriando] = useState(false)
  const etiquetas = caixa?.etiquetas ?? []
  const rotuloDaEtiqueta = new Map(etiquetas.map((e) => [e.slug, e]))

  return (
    <div className="panel">
      <h3>Conversas</h3>
      {caixa ? (
        <div className="adm-cs-contagem" aria-live="polite">
          <span>{numero(caixa.resumo.porStatus.aberta)} abertas</span>
          <span>· {numero(caixa.resumo.porStatus.pendente)} pendentes</span>
          <span>· {numero(caixa.resumo.naoLidas)} não lidas</span>
        </div>
      ) : null}

      <div className="adm-abas" role="group" aria-label="Situação da conversa">
        {[{ chave: null, rotulo: 'Todas' } as { chave: StatusConversa | null; rotulo: string }, ...STATUS_CONVERSA].map((s) => (
          <button
            key={s.rotulo}
            type="button"
            className={filtro.status === s.chave ? 'chart-tab on' : 'chart-tab'}
            aria-pressed={filtro.status === s.chave}
            onClick={() => aoFiltrar({ ...filtro, status: s.chave })}
          >
            {s.rotulo}
          </button>
        ))}
      </div>

      <form
        className="adm-form"
        onSubmit={(e) => {
          e.preventDefault()
          aoFiltrar({ ...filtro, busca: busca.trim() })
        }}
      >
        <div className="field adm-campo-largo">
          <label htmlFor="cs-busca">Nome ou telefone</label>
          <input id="cs-busca" className="tinput" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="ex.: Ana, 11 99999" />
        </div>
        <button type="submit" className="btn btn-outline adm-btn-compacto">
          Buscar
        </button>
      </form>

      <div className="adm-form">
        <div className="field">
          <label htmlFor="cs-responsavel">Responsável</label>
          <select
            id="cs-responsavel"
            className="tinput"
            value={filtro.responsavel ?? ''}
            onChange={(e) => aoFiltrar({ ...filtro, responsavel: e.target.value || null })}
          >
            <option value="">Qualquer</option>
            <option value="ninguem">Sem responsável</option>
            {equipe.map((m) => (
              <option key={m.email} value={m.email}>
                {m.nome ? `${m.nome} (${m.email})` : m.email}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="cs-etiqueta">Etiqueta</label>
          <select id="cs-etiqueta" className="tinput" value={filtro.etiqueta ?? ''} onChange={(e) => aoFiltrar({ ...filtro, etiqueta: e.target.value || null })}>
            <option value="">Qualquer</option>
            {etiquetas.map((e) => (
              <option key={e.slug} value={e.slug}>
                {e.rotulo}
              </option>
            ))}
          </select>
        </div>
        <label className="adm-check">
          <input type="checkbox" checked={filtro.soNaoLidas} onChange={(e) => aoFiltrar({ ...filtro, soNaoLidas: e.target.checked })} />
          Só não lidas
        </label>
      </div>

      {pode('cs.responder') ? (
        criando ? (
          <NovaConversa executar={executar} aoCriar={(id) => { setCriando(false); aoAbrir(id) }} aoCancelar={() => setCriando(false)} />
        ) : (
          <div className="adm-acoes adm-secao">
            <button type="button" className="btn btn-gold adm-btn-compacto" onClick={() => setCriando(true)} data-uso="cs-nova-conversa">
              Nova conversa
            </button>
          </div>
        )
      ) : null}

      <div className="adm-cs-itens">
        {!caixa || caixa.conversas.length === 0 ? (
          <div className="empty" style={{ margin: 16 }}>
            {filtro.busca || filtro.status || filtro.responsavel || filtro.etiqueta || filtro.soNaoLidas
              ? 'Nenhuma conversa com este filtro.'
              : 'Nenhuma conversa ainda. Elas chegam pelo WhatsApp do atendimento ou começam em "Nova conversa".'}
          </div>
        ) : (
          caixa.conversas.map((c) => {
            const nome = c.contato.nome || formatarTelefoneE164(c.contato.telefone)
            const previa = c.ultima
              ? `${c.ultima.direcao === 'saida' ? 'Você: ' : ''}${c.ultima.midiaTipo ? `[${ROTULO_MIDIA[c.ultima.midiaTipo] ?? c.ultima.midiaTipo}] ` : ''}${c.ultima.corpo}`
              : 'Sem mensagens'
            return (
              <button
                key={c.id}
                type="button"
                className={c.id === conversaId ? 'adm-cs-item on' : 'adm-cs-item'}
                aria-current={c.id === conversaId ? 'true' : undefined}
                onClick={() => aoAbrir(c.id)}
              >
                <span className="adm-cs-item-topo">
                  <span className="adm-cs-nome">{nome}</span>
                  <span className="adm-cs-hora">{horaOuData(c.ultimaMensagemEm)}</span>
                </span>
                <span className="adm-cs-item-topo">
                  <span className="adm-cs-previa">{previa}</span>
                  {c.naoLidas > 0 ? (
                    <span className="adm-cs-naolidas" aria-label={`${c.naoLidas} não lidas`}>
                      {c.naoLidas}
                    </span>
                  ) : null}
                </span>
                {c.status !== 'aberta' || c.etiquetas.length || c.contato.userEmail ? (
                  <span className="adm-etiquetas">
                    {c.status !== 'aberta' ? <span className={c.status === 'resolvida' ? 'pill g' : 'pill y'}>{c.status === 'resolvida' ? 'Resolvida' : 'Pendente'}</span> : null}
                    {c.contato.userEmail ? <span className="pill n">Cliente</span> : null}
                    {c.etiquetas.map((slug) => {
                      const e = rotuloDaEtiqueta.get(slug)
                      return (
                        <span key={slug} className={`adm-etiqueta adm-etiqueta-${e?.cor ?? 'cinza'}`}>
                          {e?.rotulo ?? slug}
                        </span>
                      )
                    })}
                  </span>
                ) : null}
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}

function NovaConversa({ executar, aoCriar, aoCancelar }: { executar: Executar; aoCriar: (id: number) => void; aoCancelar: () => void }): ReactNode {
  const [telefone, setTelefone] = useState('')
  const [nome, setNome] = useState('')
  const [texto, setTexto] = useState('')
  const [ocupado, setOcupado] = useState(false)

  return (
    <form
      className="adm-secao"
      onSubmit={async (e) => {
        e.preventDefault()
        setOcupado(true)
        const r = await executar(() => iniciarConversaNoPainel(telefone, nome, texto))
        setOcupado(false)
        if (r.ok && r.data?.conversaId) aoCriar(r.data.conversaId)
      }}
    >
      <div className="field">
        <label htmlFor="cs-novo-telefone">Telefone (com DDD)</label>
        <input id="cs-novo-telefone" className="tinput" inputMode="tel" value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(11) 99999-8888" />
      </div>
      <div className="field">
        <label htmlFor="cs-novo-nome">Nome (opcional)</label>
        <input id="cs-novo-nome" className="tinput" value={nome} onChange={(e) => setNome(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="cs-novo-texto">Primeira mensagem</label>
        <textarea id="cs-novo-texto" className="obs" value={texto} onChange={(e) => setTexto(e.target.value)} />
      </div>
      <div className="adm-acoes">
        <button type="submit" className="btn btn-gold adm-btn-compacto" disabled={ocupado}>
          {ocupado ? 'Enviando…' : 'Enviar e abrir'}
        </button>
        <button type="button" className="btn btn-outline adm-btn-compacto" onClick={aoCancelar}>
          Cancelar
        </button>
      </div>
    </form>
  )
}
