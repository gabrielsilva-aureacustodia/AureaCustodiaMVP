'use client'

/**
 * Coluna 2 da tela de CS: a conversa aberta — mensagens em ordem com o estado de entrega,
 * caixa de resposta, envio de arquivo por endereço, situação, responsável, etiquetas e as
 * notas internas.
 *
 * O ESTADO DE ENTREGA APARECE EM PALAVRAS, não em tiques: "Entregue", "Lida", "Falhou",
 * "Só no painel". A mensagem que ficou só no painel (sem WhatsApp conectado) tem borda
 * tracejada, e a que falhou, borda vermelha — o atendente nunca acha que respondeu quem não
 * recebeu nada.
 *
 * Nota interna é da equipe e fica fora da linha das mensagens, com outra cor: não existe
 * jeito de ela ser confundida com algo que o cliente viu.
 */

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

import { CORES_ETIQUETA, STATUS_CONVERSA, TIPOS_DE_MIDIA, descreverStatusMensagem, type CorEtiqueta } from '@/domain/admin/cs'
import { formatarTelefoneE164 } from '@/domain/admin/telefone'
import type { CanalNaTela } from '@/server/admin/atendimento'
import type { ConversaAberta } from '@/server/admin/cs'
import type { EtiquetaGravada } from '@/server/db/repositories/cs'
import {
  anotarConversaNoPainel,
  atribuirConversaNoPainel,
  criarEtiquetaNoPainel,
  enviarMidiaNoPainel,
  etiquetarConversaNoPainel,
  mudarSituacaoDaConversaNoPainel,
  responderNoPainel,
} from '@/server/actions/admin/cs'

import { useAdmin } from '../AdminProvider'
import { dataHora } from '../formatos'
import type { Executar } from './CaixaDeAtendimento'

const NOME_DA_COR: Record<CorEtiqueta, string> = { ouro: 'Ouro', verde: 'Verde', vermelho: 'Vermelho', cinza: 'Cinza' }

