'use client'

/**
 * 3.2 CONFIGURAÇÕES E SEGURANÇA — port de aurea-mvp-teste.html, renderConfig
 * (2667-2724), expandido com seção de Documentos e Aceites Contratuais (A3).
 */

import Link from 'next/link'
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'

import { LOGO_REAL_EMBLEMA } from '@/domain/constants'
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
import { Selo } from '@/components/ui/Selo'
import { Esqueleto } from '@/components/ui/Esqueleto'
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

      {/* Os cinco cartões tinham, cada um, um botão dourado — cinco primárias numa tela só. Agora são
          contornados (conceito 08: o dourado é escasso) e o nome acessível diz o que cada "Editar"
          edita (doc 35 §6). As ações e as modais são as mesmas. */}
      <div className="cols-rev">
        <div className="cfg-grid">
          <div className="cfg-card">
            <h4>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21c1-4 4-6 8-6s7 2 8 6" />
              </svg>
              Dados pessoais
            </h4>
            <p>Atualize seu nome e outras informações cadastrais.</p>
            <button className="btn btn-outline" type="button" onClick={() => open(<ModalDadosPessoais />)}>
              Editar<span className="sr-only"> dados pessoais</span>
            </button>
          </div>

          <div className="cfg-card">
            <h4>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <rect x="5" y="10" width="14" height="10" rx="2" />
                <path d="M8 10V7a4 4 0 018 0v3" />
              </svg>
              Senha
            </h4>
            <p>Altere sua senha de acesso à plataforma.</p>
            <button className="btn btn-outline" type="button" onClick={() => open(<ModalSenha />)}>
              Editar<span className="sr-only"> senha</span>
            </button>
          </div>

          <div className="cfg-card">
            <h4>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />
                <path d="M9 12l2 2 4-4" />
              </svg>
              Verificação em duas etapas
            </h4>
            <p>Adicione uma camada extra de proteção à sua conta.</p>
            <button className="btn btn-outline" type="button" onClick={() => void run(() => toggle2FA())}>
              {s.twoFA ? 'Desativar' : 'Ativar'}
              <span className="sr-only"> a verificação em duas etapas</span>
            </button>
          </div>

          <div className="cfg-card">
            <h4>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 6h16v12H4z" />
                <path d="M4 7l8 6 8-6" />
              </svg>
              Notificações por e-mail
            </h4>
            <p>Gerencie os avisos e atualizações que você recebe por e-mail.</p>
            <button className="btn btn-outline" type="button" onClick={() => open(<ModalNotificacoes />)}>
              Gerenciar<span className="sr-only"> notificações por e-mail</span>
            </button>
          </div>

          <div className="cfg-card">
            <h4>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M20 13.5A8 8 0 1110.5 4 6.5 6.5 0 0020 13.5z" />
              </svg>
              Modo claro e modo escuro
            </h4>
            <p>Escolha o tema de sua preferência para navegar.</p>
            <button className="btn btn-outline" type="button" onClick={alternarTema}>
              Alternar tema
            </button>
          </div>
        </div>

        <div className="coluna-pilha">
          <div className="panel">
            <h3>Resumo de segurança</h3>
            <div className="sec-row">
              <span className="k">E-mail verificado</span>
              <Selo tom="sucesso">Verificado</Selo>
            </div>
            <div className="sec-row">
              <span className="k">Verificação em duas etapas</span>
              <Selo tom={s.twoFA ? 'sucesso' : 'aviso'}>{s.twoFA ? 'Ativa' : 'Pendente'}</Selo>
            </div>
            <div className="sec-row">
              <span className="k">Último acesso</span>
              <span className="forte" suppressHydrationWarning>
                {ultimoAcesso}
              </span>
            </div>
            <div className="sec-row">
              <span className="k">Conta ativa</span>
              <Selo tom="sucesso">Ativo</Selo>
            </div>
          </div>

          <div className="panel conta-marca">
            <h3>Produtos ativos</h3>
            <div className="logo-box logo-footer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={LOGO_REAL_EMBLEMA} alt="Real Olímpico" />
            </div>
            <div className="note">Real Olímpico ativo na sua conta.</div>
          </div>
        </div>
      </div>

      <section className="panel cfg-aceites" aria-labelledby="cfg-aceites-t">
        <h3 id="cfg-aceites-t">Documentos Legais e Aceites Formais</h3>
        <p className="lead">
          Histórico de manifestações de vontade e aceite formal de termos vigentes, gravados com prova matemática encadeada.
        </p>

        {/* Card de Arbitragem */}
        <div className={`register-arbitration-card cfg-arbitragem ${arbitragemAssinada ? 'active' : ''}`}>
          <div className="cfg-arbitragem-cab">
            <div>
              <strong>Cláusula Compromissória de Arbitragem (Capítulo 14.4 dos Termos de Uso)</strong>
              <span className="register-arbitration-badge">{arbitragemAssinada ? 'Assinada' : 'Facultativa'}</span>
            </div>
            {arbitragemAssinada && aceiteArbitragem && (
              <Link href={`/conta/aceites/${aceiteArbitragem.id}`} className="legal-block-link">
                Ver comprovante da assinatura →
              </Link>
            )}
          </div>

          <p className="cfg-arbitragem-tx">
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
                  className="btn btn-outline auto"
                  onClick={() => {
                    setQuerAssinarArbitragem(true)
                    setNomeAssinatura(me.name)
                  }}
                >
                  Assinar Cláusula Arbitral agora
                </button>
              ) : (
                <div className="register-arbitration-field cfg-assinatura">
                  <label htmlFor="nomeAssinaturaConfig">Digite seu nome completo como assinatura formal:</label>
                  <div className="cfg-assinatura-linha">
                    <input
                      id="nomeAssinaturaConfig"
                      type="text"
                      className="tinput"
                      autoComplete="name"
                      autoCapitalize="words"
                      aria-invalid={erroAssinatura ? true : undefined}
                      aria-describedby={erroAssinatura ? 'erro-assinatura' : undefined}
                      value={nomeAssinatura}
                      onChange={(e) => setNomeAssinatura(e.target.value)}
                      placeholder="Seu nome completo"
                    />
                    <button
                      type="button"
                      className="btn btn-gold auto"
                      disabled={enviandoAssinatura}
                      onClick={() => void handleAssinarArbitragem()}
                    >
                      {enviandoAssinatura ? 'Assinando…' : 'Confirmar assinatura'}
                      <span className="sr-only"> da cláusula arbitral</span>
                    </button>
                    <button type="button" className="link-btn" onClick={() => setQuerAssinarArbitragem(false)}>
                      Cancelar<span className="sr-only"> a assinatura da cláusula arbitral</span>
                    </button>
                  </div>
                  {erroAssinatura && (
                    <p className="msg-erro" id="erro-assinatura" role="alert">
                      {erroAssinatura}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
          {sucessoAssinatura && (
            <p className="msg-ok" role="status">
              {sucessoAssinatura}
            </p>
          )}
        </div>

        {/* Tabela de Aceites Registrados — 1.ª coluna (o documento) fixa no celular. */}
        <div className="tabela-fixa" tabIndex={0} role="region" aria-label="Histórico de aceites (role para o lado no celular)">
          <table className="ro-tabela">
            <thead>
              <tr>
                <th scope="col">Documento</th>
                <th scope="col">Versão</th>
                <th scope="col">Data do Aceite</th>
                <th scope="col">Canal</th>
                <th scope="col">Comprovante</th>
              </tr>
            </thead>
            <tbody>
              {carregandoAceites ? (
                <tr>
                  <td colSpan={5}>
                    <div className="carregando" role="status" aria-busy="true" aria-label="Carregando histórico de aceites…">
                      <Esqueleto altura="14px" largura="100%" />
                      <Esqueleto altura="14px" largura="82%" />
                    </div>
                  </td>
                </tr>
              ) : aceites.length === 0 ? (
                <tr>
                  <td colSpan={5} className="cel-vazia">
                    Nenhum registro formal localizado no banco de dados. Os aceites são gerados automaticamente na criação da conta ou na confirmação dos termos.
                  </td>
                </tr>
              ) : (
                aceites.map((a) => (
                  <tr key={a.id}>
                    <th scope="row">
                      {a.documentoChave === 'termos_de_uso'
                        ? 'Termos de Uso'
                        : a.documentoChave === 'politica_privacidade'
                        ? 'Política de Privacidade'
                        : a.documentoChave === 'tabela_de_taxas'
                        ? 'Tabela de Taxas'
                        : a.documentoChave === 'clausula_arbitragem'
                        ? 'Cláusula Arbitral'
                        : a.documentoChave}
                    </th>
                    <td>v{a.documentoVersao}</td>
                    <td className="nowrap">
                      {new Date(a.createdAt).toLocaleString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="cel-sub">{a.canal}</td>
                    <td>
                      <Link href={`/conta/aceites/${a.id}`} className="legal-block-link">
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
