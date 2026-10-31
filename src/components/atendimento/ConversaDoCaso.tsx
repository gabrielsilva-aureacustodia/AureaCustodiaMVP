'use client'

/**
 * A conversa de um caso, igual para o cliente (área logada) e para a equipe (painel): mensagens em ordem,
 * a do próprio lado à direita. O anexo é imagem servida por /api/atendimento/anexo/<id>, que só o dono e a
 * equipe conseguem abrir. `<img>` simples: a rota exige sessão e o otimizador do Next não a enxergaria.
 */

import type { ReactNode } from 'react'

import type { AutorDaMensagem } from '@/domain/atendimento/casos'
import type { MensagemDeCaso } from '@/server/db/repositories/casos'

export function quando(ms: number): string {
  return new Date(ms).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
}

export function ConversaDoCaso({ mensagens, eu }: { mensagens: readonly MensagemDeCaso[]; eu: AutorDaMensagem }): ReactNode {
  return (
    <ol className="atd-conversa" aria-label="Conversa do caso">
      {mensagens.map((m) => (
        <li key={m.id} className={m.autor === eu ? 'atd-msg atd-msg-eu' : 'atd-msg'}>
          <div className="atd-msg-quem">
            <b>{m.autor === 'equipe' ? 'Equipe Real Olímpico' : eu === 'cliente' ? 'Você' : m.autorEmail}</b>
            <time dateTime={new Date(m.criadoEm).toISOString()}>{quando(m.criadoEm)}</time>
          </div>
          <p className="atd-msg-texto">{m.texto}</p>
          {m.anexo ? (
            // eslint-disable-next-line @next/next/no-img-element -- rota autenticada; o otimizador não tem a sessão
            <img className="atd-msg-img" src={`/api/atendimento/anexo/${m.anexo.id}`} alt={`Imagem anexada: ${m.anexo.nome}`} />
          ) : null}
        </li>
      ))}
    </ol>
  )
}
