'use client'

/**
 * O formulário da entrada do painel (/painel). Mesmas Server Actions de /entrar — `login` e
 * `loginWithGoogle` —, com duas diferenças: o destino é /admin, e a conta logada que não é da
 * equipe recebe a explicação em vez de ser mandada para o site do cliente.
 *
 * Depois do login por senha, a página é recarregada em /admin: se a conta for da equipe, o
 * painel abre; se não for, o guarda de /admin devolve para cá, agora com a conta conhecida.
 */

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'

import { LOGO_AUREA } from '@/domain/constants'
import { login, loginWithGoogle, logout } from '@/server/actions/auth'

const ERRO_GENERICO = 'Não foi possível entrar. Tente novamente.'

export function EntradaDoPainel({ contaSemAcesso }: { contaSemAcesso: string | null }): ReactNode {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function entrar(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    if (enviando) return
    setEnviando(true)
    setErro('')
    try {
      const r = await login(email, senha)
      if (!r.ok) {
        setErro(r.error ?? ERRO_GENERICO)
        return
      }
      router.push('/admin')
      router.refresh()
    } finally {
      setEnviando(false)
    }
  }

  async function entrarGoogle(): Promise<void> {
    if (enviando) return
    setEnviando(true)
    setErro('')
    try {
      const r = await loginWithGoogle('/admin')
      if (!r.ok || !r.data?.redirectTo) {
        setErro(r.error ?? ERRO_GENERICO)
        return
      }
      window.location.assign(r.data.redirectTo)
    } finally {
      setEnviando(false)
    }
  }

  async function sair(): Promise<void> {
    if (enviando) return
    setEnviando(true)
    try {
      await logout()
      router.refresh()
    } finally {
      setEnviando(false)
    }
  }

  return (
    <main className="login-wrap auth-page">
      <section className="login-card" aria-labelledby="painel-titulo">
        <Link className="auth-brand-link" href="/" aria-label="Voltar para a página inicial">
          <Image src={LOGO_AUREA} alt="Áurea Custódia" width={120} height={120} priority />
        </Link>

        <h1 className="login-title" id="painel-titulo">
          Painel administrativo
        </h1>

        {contaSemAcesso ? (
          <>
            <p className="login-sub">
              Você está conectado como <strong>{contaSemAcesso}</strong>, e esta conta não faz parte da equipe do painel.
            </p>
            <p className="login-sub">
              Entre com uma conta da equipe, ou peça a quem já é da equipe para dar acesso a este e-mail em <em>Equipe e papéis</em>.
            </p>
            <div className="auth-feedback" aria-live="polite">
              {erro ? <p className="login-error">{erro}</p> : null}
            </div>
            <button className="btn btn-gold" type="button" disabled={enviando} onClick={() => void sair()}>
              {enviando ? 'Saindo…' : 'Sair e entrar com outra conta'}
            </button>
            <p className="auth-switch">
              <Link href="/inicio">Ir para o site</Link>
            </p>
          </>
        ) : (
          <>
            <p className="login-sub">Acesso da equipe da Áurea. Use a mesma conta do site.</p>
            <form onSubmit={(event) => void entrar(event)}>
              <div className="field">
                <label htmlFor="painelEmail">E-mail</label>
                <input
                  id="painelEmail"
                  type="email"
                  placeholder="seuemail@aureacustodia.com.br"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="painelSenha">Senha</label>
                <input
                  id="painelSenha"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  value={senha}
                  onChange={(event) => setSenha(event.target.value)}
                />
              </div>
              <div className="auth-feedback" aria-live="polite">
                {erro ? <p className="login-error">{erro}</p> : null}
              </div>
              <button className="btn btn-gold" type="submit" disabled={enviando}>
                {enviando ? 'Entrando…' : 'Entrar no painel'}
              </button>
              <div className="auth-divider" aria-hidden="true">
                <span>ou</span>
              </div>
              <button className="btn btn-outline auth-google" type="button" disabled={enviando} onClick={() => void entrarGoogle()}>
                Entrar com Google
              </button>
            </form>
            <p className="auth-switch">
              <Link href="/entrar">Entrar no site do cliente</Link>
            </p>
          </>
        )}
      </section>
    </main>
  )
}
