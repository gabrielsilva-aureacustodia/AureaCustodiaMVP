import type { Metadata } from 'next'
import Link from 'next/link'
import type { ReactNode } from 'react'

import { LegalDocument } from '@/components/legal/LegalDocument'
import { formatarTelefoneE164 } from '@/domain/admin/telefone'
import { PARAMETROS_LEGAIS } from '@/domain/documentos-legais/parametros'
import { carregarCanaisDeAtendimento } from '@/server/config/carregar'

export const metadata: Metadata = {
  title: 'Atendimento ao Cliente (SAC) | Áurea Custódia',
  description:
    'Canal oficial de Serviço de Atendimento ao Cliente (SAC) da Áurea Custódia — suporte numismático, dúvidas operacionais e exercício de direitos LGPD.',
}

// Canais de atendimento editáveis no painel desde a C3 (aba Operacional): dinâmica para não
// congelar no build o e-mail e os números que existiam na hora do deploy.
export const dynamic = 'force-dynamic'

export default async function SupportPage(): Promise<ReactNode> {
  const canais = await carregarCanaisDeAtendimento()
  const whatsappDigitos = canais.whatsapp.replace(/\D/g, '')
  return (
    <LegalDocument
      title="Serviço de Atendimento ao Cliente (SAC)"
      version="1.0"
      updatedAt={PARAMETROS_LEGAIS.vigencia}
      eyebrow="Canal Oficial de Atendimento e Ouvidoria"
    >
      <div className="legal-quote">
        <p>
          A Áurea Custódia preza pela transparência, segurança patrimonial e pelo respeito absoluto
          aos direitos dos colecionadores e usuários de nossos serviços. Este canal destina-se ao
          esclarecimento de dúvidas operacionais, suporte a negociações no marketplace,
          rastreamento de custódia e atendimento à legislação vigente.
        </p>
      </div>

      <section>
        <h2>1. Canal Oficial de Atendimento Eletrônico</h2>
        <p>
          Nosso canal central de comunicação é realizado exclusivamente pelo endereço eletrônico
          institucional:
        </p>

        <div className="legal-example-card">
          <h4>Canal Exclusivo por E-mail:</h4>
          <p>
            • <strong>Endereço:</strong>{' '}
            <a
              href={`mailto:${canais.email}`}
              className="legal-block-link"
              style={{ fontWeight: 600 }}
            >
              {canais.email}
            </a>
          </p>
          {canais.whatsapp ? (
            <p>
              • <strong>WhatsApp:</strong>{' '}
              <a href={`https://wa.me/${whatsappDigitos}`} className="legal-block-link" style={{ fontWeight: 600 }} target="_blank" rel="noreferrer">
                {formatarTelefoneE164(canais.whatsapp)}
              </a>
            </p>
          ) : null}
          {canais.telefone ? (
            <p>
              • <strong>Telefone:</strong>{' '}
              <a href={`tel:${canais.telefone}`} className="legal-block-link" style={{ fontWeight: 600 }}>
                {formatarTelefoneE164(canais.telefone)}
              </a>
            </p>
          ) : null}
          <p>
            • <strong>Horário de Atendimento:</strong> Dias úteis, das 09:00 às 18:00 (horário de Brasília)
          </p>
          <p>
            • <strong>Prazo Estimado de Resposta:</strong> Em até 2 (dois) dias úteis.
          </p>
        </div>
      </section>

      <section>
        <h2>2. Assuntos Tratados pelo SAC</h2>
        <ul>
          <li>
            <strong>Custódia Física e Cofre:</strong> dúvidas sobre recebimento de remessas postais,
            prazos de validação e emissão de recibos de custódia.
          </li>
          <li>
            <strong>Marketplace Numismático:</strong> suporte na publicação de ofertas, compras diretas,
            casamento de pedidos e taxas de corretagem (ver{' '}
            <Link href="/taxas">Tabela de Taxas</Link>).
          </li>
          <li>
            <strong>Retiradas e Desentranhamento:</strong> acompanhamento de solicitações de envio físico
            de moedas custodiadas até seu endereço.
          </li>
          <li>
            <strong>Direitos do Titular de Dados (LGPD):</strong> requisição de confirmação de
            tratamento, acesso, correção ou exclusão de dados pessoais nos termos da nossa{' '}
            <Link href="/privacidade">Política de Privacidade</Link>.
          </li>
          <li>
            <strong>Denúncias e Notificações de Fraude:</strong> relato de atividades suspeitas ou
            tentativas de violação de segurança.
          </li>
        </ul>
      </section>

      <section>
        <h2>3. Alertas Importantes de Segurança</h2>
        <aside className="legal-draft-warning" role="note" style={{ borderColor: 'var(--gold)' }}>
          <strong>Aviso de Segurança Contra Fraudes:</strong>
          <p>
            A equipe da Áurea Custódia <strong>nunca</strong> solicita sua senha de acesso, códigos de
            verificação por e-mail ou dados confidenciais por qualquer meio. Todas as comunicações
            oficiais provêm unicamente de endereços com o domínio oficial{' '}
            <code>@aureacustodia.com.br</code>. Em caso de mensagens suspeitas, contate imediatamente o SAC.
          </p>
        </aside>
      </section>

      {!canais.whatsapp && !canais.telefone ? (
        <section>
          <h2>4. Nota sobre Telefonia e WhatsApp Corporativo (RA-26)</h2>
          <p>
            Informamos aos usuários que as linhas corporativas de atendimento telefônico e WhatsApp
            oficial encontram-se atualmente em fase final de homologação junto às operadoras de
            telecomunicações e segurança da informação. Tão logo homologados, os novos números serão
            publicados formalmente nesta página.
          </p>
        </section>
      ) : null}
    </LegalDocument>
  )
}
