import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import { LegalDocument } from '@/components/legal/LegalDocument'

const VERSION = '1.0-2026-09-10'
const UPDATED_AT = '10 de setembro de 2026'

export const metadata: Metadata = {
  title: 'Política de Privacidade | Áurea Custódia',
  description:
    'Política de Privacidade da plataforma Áurea Custódia — governança de dados pessoais, cadastro progressivo e conformidade com a LGPD.',
}

export default function PrivacyPage(): ReactNode {
  return (
    <LegalDocument
      title="Política de Privacidade"
      version={VERSION}
      updatedAt={UPDATED_AT}
      eyebrow="Documento institucional"
      noticeTitle="Governança de dados e privacidade — alinhada com o jurídico em 09/09/2026"
      noticeDescription={
        <p>
          Esta política detalha o tratamento dos dados do cadastro progressivo da plataforma,
          as bases legais da LGPD e as garantias de segurança da custódia. A redação final
          elaborada pela assessoria jurídica será incorporada em 12/09/2026.
        </p>
      }
    >
      <section>
        <h2>1. Identificação da controladora e princípios</h2>
        <p>
          Esta Política de Privacidade descreve de forma transparente como a{' '}
          <strong>AUREA CUSTODIA LTDA</strong>, pessoa jurídica de direito privado inscrita no
          CNPJ sob o nº 68.071.452/0001-06 (nome fantasia <strong>Real Olímpico</strong>), na
          qualidade de controladora de dados, realiza o tratamento dos dados pessoais de seus
          usuários no âmbito do site, ambiente de autenticação e plataforma operacional.
        </p>
        <p>
          Nossa atuação pauta-se pelo princípio da minimização e da segurança (Art. 6º da Lei
          nº 13.709/2018 — Lei Geral de Proteção de Dados Pessoais / LGPD): coletamos apenas os
          dados estritamente indispensáveis para o cumprimento das obrigações contratuais, fiscais
          e logísticas da custódia física de moedas comemorativas e do marketplace.
        </p>
      </section>

      <section>
        <h2>2. Dados tratados e o Cadastro Progressivo</h2>
        <p>
          A Áurea adota o modelo de <strong>cadastro progressivo</strong>. A navegação no site e a
          criação de conta inicial não exigem preenchimento de dados pessoais extensos. Dados
          adicionais somente são solicitados no momento exato em que uma funcionalidade patrimonial
          específica for acionada pelo usuário:
        </p>
        <ul>
          <li>
            <strong>Abertura de conta básica (Navegação inicial):</strong> endereço de e-mail, nome
            de exibição e hash criptográfico de senha (ou identificador unívoco de conta quando
            utilizada autenticação Google).
          </li>
          <li>
            <strong>Identificação formal e fiscal (Solicitada no 1º depósito, compra ou saque):</strong>{' '}
            nome completo, número do Cadastro de Pessoas Físicas (CPF) e data de nascimento. Esses
            dados são necessários para validação de maioridade civil, prevenção à fraude e emissão
            dos comprovantes fiscais e contábeis exigidos por lei.
          </li>
          <li>
            <strong>Contato operacional:</strong> número de telefone celular com código de área,
            utilizado exclusivamente para comunicações urgentes de custódia e validação de segurança.
          </li>
          <li>
            <strong>Endereço de entrega (Solicitado apenas na devolução física da moeda):</strong>{' '}
            logradouro, número, complemento, bairro, cidade, Estado (UF) e Código de Endereçamento
            Postal (CEP), necessários para a emissão de guias de postagem e contratação de seguro
            postal ou transporte especializado de valores.
          </li>
          <li>
            <strong>Dados bancários (Solicitados exclusivamente para liquidação de saques):</strong>{' '}
            chave Pix e tipo de chave (ou dados de agência, conta e instituição bancária). Em
            cumprimento às regras de segurança financeira, a chave Pix e a conta de destino devem
            pertencer obrigatoriamente à mesma titularidade do CPF cadastrado na plataforma.
          </li>
          <li>
            <strong>Registros de conexão e auditoria técnica:</strong> endereço IP, data e hora de
            acesso, porta lógica de origem, tipo de navegador e eventos do sistema, coletados em
            estrito cumprimento ao Art. 15 da Lei nº 12.965/2014 (Marco Civil da Internet).
          </li>
          <li>
            <strong>Trilha contábil e histórico de operações:</strong> protocolos de custódia,
            recibos emitidos, registros de ordens no marketplace e movimentações financeiras,
            estruturados em livro contábil append-only com encadeamento criptográfico SHA-256.
          </li>
        </ul>
      </section>

      <section>
        <h2>3. Dados que NÃO tratamos (Diretriz de minimização)</h2>
        <p>
          Por decisão deliberada de governança e proteção do cliente, informamos com total clareza:
        </p>
        <ul>
          <li>
            <strong>Sem fotos de documentos:</strong> a Áurea não solicita, não armazena e não exige
            upload de fotos de documentos pessoais (como RG, CNH ou passaporte).
          </li>
          <li>
            <strong>Sem biometria facial ou selfies:</strong> não realizamos coleta de traços
            biométricos, reconhecimento facial, autorretratos com documentos ou qualquer prova de
            vida por imagem.
          </li>
          <li>
            <strong>Sem dados sensíveis:</strong> não há qualquer coleta de dados sobre origem
            racial, convicção religiosa, opinião política, filiação sindical, saúde ou vida sexual
            (Art. 5º, II da LGPD).
          </li>
        </ul>
      </section>

      <section>
        <h2>4. Finalidades e bases legais (Art. 7º da LGPD)</h2>
        <p>
          O tratamento dos dados pessoais acima listados fundamenta-se estritamente nas hipóteses
          autorizadas pela legislação brasileira:
        </p>
        <ul>
          <li>
            <strong>Execução de contrato e procedimentos preliminares (Art. 7º, V):</strong> criação
            e administração da conta, controle da custódia em sala-forte, emissão de recibos de
            custódia, liquidação de ordens no marketplace, processamento de depósitos e saques, e
            postagem e rastreamento de moedas comemorativas.
          </li>
          <li>
            <strong>Cumprimento de obrigação legal ou regulatória (Art. 7º, II):</strong> retenção
            de logs de aplicação por 6 meses nos termos do Marco Civil da Internet; manutenção de
            registros fiscais e contábeis de acordo com a legislação tributária brasileira.
          </li>
          <li>
            <strong>Prevenção a fraudes e segurança patrimonial (Art. 7º, IX e X):</strong> proteção
            contra acessos não autorizados, prevenção de fraudes em pagamentos, garantia da
            integridade dos livros contábeis e proteção do patrimônio físico sob guarda.
          </li>
          <li>
            <strong>Exercício regular de direitos (Art. 7º, VI):</strong> guarda de documentação
            para eventual defesa em processos judiciais, administrativos ou arbitrais.
          </li>
        </ul>
      </section>

      <section>
        <h2>5. Compartilhamento estrito com operadores e terceiros</h2>
        <p>
          A Áurea não comercializa, não aluga e não cede dados de usuários para empresas de
          publicidade ou marketing. O compartilhamento ocorre exclusivamente com prestadores de
          serviços tecnológicos e logísticos fundamentais para a viabilização da plataforma:
        </p>
        <ul>
          <li>
            <strong>Supabase Inc.:</strong> provedor de infraestrutura de banco de dados Postgres e
            serviço de autenticação, sob contratos de confidencialidade e cláusulas de segurança.
          </li>
          <li>
            <strong>Vercel Inc.:</strong> infraestrutura de computação de borda, hospedagem e entrega
            da aplicação web.
          </li>
          <li>
            <strong>Mercado Pago Instituição de Pagamento Ltda.:</strong> instituição intermediadora
            de pagamentos para processamento seguro de Checkout e conciliação de depósitos. Os dados
            de pagamento (como números de cartão de crédito) são processados diretamente em ambiente
            certificado PCI-DSS do intermediador e jamais são armazenados nos servidores da Áurea.
          </li>
          <li>
            <strong>Empresa Brasileira de Correios e Telégrafos (ECT) e transportadora especializada:</strong>{' '}
            compartilhamento exclusivo do nome, CPF e endereço do destinatário estritamente
            necessários para emissão de etiquetas de postagem e declaração de conteúdo postal.
          </li>
          <li>
            <strong>Resend e Google Workspace:</strong> envio de e-mails transacionais de
            confirmação de conta, protocolos de envio e alertas de segurança.
          </li>
        </ul>
      </section>

      <section>
        <h2>6. Segurança e medidas técnicas de proteção</h2>
        <p>
          Adotamos salvaguardas técnicas e administrativas rigorosas para proteger seus dados contra
          acessos não autorizados, vazamentos ou perdas acidentais:
        </p>
        <ul>
          <li>Comunicações integralmente protegidas por criptografia em trânsito (protocolo TLS 1.3);</li>
          <li>Armazenamento de banco de dados com criptografia em repouso (AES-256);</li>
          <li>Cookies de sessão protegidos por atributos HttpOnly, Secure e SameSite=Lax;</li>
          <li>
            Políticas de privacidade aplicadas às etiquetas de frete: endereços e dados pessoais de
            destinatários não são armazenados em baldes ou links públicos de arquivos;
          </li>
          <li>
            Segregação de privilégios de acesso administrativo: apenas diretores formalmente
            designados possuem acesso aos dados analíticos internos.
          </li>
        </ul>
      </section>

      <section>
        <h2>7. Prazos de retenção e eliminação de dados</h2>
        <p>
          Os dados pessoais são armazenados exclusivamente pelo período necessário para atender às
          suas finalidades legais e operacionais:
        </p>
        <ul>
          <li>
            <strong>Dados cadastrais e contratuais:</strong> conservados durante toda a vigência da
            conta e pelo prazo prescricional de 5 anos após o encerramento do vínculo, com base no
            Art. 27 do Código de Defesa do Consumidor e no Código Civil.
          </li>
          <li>
            <strong>Registros de conexão (IPs):</strong> mantidos sob sigilo pelo prazo obrigatório
            de 6 meses, conforme determina o Art. 15 do Marco Civil da Internet.
          </li>
          <li>
            <strong>Registros fiscais e contábeis:</strong> mantidos pelo prazo decadencial de 5
            anos para cumprimento da legislação tributária nacional.
          </li>
        </ul>
        <p>
          Decorrido o prazo legal ou havendo solicitação legítima do titular de encerramento da
          conta, os dados que não sejam de guarda obrigatória por lei serão eliminados ou submetidos
          a processo irreversível de anonimização.
        </p>
      </section>

      <section>
        <h2>8. Direitos dos titulares de dados (Art. 18 da LGPD)</h2>
        <p>
          A pessoa usuária pode exercer a qualquer momento os seus direitos assegurados pelo
          Art. 18 da LGPD, mediante requisição direta ao canal de privacidade:
        </p>
        <ul>
          <li>Confirmação da existência de tratamento e acesso aos dados pessoais cadastrados;</li>
          <li>Correção de dados incompletos, inexatos ou desatualizados;</li>
          <li>
            Anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em
            desconformidade;
          </li>
          <li>Informação sobre entidades públicas e privadas com as quais houve compartilhamento;</li>
          <li>Revogação do consentimento, nas hipóteses em que este tenha sido a base legal.</li>
        </ul>
      </section>

      <section>
        <h2>9. Menores de idade</h2>
        <p>
          Os serviços da Áurea Custódia são estritamente direcionados a pessoas civilmente capazes,
          maiores de 18 anos de idade. A plataforma não realiza cadastro deliberado nem contratação
          com crianças ou adolescentes.
        </p>
      </section>

      <section>
        <h2>10. Decisões automatizadas</h2>
        <p>
          A plataforma não adota perfilamento invasivo, análise de crédito por algoritmos ou
          decisões exclusivamente automatizadas que gerem efeitos jurídicos relevantes ou
          prejuízos aos titulares.
        </p>
      </section>

      <section>
        <h2>11. Encarregado pelo tratamento de dados (DPO) e contato</h2>
        <p>
          Para o exercício de qualquer dos direitos previstos na LGPD, esclarecimento de dúvidas
          sobre esta Política ou comunicações relativas à segurança da informação, entre em contato
          direto com o nosso Encarregado de Dados:
        </p>
        <ul>
          <li><strong>Encarregado (DPO):</strong> Gabriel Silva</li>
          <li>
            <strong>E-mail de privacidade:</strong>{' '}
            <a href="mailto:gabriel.silva@aureacustodia.com.br">
              gabriel.silva@aureacustodia.com.br
            </a>
          </li>
          <li><strong>Prazo de resposta:</strong> até 15 dias corridos a contar da confirmação de titularidade da solicitação.</li>
        </ul>
      </section>

      <section>
        <h2>12. Atualizações desta Política e legislação aplicável</h2>
        <p>
          Esta Política de Privacidade poderá ser revisada periodicamente para refletir evoluções
          legais, tecnológicas ou melhorias na plataforma. A versão atualizada entrará em vigor na
          data de sua publicação no site, acompanhada do respectivo número de versão e carimbo de
          data.
        </p>
        <p>
          Este documento é integralmente regido pelas leis da República Federativa do Brasil, em
          especial pela Lei nº 13.709/2018 (LGPD) e Lei nº 12.965/2014 (Marco Civil da Internet).
          Fica resguardado o foro de domicílio do titular de dados para a solução de controvérsias.
        </p>
      </section>
    </LegalDocument>
  )
}
