'use client'

/**
 * "Atendimento" na área do cliente: os pedidos que ele fez, a conversa de cada um e o estado que a equipe
 * deu. Lista à esquerda, conversa à direita; no celular uma de cada vez (o caso aberto esconde a lista).
 *
 * O cliente pode escrever em qualquer caso, inclusive nos encerrados — isso o devolve à fila da equipe
 * (estadoDepoisDe). A tela relê a lista e o caso aberto a cada 15 s, parando enquanto a aba está escondida.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'

import { LIMITE_TEXTO, rotuloDoEstado, rotuloDoTipo, type EstadoDoCaso } from '@/domain/atendimento/casos'
import { listarMeusCasosAction, responderMeuCasoAction, verMeuCasoAction } from '@/server/actions/atendimento'
import type { CasoGravado, MensagemDeCaso } from '@/server/db/repositories/casos'
import { Aviso } from '@/components/ui/Aviso'
import { EstadoVazio } from '@/components/ui/EstadoVazio'
import { Selo, type TomDoSelo } from '@/components/ui/Selo'

import { ConversaDoCaso, quando } from './ConversaDoCaso'

export const TOM_DO_ESTADO: Record<EstadoDoCaso, TomDoSelo> = { aberto: 'info', em_andamento: 'ouro', resolvido: 'sucesso', nao_resolvido: 'perigo' }

export function MeusCasos({ inicial, falhou }: { inicial: CasoGravado[]; falhou: boolean }): ReactNode {
  const [casos, setCasos] = useState<CasoGravado[]>(inicial)
  const [aberto, setAberto] = useState<number | null>(null)
  const [mensagens, setMensagens] = useState<MensagemDeCaso[]>([])
  const [carregando, setCarregando] = useState(false)
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(falhou ? 'Não foi possível carregar os seus pedidos agora.' : null)
  const titulo = useRef<HTMLHeadingElement>(null)

  const relerLista = useCallback(async () => {
    const r = await listarMeusCasosAction()
    if (r.ok && r.data) setCasos(r.data.casos)
  }, [])

  const abrir = useCallback(async (id: number, foco = false) => {
    setAberto(id)
    setCarregando(true)
    setErro(null)
    const r = await verMeuCasoAction(id)
    setCarregando(false)
    if (!r.ok) {
      setErro(r.error ?? 'Caso não encontrado.')
      return
    }
    const d = r.data
    if (!d) {
      setErro('Caso não encontrado.')
      return
    }
    setMensagens(d.mensagens)
    setCasos((cs) => cs.map((c) => (c.id === id ? d.caso : c)))
    if (foco) window.setTimeout(() => titulo.current?.focus(), 0)
  }, [])

  useEffect(() => {
    const t = window.setInterval(() => {
      if (document.hidden) return
      void relerLista()
      if (aberto !== null) void verMeuCasoAction(aberto).then((r) => r.ok && r.data && setMensagens(r.data.mensagens))
    }, 15_000)
    return () => window.clearInterval(t)
  }, [aberto, relerLista])

  async function responder(e: FormEvent): Promise<void> {
    e.preventDefault()
    if (aberto === null || enviando) return
    if (!texto.trim()) {
      setErro('Escreva a mensagem.')
      return
    }
    setEnviando(true)
    setErro(null)
    const r = await responderMeuCasoAction(aberto, texto)
    setEnviando(false)
    if (!r.ok) {
      setErro(r.error ?? 'Não foi possível enviar.')
      return
    }
    setTexto('')
    await Promise.all([abrir(aberto), relerLista()])
  }

  const atual = casos.find((c) => c.id === aberto) ?? null

  if (casos.length === 0) {
    return (
      <div className="panel">
        {erro ? <Aviso tom="perigo">{erro}</Aviso> : null}
        <EstadoVazio titulo="Você ainda não fez nenhum pedido.">
          Use o botão Atendimento, no canto da tela, para tirar uma dúvida, fazer um pedido, reclamar ou avisar de um erro. A resposta da equipe aparece aqui.
        </EstadoVazio>
      </div>
    )
  }

  return (
    <div className={atual ? 'atd-pagina com-caso' : 'atd-pagina'}>
      <div className="atd-lista-col">
        <ul className="atd-lista" aria-label="Meus pedidos">
          {casos.map((c) => {
            const novo = c.ultimaDaEquipeEm !== null && c.ultimaDaEquipeEm > c.clienteViuAte
            return (
              <li key={c.id}>
                <button type="button" className="atd-item" aria-current={c.id === aberto ? 'true' : undefined} onClick={() => void abrir(c.id, true)}>
                  <span className="atd-item-topo">
                    <span className="atd-item-titulo">
                      {novo ? <span className="atd-novo" role="img" aria-label="Resposta nova" /> : null}
                      {c.titulo}
                    </span>
                    <Selo tom={TOM_DO_ESTADO[c.estado]}>{rotuloDoEstado(c.estado)}</Selo>
                  </span>
                  <span className="atd-item-meta">
                    {rotuloDoTipo(c.tipo)} · {quando(c.atualizadoEm)}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      <section className="panel" aria-live="polite" aria-busy={carregando}>
        {atual ? (
          <>
            <div className="atd-detalhe-cab">
              <button type="button" className="btn btn-ghost atd-voltar" onClick={() => setAberto(null)}>
                ← Meus pedidos
              </button>
              <h2 ref={titulo} tabIndex={-1}>
                {atual.titulo}
              </h2>
              <Selo tom={TOM_DO_ESTADO[atual.estado]}>{rotuloDoEstado(atual.estado)}</Selo>
            </div>
            {carregando && mensagens.length === 0 ? <p>Carregando a conversa…</p> : <ConversaDoCaso mensagens={mensagens} eu="cliente" />}
            {erro ? <Aviso tom="perigo">{erro}</Aviso> : null}
            <form className="atd-compor" onSubmit={(e) => void responder(e)} noValidate>
              <div className="field">
                <label htmlFor="atd-responder">{atual.estado === 'resolvido' || atual.estado === 'nao_resolvido' ? 'Escrever de novo (reabre o pedido)' : 'Sua resposta'}</label>
                <textarea id="atd-responder" className="obs" rows={3} maxLength={LIMITE_TEXTO} value={texto} onChange={(e) => setTexto(e.target.value)} />
              </div>
              <button type="submit" className="btn btn-gold" disabled={enviando}>
                {enviando ? 'Enviando…' : 'Enviar'}
              </button>
            </form>
          </>
        ) : (
          <EstadoVazio titulo="Escolha um pedido">Toque em um pedido da lista para ler a conversa e responder.</EstadoVazio>
        )}
      </section>
    </div>
  )
}
