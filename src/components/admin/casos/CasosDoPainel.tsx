'use client'

/**
 * A fila de casos da equipe: filtros por estado e tipo, busca, a lista e a conversa do caso aberto.
 *
 * O FILTRO MORA NA URL (`?estado=&tipo=&q=&caso=`): a página é Server Component, relê a lista a cada mudança e o
 * link da conversa pode ser colado para outra pessoa da equipe. A tela se atualiza sozinha a cada 20 s
 * (`router.refresh`), parando com a aba escondida — o contador do menu acompanha porque é lido no layout.
 *
 * "Marcar como resolvido" e "Marcar como não resolvido" são reversíveis (o caso pode ser reaberto), então não
 * pedem confirmação. O cliente vê o estado e a resposta na área dele (src/components/atendimento/MeusCasos.tsx).
 */

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'

import { ESTADOS_DE_CASO, LIMITE_TEXTO, TIPOS_DE_CASO, estaEncerrado, rotuloDoEstado, rotuloDoTipo, type EstadoDoCaso, type FiltroDeCasos } from '@/domain/atendimento/casos'
import { mudarEstadoDoCasoNoPainel, responderCasoNoPainel } from '@/server/actions/admin/casos'
import type { CasoDetalhado } from '@/server/atendimento/casos'
import type { CasoGravado } from '@/server/db/repositories/casos'
import { ConversaDoCaso, quando } from '@/components/atendimento/ConversaDoCaso'

import { useAdmin } from '../AdminProvider'
import { Secao, Selo, Vazio, type Tom } from '../Pecas'

const TOM: Record<EstadoDoCaso, Tom> = { aberto: 'atencao', em_andamento: 'ouro', resolvido: 'ok', nao_resolvido: 'alerta' }

