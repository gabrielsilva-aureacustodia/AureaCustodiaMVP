'use client'

/**
 * Formulário de cadastro. Sem trava de aceite legal — ver RA-18.
 *
 * Google primeiro (frente D, item 4 do Rogério, 17/11/2026): o botão "Continuar com o Google" é a ação principal e
 * a declaração legal fica logo abaixo dele; o formulário de e-mail e senha — o mesmo de antes, campo por campo —
 * ficou recolhido em "Prefiro usar e-mail e senha". Nada do fluxo saiu: validações, arbitragem opcional, evento do
 * Pixel e mensagens continuam aqui. O Google segue sem a caixa de arbitragem (regra que já era assim; não mudou).
 *
 * Onde a mensagem aparece: erro do Google e erro vindo do servidor (retorno do OAuth) ficam sob o botão do Google;
 * erro ou aviso do cadastro por e-mail fica dentro do bloco recolhido, junto do botão que acabou de ser apertado.
 * São duas regiões `aria-live` sempre montadas, e só uma tem texto de cada vez.
 */

import Link from 'next/link'
import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'

import { parametrosDoCadastro } from '@/lib/meta/eventos'
import { rastrearPadrao } from '@/lib/meta/pixel'
import { registerWithEmail, registerWithGoogle } from '@/server/actions/auth'

import { AuthShell } from './AuthShell'
import { DemonstracaoDoCadastro } from './DemonstracaoDoCadastro'
import { EmailAlternativo } from './EmailAlternativo'
import { GoogleButton } from './GoogleButton'

interface RegistrationStatusView {
  enabled: boolean
  reason?: string
  termsUrl?: string
  privacyUrl?: string
}

interface RegisterFormProps {
  registration: RegistrationStatusView
  initialError?: string
}

