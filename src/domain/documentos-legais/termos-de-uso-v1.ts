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
  // 2.0 (20/09/2026): a marca do site passou a ser Real Olímpico e o plano de 24
  // meses foi aposentado. Texto diferente é hash diferente, e o aceite gravado
  // aponta para a versão — reciclar o número faria o registro de consentimento
  // deixar de dizer o que a pessoa leu. O arquivo mantém o sufixo `-v1` de
  // propósito: ele guarda o documento VIGENTE, qualquer que seja o número.
  versao: '2.0',
  titulo: 'TERMOS DE USO',
  vigenteDesde: PARAMETROS_LEGAIS.vigencia,
  preambulo: [
    'Estes termos constituem um acordo vinculativo entre o usuário da plataforma Real Olímpico ("Usuário" ou "você" ou "seu/sua") e AUREA CUSTODIA LTDA., que opera sob o nome fantasia Real Olímpico, pessoa jurídica de direito privado, CNPJ nº 68.071.452/0001-06, com endereço na Rua dos Tabaiares, nº 12, sala 210, bairro Floresta, Belo Horizonte/MG, Brasil, CEP 30.150-040 ("Real Olímpico").',
    'Este Termos de Uso rege o uso da sua Conto Real Olímpico e quaisquer outros Serviços Real Olímpico disponibilizados a você na ou através da Plataformo Real Olímpico.',
    'Ao registrar-se para uma Conto Real Olímpico, você reconhece que lhe foi fornecido o Termos de Uso antes da prestação dos Serviços Real Olímpico.',
    'Ao acessar a Plataformo Real Olímpico e/ou usar os Serviços Real Olímpico, você: (i) concorda que leu, entendeu e aceitou o Termos de Uso; (ii) reconhece e concorda que estará vinculado e cumprirá o Termos de Uso, conforme atualizado e alterado periodicamente; e (iii) confirma que tem a capacidade legal e autoridade para celebrar o Termos de Uso.',
    'Se você não entender e aceitar os termos do Termos de Uso em sua totalidade, não deve registrar uma Conto Real Olímpico, nem acessar ou usar a Plataformo Real Olímpico ou qualquer serviço Real Olímpico.',
    'O Real Olímpico não é uma corretora de investimentos ou Criptomoedas. O Real Olímpico não fornece aconselhamento de investimento regulado, recomendações pessoais em relação a decisões de investimento ou valorização nem qualquer outro tipo de consultoria e nenhuma comunicação ou informação fornecida por nós é destinada a ser, ou deve ser interpretada como, recomendação ou aconselhamento de qualquer tipo.',
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
            'Você pode nos contatar utilizando os detalhes fornecidos na Cláusula 3 ou por meio dos canais de suporte ao cliente disponíveis na Plataformo Real Olímpico.',
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
            'Para ser elegível para registrar uma Conto Real Olímpico e usar os Serviços Real Olímpico, você deve:',
          alineas: [
            {
              letra: 'a)',
              texto:
                'ser uma pessoa física, corporação, pessoa jurídica, entidade ou outro empreendimento com plenos poderes, autoridade e capacidade para:',
              subalineas: [
                { letra: '(i)', texto: 'acessar e usar a Plataformo Real Olímpico; e' },
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
              texto: 'não ter sido previamente suspenso ou removido do uso da Plataformo Real Olímpico.',
            },
          ],
        },
        {
          numero: '2.2',
          titulo: 'Alteração dos Critérios de Elegibilidade',
          texto:
            'Os critérios de elegibilidade podem ser alterados a qualquer momento, a critério exclusivo do Real Olímpico. Sempre que possível, avisaremos com antecedência sobre a mudança. Contudo, poderão ser feitas alterações sem aviso prévio. Isso pode ocorrer quando:',
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
            'Para mais informações sobre o Real Olímpico, você pode consultar as informações disponíveis em nossa Plataforma. Se você tiver dúvidas, sugestões ou reclamações, pode nos contatar através do nosso suporte ao cliente em SAC.',
        },
        {
          numero: '3.2',
          titulo: 'Como entraremos em contato com você',
          texto:
            'Entraremos em contato utilizando os dados fornecidos na Plataformo Real Olímpico. Isso pode incluir contato por e-mail, SMS, WhatsApp, ligação telefônica e via Plataformo Real Olímpico. É importante que os dados de contato sejam mantidos corretos e atualizados na Plataformo Real Olímpico. Qualquer alteração nos dados de contato deve ser informada imediatamente. Caso contrário, não seremos responsáveis se você deixar de receber informações, notificações ou outras comunicações importantes. Esteja ciente de que fraudadores podem tentar se passar por funcionários ou comunicações oficiais do Real Olímpico.',
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
            'Após abrir uma Conto Real Olímpico, você poderá acessar e usar a Plataformo Real Olímpico. Este Contrato constitui uma aceitação a todos os serviços disponíveis na Plataforma. Ao acessar ou usar a Plataformo Real Olímpico, você confirma que leu, entendeu e concorda com os Termos de Serviço referentes a esse Serviço Real Olímpico (conforme alterados periodicamente).',
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
            'Ao criar uma Conto Real Olímpico você concorda em pagar todas as taxas aplicáveis relacionadas ao acesso e uso dos Serviços Real Olímpico, conforme estabelecido na Tabela de Taxas em nossa Plataforma. Ao aceitar esses Termos você autoriza e instrui o Real Olímpico a deduzir todas as taxas, comissões, juros, encargos e outros valores devidos nos termos de uso e em decorrência das operações realizadas, de acordo com o método de cálculo estabelecido na Tabela de Taxas em nossa Plataforma.',
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
            'Quaisquer cálculos efetuados pelo Real Olímpico relacionados aos Serviços Real Olímpico são finais e vinculantes, exceto em caso de Erro Manifesto.',
        },
      ],
    },
    {
      numero: 6,
      titulo: 'Conto Real Olímpico',
      paragrafos: [
        {
          numero: '6.1',
          titulo: 'Discricionariedade',
          texto:
            'Todas as Contas Real Olímpico são oferecidas a nosso critério. Reservamo-nos o direito de recusar qualquer solicitação de abertura de Conto Real Olímpico, incluindo, sem limitação, quando:',
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
              texto: 'o Usuário já ter possuído Conto Real Olímpico suspensa ou encerrada; e/ou',
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
            'O Real Olímpico não estará obrigada a fornecer razões para a recusa de uma solicitação de abertura de conta.',
        },
        {
          numero: '6.3',
          texto:
            'Você não deve fornecer acesso a quaisquer Serviços Real Olímpico a terceiros por meio de sua Conto Real Olímpico.',
        },
        {
          numero: '6.4',
          titulo: 'Verificação de Identidade e Conheça seu Cliente',
          texto:
            'Antes de poder abrir uma Conto Real Olímpico ou acessar qualquer Serviço Real Olímpico, você deve concluir nossos procedimentos de verificação de identidade, que podem incluir (sem limitação):',
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
            'Todas as informações fornecidas ao Real Olímpico devem ser completas, precisas, verdadeiras e atualizadas em todos os aspectos.',
        },
        {
          numero: '6.6',
          texto:
            'É obrigação do Usuário informar o Real Olímpico qualquer alteração nas informações fornecidas.',
        },
        {
          numero: '6.7',
          texto: 'Ao aceitar esses Termos você autoriza o Real Olímpico a:',
          alineas: [
            {
              letra: 'a)',
              texto:
                'fazer quaisquer investigações, diretamente ou por meio de terceiros, que considerarmos necessárias para verificar sua identidade, bem como para proteção contra fraude, lavagem de dinheiro, financiamento ao terrorismo ou outro crime financeiro;',
            },
            {
              letra: 'b)',
              texto:
                'tomar quaisquer medidas que julgarmos necessárias com base nos resultados dessas investigações, incluindo recusar sua solicitação ou suspender ou encerrar sua Conto Real Olímpico.',
            },
          ],
        },
        {
          numero: '6.8',
          texto:
            'O Real Olímpico poderá solicitar novas informações a qualquer momento para fins de cumprimento de qualquer obrigação legal ou regulatória aplicável, incluindo requisitos de verificação de identidade, ou em conexão com a detecção de lavagem de dinheiro, financiamento ao terrorismo, fraude ou qualquer outro crime financeiro, bem como condutas proibidas ou qualquer violação real ou potencial deste Contrato ou por qualquer outro motivo válido.',
        },
        {
          numero: '6.9',
          texto:
            'A falha ou recusa em fornecer as informações solicitadas dentro do prazo especificado poderá resultar na suspensão ou restrição da Conto Real Olímpico e/ou qualquer serviço Real Olímpico, com efeito imediato e sem aviso prévio.',
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
            'São consideradas transações as ações de (i) envio de moeda para custódia; (ii) venda de moeda custodiada; (iii) compra de moeda; (iv) solicitação de retirada de moeda custodiada; (v) depósito de valor; e (vi) saque de valor ("Transações") realizadas na Plataformo Real Olímpico.',
        },
        {
          numero: '7.2',
          titulo: 'Envio de Moeda para Custódia',
          texto:
            'O Envio de Moeda para Custódia será solicitado por meio da Plataformo Real Olímpico e, após aprovado, deverá ser realizado pelo Usuário com base nas instruções disponíveis na Plataformo Real Olímpico.',
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
            'A moeda submetida para custódia passará por análise para verificação da veracidade e do estado de conservação do objeto. Após análise o Real Olímpico poderá (i) validar a custódia e proceder com a emissão do Recibo de Unicidade ou (ii) recusar, de forma discricionária, a custódia da moeda e proceder a devolução ao Usuário, o qual arcará com o trâmite devolutivo.',
        },
        {
          numero: '7.2.3',
          titulo: 'Instituições Parceiras',
          texto:
            'O Usuário concorda que a custódia poderá ser realizada pela próprio Real Olímpico ou por instituições parceiras de notória confiabilidade e atuação no mercado.',
        },
        {
          numero: '7.2.4',
          titulo: 'Titularidade',
          texto:
            'O Real Olímpico e suas Instituições Parceiras funcionam como meras custodiantes e intermediadoras. A moeda custodiada e o Recibo de Unicidade correspondente permanecem parte de titularidade do Usuário e não passam a integrar o patrimônio do Real Olímpico.',
        },
        {
          numero: '7.2.5',
          titulo: 'Recibo de Unicidade',
          texto: `Após a validação da moeda submetida para custódia, será gerado para o Usuário na Plataformo Real Olímpico o Recibo de Unicidade correspondente a uma moeda custodiada. O prazo para validação da custódia e emissão do Recibo de Unicidade é de ${PARAMETROS_LEGAIS.prazoValidacaoCustodia} após o recebimento e a aprovação da moeda.`,
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
            'Serão disponibilizadas opções de envio pela Plataformo Real Olímpico. A escolha do método de envio ficará à escolha e responsabilidade do Usuário. Os riscos decorrentes do transporte da moeda serão de responsabilidade do Usuário. A moeda somente será admitida em custódia após procedimento de análise e admissão pelo Real Olímpico.',
        },
        {
          numero: '7.3',
          titulo: 'Venda de Moeda Custodiada',
          texto:
            'As moedas custodiadas na Plataformo Real Olímpico poderão ser vendidas para outros usuários por meio da própria Plataformo Real Olímpico.',
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
          texto: `O prazo para o recebimento dos valores provenientes da Venda de Moeda Custodiada é de ${PARAMETROS_LEGAIS.prazoRecebimentoVenda} após a conclusão da venda. Os valores poderão constar como "Saldo Disponível" na Plataformo Real Olímpico ou serem destinados diretamente a conta bancária do Usuário, de acordo com as informações fornecidas pelo Usuário na Plataforma.`,
        },
        {
          numero: '7.4',
          titulo: 'Compra de Moeda',
          texto:
            'As moedas custodiadas poderão ser adquiridas por outros usuários por meio da Plataformo Real Olímpico.',
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
            'A compra de moeda custodiada na Plataformo Real Olímpico, por intermediação da plataforma, resultará na destruição do Código Criptografado correspondente do Usuário Vendedor e na emissão de um novo Código Criptografado ao Usuário Comprador.',
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
            'Serão disponibilizadas opções de envio pela Plataformo Real Olímpico. A escolha do método de envio ficará à escolha e responsabilidade do Usuário. Os riscos decorrentes do transporte da moeda serão de responsabilidade do Usuário.',
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
            'O Usuário poderá realizar Depósito de Valor para realização de Transações na Plataformo Real Olímpico. Os valores depositados constaram como "Saldo Disponível" na Plataformo Real Olímpico.',
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
          texto: `O prazo para conversão do valor depositado em "Saldo Disponível" na Plataformo Real Olímpico é de ${PARAMETROS_LEGAIS.prazoDisponibilizacaoDeposito} após a confirmação da Transação.`,
        },
        {
          numero: '7.7',
          titulo: 'Saque de Valor',
          texto:
            'O Usuário poderá solicitar o saque do "Saldo Disponível" a qualquer tempo na Plataformo Real Olímpico.',
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
            'As Transações são irrevogáveis, portanto, uma vez realizada uma Transação na plataforma, não será possível rescindi-la ou retirá-la sem autorização extraordinária do Real Olímpico.',
        },
        {
          numero: '7.9',
          titulo: 'Retenção de Informações das Transações',
          texto:
            'Para fins de cumprimento dos padrões da indústria para retenção de dados, ao aceitar esses Termos você autoriza o Real Olímpico a manter registro de todas as informações das Transações efetuadas na Plataformo Real Olímpico, enquanto sua Conto Real Olímpico estiver ativa ou pelo tempo necessário para cumprir os propósitos regulatórios.',
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
            'Ao aceitar estes Termos de Uso o Usuário concorda que é responsável por tomar as medidas adequadas para proteger seu hardware e dados contra vírus, softwares maliciosos e qualquer material inadequado. O Real Olímpico não se responsabiliza por quaisquer reclamações ou perdas decorrentes do seu descumprimento desta Cláusula.',
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
                'manter o endereço de e-mail e o número de telefone fornecidos à Plataformo Real Olímpico atualizados para receber quaisquer avisos ou alertas;',
            },
            {
              letra: 'c)',
              texto:
                'nunca permitir acesso remoto ou compartilhar seu computador e/ou tela do computador com outra pessoa enquanto estiver logado na sua Conto Real Olímpico;',
            },
            {
              letra: 'd)',
              texto: 'sair dos Sites ou da Plataformo Real Olímpico ao final de cada visita; e',
            },
            {
              letra: 'e)',
              texto:
                'acessar a Plataformo Real Olímpico por meio de dispositivos seguros e utilizando redes privadas.',
            },
          ],
        },
        {
          numero: '8.3',
          titulo: 'Atos de Terceiro',
          texto:
            'O Real Olímpico não se responsabiliza por Transações ou outras atividades efetuadas por terceiros que tiveram acesso aos dispositivos ou senhas do Usuário.',
        },
        {
          numero: '8.4',
          titulo: 'Indisponibilidade Tecnológica',
          texto:
            'O Real Olímpico é responsável pela manutenção e funcionamento do sistema da Plataformo Real Olímpico, ressalvadas hipóteses de instabilidade no sistema dos servidores terceirizados, hipótese em que o Real Olímpico comunicará aos clientes o ocorrido e envidará os melhores esforços para reestabelecer o funcionamento.',
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
            'Estes Termos de Uso podem ser alterados a qualquer tempo e o uso continuado dos Serviços Real Olímpico constitui consentimento a tais alterações. As alterações serão publicadas na Plataformo Real Olímpico e poderão também ser notificadas individualmente aos usuários por e-mail ou pela Plataformo Real Olímpico.',
        },
        {
          numero: '9.2',
          titulo: 'Entrada em Vigor',
          texto:
            'Em regra, o Real Olímpico notificará os usuários das Alterações antes da sua entrada em vigor. Entretanto, ocasionalmente as Alterações poderão entrar em vigor imediatamente, caso em que os usuários serão notificados posteriormente sobre as Alterações em vigor. Isso pode ocorrer, por exemplo, e sem limitação, quando:',
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
            'Caso o Usuário não concorde com as Alterações, estará livre para encerrar sua Conto Real Olímpico. O acesso continuado a Plataformo Real Olímpico ou uso de quaisquer Serviços Real Olímpico será considerado como aceitação das alterações.',
        },
        {
          numero: '9.4',
          titulo: 'Alterações nas Taxas',
          texto:
            'O Real Olímpico poderá fazer alterações nas taxas estabelecidas na Tabela de Taxas em nossa Plataforma, o que inclui a introdução de novas taxas e/ou encargos. Caso o Usuário não concorde com as novas taxas, estará livre para encerrar sua Conto Real Olímpico. O acesso continuado a Plataformo Real Olímpico ou uso de quaisquer Serviços Real Olímpico será considerado como aceitação das novas taxas.',
        },
      ],
    },
    {
      numero: 10,
      titulo: 'Encerramento da Conto Real Olímpico',
      paragrafos: [
        {
          numero: '10.1',
          titulo: 'Encerramento',
          texto:
            'O Usuário poderá encerrar a Conto Real Olímpico a qualquer momento, seguindo os procedimentos de encerramento de conta previstos na Plataformo Real Olímpico. Ao encerrar a conta o Usuário autoriza o Real Olímpico a cancelar ou suspender quaisquer transações pendentes no momento do encerramento e a deduzir quaisquer valores em aberto.',
        },
        {
          numero: '10.2',
          texto: 'Não será possível encerrar a Conto Real Olímpico quando:',
          alineas: [
            {
              letra: 'a)',
              texto:
                'O Real Olímpico tiver conhecimento que o Usuário esteja tentando evadir uma investigação por autoridades competentes;',
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
              texto: 'o Usuário tenha valores pendentes a serem pagos ao Real Olímpico.',
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
            'O Real Olímpico poderá, a qualquer momento, suspender, bloquear ou restringir um Usuário do uso da Plataformo Real Olímpico. Em particular, o Real Olímpico poderá (i) recusar-se a concluir, bloquear ou cancelar Transação solicitada pelo usuário; (ii) encerrar, suspender ou restringir o acesso do Usuário a qualquer ou a todos os Serviços Real Olímpico; (iii) encerrar, suspender, fechar, bloquear ou restringir seu acesso a qualquer ou a todas as suas Conta(s) Real Olímpico; e/ou (iv) tomar qualquer medida que considerar necessária, em cada caso com efeito imediato e por qualquer motivo, incluindo, mas não se limitando a quando:',
          alineas: [
            {
              letra: 'a)',
              texto:
                'o Usuário não é, ou não é mais, elegível para usar um ou mais Serviços Real Olímpico;',
            },
            {
              letra: 'b)',
              texto: 'suspeitar razoavelmente que:',
              subalineas: [
                {
                  letra: '(i)',
                  texto:
                    'a pessoa que acessou sua Conto Real Olímpico não é você, ou suspeitar que a Conto Real Olímpico tenha sido ou será usada para quaisquer propósitos ilegais, fraudulentos ou não autorizados;',
                },
                {
                  letra: '(ii)',
                  texto:
                    'mais de uma pessoa natural tenha acesso e/ou realize transações usando a mesma Conto Real Olímpico, ou suspeitar que a Conto Real Olímpico tenha sido ou será usada para quaisquer propósitos ilegais, fraudulentos ou não autorizados; ou',
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
                    'o Usuário violou qualquer lei, regra ou regulamento aplicável aos Serviços Real Olímpico ou ao uso dos Serviços Real Olímpico; ou',
                },
                {
                  letra: '(iii)',
                  texto:
                    'a Conto Real Olímpico ou os Serviços Real Olímpico estão sujeitos a qualquer litígio, investigação ou processo judicial pendente, em andamento ou ameaçado;',
                },
              ],
            },
            {
              letra: 'f)',
              texto:
                'o Usuário tomar qualquer atitude que possa contornar os controles e procedimentos de segurança do Real Olímpico; ou',
            },
            {
              letra: 'g)',
              texto:
                'houver qualquer outra razão válida que justifique a suspensão, bloqueio ou restrição da Conto Real Olímpico.',
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
            'Ao abrir uma Conto Real Olímpico e utilizar os Serviços Real Olímpico, você declara e garante que:',
          alineas: [
            {
              letra: 'a)',
              texto:
                'todas as decisões relativas a este Contrato e aos Serviços Real Olímpico foram tomadas de forma independente, com base em seu próprio julgamento e sem qualquer consultoria, assessoria ou recomendação do Real Olímpico;',
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
                'todos os recursos e ativos mantidos em sua Conto Real Olímpico têm origem lícita e não decorrem de qualquer atividade ilegal ou ilícita; e',
            },
            {
              letra: 'e)',
              texto:
                'nenhuma pessoa além de você possui qualquer direito, título ou garantia sobre sua Conto Real Olímpico, as moedas custodiadas ou os Recibos de Unicidade a ela associados, exceto conforme expressamente autorizado por nós por escrito.',
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
            'Esta Cláusula estabelece as regras e diretrizes aplicáveis ao tratamento de Dados Pessoais de Pessoas Naturais ("Titulares") no âmbito da prestação dos Serviços Real Olímpico, incluindo o acesso, cadastro e utilização da Plataformo Real Olímpico, em conformidade com a Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018 - "LGPD") e com as demais normas aplicáveis à proteção de dados e privacidade.',
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
            'Na medida em que determinar as finalidades e os meios de tratamento de Dados Pessoais no contexto dos Serviços Real Olímpico, o Real Olímpico atuará como Controladora dos Dados Pessoais tratados no âmbito da Plataformo Real Olímpico.',
        },
        {
          numero: '13.4',
          texto:
            'Nas hipóteses em que o Real Olímpico tratar Dados Pessoais em nome de terceiros ou em decorrência de integrações com parceiros comerciais, prestadores de serviços ou instituições financeiras, os papéis de cada agente de tratamento serão definidos conforme a legislação aplicável e os respectivos instrumentos contratuais celebrados entre as partes.',
        },
        {
          numero: '13.5',
          titulo: 'Categorias de Dados Tratados',
          texto:
            'O Real Olímpico poderá coletar e tratar diferentes categorias de Dados Pessoais para a prestação dos Serviços Real Olímpico, cumprimento de obrigações legais ou regulatórias, proteção ao crédito e exercício regular de direitos, incluindo, conforme aplicável:',
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
                'dados financeiros e bancários, incluindo dados de contas bancárias ou de pagamento, chaves Pix, informações de pagamento, histórico de depósitos, saques e pagamentos realizados na ou através da Plataformo Real Olímpico;',
            },
            {
              letra: 'e)',
              texto:
                'dados de Transações, incluindo informações sobre moedas enviadas para custódia, valores de compra e venda, emissão, transferência e cancelamento de Recibos de Unicidade, ordens registradas, ofertas de compra e venda e histórico operacional na Plataformo Real Olímpico;',
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
                'dados de atendimento e comunicação, incluindo registros de solicitações, reclamações, mensagens, chamadas e demais interações entre o Usuário e os canais de atendimento do Real Olímpico.',
            },
          ],
        },
        {
          numero: '13.6',
          titulo: 'Finalidades do Tratamento',
          texto:
            'O Real Olímpico poderá tratar Dados Pessoais para as seguintes finalidades, conforme aplicável:',
          alineas: [
            {
              letra: 'a)',
              texto: 'criar, manter, autenticar e administrar a Conto Real Olímpico;',
            },
            {
              letra: 'b)',
              texto:
                'verificar a identidade, elegibilidade e capacidade do Usuário para utilização dos Serviços Real Olímpico;',
            },
            {
              letra: 'c)',
              texto:
                'realizar procedimentos de Conheça o seu Cliente, prevenção à fraude, prevenção à lavagem de dinheiro e financiamento ao terrorismo;',
            },
            {
              letra: 'd)',
              texto:
                'permitir a execução, liquidação, registro e acompanhamento das Transações realizadas na Plataformo Real Olímpico;',
            },
            {
              letra: 'e)',
              texto:
                'viabilizar o envio, recebimento, custódia, retirada, compra e venda de moedas e a emissão, transferência e cancelamento dos respectivos Recibos de Unicidade;',
            },
            {
              letra: 'f)',
              texto:
                'viabilizar depósitos, saques e demais movimentações financeiras relacionadas à utilização da Plataformo Real Olímpico;',
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
                'proteger a segurança da Plataformo Real Olímpico, dos Usuários, do Real Olímpico e de terceiros;',
            },
            {
              letra: 'j)',
              texto:
                'cumprir obrigações legais, regulatórias, fiscais, contábeis ou decorrentes de ordens emanadas por autoridades competentes;',
            },
            {
              letra: 'k)',
              texto:
                'exercer regularmente direitos do Real Olímpico ou de terceiros em processos judiciais, administrativos, arbitrais ou pré-litigiosos;',
            },
            {
              letra: 'l)',
              texto:
                'realizar auditorias, controles internos, gestão de riscos, elaboração de relatórios e atividades necessárias para a governança corporativa do Real Olímpico;',
            },
            {
              letra: 'm)',
              texto:
                'aperfeiçoar, desenvolver, testar e manter a Plataformo Real Olímpico e os Serviços Real Olímpico, inclusive por meio de análises estatísticas e estudos de uso; e',
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
            'O tratamento de Dados Pessoais pelo Real Olímpico será realizado com fundamento em uma ou mais bases legais previstas na LGPD, incluindo (i) execução de contrato ou de procedimentos preliminares relacionados ao Contrato; (ii) cumprimento de obrigação legal ou regulatória; (iii) exercício regular de direitos em processo judicial, administrativo ou arbitral; (iv) proteção da vida ou da incolumidade física do Titular ou de terceiro; (v) legítimo interesse do Real Olímpico ou de terceiros, observados os limites legais e a proteção dos direitos e liberdades fundamentais do Titular; (vi) proteção do crédito; e (vii) quando exigido pela legislação aplicável, o consentimento do Titular.',
        },
        {
          numero: '13.8',
          texto:
            'Quando o tratamento depender do consentimento do Usuário, este será solicitado de forma livre, informada e inequívoca, e o Usuário poderá revogá-lo a qualquer momento, mediante solicitação expressa pelos canais indicados na Plataforma, ficando ciente de que a revogação poderá impossibilitar a continuidade da prestação de determinados Serviços Real Olímpico.',
        },
        {
          numero: '13.9',
          titulo: 'Compartilhamento de Dados Pessoais',
          texto:
            'O Real Olímpico poderá compartilhar Dados Pessoais, na medida necessária para as finalidades previstas nesta Cláusula e com observância das salvaguardas cabíveis, com: (i) instituições parceiras de custódia, transporte e logística envolvidas na prestação dos Serviços Real Olímpico; (ii) instituições financeiras, prestadores de serviços de pagamento e parceiros bancários para processamento de depósitos, saques e Transações; (iii) prestadores de serviços de tecnologia, armazenamento em nuvem, segurança da informação, suporte, auditoria e assessoria jurídica ou contábil; (iv) fornecedores especializados em prevenção à fraude, análise de risco, biometria e verificação de identidade; e (v) autoridades policiais, governamentais, fiscais, judiciais, arbitrais ou regulatórias competentes, sempre que houver obrigação legal, regulatória ou ordem válida emanada de autoridade competente.',
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
            'Quando necessário para identificação, autenticação, prevenção a fraudes e segurança do Usuário e da Plataformo Real Olímpico, o Real Olímpico poderá coletar e tratar dados biométricos faciais e cópias de documentos de identificação, observadas as disposições do artigo 11 da LGPD.',
        },
        {
          numero: '13.12',
          titulo: 'Fontes de Dados',
          texto:
            'Além dos Dados Pessoais fornecidos diretamente pelo Usuário, o Real Olímpico poderá obter informações sobre o Usuário a partir de fontes públicas, registros oficiais, birôs de dados e de crédito, parceiros de verificação de identidade e ferramentas de prevenção à fraude, observadas as normas de proteção de dados aplicáveis.',
        },
        {
          numero: '13.13',
          titulo: 'Decisões Automatizadas',
          texto:
            'O Real Olímpico poderá utilizar processos automatizados para auxiliar atividades de validação cadastral, análise de risco, prevenção a fraudes e cumprimento de normas de prevenção à lavagem de dinheiro. Nesses casos, o Usuário terá direito de solicitar a revisão de decisões tomadas unicamente com base em tratamento automatizado de Dados Pessoais que afetem seus interesses, nos termos da legislação aplicável.',
        },
        {
          numero: '13.14',
          titulo: 'Armazenamento e Retenção',
          texto:
            'O Real Olímpico conservará os Dados Pessoais durante o período necessário para cumprir as finalidades para as quais foram coletados, executar este Contrato e observar os prazos legais, regulatórios e prescricionais aplicáveis.',
        },
        {
          numero: '13.15',
          texto:
            'O encerramento da Conto Real Olímpico não implicará necessariamente a eliminação imediata de todos os Dados Pessoais relacionados ao Usuário. O Real Olímpico poderá conservar Dados Pessoais após o encerramento da Conta quando a conservação for necessária ou permitida pela legislação, incluindo para cumprimento de obrigações legais ou regulatórias, exercício regular de direitos, prevenção e investigação de fraudes e atendimento a determinações de autoridades competentes.',
        },
        {
          numero: '13.16',
          titulo: 'Segurança da Informação',
          texto:
            'O Real Olímpico adotará medidas técnicas, administrativas e organizacionais razoáveis e compatíveis com a natureza dos Dados Pessoais tratados e com os riscos envolvidos, destinadas a protegê-los contra acessos não autorizados e situações acidentais ou ilícitas de destruição, perda, alteração, divulgação, comunicação ou qualquer forma de tratamento inadequado ou ilícito.',
        },
        {
          numero: '13.17',
          texto:
            'As medidas de segurança poderão incluir, conforme aplicável, controles de acesso, autenticação, criptografia, registro de atividades, segregação de ambientes, procedimentos de backup, monitoramento de segurança, gestão de vulnerabilidades e mecanismos de prevenção e resposta a incidentes. Nenhum sistema é completamente imune a riscos de segurança. A presente disposição não deverá ser interpretada como garantia absoluta de inexistência de incidentes, sem prejuízo das obrigações legais do Real Olímpico relativas à segurança e proteção dos Dados Pessoais.',
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
            'Na hipótese de o problema não poder ser resolvido por meio dos canais de atendimento da Plataformo Real Olímpico, o Usuário deverá enviar Notificação de Conflito ao Real Olímpico, que deverá conter:',
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
            'O recebimento da Notificação de Conflito pelo Real Olímpico inicia o procedimento de resolução de conflitos. O Usuário e Real Olímpico concordam em negociar de boa-fé por um período de 90 (noventa) dias corridos após o recebimento da Notificação de Conflito, com o objetivo de resolver amigavelmente a disputa.',
        },
        {
          numero: '14.3',
          texto:
            'O envio da Notificação de Conflito ao Real Olímpico constitui requisito obrigatório para o início de qualquer arbitragem ou processo judicial.',
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
            'O Usuário e o Real Olímpico concordam que os conflitos oriundos ou relacionados a este Termos de Uso e ao uso dos Serviços Real Olímpico, nos quais a soma dos valores em conflito, no momento do início e distribuição de demanda principal e reconvencional, seja igual ou superior a R$ 100.000,00 (cem mil reais) será exclusivamente e definitivamente resolvido por arbitragem, a ser administrada pela Câmara de Mediação e Arbitragem Empresarial - CAMARB, de acordo com o Regulamento de Arbitragem Expedita da CAMARB.',
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
            'O Real Olímpico pode enviar notificações por e-mail. É sua responsabilidade garantir que o endereço de e-mail esteja atualizado e correto. As notificações serão consideradas recebidas e enviadas para seu e-mail, independentemente de ocorrer falha na entrega.',
        },
        {
          numero: '16.2',
          titulo: 'Acordo Integral',
          texto:
            'O Acordo constitui o acordo completo entre você e nós com respeito aos Serviços Real Olímpico. Cada parte reconhece que não se baseou, e não terá direito a nenhum recurso contra a outra por qualquer declaração, representação, garantia (seja negligente ou inocente) que não esteja expressamente prevista no Acordo.',
        },
        {
          numero: '16.3',
          titulo: 'Cessão e Novação',
          texto:
            'O Usuário não pode ceder ou transferir quaisquer direitos ou obrigações sob os Termos de Uso sem o consentimento prévio por escrito, que poderá exigir informações adicionais ou diligência reforçada. Contudo, o Real Olímpico poderá ceder ou transferir direitos ou obrigações a qualquer momento, inclusive em conexão com fusões, aquisições ou reorganizações corporativas envolvendo o Real Olímpico.',
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
            'O Real Olímpico por quaisquer atrasos ou falhas decorrentes de evento de Força Maior.',
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
            'É responsabilidade do Usuário determinar quais impostos, se houver, se aplicam aos pagamentos que você realiza ou recebe, bem como coletar, declarar e recolher corretamente esses impostos à autoridade fiscal competente. Você concorda que o Real Olímpico não é responsável por determinar a aplicação de impostos ao seu uso dos Serviços Real Olímpico, nem pela coleta, declaração ou recolhimento de quaisquer impostos decorrentes de qualquer Transação ou uso dos Serviços Real Olímpico.',
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
                    'significa qualquer erro ou omissão (seja erro do Real Olímpico ou de terceiros) que seja manifesto ou palpável, incluindo erro em qualquer informação, fonte, oficial, resultado oficial ou pronúncia.',
                },
                {
                  letra: '"IDs de Acesso"',
                  texto:
                    'significa os dados da sua Conto Real Olímpico, nome de usuário, senhas, números de identificação pessoal ou quaisquer outros códigos ou formas de autenticação que você utilize para acessar sua Conto Real Olímpico ou os Serviços Real Olímpico.',
                },
                {
                  letra: '"Serviços Real Olímpico"',
                  texto:
                    'significa os serviços oferecidos a você através da Plataformo Real Olímpico.',
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
                    'significa o código gerado a partir do envio de moeda para custódia. O código é gerado pelo próprio sistema da Plataformo Real Olímpico com emprego de Inteligência Artificial.',
                },
                {
                  letra: '"Transação"',
                  texto:
                    'significa vender, comprar ou realizar qualquer outro tipo de transação, ou concordar em vender, comprar ou realizar qualquer outro tipo de transação por intermédio da Plataformo Real Olímpico.',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
}
