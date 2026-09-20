/**
 * Endereço oficial da Central de Custódia — FONTE ÚNICA.
 *
 * Por que este arquivo existe separado de `correios.ts`: aquele módulo começa com
 * `import 'server-only'`, então nenhuma tela do cliente consegue lê-lo. O resultado
 * disso foi o bug que o Gabriel apontou em 20/09/2026 — a etiqueta em PDF (gerada no
 * servidor) trazia a caixa postal certa, enquanto o card da tela de envios mostrava
 * "Avenida Paulista, 1500 — São Paulo/SP", um endereço fictício que tinha sido
 * digitado à mão no JSX porque a constante não alcançava o Client Component.
 * Quem imprimia a etiqueta acertava; quem lia a tela postava a moeda para o lugar
 * errado. Aqui não há `server-only`, então servidor e cliente leem o mesmo valor e
 * a divergência não pode voltar.
 *
 * Origem dos dados: Termo de Assinatura de Caixa Postal dos Correios, assinado em
 * 28/08/2026 (assinatura nova, anual, 12 meses). Caixa Postal 7990 na AGF
 * Bandeirantes (código de agência 00235954), Avenida dos Bandeirantes, Belo
 * Horizonte/MG, CEP da agência 30315-970. O CEP 30315-970 é o da agência — é ele,
 * e não o CEP da sede da empresa, que os Correios usam para entregar na caixa postal.
 */

import type { EnderecoEnvio } from './types'

export const ENDERECO_CENTRAL_AUREA: EnderecoEnvio = {
  nome: 'AUREA CUSTODIA LTDA — Caixa Postal 7990',
  cpfOuCnpj: '68.071.452/0001-06',
  logradouro: 'Caixa Postal 7990',
  numero: 'S/N',
  complemento: 'AGF Bandeirantes — Avenida dos Bandeirantes',
  bairro: 'Mangabeiras',
  cidade: 'Belo Horizonte',
  uf: 'MG',
  cep: '30315-970',
  telefone: '(31) 3100-0000',
  email: 'custodia@aureacustodia.com.br',
}

/**
 * Só a razão social, sem o sufixo da caixa postal.
 *
 * O `nome` acima é o cadastro nos Correios, que já traz a caixa colada
 * ("AUREA CUSTODIA LTDA — Caixa Postal 7990"). Onde a caixa postal tem linha
 * própria — a etiqueta e o card da tela de envios — repetir o sufixo no campo do
 * destinatário faria o número aparecer duas vezes no mesmo papel.
 *
 * Aqui vai a RAZÃO SOCIAL, não a marca: o objeto postal precisa chegar com o nome
 * que assinou o Termo de Caixa Postal. O site se chama Real Olímpico, mas a caixa
 * está registrada para a AUREA CUSTODIA LTDA, e um pacote endereçado à marca pode
 * ser recusado na triagem da agência.
 */
export const RAZAO_SOCIAL_POSTAL: string = ENDERECO_CENTRAL_AUREA.nome.split('—')[0].trim()
