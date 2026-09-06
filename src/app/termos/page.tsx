import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import { LegalDocument } from '@/components/legal/LegalDocument'

const VERSION = 'RASCUNHO-0.1-2026-09-02'

export const metadata: Metadata = {
  title: 'Termos de Uso | Áurea Custódia',
  description: 'Termos de Uso provisórios da plataforma Áurea Custódia.',
}

export default function TermsPage(): ReactNode {
  return (
    <LegalDocument title="Termos de Uso" version={VERSION} updatedAt="2 de setembro de 2026">
      <section>
        <h2>1. Identificação e objeto</h2>
        <p>
          Estes Termos regulam o acesso à plataforma Áurea Custódia, operada por AUREA
          CUSTODIA LTDA, CNPJ 68.071.452/0001-06, para acompanhamento de custódia física,
          recibos digitais, ofertas e negociações de moedas comemorativas elegíveis.
        </p>
        <p>
          Nesta fase de Pré-MVP, saldos, transações, protocolos e itens exibidos podem ser
          fictícios e destinados exclusivamente a validação do produto.
        </p>
      </section>

      <section>
        <h2>2. Aceite e versão aplicável</h2>
        <p>
          Ao criar uma conta, a pessoa usuária declara que leu e aceitou estes Termos e a
          Política de Privacidade. A plataforma registra a versão aceita e a data e hora do
          aceite. Quem não concordar deve interromper o cadastro e não utilizar as áreas
          autenticadas.
        </p>
      </section>

      <section>
        <h2>3. Elegibilidade e conta</h2>
        <ul>
          <li>O uso é destinado a pessoas com capacidade civil para contratar.</li>
          <li>Os dados informados devem ser verdadeiros, completos e atualizados.</li>
          <li>A conta é pessoal e não deve ser cedida ou compartilhada.</li>
          <li>A senha deve ser mantida em sigilo e incidentes devem ser comunicados.</li>
          <li>A Áurea pode solicitar validações adicionais de identidade e titularidade.</li>
        </ul>
      </section>

      <section>
        <h2>4. Custódia física e análise dos itens</h2>
        <p>
          O envio de uma moeda não implica aceitação automática em custódia. O item pode ser
          identificado, fotografado, analisado e recusado quando não atender aos critérios
          operacionais, de autenticidade, conservação, origem ou elegibilidade informados no
          fluxo correspondente.
        </p>
        <p>
          Prazos, custos, responsabilidades de postagem, devolução e retirada serão exibidos
          antes da confirmação da operação aplicável. A pessoa usuária deve embalar e declarar
          o envio conforme as instruções apresentadas.
        </p>
      </section>

      <section>
        <h2>5. Recibo digital</h2>
        <p>
          O recibo digital é um registro eletrônico ligado ao item custodiado. Ele não é
          moeda, valor mobiliário, criptoativo, promessa de rendimento nem garantia de
          valorização. Sua finalidade é facilitar identificação, histórico e rastreabilidade
          operacional dentro da plataforma.
        </p>
      </section>

      <section>
        <h2>6. Marketplace e negociações</h2>
        <p>
          A plataforma poderá permitir ofertas de compra e venda entre usuários habilitados.
          Preço, taxas, quantidade, item, prazo e demais condições relevantes devem ser
          apresentados antes da confirmação. O usuário é responsável por revisar os dados e
          corrigir eventuais erros antes de concluir.
        </p>
        <p>
          Informações de mercado, gráficos e históricos têm caráter informativo e não
          constituem recomendação de investimento, garantia de liquidez ou promessa de retorno.
        </p>
      </section>

      <section>
        <h2>7. Pagamentos, saldos e taxas</h2>
        <p>
          Enquanto a plataforma estiver identificada como ambiente de teste, valores exibidos
          não representam recursos reais. Depósitos, saques ou liquidações reais somente serão
          ativados depois das validações jurídicas, regulatórias, técnicas e operacionais
          aplicáveis.
        </p>
        <p>
          Quando operações reais forem disponibilizadas, taxas e condições serão informadas de
          forma destacada antes da contratação, e provedores de pagamento poderão aplicar seus
          próprios termos.
        </p>
      </section>

      <section>
        <h2>8. Seguro do acervo</h2>
        <p>
          A operação prevê seguro para o acervo custodiado. Coberturas, limites, franquias,
          exclusões, vigência e procedimento de sinistro serão divulgados quando a contratação
          estiver concluída. Este rascunho não declara que existe apólice vigente.
        </p>
      </section>

      <section>
        <h2>9. Condutas proibidas</h2>
        <p>É proibido:</p>
        <ul>
          <li>usar identidade ou meios de pagamento de terceiros sem autorização;</li>
          <li>enviar itens ilícitos, falsos, adulterados ou de origem não comprovável;</li>
          <li>manipular ofertas, preços, avaliações ou mecanismos da plataforma;</li>
          <li>tentar acessar contas, dados, código ou infraestrutura sem autorização;</li>
          <li>usar a plataforma para fraude, lavagem de dinheiro ou outra atividade ilícita;</li>
          <li>reproduzir marca, conteúdo ou software em desacordo com a lei.</li>
        </ul>
      </section>

      <section>
        <h2>10. Suspensão e encerramento</h2>
        <p>
          A Áurea pode limitar, suspender ou encerrar acessos para proteger usuários e a
          operação, cumprir obrigações legais, investigar fraude, corrigir falhas ou reagir ao
          descumprimento destes Termos. Quando possível e permitido, a pessoa será informada e
          poderá solicitar esclarecimentos pelo canal de atendimento.
        </p>
      </section>

      <section>
        <h2>11. Disponibilidade e responsabilidade</h2>
        <p>
          A Áurea adota esforços razoáveis de segurança e continuidade, mas a plataforma pode
          passar por manutenção, indisponibilidade ou falhas de terceiros. Nada nestes Termos
          exclui direitos ou responsabilidades que não possam ser afastados pela legislação
          brasileira, especialmente as normas de proteção do consumidor.
        </p>
      </section>

      <section>
        <h2>12. Direitos do consumidor</h2>
        <p>
          Quando a relação for de consumo, serão respeitados o dever de informação, a correção
          de erros antes da contratação, o atendimento eletrônico, a confirmação das operações
          e o direito de arrependimento nas hipóteses e prazos previstos em lei. Regras
          específicas de devolução física, custódia iniciada ou serviço já executado devem ser
          detalhadas e revisadas juridicamente antes da operação real.
        </p>
      </section>

      <section>
        <h2>13. Propriedade intelectual</h2>
        <p>
          A marca, a identidade visual, o software, os textos e demais conteúdos pertencem à
          Áurea ou aos respectivos licenciantes. O acesso à plataforma não transfere qualquer
          direito de propriedade intelectual ao usuário.
        </p>
      </section>

      <section>
        <h2>14. Alterações destes Termos</h2>
        <p>
          Mudanças relevantes serão publicadas com nova versão e data. Quando exigido pela
          natureza da alteração ou pela lei, será solicitado novo aceite antes da continuidade
          do uso.
        </p>
      </section>

      <section>
        <h2>15. Lei aplicável e solução de conflitos</h2>
        <p>
          Aplicam-se as leis da República Federativa do Brasil. Fica preservado o foro do
          domicílio do consumidor quando a legislação lhe assegurar essa escolha. Antes de uma
          medida judicial, as partes são incentivadas a buscar solução pelo canal de
          atendimento.
        </p>
      </section>

      <section>
        <h2>16. Atendimento</h2>
        <p>
          Dúvidas, solicitações e reclamações podem ser enviadas para{' '}
          <a href="mailto:gabriel.silva@aureacustodia.com.br">
            gabriel.silva@aureacustodia.com.br
          </a>
          . O canal e o prazo operacional de resposta devem ser confirmados antes da abertura
          pública.
        </p>
      </section>

      <section>
        <h2>Referências legais do rascunho</h2>
        <ul>
          <li>Lei nº 8.078/1990 — Código de Defesa do Consumidor.</li>
          <li>Decreto nº 7.962/2013 — contratação no comércio eletrônico.</li>
          <li>Lei nº 12.965/2014 — Marco Civil da Internet.</li>
          <li>Lei nº 13.709/2018 — Lei Geral de Proteção de Dados Pessoais.</li>
        </ul>
      </section>
    </LegalDocument>
  )
}
