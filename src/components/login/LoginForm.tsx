'use client'

/**
 * Formulário de entrada — port de aurea-mvp-teste.html, markup das linhas
 * 629-654 e comportamento de doLogin (1038-1064) / toggleLoginPass (1074-1092).
 *
 * POR QUE ESTE ARQUIVO EXISTE SEPARADO DE app/page.tsx
 * ----------------------------------------------------
 * A página precisa conferir a sessão NO SERVIDOR antes de pintar (quem já está
 * logado nunca deve ver esta tela nem por um quadro), e um arquivo só pode ser
 * de servidor OU de cliente. Então a página fica server component e delega a
 * parte interativa — dois campos controlados, o olho da senha com temporizador
 * e a chamada da server action — para este componente.
 *
 * O QUE MUDOU EM RELAÇÃO AO MONOLITO
 * ----------------------------------
 * Lá, doLogin lia ACCOUNTS do próprio bundle e comparava a senha no navegador.
 * Aqui só o par (e-mail, senha) sai daqui; quem decide é login() no servidor, e
 * o que volta é um ActionResult. Este componente **não importa ACCOUNTS de
 * forma alguma** — nem para validar, nem para exibir (ver a nota sobre a lista
 * de contas de teste, mais abaixo).
 *
 * Também sumiu a manipulação de DOM: nada de document.getElementById nem de
 * innerHTML no botão do olho. O ícone é escolhido por JSX a partir do estado
 * `revelada`, e a normalização do e-mail (trim + lowercase) ficou onde ela
 * realmente protege — dentro da server action.
 */

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'

import { LOGO_AUREA } from '@/domain/constants'
import { login } from '@/server/actions/auth'

/**
 * Tempo que a senha fica visível antes de voltar a ficar oculta sozinha.
 * É o PW_REVEAL_MS da linha 1075 — 3s, e não os 3600ms do toast; são coisas
 * diferentes que por acaso têm ordem de grandeza parecida.
 */
const PW_REVEAL_MS = 3000

/*
 * A LISTA DE CONTAS DE TESTE SAIU DESTA TELA — decisão dos sócios, 01/09/2026.
 *
 * O monolito (linha 650) e o port imprimiam os sete e-mails e a senha comum
 * embaixo do botão "Entrar". Era conveniente enquanto só os sócios abriam a
 * página; deixou de ser quando a URL passou a ser mostrada a terceiros, porque
 * a tela entregava credencial funcional a quem apenas passasse os olhos.
 *
 * As credenciais continuam existindo e continuam válidas — o que mudou é que
 * elas não são mais anunciadas. Quem precisa delas consulta
 * `docs/referencia/CONTAS_DE_TESTE.md`, e a fonte da verdade segue sendo
 * ACCOUNTS em `src/domain/constants.ts`.
 *
 * Não recolocar esta lista sem decisão dos sócios.
 */

/** Ícone de olho aberto — ICON_EYE, linha 1076. */
const IconeOlho = (
  <svg viewBox="0 0 24 24">
    <path d="M1.8 12S5.6 5.2 12 5.2 22.2 12 22.2 12 18.4 18.8 12 18.8 1.8 12 1.8 12z" />
    <circle cx="12" cy="12" r="3.2" />
  </svg>
)

/** Ícone de olho cortado — ICON_EYE_OFF, linha 1077. */
const IconeOlhoCortado = (
  <svg viewBox="0 0 24 24">
    <path d="M9.9 5.5A8.6 8.6 0 0112 5.2c6.4 0 10.2 6.8 10.2 6.8a17 17 0 01-3.3 4.1M6.4 6.5A17 17 0 001.8 12S5.6 18.8 12 18.8a8.9 8.9 0 004-.9" />
    <path d="M9.7 9.7a3.2 3.2 0 004.5 4.5" />
    <path d="M3 3l18 18" strokeLinecap="round" />
  </svg>
)

/**
 * Rede de segurança para o caso de a server action devolver ok:false sem texto.
 * O contrato de ActionResult tipa `error` como opcional, e um <div class=
 * "login-error"> vazio deixaria o usuário achando que o clique não funcionou.
 */
const ERRO_GENERICO = 'Não foi possível entrar. Tente novamente.'

