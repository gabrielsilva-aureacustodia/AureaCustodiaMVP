import type { Metadata } from 'next'
import Link from 'next/link'
import type { ReactNode } from 'react'

import { PrintButton } from '@/components/legal/PrintButton'
import { obterComprovanteAceite } from '@/server/actions/legal'

export const metadata: Metadata = {
  title: 'Comprovante de Aceite Legal | Real Olímpico',
  description: 'Comprovante de manifestação de vontade e aceite formal de termos e documentos legais com prova matemática encadeada.',
}

interface PageProps {
  params: Promise<{ id: string }>
}

const NOMES_DOCUMENTOS: Record<string, string> = {
  termos_de_uso: 'Termos e Condições Gerais de Uso',
  politica_privacidade: 'Política de Privacidade e Governança LGPD',
  tabela_de_taxas: 'Tabela Oficial de Taxas e Custos Operacionais',
  clausula_arbitragem: 'Cláusula Compromissória de Arbitragem (Capítulo 14.4)',
}

const NOMES_CANAIS: Record<string, string> = {
  cadastro_email: 'Cadastro com E-mail e Senha',
  cadastro_google: 'Cadastro com Google OAuth',
  entrada: 'Tela de Autenticação / Login',
  banner_atualizacao: 'Banner de Atualização de Versão',
  conta_documentos: 'Área de Configurações da Conta',
  admin: 'Painel Administrativo',
}

const NOMES_METODOS: Record<string, string> = {
  clique_no_botao: 'Clique inequívoco no botão de manifestação de vontade (Sign-in-wrap)',
  caixa_e_nome_digitado: 'Caixa de seleção voluntária acompanhada de nome digitado como assinatura',
  certificado_digital: 'Assinatura com Certificado Digital ICP-Brasil',
}

export default async function ComprovanteAceitePage({ params }: PageProps): Promise<ReactNode> {
  const { id } = await params
  const res = await obterComprovanteAceite(Number(id))

  if (!res.ok || !res.data) {
    return (
      <main className="legal-page" style={{ padding: '40px 20px', textAlign: 'center' }}>
        <div className="panel" style={{ maxWidth: 500, margin: '40px auto' }}>
          <h3>Comprovante não localizado</h3>
          <p style={{ color: 'var(--text-muted)', margin: '14px 0' }}>
            {res.error || 'O registro de aceite solicitado não existe ou não pertence à sua conta.'}
          </p>
          <Link href="/conta/configuracoes" className="btn btn-gold">
            ‹ Voltar para configurações
          </Link>
        </div>
      </main>
    )
  }

  const a = res.data
  const nomeDoc = NOMES_DOCUMENTOS[a.documentoChave] ?? a.documentoChave
  const canalFormatado = NOMES_CANAIS[a.canal] ?? a.canal
  const metodoFormatado = NOMES_METODOS[a.metodo] ?? a.metodo
  const dataFormatada = new Date(a.createdAt).toLocaleString('pt-BR', {
    dateStyle: 'long',
    timeStyle: 'medium',
  })

  return (
    <main className="legal-page" style={{ padding: '24px 16px' }}>
      <div style={{ maxWidth: 800, margin: '0 auto 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link href="/conta/configuracoes" className="back-link" style={{ margin: 0 }}>
          ‹ Voltar para configurações
        </Link>
        <PrintButton />
      </div>

      <article className="legal-proof-sheet">
        <header style={{ borderBottom: '2px solid #222', paddingBottom: 16, marginBottom: 24 }}>
          <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#666', margin: '0 0 4px' }}>
            Registro de Manifestação de Vontade e Aceite Formal
          </p>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: '#111' }}>
            Comprovante de Aceite de Documento Legal #{a.id}
          </h1>
          <p style={{ fontSize: 13, color: '#555', margin: '6px 0 0' }}>
            ÁUREA CUSTÓDIA LTDA · CNPJ 68.071.452/0001-06 · Sistema de Custódia e Marketplace
          </p>
        </header>

        <section>
          <h2>1. Identificação do Documento</h2>
          <div className="legal-proof-grid">
            <span className="legal-proof-label">Documento:</span>
            <span className="legal-proof-val">
              <strong>{nomeDoc}</strong> ({a.documentoChave})
            </span>

            <span className="legal-proof-label">Versão Vigente:</span>
            <span className="legal-proof-val">v{a.documentoVersao}</span>

            <span className="legal-proof-label">Hash SHA-256 do Documento:</span>
            <span className="legal-proof-val code">{a.hashConteudo}</span>
          </div>
        </section>

        <section>
          <h2>2. Dados da Manifestação e Autoria</h2>
          <div className="legal-proof-grid">
            <span className="legal-proof-label">Titular / E-mail:</span>
            <span className="legal-proof-val">{a.userEmail}</span>

            <span className="legal-proof-label">Data e Hora:</span>
            <span className="legal-proof-val">
              {dataFormatada} <small style={{ color: '#666' }}>({new Date(a.createdAt).toISOString()})</small>
            </span>

            <span className="legal-proof-label">Canal de Aceite:</span>
            <span className="legal-proof-val">{canalFormatado}</span>

            <span className="legal-proof-label">Método Empregado:</span>
            <span className="legal-proof-val">{metodoFormatado}</span>

            {a.nomeDigitado && (
              <>
                <span className="legal-proof-label">Nome Digitado (Assinatura):</span>
                <span className="legal-proof-val" style={{ fontWeight: 700, color: '#000' }}>
                  {a.nomeDigitado}
                </span>
              </>
            )}

            <span className="legal-proof-label">Endereço IP:</span>
            <span className="legal-proof-val code">{a.ip || 'Não capturado'}</span>

            <span className="legal-proof-label">Dispositivo / Agente:</span>
            <span className="legal-proof-val" style={{ fontSize: 12, color: '#444' }}>
              {a.userAgent || 'Não informado'}
            </span>
          </div>
        </section>

        <section>
          <h2>3. Prova Matemática e Encadeamento Criptográfico</h2>
          <p style={{ fontSize: 13, color: '#555', margin: '0 0 12px' }}>
            Cada registro de aceite no Real Olímpico é vinculado matematicamente ao elo histórico
            anterior da tabela através do algoritmo SHA-256 (Lei 14.063/2020 e Código de Processo Civil, art. 411, II).
          </p>
          <div className="legal-proof-grid">
            <span className="legal-proof-label">Hash Anterior (Elo N-1):</span>
            <span className="legal-proof-val code">{a.hashAnterior}</span>

            <span className="legal-proof-label">Hash do Registro (Elo N):</span>
            <span className="legal-proof-val code" style={{ fontWeight: 700 }}>
              {a.hash}
            </span>
          </div>
        </section>

        <section>
          <h2>4. Texto Exibido no Momento do Consentimento</h2>
          <blockquote className="legal-proof-text">
            &ldquo;{a.textoExibido}&rdquo;
          </blockquote>
        </section>

        <footer style={{ marginTop: 32, paddingTop: 16, borderTop: '1px solid #ddd', fontSize: 11, color: '#777', textAlign: 'center' }}>
          Este documento constitui meio de prova eletrônica de declaração de vontade e aceitação de termos,
          gerado a partir dos registros auditáveis mantidos de forma imutável nos servidores do Real Olímpico.
        </footer>
      </article>
    </main>
  )
}
