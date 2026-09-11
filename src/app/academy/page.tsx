import type { Metadata } from 'next'
import Link from 'next/link'
import type { ReactNode } from 'react'

import { LegalDocument } from '@/components/legal/LegalDocument'

export const metadata: Metadata = {
  title: 'Academy | Áurea Custódia',
  description:
    'Conteúdo educativo oficial da Áurea Custódia: entenda o que somos, o que não somos, como funciona a guarda física de moedas comemorativas e a negociação de recibos de custódia.',
}

const VERSION = '1.0-2026-09-10'
const UPDATED_AT = '10 de setembro de 2026'

export default function AcademyPage(): ReactNode {
  return (
    <LegalDocument
      title="Áurea Academy"
      version={VERSION}
      updatedAt={UPDATED_AT}
      eyebrow="Material Educativo Oficial"
      noticeTitle="O que a Áurea é e o que a Áurea não é"
      noticeDescription={
        <p>
          Este guia foi elaborado para esclarecer de forma direta e acessível o funcionamento
          da Áurea Custódia, a natureza dos nossos serviços de guarda física de itens numismáticos,
          nosso marketplace e nossas diretrizes de conformidade institucional e regulatória.
        </p>
      }
    >
      <section>
        <h2>1. Nosso posicionamento institucional</h2>
        <p>
          Para assegurar total clareza perante os colecionadores e os órgãos reguladores,
          definimos nossa atuação através do seguinte compromisso formal:
        </p>
        <blockquote className="legal-quote">
          &ldquo;A Áurea <strong>não é corretora</strong> e não está sujeita à regulação da CVM
          ou do mercado de capitais. A Áurea <strong>não é instituição financeira</strong>.
          A Áurea <strong>não é plataforma de ativos digitais</strong>. A Áurea é um serviço
          de guarda de itens de coleção com um marketplace onde quem guarda pode negociar o
          recibo do item sem precisar resgatá-lo fisicamente.&rdquo;
        </blockquote>
      </section>

      <section>
        <h2>2. O que a Áurea NÃO é (Delimitações regulatórias)</h2>
        <p>
          É fundamental que todo cliente compreenda com exatidão o que não fazemos e o que não somos:
        </p>
        <ul>
          <li>
            <strong>Não somos corretora de valores mobiliários:</strong> Não realizamos intermediação
            no mercado financeiro ou de capitais, não negociamos ações, cotas ou títulos, e não
            estamos sujeitos à fiscalização da Comissão de Valores Mobiliários (CVM). Não prestamos
            consultoria de investimentos nem emitimos recomendações de compra ou venda.
          </li>
          <li>
            <strong>Não somos instituição financeira:</strong> Não operamos como banco, não captamos
            depósitos remunerados da poupança popular, não concedemos empréstimos ou adiantamentos
            financeiros e não realizamos operações de câmbio ou crédito.
          </li>
          <li>
            <strong>Não somos plataforma de criptoativos nem emitimos tokens ou NFTs:</strong> A Áurea
            não opera em redes blockchain e não faz emissão de ativos virtuais sujeitos à Lei nº 14.478/2022
            ou resoluções conexas do Banco Central. Nossos recibos de custódia são comprovantes digitais
            emitidos em sistema próprio para comprovar a existência e posse de um item físico depositado.
          </li>
          <li>
            <strong>Não oferecemos promessa de valorização nem rentabilidade garantida:</strong> Moedas
            comemorativas são bens colecionáveis. Seu valor de mercado no marketplace é pactuado
            livremente entre compradores e vendedores com base na raridade, estado de conservação
            e dinâmica natural de colecionismo. Nenhum item sob custódia possui garantia de rendimento
            ou retorno financeiro previsível.
          </li>
        </ul>
      </section>

      <section>
        <h2>3. O que a Áurea É: Guarda física e liquidez para colecionadores</h2>
        <p>
          A Áurea Custódia é uma prestadora de serviços especializada na guarda e preservação
          de moedas comemorativas nacionais elegíveis (como a série Real Olímpico dos Jogos Rio 2016).
          Nossa estrutura oferece três soluções integradas:
        </p>
        <ul>
          <li>
            <strong>Custódia física especializada:</strong> Armazenamos as moedas em cofre de alta
            segurança, sob rigoroso controle de acesso, condições adequadas de climatização e
            cobertura por apólice de seguro patrimonial.
          </li>
          <li>
            <strong>Recibos de custódia autênticos:</strong> Para cada moeda inspecionada, pesada e
            aprovada pela nossa estação técnica, é emitido um recibo digital comprobatório que identifica
            a titularidade e as especificações do item.
          </li>
          <li>
            <strong>Marketplace entre colecionadores:</strong> Um ambiente digital onde os clientes
            cadastrados podem comprar e vender a titularidade dos recibos de custódia diretamente entre si,
            transferindo a propriedade do item com liquidez imediata e custo zero de transporte no momento
            da transação.
          </li>
          <li>
            <strong>Resgate físico garantido:</strong> A moeda guardada pertence ao titular do recibo.
            A qualquer momento, o colecionador pode solicitar o resgate físico para que a moeda seja
            despachada via Correios com seguro até o seu endereço residencial cadastrado.
          </li>
        </ul>
      </section>

      <section>
        <h2>4. A história de origem: Da coleção do Rogério à criação da Áurea</h2>
        <p>
          A Áurea Custódia nasceu da experiência genuína de quem vivencia o colecionismo no dia a dia.
          Rogério Pena, um dos fundadores da plataforma, é colecionador dedicado da série de moedas
          comemorativas Real Olímpico.
        </p>
        <p>
          Ao expandir seu acervo pessoal, Rogério enfrentou de perto dois grandes gargalos que afetam
          quase todos os colecionadores de moedas no Brasil:
        </p>
        <ol>
          <li>
            <strong>A preocupação com a segurança doméstica:</strong> Guardar moedas de valor relevante
            em casa expõe a coleção a riscos de furtos, acidentes domésticos e desgaste material por
            falta de instalações adequadas de climatização.
          </li>
          <li>
            <strong>O custo, prazo e risco de fretes constantes:</strong> Toda vez que um colecionador
            negociava uma peça com outro participante em outro estado, era necessário pagar frete elevado
            com declaração de valor, enfrentar filas de agências postais e conviver com a apreensão
            de avarias ou extravios durante o transporte.
          </li>
        </ol>
        <p>
          Diante dessas dificuldades, surgiu o modelo da Áurea: centralizar a guarda física em um
          ambiente seguro e segurado, emitir comprovantes digitais confiáveis de custódia e criar um
          mercado onde colecionadores possam negociar a posse das moedas entre si sem a obrigação de
          movimentar o metal físico a cada transação comercial.
        </p>
      </section>

      <section>
        <h2>5. Como funciona o ciclo da custódia na prática</h2>
        <p>
          O ciclo operacional da Áurea Custódia é transparente e dividido em quatro etapas claras:
        </p>
        <ul>
          <li>
            <strong>1. Envio do item:</strong> O cliente gera um protocolo na plataforma e despacha sua
            moeda elegível via Correios, acompanhada de seguro postal, para nossa central de custódia.
          </li>
          <li>
            <strong>2. Inspeção e entrada em cofre:</strong> Nossa equipe técnica realiza a análise
            física da peça (pesagem em balança de precisão, medição de diâmetro e conferência do estado
            de conservação). Confirmada a conformidade, a moeda é alocada no cofre seguro e o recibo de
            custódia é creditado na conta do usuário.
          </li>
          <li>
            <strong>3. Manutenção ou negociação:</strong> O titular pode manter a moeda sob guarda
            (mediante taxa de custódia mensal simples e acessível) ou ofertá-la para venda no marketplace.
            Caso outro colecionador compre o item, o valor é creditado na conta do vendedor e a posse
            do recibo é transferida no mesmo instante ao comprador.
          </li>
          <li>
            <strong>4. Resgate e entrega:</strong> O detentor atual do recibo pode solicitar a retirada
            física do item a qualquer momento pela plataforma, recebendo a moeda em sua casa após
            o processamento operacional.
          </li>
        </ul>
      </section>

      <section>
        <h2>6. Perguntas frequentes do colecionador</h2>
        <p>
          <strong>A moeda que resgatarei será a mesma exata que enviei?</strong><br />
          Não necessariamente a mesma unidade física. As moedas comemorativas padronizadas em perfeito
          estado de conservação (Flor de Cunho ou Soberba) são equiparáveis entre si dentro da custódia.
          Ao solicitar o resgate físico, o cliente receberá uma moeda autêntica, rigorosamente idêntica
          em peso, metal, cunhagem e conservação àquela representada por seu recibo.
        </p>
        <p>
          <strong>Quais são os prazos de saque e de resgate físico?</strong><br />
          Para transferências de saldo financeiro em reais para a conta bancária do titular, o prazo é
          de até <strong>D+3 dias úteis</strong>. Para o resgate físico de moedas, o prazo operacional
          é de até <strong>D+30 dias úteis</strong>, período necessário para conferência pericial,
          deslocamento seguro de cofre, embalagem de alta segurança e postagem com seguro.
        </p>
        <p>
          <strong>Quem paga os custos de frete e envio?</strong><br />
          Os custos de postagem e seguro de transporte — tanto no envio inicial para a custódia quanto
          no resgate final da moeda — são de inteira responsabilidade do cliente solicitante.
        </p>
        <p>
          <strong>Existe seguro contratado para o acervo?</strong><br />
          Sim. A operação prevê a proteção do acervo custodiado em cofre por meio de cobertura securitária
          contra riscos de roubo, furto e sinistros patrimoniais.
        </p>
      </section>

      <section>
        <h2>7. Saiba mais e consulte as normas completas</h2>
        <p>
          Para obter detalhes minuciosos sobre os direitos e deveres dos colecionadores, leia nossos{' '}
          <Link href="/termos">Termos de Uso</Link> e a nossa{' '}
          <Link href="/privacidade">Política de Privacidade</Link>.
        </p>
        <p>
          Dúvidas adicionais podem ser encaminhadas diretamente ao nosso time de suporte pelo e-mail{' '}
          <strong>contato@aureacustodia.com.br</strong>.
        </p>
      </section>
    </LegalDocument>
  )
}
