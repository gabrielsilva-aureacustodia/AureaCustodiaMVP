import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import { LegalDocument } from '@/components/legal/LegalDocument'

const VERSION = '1.0-2026-09-10'
const UPDATED_AT = '10 de setembro de 2026'

export const metadata: Metadata = {
  title: 'Termos de Uso | Áurea Custódia',
  description:
    'Termos de Uso da plataforma Áurea Custódia — serviço de guarda de moedas comemorativas e marketplace de recibos de custódia.',
}

export default function TermsPage(): ReactNode {
  return (
    <LegalDocument
      title="Termos de Uso"
      version={VERSION}
      updatedAt={UPDATED_AT}
      eyebrow="Documento institucional"
      noticeTitle="Estrutura contratual oficial — alinhada com o jurídico em 09/09/2026"
      noticeDescription={
        <p>
          Este texto estabelece as sete regras operacionais e contratuais da plataforma,
          o posicionamento institucional aprovado e os critérios de guarda e negociação.
          A redação final elaborada pela assessoria jurídica será incorporada em 12/09/2026.
        </p>
      }
    >
      <section>
        <h2>1. Quem somos e o que fazemos</h2>
        <p>
          Estes Termos de Uso regulam o acesso e a utilização dos serviços oferecidos pela{' '}
          <strong>AUREA CUSTODIA LTDA</strong>, pessoa jurídica de direito privado, inscrita
          no CNPJ/MF sob o nº 68.071.452/0001-06, com sede e central de operações no Brasil,
          operando sob a denominação e marca comercial <strong>Real Olímpico</strong>.
        </p>
        <p>
          A plataforma destina-se à prestação de serviços de guarda física especializada e custódia
          de moedas comemorativas nacionais elegíveis (itens de coleção numismática), com emissão de
          recibos de custódia e disponibilização de ambiente de marketplace para negociação direta
          dos recibos entre colecionadores, sem necessidade de transporte físico da moeda a cada
          transação.
        </p>
      </section>

      <section>
        <h2>2. O que a Áurea NÃO é (Posicionamento institucional e regulatório)</h2>
        <p>
          Para assegurar transparência absoluta perante os usuários e órgãos reguladores,
          declaramos formalmente que:
        </p>
        <ul>
          <li>
            <strong>A Áurea não é corretora de valores mobiliários:</strong> não realizamos
            intermediação no mercado de capitais, não distribuímos produtos financeiros e não
            estamos sujeitos à regulação ou fiscalização da Comissão de Valores Mobiliários (CVM).
          </li>
          <li>
            <strong>A Áurea não é instituição financeira:</strong> não captamos recursos do
            público sob forma de depósitos remunerados, não concedemos empréstimos e não operamos
            como banco ou instituição de crédito.
          </li>
          <li>
            <strong>A Áurea não é plataforma de ativos virtuais:</strong> não emitimos, não
            custodiamos e não negociamos tokens, criptomoedas ou ativos virtuais, operando
            estritamente fora do enquadramento de prestadora de serviços de ativos virtuais (Resoluções
            BCB nº 519 a 521/2026 e Instrução Normativa RFB nº 1888/2019).
          </li>
          <li>
            <strong>Ausência de promessa de rentabilidade:</strong> as moedas comemorativas em
            custódia são bens físicos colecionáveis. A Áurea não promete, não sugere e não garante
            lucro, retorno financeiro, rentabilidade ou valorização de qualquer item. Preços
            históricos e estimativas exibidos na plataforma refletem unicamente negócios passados
            entre usuários e não configuram recomendação de compra ou venda.
          </li>
        </ul>
      </section>

      <section>
        <h2>3. História de origem e comunidade numismática</h2>
        <p>
          A Áurea Custódia nasceu da iniciativa de colecionadores de moedas comemorativas que
          vivenciavam as vulnerabilidades do mercado numismático brasileiro: ausência de custódia
          física segura, risco de roubo ou extravio postal a cada venda e inexistência de um
          ambiente auditável de conferência de autenticidade.
        </p>
        <p>
          O propósito da empresa é fortalecer a preservação histórica do patrimônio numismático,
          provendo infraestrutura física profissional (cofre de alta segurança com controle de acesso
          e cobertura securitária do acervo) aliada a recibos de custódia auditáveis.
        </p>
      </section>

      <section>
        <h2>4. Aceite eletrônico e condições de uso</h2>
        <p>
          A navegação nas áreas públicas do site, a consulta ao catálogo institucional e o acesso
          aos conteúdos educativos da rota Academy são totalmente livres.
        </p>
        <p>
          O aceite expresso destes Termos de Uso é formalmente exigido no momento em que a pessoa
          usuária optar por realizar qualquer operação patrimonial na plataforma — compreendendo o
          primeiro envio de moedas para custódia, depósitos monetários em conta, colocação de
          ofertas no marketplace ou solicitação de retiradas e saques.
        </p>
        <p>
          A plataforma registra de maneira indelével a versão vigente dos Termos, o endereço IP de
          origem e o carimbo de data e hora em que a concordância foi outorgada.
        </p>
      </section>

      <section>
        <h2>5. Entrada de itens e conferência técnica na bancada</h2>
        <p>
          A Áurea recebe exclusivamente as espécies comemorativas previamente autorizadas pelo seu
          comitê numismático (atualmente as moedas da Entrega da Bandeira Olímpica e dos Direitos
          Humanos).
        </p>
        <ul>
          <li>
            O envio deve ser realizado pelo usuário em <strong>envelope lacrado</strong>,
            seguindo as orientações da guia de postagem emitida na abertura do protocolo de custódia.
          </li>
          <li>
            O recebimento da encomenda não gera aceitação automática do item. A moeda é encaminhada
            à bancada de análise física da Áurea, onde especialistas aferem massa (peso), diâmetro,
            espessura, integridade e autenticidade.
          </li>
          <li>
            Itens aprovados recebem a emissão de recibo individual de custódia e são integrados ao
            cofre de custódia. Itens recusados por divergência de espécie, adulteração ou estado
            deplorável serão devolvidos ao remetente, correndo os custos de transporte por conta do
            usuário.
          </li>
        </ul>
      </section>

      <section>
        <h2>6. Recibo de custódia e unicidade</h2>
        <p>
          O recibo de custódia (identificado por código exclusivo com prefixo REC, como REC-000042)
          é o comprovante escritural emitido pela Áurea que atesta que uma moeda física elegível
          encontra-se depositada sob guarda segura em suas instalações.
        </p>
        <p>
          O recibo confere ao seu legítimo titular os direitos de manutenção em guarda, negociação
          no marketplace interno ou solicitação de devolução e resgate físico da moeda correspondente.
        </p>
      </section>

      <section>
        <h2>7. Cláusula 1: Devolução de moeda equiparável</h2>
        <p>
          <strong>Cláusula essencial de operação:</strong> a pessoa usuária reconhece e concorda que,
          em caso de solicitação de retirada física,{' '}
          <strong>
            a moeda devolvida pela Áurea não será necessariamente a mesma unidade física
            depositada originalmente, mas sim uma moeda equiparável, da mesmíssima espécie, valor
            facial e equivalente padrão de conservação
          </strong>{' '}
          aferido pela bancada técnica no momento da entrada.
        </p>
        <p>
          A guarda coletiva e fungível de itens numismáticos de idêntico padrão assegura agilidade
          na operação do cofre, segurança no manuseio e proteção física permanente ao acervo.
        </p>
      </section>

      <section>
        <h2>8. Cláusula 2: Extinção imediata do recibo na solicitação de retirada</h2>
        <p>
          <strong>Cláusula essencial de operação:</strong> no exato instante em que a pessoa usuária
          confirma a solicitação de retirada física de uma moeda e efetua o pagamento da respectiva
          taxa de envio,{' '}
          <strong>o recibo de custódia correspondente é imediatamente e definitivamente extinto</strong>{' '}
          no sistema.
        </p>
        <p>
          A partir desse instante, a moeda é removida da vitrine do marketplace e deixa de ser
          negociável ou transferível. Esta trava sistêmica impede de modo absoluto a coexistência
          de um recibo em circulação e de uma moeda física em processo de entrega.
        </p>
      </section>

      <section>
        <h2>9. Cláusulas 3 e 4: Inadimplência, bloqueio de recibos e retenção em garantia</h2>
        <p>
          O serviço de custódia física é remunerado pela taxa de R$ 2,00 por moeda ao mês (ou
          R$ 24,00 por ano em até 12 parcelas).
        </p>
        <ul>
          <li>
            <strong>Bloqueio por débito:</strong> na hipótese de inadimplemento das tarifas de
            custódia ou outros encargos contratuais, a Áurea poderá suspender cautelarmente a
            negociação no marketplace e a autorização de retirada das moedas vinculadas ao usuário
            até a quitação integral das pendências.
          </li>
          <li>
            <strong>Moeda como garantia:</strong> caso o débito acumulado do cliente supere o valor
            estimado de mercado da moeda custodiada, e após notificação formal com prazo razoável
            para purga da mora sem regularização, a Áurea fica autorizada a reter o item em garantia
            ou aliená-lo pelo valor de mercado para quitação das despesas de guarda, restituindo o
            saldo remanescente, se houver, à conta do titular.
          </li>
        </ul>
      </section>

      <section>
        <h2>10. Cláusula 5: Custos e modalidades de retirada da moeda</h2>
        <p>
          As despesas operacionais de separação em cofre, embalagem e frete correm integralmente
          por conta do cliente solicitante. A Áurea disponibiliza duas modalidades excludentes:
        </p>
        <ul>
          <li>
            <strong>Retirada Comum (R$ 50,00):</strong> separação a partir do estoque comum da Áurea,
            acondicionamento seguro e despacho postal via Correios com seguro declarado e aviso de
            recebimento (AR).
          </li>
          <li>
            <strong>Retirada Segura (R$ 180,00 em 2 parcelas):</strong> separação técnica
            especializada e contratação de transporte de valores blindado.
          </li>
        </ul>
        <p>
          Cada modalidade possui preço fechado e inclui todos os custos administrativos e logísticos
          aplicáveis, sem cobranças surpresas.
        </p>
      </section>

      <section>
        <h2>11. Cláusula 6: Prazos operacionais e requisitos de contagem</h2>
        <p>
          A fim de garantir a conciliação bancária segura e a integridade da sala-forte, os prazos
          da plataforma obedecem às seguintes regras:
        </p>
        <ul>
          <li>
            <strong>Saque de recursos monetários: até D+3 (72 horas úteis).</strong> O prazo
            somente começa a fluir após o cadastramento completo e validação de dados bancários ou
            chave Pix de titularidade exclusiva do usuário. Solicitações sem conta bancária
            confirmada permanecem congeladas e não iniciam a contagem do prazo. A tarifa de saque
            é de R$ 5,00 fixos por operação.
          </li>
          <li>
            <strong>Retirada física de moeda: até 30 dias corridos para preparo e postagem,
            mais o prazo de entrega dos Correios.</strong> Os 30 dias são o prazo OPERACIONAL da
            Áurea, destinado à conferência numismática, desengavetamento da sala-forte, embalagem
            lacrada, emissão de declaração de conteúdo e despacho. O prazo somente tem início após a
            confirmação inequívoca do endereço de entrega e a compensação da taxa de retirada.
            O tempo de trânsito postal corre por fora e varia conforme o destino: a Áurea
            <strong>não promete prazo de entrega</strong>, por não operar o transporte.
          </li>
        </ul>
        <p>
          A Áurea não se responsabiliza por atrasos decorrentes de greves, intempéries climáticas
          notórias ou inconsistências nos dados de destino fornecidos pelo próprio cliente.
        </p>
      </section>

      <section>
        <h2>12. Marketplace, formação de preço e privacidade</h2>
        <p>
          O marketplace permite a compra e venda de recibos de custódia entre colecionadores,
          com liquidação automática em conta. A comissão da plataforma é de 0,5% do valor da
          transação acrescida de R$ 1,00 por moeda negociada.
        </p>
        <p>
          Em consonância com as normas de proteção de dados e para preservação da segurança dos
          negociantes, o livro de ordens adota apelidos pseudonimizados (ex.: Vendedor #A93F e
          Comprador #938B), calculados a partir dos identificadores das ofertas. O usuário visualiza
          a indicação transparente &quot;Você&quot; apenas nas suas próprias posições.
        </p>
      </section>

      <section>
        <h2>13. Cláusula 7: Proteção do consumidor e transparência</h2>
        <p>
          A relação jurídica mantida com pessoas físicas é regida pela Lei nº 8.078/1990 (Código
          de Defesa do Consumidor) e pelo Decreto nº 7.962/2013 (Comércio Eletrônico).
        </p>
        <p>
          São garantidos ao usuário o acesso prévio e detalhado a todas as tarifas, o suporte
          eletrônico para esclarecimento de dúvidas e a confirmação imediata das operações
          solicitadas. As disposições restritivas constantes deste termo encontram-se grafadas com
          destaque especial para assegurar pleno conhecimento antes da contratação.
        </p>
      </section>

      <section>
        <h2>14. Condutas vedadas e integridade da plataforma</h2>
        <p>Constituem práticas terminantemente vedadas na plataforma:</p>
        <ul>
          <li>Fornecer dados cadastrais falsos, incompletos ou de terceiros;</li>
          <li>Enviar itens ilícitos, frutos de furto ou roubo, contrafeitos ou fraudados;</li>
          <li>Praticar manipulação artificial de cotações ou simulação de negociações no marketplace;</li>
          <li>Tentar burlar mecanismos de segurança, violar chaves de acesso ou extrair dados da plataforma;</li>
          <li>Utilizar a estrutura da Áurea para lavagem de capitais, ocultação de patrimônio ou infrações legais.</li>
        </ul>
      </section>

      <section>
        <h2>15. Canais de atendimento, legislação e foro</h2>
        <p>
          Para solicitações, dúvidas operacionais ou requisições contratuais, o contato oficial com
          nossa diretoria é realizado através do e-mail:{' '}
          <a href="mailto:gabriel.silva@aureacustodia.com.br">
            gabriel.silva@aureacustodia.com.br
          </a>
          .
        </p>
        <p>
          Estes Termos são interpretados de acordo com a legislação da República Federativa do
          Brasil. Para dirimir quaisquer litígios decorrentes deste instrumento, fica resguardada
          a competência do foro de domicílio da pessoa consumidora.
        </p>
      </section>
    </LegalDocument>
  )
}
