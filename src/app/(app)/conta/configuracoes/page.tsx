'use client'

/**
 * 3.2 CONFIGURAÇÕES E SEGURANÇA — port de aurea-mvp-teste.html, renderConfig
 * (2667-2724).
 *
 * A tela é quase toda de comandos: seis cartões que abrem modal, alternam um
 * interruptor ou trocam o tema. O que ela LÊ do estado é pouco — o twoFA, que
 * aparece em dois lugares (o rótulo do botão e a pill do resumo), e o
 * `prevAccess` do último acesso — mas esse pouco precisa reagir ao servidor:
 * ligar a verificação em duas etapas tem de repintar o cartão E a pill na mesma
 * volta. Daí o client component lendo do AppProvider.
 *
 * O título ('Configurações e segurança' / 'Gerencie seus dados, acesso e
 * preferências com segurança.') é montado pela Topbar a partir da rota — mesmos
 * textos das linhas 2670-2671.
 */

import Link from 'next/link'
import type { ReactNode } from 'react'

import { LOGO_REAL } from '@/domain/constants'
import { getSettings } from '@/domain/selectors'
import {
  ModalDadosPessoais,
  ModalNotificacoes,
  ModalSenha,
} from '@/components/account/AccountModals'
import { useApp } from '@/components/providers/AppProvider'
import { useTheme } from '@/components/providers/ThemeProvider'
import { useModal } from '@/components/ui/Modal'
import { toggle2FA } from '@/server/actions/account'

/**
 * Formato do 'Último acesso' (linha 2672): dia/mês e hora:minuto, sem o ano.
 * Extraído para constante porque é o único lugar do projeto que formata data e
 * hora juntas — as demais telas usam fdate(), que só tem a data.
 */
const FMT_ULTIMO_ACESSO: Intl.DateTimeFormatOptions = {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
}