export function Conversa({
  aberta,
  carregando,
  canal,
  etiquetas,
  equipe,
  executar,
}: {
  aberta: ConversaAberta | null
  carregando: boolean
  canal: CanalNaTela
  etiquetas: EtiquetaGravada[]
  equipe: Array<{ email: string; nome: string }>
  executar: Executar
}): ReactNode {
  const { pode } = useAdmin()
  const podeResponder = pode('cs.responder')
  const fim = useRef<HTMLDivElement | null>(null)
  const quantas = aberta?.mensagens.length ?? 0
  const idDaConversa = aberta?.conversa.id ?? null

  // Mensagem nova ou conversa trocada: rola até a última.
  useEffect(() => {
    fim.current?.scrollIntoView({ block: 'nearest' })
  }, [quantas, idDaConversa])

  if (!aberta) {
    return (
      <div className="panel">
        <div className="empty">{carregando ? 'Abrindo a conversa…' : 'Escolha uma conversa na lista para ler e responder.'}</div>
      </div>
    )
  }

  const { conversa, mensagens, notas } = aberta
  const nome = conversa.contato.nome || formatarTelefoneE164(conversa.contato.telefone)
  const responsavelForaDaLista = conversa.responsavel && !equipe.some((m) => m.email === conversa.responsavel)

  return (
    <div className="panel">
      <div className="adm-cs-cabecalho">
        <div>
          <h3>{nome}</h3>
          <div className="adm-fraco">
            {formatarTelefoneE164(conversa.contato.telefone)}
            {conversa.contato.userEmail && pode('usuarios.ver') ? (
              <>
                {' · '}
                <Link href={`/admin/usuarios/${encodeURIComponent(conversa.contato.userEmail)}`}>{conversa.contato.userEmail}</Link>
              </>
            ) : null}
          </div>
        </div>
        {podeResponder ? (
          <div className="adm-form" style={{ marginBottom: 0 }}>
            <div className="field">
              <label htmlFor="cs-situacao">Situação</label>
              <select
                id="cs-situacao"
                className="tinput"
                value={conversa.status}
                onChange={(e) => void executar(() => mudarSituacaoDaConversaNoPainel(conversa.id, e.target.value))}
              >
                {STATUS_CONVERSA.map((s) => (
                  <option key={s.chave} value={s.chave}>
                    {s.rotulo}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="cs-dono">Responsável</label>
              <select
                id="cs-dono"
                className="tinput"
                value={conversa.responsavel ?? ''}
                onChange={(e) => void executar(() => atribuirConversaNoPainel(conversa.id, e.target.value || null))}
              >
                <option value="">Ninguém</option>
                {responsavelForaDaLista ? <option value={conversa.responsavel ?? ''}>{conversa.responsavel}</option> : null}
                {equipe.map((m) => (
                  <option key={m.email} value={m.email}>
                    {m.nome || m.email}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : (
          <span className="pill n">{STATUS_CONVERSA.find((s) => s.chave === conversa.status)?.rotulo}</span>
        )}
      </div>

      <Etiquetas conversaId={conversa.id} marcadas={conversa.etiquetas} etiquetas={etiquetas} podeEditar={podeResponder} executar={executar} />

      {!canal.entregaDeVerdade ? (
        <div className="note adm-secao">
          <span>
            <b>Sem WhatsApp conectado.</b> O que for respondido aqui fica registrado no painel e não chega ao cliente. Falta
            configurar: {canal.pendencias.join(', ')}.
          </span>
        </div>
      ) : canal.pendencias.length ? (
        <div className="note adm-secao">
          <span>
            O envio funciona, mas as mensagens do cliente não entram no painel: falta {canal.pendencias.join(', ')}.
          </span>
        </div>
      ) : null}

      <div className="adm-cs-mensagens" aria-live="polite">
        {mensagens.length === 0 ? <div className="empty">Nenhuma mensagem nesta conversa.</div> : null}
        {mensagens.map((m) => (
          <div key={m.id} className={`adm-cs-msg ${m.direcao} ${m.status === 'falhou' || m.status === 'registrada' ? m.status : ''}`}>
            {m.midiaTipo ? (
              <span className="adm-cs-midia">
                {TIPOS_DE_MIDIA.find((t) => t.chave === m.midiaTipo)?.rotulo ?? `Arquivo (${m.midiaTipo})`}
                {m.midiaUrl ? (
                  <>
                    {' · '}
                    <a href={m.midiaUrl} target="_blank" rel="noreferrer noopener">
                      abrir
                    </a>
                  </>
                ) : m.direcao === 'entrada' ? (
                  ' · abra no aparelho do atendimento'
                ) : null}
              </span>
            ) : null}
            {m.corpo}
            <span className="adm-cs-msg-rodape">
              {m.direcao === 'saida' && m.autor ? <span>{m.autor === 'whatsapp-celular' ? 'pelo aparelho' : m.autor}</span> : null}
              <span>{dataHora(m.createdAt)}</span>
              {m.direcao === 'saida' ? <span>{descreverStatusMensagem(m.status)}</span> : null}
            </span>
          </div>
        ))}
        <div ref={fim} />
      </div>

      {podeResponder ? <Responder key={conversa.id} conversaId={conversa.id} executar={executar} /> : null}

      <details className="adm-detalhes" style={{ marginTop: 14 }} open={notas.length > 0}>
        <summary>Notas internas ({notas.length})</summary>
        <div className="adm-detalhes-corpo">
          {notas.map((n) => (
            <div key={n.id} className="adm-cs-nota">
              {n.corpo}
              <div className="adm-fraco">
                {n.autor} · {dataHora(n.createdAt)}
              </div>
            </div>
          ))}
          {podeResponder ? <NovaNota key={conversa.id} conversaId={conversa.id} executar={executar} /> : null}
        </div>
      </details>
    </div>
  )
}

function Responder({ conversaId, executar }: { conversaId: number; executar: Executar }): ReactNode {
  const [texto, setTexto] = useState('')
  const [comArquivo, setComArquivo] = useState(false)
  const [url, setUrl] = useState('')
  const [tipo, setTipo] = useState<string>(TIPOS_DE_MIDIA[0].chave)
  const [ocupado, setOcupado] = useState(false)

  async function enviar(): Promise<void> {
    setOcupado(true)
    const r = comArquivo ? await executar(() => enviarMidiaNoPainel(conversaId, url, tipo, texto)) : await executar(() => responderNoPainel(conversaId, texto))
    setOcupado(false)
    if (r.ok) {
      setTexto('')
      setUrl('')
    }
  }

  return (
    <form
      className="adm-cs-resposta"
      onSubmit={(e) => {
        e.preventDefault()
        void enviar()
      }}
    >
      {comArquivo ? (
        <div className="adm-form" style={{ marginBottom: 0 }}>
          <div className="field adm-campo-largo">
            <label htmlFor="cs-arquivo-url">Endereço público do arquivo</label>
            <input id="cs-arquivo-url" className="tinput" inputMode="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
          </div>
          <div className="field">
            <label htmlFor="cs-arquivo-tipo">Tipo</label>
            <select id="cs-arquivo-tipo" className="tinput" value={tipo} onChange={(e) => setTipo(e.target.value)}>
              {TIPOS_DE_MIDIA.map((t) => (
                <option key={t.chave} value={t.chave}>
                  {t.rotulo}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : null}
      <label htmlFor="cs-resposta" className="adm-fraco">
        {comArquivo ? 'Legenda (opcional)' : 'Resposta — Ctrl+Enter envia'}
      </label>
      <textarea
        id="cs-resposta"
        className="obs"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault()
            void enviar()
          }
        }}
      />
      <div className="adm-acoes">
        <button type="submit" className="btn btn-gold adm-btn-compacto" disabled={ocupado} data-uso="cs-responder">
          {ocupado ? 'Enviando…' : comArquivo ? 'Enviar arquivo' : 'Enviar'}
        </button>
        <button type="button" className="btn btn-outline adm-btn-compacto" onClick={() => setComArquivo(!comArquivo)}>
          {comArquivo ? 'Voltar ao texto' : 'Enviar arquivo'}
        </button>
      </div>
    </form>
  )
}

function NovaNota({ conversaId, executar }: { conversaId: number; executar: Executar }): ReactNode {
  const [corpo, setCorpo] = useState('')
  const [ocupado, setOcupado] = useState(false)
  return (
    <form
      className="adm-cs-resposta"
      onSubmit={async (e) => {
        e.preventDefault()
        setOcupado(true)
        const r = await executar(() => anotarConversaNoPainel(conversaId, corpo))
        setOcupado(false)
        if (r.ok) setCorpo('')
      }}
    >
      <label htmlFor="cs-nota" className="adm-fraco">
        Nota interna — só a equipe vê
      </label>
      <textarea id="cs-nota" className="obs" value={corpo} onChange={(e) => setCorpo(e.target.value)} />
      <div className="adm-acoes">
        <button type="submit" className="btn btn-outline adm-btn-compacto" disabled={ocupado}>
          Registrar nota
        </button>
      </div>
    </form>
  )
}

function Etiquetas({
  conversaId,
  marcadas,
  etiquetas,
  podeEditar,
  executar,
}: {
  conversaId: number
  marcadas: string[]
  etiquetas: EtiquetaGravada[]
  podeEditar: boolean
  executar: Executar
}): ReactNode {
  const [criando, setCriando] = useState(false)
  const [rotulo, setRotulo] = useState('')
  const [cor, setCor] = useState<CorEtiqueta>('ouro')

  if (!podeEditar) {
    const minhas = etiquetas.filter((e) => marcadas.includes(e.slug))
    return minhas.length ? (
      <div className="adm-etiquetas adm-secao">
        {minhas.map((e) => (
          <span key={e.slug} className={`adm-etiqueta adm-etiqueta-${e.cor}`}>
            {e.rotulo}
          </span>
        ))}
      </div>
    ) : null
  }

  return (
    <div className="adm-secao">
      <div className="adm-etiquetas" role="group" aria-label="Etiquetas da conversa">
        {etiquetas.map((e) => {
          const marcada = marcadas.includes(e.slug)
          return (
            <button
              key={e.slug}
              type="button"
              className={`adm-etiqueta adm-etiqueta-${e.cor} adm-etiqueta-botao`}
              aria-pressed={marcada}
              onClick={() => void executar(() => etiquetarConversaNoPainel(conversaId, e.slug, !marcada))}
            >
              {marcada ? '✓ ' : ''}
              {e.rotulo}
            </button>
          )
        })}
        <button type="button" className="adm-etiqueta adm-etiqueta-botao" onClick={() => setCriando(!criando)}>
          {criando ? 'Fechar' : '+ Etiqueta'}
        </button>
      </div>
      {criando ? (
        <form
          className="adm-form"
          style={{ marginTop: 10 }}
          onSubmit={async (e) => {
            e.preventDefault()
            const r = await executar(() => criarEtiquetaNoPainel(rotulo, cor))
            const slug = r.ok ? r.data?.slug : undefined
            if (slug) {
              setRotulo('')
              setCriando(false)
              await executar(() => etiquetarConversaNoPainel(conversaId, slug, true))
            }
          }}
        >
          <div className="field adm-campo-largo">
            <label htmlFor="cs-etiqueta-nova">Nova etiqueta</label>
            <input id="cs-etiqueta-nova" className="tinput" value={rotulo} maxLength={40} onChange={(e) => setRotulo(e.target.value)} placeholder="ex.: Retirada" />
          </div>
          <div className="field">
            <label htmlFor="cs-etiqueta-cor">Cor</label>
            <select id="cs-etiqueta-cor" className="tinput" value={cor} onChange={(e) => setCor(e.target.value as CorEtiqueta)}>
              {CORES_ETIQUETA.map((c) => (
                <option key={c} value={c}>
                  {NOME_DA_COR[c]}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn btn-gold adm-btn-compacto">
            Criar e aplicar
          </button>
        </form>
      ) : null}
    </div>
  )
}