export function CasosDoPainel({
  casos,
  abertos,
  filtro,
  detalhe,
  podeResponder,
}: {
  casos: Array<CasoGravado & { ultimaMensagem: string | null }>
  abertos: number
  filtro: FiltroDeCasos
  detalhe: CasoDetalhado | null
  podeResponder: boolean
}): ReactNode {
  const router = useRouter()
  const pathname = usePathname()
  const atuais = useSearchParams()
  const { run } = useAdmin()
  const [busca, setBusca] = useState(filtro.busca)
  const [texto, setTexto] = useState('')
  const [ocupado, setOcupado] = useState(false)

  useEffect(() => {
    const t = window.setInterval(() => {
      if (!document.hidden) router.refresh()
    }, 20_000)
    return () => window.clearInterval(t)
  }, [router])

  function ir(mudancas: Record<string, string | null>): void {
    const p = new URLSearchParams(atuais.toString())
    for (const [k, v] of Object.entries(mudancas)) {
      if (v) p.set(k, v)
      else p.delete(k)
    }
    const q = p.toString()
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false })
  }

  async function responder(e: FormEvent): Promise<void> {
    e.preventDefault()
    if (!detalhe || ocupado || !texto.trim()) return
    setOcupado(true)
    const r = await run(() => responderCasoNoPainel(detalhe.caso.id, texto))
    setOcupado(false)
    if (r.ok) setTexto('')
  }

  async function mudar(gesto: 'resolvido' | 'nao_resolvido' | 'reabrir'): Promise<void> {
    if (!detalhe || ocupado) return
    setOcupado(true)
    await run(() => mudarEstadoDoCasoNoPainel(detalhe.caso.id, gesto))
    setOcupado(false)
  }

  const aberto = detalhe?.caso ?? null

  return (
    <div className="adm-pagina">
      <Secao id="casos-fila" titulo="Casos" descricao={`${abertos} ${abertos === 1 ? 'caso espera' : 'casos esperam'} resposta da equipe.`}>
        <div className="adm-abas atd-abas" role="group" aria-label="Estado do caso">
          {[{ chave: 'todos', rotulo: 'Todos' }, ...ESTADOS_DE_CASO].map((e) => (
            <button key={e.chave} type="button" className={filtro.estado === e.chave ? 'chart-tab on' : 'chart-tab'} aria-pressed={filtro.estado === e.chave} onClick={() => ir({ estado: e.chave === 'todos' ? null : e.chave, caso: null })}>
              {e.rotulo}
            </button>
          ))}
        </div>
        <div className="adm-abas atd-abas" role="group" aria-label="Tipo do caso">
          {[{ chave: 'todos', rotulo: 'Todos os tipos' }, ...TIPOS_DE_CASO].map((t) => (
            <button key={t.chave} type="button" className={filtro.tipo === t.chave ? 'chart-tab on' : 'chart-tab'} aria-pressed={filtro.tipo === t.chave} onClick={() => ir({ tipo: t.chave === 'todos' ? null : t.chave, caso: null })}>
              {t.rotulo}
            </button>
          ))}
        </div>
        <form
          className="adm-form"
          onSubmit={(e) => {
            e.preventDefault()
            ir({ q: busca.trim() || null, caso: null })
          }}
        >
          <div className="field adm-campo-largo">
            <label htmlFor="casos-busca">Buscar por texto ou e-mail do cliente</label>
            <input id="casos-busca" type="search" className="tinput" autoComplete="off" spellCheck={false} value={busca} onChange={(e) => setBusca(e.target.value)} />
          </div>
          <button type="submit" className="btn btn-outline adm-btn-compacto">
            Buscar
          </button>
        </form>
      </Secao>

      <div className="atd-pagina" style={{ marginTop: 'var(--ro-esp-5)' }}>
        <div className="atd-lista-col">
          {casos.length === 0 ? (
            <Vazio titulo="Nenhum caso por aqui">{filtro.estado !== 'todos' || filtro.tipo !== 'todos' || filtro.busca ? 'Nenhum caso combina com o filtro. Limpe os filtros para ver todos.' : 'Quando um cliente escrever pelo botão Atendimento, o caso aparece nesta lista.'}</Vazio>
          ) : (
            <ul className="atd-lista" aria-label="Casos">
              {casos.map((c) => (
                <li key={c.id}>
                  <button type="button" className="atd-item" aria-current={c.id === aberto?.id ? 'true' : undefined} onClick={() => ir({ caso: String(c.id) })} data-uso="casos:abrir">
                    <span className="atd-item-topo">
                      <span className="atd-item-titulo">{c.titulo}</span>
                      <Selo tom={TOM[c.estado]}>{rotuloDoEstado(c.estado)}</Selo>
                    </span>
                    <span className="atd-item-meta">
                      {rotuloDoTipo(c.tipo)} · {c.userEmail} · {quando(c.atualizadoEm)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          {detalhe && aberto ? (
            <Secao
              id="caso-conversa"
              titulo={aberto.titulo}
              descricao={
                <>
                  {rotuloDoTipo(aberto.tipo)} · {aberto.userEmail}
                  {aberto.paginaOrigem ? <> · página <code>{aberto.paginaOrigem}</code></> : null} · aberto em {quando(aberto.criadoEm)}
                </>
              }
              acoes={<Selo tom={TOM[aberto.estado]}>{rotuloDoEstado(aberto.estado)}</Selo>}
            >
              <ConversaDoCaso mensagens={detalhe.mensagens} eu="equipe" />
              {podeResponder ? (
                <>
                  <form className="atd-compor" onSubmit={(e) => void responder(e)} noValidate>
                    <div className="field">
                      <label htmlFor="caso-resposta">Responder ao cliente</label>
                      <textarea id="caso-resposta" className="obs" rows={4} maxLength={LIMITE_TEXTO} value={texto} onChange={(e) => setTexto(e.target.value)} />
                    </div>
                    <button type="submit" className="btn btn-gold" disabled={ocupado || !texto.trim()} data-uso="casos:responder">
                      Enviar resposta
                    </button>
                  </form>
                  <div className="atd-estado-acoes" role="group" aria-label="Marcar o caso" style={{ marginTop: 'var(--ro-esp-4)' }}>
                    {estaEncerrado(aberto.estado) ? (
                      <button type="button" className="btn btn-outline" disabled={ocupado} onClick={() => void mudar('reabrir')} data-uso="casos:reabrir">
                        Reabrir caso
                      </button>
                    ) : null}
                    {aberto.estado !== 'resolvido' ? (
                      <button type="button" className="btn btn-outline" disabled={ocupado} onClick={() => void mudar('resolvido')} data-uso="casos:resolvido">
                        Marcar como resolvido
                      </button>
                    ) : null}
                    {aberto.estado !== 'nao_resolvido' ? (
                      <button type="button" className="btn btn-outline" disabled={ocupado} onClick={() => void mudar('nao_resolvido')} data-uso="casos:nao-resolvido">
                        Marcar como não resolvido
                      </button>
                    ) : null}
                  </div>
                </>
              ) : null}
            </Secao>
          ) : (
            <Vazio titulo="Escolha um caso">Toque em um caso da lista para ler a conversa, responder e marcar o estado.</Vazio>
          )}
        </div>
      </div>
    </div>
  )
}