export function RegisterForm({
  registration,
  initialError = '',
}: RegisterFormProps): ReactNode {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [arbitragemAssinada, setArbitragemAssinada] = useState(false)
  const [nomeArbitragem, setNomeArbitragem] = useState('')
  const [erro, setErro] = useState(initialError)
  const [mensagem, setMensagem] = useState('')
  const [enviando, setEnviando] = useState(false)
  // Em qual das duas regiões de aviso o texto aparece (ver o cabeçalho do arquivo).
  const [ondeAvisar, setOndeAvisar] = useState<'topo' | 'email'>('topo')

  async function cadastrar(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    if (enviando || !registration.enabled) return
    setOndeAvisar('email')
    if (senha !== confirmacao) {
      setErro('As senhas informadas não são iguais.')
      return
    }
    if (arbitragemAssinada && nomeArbitragem.trim().length < 3) {
      setErro('Para assinar a cláusula arbitral, digite seu nome completo.')
      return
    }

    setEnviando(true)
    setErro('')
    setMensagem('')
    try {
      const result = await registerWithEmail(
        name,
        email,
        senha,
        arbitragemAssinada,
        arbitragemAssinada ? nomeArbitragem.trim() : undefined,
      )
      if (!result.ok) {
        setErro(result.error ?? 'Não foi possível criar a conta.')
        return
      }
      // Par do Pixel: o servidor já mandou o mesmo evento pela API de Conversões com este ID, e a Meta conta um só.
      if (result.data?.eventoCadastroId) {
        rastrearPadrao(
          'CompleteRegistration',
          parametrosDoCadastro('cadastro_email'),
          result.data.eventoCadastroId,
        )
      }
      setMensagem(result.message ?? 'Conta criada. Confirme seu e-mail.')
    } finally {
      setEnviando(false)
    }
  }

  async function cadastrarGoogle(): Promise<void> {
    if (enviando || !registration.enabled) return
    setOndeAvisar('topo')
    setEnviando(true)
    setErro('')
    setMensagem('')
    try {
      const result = await registerWithGoogle()
      if (!result.ok || !result.data?.redirectTo) {
        setErro(result.error ?? 'Não foi possível iniciar o acesso com Google.')
        return
      }
      window.location.assign(result.data.redirectTo)
    } finally {
      setEnviando(false)
    }
  }

  const disabled = enviando || !registration.enabled

  // Mesmo conteúdo para as duas regiões de aviso; só uma delas o recebe (ver o cabeçalho do arquivo).
  const avisos = (
    <>
      {erro ? <p className="login-error">{erro}</p> : null}
      {mensagem ? <p className="auth-success">{mensagem}</p> : null}
    </>
  )

  return (
    <AuthShell titulo="Abra sua conta e comece a proteger sua coleção.">
      <section className="register-card" aria-labelledby="register-title">
        <h1 className="login-title" id="register-title">
          Criar conta
        </h1>
        <p className="login-sub">
          Pelo Google é mais rápido: sem criar senha e sem esperar e-mail de confirmação.
        </p>

        {!registration.enabled ? (
          <div className="auth-gate" id="documentos-legais" role="status">
            <strong>Cadastro temporariamente fechado</strong>
            <p>{registration.reason}</p>
            <p>
              A estrutura está pronta, mas nenhuma informação pessoal será enviada enquanto os
              Termos de Uso e a Política de Privacidade não estiverem vigentes.
            </p>
            <p>
              Consulte os rascunhos operacionais dos{' '}
              <Link href="/termos">Termos de Uso</Link> e da{' '}
              <Link href="/privacidade">Política de Privacidade</Link>.
            </p>
          </div>
        ) : null}

        <GoogleButton
          rotulo="Continuar com o Google"
          disabled={disabled}
          onClick={() => void cadastrarGoogle()}
        />
        <p className="register-signinwrap auth-legal-topo">
          Ao continuar com o Google, você declara ter lido e concordado com os{' '}
          <Link href="/termos" target="_blank">
            Termos de Uso
          </Link>
          , a{' '}
          <Link href="/privacidade" target="_blank">
            Política de Privacidade
          </Link>{' '}
          e a{' '}
          <Link href="/taxas" target="_blank">
            Tabela de Taxas
          </Link>{' '}
          do Real Olímpico.
        </p>
        <div className="auth-feedback" aria-live="polite">
          {ondeAvisar === 'topo' ? avisos : null}
        </div>

        <EmailAlternativo aberto={Boolean(initialError)}>
          <p className="auth-alt-dica">Use seu e-mail real para receber a confirmação de acesso.</p>
          <form onSubmit={(event) => void cadastrar(event)}>
            <fieldset disabled={disabled}>
              <div className="register-grid">
                <div className="field">
                  <label htmlFor="registerName">Nome completo</label>
                  <input
                    id="registerName"
                    type="text"
                    autoComplete="name"
                    required
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="registerEmail">E-mail</label>
                  <input
                    id="registerEmail"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="registerPassword">Senha</label>
                  <input
                    id="registerPassword"
                    type="password"
                    minLength={8}
                    autoComplete="new-password"
                    required
                    value={senha}
                    onChange={(event) => setSenha(event.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="registerPasswordConfirmation">Confirmar senha</label>
                  <input
                    id="registerPasswordConfirmation"
                    type="password"
                    minLength={8}
                    autoComplete="new-password"
                    required
                    value={confirmacao}
                    onChange={(event) => setConfirmacao(event.target.value)}
                  />
                </div>
              </div>

              <div className={`register-arbitration-card ${arbitragemAssinada ? 'active' : ''}`}>
                <label className="register-arbitration-toggle">
                  <input
                    type="checkbox"
                    checked={arbitragemAssinada}
                    onChange={(event) => {
                      const checked = event.target.checked
                      setArbitragemAssinada(checked)
                      if (checked && !nomeArbitragem && name) {
                        setNomeArbitragem(name)
                      }
                    }}
                  />
                  <div>
                    <span className="register-arbitration-label">
                      Aceitar Cláusula Compromissória de Arbitragem
                      <span className="register-arbitration-badge">Opcional</span>
                    </span>
                    <p className="register-arbitration-hint">
                      Institui o juízo arbitral para solução de litígios (Capítulo 14.4 dos{' '}
                      <Link href="/termos" target="_blank">
                        Termos de Uso
                      </Link>
                      ). A adesão é facultativa (Lei 9.307/1996, art. 4º, §2º) e desmarcar não interfere na criação da conta nem no marketplace.
                    </p>
                  </div>
                </label>

                {arbitragemAssinada && (
                  <div className="register-arbitration-field">
                    <label htmlFor="registerArbitrationName">
                      Assinatura expressa (digite seu nome completo):
                    </label>
                    <input
                      id="registerArbitrationName"
                      type="text"
                      required={arbitragemAssinada}
                      value={nomeArbitragem}
                      placeholder="Seu nome completo como assinatura"
                      onChange={(event) => setNomeArbitragem(event.target.value)}
                    />
                  </div>
                )}
              </div>

              <p className="register-signinwrap">
                Ao criar sua conta, você declara ter lido e concordado com os{' '}
                <Link href="/termos" target="_blank">
                  Termos de Uso
                </Link>
                , a{' '}
                <Link href="/privacidade" target="_blank">
                  Política de Privacidade
                </Link>{' '}
                e a{' '}
                <Link href="/taxas" target="_blank">
                  Tabela de Taxas
                </Link>{' '}
                do Real Olímpico.
              </p>
            </fieldset>

            <div className="auth-feedback" aria-live="polite">
              {ondeAvisar === 'email' ? avisos : null}
            </div>

            <button className="btn btn-outline" type="submit" disabled={disabled}>
              {enviando ? 'Criando…' : 'Criar conta por e-mail'}
            </button>
          </form>
        </EmailAlternativo>

        <DemonstracaoDoCadastro />

        <p className="auth-switch">
          Já tem conta? <Link href="/entrar">Entrar</Link>
        </p>
      </section>
    </AuthShell>
  )
}
