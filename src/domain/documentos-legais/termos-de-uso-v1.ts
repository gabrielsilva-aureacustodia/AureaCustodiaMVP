/**
 * DOMÍNIO — Minuta oficial dos Termos de Uso v1.0.
 *
 * Fonte oficial: docs/finalizacoes/2026-09-13_minuta_termos_de_uso_v1.docx
 * Assessoria jurídica: Felipe Moraes (09/09/2026 e 13/09/2026).
 *
 * Módulo puro de domínio: sem I/O, determinístico e testável isoladamente.
 * A estrutura é convertida em texto canônico por canonico.ts e hasheada com SHA-256.
 */

import { PARAMETROS_LEGAIS } from './parametros'
import type { DocumentoLegalEstruturado } from './types'

export const TERMOS_DE_USO_V1: DocumentoLegalEstruturado = {
  chave: 'termos_de_uso',
  versao: '1.0',
  titulo: 'TERMOS DE USO',
  vigenteDesde: PARAMETROS_LEGAIS.vigencia,
  preambulo: [
    'Estes termos constituem um acordo vinculativo entre o usuário da plataforma Áurea Custódia ("Usuário" ou "você" ou "seu/sua") e Áurea Custodia LTDA., pessoa jurídica de direito privado, CNPJ nº 68.071.452/0001-06, com endereço na Rua dos Tabaiares, nº 12, sala 210, bairro Floresta, Belo Horizonte/MG, Brasil, CEP 30.150-040 ("Áurea").',
    'Este Termos de Uso rege o uso da sua Conta Áurea e quaisquer outros Serviços Áurea disponibilizados a você na ou através da Plataforma Áurea.',
    'Ao registrar-se para uma Conta Áurea, você reconhece que lhe foi fornecido o Termos de Uso antes da prestação dos Serviços Áurea.',
    'Ao acessar a Plataforma Áurea e/ou usar os Serviços Áurea, você: (i) concorda que leu, entendeu e aceitou o Termos de Uso; (ii) reconhece e concorda que estará vinculado e cumprirá o Termos de Uso, conforme atualizado e alterado periodicamente; e (iii) confirma que tem a capacidade legal e autoridade para celebrar o Termos de Uso.',
    'Se você não entender e aceitar os termos do Termos de Uso em sua totalidade, não deve registrar uma Conta Áurea, nem acessar ou usar a Plataforma Áurea ou qualquer serviço Áurea.',
    'A Áurea não é uma corretora de investimentos ou Criptomoedas. A Áurea não fornece aconselhamento de investimento regulado, recomendações pessoais em relação a decisões de investimento ou valorização nem qualquer outro tipo de consultoria e nenhuma comunicação ou informação fornecida por nós é destinada a ser, ou deve ser interpretada como, recomendação ou aconselhamento de qualquer tipo.',
  ],
  capitulos: [
    {
      numero: 1,
      titulo: 'Introdução',
      paragrafos: [
        {
          numero: '1.1',
          titulo: 'Informações de Contato',
          texto:
            'Você pode nos contatar utilizando os detalhes fornecidos na Cláusula 3 ou por meio dos canais de suporte ao cliente disponíveis na Plataforma Áurea.',
        },
        {
          numero: '1.2',
          titulo: 'Contrato e Documentos Incorporados por Referência',
          texto:
            'Estes Termos e, conforme aplicável, os seguintes documentos, conforme alterados periodicamente e incorporados por referência, constituem seu contrato ("Contrato"):',
          alineas: [
            {
              letra: 'a)',
              texto:
                'a página de Tabela de Taxas em nossa Plataforma, que estabelece todas as taxas, comissões e cobranças.',
            },
            {
              letra: '1.2.2.',
              texto: 'Qualquer outro documento que expressamente declare fazer parte dos Termos de Uso.',
            },
          ],
        },
      ],
    },
    {
      numero: 2,
      titulo: 'Elegibilidade',
      paragrafos: [
        {
          numero: '2.1',
          titulo: 'Critérios de Elegibilidade',
          texto:
            'Para ser elegível para registrar uma Conta Áurea e usar os Serviços Áurea, você deve:',
          alineas: [
            {
              letra: 'a)',
              texto:
                'ser uma pessoa física, corporação, pessoa jurídica, entidade ou outro empreendimento com plenos poderes, autoridade e capacidade para:',
              subalineas: [
                { letra: '(i)', texto: 'acessar e usar a Plataforma Áurea; e' },
                {
                  letra: '(ii)',
                  texto:
                    'firmar contratos, cumprir suas obrigações e exercer seus direitos previstos nestes Termos.',
                },
              ],
            },
            {
              letra: 'b)',
              texto:
                'se você for pessoa física, ter pelo menos 18 anos de idade e estar legalmente autorizado a firmar contratos vinculativos;',
            },
            {
              letra: 'c)',
              texto:
                'se você atuar como empregado ou representante de uma pessoa jurídica e firmar o Contrato em nome dela, deve estar devidamente autorizado a agir em nome e vincular essa pessoa jurídica para fins de celebração do Contrato; e',
            },
            {
              letra: 'd)',
              texto: 'não ter sido previamente suspenso ou removido do uso da Plataforma Áurea.',
            },
          ],
        },
        {
          numero: '2.2',
          titulo: 'Alteração dos Critérios de Elegibilidade',
          texto:
            'Os critérios de elegibilidade podem ser alterados a qualquer momento, a critério exclusivo da Áurea. Sempre que possível, avisaremos com antecedência sobre a mudança. Contudo, poderão ser feitas alterações sem aviso prévio. Isso pode ocorrer quando:',
          alineas: [
            {
              letra: 'a)',
              texto: 'a mudança for decorrente de alterações legais e/ou regulatórias; e',
            },
            {
              letra: 'b)',
              texto:
                'houver qualquer outra razão válida que impossibilite o fornecimento de aviso prévio.',
            },
          ],
        },
        {
          texto:
            'Quando não formos capazes de avisar antecipadamente, informaremos sobre a mudança após sua implementação.',
        },
      ],
    },
    {
      numero: 3,
      titulo: 'Comunicação',
      paragrafos: [
        {
          numero: '3.1',
          titulo: 'Como você pode nos contatar',
          texto:
            'Para mais informações sobre a Áurea, você pode consultar as informações disponíveis em nossa Plataforma. Se você tiver dúvidas, sugestões ou reclamações, pode nos contatar através do nosso suporte ao cliente em SAC.',
        },
        {
          numero: '3.2',
          titulo: 'Como entraremos em contato com você',
          texto:
            'Entraremos em contato utilizando os dados fornecidos na Plataforma Áurea. Isso pode incluir contato por e-mail, SMS, WhatsApp, ligação telefônica e via Plataforma Áurea. É importante que os dados de contato sejam mantidos corretos e atualizados na Plataforma Áurea. Qualquer alteração nos dados de contato deve ser informada imediatamente. Caso contrário, não seremos responsáveis se você deixar de receber informações, notificações ou outras comunicações importantes. Esteja ciente de que fraudadores podem tentar se passar por funcionários ou comunicações oficiais da Áurea.',
        },
      ],
    },
    {
      numero: 4,
      titulo: 'Termos Específicos de Serviço',
      paragrafos: [
        {
          numero: '4.1',
          titulo: 'Termos Específicos de Serviço',
          texto:
            'Após abrir uma Conta Áurea, você poderá acessar e usar a Plataforma Áurea. Este Contrato constitui uma aceitação a todos os serviços disponíveis na Plataforma. Ao acessar ou usar a Plataforma Áurea, você confirma que leu, entendeu e concorda com os Termos de Serviço referentes a esse Serviço Áurea (conforme alterados periodicamente).',
        },
      ],
    },
    {
      numero: 5,
      titulo: 'Taxas e Cálculos',
      paragrafos: [
        {
          numero: '5.1',
          titulo: 'Pagamento de Taxas',
          texto:
            'Ao criar uma Conta Áurea você concorda em pagar todas as taxas aplicáveis relacionadas ao acesso e uso dos Serviços Áurea, conforme estabelecido na Tabela de Taxas em nossa Plataforma. Ao aceitar esses Termos você autoriza e instrui a Áurea a deduzir todas as taxas, comissões, juros, encargos e outros valores devidos nos termos de uso e em decorrência das operações realizadas, de acordo com o método de cálculo estabelecido na Tabela de Taxas em nossa Plataforma.',
        },
        {
          numero: '5.2',
          titulo: 'Alteração das Taxas',
          texto:
            'A Tabela de Taxas pode ser alterada periodicamente, conforme previsto na Cláusula 9.4.',
        },
        {
          numero: '5.3',
          titulo: 'Cálculos',
          texto:
            'Quaisquer cálculos efetuados pela Áurea relacionados aos Serviços Áurea são finais e vinculantes, exceto em caso de Erro Manifesto.',
        },
      ],
    },
    {
      numero: 6,
      titulo: 'Conta Áurea',
      paragrafos: [
        {
          numero: '6.1',
          titulo: 'Discricionariedade',
          texto:
            'Todas as Contas Áurea são oferecidas a nosso critério. Reservamo-nos o direito de recusar qualquer solicitação de abertura de Conta Áurea, incluindo, sem limitação, quando:',
          alineas: [
            {
              letra: 'a)',
              texto: 'não forem cumpridos os critérios de elegibilidade definidos na Cláusula 2;',
            },
            {
              letra: 'b)',
              texto:
                'não for possível verificar a identidade do Usuário ou concluir a devida diligência necessária de forma satisfatória;',
            },
            {
              letra: 'c)',
              texto: 'o Usuário já ter possuído Conta Áurea suspensa ou encerrada; e/ou',
            },
            {
              letra: 'd)',
              texto:
                'suspeitarmos razoavelmente de atividade fraudulenta, lavagem de dinheiro, financiamento ao terrorismo ou outro crime financeiro.',
            },
          ],
        },
        {
          numero: '6.2',
          texto:
            'A Áurea não estará obrigada a fornecer razões para a recusa de uma solicitação de abertura de conta.',
        },
        {
          numero: '6.3',
          texto:
            'Você não deve fornecer acesso a quaisquer Serviços Áurea a terceiros por meio de sua Conta Áurea.',
        },
        {
          numero: '6.4',
          titulo: 'Verificação de Identidade e Conheça seu Cliente',
          texto:
            'Antes de poder abrir uma Conta Áurea ou acessar qualquer Serviço Áurea, você deve concluir nossos procedimentos de verificação de identidade, que podem incluir (sem limitação):',
          alineas: [
            {
              letra: 'a)',
              texto:
                'fornecer informações pessoais, incluindo seu nome completo, data de nascimento, nacionalidade, domicílio legal, endereço residencial atual e dados de contato; e',
            },
            {
              letra: 'b)',
              texto:
                'fornecer cópias de documentos de identidade (como passaporte, carteira de identidade nacional ou carteira de motorista).',
            },
          ],
        },
        {
          numero: '6.5',
          texto:
            'Todas as informações fornecidas à Áurea devem ser completas, precisas, verdadeiras e atualizadas em todos os aspectos.',
        },
        {
          numero: '6.6',
          texto:
            'É obrigação do Usuário informar a Áurea qualquer alteração nas informações fornecidas.',
        },
        {
          numero: '6.7',
          texto: 'Ao aceitar esses Termos você autoriza a Áurea a:',
          alineas: [
            {
              letra: 'a)',
              texto:
                'fazer quaisquer investigações, diretamente ou por meio de terceiros, que considerarmos necessárias para verificar sua identidade, bem como para proteção contra fraude, lavagem de dinheiro, financiamento ao terrorismo ou outro crime financeiro;',
            },
            {
              letra: 'b)',
              texto:
                'tomar quaisquer medidas que julgarmos necessárias com base nos resultados dessas investigações, incluindo recusar sua solicitação ou suspender ou encerrar sua Conta Áurea.',
            },
          ],
        },
        {
          numero: '6.8',
          texto:
            'A Áurea poderá solicitar novas informações a qualquer momento para fins de cumprimento de qualquer obrigação legal ou regulatória aplicável, incluindo requisitos de verificação de identidade, ou em conexão com a detecção de lavagem de dinheiro, financiamento ao terrorismo, fraude ou qualquer outro crime financeiro, bem como condutas proibidas ou qualquer violação real ou potencial deste Contrato ou por qualquer outro motivo válido.',
        },
        {
          numero: '6.9',
          texto:
            'A falha ou recusa em fornecer as informações solicitadas dentro do prazo especificado poderá resultar na suspensão ou restrição da Conta Áurea e/ou qualquer serviço Áurea, com efeito imediato e sem aviso prévio.',
        },
      ],
    },
    {
      numero: 7,
      titulo: 'Transações',
      paragrafos: [
        {
          numero: '7.1',
          titulo: 'Transações',
          texto:
            'São consideradas transações as ações de (i) envio de moeda para custódia; (ii) venda de moeda custodiada; (iii) compra de moeda; (iv) solicitação de retirada de moeda custodiada; (v) depósito de valor; e (vi) saque de valor ("Transações") realizadas na Plataforma Áurea.',
        },
        {
          numero: '7.2',
          titulo: 'Envio de Moeda para Custódia',
          texto:
            'O Envio de Moeda para Custódia será solicitado por meio da Plataforma Áurea e, após aprovado, deverá ser realizado pelo Usuário com base nas instruções disponíveis na Plataforma Áurea.',
        },
        {
          numero: '7.2.1',
          titulo: 'Taxa',
          texto:
            'A realização desta Transação é submetida ao pagamento de Taxa. Os valores atualizados podem ser consultados na Tabela de Taxas em nossa Plataforma.',
        },
        {
          numero: '7.2.2',
          titulo: 'Validação da Custódia',
          texto:
            'A moeda submetida para custódia passará por análise para verificação da veracidade e do estado de conservação do objeto. Após análise a Áurea poderá (i) validar a custódia e proceder com a emissão do Recibo de Unicidade ou (ii) recusar, de forma discricionária, a custódia da moeda e proceder a devolução ao Usuário, o qual arcará com o trâmite devolutivo.',
        },
        {
          numero: '7.2.3',
          titulo: 'Instituições Parceiras',
          texto:
            'O Usuário concorda que a custódia poderá ser realizada pela própria Áurea ou por instituições parceiras de notória confiabilidade e atuação no mercado.',
        },
        {
          numero: '7.2.4',
          titulo: 'Titularidade',
          texto:
            'A Áurea e suas Instituições Parceiras funcionam como meras custodiantes e intermediadoras. A moeda custodiada e o Recibo de Unicidade correspondente permanecem parte de titularidade do Usuário e não passam a integrar o patrimônio da Áurea.',
        },
        {
          numero: '7.2.5',
          titulo: 'Recibo de Unicidade',
          texto: `Após a validação da moeda submetida para custódia, será gerado para o Usuário na Plataforma Áurea o Recibo de Unicidade correspondente a uma moeda custodiada. O prazo para validação da custódia e emissão do Recibo de Unicidade é de ${PARAMETROS_LEGAIS.prazoValidacaoCustodia} após o recebimento e a aprovação da moeda.`,
          alineas: [
            {
              letra: 'a)',
              texto:
                'Cada Recibo de Unicidade representa 1 (uma moeda) custodiada, corresponde ao lastro de uma unidade física elegível no acervo, após aprovação em etapa de admissão.',
            },
          ],
        },
        {
          numero: '7.2.6',
          titulo: 'Fungibilidade das Moedas Custodiadas',
          texto:
            'Ao enviar uma moeda para custódia o Usuário concorda que tal moeda passará a integrar um acervo de moedas equiparáveis. O Recibo de Unicidade corresponderá a qualquer uma das moedas pertencentes a mesma categoria (modelo e estado de conservação) da moeda enviada.',
        },
        {
          numero: '7.2.7',
          titulo: 'Envio da Moeda Custodiada',
          texto:
            'Serão disponibilizadas opções de envio pela Plataforma Áurea. A escolha do método de envio ficará à escolha e responsabilidade do Usuário. Os riscos decorrentes do transporte da moeda serão de responsabilidade do Usuário. A moeda somente será admitida em custódia após procedimento de análise e admissão pela Áurea.',
        },
        {
          numero: '7.3',
          titulo: 'Venda de Moeda Custodiada',
          texto:
            'As moedas custodiadas na Plataforma Áurea poderão ser vendidas para outros usuários por meio da própria Plataforma Áurea.',
        },
        {
          numero: '7.3.1',
          titulo: 'Taxa',
          texto:
            'A realização desta Transação é submetida ao pagamento de Taxa. Os valores atualizados podem ser consultados na Tabela de Taxas em nossa Plataforma.',
        },
        {
          numero: '7.3.2',
          titulo: 'Substituição do Código Criptografado',
          texto:
            'O Código Criptografado correspondente a moeda custodiada do Usuário Vendedor será automaticamente destruído no momento da venda e substituído por um novo Código Criptografado ao Usuário Comprador.',
        },
        {
          numero: '7.3.3',
          titulo: 'Prazo Recebimento Valores',
          texto: `O prazo para o recebimento dos valores provenientes da Venda de Moeda Custodiada é de ${PARAMETROS_LEGAIS.prazoRecebimentoVenda} após a conclusão da venda. Os valores poderão constar como "Saldo Disponível" na Plataforma Áurea ou serem destinados diretamente a conta bancária do Usuário, de acordo com as informações fornecidas pelo Usuário na Plataforma.`,
        },
        {
          numero: '7.4',
          titulo: 'Compra de Moeda',
          texto:
            'As moedas custodiadas poderão ser adquiridas por outros usuários por meio da Plataforma Áurea.',
        },
        {
          numero: '7.4.1',
          titulo: 'Taxa',
          texto:
            'A realização desta Transação é submetida ao pagamento de Taxa. Os valores atualizados podem ser consultados na Tabela de Taxas em nossa Plataforma.',
        },
        {
          numero: '7.4.2',
          titulo: 'Novo Código Criptografado',
          texto:
            'A compra de moeda custodiada na Plataforma Áurea, por intermediação da plataforma, resultará na destruição do Código Criptografado correspondente do Usuário Vendedor e na emissão de um novo Código Criptografado ao Usuário Comprador.',
        },
        {
          numero: '7.5',
          titulo: 'Solicitação de Retirada de Moeda Custodiada',
          texto:
            'O Usuário poderá solicitar a retirada de uma moeda custodiada a qualquer tempo.',
        },
        {
          numero: '7.5.1',
          titulo: 'Taxa',
          texto:
            'A realização desta Transação é submetida ao pagamento de Taxa. Os valores atualizados podem ser consultados na Tabela de Taxas em nossa Plataforma.',
        },
        {
          numero: '7.5.2',
          titulo: 'Destruição do Código Criptografado',
          texto:
            'A Solicitação de Retirada de Moeda Custodiada resultará na destruição automática do Código Criptografado correspondente.',
        },
        {
          numero: '7.5.3',
          titulo: 'Fungibilidade das Moedas Custodiadas',
          texto:
            'Ao enviar uma moeda para custódia o Usuário concorda que tal moeda passará a integrar um acervo de moedas equiparáveis e fungíveis entre si. Portanto, ao solicitar a retirada da moeda o Usuário poderá receber qualquer uma das moedas pertencentes a mesma categoria (modelo e estado de conservação) da moeda enviada.',
        },
        {
          numero: '7.5.4',
          titulo: 'Envio da Moeda Custodiada',
          texto:
            'Serão disponibilizadas opções de envio pela Plataforma Áurea. A escolha do método de envio ficará à escolha e responsabilidade do Usuário. Os riscos decorrentes do transporte da moeda serão de responsabilidade do Usuário.',
        },
        {
          numero: '7.5.5',
          titulo: 'Custos da Retirada',
          texto:
            'Os custos decorrentes da retirada da moeda custodiada serão integralmente arcados pelo Usuário que solicitar a Retirada de Moeda Custodiada. Os valores atualizados podem ser consultados na Tabela de Taxas em nossa Plataforma.',
        },
        {
          numero: '7.5.6',
          titulo: 'Prazo',
          texto:
            'O prazo para recebimento da moeda custodiada é de até 30 (trinta) dias úteis após a confirmação da Solicitação de Retirada de Moeda Custodiada.',
        },
        {
          numero: '7.6',
          titulo: 'Depósito de Valor',
          texto:
            'O Usuário poderá realizar Depósito de Valor para realização de Transações na Plataforma Áurea. Os valores depositados constaram como "Saldo Disponível" na Plataforma Áurea.',
        },
        {
          numero: '7.6.1',
          titulo: 'Taxa',
          texto:
            'A realização desta Transação é submetida ao pagamento de Taxa. Os valores atualizados podem ser consultados na Tabela de Taxas em nossa Plataforma.',
        },
        {
          numero: '7.6.2',
          titulo: 'Prazo',
          texto: `O prazo para conversão do valor depositado em "Saldo Disponível" na Plataforma Áurea é de ${PARAMETROS_LEGAIS.prazoDisponibilizacaoDeposito} após a confirmação da Transação.`,
        },
        {
          numero: '7.7',
          titulo: 'Saque de Valor',
          texto:
            'O Usuário poderá solicitar o saque do "Saldo Disponível" a qualquer tempo na Plataforma Áurea.',
        },
        {
          numero: '7.7.1',
          titulo: 'Taxa',
          texto:
            'A realização desta Transação é submetida ao pagamento de Taxa. Os valores atualizados podem ser consultados na Tabela de Taxas em nossa Plataforma.',
        },
        {
          numero: '7.7.2',
          titulo: 'Prazo',
          texto:
            'O prazo para recebimento dos valores decorrentes do saque é de 3 (três) dias úteis após a conclusão da Transação.',
        },
        {
          numero: '7.8',
          texto:
            'As Transações são irrevogáveis, portanto, uma vez realizada uma Transação na plataforma, não será possível rescindi-la ou retirá-la sem autorização extraordinária da Áurea.',
        },
        {
          numero: '7.9',
          titulo: 'Retenção de Informações das Transações',
          texto:
            'Para fins de cumprimento dos padrões da indústria para retenção de dados, ao aceitar esses Termos você autoriza a Áurea a manter registro de todas as informações das Transações efetuadas na Plataforma Áurea, enquanto sua Conta Áurea estiver ativa ou pelo tempo necessário para cumprir os propósitos regulatórios.',
        },
      ],
    },
    {
      numero: 8,
      titulo: 'Segurança da Conta',
      paragrafos: [
        {
          numero: '8.1',
          titulo: 'Responsabilidade',
          texto:
            'Ao aceitar estes Termos de Uso o Usuário concorda que é responsável por tomar as medidas adequadas para proteger seu hardware e dados contra vírus, softwares maliciosos e qualquer material inadequado. A Áurea não se responsabiliza por quaisquer reclamações ou perdas decorrentes do seu descumprimento desta Cláusula.',
        },
        {
          numero: '8.2',
          titulo: 'Medidas de Segurança',
          texto:
            'Ao aceitar estes Termos de Uso o Usuário concorda que deverá manter controle adequado de todos os seus IDs de Acesso, incluindo:',
          alineas: [
            {
              letra: 'a)',
              texto:
                'criar uma senha forte e manter a segurança e o controle dos seus IDs de Acesso;',
            },
            {
              letra: 'b)',
              texto:
                'manter o endereço de e-mail e o número de telefone fornecidos à Plataforma Áurea atualizados para receber quaisquer avisos ou alertas;',
            },
            {
              letra: 'c)',
              texto:
                'nunca permitir acesso remoto ou compartilhar seu computador e/ou tela do computador com outra pessoa enquanto estiver logado na sua Conta Áurea;',
            },
            {
              letra: 'd)',
              texto: 'sair dos Sites ou da Plataforma Áurea ao final de cada visita; e',
            },
            {
              letra: 'e)',
              texto:
                'acessar a Plataforma Áurea por meio de dispositivos seguros e utilizando redes privadas.',
            },
          ],
        },
        {
          numero: '8.3',
          titulo: 'Atos de Terceiro',
          texto:
            'A Áurea não se responsabiliza por Transações ou outras atividades efetuadas por terceiros que tiveram acesso aos dispositivos ou senhas do Usuário.',
        },
        {
          numero: '8.4',
          titulo: 'Indisponibilidade Tecnológica',
          texto:
            'A Áurea é responsável pela manutenção e funcionamento do sistema da Plataforma Áurea, ressalvadas hipóteses de instabilidade no sistema dos servidores terceirizados, hipótese em que a Áurea comunicará aos clientes o ocorrido e envidará os melhores esforços para reestabelecer o funcionamento.',
        },
      ],
    },
    {
      numero: 9,
      titulo: 'Alterações',
      paragrafos: [
        {
          numero: '9.1',
          titulo: 'Alterações',
          texto:
            'Estes Termos de Uso podem ser alterados a qualquer tempo e o uso continuado dos Serviços Áurea constitui consentimento a tais alterações. As alterações serão publicadas na Plataforma Áurea e poderão também ser notificadas individualmente aos usuários por e-mail ou pela Plataforma Áurea.',
        },
        {
          numero: '9.2',
          titulo: 'Entrada em Vigor',
          texto:
            'Em regra, a Áurea notificará os usuários das Alterações antes da sua entrada em vigor. Entretanto, ocasionalmente as Alterações poderão entrar em vigor imediatamente, caso em que os usuários serão notificados posteriormente sobre as Alterações em vigor. Isso pode ocorrer, por exemplo, e sem limitação, quando:',
          alineas: [
            {
              letra: 'a)',
              texto:
                'a alteração se destina a atender requisitos legais e/ou regulatórios; ou',
            },
            {
              letra: 'b)',
              texto: 'as alterações são para tornar os termos relevantes mais claros.',
            },
          ],
        },
        {
          numero: '9.3',
          texto:
            'Caso o Usuário não concorde com as Alterações, estará livre para encerrar sua Conta Áurea. O acesso continuado a Plataforma Áurea ou uso de quaisquer Serviços Áurea será considerado como aceitação das alterações.',
        },
        {
          numero: '9.4',
          titulo: 'Alterações nas Taxas',
          texto:
            'A Áurea poderá fazer alterações nas taxas estabelecidas na Tabela de Taxas em nossa Plataforma, o que inclui a introdução de novas taxas e/ou encargos. Caso o Usuário não concorde com as novas taxas, estará livre para encerrar sua Conta Áurea. O acesso continuado a Plataforma Áurea ou uso de quaisquer Serviços Áurea será considerado como aceitação das novas taxas.',
        },
      ],
    },
    {
      numero: 10,
      titulo: 'Encerramento da Conta Áurea',
      paragrafos: [
        {
          numero: '10.1',
          titulo: 'Encerramento',
          texto:
            'O Usuário poderá encerrar a Conta Áurea a qualquer momento, seguindo os procedimentos de encerramento de conta previstos na Plataforma Áurea. Ao encerrar a conta o Usuário autoriza a Áurea a cancelar ou suspender quaisquer transações pendentes no momento do encerramento e a deduzir quaisquer valores em aberto.',
        },
        {
          numero: '10.2',
          texto: 'Não será possível encerrar a Conta Áurea quando:',
          alineas: [
            {
              letra: 'a)',
              texto:
                'A Áurea tiver conhecimento que o Usuário esteja tentando evadir uma investigação por autoridades competentes;',
            },
            {
              letra: 'b)',
              texto: 'o Usuário tenha moedas em custódia ativa;',
            },
            {
              letra: 'c)',
              texto:
                'o Usuário tenha uma Transação pendente ou uma Reclamação em aberto que não possam ser suspensas; e',
            },
            {
              letra: 'd)',
              texto: 'o Usuário tenha valores pendentes a serem pagos à Áurea.',
            },
          ],
        },
      ],
    },
    {
      numero: 11,
      titulo: 'Suspensão, Bloqueios e Restrições',
      paragrafos: [
        {
          numero: '11.1',
          texto:
            'A Áurea poderá, a qualquer momento, suspender, bloquear ou restringir um Usuário do uso da Plataforma Áurea. Em particular, a Áurea poderá (i) recusar-se a concluir, bloquear ou cancelar Transação solicitada pelo usuário; (ii) encerrar, suspender ou restringir o acesso do Usuário a qualquer ou a todos os Serviços Áurea; (iii) encerrar, suspender, fechar, bloquear ou restringir seu acesso a qualquer ou a todas as suas Conta(s) Áurea; e/ou (iv) tomar qualquer medida que considerar necessária, em cada caso com efeito imediato e por qualquer motivo, incluindo, mas não se limitando a quando:',
          alineas: [
            {
              letra: 'a)',
              texto:
                'o Usuário não é, ou não é mais, elegível para usar um ou mais Serviços Áurea;',
            },
            {
              letra: 'b)',
              texto: 'suspeitar razoavelmente que:',
              subalineas: [
                {
                  letra: '(i)',
                  texto:
                    'a pessoa que acessou sua Conta Áurea não é você, ou suspeitar que a Conta Áurea tenha sido ou será usada para quaisquer propósitos ilegais, fraudulentos ou não autorizados;',
                },
                {
                  letra: '(ii)',
                  texto:
                    'mais de uma pessoa natural tenha acesso e/ou realize transações usando a mesma Conta Áurea, ou suspeitar que a Conta Áurea tenha sido ou será usada para quaisquer propósitos ilegais, fraudulentos ou não autorizados; ou',
                },
                {
                  letra: '(iii)',
                  texto:
                    'as informações fornecidas por você estejam erradas, falsas, desatualizadas ou incompletas;',
                },
              ],
            },
            {
              letra: 'c)',
              texto:
                'estiver pendente da apresentação de informações e documentos previstos na Cláusula 6.4.',
            },
            {
              letra: 'd)',
              texto:
                'considerar razoavelmente que é obrigada a fazê-lo por ordem judicial ou determinação regulatória.',
            },
            {
              letra: 'e)',
              texto: 'determinar ou suspeitar que:',
              subalineas: [
                {
                  letra: '(i)',
                  texto:
                    'o Usuário violou qualquer termo deste Contrato ou qualquer termo de serviço específico;',
                },
                {
                  letra: '(ii)',
                  texto:
                    'o Usuário violou qualquer lei, regra ou regulamento aplicável aos Serviços Áurea ou ao uso dos Serviços Áurea; ou',
                },
                {
                  letra: '(iii)',
                  texto:
                    'a Conta Áurea ou os Serviços Áurea estão sujeitos a qualquer litígio, investigação ou processo judicial pendente, em andamento ou ameaçado;',
                },
              ],
            },
            {
              letra: 'f)',
              texto:
                'o Usuário tomar qualquer atitude que possa contornar os controles e procedimentos de segurança da Áurea; ou',
            },
            {
              letra: 'g)',
              texto:
                'houver qualquer outra razão válida que justifique a suspensão, bloqueio ou restrição da Conta Áurea.',
            },
          ],
        },
      ],
    },
    {
      numero: 12,
      titulo: 'Declarações e Garantias',
      paragrafos: [
        {
          numero: '12.1',
          texto:
            'Ao abrir uma Conta Áurea e utilizar os Serviços Áurea, você declara e garante que:',
          alineas: [
            {
              letra: 'a)',
              texto:
                'todas as decisões relativas a este Contrato e aos Serviços Áurea foram tomadas de forma independente, com base em seu próprio julgamento e sem qualquer consultoria, assessoria ou recomendação da Áurea;',
            },
            {
              letra: 'b)',
              texto:
                'você tem plena capacidade e poderes para celebrar este Contrato e cumprir todas as obrigações dele decorrentes;',
            },
            {
              letra: 'c)',
              texto:
                'o cumprimento deste Contrato não viola nenhuma lei, regra ou regulamento aplicável, nem qualquer outro contrato do qual você seja parte;',
            },
            {
              letra: 'd)',
              texto:
                'todos os recursos e ativos mantidos em sua Conta Áurea têm origem lícita e não decorrem de qualquer atividade ilegal ou ilícita; e',
            },
            {
              letra: 'e)',
              texto:
                'nenhuma pessoa além de você possui qualquer direito, título ou garantia sobre sua Conta Áurea, as moedas custodiadas ou os Recibos de Unicidade a ela associados, exceto conforme expressamente autorizado por nós por escrito.',
            },
          ],
        },
      ],
    },
    {
      numero: 13,
      titulo: 'Proteção de Dados Pessoais',
      paragrafos: [
        {
          numero: '13.1',
          titulo: 'Escopo e Aplicação',
          texto:
            'Esta Cláusula estabelece as regras e diretrizes aplicáveis ao tratamento de Dados Pessoais de Pessoas Naturais ("Titulares") no âmbito da prestação dos Serviços Áurea, incluindo o acesso, cadastro e utilização da Plataforma Áurea, em conformidade com a Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018 - "LGPD") e com as demais normas aplicáveis à proteção de dados e privacidade.',
        },
        {
          numero: '13.2',
          texto:
            'Os termos utilizados nesta Cláusula com letra maiúscula e não definidos de outra forma nestes Termos terão os significados a eles atribuídos na LGPD.',
        },
        {
          numero: '13.3',
          titulo: 'Papéis no Tratamento de Dados',
          texto:
            'Na medida em que determinar as finalidades e os meios de tratamento de Dados Pessoais no contexto dos Serviços Áurea, a Áurea atuará como Controladora dos Dados Pessoais tratados no âmbito da Plataforma Áurea.',
        },
        {
          numero: '13.4',
          texto:
            'Nas hipóteses em que a Áurea tratar Dados Pessoais em nome de terceiros ou em decorrência de integrações com parceiros comerciais, prestadores de serviços ou instituições financeiras, os papéis de cada agente de tratamento serão definidos conforme a legislação aplicável e os respectivos instrumentos contratuais celebrados entre as partes.',
        },
        {
          numero: '13.5',
          titulo: 'Categorias de Dados Tratados',
          texto:
            'A Áurea poderá coletar e tratar diferentes categorias de Dados Pessoais para a prestação dos Serviços Áurea, cumprimento de obrigações legais ou regulatórias, proteção ao crédito e exercício regular de direitos, incluindo, conforme aplicável:',
          alineas: [
            {
              letra: 'a)',
              texto:
                'dados cadastrais e de identificação, incluindo nome completo, data de nascimento, filiação, nacionalidade, estado civil, ocupação profissional, número de CPF, número de documento de identidade e respectivo órgão emissor;',
            },
            {
              letra: 'b)',
              texto:
                'dados de contato, incluindo endereço de e-mail, número de telefone, endereço residencial e comercial;',
            },
            {
              letra: 'c)',
              texto:
                'dados de identificação e verificação, incluindo cópias de documentos, fotografias, imagens, gravações de vídeo;',
            },
            {
              letra: 'd)',
              texto:
                'dados financeiros e bancários, incluindo dados de contas bancárias ou de pagamento, chaves Pix, informações de pagamento, histórico de depósitos, saques e pagamentos realizados na ou através da Plataforma Áurea;',
            },
            {
              letra: 'e)',
              texto:
                'dados de Transações, incluindo informações sobre moedas enviadas para custódia, valores de compra e venda, emissão, transferência e cancelamento de Recibos de Unicidade, ordens registradas, ofertas de compra e venda e histórico operacional na Plataforma Áurea;',
            },
            {
              letra: 'f)',
              texto:
                'dados relativos à prevenção de fraudes, lavagem de dinheiro e demais ilícitos, incluindo registros de investigações internas, informações obtidas junto a prestadores de serviços de prevenção a fraudes, birôs de dados e fontes públicas;',
            },
            {
              letra: 'g)',
              texto:
                'dados técnicos e de utilização da Plataforma, incluindo endereço IP, data e horário de acesso, identificadores de dispositivos, dados de geolocalização aproximada, características de hardware e software, registros de navegação e atividades realizadas na Plataforma;',
            },
            {
              letra: 'h)',
              texto:
                'dados de atendimento e comunicação, incluindo registros de solicitações, reclamações, mensagens, chamadas e demais interações entre o Usuário e os canais de atendimento da Áurea.',
            },
          ],
        },
        {
          numero: '13.6',
          titulo: 'Finalidades do Tratamento',
          texto:
            'A Áurea poderá tratar Dados Pessoais para as seguintes finalidades, conforme aplicável:',
          alineas: [
            {
              letra: 'a)',
              texto: 'criar, manter, autenticar e administrar a Conta Áurea;',
            },
            {
              letra: 'b)',
              texto:
                'verificar a identidade, elegibilidade e capacidade do Usuário para utilização dos Serviços Áurea;',
            },
            {
              letra: 'c)',
              texto:
                'realizar procedimentos de Conheça o seu Cliente, prevenção à fraude, prevenção à lavagem de dinheiro e financiamento ao terrorismo;',
            },
            {
              letra: 'd)',
              texto:
                'permitir a execução, liquidação, registro e acompanhamento das Transações realizadas na Plataforma Áurea;',
            },
            {
              letra: 'e)',
              texto:
                'viabilizar o envio, recebimento, custódia, retirada, compra e venda de moedas e a emissão, transferência e cancelamento dos respectivos Recibos de Unicidade;',
            },
            {
              letra: 'f)',
              texto:
                'viabilizar depósitos, saques e demais movimentações financeiras relacionadas à utilização da Plataforma Áurea;',
            },
            {
              letra: 'g)',
              texto:
                'prestar suporte e atendimento ao Usuário, responder a solicitações, dúvidas e reclamações e enviar comunicações operacionais importantes;',
            },
            {
              letra: 'h)',
              texto:
                'prevenir, identificar, investigar e combater atividades fraudulentas, ilícitas, abusivas ou contrárias a este Contrato;',
            },
            {
              letra: 'i)',
              texto:
                'proteger a segurança da Plataforma Áurea, dos Usuários, da Áurea e de terceiros;',
            },
            {
              letra: 'j)',
              texto:
                'cumprir obrigações legais, regulatórias, fiscais, contábeis ou decorrentes de ordens emanadas por autoridades competentes;',
            },
            {
              letra: 'k)',
              texto:
                'exercer regularmente direitos da Áurea ou de terceiros em processos judiciais, administrativos, arbitrais ou pré-litigiosos;',
            },
            {
              letra: 'l)',
              texto:
                'realizar auditorias, controles internos, gestão de riscos, elaboração de relatórios e atividades necessárias para a governança corporativa da Áurea;',
            },
            {
              letra: 'm)',
              texto:
                'aperfeiçoar, desenvolver, testar e manter a Plataforma Áurea e os Serviços Áurea, inclusive por meio de análises estatísticas e estudos de uso; e',
            },
            {
              letra: 'n)',
              texto:
                'realizar outras atividades compatíveis com as finalidades informadas ao Usuário, desde que amparadas por base legal adequada.',
            },
          ],
        },
        {
          numero: '13.7',
          titulo: 'Bases Legais',
          texto:
            'O tratamento de Dados Pessoais pela Áurea será realizado com fundamento em uma ou mais bases legais previstas na LGPD, incluindo (i) execução de contrato ou de procedimentos preliminares relacionados ao Contrato; (ii) cumprimento de obrigação legal ou regulatória; (iii) exercício regular de direitos em processo judicial, administrativo ou arbitral; (iv) proteção da vida ou da incolumidade física do Titular ou de terceiro; (v) legítimo interesse da Áurea ou de terceiros, observados os limites legais e a proteção dos direitos e liberdades fundamentais do Titular; (vi) proteção do crédito; e (vii) quando exigido pela legislação aplicável, o consentimento do Titular.',
        },
        {
          numero: '13.8',
          texto:
            'Quando o tratamento depender do consentimento do Usuário, este será solicitado de forma livre, informada e inequívoca, e o Usuário poderá revogá-lo a qualquer momento, mediante solicitação expressa pelos canais indicados na Plataforma, ficando ciente de que a revogação poderá impossibilitar a continuidade da prestação de determinados Serviços Áurea.',
        },
        {
          numero: '13.9',
          titulo: 'Compartilhamento de Dados Pessoais',
          texto:
            'A Áurea poderá compartilhar Dados Pessoais, na medida necessária para as finalidades previstas nesta Cláusula e com observância das salvaguardas cabíveis, com: (i) instituições parceiras de custódia, transporte e logística envolvidas na prestação dos Serviços Áurea; (ii) instituições financeiras, prestadores de serviços de pagamento e parceiros bancários para processamento de depósitos, saques e Transações; (iii) prestadores de serviços de tecnologia, armazenamento em nuvem, segurança da informação, suporte, auditoria e assessoria jurídica ou contábil; (iv) fornecedores especializados em prevenção à fraude, análise de risco, biometria e verificação de identidade; e (v) autoridades policiais, governamentais, fiscais, judiciais, arbitrais ou regulatórias competentes, sempre que houver obrigação legal, regulatória ou ordem válida emanada de autoridade competente.',
        },
        {
          numero: '13.10',
          texto:
            'O compartilhamento de Dados Pessoais será limitado, sempre que possível, aos dados adequados, pertinentes e estritamente necessários para atingir a finalidade pretendida.',
        },
        {
          numero: '13.11',
          titulo: 'Dados Biométricos e Outros Dados Pessoais Sensíveis',
          texto:
            'Quando necessário para identificação, autenticação, prevenção a fraudes e segurança do Usuário e da Plataforma Áurea, a Áurea poderá coletar e tratar dados biométricos faciais e cópias de documentos de identificação, observadas as disposições do artigo 11 da LGPD.',
        },
        {
          numero: '13.12',
          titulo: 'Fontes de Dados',
          texto:
            'Além dos Dados Pessoais fornecidos diretamente pelo Usuário, a Áurea poderá obter informações sobre o Usuário a partir de fontes públicas, registros oficiais, birôs de dados e de crédito, parceiros de verificação de identidade e ferramentas de prevenção à fraude, observadas as normas de proteção de dados aplicáveis.',
        },
        {
          numero: '13.13',
          titulo: 'Decisões Automatizadas',
          texto:
            'A Áurea poderá utilizar processos automatizados para auxiliar atividades de validação cadastral, análise de risco, prevenção a fraudes e cumprimento de normas de prevenção à lavagem de dinheiro. Nesses casos, o Usuário terá direito de solicitar a revisão de decisões tomadas unicamente com base em tratamento automatizado de Dados Pessoais que afetem seus interesses, nos termos da legislação aplicável.',
        },
        {
          numero: '13.14',
          titulo: 'Armazenamento e Retenção',
          texto:
            'A Áurea conservará os Dados Pessoais durante o período necessário para cumprir as finalidades para as quais foram coletados, executar este Contrato e observar os prazos legais, regulatórios e prescricionais aplicáveis.',
        },
        {
          numero: '13.15',
          texto:
            'O encerramento da Conta Áurea não implicará necessariamente a eliminação imediata de todos os Dados Pessoais relacionados ao Usuário. A Áurea poderá conservar Dados Pessoais após o encerramento da Conta quando a conservação for necessária ou permitida pela legislação, incluindo para cumprimento de obrigações legais ou regulatórias, exercício regular de direitos, prevenção e investigação de fraudes e atendimento a determinações de autoridades competentes.',
        },
        {
          numero: '13.16',
          titulo: 'Segurança da Informação',
          texto:
            'A Áurea adotará medidas técnicas, administrativas e organizacionais razoáveis e compatíveis com a natureza dos Dados Pessoais tratados e com os riscos envolvidos, destinadas a protegê-los contra acessos não autorizados e situações acidentais ou ilícitas de destruição, perda, alteração, divulgação, comunicação ou qualquer forma de tratamento inadequado ou ilícito.',
        },
        {
          numero: '13.17',
          texto:
            'As medidas de segurança poderão incluir, conforme aplicável, controles de acesso, autenticação, criptografia, registro de atividades, segregação de ambientes, procedimentos de backup, monitoramento de segurança, gestão de vulnerabilidades e mecanismos de prevenção e resposta a incidentes. Nenhum sistema é completamente imune a riscos de segurança. A presente disposição não deverá ser interpretada como garantia absoluta de inexistência de incidentes, sem prejuízo das obrigações legais da Áurea relativas à segurança e proteção dos Dados Pessoais.',
        },
        {
          numero: '13.18',
          titulo: 'Direitos dos Titulares e Disposições Finais',
          texto:
            'Observados os requisitos e limites previstos na legislação aplicável, o Usuário poderá exercer, em relação aos seus Dados Pessoais, os direitos previstos na LGPD. O exercício de determinado direito poderá ser total ou parcialmente limitado quando a manutenção ou o tratamento dos Dados Pessoais for necessário para cumprimento de obrigação legal ou regulatória, exercício regular de direitos, prevenção de fraude ou por outra hipótese prevista na legislação aplicável.',
        },
      ],
    },
    {
      numero: 14,
      titulo: 'Resolução de Conflitos',
      paragrafos: [
        {
          numero: '14.1',
          titulo: 'Notificação de Conflito',
          texto:
            'Na hipótese de o problema não poder ser resolvido por meio dos canais de atendimento da Plataforma Áurea, o Usuário deverá enviar Notificação de Conflito à Áurea, que deverá conter:',
          alineas: [
            { letra: 'a)', texto: 'a descrição da natureza do problema;' },
            { letra: 'b)', texto: 'o pedido específico de reparação;' },
            { letra: 'c)', texto: 'informações de contato atualizadas do remetente.' },
          ],
        },
        {
          numero: '14.2',
          titulo: 'Negociação',
          texto:
            'O recebimento da Notificação de Conflito pela Áurea inicia o procedimento de resolução de conflitos. O Usuário e Áurea concordam em negociar de boa-fé por um período de 90 (noventa) dias corridos após o recebimento da Notificação de Conflito, com o objetivo de resolver amigavelmente a disputa.',
        },
        {
          numero: '14.3',
          texto:
            'O envio da Notificação de Conflito à Áurea constitui requisito obrigatório para o início de qualquer arbitragem ou processo judicial.',
        },
        {
          numero: '14.4',
          titulo: 'Arbitragem',
          texto:
            'Caso o conflito não possa ser resolvido satisfatoriamente por meio das negociações previstas na Cláusula 13.2. dentro de 90 (noventa) dias e a soma dos valores em conflito, considerando pedido e eventual reconvenção estimados no momento do requerimento da demanda, seja igual ou superior a R$ 100.000,00 (cem mil reais) qualquer das Partes deverá submeter o conflito para arbitragem.',
          negrito: true,
        },
        {
          numero: '14.5',
          titulo: 'Acordo de Arbitragem',
          texto:
            'O Usuário e a Áurea concordam que os conflitos oriundos ou relacionados a este Termos de Uso e ao uso dos Serviços Áurea, nos quais a soma dos valores em conflito, no momento do início e distribuição de demanda principal e reconvencional, seja igual ou superior a R$ 100.000,00 (cem mil reais) será exclusivamente e definitivamente resolvido por arbitragem, a ser administrada pela Câmara de Mediação e Arbitragem Empresarial - CAMARB, de acordo com o Regulamento de Arbitragem Expedita da CAMARB.',
          negrito: true,
          alineas: [
            {
              letra: '14.5.1.',
              texto:
                'A arbitragem adotará o procedimento expedito, conforme o Regulamento de Arbitragem Expedita da CAMARB',
              negrito: true,
            },
            {
              letra: '14.5.2.',
              texto:
                'A disputa será resolvida por árbitro único, nomeado conforme as Regras da CAMARB.',
              negrito: true,
            },
            {
              letra: '14.5.3.',
              texto: 'A arbitragem terá sede em Belo Horizonte/MG.',
              negrito: true,
            },
            {
              letra: '14.5.4.',
              texto: 'A observará o Direito brasileiro.',
              negrito: true,
            },
            {
              letra: '14.5.5.',
              texto: 'O procedimento arbitral será conduzido em português.',
              negrito: true,
            },
            {
              letra: '14.5.6.',
              texto: 'A sentença arbitral será final e vinculativa para as Partes.',
              negrito: true,
            },
          ],
        },
        {
          numero: '14.6',
          titulo: 'Eleição de Foro',
          texto:
            'Caso o conflito não possa ser resolvido satisfatoriamente por meio das negociações previstas na Cláusula 13.2. dentro de 90 (noventa) dias e a somatória dos valores em conflito, considerando pedido e eventual reconvenção no momento de distribuição da demanda, seja inferior a R$ 100.000,00 (cem mil reais), as Partes elegem como competente para julgá-lo o foro da comarca de Belo Horizonte/MG, dispensando qualquer outro por mais privilegiado que seja.',
        },
      ],
    },
    {
      numero: 15,
      titulo: 'Lei Aplicável',
      paragrafos: [
        {
          numero: '15.1',
          texto:
            'Estes Termos de Uso (incluindo o Acordo de Arbitragem) serão regidos exclusivamente e interpretados de acordo com o Direito brasileiro. Qualquer reclamação, disputa ou assunto decorrente ou relacionado a estes Termos, seja contratual ou não contratual, será regido conforme a legislação Brasileira.',
        },
      ],
    },
    {
      numero: 16,
      titulo: 'Disposições Gerais',
      paragrafos: [
        {
          numero: '16.1',
          titulo: 'Notificações',
          texto:
            'A Áurea pode enviar notificações por e-mail. É sua responsabilidade garantir que o endereço de e-mail esteja atualizado e correto. As notificações serão consideradas recebidas e enviadas para seu e-mail, independentemente de ocorrer falha na entrega.',
        },
        {
          numero: '16.2',
          titulo: 'Acordo Integral',
          texto:
            'O Acordo constitui o acordo completo entre você e nós com respeito aos Serviços Áurea. Cada parte reconhece que não se baseou, e não terá direito a nenhum recurso contra a outra por qualquer declaração, representação, garantia (seja negligente ou inocente) que não esteja expressamente prevista no Acordo.',
        },
        {
          numero: '16.3',
          titulo: 'Cessão e Novação',
          texto:
            'O Usuário não pode ceder ou transferir quaisquer direitos ou obrigações sob os Termos de Uso sem o consentimento prévio por escrito, que poderá exigir informações adicionais ou diligência reforçada. Contudo, a Áurea poderá ceder ou transferir direitos ou obrigações a qualquer momento, inclusive em conexão com fusões, aquisições ou reorganizações corporativas envolvendo a Áurea.',
        },
        {
          numero: '16.4',
          titulo: 'Invalidade',
          texto:
            'Se qualquer cláusula ou subcláusula deste Termos de Uso for ilegal, inválida ou inexequível em qualquer aspecto, a validade das demais cláusulas ou subcláusulas não será afetada ou prejudicada.',
        },
        {
          numero: '16.5',
          titulo: 'Força Maior',
          texto:
            'A Áurea por quaisquer atrasos ou falhas decorrentes de evento de Força Maior.',
        },
        {
          numero: '16.6',
          titulo: 'Renúncia',
          texto:
            'Nenhum atraso ou omissão no exercício de qualquer direito ou recurso neste Termos de Uso será considerado renúncia ao exercício futuro desse direito ou de quaisquer outros direitos e recursos. Os direitos e recursos previstos neste Termos de Uso são cumulativos e não excluem direitos previstos na legislação brasileira.',
        },
        {
          numero: '16.7',
          titulo: 'Impostos',
          texto:
            'É responsabilidade do Usuário determinar quais impostos, se houver, se aplicam aos pagamentos que você realiza ou recebe, bem como coletar, declarar e recolher corretamente esses impostos à autoridade fiscal competente. Você concorda que a Áurea não é responsável por determinar a aplicação de impostos ao seu uso dos Serviços Áurea, nem pela coleta, declaração ou recolhimento de quaisquer impostos decorrentes de qualquer Transação ou uso dos Serviços Áurea.',
        },
      ],
    },
    {
      numero: 17,
      titulo: 'Definições e Interpretações',
      paragrafos: [
        {
          numero: '17.1',
          texto: 'Nestes Termos:',
          alineas: [
            {
              letra: 'a)',
              texto:
                'os títulos e numerações das cláusulas são apenas para conveniência e não afetam o significado, prioridade ou interpretação de qualquer cláusula ou subcláusula destes Termos;',
            },
            {
              letra: 'b)',
              texto: 'referência a uma "Cláusula" é a uma cláusula destes Termos;',
            },
            {
              letra: 'c)',
              texto:
                'as palavras "inclui" ou "incluindo" significam, respectivamente, incluir sem limitação e incluir sem limitação;',
            },
            {
              letra: 'd)',
              texto:
                'qualquer compromisso de fazer ou não fazer algo será considerado como um compromisso de não permitir ou tolerar a realização daquele ato ou coisa;',
            },
            {
              letra: 'e)',
              texto:
                'palavras no singular incluem o plural e vice-versa, e palavras que indicam gênero incluem qualquer gênero;',
            },
            {
              letra: 'f)',
              texto:
                'qualquer referência a um documento é ao documento sujeito a alterações, variações ou novações de tempos em tempos, desde que não haja violação do Termos de Uso ou do próprio documento; e',
            },
            {
              letra: 'g)',
              texto: 'os seguintes termos terão os seguintes significados:',
              subalineas: [
                {
                  letra: '"Erro Manifesto"',
                  texto:
                    'significa qualquer erro ou omissão (seja erro da Áurea ou de terceiros) que seja manifesto ou palpável, incluindo erro em qualquer informação, fonte, oficial, resultado oficial ou pronúncia.',
                },
                {
                  letra: '"IDs de Acesso"',
                  texto:
                    'significa os dados da sua Conta Áurea, nome de usuário, senhas, números de identificação pessoal ou quaisquer outros códigos ou formas de autenticação que você utilize para acessar sua Conta Áurea ou os Serviços Áurea.',
                },
                {
                  letra: '"Serviços Áurea"',
                  texto:
                    'significa os serviços oferecidos a você através da Plataforma Áurea.',
                },
                {
                  letra: '"Força Maior"',
                  texto: 'tem o significado atribuído pelo artigo 393 do Código Civil.',
                },
                {
                  letra: '"Notificação de Conflito"',
                  texto: 'tem o significado atribuído a ela na Cláusula 13.1.',
                },
                {
                  letra: '"Recibo de Unicidade"',
                  texto:
                    'significa o código gerado a partir do envio de moeda para custódia. O código é gerado pelo próprio sistema da Plataforma Áurea com emprego de Inteligência Artificial.',
                },
                {
                  letra: '"Transação"',
                  texto:
                    'significa vender, comprar ou realizar qualquer outro tipo de transação, ou concordar em vender, comprar ou realizar qualquer outro tipo de transação por intermédio da Plataforma Áurea.',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
}
