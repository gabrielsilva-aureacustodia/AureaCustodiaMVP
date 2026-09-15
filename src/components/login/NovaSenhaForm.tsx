'use client'

/**
 * Formulário da redefinição de senha.
 *
 * A validação da identidade permanece na Server Action; este componente guarda
 * apenas os campos e apresenta o resultado sem levar o cliente do Supabase ao navegador.
 */

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'

import { LOGO_AUREA } from '@/domain/constants'
import { definirNovaSenha } from '@/server/actions/auth'

const ERRO_GENERICO = 'Não foi possível salvar a senha nova. Tente novamente.'

interface NovaSenhaFormProps {
  email: string
  destino: '/inicio' | '/admin'
}

export function NovaSenhaForm({ email, destino }: NovaSenhaFormProps): ReactNode {
  const router = useRouter()
  const [nova, setNova] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [erro, setErro] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function salvar(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    if (enviando) return
    setEnviando(true)
    setErro('')
    setMensagem('')

    try {
      const result = await definirNovaSenha(nova, confirmacao)
      if (!result.ok) {
        setErro(result.error ?? ERRO_GENERICO)
        return
      }
      setMensagem(result.message ?? 'Senha nova salva.')
      router.push(destino)
      router.refresh()
    } finally {
      setEnviando(false)
    }
  }

  return (
    <main className="login-wrap auth-page">
      <section className="login-card" aria-labelledby="nova-senha-title">
        <Link className="auth-brand-link" href="/" aria-label="Voltar para a página inicial">
          <Image src={LOGO_AUREA} alt="Áurea Custódia" width={120} height={120} priority />
        </Link>

        <h1 className="login-title" id="nova-senha-title">
          Defina sua nova senha
        </h1>
        <p className="login-sub">Conta: {email}</p>

        <form onSubmit={(event) => void salvar(event)}>
          <div className="field">
            <label htmlFor="novaSenha">Nova senha</label>
            <input
              id="novaSenha"
              type="password"
              autoComplete="new-password"
              required
              value={nova}
              onChange={(event) => setNova(event.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="confirmarNovaSenha">Confirme a nova senha</label>
            <input
              id="confirmarNovaSenha"
              type="password"
              autoComplete="new-password"
              required
              value={confirmacao}
              onChange={(event) => setConfirmacao(event.target.value)}
            />
          </div>

          <div className="auth-feedback" aria-live="polite">
            {erro ? <p className="login-error">{erro}</p> : null}
            {mensagem ? <p className="auth-success">{mensagem}</p> : null}
          </div>

          <button className="btn btn-gold" type="submit" disabled={enviando}>
            {enviando ? 'Salvando…' : 'Salvar nova senha'}
          </button>
        </form>

        <p className="auth-switch">
          <Link href={destino}>Continuar sem trocar</Link>
        </p>
        <p className="env-tag">Ambiente de teste · Pré-MVP · Dados fictícios</p>
      </section>
    </main>
  )
}
