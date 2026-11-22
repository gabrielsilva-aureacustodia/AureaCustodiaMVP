/**
 * /cadastrar e /entrar com o Google primeiro (frente D, itens 4 e 8 do Rogério).
 *
 * A suíte roda em `environment: 'node'`, sem DOM: os formulários são renderizados no servidor
 * (`renderToStaticMarkup`), que é o HTML que chega ao navegador antes da hidratação. Isso basta para provar o que
 * a frente prometeu — a ORDEM na tela (Google, declaração, e-mail recolhido), o `<details>` fechado ou aberto, os
 * campos de sempre ainda lá e o cadastro fechado desabilitando tudo. O clique em si (a ação e o
 * `window.location.assign`) foi conferido no navegador local; aqui o contrato "mesma janela, sem popup" é travado
 * lendo o código, porque é ele que o iPhone instalado exige (contrato D↔E).
 */

import { readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }))
vi.mock('next/image', () => ({ default: () => null }))
vi.mock('@/lib/meta/pixel', () => ({ rastrearPadrao: vi.fn() }))
vi.mock('@/server/actions/conta-acesso', () => ({
  solicitarRedefinicaoDeSenha: vi.fn(),
  reenviarLinkDeAcesso: vi.fn(),
}))
vi.mock('@/server/actions/auth', () => ({
  login: vi.fn(),
  loginWithGoogle: vi.fn(),
  registerWithEmail: vi.fn(),
  registerWithGoogle: vi.fn(),
}))

import {
  DemonstracaoDoCadastro,
  VIDEO_DA_DEMONSTRACAO,
} from './DemonstracaoDoCadastro'
import { LoginForm } from './LoginForm'
import { RegisterForm } from './RegisterForm'

const ABERTO = { enabled: true }
const FECHADO = { enabled: false, reason: 'Motivo do fechamento de teste.' }

function cadastro(props: { enabled?: boolean; initialError?: string } = {}): string {
  const registration = props.enabled === false ? FECHADO : ABERTO
  return renderToStaticMarkup(
    createElement(RegisterForm, { registration, initialError: props.initialError }),
  )
}

function entrada(props: { initialError?: string; initialMessage?: string; registrationOpen?: boolean } = {}): string {
  return renderToStaticMarkup(
    createElement(LoginForm, {
      initialError: props.initialError,
      initialMessage: props.initialMessage,
      registrationOpen: props.registrationOpen ?? true,
    }),
  )
}

/** Posição de um trecho no HTML; falha com a mensagem certa se ele não existir. */
function pos(html: string, trecho: string): number {
  const i = html.indexOf(trecho)
  expect(i, `faltou "${trecho}" no HTML`).toBeGreaterThan(-1)
  return i
}

