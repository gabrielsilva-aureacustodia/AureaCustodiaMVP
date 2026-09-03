'use client'

/**
 * Formulário de cadastro SIMULADO — a porta de entrada da conta de demonstração.
 *
 * Reaproveita as classes de `src/styles/login.css` (`login-wrap`, `login-card`,
 * `field`, `pw-wrap`) em vez de trazer CSS novo: a tela precisa parecer a mesma
 * plataforma, e uma folha de estilo própria para uma tela provisória seria
 * dívida a mais para remover quando a frente A entrar.
 *
 * O aviso de ambiente fictício é obrigatório e fica ACIMA do botão. Um
 * formulário de cadastro que não diz que é simulação convida a pessoa a digitar
 * uma senha de verdade — e este ambiente guarda senha em texto puro (RA-02).
 *
 * Nada de `@/server/*` aqui além da própria Server Action: importar o estado
 * ou a sessão puxaria segredo para o bundle do navegador, e o `server-only`
 * quebraria o build.
 */

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'

import { LOGO_AUREA } from '@/domain/constants'
import { criarContaSimulada } from '@/server/actions/signup'

const ERRO_GENERICO = 'Não foi possível criar a conta. Tente novamente.'

export function SignupForm(): ReactNode {
  const router = useRouter()

  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [erro, setErro] = useState('')
  // Sem esta trava, um duplo clique dispara duas criações; a segunda recebe
  // "e-mail já em uso" e mostraria erro numa conta que acabou de dar certo.
  const [enviando, setEnviando] = useState(false)

  const criar = useCallback(
    async (e: FormEvent): Promise<void> => {
      // O <form> existe para o Enter funcionar em qualquer campo, como se espera
      // de um cadastro. O preventDefault evita a navegação nativa do navegador.
      e.preventDefault()
      if (enviando) return
      setEnviando(true)
      try {
        const r = await criarContaSimulada(nome, email, senha, confirmacao)
        if (!r.ok) {
          setErro(r.error ?? ERRO_GENERICO)
          return
        }
        setErro('')
        router.push('/inicio')
        // A Server Action gravou o cookie de sessão, mas a árvore de '/inicio'
        // pode estar em cache renderizada sem ele. Sem o refresh, o guarda do
        // (app)/layout devolveria a pessoa para a tela de entrada.
        router.refresh()
      } finally {
        setEnviando(false)
      }
    },
    [nome, email, senha, confirmacao, enviando, router],
  )

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={(e) => void criar(e)}>
        <div className="logo-box logo-login">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOGO_AUREA} alt="Áurea Custódia" />
        </div>

        <div className="login-title">Criar conta de demonstração</div>
        <div className="login-sub">
          A conta nasce com saldo e moedas fictícios, só para conhecer a plataforma.
        </div>

        <div className="field">
          <label htmlFor="signupNome">Nome</label>
          <input
            id="signupNome"
            type="text"
            placeholder="Seu nome"
            autoComplete="name"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="signupEmail">E-mail</label>
          <input
            id="signupEmail"
            type="email"
            placeholder="seuemail@exemplo.com.br"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="signupSenha">Senha</label>
          <div className="pw-wrap">
            <input
              id="signupSenha"
              type="password"
              placeholder="mínimo de 8 caracteres"
              autoComplete="new-password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
            />
          </div>
        </div>

        <div className="field">
          <label htmlFor="signupConfirmacao">Repita a senha</label>
          <div className="pw-wrap">
            <input
              id="signupConfirmacao"
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
              value={confirmacao}
              onChange={(e) => setConfirmacao(e.target.value)}
            />
          </div>
        </div>

        {/* min-height no CSS: o espaço fica reservado, então a chegada do erro
            não empurra o botão para baixo. */}
        <div className="login-error">{erro}</div>

        <button className="btn btn-gold" type="submit" disabled={enviando}>
          {enviando ? 'Criando…' : 'Criar conta e entrar'}
        </button>

        <div className="login-sub" style={{ marginTop: 16, marginBottom: 0 }}>
          Já tem conta? <Link href="/">Entrar</Link>
        </div>

        <div className="env-tag">Cadastro simulado · Dados fictícios · Sem e-mail de confirmação</div>
      </form>
    </div>
  )
}
