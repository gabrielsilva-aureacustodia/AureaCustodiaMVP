'use client'

/**
 * 3.2 CONFIGURAÇÕES E SEGURANÇA — port de aurea-mvp-teste.html, renderConfig
 * (2667-2724), expandido com seção de Documentos e Aceites Contratuais (A3).
 */

import Link from 'next/link'
import { useEffect, useState } from 'react'
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
import {
  assinarClausulaArbitragem,
  listarMeusAceites,
  verificarStatusArbitragem,
} from '@/server/actions/legal'
import type { AceiteDocumentoGravado } from '@/server/db/repositories/aceites'

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

  const s = getSettings(me)

  const ultimoAcesso = me.prevAccess
    ? new Date(me.prevAccess).toLocaleString('pt-BR', FMT_ULTIMO_ACESSO)
    : '—'

  // Estado para documentos e aceites formais (A3)
  const [aceites, setAceites] = useState<AceiteDocumentoGravado[]>([])
  const [carregandoAceites, setCarregandoAceites] = useState(true)
  const [arbitragemAssinada, setArbitragemAssinada] = useState(false)
  const [aceiteArbitragem, setAceiteArbitragem] = useState<AceiteDocumentoGravado | null>(null)
  const [querAssinarArbitragem, setQuerAssinarArbitragem] = useState(false)
  const [nomeAssinatura, setNomeAssinatura] = useState('')
  const [enviandoAssinatura, setEnviandoAssinatura] = useState(false)
  const [erroAssinatura, setErroAssinatura] = useState('')
  const [sucessoAssinatura, setSucessoAssinatura] = useState('')

  useEffect(() => {
    async function carregarDadosLegais() {
      setCarregandoAceites(true)
      try {
        const [resAceites, resArbitragem] = await Promise.all([
          listarMeusAceites(),
          verificarStatusArbitragem(),
        ])
        if (resAceites.ok && resAceites.data) {
          setAceites(resAceites.data)
        }
        if (resArbitragem.ok && resArbitragem.data) {
          setArbitragemAssinada(resArbitragem.data.assinada)
          setAceiteArbitragem(resArbitragem.data.aceite)
        }
      } finally {
        setCarregandoAceites(false)
      }
    }
    void carregarDadosLegais()
  }, [])

  async function handleAssinarArbitragem() {
    if (!nomeAssinatura.trim()) {
      setErroAssinatura('Digite seu nome completo.')
      return
    }
    setEnviandoAssinatura(true)
    setErroAssinatura('')
    setSucessoAssinatura('')
    try {
      const res = await assinarClausulaArbitragem(nomeAssinatura.trim())
      if (!res.ok) {
        setErroAssinatura(res.error ?? 'Falha ao assinar cláusula arbitral.')
        return
      }
      setSucessoAssinatura('Cláusula arbitral assinada com sucesso.')
      setArbitragemAssinada(true)
      if (res.data) {
        const item = res.data
        setAceiteArbitragem(item)
        setAceites((prev) => [item, ...prev])
      }
      setQuerAssinarArbitragem(false)
    } finally {
      setEnviandoAssinatura(false)
    }
  }

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
            <button className="btn btn-gold" type="button" onClick={alternarTema}>
              Alternar tema
            </button>
          </div>
        </div>

        <div>
          <div className="panel" style={{ marginBottom: 16 }}>
            <h3>Resumo de segurança</h3>
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
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={LOGO_REAL} alt="Real Olímpico" />
            </div>
            <div className="note" style={{ justifyContent: 'center' }}>
              Real Olímpico ativo na sua conta.
            </div>
          </div>
        </div>
      </div>

      <section className="panel" style={{ marginTop: 24 }}>
        <h3>Documentos Legais e Aceites Formais</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: '6px 0 18px' }}>
          Histórico de manifestações de vontade e aceite formal de termos vigentes, gravados com prova matemática encadeada.
        </p>

        {/* Card de Arbitragem */}
        <div
          className={`register-arbitration-card ${arbitragemAssinada ? 'active' : ''}`}
          style={{ marginBottom: 20 }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              flexWrap: 'wrap',
              gap: 8,
            }}
          >
            <div>
              <strong style={{ color: 'var(--text-strong)', fontSize: 15 }}>
                Cláusula Compromissória de Arbitragem (Capítulo 14.4 dos Termos de Uso)
              </strong>
              <span className="register-arbitration-badge" style={{ marginLeft: 8 }}>
                {arbitragemAssinada ? 'Assinada' : 'Facultativa'}
              </span>
            </div>
            {arbitragemAssinada && aceiteArbitragem && (
              <Link
                href={`/conta/aceites/${aceiteArbitragem.id}`}
                className="legal-block-link"
                style={{ minHeight: 32, padding: 0 }}
              >
                Ver comprovante da assinatura →
              </Link>
            )}
          </div>

          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '8px 0' }}>
            {arbitragemAssinada
              ? `Você assinou expressamente a cláusula de arbitragem com o nome "${
                  aceiteArbitragem?.nomeDigitado || me.name
                }" em ${
                  aceiteArbitragem
                    ? new Date(aceiteArbitragem.createdAt).toLocaleDateString('pt-BR')
                    : 'data registrada'
                }.`
              : 'A adesão à arbitragem é facultativa e institui o juízo arbitral para solução de litígios (Lei 9.307/1996, art. 4º, §2º). Você pode aderir a qualquer momento preenchendo sua assinatura abaixo.'}
          </p>

          {!arbitragemAssinada && (
            <div>
              {!querAssinarArbitragem ? (
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ minHeight: 38, fontSize: 13, marginTop: 6 }}
                  onClick={() => {
                    setQuerAssinarArbitragem(true)
                    setNomeAssinatura(me.name)
                  }}
                >
                  Assinar Cláusula Arbitral agora
                </button>
              ) : (
                <div className="register-arbitration-field" style={{ marginTop: 12 }}>
                  <label htmlFor="nomeAssinaturaConfig">Digite seu nome completo como assinatura formal:</label>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 6 }}>
                    <input
                      id="nomeAssinaturaConfig"
                      type="text"
                      value={nomeAssinatura}
                      onChange={(e) => setNomeAssinatura(e.target.value)}
                      placeholder="Seu nome completo"
                      style={{
                        flex: '1 1 240px',
                        height: 44,
                        padding: '0 12px',
                        borderRadius: 6,
                        border: '1px solid var(--line)',
                        background: 'var(--card)',
                        color: 'var(--text-strong)',
                      }}
                    />
                    <button
                      type="button"
                      className="btn btn-gold"
                      disabled={enviandoAssinatura}
                      onClick={() => void handleAssinarArbitragem()}
                      style={{ minHeight: 44 }}
                    >
                      {enviandoAssinatura ? 'Assinando…' : 'Confirmar assinatura'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={() => setQuerAssinarArbitragem(false)}
                      style={{ minHeight: 44 }}
                    >
                      Cancelar
                    </button>
                  </div>
                  {erroAssinatura && (
                    <p style={{ color: '#ef4444', fontSize: 13, margin: '8px 0 0' }}>
                      {erroAssinatura}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
          {sucessoAssinatura && (
            <p style={{ color: '#22c55e', fontSize: 13, margin: '8px 0 0' }}>{sucessoAssinatura}</p>
          )}
        </div>

        {/* Tabela de Aceites Registrados */}
        <div style={{ overflowX: 'auto' }}>
          <table className="legal-fee-table" style={{ margin: 0 }}>
            <thead>
              <tr>
                <th>Documento</th>
                <th>Versão</th>
                <th>Data do Aceite</th>
                <th>Canal</th>
                <th>Comprovante</th>
              </tr>
            </thead>
            <tbody>
              {carregandoAceites ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                    Carregando histórico de aceites…
                  </td>
                </tr>
              ) : aceites.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                    Nenhum registro formal localizado no banco de dados. Os aceites são gerados automaticamente na criação da conta ou na confirmação dos termos.
                  </td>
                </tr>
              ) : (
                aceites.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <strong>
                        {a.documentoChave === 'termos_de_uso'
                          ? 'Termos de Uso'
                          : a.documentoChave === 'politica_privacidade'
                          ? 'Política de Privacidade'
                          : a.documentoChave === 'tabela_de_taxas'
                          ? 'Tabela de Taxas'
                          : a.documentoChave === 'clausula_arbitragem'
                          ? 'Cláusula Arbitral'
                          : a.documentoChave}
                      </strong>
                    </td>
                    <td>v{a.documentoVersao}</td>
                    <td>
                      {new Date(a.createdAt).toLocaleString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{a.canal}</td>
                    <td>
                      <Link
                        href={`/conta/aceites/${a.id}`}
                        className="legal-block-link"
                        style={{ minHeight: 36, padding: 0 }}
                      >
                        Ver comprovante (#{a.id}) →
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}
