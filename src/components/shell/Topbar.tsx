'use client'

/**
 * Barra superior — port de aurea-mvp-teste.html, linhas 699-720, mais a função
 * updateHeader (1153-1158) e os onze `pageTitle.innerHTML = ...` espalhados
 * pelos renderizadores de tela.
 *
 * O TÍTULO DA PÁGINA VEM DA ROTA, E ISSO É DE PROPÓSITO
 * ----------------------------------------------------
 * No monolito cada render<Tela>() começava escrevendo o próprio título dentro
 * de #pageTitle. Fazer o mesmo aqui exigiria que toda página empurrasse texto
 * para dentro de um componente do casco — um portal, ou um contexto que a
 * página escreve e a topbar lê — e, pior, o título só apareceria DEPOIS da
 * hidratação da página.
 *
 * Como os onze títulos do original são constantes (as duas únicas partes
 * variáveis são o primeiro nome do usuário em 'Início' e em 'Minha conta', que
 * a topbar já tem em mãos), derivá-los do pathname é fiel ao caractere, chega
 * pronto no HTML do servidor e não obriga nenhuma outra tela a saber que a
 * topbar existe.
 *
 * updateHeader() sumiu: nome, saldo e iniciais são lidos de `me`, e o React
 * redesenha quando o ciclo de sincronização traz um estado novo.
 */

import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

import { initials } from '@/domain/codes'
import { brl } from '@/domain/money'
import type { User } from '@/domain/types'
import { useApp } from '@/components/providers/AppProvider'
import { useTheme } from '@/components/providers/ThemeProvider'
import { useLogout, useSidebar } from '@/components/shell/Sidebar'

interface Titulo {
  h1: string
  p: string
}

/**
 * Os títulos, copiados um a um dos `pageTitle.innerHTML` do monolito. Nenhum
 * texto foi reescrito — nem a pontuação.
 *
 * A ordem das comparações importa nos dois casos de rota aninhada: '/recibos/
 * <id>' e as abas de '/graficos' precisam ser testadas antes da rota-raiz
 * correspondente.
 */
function tituloDaRota(pathname: string, me: User): Titulo {
  // 'Olá, Rogério' — o original usava u.name.split(' ')[0] (linhas 1193 e 2586).
  const primeiroNome = me.name.split(' ')[0]

  if (pathname === '/inicio') {
    return {
      h1: 'Painel Real Olímpico',
      p: `Olá, ${primeiroNome} — ambiente de teste com dados fictícios.`,
    }
  }
  if (pathname === '/mercado') {
    return {
      // Era 'Comprar moeda olímpica'. Deixou de ser verdade quando a Moeda dos
      // Direitos Humanos — que não é olímpica — entrou no marketplace.
      h1: 'Comprar moedas',
      p: 'Veja as ofertas de venda e de compra ativas, ou publique a sua.',
    }
  }
  if (pathname === '/vender') {
    return {
      h1: 'Colocar ativo à venda',
      p: 'Selecione uma ou mais moedas em custódia e publique seu anúncio com transparência.',
    }
  }
  if (pathname === '/envios') {
    return {
      h1: 'Enviar moeda para custódia',
      p: 'Cadastre sua moeda para análise e receba um protocolo de envio com segurança.',
    }
  }
  // Certificado de uma moeda (3.1) antes da grade de recibos (1.4).
  if (pathname.startsWith('/recibos/')) {
    return {
      h1: 'Recibo NFT de Custódia',
      p: 'Certificado digital de custódia vinculado ao banco de dados fictício.',
    }
  }
  if (pathname === '/recibos') {
    return {
      h1: 'Meus recibos NFT',
      p: 'Recibos digitais de validação e recebimento de custódia.',
    }
  }
  if (pathname === '/graficos/auditoria') {
    return {
      h1: 'Auditoria de estoque custodiado',
      p: 'Moedas físicas recebidas, lacradas e vinculadas aos recibos digitais.',
    }
  }
  if (pathname === '/graficos/comparacoes') {
    return {
      h1: 'Comparação de referência',
      p: 'Acompanhe o Real Olímpico ao lado de ativos digitais conhecidos.',
    }
  }
  if (pathname === '/graficos') {
    return {
      h1: 'Mercado e auditoria',
      p: 'Evolução de preços, estoque custodiado e comparações.',
    }
  }
  if (pathname === '/conta/extrato') {
    return {
      h1: 'Extrato da conta',
      p: 'Tudo o que você movimentou nesta conta desde o primeiro acesso.',
    }
  }
  if (pathname === '/conta/configuracoes') {
    return {
      h1: 'Configurações e segurança',
      p: 'Gerencie seus dados, acesso e preferências com segurança.',
    }
  }
  if (pathname === '/conta') {
    return { h1: 'Minha conta', p: `Olá, ${primeiroNome}` }
  }

  // Rota desconhecida: cai no painel, que é o destino de `go('home')` do
  // original. Melhor um título honesto do que um cabeçalho vazio.
  return {
    h1: 'Painel Real Olímpico',
    p: `Olá, ${primeiroNome} — ambiente de teste com dados fictícios.`,
  }
}

export function Topbar(): ReactNode {
  const { me } = useApp()
  const { dark, toggle } = useTheme()
  const { open, toggle: alternarGaveta } = useSidebar()
  const pathname = usePathname()
  const sair = useLogout()

  const titulo = tituloDaRota(pathname, me)

  return (
    <div className="topbar">
      <div className="tb-left">
        {/* 44x44 fixos (shell.css) — é o alvo de toque mínimo, não uma medida
            escolhida por estética. Some acima de 1080px, quando a sidebar volta
            a ser coluna fixa. */}
        <button
          className="menu-btn"
          type="button"
          onClick={alternarGaveta}
          aria-label="Abrir menu"
          aria-expanded={open}
          aria-controls="sidebar"
        >
          <svg viewBox="0 0 24 24">
            <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
          </svg>
        </button>

        <div className="page-title">
          <h1 className="serif">{titulo.h1}</h1>
          <p>{titulo.p}</p>
        </div>
      </div>

      <div className="top-right">
        <div className="user-chip">
          <div className="avatar">{initials(me.name)}</div>
          <div>
            <div className="uname">{me.name}</div>
            <div className="ubal">{brl(me.balance)}</div>
          </div>
        </div>

        {/* Segundo interruptor de tema (o primeiro está na gaveta). Os dois leem
            o mesmo `dark`, então não há como saírem de sincronia — era isso que
            a função syncThemeSwitches do original resolvia na mão. */}
        <div className="theme-box">
          <span>Modo escuro</span>
          <div className={dark ? 'switch on' : 'switch'} onClick={toggle} />
        </div>

        <span className="logout" onClick={() => void sair()}>
          Sair
        </span>
      </div>
    </div>
  )
}
