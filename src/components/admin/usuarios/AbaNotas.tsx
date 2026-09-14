'use client'

/**
 * A aba Notas da ficha: as notas internas da equipe sobre a conta (append-only — corrige-se
 * com nota nova) e as conversas do atendimento ligadas a ela, com o atalho para abrir cada uma.
 */

import Link from 'next/link'
import { useState } from 'react'
import type { ReactNode } from 'react'

import { formatarTelefoneE164 } from '@/domain/admin/telefone'
import type { AbaNotas as DadosAbaNotas } from '@/server/admin/ficha'
import { anotarUsuarioNoPainel } from '@/server/actions/admin/usuarios'

import { useAdmin } from '../AdminProvider'
import { dataHora } from '../formatos'

export function AbaNotas({ email, dados, semBanco }: { email: string; dados: DadosAbaNotas; semBanco: boolean }): ReactNode {
  const { pode, run } = useAdmin()
  const [corpo, setCorpo] = useState('')
  const [ocupado, setOcupado] = useState(false)

  return (
    <>
      <div className="adm-subtitulo">Notas internas</div>
      {dados.notas === null ? (
        <p className="adm-fraco">{semBanco ? 'As notas existem só com banco configurado.' : 'Notas indisponíveis — a migration 023 já rodou neste banco?'}</p>
      ) : (
        <>
          {pode('usuarios.editar') ? (
            <form
              className="adm-cs-resposta adm-secao"
              onSubmit={async (e) => {
                e.preventDefault()
                setOcupado(true)
                const r = await run(() => anotarUsuarioNoPainel(email, corpo))
                setOcupado(false)
                if (r.ok) setCorpo('')
              }}
            >
              <label htmlFor="nota-usuario" className="adm-fraco">
                Nova nota — só a equipe vê
              </label>
              <textarea id="nota-usuario" className="obs" value={corpo} onChange={(e) => setCorpo(e.target.value)} />
              <div className="adm-acoes">
                <button type="submit" className="btn btn-gold adm-btn-compacto" disabled={ocupado}>
                  Registrar nota
                </button>
              </div>
            </form>
          ) : null}
          {dados.notas.length ? (
            dados.notas.map((n) => (
              <div key={n.id} className="adm-cs-nota">
                {n.corpo}
                <div className="adm-fraco">
                  {n.autor} · {dataHora(n.createdAt)}
                </div>
              </div>
            ))
          ) : (
            <p className="adm-fraco">Nenhuma nota sobre esta conta.</p>
          )}
        </>
      )}

      <div className="adm-subtitulo">Conversas no atendimento</div>
      {dados.conversas === null ? (
        <p className="adm-fraco">{semBanco ? 'O atendimento existe só com banco configurado.' : 'Conversas indisponíveis agora.'}</p>
      ) : dados.conversas.length ? (
        <ul className="adm-lista">
          {dados.conversas.map((c) => (
            <li key={c.id}>
              {pode('cs.ver') ? <Link href={`/admin/cs?conversa=${c.id}`}>{c.contato.nome || formatarTelefoneE164(c.contato.telefone)}</Link> : c.contato.nome || formatarTelefoneE164(c.contato.telefone)}
              <span className="adm-fraco">
                {' '}
                · {c.status} · última mensagem {dataHora(c.ultimaMensagemEm)}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="adm-fraco">Nenhuma conversa ligada a esta conta.</p>
      )}
    </>
  )
}