describe('cadastro: Google primeiro', () => {
  it('na tela, a ordem é Google, declaração legal, e-mail recolhido', () => {
    const html = cadastro()
    const google = pos(html, 'Continuar com o Google')
    const declaracao = pos(html, 'Ao continuar com o Google, você declara ter lido e concordado')
    const detalhes = pos(html, '<details')
    const campoNome = pos(html, 'id="registerName"')
    expect(google).toBeLessThan(declaracao)
    expect(declaracao).toBeLessThan(detalhes)
    expect(detalhes).toBeLessThan(campoNome)
    expect(html).toContain('Prefiro usar e-mail e senha')
  })

  it('o e-mail e a senha começam recolhidos; só um erro do servidor abre o bloco', () => {
    expect(cadastro()).toMatch(/<details class="auth-alt">/)
    expect(cadastro()).not.toContain('open=""')

    const comErro = cadastro({ initialError: 'O aceite legal do acesso com Google expirou.' })
    expect(comErro).toContain('<details class="auth-alt" open="">')
    // O erro aparece sob o Google, FORA do bloco recolhido: nunca fica escondido.
    expect(pos(comErro, 'O aceite legal do acesso com Google expirou.')).toBeLessThan(pos(comErro, '<details'))
  })

  it('nenhum campo, validação nem texto do fluxo por e-mail sumiu', () => {
    const html = cadastro()
    for (const id of ['registerName', 'registerEmail', 'registerPassword', 'registerPasswordConfirmation']) {
      expect(html).toContain(`id="${id}"`)
    }
    expect(html.match(/minLength="8"/g)).toHaveLength(2)
    expect(html).toContain('autoComplete="new-password"')
    expect(html).toContain('Aceitar Cláusula Compromissória de Arbitragem')
    expect(html).toContain('Opcional')
    expect(html).toContain('Use seu e-mail real para receber a confirmação de acesso.')
    expect(html).toContain('Criar conta por e-mail')
    // A declaração do caminho por e-mail continua dentro do formulário, ao lado da do Google.
    expect(html.match(/declara ter lido e concordado/g)).toHaveLength(2)
    expect(html).toContain('Já tem conta?')
  })

  it('QA Davi 22/11: cadastro tem "Mostrar senha" nos dois campos e marca os obrigatórios', () => {
    const html = cadastro()
    expect(html).toContain('aria-label="Mostrar senha"')
    expect(html).toContain('aria-label="Mostrar confirmação da senha"')
    expect(html).toContain('Nome completo *')
    expect(html).toContain('Campos com * são obrigatórios')
  })

  it('QA Davi 22/11 (S01 e B02): a entrada tem "Esqueci minha senha" e "Reenviar link de confirmação"', () => {
    const html = entrada()
    expect(html).toContain('Esqueci minha senha')
    expect(html).toContain('Reenviar link de confirmação')
  })

  it('o aceite legal aponta para os três documentos, junto do botão do Google', () => {
    const html = cadastro()
    const trecho = html.slice(pos(html, 'Ao continuar com o Google'), pos(html, '<details'))
    expect(trecho).toContain('href="/termos"')
    expect(trecho).toContain('href="/privacidade"')
    expect(trecho).toContain('href="/taxas"')
  })

  it('cadastro aberto deixa o Google ativo', () => {
    const html = cadastro()
    expect(html).not.toMatch(/auth-primary"[^>]*disabled/)
    expect(html).not.toContain('Cadastro temporariamente fechado')
  })

  it('cadastro fechado desabilita o Google, os campos e o envio, e mostra o aviso', () => {
    const html = cadastro({ enabled: false })
    expect(html).toContain('Cadastro temporariamente fechado')
    expect(html).toContain('Motivo do fechamento de teste.')
    expect(html).toMatch(/auth-primary" type="button" disabled=""/)
    expect(html).toContain('<fieldset disabled="">')
    expect(html).toMatch(/type="submit" disabled=""/)
  })

  it('traz o bloco "Veja como se cadastrar" antes do "Já tem conta?"', () => {
    const html = cadastro()
    expect(pos(html, 'Veja como se cadastrar')).toBeLessThan(pos(html, 'Já tem conta?'))
  })
})

describe('entrada: Google primeiro', () => {
  it('na tela, a ordem é Google, e-mail recolhido, "Criar conta"', () => {
    const html = entrada()
    const google = pos(html, 'Entrar com o Google')
    const detalhes = pos(html, '<details')
    const campoEmail = pos(html, 'id="loginEmail"')
    expect(google).toBeLessThan(detalhes)
    expect(detalhes).toBeLessThan(campoEmail)
    expect(pos(html, 'Prefiro usar e-mail e senha')).toBeGreaterThan(google)
    expect(pos(html, 'Criar conta')).toBeGreaterThan(campoEmail)
  })

  it('começa recolhido; erro do servidor abre o bloco e fica visível fora dele', () => {
    expect(entrada()).toMatch(/<details class="auth-alt">/)

    const comErro = entrada({ initialError: 'Não foi possível concluir a autenticação: teste' })
    expect(comErro).toContain('<details class="auth-alt" open="">')
    expect(pos(comErro, 'Não foi possível concluir a autenticação: teste')).toBeLessThan(pos(comErro, '<details'))
  })

  it('o aviso de e-mail confirmado fica sob o Google, sem abrir o bloco', () => {
    const html = entrada({ initialMessage: 'E-mail confirmado.' })
    expect(pos(html, 'E-mail confirmado.')).toBeLessThan(pos(html, '<details'))
    expect(html).not.toContain('open=""')
  })

  it('e-mail, senha, olho de revelar e envio continuam com os mesmos IDs e rótulos', () => {
    const html = entrada()
    expect(html).toContain('id="loginEmail"')
    expect(html).toContain('id="loginPass"')
    expect(html).toContain('autoComplete="username"')
    expect(html).toContain('autoComplete="current-password"')
    expect(html).toContain('aria-label="Mostrar senha"')
    expect(html).toMatch(/type="submit"[^>]*>Entrar</)
  })

  it('com o cadastro fechado, o rodapé continua dizendo isso', () => {
    expect(entrada({ registrationOpen: false })).toContain('Novos cadastros estão fechados.')
  })
})

describe('OAuth na mesma janela (contrato D↔E)', () => {
  const dir = join(process.cwd(), 'src', 'components', 'login')
  const fonte = (arquivo: string): string => readFileSync(join(dir, arquivo), 'utf8')

  it('os dois formulários mandam a mesma janela para o Google, sem popup', () => {
    for (const arquivo of ['RegisterForm.tsx', 'LoginForm.tsx', 'GoogleButton.tsx', 'EmailAlternativo.tsx']) {
      expect(fonte(arquivo), arquivo).not.toMatch(/window\.open\s*\(/)
    }
    expect(fonte('RegisterForm.tsx')).toContain('window.location.assign(result.data.redirectTo)')
    expect(fonte('LoginForm.tsx')).toContain('window.location.assign(result.data.redirectTo)')
  })

  it('o clique do Google chama a ação certa em cada tela', () => {
    expect(fonte('RegisterForm.tsx')).toContain('await registerWithGoogle()')
    expect(fonte('LoginForm.tsx')).toContain('await loginWithGoogle()')
  })
})

describe('demonstração do cadastro', () => {
  it('sem vídeo ligado, mostra só os passos escritos (sem player quebrado)', () => {
    const html = renderToStaticMarkup(createElement(DemonstracaoDoCadastro, { video: null }))
    expect(html).toContain('Veja como se cadastrar')
    expect(html).not.toContain('<video')
    expect(html.match(/<li>/g)).toHaveLength(4)
    expect(html).toContain('Continuar com o Google')
    expect(html).toContain('Prefiro usar e-mail e senha')
  })

  it('com vídeo, o player é mudo, sem autoplay, inline e só carrega os metadados', () => {
    const html = renderToStaticMarkup(
      createElement(DemonstracaoDoCadastro, {
        video: { src: '/demonstracao/cadastro.webm', tipo: 'video/webm' },
      }),
    )
    expect(html).toContain('<video')
    expect(html).toContain('muted=""')
    expect(html).toContain('playsInline=""')
    expect(html).toContain('controls=""')
    expect(html).toContain('preload="metadata"')
    expect(html).not.toMatch(/autoPlay/i)
    expect(html).toContain('<source src="/demonstracao/cadastro.webm" type="video/webm"/>')
    // Os passos escritos continuam ao lado do vídeo, para quem não puder abri-lo.
    expect(html.match(/<li>/g)).toHaveLength(4)
  })

  it('texto novo da frente não usa palavra proibida pelo jurídico', () => {
    const proibidas = /\b(token|nft|cripto\w*|ativo digital|ativos digitais|investimento|rentabilidade)\b/i
    const html = [
      renderToStaticMarkup(createElement(DemonstracaoDoCadastro, { video: null })),
      cadastro().slice(pos(cadastro(), 'Criar conta'), pos(cadastro(), '</section>')),
    ].join(' ')
    // `AuthShell` tem o aviso "não oferece investimento", que é anterior e fica fora desta frente: por isso o
    // trecho do cartão começa em "Criar conta", depois do casco.
    expect(html).not.toMatch(proibidas)
  })

  it('se o vídeo estiver ligado, o arquivo existe em public/ e é leve (≤ ~1,5 MB)', () => {
    if (VIDEO_DA_DEMONSTRACAO === null) return
    const arquivo = join(process.cwd(), 'public', VIDEO_DA_DEMONSTRACAO.src)
    expect(statSync(arquivo).size).toBeLessThanOrEqual(1_600_000)
  })
})
