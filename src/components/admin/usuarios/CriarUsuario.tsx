'use client'

/**
 * Criar conta pelo painel (plano do Admin, seção 2.6): e-mail, nome, senha provisória
 * opcional e o saldo e as moedas de demonstração, como no cadastro pelo site.
 *
 * A senha provisória vai direto para o Supabase Auth pela Server Action e não fica em lugar
 * nenhum da plataforma (RA-43). Sem ela, o login nasce sem senha e a pessoa a define pelo link
 * de redefinição, que sai da ficha.
 */

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { ReactNode } from 'react'

import { criarUsuarioNoPainel } from '@/server/actions/admin/usuarios'

import { useAdmin } from '../AdminProvider'

export function CriarUsuario(): ReactNode {
  const { run } = useAdmin()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [nome, setNome] = useState('')
  const [senha, setSenha] = useState('')
  const [ocupado, setOcupado] = useState(false)

  return (
    <details className="adm-detalhes adm-secao">
      <summary>Criar conta</summary>
      <div className="adm-detalhes-corpo">
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            setOcupado(true)
            const r = await run(() => criarUsuarioNoPainel({ email, nome, senha, demonstracao: false }))
            setOcupado(false)
            if (r.ok && r.data?.email) router.push(`/admin/usuarios/${encodeURIComponent(r.data.email)}`)
          }}
        >
          <div className="adm-form">
            <div className="field adm-campo-largo">
              <label htmlFor="novo-email">E-mail</label>
              <input id="novo-email" className="tinput" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" />
            </div>
            <div className="field adm-campo-largo">
              <label htmlFor="novo-nome">Nome</label>
              <input id="novo-nome" className="tinput" value={nome} onChange={(e) => setNome(e.target.value)} autoComplete="off" />
            </div>
            <div className="field">
              <label htmlFor="novo-senha">Senha provisória (opcional)</label>
              <input id="novo-senha" className="tinput" type="text" value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="new-password" />
            </div>
          </div>
          <div className="adm-acoes" style={{ marginTop: 10 }}>
            <button type="submit" className="btn btn-gold adm-btn-compacto" disabled={ocupado} data-uso="usuarios-criar">
              {ocupado ? 'Criando…' : 'Criar conta'}
            </button>
          </div>
        </form>
      </div>
    </details>
  )
}
