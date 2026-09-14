/**
 * DOMÍNIO — Política de Privacidade v1.0.
 *
 * Governança de dados pessoais, cadastro progressivo e conformidade com a LGPD.
 */

import { PARAMETROS_LEGAIS } from './parametros'
import type { DocumentoLegalEstruturado } from './types'

export const POLITICA_PRIVACIDADE_V1: DocumentoLegalEstruturado = {
  chave: 'politica_privacidade',
  versao: '1.0',
  titulo: 'POLÍTICA DE PRIVACIDADE',
  vigenteDesde: PARAMETROS_LEGAIS.vigencia,
  preambulo: [
    'Esta Política de Privacidade descreve de forma transparente como a AUREA CUSTODIA LTDA, pessoa jurídica de direito privado inscrita no CNPJ sob o nº 68.071.452/0001-06 (nome fantasia Real Olímpico), na qualidade de controladora de dados, realiza o tratamento dos dados pessoais de seus usuários no âmbito do site, ambiente de autenticação e plataforma operacional.',
    'Nossa atuação pauta-se pelo princípio da minimização e da segurança (Art. 6º da Lei nº 13.709/2018 — Lei Geral de Proteção de Dados Pessoais / LGPD): coletamos apenas os dados estritamente indispensáveis para o cumprimento das obrigações contratuais, fiscais e logísticas da custódia física de moedas comemorativas e do marketplace.',
  ],
  capitulos: [
    {
      numero: 1,
      titulo: 'Identificação da Controladora e Princípios',
      paragrafos: [
        {
          numero: '1.1',
          texto:
            'A Aurea Custodia LTDA atua como controladora dos dados coletados, adotando medidas rígidas de segurança técnica e governança para a estrita finalidade operacional.',
        },
      ],
    },
    {
      numero: 2,
      titulo: 'Dados Tratados e o Cadastro Progressivo',
      paragrafos: [
        {
          numero: '2.1',
          texto:
            'A Áurea adota o modelo de cadastro progressivo. Dados adicionais somente são solicitados no momento exato em que uma funcionalidade patrimonial específica for acionada pelo usuário:',
          alineas: [
            {
              letra: 'a)',
              texto:
                'Abertura de conta básica (Navegação inicial): endereço de e-mail, nome de exibição e hash criptográfico de senha (ou identificador de conta Google).',
            },
            {
              letra: 'b)',
              texto:
                'Identificação formal e fiscal (1º depósito, compra ou saque): nome completo, número do CPF e data de nascimento para validação fiscal e prevenção a fraudes.',
            },
            {
              letra: 'c)',
              texto:
                'Contato operacional: número de telefone celular para avisos e validação de segurança.',
            },
            {
              letra: 'd)',
              texto:
                'Endereço de entrega (solicitado apenas na retirada física da moeda): logradouro, número, complemento, bairro, cidade, UF e CEP para frete e seguro.',
            },
            {
              letra: 'e)',
              texto:
                'Dados bancários (solicitados exclusivamente para liquidação de saques): chave Pix e dados bancários de mesma titularidade do CPF cadastrado.',
            },
            {
              letra: 'f)',
              texto:
                'Registros de conexão e auditoria técnica: IP, data/hora e identificadores de sistema nos termos do Marco Civil da Internet.',
            },
            {
              letra: 'g)',
              texto:
                'Trilha contábil e histórico de operações: livro contábil append-only com encadeamento criptográfico SHA-256.',
            },
          ],
        },
      ],
    },
    {
      numero: 3,
      titulo: 'Dados que NÃO Tratamos (Diretriz de Minimização)',
      paragrafos: [
        {
          numero: '3.1',
          texto:
            'Por diretriz expressa de governança: não exigimos fotos de documentos (RG/CNH), não realizamos reconhecimento facial ou biometria invasiva, e não coletamos quaisquer dados sensíveis.',
        },
      ],
    },
    {
      numero: 4,
      titulo: 'Finalidades e Bases Legais (Art. 7º da LGPD)',
      paragrafos: [
        {
          numero: '4.1',
          texto:
            'O tratamento fundamenta-se estritamente na execução do contrato e procedimentos preliminares (Art. 7º, V), no cumprimento de obrigação legal ou regulatória (Art. 7º, II), na prevenção a fraudes e segurança patrimonial (Art. 7º, IX e X) e no exercício regular de direitos (Art. 7º, VI).',
        },
      ],
    },
    {
      numero: 5,
      titulo: 'Compartilhamento Estrito com Operadores',
      paragrafos: [
        {
          numero: '5.1',
          texto:
            'Não comercializamos dados pessoais. O compartilhamento restringe-se aos operadores essenciais: provedores de infraestrutura de banco de dados e nuvem, intermediador de pagamentos Mercado Pago para checkout seguro, transportadores e Correios para entrega de moedas retiradas, e canais de e-mail transacional.',
        },
      ],
    },
    {
      numero: 6,
      titulo: 'Segurança da Informação e Prazos de Retenção',
      paragrafos: [
        {
          numero: '6.1',
          texto:
            'Adotamos criptografia TLS 1.3 em trânsito e AES-256 em repouso. Os dados cadastrais são conservados durante a vigência da conta e pelo prazo prescricional legal de 5 anos após encerramento; registros de IP são conservados pelo prazo legal de 6 meses do Marco Civil da Internet.',
        },
      ],
    },
    {
      numero: 7,
      titulo: 'Direitos dos Titulares e Contato com o DPO',
      paragrafos: [
        {
          numero: '7.1',
          texto:
            'Os titulares podem solicitar a qualquer momento a confirmação, acesso, correção ou eliminação de seus dados através do e-mail do Encarregado de Dados (DPO): gabriel.silva@aureacustodia.com.br, com prazo de resposta de até 15 dias corridos.',
        },
      ],
    },
  ],
}
