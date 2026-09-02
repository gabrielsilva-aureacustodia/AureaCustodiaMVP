import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import { LegalDocument } from '@/components/legal/LegalDocument'

const VERSION = 'RASCUNHO-0.1-2026-09-02'

export const metadata: Metadata = {
  title: 'Política de Privacidade | Áurea Custódia',
  description: 'Política de Privacidade provisória da plataforma Áurea Custódia.',
}

export default function PrivacyPage(): ReactNode {
  return (
    <LegalDocument
      title="Política de Privacidade"
      version={VERSION}
      updatedAt="2 de setembro de 2026"
    >
      <section>
        <h2>1. Objetivo e controlador</h2>
        <p>
          Esta Política explica como a AUREA CUSTODIA LTDA, CNPJ
          68.071.452/0001-06, na qualidade de controladora, trata dados pessoais
          relacionados à landing, cadastro, autenticação e uso da plataforma Áurea Custódia.
        </p>
      </section>

      <section>
        <h2>2. Dados que podemos tratar</h2>
        <ul>
          <li>
            <strong>Cadastro e identificação:</strong> nome, e-mail, identificadores de conta,
            confirmação do e-mail e dados fornecidos pelo Google quando essa opção for usada.
          </li>
          <li>
            <strong>Aceite legal:</strong> versões dos documentos aceitos, data e hora do
            aceite.
          </li>
          <li>
            <strong>Conta e operação:</strong> preferências, saldos, extratos, ofertas,
            negociações, protocolos, moedas, recibos e histórico de acesso.
          </li>
          <li>
            <strong>Custódia e logística:</strong> dados de postagem, rastreamento, recebimento,
            análise, fotos do item e informações necessárias à devolução ou retirada.
          </li>
          <li>
            <strong>Pagamentos:</strong> identificadores, status e dados estritamente
            necessários à conciliação; dados completos de cartão não devem ser armazenados
            pela Áurea quando processados por provedor especializado.
          </li>
          <li>
            <strong>Dados técnicos:</strong> endereço IP, data e hora, navegador, dispositivo,
            páginas acessadas, logs de erro, segurança e cookies essenciais.
          </li>
          <li>
            <strong>Atendimento:</strong> conteúdo das mensagens e documentos enviados
            voluntariamente para resolver uma solicitação.
          </li>
        </ul>
        <p>
          No Pré-MVP, parte dos dados operacionais é fictícia. A Áurea não solicita dados
          pessoais sensíveis como regra; se uma situação específica exigir esse tratamento,
          ela deverá receber avaliação própria e informação destacada.
        </p>
      </section>

      <section>
        <h2>3. Finalidades e bases legais</h2>
        <p>Os dados podem ser tratados para:</p>
        <ul>
          <li>criar, confirmar e proteger a conta;</li>
          <li>executar o serviço solicitado e procedimentos anteriores à contratação;</li>
          <li>administrar custódia, recibos, negociações, pagamentos e logística;</li>
          <li>prevenir fraude, abuso, acesso não autorizado e incidentes de segurança;</li>
          <li>prestar atendimento e exercer direitos em processos;</li>
          <li>cumprir obrigações legais, regulatórias, fiscais e de prevenção a ilícitos;</li>
          <li>melhorar estabilidade, usabilidade e desempenho da plataforma;</li>
          <li>enviar comunicações de autenticação e serviço.</li>
        </ul>
        <p>
          Conforme a finalidade, as bases legais podem incluir execução de contrato ou
          procedimentos preliminares, cumprimento de obrigação legal ou regulatória, exercício
          regular de direitos, legítimo interesse com avaliação de necessidade e impacto, e
          consentimento quando ele for efetivamente exigido.
        </p>
      </section>

      <section>
        <h2>4. Compartilhamento e operadores</h2>
        <p>
          Dados são compartilhados apenas na medida necessária com prestadores que apoiam a
          operação. Na arquitetura prevista, isso pode incluir:
        </p>
        <ul>
          <li>Supabase, para autenticação e banco de dados;</li>
          <li>Vercel, para hospedagem, entrega e logs da aplicação;</li>
          <li>Resend, para entrega de e-mails de autenticação;</li>
          <li>Google, quando a pessoa optar pelo login social;</li>
          <li>provedores de pagamento, quando operações reais forem habilitadas;</li>
          <li>Correios ou operadores logísticos, quando houver envio físico;</li>
          <li>consultores, auditores e autoridades, quando necessário ou exigido por lei.</li>
        </ul>
        <p>
          A Áurea não vende dados pessoais. Cada prestador pode atuar como operador ou
          controlador independente, conforme o serviço e seus próprios termos.
        </p>
      </section>

      <section>
        <h2>5. Transferências internacionais</h2>
        <p>
          Alguns fornecedores de tecnologia podem processar dados fora do Brasil. Nesses casos,
          a Áurea deve adotar mecanismo permitido pela LGPD e medidas contratuais, técnicas e
          organizacionais compatíveis. A localização efetiva depende da região e configuração
          contratadas com cada fornecedor.
        </p>
      </section>

      <section>
        <h2>6. Cookies e autenticação</h2>
        <p>
          A plataforma utiliza cookies estritamente necessários para autenticação, segurança,
          continuidade da sessão e retorno do OAuth. Eles incluem cookies do Supabase e o cookie
          interno assinado da Áurea. Não há, nesta entrega, finalidade publicitária baseada em
          cookies. Caso cookies opcionais sejam introduzidos, esta Política e os controles de
          escolha deverão ser atualizados antes do uso.
        </p>
      </section>

      <section>
        <h2>7. Retenção e eliminação</h2>
        <p>
          Os dados são mantidos pelo tempo necessário às finalidades informadas, durante a
          relação com o usuário e pelos prazos legais ou regulatórios aplicáveis. Registros
          podem ser preservados para segurança, auditoria, prevenção a fraude e exercício de
          direitos. Depois disso, serão eliminados ou anonimizados, ressalvadas hipóteses legais
          de conservação e ciclos técnicos de backup.
        </p>
      </section>

      <section>
        <h2>8. Segurança</h2>
        <p>
          São adotadas medidas compatíveis com o risco, como senha processada pelo provedor de
          identidade, comunicações criptografadas, cookies HttpOnly assinados, segregação de
          segredos, controle de acesso, registros técnicos e revisão de dependências. Nenhum
          sistema é absolutamente imune; incidentes relevantes serão tratados e comunicados
          conforme a legislação aplicável.
        </p>
      </section>

      <section>
        <h2>9. Direitos do titular</h2>
        <p>
          Nos termos da LGPD, a pessoa pode solicitar, quando aplicável: confirmação de
          tratamento, acesso, correção, anonimização, bloqueio ou eliminação, portabilidade,
          informação sobre compartilhamento, revisão de decisões automatizadas, oposição e
          revogação do consentimento. A solicitação pode exigir confirmação de identidade para
          proteger a própria conta.
        </p>
      </section>

      <section>
        <h2>10. Crianças e adolescentes</h2>
        <p>
          O cadastro não é direcionado a menores de 18 anos. Uma futura oferta destinada a
          crianças ou adolescentes dependerá de desenho específico, avaliação jurídica e
          observância do melhor interesse e das demais exigências legais.
        </p>
      </section>

      <section>
        <h2>11. Decisões automatizadas</h2>
        <p>
          Esta versão não prevê decisão exclusivamente automatizada com efeito jurídico ou
          impacto relevante sobre o titular. Se esse tratamento for introduzido, serão
          informados critérios, efeitos e meios de solicitar revisão, na forma da lei.
        </p>
      </section>

      <section>
        <h2>12. Canal de privacidade</h2>
        <p>
          Solicitações sobre dados pessoais podem ser enviadas para{' '}
          <a href="mailto:gabriel.silva@aureacustodia.com.br">
            gabriel.silva@aureacustodia.com.br
          </a>
          . A função do canal, o responsável e o prazo operacional de atendimento devem ser
          confirmados antes da abertura pública.
        </p>
      </section>

      <section>
        <h2>13. Atualizações</h2>
        <p>
          Esta Política pode ser atualizada para refletir mudanças legais, técnicas ou
          operacionais. Alterações relevantes terão nova versão e data e, quando necessário,
          novo aviso ou aceite.
        </p>
      </section>

      <section>
        <h2>Referências do rascunho</h2>
        <ul>
          <li>Lei nº 13.709/2018 — Lei Geral de Proteção de Dados Pessoais.</li>
          <li>Resolução CD/ANPD nº 2/2022 — agentes de tratamento de pequeno porte.</li>
          <li>Guias e materiais orientativos publicados pela ANPD.</li>
        </ul>
      </section>
    </LegalDocument>
  )
}
