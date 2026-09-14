'use client'

/**
 * A tela de CS — três colunas: conversas, a conversa aberta e o cartão do cliente (plano do
 * Admin, seção 2.5).
 *
 * POLLING DE 5 SEGUNDOS, e não SSE nem websocket: o app já usa polling de 10s no
 * `AppProvider`, é o padrão da casa e não pede infraestrutura nova (notificação em tempo
 * real está em "fica para depois", seção 9). A volta pede ao servidor a caixa e a conversa
 * aberta — duas consultas curtas no banco. O cartão do cliente lê o AppState inteiro, então
 * ele só vem ao trocar de conversa e a cada seis voltas (meio minuto). Aba escondida não
 * pergunta nada.
 *
 * RESPOSTA ATRASADA NÃO SOBRESCREVE A NOVA. Cada volta leva um número; se o atendente troca
 * de conversa enquanto uma volta está no ar, a resposta velha chega e é descartada.
 *
 * O estado da tela (filtro e conversa) mora na URL, atualizada sem navegação
 * (`history.replaceState`): o link copiado abre a mesma conversa, e trocar de conversa não
 * refaz a página inteira no servidor.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

import type { FiltroConversas } from '@/domain/admin/cs'
import type { ActionResult } from '@/domain/types'
import type { DadosAtendimento } from '@/server/admin/atendimento'
import { atualizarAtendimentoNoPainel } from '@/server/actions/admin/cs'
import { useToast } from '@/components/ui/Toast'

import { CartaoDoCliente } from './CartaoDoCliente'
import { Conversa } from './Conversa'
import { ListaDeConversas } from './ListaDeConversas'

const INTERVALO_MS = 5_000
const VOLTAS_POR_CLIENTE = 6
const FALHA = 'Falha ao salvar dados. Tente novamente.'

export type Executar = <T>(fn: () => Promise<ActionResult<T>>) => Promise<ActionResult<T>>

export interface PropsCaixa {
  inicial: DadosAtendimento
  filtroInicial: FiltroConversas
  conversaInicial: number | null
  equipe: Array<{ email: string; nome: string }>
}

function urlDoEstado(filtro: FiltroConversas, conversaId: number | null): string {
  const q = new URLSearchParams()
  if (filtro.status) q.set('status', filtro.status)
  if (filtro.responsavel) q.set('responsavel', filtro.responsavel)
  if (filtro.etiqueta) q.set('etiqueta', filtro.etiqueta)
  if (filtro.busca) q.set('busca', filtro.busca)
  if (filtro.soNaoLidas) q.set('naolidas', '1')
  if (conversaId) q.set('conversa', String(conversaId))
  const texto = q.toString()
  return texto ? `/admin/cs?${texto}` : '/admin/cs'
}

export function CaixaDeAtendimento({ inicial, filtroInicial, conversaInicial, equipe }: PropsCaixa): ReactNode {
  const toast = useToast()
  const [dados, setDados] = useState(inicial)
  const [filtro, setFiltro] = useState(filtroInicial)
  const [conversaId, setConversaId] = useState(conversaInicial)
  // O cartão guarda de qual conversa ele é: ao trocar, o cartão velho some antes de o novo chegar.
  const [cliente, setCliente] = useState({ de: conversaInicial, resumo: inicial.cliente })

  const sequencia = useRef(0)
  const voltas = useRef(1)
  const clienteDe = useRef<number | null>(conversaInicial)

  const atualizar = useCallback(
    async (forcarCliente = false): Promise<void> => {
      const minha = ++sequencia.current
      const incluirCliente = forcarCliente || clienteDe.current !== conversaId || voltas.current % VOLTAS_POR_CLIENTE === 0
      voltas.current += 1
      try {
        const r = await atualizarAtendimentoNoPainel(filtro, conversaId, incluirCliente)
        if (minha !== sequencia.current || !r.ok || !r.data) return
        setDados(r.data)
        if (incluirCliente) {
          setCliente({ de: conversaId, resumo: r.data.cliente })
          clienteDe.current = conversaId
        }
      } catch {
        // Rede oscilou ou o deploy trocou: a próxima volta tenta de novo.
      }
    },
    [filtro, conversaId],
  )

  useEffect(() => {
    const id = window.setInterval(() => {
      if (!document.hidden) void atualizar()
    }, INTERVALO_MS)
    return () => window.clearInterval(id)
  }, [atualizar])

  // Filtro ou conversa mudou: atualiza na hora e grava na URL. A primeira pintura já veio
  // pronta do servidor, então a primeira passada não pergunta nada.
  const primeiraPassada = useRef(true)
  useEffect(() => {
    if (primeiraPassada.current) {
      primeiraPassada.current = false
      return
    }
    window.history.replaceState(null, '', urlDoEstado(filtro, conversaId))
    void atualizar(true)
  }, [atualizar, filtro, conversaId])

  const executar: Executar = useCallback(
    async <T,>(fn: () => Promise<ActionResult<T>>): Promise<ActionResult<T>> => {
      let r: ActionResult<T>
      try {
        r = await fn()
      } catch {
        r = { ok: false, error: FALHA }
      }
      const msg = r.ok ? r.message : r.error
      if (msg) toast(msg)
      await atualizar(true)
      return r
    },
    [atualizar, toast],
  )

  if (dados.semBanco) {
    return (
      <div className="note adm-secao">
        <span>
          Este ambiente está sem <code>POSTGRES_URL</code>: o atendimento guarda as conversas no banco, e sem ele não há caixa
          de conversas.
        </span>
      </div>
    )
  }
  if (dados.semTabelas) {
    return (
      <div className="panel adm-aviso" role="alert">
        <h3>O banco ainda não tem as tabelas do atendimento</h3>
        <p>
          As migrations <code>022_cs_mensageria.sql</code> e <code>023_notas_e_atribuicoes.sql</code> ainda não rodaram neste
          banco. Quem tem acesso ao terminal roda <code>npm run db:migrate</code> e a tela abre.
        </p>
      </div>
    )
  }

  const aberta = dados.aberta && dados.aberta.conversa.id === conversaId ? dados.aberta : null

  return (
    <div className="adm-cs">
      <div className="adm-cs-lista">
        <ListaDeConversas
          caixa={dados.caixa}
          filtro={filtro}
          aoFiltrar={(f) => setFiltro(f)}
          conversaId={conversaId}
          aoAbrir={(id) => setConversaId(id)}
          equipe={equipe}
          executar={executar}
        />
      </div>
      <div className="adm-cs-thread">
        <Conversa aberta={aberta} carregando={conversaId !== null && !aberta} canal={dados.canal} etiquetas={dados.caixa?.etiquetas ?? []} equipe={equipe} executar={executar} />
      </div>
      <div className="adm-cs-cliente">
        <CartaoDoCliente aberta={aberta} cliente={aberta && cliente.de === aberta.conversa.id ? cliente.resumo : null} canal={dados.canal} executar={executar} />
      </div>
    </div>
  )
}