export default function ConfiguracoesPage(): ReactNode {
  const { me, run } = useApp()
  const { open } = useModal()
  const { toggle: alternarTema } = useTheme()

  // Cria o objeto de preferências na cópia local quando ele não existe (contas
  // do seed nascem sem `settings`). Quem grava é a server action, que chama a
  // mesma getSettings do lado do servidor.
  const s = getSettings(me)

  /**
   * `prevAccess` é o acesso ANTERIOR, carimbado no login (server/actions/auth.ts)
   * antes de lastAccess ser sobrescrito — mostrar `lastAccess` seria mostrar o
   * login que está acontecendo agora. Sem valor (primeiro acesso) vira o traço,
   * como na linha 2672.
   */
  const ultimoAcesso = me.prevAccess
    ? new Date(me.prevAccess).toLocaleString('pt-BR', FMT_ULTIMO_ACESSO)
    : '—'

  return (
    <>
      <Link className="back-link" href="/conta">
        ‹ Voltar para minha conta
      </Link>

      <div className="cols-rev">
        <div className="cfg-grid">
          <div className="cfg-card">
            <h4>
              <svg viewBox="0 0 24 24">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21c1-4 4-6 8-6s7 2 8 6" />
              </svg>
              Dados pessoais
            </h4>
            <p>Atualize seu nome e outras informações cadastrais.</p>
            <button
              className="btn btn-gold"
              type="button"
              onClick={() => open(<ModalDadosPessoais />)}
            >
              Editar
            </button>
          </div>

          {/* Cartão de vitrine: não há rota, não há integração. O `disabled` é o
              que segura a promessa — o botão existe para dizer que o recurso está
              no mapa, exatamente como o item "Academy" da barra lateral. */}
          <div className="cfg-card">
            <h4>
              <svg viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="9" />
                <path d="M8 12h8M12 8v8" />
              </svg>
              Login com Google
            </h4>
            <p>Gerencie sua conexão de login com a conta Google.</p>
            <button className="btn btn-outline" type="button" disabled>
              Gerenciar — EM BREVE
            </button>
          </div>

          <div className="cfg-card">
            <h4>
              <svg viewBox="0 0 24 24">
                <rect x="5" y="10" width="14" height="10" rx="2" />
                <path d="M8 10V7a4 4 0 018 0v3" />
              </svg>
              Senha
            </h4>
            <p>Altere sua senha de acesso à plataforma.</p>
            <button className="btn btn-gold" type="button" onClick={() => open(<ModalSenha />)}>
              Editar
            </button>
          </div>

          <div className="cfg-card">
            <h4>
              <svg viewBox="0 0 24 24">
                <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />
                <path d="M9 12l2 2 4-4" />
              </svg>
              Verificação em duas etapas
            </h4>
            <p>Adicione uma camada extra de proteção à sua conta.</p>
            {/* O botão troca de peso junto com o estado: dourado convida a ligar,
                contorno é a ação de desfazer. Mesma lógica da linha 2695. */}
            <button
              className={s.twoFA ? 'btn btn-outline' : 'btn btn-gold'}
              type="button"
              onClick={() => void run(() => toggle2FA())}
            >
              {s.twoFA ? 'Desativar' : 'Ativar'}
            </button>
          </div>

          <div className="cfg-card">
            <h4>
              <svg viewBox="0 0 24 24">
                <path d="M4 6h16v12H4z" />
                <path d="M4 7l8 6 8-6" />
              </svg>
              Notificações por e-mail
            </h4>
            <p>Gerencie os avisos e atualizações que você recebe por e-mail.</p>
            <button
              className="btn btn-gold"
              type="button"
              onClick={() => open(<ModalNotificacoes />)}
            >
              Gerenciar
            </button>
          </div>

          <div className="cfg-card">
            <h4>
              <svg viewBox="0 0 24 24">
                <path d="M20 13.5A8 8 0 1110.5 4 6.5 6.5 0 0020 13.5z" />
              </svg>
              Modo claro e modo escuro
            </h4>
            <p>Escolha o tema de sua preferência para navegar.</p>
            {/* Terceiro comando de tema do sistema, ao lado dos interruptores da
                topbar e da gaveta. Todos chamam o mesmo useTheme(), então não há
                como um ficar desalinhado do outro. */}
            <button className="btn btn-gold" type="button" onClick={alternarTema}>
              Alternar tema
            </button>
          </div>
        </div>

        <div>
          <div className="panel" style={{ marginBottom: 16 }}>
            <h3>Resumo de segurança</h3>

            {/* 'Verificado' e 'Ativo' são fixos: o MVP não tem verificação de
                e-mail nem suspensão de conta. Portados como estão. */}
            <div className="sec-row">
              <span className="k">E-mail verificado</span>
              <span className="pill g">Verificado</span>
            </div>
            <div className="sec-row">
              <span className="k">Verificação em duas etapas</span>
              <span className={s.twoFA ? 'pill g' : 'pill y'}>{s.twoFA ? 'Ativa' : 'Pendente'}</span>
            </div>
            <div className="sec-row">
              <span className="k">Último acesso</span>
              {/* suppressHydrationWarning: toLocaleString usa o fuso de quem
                  renderiza. No servidor (UTC na Vercel) e no navegador do usuário
                  o texto pode sair diferente, e sem isto o React acusaria
                  divergência de hidratação num elemento visível. O valor que
                  prevalece é o do cliente, que é o fuso certo para quem lê. */}
              <span style={{ fontWeight: 700 }} suppressHydrationWarning>
                {ultimoAcesso}
              </span>
            </div>
            <div className="sec-row">
              <span className="k">Conta ativa</span>
              <span className="pill g">Ativo</span>
            </div>
          </div>

          <div className="panel" style={{ textAlign: 'center' }}>
            <h3 style={{ justifyContent: 'center' }}>Produtos ativos</h3>
            <div className="logo-box logo-footer" style={{ marginBottom: 8 }}>
              {/* Aqui a logo é a do PRODUTO (Real Olímpico), não a da custódia —
                  é o que a linha 2723 carrega. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={LOGO_REAL} alt="Real Olímpico" />
            </div>
            <div className="note" style={{ justifyContent: 'center' }}>
              Real Olímpico ativo na sua conta.
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