export function LoginForm(): ReactNode {
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [revelada, setRevelada] = useState(false)
  // O original não tinha estado de "enviando" porque a validação era síncrona,
  // no próprio navegador. Agora há ida e volta de rede: sem a trava, um duplo
  // clique dispara dois logins e a segunda resposta pode chegar depois da
  // navegação.
  const [enviando, setEnviando] = useState(false)

  // Guarda o timer do olho para poder cancelá-lo — é o clearTimeout da linha
  // 1089. Em ref, não em estado: trocar o valor não deve repintar nada.
  const timerRevelar = useRef<ReturnType<typeof setTimeout> | null>(null)

  /**
   * Some com a senha depois de PW_REVEAL_MS, e reagenda a cada vez que o olho é
   * aberto de novo. Desmontar o componente durante a contagem (o que acontece
   * assim que o login dá certo) precisa cancelar o timer, senão o React reclama
   * de setState em componente já desmontado.
   */
  useEffect(() => {
    if (!revelada) return
    timerRevelar.current = setTimeout(() => setRevelada(false), PW_REVEAL_MS)
    return () => {
      if (timerRevelar.current) clearTimeout(timerRevelar.current)
    }
  }, [revelada])

  const entrar = useCallback(async (): Promise<void> => {
    if (enviando) return
    setEnviando(true)
    try {
      const r = await login(email, senha)
      if (!r.ok) {
        // Mesma mensagem para e-mail inexistente e para senha errada: quem a
        // escolhe é o servidor, e ela é uma só de propósito (ver auth.ts).
        setErro(r.error ?? ERRO_GENERICO)
        return
      }
      // Linha 1053 do original: a mensagem de erro é limpa no sucesso.
      setErro('')
      router.push('/inicio')
      // O cookie de sessão foi gravado pela server action, mas o App Router
      // pode ter em cache a árvore de '/inicio' renderizada sem ele. O refresh
      // força o (app)/layout a rodar de novo já com a sessão — sem isso, o
      // guarda de servidor devolveria o usuário para cá.
      router.refresh()
    } finally {
      setEnviando(false)
    }
  }, [email, senha, enviando, router])

  /**
   * Enter envia — e SÓ no campo de senha, como o addEventListener da linha 1072.
   * No campo de e-mail o original não fazia nada (não havia <form> para o
   * navegador submeter), e manter essa assimetria é parte do port fiel.
   */
  const aoTeclarSenha = useCallback(
    (e: KeyboardEvent<HTMLInputElement>): void => {
      if (e.key === 'Enter') void entrar()
    },
    [entrar],
  )

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="logo-box logo-login">
          {/* <img> puro pelo mesmo motivo da sidebar: webp de marca servido de
              /public, dimensionado por .logo-box img no CSS. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOGO_AUREA} alt="Áurea Custódia" />
        </div>

        <div className="login-title">Acessar plataforma</div>
        <div className="login-sub">Ambiente seguro de custódia e negociação.</div>

        <div className="field">
          <label htmlFor="loginEmail">E-mail</label>
          <input
            id="loginEmail"
            type="email"
            placeholder="seuemail@exemplo.com.br"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="loginPass">Senha</label>
          <div className="pw-wrap">
            <input
              id="loginPass"
              type={revelada ? 'text' : 'password'}
              placeholder="••••••••"
              autoComplete="current-password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              onKeyDown={aoTeclarSenha}
            />
            {/* type="button" é obrigatório: mesmo fora de um <form>, o padrão
                "submit" faria o Enter do campo de senha ativar este botão em
                vez do fluxo de login. */}
            <button
              type="button"
              className={revelada ? 'pw-toggle on' : 'pw-toggle'}
              onClick={() => setRevelada((v) => !v)}
              aria-label={revelada ? 'Ocultar senha' : 'Mostrar senha'}
              aria-pressed={revelada}
              aria-controls="loginPass"
            >
              {revelada ? IconeOlhoCortado : IconeOlho}
            </button>
          </div>
        </div>

        {/* min-height:18px no CSS: o espaço é reservado mesmo vazio, então a
            chegada do erro não empurra o botão para baixo. */}
        <div className="login-error">{erro}</div>

        <button className="btn btn-gold" onClick={() => void entrar()} disabled={enviando}>
          Entrar
        </button>

        {/* Caminho para o cadastro SIMULADO (RA-15). Provisório: sai junto com
            a pasta src/app/criar-conta/ quando a frente A entregar o cadastro
            real com Supabase Auth. */}
        <div className="login-sub" style={{ marginTop: 16, marginBottom: 0 }}>
          Não tem conta? <Link href="/criar-conta">Criar conta de demonstração</Link>
        </div>

        <div className="env-tag">Ambiente de teste · Pré-MVP · Dados fictícios</div>
      </div>
    </div>
  )
}
