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
      // <div>, não <main>: a página já está dentro do <main> do casco (layout de (app)), e dois
      // marcos principais confundem quem navega por leitor de tela (25/10/2026).
      <div className="aceite-pagina">
        <div className="panel vazio aceite-nao-achado">
          <h3>Comprovante não localizado</h3>
          <p>
            {res.error || 'O registro de aceite solicitado não existe ou não pertence à sua conta.'}
          </p>
          <Link href="/conta/configuracoes" className="btn btn-gold">
            ‹ Voltar para configurações
          </Link>
        </div>
      </div>
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
    <div className="aceite-pagina">
      <div className="aceite-barra">
        <Link href="/conta/configuracoes" className="back-link">
          ‹ Voltar para configurações
        </Link>
        <PrintButton />
      </div>

      <article className="legal-proof-sheet">
        {/* Título do documento é h2: o h1 da página é o da topbar. */}
        <header className="aceite-cab">
          <p className="aceite-sobre">Registro de Manifestação de Vontade e Aceite Formal</p>
          <h2 className="aceite-titulo">Comprovante de Aceite de Documento Legal #{a.id}</h2>
          <p className="aceite-emissor">
            ÁUREA CUSTÓDIA LTDA · CNPJ 68.071.452/0001-06 · Sistema de Custódia e Marketplace
          </p>
        </header>

        <section>
          <h3>1. Identificação do Documento</h3>
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
          <h3>2. Dados da Manifestação e Autoria</h3>
          <div className="legal-proof-grid">
            <span className="legal-proof-label">Titular / E-mail:</span>
            <span className="legal-proof-val">{a.userEmail}</span>

            <span className="legal-proof-label">Data e Hora:</span>
            <span className="legal-proof-val">
              {dataFormatada} <small className="aceite-iso">({new Date(a.createdAt).toISOString()})</small>
            </span>

            <span className="legal-proof-label">Canal de Aceite:</span>
            <span className="legal-proof-val">{canalFormatado}</span>

            <span className="legal-proof-label">Método Empregado:</span>
            <span className="legal-proof-val">{metodoFormatado}</span>

            {a.nomeDigitado && (
              <>
                <span className="legal-proof-label">Nome Digitado (Assinatura):</span>
                <span className="legal-proof-val forte">
                  {a.nomeDigitado}
                </span>
              </>
            )}

            <span className="legal-proof-label">Endereço IP:</span>
            <span className="legal-proof-val code">{a.ip || 'Não capturado'}</span>

            <span className="legal-proof-label">Dispositivo / Agente:</span>
            <span className="legal-proof-val menor">
              {a.userAgent || 'Não informado'}
            </span>
          </div>
        </section>

        <section>
          <h3>3. Prova Matemática e Encadeamento Criptográfico</h3>
          <p className="aceite-explica">
            Cada registro de aceite no Real Olímpico é vinculado matematicamente ao elo histórico
            anterior da tabela através do algoritmo SHA-256 (Lei 14.063/2020 e Código de Processo Civil, art. 411, II).
          </p>
          <div className="legal-proof-grid">
            <span className="legal-proof-label">Hash Anterior (Elo N-1):</span>
            <span className="legal-proof-val code">{a.hashAnterior}</span>

            <span className="legal-proof-label">Hash do Registro (Elo N):</span>
            <span className="legal-proof-val code forte">
              {a.hash}
            </span>
          </div>
        </section>

        <section>
          <h3>4. Texto Exibido no Momento do Consentimento</h3>
          <blockquote className="legal-proof-text">
            &ldquo;{a.textoExibido}&rdquo;
          </blockquote>
        </section>

        <footer className="aceite-rodape">
          Este documento constitui meio de prova eletrônica de declaração de vontade e aceitação de termos,
          gerado a partir dos registros auditáveis mantidos de forma imutável nos servidores do Real Olímpico.
        </footer>
      </article>
    </div>
  )
}
